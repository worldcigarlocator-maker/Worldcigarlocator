console.log("🔥 MARKET V2 LOADED");
/* ============================================================
   WCL — MARKET V2 (CLEAN ENGINE)
   ============================================================ */

import { supabase } from "/js/globals.js";
const sb = supabase;

/* ============================================================
   STATE (ISOLATED)
   ============================================================ */

const MARKET_STATE = {
  level: "country",   // country | city | store
  country: null,
  city: null,
  sort: "views"       // views | clicks | ctr
};

/* ============================================================
   DOM
   ============================================================ */

function getBody() {
  return document.getElementById("marketDemandBody");
}

/* ============================================================
   MAIN RENDER
   ============================================================ */

export async function renderMarketV2(days = 30) {

  console.log("🔥 MARKET V2 RENDER");

  const tbody = getBody();
  if (!tbody) return;

  let data = [];

  /* ============================================================
     COUNTRY LEVEL
     ============================================================ */

  if (MARKET_STATE.level === "country") {

    const { data: res, error } = await sb.rpc(
      "analytics_top_countries",
      {
        p_days: days,
        p_day: null,
        p_limit: 100
      }
    );

    console.log("🌍 COUNTRIES:", res);

    if (error) {
      console.error("❌ countries error", error);
      return;
    }

    data = res || [];

  }

  /* ============================================================
     EMPTY
     ============================================================ */

  if (!data.length) {
    tbody.innerHTML =
      `<tr><td colspan="5" class="muted center">No data yet</td></tr>`;
    return;
  }

  /* ============================================================
     SORT
     ============================================================ */

  data.sort((a, b) => {

    switch (MARKET_STATE.sort) {

      case "clicks":
        return (b.clicks || 0) - (a.clicks || 0);

      case "ctr":
        return ((b.clicks / b.views) || 0) - ((a.clicks / a.views) || 0);

      default:
        return (b.views || 0) - (a.views || 0);

    }

  });

  /* ============================================================
     RENDER
     ============================================================ */

  tbody.innerHTML = data.map(r => {

    const ctr = r.views
      ? ((r.clicks / r.views) * 100).toFixed(1) + "%"
      : "0%";

    return `
      <tr data-country="${r.country}">
        <td>${r.country || "-"}</td>
        <td class="num">${r.views || 0}</td>
        <td class="num">${r.clicks || 0}</td>
        <td class="num">${ctr}</td>
      </tr>
    `;

  }).join("");

}

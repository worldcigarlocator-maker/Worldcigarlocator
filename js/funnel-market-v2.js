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
     RENDER COUNTRIES
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

  /* ============================================================
   DRILLDOWN (COUNTRY → CITY → STORE → TRAFFIC ORIGIN)
   ============================================================ */

tbody.querySelectorAll("tr").forEach(row => {

  row.onclick = async () => {

    // 🔹 COUNTRY → CITY
    if (MARKET_STATE.level === "country") {

      const country = row.dataset.country;
      if (!country) return;

      MARKET_STATE.level = "city";
      MARKET_STATE.country = country;

      await renderMarketV2(days);
      return;
    }

    // 🔹 CITY → STORES
    if (MARKET_STATE.level === "city") {

      const city = row.dataset.city;
      if (!city) return;

      MARKET_STATE.level = "store";
      MARKET_STATE.city = city;

      const { data: res, error } = await sb.rpc(
        "analytics_top_stores_by_city",
        {
          p_day: null,
          p_country: MARKET_STATE.country,
          p_city: city,
          p_limit: 50
        }
      );

      console.log("🏪 STORES:", res);

      if (error) {
        console.error("❌ stores error", error);
        return;
      }

      const stores = res || [];

      if (!stores.length) {
        tbody.innerHTML =
          `<tr><td colspan="4" class="muted center">No stores yet</td></tr>`;
        return;
      }

      tbody.innerHTML = stores.map(s => {

        const ctr = s.views
          ? ((s.clicks / s.views) * 100).toFixed(1) + "%"
          : "0%";

        return `
          <tr data-store="${s.store_id}">
            <td>${s.name}</td>
            <td class="num">${s.views || 0}</td>
            <td class="num">${s.clicks || 0}</td>
            <td class="num">${ctr}</td>
          </tr>
        `;

      }).join("");

      return;
    }

    // 🔥 STORE → TRAFFIC ORIGIN (CITY)
    if (MARKET_STATE.level === "store") {

      const storeId = row.dataset.store;
      if (!storeId) return;

      const { data: res, error } = await sb.rpc(
        "analytics_store_traffic_by_city",
        {
          p_store_id: Number(storeId),
          p_days: days
        }
      );

      console.log("📍 STORE TRAFFIC:", res);

      if (error) {
        console.error("❌ store traffic error", error);
        return;
      }

      const cities = res || [];

      if (!cities.length) {
        tbody.innerHTML =
          `<tr><td colspan="4" class="muted center">No traffic data</td></tr>`;
        return;
      }

      tbody.innerHTML = cities.map(c => {

        const ctr = c.views
          ? ((c.clicks / c.views) * 100).toFixed(1) + "%"
          : "0%";

        return `
          <tr>
            <td>${c.city}, ${c.country}</td>
            <td class="num">${c.views || 0}</td>
            <td class="num">${c.clicks || 0}</td>
            <td class="num">${ctr}</td>
          </tr>
        `;

      }).join("");

      return;
    }

  };

});

}

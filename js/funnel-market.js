/* ============================================================
   WCL — MARKET FUNNEL (CANONICAL)
   ============================================================ */

import { renderMarketV2 } from "./funnel-market-v2.js";
import { supabase } from "/js/globals.js";
const sb = supabase;
import {
  getKPI,
  getLevel,
  getActiveCountry,
  getActiveDay,
  applyCountry
} from "./analytics-state.js";

/* ============================================================
   DOM (DYNAMIC — NO CACHING)
   ============================================================ */

function getMarketBody() {
  return document.getElementById("marketDemandBody");
}

function getHeatmapBody() {
  return document.getElementById("heatmapBody");
}

/* ============================================================
   RENDER MARKET
   ============================================================ */

export async function renderMarket(days = 30) {

  console.trace("RENDER MARKET");
   
const LEVEL = getLevel();
const COUNTRY = getActiveCountry();
const KPI = getKPI();
const DAY = getActiveDay();

const tbody =
  KPI === "users"
    ? document.getElementById("usersDrillBody")
    : getMarketBody();

if (!tbody) return;

  // 🔥 LOGGA EFTER
  console.log("KPI:", KPI);
  console.log("LEVEL:", LEVEL);
  console.log("DAY:", DAY);
  console.log("COUNTRY:", COUNTRY);

  let data = [];

   
  /* ============================================================
   FETCH
   ============================================================ */

if (KPI === "users") {

 if (LEVEL === "country" && DAY) {

  const { data: res, error } = await sb.rpc(
    "analytics_top_countries",
    {
      p_days: days,
      p_day: DAY,
      p_limit: 100
    }
  );

  console.log("USERS COUNTRY RES:", res);
  console.log("USERS COUNTRY ERROR:", error);

  if (error) {
    console.error("❌ users country error", error);
    return;
  }

  data = (res || []).map(r => ({
    country: r.country,
    users: r.users,
    views: 0,
    clicks: 0
  }));
}

  if (LEVEL === "city" && COUNTRY && DAY) {

  const { data: res, error } = await sb.rpc(
  "analytics_users_by_day_city",
  {
    p_day: DAY,
    p_country: COUNTRY
  }
);

    console.log("VISITORS CITY RES:", res);
    console.log("VISITORS CITY ERROR:", error);

    if (error) {
      console.error("❌ visitors city error", error);
      return;
    }

    data = (res || []).map(r => ({
      city: r.city,
      country: r.country,
      users: r.users,
      views: 0,
      clicks: 0
    }));
  }

} else {

  if (LEVEL === "country") {

 const { data: res, error } = await sb.rpc("analytics_top_countries", {
  p_days: days,
  p_day: getActiveDay(), // 🔥 FIX
  p_limit: 100
});

if (error) {
  console.error("❌ countries error", error);
  return;
}

data = res || [];

  }

  if (LEVEL === "city" && COUNTRY) {

    const { data: res, error } = await sb.rpc("analytics_top_cities", {
      p_days: days,
      p_day: null,
      p_country: COUNTRY,
      p_limit: 100
    });

    if (error) {
      console.error("❌ cities error", error);
      return;
    }

    data = res || [];
  }

}
  /* ============================================================
     EMPTY STATE
     ============================================================ */

  if (!data.length) {
    tbody.innerHTML =
      `<tr><td colspan="5" class="muted center">No data yet.</td></tr>`;
    return;
  }


  /* ============================================================
     SORT (KPI DRIVEN)
     ============================================================ */

data.sort((a, b) => {

  const viewsA = a.views || 0;
  const viewsB = b.views || 0;

  const clicksA = a.clicks || 0;
  const clicksB = b.clicks || 0;

  const ctrA = viewsA ? (clicksA / viewsA) : 0;
  const ctrB = viewsB ? (clicksB / viewsB) : 0;

  switch (KPI) {

    case "views":
      return viewsB - viewsA;

    case "clicks":
      // 🔥 OPPORTUNITY MODE
      // hög views först, sen låg CTR
      if (viewsB !== viewsA) return viewsB - viewsA;
      return ctrA - ctrB;

    case "stores":
      return (b.stores || 0) - (a.stores || 0);

    case "ctr":
      return ctrB - ctrA;

    default:
      return viewsB - viewsA;
  }

});

  /* ============================================================
     RENDER
     ============================================================ */

  tbody.innerHTML = data.map(r => {

    const ctr = r.views
      ? ((r.clicks / r.views) * 100).toFixed(1) + "%"
      : "0%";

    const label = LEVEL === "country"
      ? r.country
      : [r.city, r.country].filter(Boolean).join(", ");

    return `
      <tr data-country="${r.country}">
        <td>${label || "-"}</td>
        <td class="num">${r.users || 0}</td>
        <td class="num">${r.views || 0}</td>
        <td class="num">${r.clicks || 0}</td>
        <td class="num">${ctr}</td>
      </tr>
    `;

  }).join("");

  
/* ============================================================
   DRILLDOWN
   ============================================================ */

tbody.querySelectorAll("tr").forEach(row => {

  row.onclick = async () => {

    // 🔹 COUNTRY → CITY
    if (LEVEL === "country" || LEVEL === "member_country") {

      const country = row.dataset.country;
      if (!country) return;

applyCountry(country);
       setLevel("member_city");

setTimeout(async () => {
  const days = Number(document.getElementById("globalRange")?.value || 30);
  await renderMarket(days);
}, 0);

return;
    }

    // 🔹 CITY → STORES
    if (LEVEL = "member_city") {

      const cityLabel = row.children[0]?.textContent;
      if (!cityLabel) return;

      const city = cityLabel.split(",")[0]?.trim();

      const { data: stores, error } = await sb.rpc(
 "analytics_users_stores_by_city_day",
{
  p_day: getActiveDay(),
  p_country: getActiveCountry(),
  p_city: city
}
);

      console.log("STORES RES:", stores);
      console.log("STORES ERROR:", error);

      if (error) {
        console.error("❌ stores error", error);
        return;
      }

      if (!stores?.length) {
        tbody.innerHTML =
          `<tr><td colspan="5" class="muted center">No stores yet</td></tr>`;
        return;
      }

      // 🔥 RENDER STORES
      tbody.innerHTML = stores.map(s => {

        const ctr = s.views
          ? ((s.clicks / s.views) * 100).toFixed(1) + "%"
          : "0%";

        return `
          <tr>
            <td>${s.name}</td>
            <td class="num">${s.users || 0}</td>
            <td class="num">${s.views || 0}</td>
            <td class="num">${ctr}</td>
          </tr>
        `;

      }).join("");

    }

  };

});

   }
/* ============================================================
   HEATMAP
   ============================================================ */

export async function renderHeatmap(days = 30) {

  const tbody = getHeatmapBody();
  if (!tbody) return;

  const { data, error } = await sb.rpc(
    "analytics_heatmap_countries",
    { p_days: days }
  );

  if (error) {
    console.error("❌ heatmap error", error);
    return;
  }

  if (!data?.length) {
    tbody.innerHTML =
      `<tr><td colspan="2" class="muted center">No data yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(r => `
    <tr>
      <td>${r.country || "—"}</td>
      <td class="num">${Number(r.views || 0)}</td>
    </tr>
  `).join("");

}

window.renderMarketV2 = renderMarketV2;

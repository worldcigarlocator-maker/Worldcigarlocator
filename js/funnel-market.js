/* ============================================================
   WCL — MARKET FUNNEL (CANONICAL)
   ============================================================ */

import { supabase } from "./globals.js";
const sb = supabase;

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

  // 🔹 DAY → COUNTRY (Visitors)
  if (LEVEL === "country" && DAY) {

    const { data: res, error } = await sb.rpc(
      "analytics_visitors_by_country",
      { p_day: DAY }
    );

    if (error) {
      console.error("❌ visitors country error", error);
      return;
    }

    data = (res || []).map(r => ({
      country: r.country,
      users: r.users,
      views: 0,
      clicks: 0
    }));
  }

  // 🔹 COUNTRY → CITY (Visitors)
  if (LEVEL === "city" && COUNTRY && DAY) {

    const { data: res, error } = await sb.rpc(
      "analytics_visitors_by_city",
      {
        p_day: DAY,
        p_country: COUNTRY
      }
    );

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

    switch (KPI) {

      case "views":
        return (b.views || 0) - (a.views || 0);

      case "clicks":
        return (b.clicks || 0) - (a.clicks || 0);

      case "stores":
        return (b.stores || 0) - (a.stores || 0);

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

  row.onclick = () => {

    // 🔹 COUNTRY → CITY
    if (LEVEL === "country") {

      const country = row.dataset.country;
      if (!country) return;

      applyCountry(country);
      setLevel("city");

      renderMarket(days);
      return;
    }

    // 🔹 CITY → (framtid / stop)
    if (LEVEL === "city") {

      console.log("CITY CLICK:", row.dataset.country);
      return;
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

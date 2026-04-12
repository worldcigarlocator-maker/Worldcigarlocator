/* ============================================================
   WCL — MARKET FUNNEL
   ============================================================ */

import { supabase } from "./globals.js";
import {
  getKPI,
  getLevel,
  getActiveCountry,
  applyCountry
} from "./analytics-state.js";

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
   MARKET TABLE
   ============================================================ */

export async function renderMarket(days = 30) {

  const LEVEL = getLevel();
  const COUNTRY = getActiveCountry();

  let data = [];

  /* ============================================================
     FETCH
     ============================================================ */

  if (LEVEL === "country") {

    const { data: res, error } = await sb.rpc("analytics_top_countries", {
      p_days: days,
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
      p_country: COUNTRY,
      p_limit: 100
    });

    if (error) {
      console.error("❌ cities error", error);
      return;
    }

    data = res || [];
  }

  /* ============================================================
     SORT (KPI DRIVEN)
     ============================================================ */

  data.sort((a, b) => {

    switch (getKPI()) {

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

  const tbody = getMarketBody();

  if (!tbody) {
    console.error("❌ marketDemandBody missing");
    return;
  }

  if (!data.length) {
    tbody.innerHTML =
      `<tr><td colspan="5" class="muted center">No data yet.</td></tr>`;
    return;
  }

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

    row.addEventListener("click", () => {

      if (LEVEL === "country") {

        const country = row.dataset.country;
        if (!country) return;

        applyCountry(country);

        renderMarket(days);
      }

    });

  });

}

/* ============================================================
   HEATMAP
   ============================================================ */

export async function renderHeatmap(days = 30) {

  const tbody = getHeatmapBody();

  if (!tbody) {
    console.error("❌ heatmapBody missing");
    return;
  }

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

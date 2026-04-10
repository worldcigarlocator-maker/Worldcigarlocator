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

const marketDemandBody = document.getElementById("marketDemandBody");
const heatmapBody = document.getElementById("heatmapBody");

/* ============================================================
   MARKET TABLE
   ============================================================ */

export async function renderMarket(days = 30) {

  const LEVEL = getLevel();
  const COUNTRY = getActiveCountry();

  let data = [];

  if (LEVEL === "country") {

    const { data: res } = await sb.rpc("analytics_top_countries", {
      p_days: days,
      p_limit: 100
    });

    data = res || [];
  }

  if (LEVEL === "city" && COUNTRY) {

    const { data: res } = await sb.rpc("analytics_top_cities", {
      p_days: days,
      p_country: COUNTRY,
      p_limit: 100
    });

    data = res || [];
  }

  /* SORT */
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

  if (!marketDemandBody) return;

  marketDemandBody.innerHTML = data.map(r => {

    const ctr = r.views
      ? ((r.clicks / r.views) * 100).toFixed(1) + "%"
      : "0%";

    const label = LEVEL === "country"
      ? r.country
      : [r.city, r.country].filter(Boolean).join(", ");

    return `
      <tr data-country="${r.country}">
        <td>${label || "-"}</td>
        <td>${r.users || 0}</td>
        <td>${r.views || 0}</td>
        <td>${r.clicks || 0}</td>
        <td>${ctr}</td>
      </tr>
    `;
  }).join("");

  /* CLICK DRILLDOWN */
  marketDemandBody.querySelectorAll("tr").forEach(row => {

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

  if (!heatmapBody) return;

  const { data, error } = await sb.rpc(
    "analytics_heatmap_countries",
    { p_days: days }
  );

  if (error) {
    console.error("Heatmap error", error);
    return;
  }

  if (!data?.length) {

    heatmapBody.innerHTML =
      `<tr><td colspan="2" class="muted center">No data yet.</td></tr>`;

    return;
  }

  heatmapBody.innerHTML = data.map(r => `
    <tr>
      <td>${r.country || "—"}</td>
      <td class="num">${Number(r.views)}</td>
    </tr>
  `).join("");

}

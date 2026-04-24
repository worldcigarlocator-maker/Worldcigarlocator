/* ============================================================
WCL — MARKET V2 (CLEAN ENGINE)
============================================================ */

import { supabase } from "/js/globals.js";
import { getKPI } from "/js/analytics-state.js";
const sb = supabase;

console.log("🔥 MARKET V2 LOADED");

/* ============================================================
CTR HELPER (GLOBAL, CANONICAL)
============================================================ */

function getCtrMeta(views, clicks) {

  const v = Number(views || 0);
  const c = Number(clicks || 0);

  const value = v ? (c / v) : 0;
  const label = (value * 100).toFixed(1) + "%";

  let cls = "";

  if (value === 0 && v > 0) cls = "ctr-bad";
  else if (value > 0 && value < 0.2) cls = "ctr-low";
  else if (value >= 0.2) cls = "ctr-good";

  return { label, cls };
}

/* ============================================================
STATE
============================================================ */

const MARKET_STATE = {
  level: "country",
  country: null,
  city: null,
  store: null,
  sort: "views"
};

/* ============================================================
DOM
============================================================ */

function getBody() {
  return document.getElementById("marketDemandBody");
}

/* ============================================================
CLICK HANDLER
============================================================ */

function bindRows(days) {

  const tbody = getBody();
  if (!tbody) return;

  tbody.querySelectorAll("tr").forEach(row => {

    row.onclick = async () => {

      if (MARKET_STATE.level === "country") {

        const country = row.dataset.country;
        if (!country) return;

        MARKET_STATE.level = "city";
        MARKET_STATE.country = country;

        await renderMarketV2(days);
        return;
      }

      if (MARKET_STATE.level === "city") {

        const city = row.dataset.city;
        if (!city) return;

        MARKET_STATE.level = "store";
        MARKET_STATE.city = city;

        await renderMarketV2(days);
        return;
      }

      if (MARKET_STATE.level === "store") {

        const storeId = row.dataset.store;
        if (!storeId) return;

        MARKET_STATE.level = "traffic";
        MARKET_STATE.store = Number(storeId);

        await renderMarketV2(days);
        return;
      }

    };

  });

}

/* ============================================================
MAIN RENDER
============================================================ */

export async function renderMarketV2(days = 30) {

  const KPI = getKPI();

  // 🔥 SYNC SORT MED KPI
  MARKET_STATE.sort = KPI;

  console.log("🔥 MARKET V2 RENDER", {
    ...MARKET_STATE,
    kpi: KPI
  });

  const tbody = getBody();
  if (!tbody) return;

  /* ============================================================
  COUNTRY
  ============================================================ */

   if (MARKET_STATE.level === "country") {

  const { data, error } = await sb.rpc(
    "analytics_heatmap_countries",
    { p_days: days }
  );

  if (error) return console.error(error);

  tbody.innerHTML = (data || []).map(r => {

    const views = Number(r.views || 0);
    const clicks = Number(r.clicks || 0);

    const { label: ctr, cls } = getCtrMeta(views, clicks);

    return `
<tr data-country="${r.country}">
  <td>${r.country || "-"}</td>
  <td class="num">${views}</td>
  <td class="num">${clicks}</td>
  <td class="num ${cls}">${ctr}</td>
</tr>`;

  }).join("");

  bindRows(days);
  return;
}

  /* ============================================================
  CITY
  ============================================================ */

  if (MARKET_STATE.level === "city") {

    const { data, error } = await sb.rpc(
      "analytics_top_cities",
      {
        p_days: days,
        p_day: null,
        p_country: MARKET_STATE.country,
        p_limit: 100
      }
    );

    if (error) return console.error(error);

    tbody.innerHTML = (data || []).map(c => {

      const { label: ctr, cls } = getCtrMeta(c.views, c.clicks);

      return `
<tr data-city="${c.city}">
  <td>${c.city}</td>
  <td class="num">${c.views || 0}</td>
  <td class="num">${c.clicks || 0}</td>
  <td class="num ${cls}">${ctr}</td>
</tr>`;

    }).join("");

    bindRows(days);
    return;
  }

  /* ============================================================
  STORE
  ============================================================ */

  if (MARKET_STATE.level === "store") {

    const { data, error } = await sb.rpc(
      "analytics_top_stores_by_city",
      {
        p_day: null,
        p_country: MARKET_STATE.country,
        p_city: MARKET_STATE.city,
        p_limit: 50
      }
    );

    if (error) return console.error(error);

    tbody.innerHTML = (data || []).map(s => {

      const { label: ctr, cls } = getCtrMeta(s.views, s.clicks);

      return `
<tr data-store="${s.store_id}">
  <td>${s.name}</td>
  <td class="num">${s.views || 0}</td>
  <td class="num">${s.clicks || 0}</td>
  <td class="num ${cls}">${ctr}</td>
</tr>`;

    }).join("");

    bindRows(days);
    return;
  }

  /* ============================================================
  TRAFFIC
  ============================================================ */

  if (MARKET_STATE.level === "traffic") {

    const { data, error } = await sb.rpc(
      "analytics_store_traffic_by_source",
      {
        p_store_id: MARKET_STATE.store,
        p_days: days
      }
    );

    if (error) return console.error(error);

    tbody.innerHTML = (data || []).map(r => {

      const { label: ctr, cls } = getCtrMeta(r.views, r.clicks);

      return `
<tr>
  <td>${r.source || "unknown"}</td>
  <td class="num">${r.views || 0}</td>
  <td class="num">${r.clicks || 0}</td>
  <td class="num ${cls}">${ctr}</td>
</tr>`;

    }).join("");

    return;
  }

}


/* ============================================================
DEBUG
============================================================ */

window.renderMarketV2 = renderMarketV2;

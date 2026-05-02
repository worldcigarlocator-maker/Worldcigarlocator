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
  bindMarketToggle(days);

  const tbody = getBody();
  if (!tbody) return;

  tbody.querySelectorAll("tr").forEach(row => {

    row.onclick = async () => {

      // ============================================================
      // COUNTRY → CITY
      // ============================================================
      if (MARKET_STATE.level === "country") {

        const country = row.dataset.country;
        if (!country) return;

        MARKET_STATE.level = "city";
        MARKET_STATE.country = country;

        await renderMarketV2(days);
        return;
      }

      // ============================================================
      // CITY → STORE
      // ============================================================
      if (MARKET_STATE.level === "city") {

        const city = row.dataset.city;
        if (!city) return;

        MARKET_STATE.level = "store";
        MARKET_STATE.city = city;

        await renderMarketV2(days);
        return;
      }

      // ============================================================
      // STORE → TRAFFIC
      // ============================================================
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
    "analytics_market_v1",
    { p_days: days }
  );

  if (error) return console.error(error);

  if (!data?.length) {
    tbody.innerHTML =
      `<tr><td colspan="4" class="muted center">No data yet.</td></tr>`;
    return;
  }

  // 🔥 SORT (KPI / TOGGLE)
  data.sort((a, b) => {

    switch (MARKET_STATE.sort) {
      case "views":
        return (b.views || 0) - (a.views || 0);
      case "clicks":
        return (b.clicks || 0) - (a.clicks || 0);
      case "ctr":
        return (b.ctr || 0) - (a.ctr || 0);
      default:
        return (b.views || 0) - (a.views || 0);
    }

  });

  tbody.innerHTML = data.map(r => {

const ctrValue = Number(r.ctr || 0);
const ctrLabel = ctrValue.toFixed(1) + "%";

let cls = "";
if (ctrValue === 0 && r.views > 0) cls = "ctr-bad";
else if (ctrValue > 0 && ctrValue < 20) cls = "ctr-low";
else if (ctrValue >= 20) cls = "ctr-good";

    return `
<tr data-country="${r.country}">
  <td>${r.country || "-"}</td>
  <td class="num">${r.views || 0}</td>
  <td class="num">${r.clicks || 0}</td>
  <td class="num ${cls}">${ctrLabel}</td>
</tr>`;
  }).join("");
  
console.log("SEND TO CHART:", MARKET_STATE.sort);
  if (window.renderMarketChart) {
  window.renderMarketChart(data);
}

 bindRows(days);

// 🔥 UPDATE CHART
if (window.renderMarketChart) {
  window.renderMarketChart(data, MARKET_STATE.sort);
}

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
    console.log("SEND TO CHART:", MARKET_STATE.sort);
    if (window.renderMarketChart) {
  window.renderMarketChart(data, MARKET_STATE.sort);
}
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
    console.log("SEND TO CHART:", MARKET_STATE.sort);
    if (window.renderMarketChart) {
  window.renderMarketChart(data, MARKET_STATE.sort);
}
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
    
    console.log("SEND TO CHART:", MARKET_STATE.sort);
    if (window.renderMarketChart) {
  window.renderMarketChart(data, MARKET_STATE.sort);
}

    return;
  }

}

function bindMarketToggle(days) {

  const buttons = document.querySelectorAll(".toggle-btn");

  buttons.forEach(btn => {

    btn.onclick = async () => {

      const sort = btn.dataset.sort;

      // 🔥 sätt sort manuellt
      MARKET_STATE.sort = sort;

      // 🔥 UI active state
      buttons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      // 🔥 re-render
      await renderMarketV2(days);
    };

  });

}




/* ============================================================
DEBUG
============================================================ */

window.renderMarketV2 = renderMarketV2;

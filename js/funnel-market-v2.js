/* ============================================================
WCL — MARKET V2 (CLEAN ENGINE)
============================================================ */

import { supabase } from "/js/globals.js";
import {
  getKPI,
  getActiveDay,
  setActiveDay
} from "/js/analytics-state.js";
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
  user: null,

  sort: "views",
  chartType: "bar"
};

/* ============================================================
DOM
============================================================ */

function getBody() {
  return document.getElementById("marketDemandBody");
}

function getTableHead() {
  return document.querySelector("#marketDemandTable thead");
}

/* ============================================================
HEADERS
============================================================ */

function setMarketHeaders(label = "Location") {

  const thead = getTableHead();
  if (!thead) return;

  thead.innerHTML = `
<tr>
  <th>${label}</th>
  <th class="num">Views</th>
  <th class="num">Clicks</th>
  <th class="num">CTR</th>
</tr>`;
}

function setMemberCityHeaders() {

  const thead = getTableHead();
  if (!thead) return;

  thead.innerHTML = `
<tr>
  <th>City</th>
  <th class="num">Views</th>
  <th class="num">Clicks</th>
  <th class="num">CTR</th>
</tr>`;
}

function setMemberUserHeaders() {

  const thead = getTableHead();
  if (!thead) return;

  thead.innerHTML = `
<tr>
  <th>Member</th>
  <th>Email</th>
  <th class="num">Logins</th>
  <th>Language</th>
</tr>`;
}

function setMemberTimelineHeaders() {

  const thead = getTableHead();
  if (!thead) return;

  thead.innerHTML = `
<tr>
  <th>Time</th>
  <th>Event</th>
  <th>Source</th>
  <th>Country</th>
</tr>`;
}

/* ============================================================
EMPTY STATE
============================================================ */

function renderEmpty(tbody, colspan = 4) {

  tbody.innerHTML = `
<tr>
  <td colspan="${colspan}" class="muted center">
    No data yet.
  </td>
</tr>`;
}

/* ============================================================
CHART
============================================================ */

function renderChart(data) {

  if (!window.renderMarketChart) return;
  if (MARKET_STATE.level === "member_timeline") return;
  if (MARKET_STATE.level === "member_user") return;

  window.renderMarketChart(
    data || [],
    MARKET_STATE.sort,
    MARKET_STATE.chartType
  );
}

/* ============================================================
CLICK HANDLER
============================================================ */

function bindRows(days) {

  const tbody = getBody();
  if (!tbody) return;

  tbody.querySelectorAll("tr").forEach(row => {

    row.onclick = async () => {

      console.log("🔥 CLICK KPI:", getKPI());
      console.log("🔥 CLICK LEVEL:", MARKET_STATE.level);

      /* ============================================================
      COUNTRY → CITY / MEMBER CITY
      ============================================================ */

      if (MARKET_STATE.level === "country") {

        const country = row.dataset.country;
        if (!country) return;

        MARKET_STATE.country = country;

        MARKET_STATE.city = null;
        MARKET_STATE.store = null;
        MARKET_STATE.user = null;

        setActiveDay(
          new Date().toISOString().split("T")[0]
        );

        if (getKPI() === "users") {
          MARKET_STATE.level = "member_city";
        } else {
          MARKET_STATE.level = "city";
        }

        await renderMarketV2(days);

        return;
      }

      /* ============================================================
      CITY → STORE / MEMBER USER
      ============================================================ */

      if (
        MARKET_STATE.level === "city" ||
        MARKET_STATE.level === "member_city"
      ) {

        const city = row.dataset.city;
        if (!city) return;

        MARKET_STATE.city = city;

        MARKET_STATE.store = null;
        MARKET_STATE.user = null;

        if (MARKET_STATE.level === "member_city") {
          MARKET_STATE.level = "member_user";
        } else {
          MARKET_STATE.level = "store";
        }

        await renderMarketV2(days);

        return;
      }

      /* ============================================================
      MEMBER USER → TIMELINE
      ============================================================ */

      if (MARKET_STATE.level === "member_user") {

        const userId = row.dataset.user;
        if (!userId) return;

        MARKET_STATE.user = userId;
        MARKET_STATE.level = "member_timeline";

        await renderMarketV2(days);

        return;
      }

      /* ============================================================
      STORE → TRAFFIC
      ============================================================ */

      if (MARKET_STATE.level === "store") {

        const storeId = row.dataset.store;
        if (!storeId) return;

        MARKET_STATE.store = Number(storeId);
        MARKET_STATE.level = "traffic";

        await renderMarketV2(days);

        return;
      }

    };

  });

}

/* ============================================================
COUNTRY RENDER
============================================================ */

async function renderCountry(days, tbody) {

  setMarketHeaders("Location");

  const { data, error } = await sb.rpc(
    "analytics_market_v1",
    { p_days: days }
  );

  if (error) return console.error(error);

  if (!data?.length) {
    renderEmpty(tbody);
    return;
  }

  data.sort((a, b) => {

    switch (MARKET_STATE.sort) {

      case "views":
        return (b.views || 0) - (a.views || 0);

      case "clicks":
        return (b.clicks || 0) - (a.clicks || 0);

      case "ctr":
        return ((b.clicks || 0) / (b.views || 1)) -
               ((a.clicks || 0) / (a.views || 1));

      default:
        return (b.views || 0) - (a.views || 0);
    }

  });

  tbody.innerHTML = data.map(r => {

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

  window.WCL_MARKET_DATA = data;

  renderChart(data);
}

/* ============================================================
CITY RENDER
============================================================ */

async function renderCity(days, tbody) {

  let data = null;
  let error = null;

  if (MARKET_STATE.level === "member_city") {

    setMemberCityHeaders();

    const activeDay =
      getActiveDay() ||
      new Date().toISOString().split("T")[0];

    console.log("🔥 MEMBER DAY:", activeDay);

    const res = await sb.rpc(
      "analytics_member_cities",
      {
        p_day: activeDay,
        p_country: MARKET_STATE.country
      }
    );

    data = res.data;
    error = res.error;

  } else {

    setMarketHeaders("City");

    const res = await sb.rpc(
      "analytics_top_cities",
      {
        p_days: days,
        p_country: MARKET_STATE.country,
        p_limit: 100
      }
    );

    data = res.data;
    error = res.error;
  }

  if (error) return console.error(error);

  if (!data?.length) {
    renderEmpty(tbody);
    return;
  }

  tbody.innerHTML = data.map(c => {

    const { label: ctr, cls } =
      getCtrMeta(c.views, c.clicks);

    return `
<tr data-city="${c.city}">
  <td>${c.city || "-"}</td>
  <td class="num">${c.views || 0}</td>
  <td class="num">${c.clicks || 0}</td>
  <td class="num ${cls}">${ctr}</td>
</tr>`;

  }).join("");

  bindRows(days);

  window.WCL_MARKET_DATA = data;

  renderChart(data);
}

/* ============================================================
MEMBER USER RENDER
============================================================ */

async function renderMemberUser(days, tbody) {

  setMemberUserHeaders();

  const { data, error } = await sb.rpc(
    "analytics_members_by_city",
    {
      p_day: String(getActiveDay()),
      p_country: MARKET_STATE.country,
      p_city: MARKET_STATE.city
    }
  );

  if (error) return console.error(error);

  if (!data?.length) {
    renderEmpty(tbody);
    return;
  }

  tbody.innerHTML = data.map(u => {

    return `
<tr data-user="${u.user_id}">
  <td>${u.display_name || u.email || "Unknown"}</td>
  <td>${u.email || "-"}</td>
  <td class="num">${u.total_logins || 0}</td>
  <td>${u.language || "-"}</td>
</tr>`;

  }).join("");

  bindRows(days);

  window.WCL_MARKET_DATA = data;
}

/* ============================================================
MEMBER TIMELINE RENDER
============================================================ */

async function renderMemberTimeline(tbody) {

  setMemberTimelineHeaders();

  const { data, error } = await sb.rpc(
    "analytics_member_timeline",
    {
      p_user_id: MARKET_STATE.user
    }
  );

  if (error) return console.error(error);

  if (!data?.length) {
    renderEmpty(tbody);
    return;
  }

  tbody.innerHTML = data.map(e => {

    return `
<tr>
  <td>${e.event_time || "-"}</td>
  <td>${e.event_type || "-"}</td>
  <td>${e.source || "-"}</td>
  <td>${e.store_country || "-"}</td>
</tr>`;

  }).join("");

  window.WCL_MARKET_DATA = data;
}

/* ============================================================
STORE RENDER
============================================================ */

async function renderStore(days, tbody) {

  setMarketHeaders("Store");

  const { data, error } = await sb.rpc(
    "analytics_top_stores_by_city",
    {
      p_country: MARKET_STATE.country,
      p_city: MARKET_STATE.city,
      p_limit: 50
    }
  );

  if (error) return console.error(error);

  if (!data?.length) {
    renderEmpty(tbody);
    return;
  }

  tbody.innerHTML = data.map(s => {

    const { label: ctr, cls } =
      getCtrMeta(s.views, s.clicks);

    return `
<tr data-store="${s.store_id}">
  <td>${s.name || "-"}</td>
  <td class="num">${s.views || 0}</td>
  <td class="num">${s.clicks || 0}</td>
  <td class="num ${cls}">${ctr}</td>
</tr>`;

  }).join("");

  bindRows(days);

  window.WCL_MARKET_DATA = data;

  renderChart(data);
}

/* ============================================================
TRAFFIC RENDER
============================================================ */

async function renderTraffic(days, tbody) {

  setMarketHeaders("Source");

  const { data, error } = await sb.rpc(
    "analytics_store_traffic_by_source",
    {
      p_store_id: MARKET_STATE.store,
      p_days: days
    }
  );

  if (error) return console.error(error);

  if (!data?.length) {
    renderEmpty(tbody);
    return;
  }

  tbody.innerHTML = data.map(r => {

    const { label: ctr, cls } =
      getCtrMeta(r.views, r.clicks);

    return `
<tr>
  <td>${r.source || "unknown"}</td>
  <td class="num">${r.views || 0}</td>
  <td class="num">${r.clicks || 0}</td>
  <td class="num ${cls}">${ctr}</td>
</tr>`;

  }).join("");

  window.WCL_MARKET_DATA = data;

  renderChart(data);
}

/* ============================================================
MAIN RENDER
============================================================ */

export async function renderMarketV2(days = 30) {

  const KPI = getKPI();

  console.log("🔥 MARKET V2 RENDER", {
    ...MARKET_STATE,
    kpi: KPI
  });

  const tbody = getBody();
  if (!tbody) return;

  /* ============================================================
     USERS FLOW
  ============================================================ */

  if (KPI === "users") {

    if (MARKET_STATE.level === "country") {
      MARKET_STATE.level = "member_city";
    }

    if (MARKET_STATE.level === "member_city") {
      await renderCity(days, tbody);
      return;
    }

    if (MARKET_STATE.level === "member_user") {
      await renderMemberUser(days, tbody);
      return;
    }

    if (MARKET_STATE.level === "member_timeline") {
      await renderMemberTimeline(tbody);
      return;
    }

    return;
  }

  /* ============================================================
     MARKET FLOW
  ============================================================ */

  if (MARKET_STATE.level === "country") {
    await renderCountry(days, tbody);
    return;
  }

  if (MARKET_STATE.level === "city") {
    await renderCity(days, tbody);
    return;
  }

  if (MARKET_STATE.level === "store") {
    await renderStore(days, tbody);
    return;
  }

  if (MARKET_STATE.level === "traffic") {
    await renderTraffic(days, tbody);
    return;
  }
}

/* ============================================================
BIND MARKET
============================================================ */

function bindMarketToggle(getDays) {

  const buttons = document.querySelectorAll(".toggle-btn");

  buttons.forEach(btn => {

    btn.onclick = async () => {

      const sort = btn.dataset.sort;
      if (!sort) return;

      MARKET_STATE.sort = sort;

      buttons.forEach(b =>
        b.classList.remove("active")
      );

      btn.classList.add("active");

      await renderMarketV2(getDays());
    };

  });

  const typeBtns =
    document.querySelectorAll(".chart-type-btn");

  typeBtns.forEach(btn => {

    btn.onclick = async () => {

      const type = btn.dataset.type;
      if (!type) return;

      MARKET_STATE.chartType = type;

      typeBtns.forEach(b =>
        b.classList.remove("active")
      );

      btn.classList.add("active");

      await renderMarketV2(getDays());
    };

  });
}

/* ============================================================
DEBUG
============================================================ */

window.renderMarketV2 = renderMarketV2;

document.addEventListener("DOMContentLoaded", () => {

  const rangeEl =
    document.getElementById("globalRange");

  const getDays = () =>
    Number(rangeEl?.value || 30);

  bindMarketToggle(getDays);

});

export function renderHeatmap() {
  console.log("🔥 HEATMAP PLACEHOLDER");
}

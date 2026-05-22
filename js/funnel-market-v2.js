/* ============================================================
WCL - Market V2
============================================================ */

import { supabase } from "/js/globals.js";
import {
  getKPI,
  getActiveDay,
  setActiveDay
} from "/js/analytics-state.js";
const sb = supabase;

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

  level:
    getKPI() === "users"
      ? "member_day"
      : "country",

  country: null,
  city: null,
  store: null,
  user: null,

  sort: "views",
  chartType: "bar"

};

MARKET_STATE.memberDays = 7;

window.MARKET_STATE = MARKET_STATE;

/* ============================================================
DOM
============================================================ */

function getBody() {
  return document.getElementById("marketDemandBody");
}

function getTableHead() {
  return document.querySelector("#marketDemandTable thead");
}
function getBreadcrumb() {
  return document.getElementById("marketBreadcrumb");
}

function renderBreadcrumb() {

  const el = getBreadcrumb();
  if (!el) return;

  const items = [];

  if (getKPI() === "users") {

    items.push(`
      <span class="crumb active" data-level="member_day">
        Members
      </span>
    `);

    if (getActiveDay()) {
      items.push(`
        <span class="crumb" data-level="member_country">
          ${getActiveDay()}
        </span>
      `);
    }

    if (MARKET_STATE.country) {
      items.push(`
        <span class="crumb" data-level="member_city">
          ${MARKET_STATE.country}
        </span>
      `);
    }

    if (MARKET_STATE.city) {
      items.push(`
        <span class="crumb" data-level="member_user">
          ${MARKET_STATE.city}
        </span>
      `);
    }

  } else {

    items.push(`
      <span class="crumb active">
        Market
      </span>
    `);

  }

  el.innerHTML = items.join(`
    <span class="crumb-sep">›</span>
  `);

  el.classList.remove("hidden");

  el.querySelectorAll(".crumb").forEach(c => {

    c.onclick = async () => {

      const level = c.dataset.level;
      if (!level) return;

      MARKET_STATE.level = level;

      if (level === "member_day") {
        MARKET_STATE.country = null;
        MARKET_STATE.city = null;
        MARKET_STATE.user = null;
      }

      if (level === "member_country") {
        MARKET_STATE.city = null;
        MARKET_STATE.user = null;
      }

      if (level === "member_city") {
        MARKET_STATE.user = null;
      }

      await renderMarketV2();
    };

  });
}

/* ============================================================
HEADERS
============================================================ */

function setMarketHeaders(
  label = "Location",
  col2 = "Views",
  col3 = "Clicks",
  col4 = "CTR",
  col5 = "",
  col6 = "",
  col7 = ""
) {

  const thead = getTableHead();
  if (!thead) return;

  thead.innerHTML = `
<tr>

  <th>${label}</th>

  <th class="num">
    ${col2}
  </th>

  <th class="num">
    ${col3}
  </th>

  <th class="num">
    ${col4}
  </th>

  ${
    col5
      ? `
        <th class="num">
          ${col5}
        </th>
      `
      : ""
  }

  ${
    col6
      ? `
        <th class="num">
          ${col6}
        </th>
      `
      : ""
  }

  ${
    col7
      ? `
        <th class="num">
          ${col7}
        </th>
      `
      : ""
  }

</tr>
`;

}

function setMemberDayHeaders() {

  const thead = getTableHead();
  if (!thead) return;

  thead.innerHTML = `
<tr>
  <th>Date</th>
  <th class="num">Logins</th>
</tr>`;
}

function setMemberCountryHeaders() {

  const thead = getTableHead();
  if (!thead) return;

  thead.innerHTML = `
<tr>
  <th>Country</th>
  <th class="num">Logins</th>
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

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeAttr(value) {
  return escapeHtml(value)
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* ============================================================
CHART
============================================================ */

function renderChart(data) {

  if (MARKET_STATE.level === "member_timeline") {
    return;
  }

  if (MARKET_STATE.level === "member_user") {
    return;
  }

  // ============================================================
  // MEMBERS
  // ============================================================

  if (getKPI() === "users") {

    if (window.renderMemberChart) {

      window.renderMemberChart(
        data || []
      );

    }

    return;
  }

  // ============================================================
  // MARKET
  // ============================================================

  if (window.renderMarketChart) {

    window.renderMarketChart(
      data || [],
      MARKET_STATE.sort,
      MARKET_STATE.chartType
    );

  }

}

/* ============================================================
CLICK HANDLER
============================================================ */

function bindRows(days) {

  const tbody = getBody();
  if (!tbody) return;

  tbody.querySelectorAll("tr").forEach(row => {

    row.onclick = async () => {

/* ============================================================
MEMBER DAY -> COUNTRY
============================================================ */

if (MARKET_STATE.level === "member_day") {

  const day = row.dataset.day;
  if (!day) return;

  setActiveDay(day);

  MARKET_STATE.level = "member_country";

  await renderMarketV2(days);

  return;
}

/* ============================================================
COUNTRY -> CITY / MEMBER COUNTRY -> MEMBER CITY
============================================================ */

if (
  MARKET_STATE.level === "country" ||
  MARKET_STATE.level === "member_country"
) {

  const country =
    row.dataset.country ||
    row.querySelector("td")?.textContent;

  if (!country) return;

  MARKET_STATE.country =
    String(country).trim();

  MARKET_STATE.city = null;
  MARKET_STATE.store = null;
  MARKET_STATE.user = null;

  if (getKPI() === "users") {

    MARKET_STATE.level =
      "member_city";

  } else {

    MARKET_STATE.level =
      "city";

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
MEMBER DAY RENDER
============================================================ */

async function renderMemberDays(days, tbody) {

  setMemberDayHeaders();

  const { data, error } = await sb.rpc(
    "analytics_member_days",
    {
      p_days: MARKET_STATE.memberDays
    }
  );

  if (error) {
    console.error(error);
    return;
  }

  if (!data?.length) {
    renderEmpty(tbody);
    return;
  }

  tbody.innerHTML = data.map(r => {

  return `
<tr data-day="${r.day}">
  <td>${r.day}</td>
  <td class="num">${r.views || 0}</td>
</tr>`;

}).join("");

  bindRows(days);

  window.WCL_MARKET_DATA = data;

  renderChart(data);
}

/* ============================================================
MEMBER COUNTRY RENDER
============================================================ */

async function renderMemberCountries(days, tbody) {

  setMemberCountryHeaders();

  const activeDay =
    getActiveDay() ||
    new Date().toISOString().split("T")[0];

  const { data, error } = await sb.rpc(
    "analytics_member_countries",
    {
      p_day: activeDay
    }
  );

  if (error) {
    console.error(error);
    return;
  }

  if (!data?.length) {
    renderEmpty(tbody);
    return;
  }

tbody.innerHTML = data.map(r => {

  return `
<tr data-country="${r.country}">
  <td>${r.country || "-"}</td>
  <td class="num">${r.views || 0}</td>
</tr>`;

}).join("");

  bindRows(days);

  window.WCL_MARKET_DATA = data;

  renderChart(data);
}

/* ============================================================
MEMBER CITY RENDER
============================================================ */

async function renderMemberCities(days, tbody) {

  setMemberCityHeaders();

  const activeDay =
    getActiveDay() ||
    new Date().toISOString().split("T")[0];

  const { data, error } = await sb.rpc(
    "analytics_member_cities",
    {
      p_day: activeDay,
      p_country: MARKET_STATE.country
    }
  );

  if (error) {
    console.error(error);
    return;
  }

  if (!data?.length) {
    renderEmpty(tbody, 4);
    return;
  }

  data.sort((a, b) =>
    Number(b.views || 0) - Number(a.views || 0)
  );

  tbody.innerHTML = data.map(r => {

    const views = Number(r.views || 0);
    const clicks = Number(r.clicks || 0);
    const ctr =
      views > 0
        ? ((clicks / views) * 100).toFixed(1) + "%"
        : "0.0%";

    return `
<tr data-city="${escapeAttr(r.city || "")}">
  <td>${escapeHtml(r.city || "-")}</td>
  <td class="num">${views}</td>
  <td class="num">${clicks}</td>
  <td class="num">${ctr}</td>
</tr>`;

  }).join("");

  bindRows(days);

  window.WCL_MARKET_DATA = data;

  renderChart(data);
}

/* ============================================================
COUNTRY RENDER
============================================================ */

async function renderCountry(days, tbody) {

  setMarketHeaders(
    "Country",
    "Visitors",
    "Clicks",
    "CTR",
    "Momentum",
    "Discovery",
    "Top City"
  );

  const { data, error } = await sb.rpc(
    "analytics_market_countries_v1",
    {
      p_days: days
    }
  );

  if (error) {
    console.error(error);
    return;
  }

  if (!data?.length) {
    renderEmpty(tbody, 7);
    return;
  }

  data.sort((a, b) => {

    switch (MARKET_STATE.sort) {

      case "views":
        return (b.visitors || 0) -
               (a.visitors || 0);

      case "clicks":
        return (b.clicks || 0) -
               (a.clicks || 0);

      case "ctr":
        return Number(b.ctr || 0) -
               Number(a.ctr || 0);

      default:
        return (b.visitors || 0) -
               (a.visitors || 0);

    }

  });

  tbody.innerHTML = data.map((r, index) => {

    const visitors =
      Number(r.visitors || 0);

    const clicks =
      Number(r.clicks || 0);

    const ctr =
      Number(r.ctr || 0).toFixed(1) + "%";

    const momentum =
      r.momentum || "Stable";

    const discovery =
      r.discovery || "Direct";

    const topCity =
      r.top_city || "-";

    const trafficWidth =
      Math.min(
        (visitors / data[0].visitors) * 100,
        100
      );

    let momentumClass =
      "momentum-stable";

    if (momentum === "Hot") {
      momentumClass = "momentum-hot";
    }

    if (momentum === "Growing") {
      momentumClass = "momentum-growing";
    }

    let discoveryClass =
      "discovery-direct";

    if (
      discovery.toLowerCase() ===
      "search"
    ) {
      discoveryClass =
        "discovery-search";
    }

    if (
      discovery.toLowerCase() ===
      "map"
    ) {
      discoveryClass =
        "discovery-map";
    }

    if (
      discovery.toLowerCase() ===
      "sidebar"
    ) {
      discoveryClass =
        "discovery-sidebar";
    }

    return `

<tr
  data-country="${r.country}"
  class="
    market-country-row
    ${index === 0 ? "top-row" : ""}
  "
>

  <td class="market-country-cell">

    <div class="market-country-main">

      <span class="market-country-name">
        ${r.country || "-"}
      </span>

      <div class="market-traffic-bar">

        <div
          class="market-traffic-fill"
          style="
            width:${trafficWidth}%;
          "
        ></div>

      </div>

    </div>

  </td>

  <td class="num">
    ${visitors}
  </td>

  <td class="num">
    ${clicks}
  </td>

  <td class="num ctr-good">
    ${ctr}
  </td>

  <td class="num">

    <span class="
      momentum-pill
      ${momentumClass}
    ">
      ${momentum}
    </span>

  </td>

  <td class="num">

    <span class="
      discovery-pill
      ${discoveryClass}
    ">
      ${discovery}
    </span>

  </td>

  <td class="num">

    <span class="top-city-pill">
      ${topCity}
    </span>

  </td>

</tr>

`;

  }).join("");

  bindRows(days);

  window.WCL_MARKET_DATA = data;

  renderChart(data);

}

/* ============================================================
CITY RENDER
============================================================ */

async function renderCity(days, tbody) {

  setMarketHeaders(
    "City",
    "Visitors",
    "Clicks",
    "CTR",
    "Momentum",
    "Discovery"
  );

  const { data, error } = await sb.rpc(
    "analytics_market_cities_v1",
    {
      p_country: MARKET_STATE.country,
      p_days: days
    }
  );

  if (error) {
    console.error(error);
    return;
  }

  if (!data?.length) {
    renderEmpty(tbody, 6);
    return;
  }

  data.sort((a, b) => {

    switch (MARKET_STATE.sort) {

      case "views":
        return (b.visitors || 0) - (a.visitors || 0);

      case "clicks":
        return (b.clicks || 0) - (a.clicks || 0);

      case "ctr":
        return Number(b.ctr || 0) - Number(a.ctr || 0);

      default:
        return (b.visitors || 0) - (a.visitors || 0);
    }

  });

  tbody.innerHTML = data.map(r => {

    const visitors = Number(r.visitors || 0);
    const clicks = Number(r.clicks || 0);
    const ctr = Number(r.ctr || 0).toFixed(1) + "%";

    const momentum = r.momentum || "Stable";
    const discovery = r.discovery || "Direct";

    let momentumClass = "momentum-stable";

    if (momentum === "Hot") {
      momentumClass = "momentum-hot";
    }

    if (momentum === "Growing") {
      momentumClass = "momentum-growing";
    }

    let discoveryClass = "discovery-direct";

    if (discovery.toLowerCase() === "search") {
      discoveryClass = "discovery-search";
    }

    if (discovery.toLowerCase() === "map") {
      discoveryClass = "discovery-map";
    }

    if (discovery.toLowerCase() === "sidebar") {
      discoveryClass = "discovery-sidebar";
    }

    return `
<tr data-city="${r.city}">

  <td>
    ${r.city || "-"}
  </td>

  <td class="num">
    ${visitors}
  </td>

  <td class="num">
    ${clicks}
  </td>

  <td class="num">
    ${ctr}
  </td>

  <td class="num">
    <span class="momentum-pill ${momentumClass}">
      ${momentum}
    </span>
  </td>

  <td class="num">
    <span class="discovery-pill ${discoveryClass}">
      ${discovery}
    </span>
  </td>

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

  const tbody = getBody();
  if (!tbody) return;
  renderBreadcrumb();
  

  /* ============================================================
     USERS FLOW
  ============================================================ */
if (KPI === "users") {

  if (MARKET_STATE.level === "member_day") {
    await renderMemberDays(days, tbody);
    return;
  }

  if (MARKET_STATE.level === "member_country") {
    await renderMemberCountries(days, tbody);
    return;
  }

  if (MARKET_STATE.level === "member_city") {
    await renderMemberCities(days, tbody);
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
MEMBER RANGE
============================================================ */

function bindMemberRange() {

  const buttons =
    document.querySelectorAll(".member-range-btn");

  buttons.forEach(btn => {

    btn.onclick = async () => {

      const days =
        Number(btn.dataset.range || 7);

      MARKET_STATE.memberDays = days;

      MARKET_STATE.level = "member_day";

      MARKET_STATE.country = null;
      MARKET_STATE.city = null;
      MARKET_STATE.user = null;

      buttons.forEach(b =>
        b.classList.remove("active")
      );

      btn.classList.add("active");

      await renderMarketV2(days);

    };

  });

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
  bindMemberRange();

});

export function renderHeatmap() {
  // Reserved for the future heatmap panel.
}

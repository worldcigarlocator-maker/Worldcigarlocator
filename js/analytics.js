import { supabase } from "./globals.js";
import {
  getKPI,
  setKPI,
  getLevel,
  getActiveDay,
  getActiveCountry
} from "./analytics-state.js";

console.log("🔥 KPI SCRIPT LOADED");
console.log("STEP 1");

const sb = supabase;

console.log("STEP 2");


/* ============================================================
   WCL Analytics — Backoffice
   ============================================================ */

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const globalRangeSelect = document.getElementById("globalRange");
const globalSessions = $("#globalSessions");
const globalStores = $("#globalStores");

const trafficFlowBody = $("#trafficFlowBody");
const heatmapBody = $("#heatmapBody");

const searchInput = $("#searchInput");
const searchResults = $("#searchResults");
const searchBtn = $("#searchBtn");
const clearBtn = $("#clearBtn");

const storeEmpty = $("#storeEmpty");
const storePanel = $("#storePanel");

if (globalRangeSelect) {
  globalRangeSelect.addEventListener("change", async () => {

    const days = Number(globalRangeSelect?.value || 30);

    await loadGlobalKpis();
    await loadTrafficFlow();
    await loadHeatmap();
    await loadMarketTable(days);
    await renderOverview();

    if (ACTIVE_STORE) {
      await loadStoreDossier(ACTIVE_STORE.id);
    }

  });
}
const exportBtn = $("#exportBtn");
const printBtn = $("#printBtn");
const mailBtn = $("#mailBtn");

const storeName = $("#storeName");
const storeLocation = $("#storeLocation");
const storeTypeAccess = $("#storeTypeAccess");
const storeWebsite = $("#storeWebsite");

const kpiViews = $("#kpiViews");
const kpiClicks = $("#kpiClicks");
const kpiCtr = $("#kpiCtr");

const globalViews = $("#globalViews");
const globalClicks = $("#globalClicks");
const globalCtr = $("#globalCtr");

const trendTbody = $("#trendTable tbody");
const eventsTbody = $("#eventsTable tbody");

const overviewTableBody = $("#overviewTable tbody");
const ovKeyHeader = $("#ovKeyHeader");
const overviewSearch = $("#overviewSearch");

const marketDemandBody = $("#marketDemandBody");
const topStoresBody = $("#topStoresBody");


let STORES_INDEX = [];
let ACTIVE_STORE = null;

let OVERVIEW_TAB = "countries";

let CURRENT_OVERVIEW_ROWS = [];
let CURRENT_KPI = "views";

/* ============================================================
   GLOBAL KPIs
   ============================================================ */

async function loadGlobalKpis() {

  // -------------------------
  // MAIN KPI
  // -------------------------
  const { data, error } = await sb.rpc("analytics_kpi_v2", {
    p_days: 30
  });

  if (error) {
    console.error("KPI error", error);
    return;
  }

  if (!data || !data.length) return;

  const row = data[0];

  if (globalViews) globalViews.textContent = row.views ?? "0";
  if (globalClicks) globalClicks.textContent = row.clicks ?? "0";
  if (globalCtr) globalCtr.textContent = (row.ctr ?? 0) + "%";

  // -------------------------
  // SESSIONS
  // -------------------------
  const { data: sessionData, error: sessionError } =
    await sb.rpc("analytics_sessions_v1", { p_days: 30 });

  if (sessionError) {
    console.error("Sessions error", sessionError);
    return;
  }

  if (sessionData?.length) {
    const s = sessionData[0].sessions || 0;
    if (globalSessions) globalSessions.textContent = s;
  }

   const { count: storesCount, error: storesError } = await sb
  .from("stores_frontend_public_v5")
  .select("*", { count: "exact", head: true })
  .eq("approved", true)
  .eq("deleted", false);

if (!storesError) {
  const s = storesCount || 0;
  if (globalStores) globalStores.textContent = s;
}

}

// ============================================================
// KPI → DRILLDOWN NAV
// ============================================================

function showMarketPanel(panelId) {

  const panels = [
    "panel-heatmap",
    "panel-performance",
    "panel-intelligence"
  ];

  panels.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;

    el.style.display = (id === panelId) ? "block" : "none";
  });

}


function goToMarketTab(panel = "panel-heatmap") {

  const tb = document.getElementById("drilldownToolbar");
  if (tb) tb.style.display = "block";

  // activate tab
  document.querySelectorAll(".btn.tab")
    .forEach(b => b.classList.remove("active"));

  document.querySelector('[data-tab="market"]')
    ?.classList.add("active");

  // hide all tabs
  document.querySelectorAll(".analytics-tab")
    .forEach(el => el.classList.add("hidden"));

  // show market tab
  document.getElementById("tab-market")
    ?.classList.remove("hidden");

  loadHeatmap();
  loadMarketTable();

  showMarketPanel(panel);
}


async function loadMarketTable(days = 30) {

  const LEVEL = getLevel();
  const DAY = getActiveDay();
  const COUNTRY = getActiveCountry();

  let data = [];

  /* ============================================================
     COUNTRY LEVEL
     ============================================================ */
  if (LEVEL === "country") {

    const { data: res } = await sb.rpc("analytics_top_countries", {
      p_days: days,
      p_limit: 100
    });

    data = res || [];
  }

  /* ============================================================
     CITY LEVEL
     ============================================================ */
  if (LEVEL === "city" && COUNTRY) {

    const { data: res } = await sb.rpc("analytics_top_cities", {
      p_days: days,
      p_country: COUNTRY,
      p_limit: 100
    });

    data = res || [];
  }

  /* ============================================================
     SORT (DRIVEN BY KPI)
     ============================================================ */
  data.sort((a, b) => {

    switch (getKPI()) {

      case "users":
        return (b.users || 0) - (a.users || 0);

      case "views":
        return (b.views || 0) - (a.views || 0);

      case "clicks":
        return (b.clicks || 0) - (a.clicks || 0);

      case "stores":
        return (b.stores || 0) - (a.stores || 0);

      case "ctr":
        return ((b.clicks / b.views) || 0) - ((a.clicks / a.views) || 0);

      default:
        return (b.users || 0) - (a.users || 0);
    }
  });

/* ============================================================
   RENDER
   ============================================================ */

trafficFlowBody.innerHTML = data.map(r => {

  const ctr = r.views
    ? ((r.clicks / r.views) * 100).toFixed(1) + "%"
    : "0%";

  const label = LEVEL === "country"
    ? r.country
    : r.city;

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

/* ============================================================
   ROW CLICK — DRILLDOWN
   ============================================================ */

const rows = trafficFlowBody.querySelectorAll("tr");

rows.forEach(row => {
  row.addEventListener("click", () => {

    const LEVEL = getLevel();

    if (LEVEL === "country") {

      const country = row.dataset.country;

      if (!country) return;

      setCountry(country);
      setLevel("city");

      loadMarketTable();
    }

  });
});
}

// ============================================================
// KPI BINDINGS
// ============================================================

function bindKPI() {

  ["kpiSessions", "kpiViews", "kpiStores", "kpiClicks", "kpiCtr"]
  .forEach(id => {

    const el = document.getElementById(id);
    if (!el) return;

    el.addEventListener("click", async () => {

      console.log("KPI CLICK:", id);

      let panel = "panel-performance";

      if (id === "kpiViews") {
        CURRENT_KPI = "views";
        panel = "panel-heatmap";
      }

      if (id === "kpiClicks") {
        CURRENT_KPI = "clicks";
      }

      if (id === "kpiCtr") {
        CURRENT_KPI = "ctr";
      }

      if (id === "kpiStores") {
        CURRENT_KPI = "stores";
        panel = "panel-intelligence";
      }

      if (id === "kpiSessions") {
        CURRENT_KPI = "sessions";
      }

      console.log("CURRENT KPI:", CURRENT_KPI);

      await loadMarketTable();

     goToMarketTab(panel);
updateDrilldownUI("market");

    });

  });

}

function updateDrilldownUI(tab) {

  const tb = document.getElementById("drilldownToolbar");
  const title = document.getElementById("viewTitle");

  if (!tb || !title) return;

  // ❌ hide in overview
  if (tab === "overview") {
    tb.style.display = "none";
    return;
  }

  // ✅ show annars
  tb.style.display = "block";

  // 🔥 KPI label
  let kpiLabel = "Views";

  if (CURRENT_KPI === "views") kpiLabel = "Views";
  if (CURRENT_KPI === "clicks") kpiLabel = "Clicks";
  if (CURRENT_KPI === "ctr") kpiLabel = "CTR";
  if (CURRENT_KPI === "stores") kpiLabel = "Stores";
  if (CURRENT_KPI === "sessions") kpiLabel = "Sessions";

  // 🔥 TAB label
  let tabLabel = "Market";

  if (tab === "market") tabLabel = "Market";
  if (tab === "stores") tabLabel = "Stores";

  // 🧠 final title
  title.textContent = `${kpiLabel} — ${tabLabel}`;
}

/* ============================================================
   KPI MINI (TOOLBAR)
   ============================================================ */

function bindKpiMini() {

  const items = document.querySelectorAll(".kpi-mini");

  if (!items.length) {
    console.warn("No KPI mini found");
    return;
  }

  items.forEach(el => {

    el.addEventListener("click", async () => {

      const kpi = el.dataset.kpi;
      if (!kpi) return;

      console.log("KPI MINI CLICK:", kpi);

      // 🔥 SET KPI
      CURRENT_KPI = kpi;

      // 🔥 ACTIVE STATE
      items.forEach(i => i.classList.remove("active"));
      el.classList.add("active");

      // 🔥 PANEL SWITCH + LOAD
      let panel = "panel-performance";

      if (kpi === "views") {
        panel = "panel-heatmap";
        await loadHeatmap();
      }

      if (kpi === "stores") {
        panel = "panel-intelligence";
        await loadMarketTable();
      }

      if (kpi === "clicks" || kpi === "ctr" || kpi === "sessions") {
        panel = "panel-performance";
        await renderOverview(); // temp
      }

      // 🔥 VISA PANEL
      showMarketPanel(panel);

      // 🔥 UPDATE TITLE
      updateDrilldownUI("market");

    });

  });

}
/* ============================================================
   UI BINDINGS
   ============================================================ */

function bindUI() {

  searchInput?.addEventListener("input", onSearchInput);

  searchInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") triggerSearchFromUI();
    if (e.key === "Escape") hideAutocomplete();
  });

   overviewSearch?.addEventListener("input", () => {
  filterOverview();
});
   
  searchBtn?.addEventListener("click", triggerSearchFromUI);
  clearBtn?.addEventListener("click", resetAll);

document.addEventListener("click", (e) => {

  if (!searchResults) return;

  if (!searchResults.contains(e.target) && e.target !== searchInput) {
    hideAutocomplete();
  }

});

  globalRangeSelect?.addEventListener("change", async () => {
    if (!ACTIVE_STORE) return;
    await loadStoreDossier(ACTIVE_STORE.id);
  });

  exportBtn?.addEventListener("click", exportCSV);
  printBtn?.addEventListener("click", () => window.print());
  mailBtn?.addEventListener("click", emailStore);
   }
/* ============================================================
   STORES INDEX
   ============================================================ */

async function loadStoresIndex() {

  const { data, error } = await sb
    .from("analytics_store_search_v1")
    .select("store_id, name, city, country, types, access")
    .eq("deleted", false)
    .eq("approved", true)
    .order("name", { ascending: true })
    .limit(50000);

  if (error) {
    console.error("Failed to load stores index", error);
    return;
  }

  STORES_INDEX = (data || []).map(s => ({
    id: s.store_id,
    name: s.name,
    city: s.city,
    country: s.country,
    types: s.types,
    access: s.access
  }));
}

/* ============================================================
   AUTOCOMPLETE
   ============================================================ */

function onSearchInput() {

  const q = (searchInput.value || "").trim().toLowerCase();

  if (!q) {
    hideAutocomplete();
    return;
  }

  const matches = STORES_INDEX
    .filter(s => {
      const name = (s.name || "").toLowerCase();
      const city = (s.city || "").toLowerCase();
      const country = (s.country || "").toLowerCase();

      return (
        name.includes(q) ||
        city.includes(q) ||
        country.includes(q)
      );
    })
    .slice(0, 12);

  renderAutocomplete(matches);
}

function renderAutocomplete(list) {

  if (!searchResults) return;

  if (!list.length) {

    searchResults.innerHTML = `
      <div class="search-item">
        <strong>No matches</strong><br>
        <small>Try another spelling.</small>
      </div>`;

    searchResults.classList.remove("hidden");
    return;
  }

  searchResults.innerHTML = list.map(s => `
    <div class="search-item" data-id="${s.id}">
      <strong>${escapeHtml(s.name)}</strong><br>
      <small>${escapeHtml([s.city, s.country].filter(Boolean).join(", "))}</small>
    </div>
  `).join("");

  $$(".search-item").forEach(el => {

    const id = el.dataset.id;

    if (!id) return;

    el.addEventListener("click", () => {
      selectStoreById(Number(id));
    });
  });

  searchResults.classList.remove("hidden");
}

function hideAutocomplete() {
  searchResults?.classList.add("hidden");
}

function triggerSearchFromUI() {

  const q = (searchInput.value || "").trim().toLowerCase();

  if (!q) return;

  const first = searchResults?.querySelector(".search-item[data-id]");

  if (first?.dataset?.id) {
    selectStoreById(Number(first.dataset.id));
    return;
  }

  const match = STORES_INDEX.find(s =>
    (s.name || "").toLowerCase().includes(q)
  );

  if (match) selectStoreById(Number(match.id));
}

/* ============================================================
   STORE DOSSIER
   ============================================================ */

async function selectStoreById(storeId) {
console.log("SELECT STORE", storeId);
  hideAutocomplete();

const { data, error } = await sb
  .from("stores")
  .select("*")
  .eq("id", storeId)
  .single();

console.log("STORE FETCH RESULT", data, error);
   
if (error || !data) {
  console.error("Failed to load store", error);
  return;
}

  // ✅ NU finns data
  searchInput.value = data.name || "";
   searchInput.blur(); // stänger keyboard / fokus

  ACTIVE_STORE = data;

storeEmpty.classList.add("hidden");
storePanel.classList.remove("hidden");
console.log("PANEL STATE", storePanel.classList);

storePanel.scrollIntoView({
  behavior: "smooth",
  block: "start"
});

// 🔥 FORCE OPEN STORE TAB
document.querySelectorAll(".analytics-tab").forEach(el => {
  el.classList.add("hidden");
});

const tab = document.getElementById("tab-stores");
if (tab) {
  tab.classList.remove("hidden");
}

// 🔥 CONTINUE
renderStoreHeader(data);

await loadStoreDossier(storeId);
}

// =============================
function renderStoreHeader(s) {

  storeName.textContent = s.name || "—";

  storeLocation.textContent =
    [s.city, s.country].filter(Boolean).join(", ") || "—";

  const t = Array.isArray(s.types)
    ? s.types.join(", ")
    : (s.type || "—");

  const a = s.access
    ? String(s.access).toUpperCase()
    : "—";

  storeTypeAccess.textContent = `Type: ${t} • Access: ${a}`;

  if (s.website) {

    storeWebsite.innerHTML =
      `Website: <a href="${s.website}" target="_blank" rel="noopener">${escapeHtml(s.website)}</a>`;

  } else {

    storeWebsite.textContent = "Website: —";
  }
}

async function loadStoreDossier(storeId) {
     console.log("LOAD DOSSIER START", storeId);


const days = Number(globalRangeSelect?.value || 30);

const { data: summary, error: e1 } =
  await sb.rpc("analytics_store_summary", {
    p_store_id: storeId,
    p_days: days
  });

console.log("SUMMARY RESULT", summary, e1);

  if (e1) {

    console.error("analytics_store_summary error", e1);
    setKpis(0, 0);

  } else {

    setKpis(summary?.views || 0, summary?.clicks || 0);
  }

  const { data: trend, error: e2 } =
    await sb.rpc("analytics_store_daily", {
      p_store_id: storeId,
      p_days: days
    });

  if (e2) {

    console.error("analytics_store_daily error", e2);

 if (trendTbody) {
  trendTbody.innerHTML =
    `<tr><td colspan="4" class="muted center">No data.</td></tr>`;
}

  } else {

 if (trendTbody) {
  renderTrend(trend || []);
}
 }
 }
   
/* ============================================================
   KPI RENDER
   ============================================================ */

function setKpis(views, clicks) {

  const v = Number(views) || 0;
  const c = Number(clicks) || 0;

  const ctr =
    v > 0
      ? ((c / v) * 100).toFixed(1) + "%"
      : "0%";

  kpiViews.textContent = String(v);
  kpiClicks.textContent = String(c);
  kpiCtr.textContent = ctr;
}

/* ============================================================
   TREND TABLE
   ============================================================ */

function renderTrend(rows) {

  if (!rows.length) {

    trendTbody.innerHTML =
      `<tr><td colspan="4" class="muted center">No data.</td></tr>`;

    return;
  }

  trendTbody.innerHTML = rows.map(r => {

    const views = Number(r.views || 0);
    const clicks = Number(r.clicks || 0);

    const ctr =
      views
        ? ((clicks / views) * 100).toFixed(1) + "%"
        : "0%";

    return `
      <tr>
        <td>${escapeHtml(r.day)}</td>
        <td class="num">${views}</td>
        <td class="num">${clicks}</td>
        <td class="num">${ctr}</td>
      </tr>
    `;

  }).join("");
}

/* ============================================================
   EVENTS TABLE
   ============================================================ */
function renderEvents(rows) {

  if (!rows.length) {

    eventsTbody.innerHTML =
      `<tr><td colspan="5" class="muted center">No events.</td></tr>`;

    return;
  }

  eventsTbody.innerHTML = rows.map(r => `
    <tr>
      <td>${escapeHtml(new Date(r.timestamp).toISOString().replace("T"," ").slice(0,19))}</td>
      <td>${escapeHtml(r.event_type)}</td>
      <td class="num">${escapeHtml(String(r.payload?.store_id || ""))}</td>
      <td>${escapeHtml(r.payload?.source || "")}</td>
      <td>${escapeHtml(r.payload?.session_hash || "")}</td>
    </tr>
  `).join("");
}


/* ============================================================
   OVERVIEW
   ============================================================ */

async function renderOverview() {

const days = 30;
   
  if (OVERVIEW_TAB === "countries")
    ovKeyHeader.textContent = "Country";

  if (OVERVIEW_TAB === "cities")
    ovKeyHeader.textContent = "City";

  if (OVERVIEW_TAB === "stores")
    ovKeyHeader.textContent = "Store";

  let rows = [];

  if (OVERVIEW_TAB === "countries") {

    const { data, error } =
      await sb.rpc("analytics_top_countries", {
        p_days: days,
        p_limit: 100
      });

    if (error) return renderOverviewError(error);

    rows = data || [];

    renderOverviewTable(rows, getOverviewKey);
  }

  if (OVERVIEW_TAB === "cities") {

    const { data, error } =
      await sb.rpc("analytics_top_cities", {
        p_days: days,
        p_limit: 100
      });

    if (error) return renderOverviewError(error);

    rows = data || [];

 renderOverviewTable(rows, getOverviewKey);
  }

  if (OVERVIEW_TAB === "stores") {

    const { data, error } =
      await sb.rpc("analytics_top_stores", {
        p_days: days,
        p_limit: 100
      });

    if (error) return renderOverviewError(error);

    rows = data || [];

 renderOverviewTable(rows, getOverviewKey);
  }
}

function renderOverviewError(err) {

  console.error("Overview error", err);

  overviewTableBody.innerHTML =
    `<tr><td colspan="4" class="muted center">Error loading overview.</td></tr>`;
}

function renderOverviewTable(rows, keyFn) {
   CURRENT_OVERVIEW_ROWS = rows || [];

  if (!rows.length) {

    overviewTableBody.innerHTML =
      `<tr><td colspan="4" class="muted center">No data yet.</td></tr>`;

    return;
  }

  overviewTableBody.innerHTML = rows.map(r => {

    const views = Number(r.views || 0);
    const clicks = Number(r.clicks || 0);

    const ctr =
      views
        ? ((clicks / views) * 100).toFixed(1) + "%"
        : "0%";

    return `
  <tr class="overview-row" data-key="${escapeHtml(keyFn(r))}">
        <td>${escapeHtml(keyFn(r))}</td>
        <td class="num">${views}</td>
        <td class="num">${clicks}</td>
        <td class="num">${ctr}</td>
      </tr>
    `;

  }).join("");

   setTimeout(() => {

  const rowsEls = overviewTableBody.querySelectorAll(".overview-row");

  console.log("BINDING ROWS:", rowsEls.length);

  rowsEls.forEach(tr => {

    tr.style.cursor = "pointer";

    tr.addEventListener("click", async () => {

      const key = tr.dataset.key;

      console.log("CLICKED:", key);

      if (OVERVIEW_TAB === "countries") {
        OVERVIEW_TAB = "cities";
        await renderOverview();
        return;
      }

      if (OVERVIEW_TAB === "cities") {
        OVERVIEW_TAB = "stores";
        await renderOverview();
        return;
      }

      if (OVERVIEW_TAB === "stores") {
        console.log("TODO: open store", key);
      }

    });

  });

}, 0);
   
}

function filterOverview() {

  const q = (overviewSearch?.value || "").toLowerCase().trim();

  // inget filter → visa allt igen
  if (!q) {
    renderOverviewTable(CURRENT_OVERVIEW_ROWS, getOverviewKey);
    return;
  }

  const filtered = CURRENT_OVERVIEW_ROWS.filter(r => {

    const key = getOverviewKey(r).toLowerCase();

    return key.includes(q);
  });

  renderOverviewTable(filtered, getOverviewKey);
}

function getOverviewKey(r) {

  if (OVERVIEW_TAB === "countries") {
    return r.country || "—";
  }

  if (OVERVIEW_TAB === "cities") {
    return [r.city, r.country].filter(Boolean).join(", ");
  }

  if (OVERVIEW_TAB === "stores") {
    return `${r.name || "—"} (${[r.city, r.country].filter(Boolean).join(", ")})`;
  }

  return "—";
}

/* ============================================================
   EXPORT / EMAIL
   ============================================================ */

function exportCSV() {

  if (!ACTIVE_STORE) return;

  const rows = [...trendTbody.querySelectorAll("tr")].map(tr =>
    [...tr.querySelectorAll("td")].map(td =>
      (td.textContent || "").trim()
    )
  );

  if (!rows.length) return;

  const header = ["Date", "Views", "Clicks", "CTR"];

  const csv = [header, ...rows]
    .map(line =>
      line.map(v =>
        `"${String(v).replaceAll(`"`, `""`)}"`
      ).join(",")
    )
    .join("\n");

  const filename =
    `wcl-analytics-store-${ACTIVE_STORE.id}.csv`;

  downloadText(filename, csv, "text/csv");
}

function emailStore() {

  if (!ACTIVE_STORE) return;

  const days = Number(globalRangeSelect?.value || 30);

  const v = kpiViews.textContent || "0";
  const c = kpiClicks.textContent || "0";
  const ctr = kpiCtr.textContent || "0%";

  const subject =
    `World Cigar Locator — traffic report (${days === 0 ? "All time" : `Last ${days} days`})`;

  const body = [
    `Hi!`,
    ``,
    `Here is your World Cigar Locator traffic report:`,
    ``,
    `Store: ${ACTIVE_STORE.name}`,
    `Location: ${[ACTIVE_STORE.city, ACTIVE_STORE.country].filter(Boolean).join(", ")}`,
    `Website: ${ACTIVE_STORE.website || "—"}`,
    ``,
    `Views: ${v}`,
    `Website clicks: ${c}`,
    `CTR: ${ctr}`,
    ``,
    `Regards,`,
    `World Cigar Locator`
  ].join("\n");

  const mailto =
    `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  window.location.href = mailto;
}

function downloadText(filename, text, mime) {

  const blob = new Blob([text], { type: mime });

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");

  a.href = url;
  a.download = filename;

  document.body.appendChild(a);

  a.click();

  a.remove();

  URL.revokeObjectURL(url);
}

/* ============================================================
   RESET
   ============================================================ */

function resetAll() {

  hideAutocomplete();

  searchInput.value = "";

  ACTIVE_STORE = null;

  storePanel.classList.add("hidden");
  storeEmpty.classList.remove("hidden");

  trendTbody.innerHTML = "";
  eventsTbody.innerHTML = "";
}

/* ============================================================
   UTILS
   ============================================================ */

function escapeHtml(str) {

  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/* ============================================================
   TRAFFIC FLOW
   ============================================================ */
async function loadTrafficFlow() {

  if (!trafficFlowBody) return;

  const { data, error } = await sb.rpc(
    "analytics_traffic_flow",
    { p_days: 30 }
  );

  if (error) {
    console.error("Traffic flow error", error);
    return;
  }

  if (!data?.length) {

    trafficFlowBody.innerHTML =
      `<tr><td colspan="4" class="muted center">No data yet.</td></tr>`;

    return;
  }

  trafficFlowBody.innerHTML = data.map(r => {

    const views = Number(r.views || 0);
    const clicks = Number(r.clicks || 0);

    const ctr =
      views
        ? ((clicks / views) * 100).toFixed(2) + "%"
        : "0%";

    return `
      <tr>
        <td>${escapeHtml(r.source || "direct")}</td>
        <td class="num">${views}</td>
        <td class="num">${clicks}</td>
        <td class="num">${ctr}</td>
      </tr>
    `;

  }).join("");
}

/* ============================================================
   HEATMAP
   ============================================================ */

async function loadHeatmap() {

  if (!heatmapBody) return;

  const { data, error } = await sb.rpc(
    "analytics_heatmap_countries",
    { p_days: 30 }
  );

  if (error) {

    console.error("Heatmap error", error);

    heatmapBody.innerHTML =
      `<tr><td colspan="3" class="muted center">Failed to load heatmap.</td></tr>`;

    return;
  }

  if (!data?.length) {

    heatmapBody.innerHTML =
      `<tr><td colspan="3" class="muted center">No data yet.</td></tr>`;

    return;
  }

  heatmapBody.innerHTML = data.map(r => `
    <tr>
      <td>${escapeHtml(r.country || "—")}</td>
      <td class="num">${Number(r.views)}</td>
    </tr>
  `).join("");

}

/* ============================================================
   TOP STORES (STEP 2–4 — CLEAN)
   ============================================================ */

async function loadTopStores() {

  try {

    const days = Number(globalRangeSelect?.value || 30);

    const { data, error } = await sb.rpc(
      "analytics_top_stores_v2",
      {
        p_days: days,
        p_country: null,
        p_city: null,
        p_state: null,
        p_limit: 50
      }
    );

    if (error) {
      console.error("Top stores error", error);
      return;
    }

    if (!topStoresBody) return;

    if (!data || !data.length) {

      topStoresBody.innerHTML =
        `<tr><td colspan="4" class="muted center">No data yet.</td></tr>`;

      return;
    }

    // 🔥 RENDER
    topStoresBody.innerHTML = data.map(r => {

      const location =
        [r.city, r.country].filter(Boolean).join(", ");

  return `
  <tr data-id="${r.store_id}">
    <td>
      <strong>${escapeHtml(r.name)}</strong><br>
      <small>${escapeHtml(location)}</small>
    </td>
    <td class="num">${Number(r.views)}</td>
    <td class="num">${Number(r.clicks)}</td>
    <td class="num">${Number(r.ctr).toFixed(2)}%</td>
  </tr>
`;

    }).join("");

    // 🔥 CLICK HANDLER
topStoresBody.querySelectorAll("tr").forEach((tr) => {

  const id = tr.dataset.id;
  if (!id) return;

  tr.style.cursor = "pointer";

tr.addEventListener("click", () => {
  console.log("ROW DATASET", tr.dataset);
  console.log("ID VALUE", tr.dataset.id);
  selectStoreById(Number(tr.dataset.id));
});

});

  } catch (err) {

    console.error("Top stores crash", err);

  }
}
// ============================================================
// TAB NAVIGATION
// ============================================================

function initTabs() {

  const tabs = document.querySelectorAll(".btn.tab");

  tabs.forEach((tab) => {
    tab.addEventListener("click", async () => {

      // active state
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");

      // hide all tabs
      document.querySelectorAll(".analytics-tab")
        .forEach((el) => el.classList.add("hidden"));

      // show selected tab
      const target = document.getElementById("tab-" + tab.dataset.tab);
      if (target) {
        target.classList.remove("hidden");
      }

      // load data per tab
      const days = Number(globalRangeSelect?.value || 30);

      if (tab.dataset.tab === "market") {
        await loadHeatmap();
        await loadMarketTable(days);
      }

if (tab.dataset.tab === "overview") {
  updateDrilldownUI("overview"); // 🔥 LÄGG TILL
  await renderOverview();
}

      if (tab.dataset.tab === "stores") {
        await loadTopStores();
      }

    });
  });
}


// ============================================================
// INIT
// ============================================================

function init() {

  console.log("🔥 INIT RUNNING");

  // 🔹 bindings
  bindUI();
  bindKPI();
  bindKpiMini();
  initTabs();

  // 🔹 default KPI (toolbar)
  document.querySelector('[data-kpi="sessions"]')?.classList.add("active");

  // 🔹 initial loads
  loadGlobalKpis();
  loadTrafficFlow();
  loadHeatmap();
  renderOverview();
  loadMarketTable();
  loadTopStores();
}

// ============================================================
// START APP
// ============================================================

document.addEventListener("DOMContentLoaded", init);

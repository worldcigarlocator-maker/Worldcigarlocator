
import { supabase } from "./globals.js";
import { renderUsersOverview } from "./funnel-users.js";
import { renderMarket, renderHeatmap } from "./funnel-market.js";
import { renderTopStores } from "./funnel-stores.js";
import {
  getKPI,
  setKPI,
  getLevel,
  getActiveDay,
  setActiveDay,
  getActiveCountry,
  applyCountry,
  subscribe   // 🔥 lägg till denna
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
const globalStores = $("#globalStores");
const globalUsers = $("#globalUsers");

const trafficFlowBody = $("#trafficFlowBody");

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

// 🔥 trigga re-render via state
setKPI(getKPI());


// 🔥 STATE-DRIVEN (handled via subscribe)

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

/* ============================================================
   SET OVERVIEW MODE
   ============================================================ */

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

const topStoresBody = $("#topStoresBody");


let STORES_INDEX = [];
let ACTIVE_STORE = null;


/* ============================================================
   GLOBAL KPIs
   ============================================================ */
async function loadGlobalKpis() {

  const days = Number(globalRangeSelect?.value || 30);

  // -------------------------
  // MAIN KPI
  // -------------------------
  const { data, error } = await sb.rpc("analytics_kpi_v2", {
    p_days: days
  });

  if (error) {
    console.error("KPI error", error);
    return;
  }

  if (data?.length) {
    const row = data[0];

    if (globalViews) globalViews.textContent = row.views ?? "0";
    if (globalClicks) globalClicks.textContent = row.clicks ?? "0";
    if (globalCtr) globalCtr.textContent = (row.ctr ?? 0) + "%";
  }

  // -------------------------
  // USERS (sessions)
  // -------------------------
  const { data: sessionData, error: sessionError } =
    await sb.rpc("analytics_sessions_v1", { p_days: days });

  if (sessionError) {
    console.error("Sessions error", sessionError);
  } else if (sessionData?.length) {
    const s = sessionData[0].sessions || 0;
    if (globalUsers) globalUsers.textContent = s;
  }

  // -------------------------
  // STORES
  // -------------------------
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

   showMarketPanel(panel);
  updateDrilldownUI("market");
}

// OLD MARKET TABLE REMOVED (moved to funnel-market.js)

      // ============================================================
      // MARKET FLOW (alla andra KPI)
      // ============================================================

function updateDrilldownUI(tab) {

  const tb = document.getElementById("drilldownToolbar");
  const title = document.getElementById("viewTitle");

  if (!tb || !title) return;

  if (tab === "overview") {
  tb.style.display = "block"; // 🔥 visa toolbar
}

  // ✅ show annars
  tb.style.display = "block";

  // 🔥 REMOVE TITLE (handled in UI instead)
if (title) title.style.display = "none";
  
}

function bindKpiMini() {

  const items = document.querySelectorAll(".kpi-card");

  items.forEach((el) => {
    el.addEventListener("click", async () => {

      const kpi = el.dataset.kpi;
      if (!kpi) return;

      console.log("KPI CLICK:", kpi);

      // 🔥 RESET ALLT
      items.forEach((i) => i.classList.remove("active"));

      // 🔥 SÄTT NY ACTIVE
      el.classList.add("active");

      setKPI(kpi);
      await new Promise(r => setTimeout(r, 0));

      const usersView = document.getElementById("view-users");
      const marketView = document.getElementById("view-market");
      const storesView = document.getElementById("view-stores");

      usersView?.classList.add("hidden");
      marketView?.classList.add("hidden");
      storesView?.classList.add("hidden");

      const days = Number(globalRangeSelect?.value || 30);

      // -------------------------
      // USERS
      // -------------------------
      if (kpi === "users") {
        usersView?.classList.remove("hidden");
        updateDrilldownUI("overview");
        await renderUsersOverview(days);
        return;
      }

      // -------------------------
      // STORES
      // -------------------------
      if (kpi === "stores") {
        storesView?.classList.remove("hidden");
        updateDrilldownUI("stores");
        await renderTopStores(days);
        return;
      }

// -------------------------
// MARKET
// -------------------------
marketView?.classList.remove("hidden");

updateDrilldownUI("market");

if (kpi === "views") {
  await renderHeatmap(days);
}
await renderMarket(days);
      
        }); 
 }); 
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

// 🔥 FORCE CLEAN TAB SWITCH (CLASS-BASED)
document.querySelectorAll(".analytics-tab").forEach(el => {
  el.classList.add("hidden");
});

const overviewTab = document.getElementById("tab-overview");
if (overviewTab) {
  overviewTab.classList.remove("hidden");
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


// ============================================================
// USERS — OVERVIEW (DAY LEVEL)
// ============================================================

/* ============================================================
   OVERVIEW HANDLED BY funnel-users.js
   ============================================================ */


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


// ============================================================
// INIT
// ============================================================

function init() {

  console.log("🔥 INIT RUNNING");

  // ❌ bindUI borttagen (fanns inte)

  // 🔹 KPI click system
  bindKpiMini();

  // 🔹 default KPI
  setKPI("users");

  // 🔹 active UI state
  document.querySelectorAll(".kpi-card")
    .forEach(el => el.classList.remove("active"));

  document.querySelector('[data-kpi="users"]')
    ?.classList.add("active");

  // 🔹 views
  const usersView = document.getElementById("view-users");
  const marketView = document.getElementById("view-market");
  const storesView = document.getElementById("view-stores");

  usersView?.classList.remove("hidden");
  marketView?.classList.add("hidden");
  storesView?.classList.add("hidden");

  // 🔹 toolbar
  updateDrilldownUI("overview");

  // 🔹 initial render
  renderUsersOverview();

  // 🔹 background
  loadGlobalKpis();
  

}

// ============================================================
// START APP
// ============================================================

document.addEventListener("DOMContentLoaded", init);

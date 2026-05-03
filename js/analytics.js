/* ============================================================
WCL — ANALYTICS.JS
============================================================ */

import { supabase } from "/js/globals.js";
import { renderUsersOverview } from "./funnel-users.js";
import { renderMarketV2 } from "./funnel-market-v2.js";
import { renderHeatmap } from "./funnel-market.js";
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
window.sb = sb; // 

console.log("STEP 2");


/* ============================================================
   WCL Analytics — Backoffice 555
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

/* ============================================================
   SEARCH BINDINGS (LOCAL FILTER)
   ============================================================ */

if (searchInput) {
  searchInput.addEventListener("input", () => {
    runLocalFilter();
  });
}

if (searchBtn) {
  searchBtn.addEventListener("click", () => {
    runLocalFilter();
  });
}

if (clearBtn) {
  clearBtn.addEventListener("click", () => {
    searchInput.value = "";
    resetLocalFilter();
  });
}

const storeEmpty = $("#storeEmpty");
const storePanel = $("#storePanel");

if (globalRangeSelect) {
  globalRangeSelect.addEventListener("change", async () => {

    const days = Number(globalRangeSelect?.value || 30);

await loadGlobalKpis();

// 🔥 trigga re-render via state
const kpi = getKPI();
setKPI(null);
setTimeout(() => setKPI(kpi), 0);

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

  const globalMarket = document.getElementById("globalMarket");
  if (globalMarket) globalMarket.textContent = row.views ?? "0";

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

  // 🔥 STOPPA helt om vi är i STORES
  if (getKPI() === "stores") return;

  const tb = document.getElementById("drilldownToolbar");
  if (tb) tb.style.display = "block";

  document.querySelectorAll(".btn.tab")
    .forEach(b => b.classList.remove("active"));

  document.querySelector('[data-tab="market"]')
    ?.classList.add("active");

  document.querySelectorAll(".analytics-tab")
    .forEach(el => el.classList.add("hidden"));

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

/* ============================================================
KPI MINI
   ============================================================ */
function bindKpiMini() {

  const items = document.querySelectorAll(".kpi-card");

  items.forEach((el) => {
    el.addEventListener("click", () => {

      const kpi = el.dataset.kpi;
      if (!kpi) return;

      console.log("KPI CLICK:", kpi);

      // 🔥 ENDAST STATE
      setKPI(kpi);

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

/* ============================================================
   SEARCH — LOCAL FILTER (MARKET)
   ============================================================ */

function runLocalFilter() {

  const q = (searchInput.value || "").trim().toLowerCase();
  const tbody = document.getElementById("marketDemandBody");
  const info = document.getElementById("filterInfo");

  if (!tbody) return;

  const rows = [...tbody.querySelectorAll("tr")];

  if (!q) {
    resetLocalFilter();
    if (info) info.classList.add("hidden");
    return;
  }

  const filtered = rows.filter(tr => {
    const text = tr.textContent.toLowerCase();
    return text.includes(q);
  });

  tbody.innerHTML = "";

  if (!filtered.length) {

    tbody.innerHTML =
      `<tr><td colspan="4" class="muted center">No results</td></tr>`;

    if (info) {
      info.innerHTML = `0 results for "<strong>${q}</strong>" — clear filter to reset`;
      info.classList.remove("hidden");
    }

    return;
  }

  filtered.forEach(tr => tbody.appendChild(tr));

  // 🔥 INFO BAR
  if (info) {
    info.innerHTML = `${filtered.length} results for "<strong>${q}</strong>"`;
    info.classList.remove("hidden");
  }

  // 🔥 rebuild dataset for chart
  const chartRows = filtered.map(tr => {

    const tds = tr.querySelectorAll("td");

    return {
      label: tds[0]?.textContent || "",
      views: Number(tds[1]?.textContent || 0),
      clicks: Number(tds[2]?.textContent || 0)
    };

  });

  if (window.renderMarketChart) {
    window.renderMarketChart(
      chartRows,
      window.MARKET_STATE?.sort || "views",
      window.MARKET_STATE?.chartType || "bar"
    );
  }
}

/* ============================================================
   EXPORT / EMAIL
   ============================================================ */

/* ============================================================
   PDF EXPORT — FULL REPORT
   ============================================================ */

async function exportPDF() {

  const { jsPDF } = window.jspdf;

  const container = document.createElement("div");
  container.style.padding = "30px";
  container.style.background = "#050505";
  container.style.color = "#fff";
  container.style.width = "1000px";

/* ============================================================
   HEADER (WCL BRAND + LOGO)
   ============================================================ */
const container = document.createElement("div");

container.style.width = "900px"; // 🔥 mindre = bättre A4 fit
container.style.padding = "50px 60px"; // 🔥 mer luft
container.style.background = "#050505";
container.style.color = "#fff";
container.style.fontFamily = "sans-serif";

// 🔥 global spacing reset
container.style.boxSizing = "border-box";
container.style.lineHeight = "1.4";

/* ============================================================
   LEFT: LOGO + BRAND
   ============================================================ */

const left = document.createElement("div");
left.style.display = "flex";
left.style.alignItems = "center";
left.style.gap = "15px";

const logo = document.createElement("img");
logo.src = window.location.origin + "/images/favicon.svg"; 
logo.style.width = "40px";
logo.style.height = "40px";
logo.style.opacity = "0.9";

const brandWrap = document.createElement("div");

const brand = document.createElement("div");
brand.textContent = "World Cigar Locator";
brand.style.fontSize = "22px";
brand.style.fontWeight = "600";
brand.style.color = "rgb(115,98,75)";

const subtitle = document.createElement("div");
subtitle.textContent = "Analytics Report";
subtitle.style.fontSize = "14px";
subtitle.style.opacity = "0.7";

brandWrap.appendChild(brand);
brandWrap.appendChild(subtitle);

left.appendChild(logo);
left.appendChild(brandWrap);

/* ============================================================
   RIGHT: DATE
   ============================================================ */

const right = document.createElement("div");
right.style.textAlign = "right";

const date = document.createElement("div");
date.textContent = new Date().toLocaleString();
date.style.fontSize = "13px";
date.style.opacity = "0.6";

right.appendChild(date);

/* ============================================================
   BUILD HEADER
   ============================================================ */

header.appendChild(left);
header.appendChild(right);

container.appendChild(header);

/* ============================================================
   DIVIDER
   ============================================================ */

const divider = document.createElement("div");
divider.style.height = "1px";
divider.style.background = "linear-gradient(to right, transparent, rgba(115,98,75,0.8), transparent)";
divider.style.marginBottom = "25px";

container.appendChild(divider);
  
  /* ============================================================
     KPI
     ============================================================ */

const kpiWrap = document.createElement("div");

kpiWrap.style.display = "flex";
kpiWrap.style.gap = "30px"; // 🔥 mer luft
kpiWrap.style.marginBottom = "40px"; // 🔥 mer separation

const makeKpi = (label, value) => {

  const box = document.createElement("div");

  box.style.flex = "1";
  box.style.padding = "20px 24px"; // 🔥 större kort
  box.style.borderRadius = "14px";

  // 🔥 premium gradient + glow
  box.style.background = "linear-gradient(145deg, #0f0f0f, #1a1a1a)";
  box.style.border = "1px solid rgba(115,98,75,0.25)";
  box.style.boxShadow = "0 0 25px rgba(115,98,75,0.15)";

  box.innerHTML = `
    <div style="opacity:0.6;font-size:12px;margin-bottom:6px">
      ${label}
    </div>
    <div style="font-size:26px;font-weight:600;letter-spacing:0.5px">
      ${value}
    </div>
  `;

  return box;
};

kpiWrap.appendChild(
  makeKpi("Views", document.getElementById("globalMarket")?.textContent || "0")
);

kpiWrap.appendChild(
  makeKpi("Stores", document.getElementById("globalStores")?.textContent || "0")
);

kpiWrap.appendChild(
  makeKpi("Users", document.getElementById("globalUsers")?.textContent || "0")
);
  /* ============================================================
     TABLE
     ============================================================ */

  const table = document.createElement("table");
  table.style.width = "100%";
  table.style.borderCollapse = "collapse";
  table.style.marginBottom = "30px";

  const originalRows = document.querySelectorAll("#marketDemandBody tr");

  const tableHeader = `
    <tr>
      <th style="text-align:left;padding:8px;border-bottom:1px solid #333">Name</th>
      <th style="text-align:right;padding:8px;border-bottom:1px solid #333">Views</th>
      <th style="text-align:right;padding:8px;border-bottom:1px solid #333">Clicks</th>
      <th style="text-align:right;padding:8px;border-bottom:1px solid #333">CTR</th>
    </tr>
  `;

  const rows = [...originalRows].map(tr => {

    const tds = tr.querySelectorAll("td");

    if (!tds.length) return "";

    return `
      <tr>
        <td style="padding:6px 8px">${tds[0].textContent}</td>
        <td style="padding:6px 8px;text-align:right">${tds[1].textContent}</td>
        <td style="padding:6px 8px;text-align:right">${tds[2].textContent}</td>
        <td style="padding:6px 8px;text-align:right">${tds[3].textContent}</td>
      </tr>
    `;

  }).join("");

  table.innerHTML = tableHeader + rows;
  container.appendChild(table);

  /* ============================================================
     CHART
     ============================================================ */

  const chartCanvas = document.getElementById("marketChart");

  if (chartCanvas) {

    const chartImage = chartCanvas.toDataURL("image/png");

    const img = document.createElement("img");
    img.src = chartImage;
    img.style.width = "100%";

    container.appendChild(img);
  }

  document.body.appendChild(container);

  /* ============================================================
     RENDER PDF
     ============================================================ */

  const canvas = await html2canvas(container, {
    backgroundColor: "#050505",
    scale: 2
  });

  const imgData = canvas.toDataURL("image/png");

  const pdf = new jsPDF("p", "mm", "a4");

  const imgWidth = 190;
  const pageHeight = 297;
  const imgHeight = canvas.height * imgWidth / canvas.width;

  let heightLeft = imgHeight;
  let position = 10;

  pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  pdf.save("wcl-analytics-report.pdf");

  container.remove();
}

/* ============================================================
   EMAIL (OPTIONAL)
   ============================================================ */

function emailStore() {
  alert("Use Export PDF and attach it manually.");
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

    
    const ctrValue = views ? (clicks / views) : 0;

console.log("CTR DEBUG:", {
  source: r.source,
  views,
  clicks,
  ctrValue
});
    const ctr = (ctrValue * 100).toFixed(2) + "%";

let ctrClass = "";

// 🔴 ALLT med 0 CTR = problem
if (ctrValue === 0 && views > 0) ctrClass = "ctr-bad";

// 🟠 låg CTR
else if (ctrValue > 0 && ctrValue < 0.2) ctrClass = "ctr-low";

// 🟢 bra CTR
else if (ctrValue >= 0.2) ctrClass = "ctr-good";

    return `
      <tr>
        <td>${escapeHtml(r.source || "direct")}</td>
        <td class="num">${views}</td>
        <td class="num">${clicks}</td>
       <td class="num ${ctrClass}">
  ${ctr} | class: ${ctrClass} | v:${views} c:${clicks}
</td>
      </tr>
    `;

  }).join("");
}

subscribe(async (state) => {

  const days = Number(globalRangeSelect?.value || 30);

  const usersView = document.getElementById("view-users");
  const marketView = document.getElementById("view-market");
  const storesView = document.getElementById("view-stores");

  // 🔥 RESET ALL
  usersView?.classList.add("hidden");
  marketView?.classList.add("hidden");
  storesView?.classList.add("hidden");

  console.log("SUBSCRIBE TRIGGER", state.kpi);

  // ============================================================
  // USERS
  // ============================================================

  if (state.kpi === "users") {

    usersView?.classList.remove("hidden");

    const m = await import("./funnel-users.js");
    await m.renderUsersOverview(days);

    return;
  }

  // ============================================================
  // STORES
  // ============================================================

if (state.kpi === "stores") {

  marketView?.classList.remove("hidden");

  const m = await import("./funnel-stores-v2.js");
  console.log("MODULE STORES:", m); // 🔥

  await m.renderStoresV2(days);

  return;
}

  // ============================================================
  // MARKET (views / clicks / ctr)
  // ============================================================

  if (
    state.kpi === "views" ||
    state.kpi === "clicks" ||
    state.kpi === "ctr"
  ) {

    marketView?.classList.remove("hidden");

    const m = await import("./funnel-market-v2.js");
    await m.renderMarketV2(days);

    return;
  }

});
  // ============================================================
  // INIT
  // ============================================================

function init() {

  console.log("🔥 INIT RUNNING");

  bindKpiMini();

  if (exportBtn) {
    exportBtn.addEventListener("click", exportPDF);
  }

  // 🔹 default KPI
  setKPI("users");

  // 🔹 active UI state
  document.querySelectorAll(".kpi-card")
    .forEach(el => el.classList.remove("active"));

  document.querySelector('[data-kpi="users"]')
    ?.classList.add("active");

  // 🔹 background
  loadGlobalKpis();

}
// ============================================================
// START APP
// ============================================================

document.addEventListener("DOMContentLoaded", init);

/* ============================================================
   USERS CHART
   ============================================================ */

let usersChart;

window.renderUsersChart = function (rows) {

  if (!rows?.length) return;

  const labels = rows.map(r => r.day).reverse();
  const values = rows.map(r => Number(r.users || 0)).reverse();

  const ctx = document.getElementById("usersChart");
  if (!ctx) return;

  // 🔥 destroy old chart
  if (usersChart) {
    usersChart.destroy();
  }

  usersChart = new Chart(ctx, {
    type: "line",

    data: {
      labels,
      datasets: [{
        label: "Users",
        data: values,

        tension: 0.35,

        borderColor: "#4fd1ff",
        borderWidth: 2,

        pointRadius: 3,
        pointBackgroundColor: "#4fd1ff",

        // 🔥 HOVER EFFECT
        pointHoverRadius: 6,
        pointHoverBackgroundColor: "#ffffff",

        // 🔥 FILL GRADIENT
        fill: true,
        backgroundColor: (ctx) => {
          const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, 260);
          gradient.addColorStop(0, "rgba(79,209,255,0.35)");
          gradient.addColorStop(1, "rgba(79,209,255,0.02)");
          return gradient;
        }
      }]
    },

    options: {
      responsive: true,
      maintainAspectRatio: false,

      // 🔥 SMOOTH INTERACTION
      interaction: {
        mode: "index",
        intersect: false
      },

      plugins: {
        legend: { display: false }
      },

      scales: {
        x: {
          ticks: {
            color: "rgba(255,255,255,0.6)"
          },
          grid: {
            color: "rgba(255,255,255,0.05)"
          }
        },

        y: {
          beginAtZero: true,

          ticks: {
            color: "rgba(255,255,255,0.7)"
          },

          grid: {
            color: "rgba(255,255,255,0.05)"
          }
        }
      }
    }
  });

};

/* ============================================================
   MARKET CHART (SMOOTH ENGINE)
   ============================================================ */

let marketChart;

window.renderMarketChart = function (rows, sort, type = "bar") {

  if (!rows?.length) return;

  sort = sort || "views";

  /* ============================================================
     LABELS
     ============================================================ */

  const labels = rows.map(r =>
    r.city ||
    r.country ||
    r.name ||
    r.source ||
    "—"
  );

  /* ============================================================
     VALUES
     ============================================================ */

  const values = rows.map(r => {

    const views = Number(r.views || 0);
    const clicks = Number(r.clicks || 0);

    if (sort === "views") return views;
    if (sort === "clicks") return clicks;

    if (sort === "ctr") {
      return views > 0 ? (clicks / views) * 100 : 0;
    }

    return 0;
  });

  /* ============================================================
     TOP 10
     ============================================================ */

  const zipped = labels.map((l, i) => ({ label: l, value: values[i] }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const finalLabels = zipped.map(x => x.label);
  const finalValues = zipped.map(x => x.value);

  const ctx = document.getElementById("marketChart");
  if (!ctx) return;

  /* ============================================================
     INIT (FIRST TIME)
     ============================================================ */

if (!marketChart) {

  marketChart = new Chart(ctx, {
    type: type || "bar", // 🔥 FIX

    data: {
      labels: finalLabels,
      datasets: [{
        label: sort.toUpperCase(),
        data: finalValues,
        tension: 0.35,
        borderWidth: 2
      }]
    },

    options: getMarketChartOptions(sort)
  });

  applyMarketStyle(marketChart, sort, type || "bar");

  marketChart.update(); // 🔥 säkerställ render

  return;
}

  /* ============================================================
     UPDATE (🔥 SMOOTH)
     ============================================================ */

if (marketChart.config.type !== type) {
  marketChart.config.type = type;
}

  marketChart.data.labels = finalLabels;
  marketChart.data.datasets[0].data = finalValues;
  marketChart.data.datasets[0].label = sort.toUpperCase();

  applyMarketStyle(marketChart, sort, type);

  Object.assign(marketChart.options, getMarketChartOptions(sort));

  marketChart.update(); // 🔥 NO DESTROY

};


/* ============================================================
   STYLE ENGINE
   ============================================================ */

function applyMarketStyle(chart, sort, type){

  const ds = chart.data.datasets[0];

  ds.borderColor =
    sort === "views" ? "#c084fc" :
    sort === "clicks" ? "#4fd1ff" :
    "#22d3ee";

  ds.backgroundColor = (ctx) => {
    const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, 300);

    if (sort === "views") {
      gradient.addColorStop(0, "rgba(192,132,252,0.9)");
      gradient.addColorStop(1, "rgba(192,132,252,0.05)");
    }

    if (sort === "clicks") {
      gradient.addColorStop(0, "rgba(79,209,255,0.9)");
      gradient.addColorStop(1, "rgba(79,209,255,0.05)");
    }

    if (sort === "ctr") {
      gradient.addColorStop(0, "rgba(34,211,238,0.9)");
      gradient.addColorStop(1, "rgba(34,211,238,0.05)");
    }

    return gradient;
  };

  ds.borderRadius = type === "bar" ? 10 : 0;
  ds.fill = type === "line";

  ds.pointRadius = type === "line" ? 3 : 0;
  ds.pointHoverRadius = 6;
  ds.pointBackgroundColor = "#ffffff";
}


/* ============================================================
   OPTIONS
   ============================================================ */

function getMarketChartOptions(sort){

  return {
    responsive: true,
    maintainAspectRatio: false,

    interaction: {
      mode: "index",
      intersect: false
    },

    plugins: {
      legend: {
        labels: { color: "#fff" }
      }
    },

    scales: {
      x: {
        ticks: { color: "rgba(255,255,255,0.7)" },
        grid: { color: "rgba(255,255,255,0.05)" }
      },

      y: {
        beginAtZero: true,

        ticks: {
          color: "rgba(255,255,255,0.7)",
          callback: (v) => sort === "ctr" ? v + "%" : v
        },

        grid: {
          color: "rgba(255,255,255,0.05)"
        }
      }
    }
  };
}

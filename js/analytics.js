
/* ============================================================
   WCL Analytics — Backoffice
   ============================================================ */

import { supabase } from "./globals.js";
const sb = supabase;

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const globalRangeSelect = document.getElementById("globalRange");

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
    await loadMarketDemand(days);
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

const marketDemandBody = $("#marketDemandBody");
const topStoresBody = $("#topStoresBody");


let STORES_INDEX = [];
let ACTIVE_STORE = null;

let OVERVIEW_TAB = "countries";


/* ============================================================
   INIT
   ============================================================ */

document.addEventListener("DOMContentLoaded", async () => {
  bindUI();
  initTabs(); // ✅ LÄGG TILL DENNA

  await loadStoresIndex();
  await loadGlobalKpis();
  await loadTrafficFlow();
  await loadHeatmap();
  await renderOverview();
  await loadMarketDemand();
   await loadTopStores();
});

/* ============================================================
   GLOBAL KPIs
   ============================================================ */

async function loadGlobalKpis() {
   
const { data, error } = await sb
  .from("analytics_kpi_v1")
  .select("*");

   
  if (error) {
    console.error("Failed loading global KPIs", error);
    return;
  }

  if (!data || !data.length) return;

  const row = data[0];

  if (globalViews) globalViews.textContent = row.total_views ?? "0";
  if (globalClicks) globalClicks.textContent = row.total_clicks ?? "0";

  const ctr = Number(row.ctr || 0) * 100;
  if (globalCtr) globalCtr.textContent = ctr.toFixed(2) + "%";
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

  searchBtn?.addEventListener("click", triggerSearchFromUI);
  clearBtn?.addEventListener("click", resetAll);

  document.addEventListener("click", (e) => {
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

  renderStoreHeader(data);

  await loadStoreDossier(storeId);
}

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

const days = Number(globalRangeSelect?.value || 30);

const { data: summary, error: e1 } =
  await sb.rpc("analytics_store_summary", {
    p_store_id: storeId,
    p_days: days
  });

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

    trendTbody.innerHTML =
      `<tr><td colspan="4" class="muted center">No data.</td></tr>`;

  } else {

    renderTrend(trend || []);
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

    renderOverviewTable(rows, r => r.country || "—");
  }

  if (OVERVIEW_TAB === "cities") {

    const { data, error } =
      await sb.rpc("analytics_top_cities", {
        p_days: days,
        p_limit: 100
      });

    if (error) return renderOverviewError(error);

    rows = data || [];

    renderOverviewTable(
      rows,
      r => [r.city, r.country].filter(Boolean).join(", ") || "—"
    );
  }

  if (OVERVIEW_TAB === "stores") {

    const { data, error } =
      await sb.rpc("analytics_top_stores", {
        p_days: days,
        p_limit: 100
      });

    if (error) return renderOverviewError(error);

    rows = data || [];

    renderOverviewTable(
      rows,
      r => `${r.name || "—"} (${[r.city, r.country].filter(Boolean).join(", ")})`
    );
  }
}

function renderOverviewError(err) {

  console.error("Overview error", err);

  overviewTableBody.innerHTML =
    `<tr><td colspan="4" class="muted center">Error loading overview.</td></tr>`;
}

function renderOverviewTable(rows, keyFn) {

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
      <tr>
        <td>${escapeHtml(keyFn(r))}</td>
        <td class="num">${views}</td>
        <td class="num">${clicks}</td>
        <td class="num">${ctr}</td>
      </tr>
    `;

  }).join("");
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
   MARKET DEMAND
   ============================================================ */

async function loadMarketDemand(days = 30) {

  const marketDemandBody = document.getElementById("marketDemandBody");

  if (!marketDemandBody) {
    console.error("marketDemandBody not found");
    return;
  }

  const { data, error } =
    await sb.rpc("analytics_market_demand", {
      p_days: days
    });

  if (error) {

    console.error("market demand error", error);

    marketDemandBody.innerHTML =
      `<tr><td colspan="4" class="muted center">Failed to load.</td></tr>`;

    return;
  }

  if (!data || !data.length) {

    marketDemandBody.innerHTML =
      `<tr><td colspan="4" class="muted center">No data yet.</td></tr>`;

    return;
  }

  marketDemandBody.innerHTML = data.map(r => `
    <tr>
      <td>${escapeHtml(r.country)}</td>
      <td class="num">${Number(r.views)}</td>
      <td class="num">${Number(r.stores)}</td>
      <td>${r.demand}</td>
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

      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");

      document.querySelectorAll(".analytics-tab")
        .forEach((el) => el.classList.add("hidden"));

      const target = document.getElementById("tab-" + tab.dataset.tab);

      if (target) {
        target.classList.remove("hidden");
      }

     const days = Number(globalRangeSelect?.value || 30);
      if (tab.dataset.tab === "market") {
        await loadHeatmap();
        await loadMarketDemand(days);
      }

      if (tab.dataset.tab === "overview") {
        await renderOverview();
      }

    });
  });
}

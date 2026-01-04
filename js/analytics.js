/* ============================================================
   WCL Analytics — Backoffice (V1)
   - Store-first search + autocomplete
   - Store dossier: views/clicks/ctr + daily trend + latest events
   - Overview: top countries/cities/stores via RPC
   ============================================================ */

const CFG = window.WCL_ANALYTICS_CFG;
const sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey);

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const searchInput = $("#searchInput");
const searchResults = $("#searchResults");
const searchBtn = $("#searchBtn");
const clearBtn = $("#clearBtn");

const storeEmpty = $("#storeEmpty");
const storePanel = $("#storePanel");

const rangeSelect = $("#rangeSelect");
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

const trendTbody = $("#trendTable tbody");
const eventsTbody = $("#eventsTable tbody");

const overviewTableBody = $("#overviewTable tbody");
const ovKeyHeader = $("#ovKeyHeader");
const overviewRange = $("#overviewRange");

let STORES_INDEX = [];
let ACTIVE_STORE = null;

let OVERVIEW_TAB = "countries"; // countries|cities|stores

document.addEventListener("DOMContentLoaded", async () => {
  bindUI();
  await loadStoresIndex();
  await renderOverview(); // default
});

function bindUI() {
  // search
  searchInput?.addEventListener("input", onSearchInput);
  searchInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") triggerSearchFromUI();
    if (e.key === "Escape") hideAutocomplete();
  });

  searchBtn?.addEventListener("click", triggerSearchFromUI);
  clearBtn?.addEventListener("click", resetAll);

  document.addEventListener("click", (e) => {
    // close dropdown if click outside
    if (!searchResults.contains(e.target) && e.target !== searchInput) {
      hideAutocomplete();
    }
  });

  // range changes
  rangeSelect?.addEventListener("change", async () => {
    if (!ACTIVE_STORE) return;
    await loadStoreDossier(ACTIVE_STORE.id);
  });

  // actions
  exportBtn?.addEventListener("click", exportCSV);
  printBtn?.addEventListener("click", () => window.print());
  mailBtn?.addEventListener("click", emailStore);

  // overview tabs
  $$(".btn.tab").forEach(btn => {
    btn.addEventListener("click", async () => {
      $$(".btn.tab").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      OVERVIEW_TAB = btn.dataset.tab;
      await renderOverview();
    });
  });

  overviewRange?.addEventListener("change", renderOverview);
}

/* =========================
   STORES INDEX (autocomplete source)
   ========================= */

async function loadStoresIndex() {
  // Approved + not deleted is enough for search suggestions
  const { data, error } = await sb
    .from("stores")
    .select("id, name, city, country, website, types, access")
    .eq("deleted", false)
    .eq("approved", true)
    .limit(50000);

  if (error) {
    console.error("Failed to load stores index", error);
    return;
  }

  STORES_INDEX = data || [];
  console.log("Stores index:", STORES_INDEX.length);
}

/* =========================
   AUTOCOMPLETE
   ========================= */

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
      return name.includes(q) || city.includes(q) || country.includes(q);
    })
    .slice(0, 12);

  renderAutocomplete(matches, q);
}

function renderAutocomplete(list, q) {
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

  // click select
  $$(".search-item").forEach(el => {
    const id = el.dataset.id;
    if (!id) return;
    el.addEventListener("click", () => selectStoreById(Number(id)));
  });

  searchResults.classList.remove("hidden");
}

function hideAutocomplete() {
  searchResults?.classList.add("hidden");
}

function triggerSearchFromUI() {
  const q = (searchInput.value || "").trim().toLowerCase();
  if (!q) return;

  // If dropdown is visible, pick first item
  const first = searchResults?.querySelector(".search-item[data-id]");
  if (first?.dataset?.id) {
    selectStoreById(Number(first.dataset.id));
    return;
  }

  // fallback: pick first match from index
  const match = STORES_INDEX.find(s => (s.name || "").toLowerCase().includes(q));
  if (match) selectStoreById(Number(match.id));
}

/* =========================
   STORE DOSSIER
   ========================= */

async function selectStoreById(storeId) {
  hideAutocomplete();
  searchInput.value = "";

  // load full store row
  const { data, error } = await sb
    .from("stores")
    .select("*")
    .eq("id", storeId)
    .single();

  if (error || !data) {
    console.error("Failed to load store", error);
    return;
  }

  ACTIVE_STORE = data;

  storeEmpty.classList.add("hidden");
  storePanel.classList.remove("hidden");

  renderStoreHeader(data);
  await loadStoreDossier(storeId);
}

function renderStoreHeader(s) {
  storeName.textContent = s.name || "—";
  storeLocation.textContent = [s.city, s.country].filter(Boolean).join(", ") || "—";

  const t = Array.isArray(s.types) ? s.types.join(", ") : (s.type || "—");
  const a = s.access ? String(s.access).toUpperCase() : "—";
  storeTypeAccess.textContent = `Type: ${t} • Access: ${a}`;

  if (s.website) {
    storeWebsite.innerHTML = `Website: <a href="${s.website}" target="_blank" rel="noopener">${escapeHtml(s.website)}</a>`;
  } else {
    storeWebsite.textContent = "Website: —";
  }
}

async function loadStoreDossier(storeId) {
  const days = Number(rangeSelect.value || 30);

  // 1) summary via RPC
  const { data: summary, error: e1 } = await sb.rpc("analytics_store_summary", {
    p_store_id: storeId,
    p_days: days
  });

  if (e1) {
    console.error("analytics_store_summary error", e1);
    // show zero
    setKpis(0, 0);
  } else {
    setKpis(summary?.views || 0, summary?.clicks || 0);
  }

  // 2) daily trend via RPC
  const { data: trend, error: e2 } = await sb.rpc("analytics_store_daily", {
    p_store_id: storeId,
    p_days: days
  });

  if (e2) {
    console.error("analytics_store_daily error", e2);
    trendTbody.innerHTML = `<tr><td colspan="4" class="muted center">No data.</td></tr>`;
  } else {
    renderTrend(trend || []);
  }

  // 3) latest events debug (last 50)
  const { data: events, error: e3 } = await sb
    .from("analytics_events_parsed")
    .select("timestamp, event_type, store_id, source, session_hash")
    .eq("store_id", storeId)
    .order("timestamp", { ascending: false })
    .limit(50);

  if (e3) {
    console.error("events debug error", e3);
    eventsTbody.innerHTML = `<tr><td colspan="5" class="muted center">No events.</td></tr>`;
  } else {
    renderEvents(events || []);
  }
}

function setKpis(views, clicks) {
  const v = Number(views) || 0;
  const c = Number(clicks) || 0;
  const ctr = v > 0 ? ((c / v) * 100).toFixed(1) + "%" : "0%";

  kpiViews.textContent = String(v);
  kpiClicks.textContent = String(c);
  kpiCtr.textContent = ctr;
}

function renderTrend(rows) {
  if (!rows.length) {
    trendTbody.innerHTML = `<tr><td colspan="4" class="muted center">No data.</td></tr>`;
    return;
  }

  trendTbody.innerHTML = rows.map(r => {
    const views = Number(r.views || 0);
    const clicks = Number(r.clicks || 0);
    const ctr = views ? ((clicks / views) * 100).toFixed(1) + "%" : "0%";
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

function renderEvents(rows) {
  if (!rows.length) {
    eventsTbody.innerHTML = `<tr><td colspan="5" class="muted center">No events.</td></tr>`;
    return;
  }

  eventsTbody.innerHTML = rows.map(r => `
    <tr>
      <td>${escapeHtml(new Date(r.timestamp).toISOString().replace("T"," ").slice(0,19))}</td>
      <td>${escapeHtml(r.event_type)}</td>
      <td class="num">${escapeHtml(String(r.store_id || ""))}</td>
      <td>${escapeHtml(r.source || "")}</td>
      <td>${escapeHtml(r.session_hash || "")}</td>
    </tr>
  `).join("");
}

/* =========================
   OVERVIEW (Top lists via RPC)
   ========================= */

async function renderOverview() {
  const days = Number(overviewRange.value || 30);

  // headers
  if (OVERVIEW_TAB === "countries") ovKeyHeader.textContent = "Country";
  if (OVERVIEW_TAB === "cities") ovKeyHeader.textContent = "City";
  if (OVERVIEW_TAB === "stores") ovKeyHeader.textContent = "Store";

  let rows = [];
  if (OVERVIEW_TAB === "countries") {
    const { data, error } = await sb.rpc("analytics_top_countries", { p_days: days, p_limit: 100 });
    if (error) return renderOverviewError(error);
    rows = data || [];
    renderOverviewTable(rows, (r) => r.country || "—");
  }

  if (OVERVIEW_TAB === "cities") {
    const { data, error } = await sb.rpc("analytics_top_cities", { p_days: days, p_limit: 100 });
    if (error) return renderOverviewError(error);
    rows = data || [];
    renderOverviewTable(rows, (r) => [r.city, r.country].filter(Boolean).join(", ") || "—");
  }

  if (OVERVIEW_TAB === "stores") {
    const { data, error } = await sb.rpc("analytics_top_stores", { p_days: days, p_limit: 100 });
    if (error) return renderOverviewError(error);
    rows = data || [];
    renderOverviewTable(rows, (r) => `${r.name || "—"} (${[r.city, r.country].filter(Boolean).join(", ")})`);
  }
}

function renderOverviewError(err) {
  console.error("Overview error", err);
  overviewTableBody.innerHTML = `<tr><td colspan="4" class="muted center">Error loading overview.</td></tr>`;
}

function renderOverviewTable(rows, keyFn) {
  if (!rows.length) {
    overviewTableBody.innerHTML = `<tr><td colspan="4" class="muted center">No data yet.</td></tr>`;
    return;
  }

  overviewTableBody.innerHTML = rows.map(r => {
    const views = Number(r.views || 0);
    const clicks = Number(r.clicks || 0);
    const ctr = views ? ((clicks / views) * 100).toFixed(1) + "%" : "0%";
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

/* =========================
   EXPORT / EMAIL
   ========================= */

function exportCSV() {
  if (!ACTIVE_STORE) return;

  const rows = [...trendTbody.querySelectorAll("tr")].map(tr =>
    [...tr.querySelectorAll("td")].map(td => (td.textContent || "").trim())
  );

  if (!rows.length || (rows.length === 1 && rows[0].length === 1)) return;

  const header = ["Date", "Views", "Clicks", "CTR"];
  const csv = [header, ...rows]
    .map(line => line.map(v => `"${String(v).replaceAll(`"`, `""`)}"`).join(","))
    .join("\n");

  const filename = `wcl-analytics-store-${ACTIVE_STORE.id}.csv`;
  downloadText(filename, csv, "text/csv");
}

function emailStore() {
  if (!ACTIVE_STORE) return;

  const days = Number(rangeSelect.value || 30);
  const v = kpiViews.textContent || "0";
  const c = kpiClicks.textContent || "0";
  const ctr = kpiCtr.textContent || "0%";

  const subject = `World Cigar Locator — traffic report (${days === 0 ? "All time" : `Last ${days} days`})`;
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

  // mailto (du kan byta till riktig email när du har den)
  const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = mailto;
}

function downloadText(filename, text, mime) {
  const blob = new Blob([text], { type: mime || "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* =========================
   RESET
   ========================= */

function resetAll() {
  hideAutocomplete();
  searchInput.value = "";
  ACTIVE_STORE = null;

  storePanel.classList.add("hidden");
  storeEmpty.classList.remove("hidden");

  trendTbody.innerHTML = "";
  eventsTbody.innerHTML = "";
}

/* =========================
   UTILS
   ========================= */

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

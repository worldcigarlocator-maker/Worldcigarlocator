/* ============================================================
   World Cigar Locator — Analytics JS (V1)
   Store-first, autocomplete, no charts yet
   ============================================================ */

/* =========================
   SUPABASE CLIENT
   ========================= */

// OBS: window.supabase kommer från CDN
const sb = window.supabase.createClient(
  "https://gbxxoeplkzbhsvagnfsr.supabase.co",
  "YOUR_PUBLIC_ANON_KEY"
);

/* =========================
   STATE
   ========================= */

let STORES_INDEX = [];       // alla butiker (för autocomplete)
let ACTIVE_STORE = null;    // vald butik

/* =========================
   DOM HELPERS
   ========================= */

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const searchInput   = $("#searchInput");
const searchResults = $("#searchResults");
const clearBtn      = $("#clearSearch");
const resultPanel   = $("#storeResult");

/* =========================
   INIT
   ========================= */

document.addEventListener("DOMContentLoaded", async () => {
  await loadStoresIndex();
  bindSearch();
});

/* =========================
   LOAD STORES (AUTOCOMPLETE SOURCE)
   ========================= */

async function loadStoresIndex() {
  const { data, error } = await sb
    .from("stores")
    .select("id, name, city, country")
    .eq("deleted", false)
    .eq("approved", true);

  if (error) {
    console.error("Failed to load stores index", error);
    return;
  }

  STORES_INDEX = data || [];
  console.log("Stores loaded for search:", STORES_INDEX.length);
}

/* =========================
   SEARCH + AUTOCOMPLETE
   ========================= */

function bindSearch() {
  if (!searchInput) return;

  searchInput.addEventListener("input", onSearchInput);
  searchInput.addEventListener("keydown", onSearchKeyDown);

  clearBtn?.addEventListener("click", resetSearch);
}

function onSearchInput(e) {
  const q = e.target.value.trim().toLowerCase();
  if (!q) {
    clearResults();
    return;
  }

  const matches = STORES_INDEX
    .filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.city || "").toLowerCase().includes(q) ||
      (s.country || "").toLowerCase().includes(q)
    )
    .slice(0, 10);

  renderAutocomplete(matches);
}

function onSearchKeyDown(e) {
  if (e.key === "Enter") {
    const first = searchResults?.querySelector(".search-item");
    if (first) {
      const id = first.dataset.id;
      selectStoreById(id);
    }
  }
}

/* =========================
   AUTOCOMPLETE UI
   ========================= */

function renderAutocomplete(list) {
  if (!searchResults) return;

  if (!list.length) {
    searchResults.innerHTML = "";
    return;
  }

  searchResults.innerHTML = list.map(s => `
    <div class="search-item" data-id="${s.id}">
      <strong>${escapeHtml(s.name)}</strong><br>
      <small>${[s.city, s.country].filter(Boolean).join(", ")}</small>
    </div>
  `).join("");

  $$(".search-item").forEach(el => {
    el.addEventListener("click", () => {
      selectStoreById(el.dataset.id);
    });
  });
}

function clearResults() {
  if (searchResults) searchResults.innerHTML = "";
}

/* =========================
   SELECT STORE
   ========================= */

async function selectStoreById(storeId) {
  clearResults();
  searchInput.value = "";

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
  renderStoreResult(data);
  await loadStoreAnalytics(data.id);
}

/* =========================
   STORE RESULT UI
   ========================= */

function renderStoreResult(s) {
  if (!resultPanel) return;

  resultPanel.innerHTML = `
    <h2>${escapeHtml(s.name)}</h2>
    <p><strong>Location:</strong> ${[s.city, s.country].filter(Boolean).join(", ")}</p>
    <p><strong>Type:</strong> ${(s.types || []).join(", ")}</p>
    <p><strong>Website:</strong> ${
      s.website
        ? `<a href="${s.website}" target="_blank" rel="noopener">${s.website}</a>`
        : "—"
    }</p>

    <hr>

    <div class="metrics">
      <div><strong>Views:</strong> <span id="metricViews">—</span></div>
      <div><strong>Website clicks:</strong> <span id="metricClicks">—</span></div>
      <div><strong>CTR:</strong> <span id="metricCTR">—</span></div>
    </div>

    <button id="exportStore" class="btn">Export</button>
    <button id="emailStore" class="btn">Email store</button>
  `;

  $("#exportStore")?.addEventListener("click", exportStore);
  $("#emailStore")?.addEventListener("click", emailStore);
}

/* =========================
   LOAD ANALYTICS (STORE)
   ========================= */

async function loadStoreAnalytics(storeId) {
  const { data, error } = await sb
    .from("analytics_store_summary")
    .select("*")
    .eq("store_id", storeId)
    .single();

  if (error || !data) {
    console.warn("No analytics yet for store", storeId);
    return;
  }

  const views  = data.views || 0;
  const clicks = data.clicks || 0;
  const ctr    = views ? ((clicks / views) * 100).toFixed(1) + "%" : "0%";

  $("#metricViews").textContent  = views;
  $("#metricClicks").textContent = clicks;
  $("#metricCTR").textContent    = ctr;
}

/* =========================
   EXPORT / EMAIL (PLACEHOLDER)
   ========================= */

function exportStore() {
  if (!ACTIVE_STORE) return;
  alert("Export coming next phase.");
}

function emailStore() {
  if (!ACTIVE_STORE) return;
  alert("Email flow coming next phase.");
}

/* =========================
   RESET
   ========================= */

function resetSearch() {
  searchInput.value = "";
  clearResults();
  ACTIVE_STORE = null;
  if (resultPanel) resultPanel.innerHTML = "";
}

/* =========================
   UTILS
   ========================= */

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

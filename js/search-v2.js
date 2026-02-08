// ============================================================
// search-v2.js — WCL Frontend (Search v2 · DOM-first · CANONICAL)
// ------------------------------------------------------------
// • Handles ALL search UI (input, buttons, chips, autocomplete)
// • Converts user intent → cards.js state machine
// • Owns NO data, NO state
// • cards.js is Single Source of Truth
// ============================================================

import {
  activateSearch,
  clearSearchMaster,
  toggleChip,
} from "./cards.js";

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------
const qs = (sel) => document.querySelector(sel);

// ------------------------------------------------------------
// Debounce
// ------------------------------------------------------------
let SEARCH_TIMER = null;
function debounce(fn, delay = 300) {
  clearTimeout(SEARCH_TIMER);
  SEARCH_TIMER = setTimeout(fn, delay);
}

// ------------------------------------------------------------
// Token parser (input → intent)
// ------------------------------------------------------------
function parseSearchTokens(raw) {
  const s = (raw || "").trim();
  if (!s) return { text: "", type: null, access: null };

  const tokens = s.split(/\s+/);
  const keep = [];

  let type = null;
  let access = null;

  for (const t0 of tokens) {
    const t = t0.toLowerCase();

    if (t === "store" || t === "stores") { type = "store"; continue; }
    if (t === "lounge" || t === "lounges") { type = "lounge"; continue; }
    if (t === "public") { access = "public"; continue; }
    if (t === "member" || t === "members") { access = "members"; continue; }

    keep.push(t0);
  }

  return { text: keep.join(" ").trim(), type, access };
}

// ------------------------------------------------------------
// Autocomplete (UI only)
// ------------------------------------------------------------
function initAutocomplete() {
  const box = qs("#autocomplete");
  const input = qs("#searchInput");
  if (!box || !input) return;

  document.addEventListener("click", (e) => {
    if (!box.contains(e.target) && e.target !== input) {
      box.classList.add("hidden");
    }
  });
}

// ------------------------------------------------------------
// Live search + filters
// ------------------------------------------------------------
function initLiveSearchAndFilters() {
  const input     = qs("#searchInput");
  const searchBtn = qs("#searchBtn");
  const clearBtn  = qs("#clearBtn");
  const filters   = qs("#searchFilters");

  if (!input || !searchBtn) return;

  // ----------------------------
  // INPUT — live search
  // ----------------------------
  input.addEventListener("input", () => {
    debounce(() => {
      const { text, type, access } = parseSearchTokens(input.value);

      if (!text && !type && !access) {
        clearSearchMaster();
        return;
      }

      if (type)   toggleChip({ type });
      if (access) toggleChip({ access });

      activateSearch({ text });
    });
  });

  // ----------------------------
  // SEARCH BUTTON
  // ----------------------------
  searchBtn.addEventListener("click", () => {
    const { text, type, access } = parseSearchTokens(input.value);

    if (type)   toggleChip({ type });
    if (access) toggleChip({ access });

    activateSearch({ text });
  });

  // ----------------------------
  // CLEAR BUTTON
  // ----------------------------
  clearBtn?.addEventListener("click", () => {
    input.value = "";
    clearSearchMaster();
  });

  // ----------------------------
  // FILTER CHIPS (delegated)
  // ----------------------------
  filters?.addEventListener("click", (e) => {
    const el = e.target.closest("[data-filter]");
    if (!el) return;

    const { filter, value } = el.dataset;

    if (filter === "type")   toggleChip({ type: value });
    if (filter === "access") toggleChip({ access: value });
  });
}

// ------------------------------------------------------------
// Boot
// ------------------------------------------------------------
function bootSearchV2() {
  initAutocomplete();
  initLiveSearchAndFilters();
  console.log("✅ Search v2 booted");
}

document.addEventListener("DOMContentLoaded", bootSearchV2);

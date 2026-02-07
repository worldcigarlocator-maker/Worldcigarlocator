// ============================================================
// search-v2.js — WCL Frontend (Search v2 · DOM-first · CANONICAL)
// ------------------------------------------------------------
// • Binds Search v2 HTML to cards.js state machine
// • No local state (cards.js is Single Source of Truth)
// • No auth logic
// • No analytics
// • No sidebar logic
// ============================================================

import {
  activateSearch,
  clearSearchMaster,
  toggleChip
} from "./cards.js";

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------
const qs = (sel) => document.querySelector(sel);

// ------------------------------------------------------------
// Boot
// ------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  const searchZone = qs("#searchZone");
  const filters   = qs("#searchFilters");
  const searchBtn = qs("#searchBtn");
  const clearBtn  = qs("#clearBtn");

  if (!searchZone || !searchBtn) {
    console.warn("Search v2 DOM not ready");
    return;
  }

  // ============================================================
  // SEARCH ZONE — visual activation only
  // ============================================================
  searchZone.addEventListener("click", () => {
    searchZone.classList.add("active");
    console.log("🔍 Search zone activated");
  });

  // ============================================================
  // SEARCH BUTTON — trigger cards.js pipeline
  // ============================================================
  searchBtn.addEventListener("click", () => {
    activateSearch({ text: "" });
    console.log("🚀 Search triggered (v2 → cards)");
  });

  // ============================================================
  // CLEAR BUTTON — reset SEARCH master
  // ============================================================
  clearBtn?.addEventListener("click", () => {
    clearSearchMaster();
    console.log("✕ Search cleared (v2 → cards)");
  });

  // ============================================================
  // FILTER BUTTONS — chips only (delegated)
  // ============================================================
  filters?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-filter]");
    if (!btn) return;

    const { filter, value } = btn.dataset;

    if (filter === "type") {
      toggleChip({ type: value });
    }

    if (filter === "access") {
      toggleChip({ access: value });
    }

    console.log("🧩 Filter toggled (v2 → cards)", filter, value);
  });
});

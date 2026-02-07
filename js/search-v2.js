console.log("🔥 search-v2.js loaded");


// ============================================================
// search-v2.js — WCL Frontend (Search v2 · DOM-first)
// ============================================================

import { activateSearch, clearSearchMaster } from "./cards.js";

const qs = (sel) => document.querySelector(sel);

document.addEventListener("DOMContentLoaded", () => {
  const searchZone = qs("#searchZone");
  const filters    = qs("#searchFilters");
  const searchBtn  = qs("#searchBtn");
  const clearBtn   = qs("#clearBtn");

  if (!searchZone || !searchBtn) {
    console.warn("Search v2 DOM not ready");
    return;
  }

  // Click on search surface
  searchZone.addEventListener("click", () => {
    searchZone.classList.add("active");
    console.log("🔍 Search zone activated");
  });

  // Run search → cards.js
  searchBtn.addEventListener("click", () => {
    activateSearch({ text: "" });
    console.log("🚀 Run search (v2 → cards)");
  });

  // Clear search → cards.js
  clearBtn?.addEventListener("click", () => {
    clearSearchMaster();
    console.log("✕ Clear search (v2 → cards)");
  });

  // Filter buttons (UI only for now)
  filters?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-filter]");
    if (!btn) return;

    btn.classList.toggle("active");
    console.log(
      "🧩 Filter toggled",
      btn.dataset.filter,
      btn.dataset.value
    );
  });
});

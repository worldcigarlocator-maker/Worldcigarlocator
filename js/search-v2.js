// ============================================================
// search-v2.js — WCL Frontend (Search v2 · CANONICAL)
// ------------------------------------------------------------
// • REAL input field → cards.js
// • cards.js owns ALL state
// • UI only (no analytics, no auth)
// • Clear = FULL HOME RESET (search + location + hero)
// ============================================================

import {
  activateSearch,
  clearSearchMaster,
  clearLocationMaster,
  toggleChip,
  resetToHero,
} from "./cards.js";

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------
const qs = (sel) => document.querySelector(sel);

// ------------------------------------------------------------
// Boot
// ------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  const input     = qs("#searchInput");
  const searchBtn = qs("#searchBtn");
  const clearBtn  = qs("#clearBtn");
  const zone      = qs("#searchZone");
  const label     = qs(".search-label");
  const filters   = qs("#searchFilters");

  if (!input) {
    console.warn("❌ searchInput not found");
    return;
  }

  // ============================================================
  // RESPONSIVE SEARCH UI (desktop ↔ collapsed)
  // ============================================================
  const mq = window.matchMedia("(max-width: 900px)");

  const syncSearchUI = () => {
    if (mq.matches) {
      input.placeholder = "Search";
      if (label) label.style.display = "none";
    } else {
      input.placeholder = "e.g. London, New York, Bangkok";
      if (label) label.style.display = "inline";
    }
  };

  syncSearchUI();
  mq.addEventListener("change", syncSearchUI);

  // ============================================================
  // Click anywhere in search zone → focus input
  // ============================================================
  zone?.addEventListener("click", () => {
    input.focus();
  });

  // ============================================================
  // LIVE INPUT → SEARCH (debounced)
  // ============================================================
  let TIMER = null;

  input.addEventListener("input", () => {
    const text = input.value.trim();

    clearTimeout(TIMER);
    TIMER = setTimeout(() => {
      if (!text) {
        clearSearchMaster();
        return;
      }
      activateSearch({ text });
    }, 250);
  });

  // ============================================================
  // ENTER → SEARCH
  // ============================================================
  input.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;

    const text = input.value.trim();
    if (!text) {
      clearSearchMaster();
      return;
    }

    activateSearch({ text });
  });

  // ============================================================
  // SEARCH ICON CLICK
  // ============================================================
  searchBtn?.addEventListener("click", () => {
    const text = input.value.trim();
    if (!text) {
      clearSearchMaster();
      return;
    }
    activateSearch({ text });
  });

  // ============================================================
  // CLEAR BUTTON — FULL HOME RESET
  // ============================================================
  clearBtn?.addEventListener("click", () => {
    input.value = "";

    clearSearchMaster();     // search → idle
    clearLocationMaster();   // sidebar / geo → idle
    resetToHero();           // 🔑 home / hero

    input.focus();
  });

  // ============================================================
  // FILTER BUTTONS (chips only)
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
  });

  

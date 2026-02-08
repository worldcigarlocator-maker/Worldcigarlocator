// ============================================================
// search-v2.js — WCL Frontend (Search v2 · CANONICAL STEP 2)
// ------------------------------------------------------------
// • Binds REAL input field to cards.js
// • cards.js owns all state
// • No autocomplete
// • No tokens
// • No analytics
// ============================================================

import {
  activateSearch,
  clearSearchMaster
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

  if (!input) {
    console.warn("❌ searchInput not found");
    return;
  }

  // ----------------------------------------------------------
  // Click anywhere in zone → focus input
  // ----------------------------------------------------------
  zone?.addEventListener("click", () => {
    input.focus();
  });

  // ----------------------------------------------------------
  // LIVE INPUT → SEARCH
  // ----------------------------------------------------------
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

  // ----------------------------------------------------------
  // ENTER → SEARCH
  // ----------------------------------------------------------
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const text = input.value.trim();
      if (!text) {
        clearSearchMaster();
        return;
      }
      activateSearch({ text });
    }
  });

  // ----------------------------------------------------------
  // SEARCH ICON
  // ----------------------------------------------------------
  searchBtn?.addEventListener("click", () => {
    const text = input.value.trim();
    if (!text) {
      clearSearchMaster();
      return;
    }
    activateSearch({ text });
  });

  // ----------------------------------------------------------
  // CLEAR
  // ----------------------------------------------------------
  clearBtn?.addEventListener("click", () => {
    input.value = "";
    clearSearchMaster();
    input.focus();
  });
});

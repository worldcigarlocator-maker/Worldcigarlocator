// ============================================================
// search-v2.js — WCL Frontend (Search v2 · CANONICAL)
// ------------------------------------------------------------
// • Binds REAL input field to cards.js
// • cards.js owns ALL state
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
  const label     = qs(".search-label");

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
      // collapsed
      input.placeholder = "Search";
      if (label) label.style.display = "none";
    } else {
      // desktop
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
  // CLEAR
  // ============================================================
  clearBtn?.addEventListener("click", () => {
    input.value = "";
    clearSearchMaster();
    input.focus();
  });
});

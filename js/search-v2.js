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
  const input    = qs("#searchInput");
  const clearBtn = qs("#clearBtn");
  const zone     = qs("#searchZone");
  const label    = qs(".search-label");
  const controls = qs("#searchControls");

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
  // CLEAR BUTTON — FULL HOME RESET
  // ============================================================
clearBtn?.addEventListener("click", () => {
  input.value = "";

  clearSearchMaster();
  clearLocationMaster();
  resetToHero();

  controls?.querySelectorAll(".active")
    .forEach(el => el.classList.remove("active"));

  input.focus();
});

  // ============================================================
  // FILTERS & SORT (INLINE CONTROLS)
  // ============================================================
controls?.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-filter], [data-sort]");
  if (!btn) return;

  const { filter, value, sort } = btn.dataset;

  // FILTERS
 if (filter) {
  const isActive = btn.classList.contains("active");

  controls.querySelectorAll(`[data-filter="${filter}"]`)
    .forEach(el => el.classList.remove("active"));

  if (!isActive) {
    btn.classList.add("active");

    if (filter === "type") {
      toggleChip({ type: value });
    }

    if (filter === "access") {
      toggleChip({ access: value });
    }

  } else {
    // Toggle off explicitly
    if (filter === "type") {
      toggleChip({ type: value });
    }

    if (filter === "access") {
      toggleChip({ access: value });
    }
  }
}
  // SORT
  if (sort) {
    const isActive = btn.classList.contains("active");

    controls.querySelectorAll("[data-sort]")
      .forEach(el => el.classList.remove("active"));

    if (!isActive) {
      btn.classList.add("active");
      activateSearch({ sort });
    } else {
      setSort("relevance");
    }
  }
});

});

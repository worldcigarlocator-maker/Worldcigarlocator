// ============================================================
// search-v2.js — WCL Frontend (Search v2 · CANONICAL)
// ============================================================

import {
  activateSearch,
  clearSearchMaster,
  clearLocationMaster,
  toggleChip,
  resetToHero,
  setSort
} from "./cards.js";

const qs = (sel) => document.querySelector(sel);

document.addEventListener("DOMContentLoaded", () => {

  const input    = qs("#searchInput");
  const clearBtn = qs("#clearBtn");
  const label    = qs(".search-label");
  const controls = qs("#searchControls");

  if (!input) return;

  // ============================================================
// BRAND = HOME
// ============================================================

const homeBtn = qs("#homeBtn");

homeBtn?.addEventListener("click", () => {

  if (input) input.value = "";

  clearSearchMaster();
  clearLocationMaster();
  resetToHero();
  setSort("relevance");

  controls?.querySelectorAll(".active")
    .forEach(el => el.classList.remove("active"));
});

 // ============================================================
// RESPONSIVE
// ============================================================

const mq = window.matchMedia("(max-width: 900px)");

const syncSearchUI = () => {
  if (mq.matches) {
    input.placeholder = "Search";
    if (label) label.style.display = "none";
  } else {
    input.placeholder = "Search by name, city or address";
    if (label) label.style.display = "inline";
  }
};

syncSearchUI();
mq.addEventListener("change", syncSearchUI);

// 🔑 Hide placeholder immediately on focus
input.addEventListener("focus", () => {
  input.dataset.placeholder = input.placeholder;
  input.placeholder = "";
});

input.addEventListener("blur", () => {
  if (!input.value.trim()) {
    input.placeholder = input.dataset.placeholder || "";
  }
});
  
// ============================================================
// FOCUS RESET (FORCED)
// ============================================================

input.addEventListener("focus", () => {

  input.value = "";

  clearSearchMaster();
  clearLocationMaster();
  resetToHero();
  setSort("relevance");

  controls?.querySelectorAll(".active")
    .forEach(el => el.classList.remove("active"));
});

  // ============================================================
  // INPUT (DEBOUNCED)
  // ============================================================

  let TIMER = null;

  input.addEventListener("input", () => {
    const text = input.value.trim();

    clearTimeout(TIMER);

    TIMER = setTimeout(() => {
      if (!text) {
        clearSearchMaster();
      } else {
        activateSearch({ text });
      }
    }, 250);
  });

  input.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;

    const text = input.value.trim();
    if (!text) {
      clearSearchMaster();
    } else {
      activateSearch({ text });
    }
  });

  // ============================================================
  // CLEAR BUTTON
  // ============================================================

  clearBtn?.addEventListener("click", () => {
    input.value = "";

    clearSearchMaster();
    clearLocationMaster();
    resetToHero();
    setSort("relevance");

    controls?.querySelectorAll(".active")
      .forEach(el => el.classList.remove("active"));

    input.focus();
  });

  // ============================================================
  // FILTERS + SORT
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
        toggleChip({ [filter]: value });
      }
    }

    // SORT
    if (sort) {

      const isActive = btn.classList.contains("active");

      controls.querySelectorAll("[data-sort]")
        .forEach(el => el.classList.remove("active"));

      if (!isActive) {
        btn.classList.add("active");
        setSort(sort);
      } else {
        setSort("relevance");
      }
    }

  });

  // ============================================================
  // MASTER SYNC (SEARCH ↔ LOCATION)
  // ============================================================

  document.addEventListener("wcl:master-change", (e) => {
    const { master } = e.detail || {};

    if (master === "location") {
      if (input) input.value = "";
    }
  });

});

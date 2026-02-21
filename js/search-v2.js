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
  const zone     = qs("#searchZone");
  const label    = qs(".search-label");
  const controls = qs("#searchControls");

  if (!input) return;

  // ============================================================
  // RESPONSIVE
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

  zone?.addEventListener("click", () => input.focus());

  // ============================================================
  // INPUT
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
  // CLEAR
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
        // Toggle off
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

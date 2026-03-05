```javascript
// ============================================================
// search-v2.js — WCL Frontend (Search v2 · CANONICAL)
// UI-only · cards.js owns state
// Map toggle only dispatches events (map.js owns map engine)
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
  // MAP MODE (UI ONLY)
  // map.js hanterar hela kartmotorn
  // ============================================================

  const mapBtn         = qs("#mapViewBtn");
  const mapView        = qs("#mapView");
  const hero           = qs("#heroImage");
  const storeGrid      = qs("#storeGrid");
  const resultsToolbar = qs(".results-toolbar");

  let MAP_MODE = false;

  if (mapBtn && mapView) {

    mapBtn.addEventListener("click", () => {

      MAP_MODE = !MAP_MODE;
      mapBtn.classList.toggle("active", MAP_MODE);

      if (MAP_MODE) {

        hero?.classList.add("hidden");
        storeGrid?.classList.add("hidden");
        resultsToolbar?.classList.add("hidden");

        mapView.classList.remove("hidden");

        document.dispatchEvent(new CustomEvent("wcl:map-open"));

      } else {

        hero?.classList.remove("hidden");
        storeGrid?.classList.remove("hidden");
        resultsToolbar?.classList.remove("hidden");

        mapView.classList.add("hidden");

        document.dispatchEvent(new CustomEvent("wcl:map-close"));

      }

    });

  }

  // ============================================================
  // BRAND = HOME
  // ============================================================

  const homeBtn = qs("#homeBtn");

  homeBtn?.addEventListener("click", () => {

    input.value = "";

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
  // FOCUS RESET
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

    if (filter) {

      const isActive = btn.classList.contains("active");
      btn.classList.toggle("active", !isActive);

      if (filter === "type") {
        toggleChip({ type: value });
      }

      if (filter === "access") {
        toggleChip({ access: value });
      }

      return;

    }

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
      input.value = "";
    }

  });

});

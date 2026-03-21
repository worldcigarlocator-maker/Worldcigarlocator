// ============================================================
// search-v2.js — WCL Frontend (Search v2 · CANONICAL CLEAN)
// ============================================================

import {
  activateSearch,
  toggleChip,
  resetToHero,
  setSort,
  resetAllFilters
} from "./cards.js";

const qs = (sel) => document.querySelector(sel);

document.addEventListener("DOMContentLoaded", () => {

  // ============================================================
  // INIT
  // ============================================================

  if (window.WCL_ANALYTICS) {
    WCL_ANALYTICS.setSource("search");
  }

  const input    = qs("#searchInput");
  const clearBtn = qs("#clearBtn");
  const label    = qs(".search-label");
  const controls = qs("#searchControls");

  const mapBtn         = qs("#mapViewBtn");
  const mapView        = qs("#mapView");
  const hero           = qs("#heroImage");
  const storeGrid      = qs("#storeGrid");
  const resultsToolbar = qs(".results-toolbar");

  const filterBtnMobile = qs("#filterBtnMobile");
  const mobileFilters   = qs("#mobileFilters");

  if (!input) return;

  let MAP_MODE = false;
  let TIMER = null;

  // ============================================================
  // MAP MODE
  // ============================================================

  mapBtn?.addEventListener("click", () => {

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

  // ============================================================
  // HOME RESET
  // ============================================================

  qs("#homeBtn")?.addEventListener("click", () => {

    input.value = "";

    resetAllFilters();
    resetToHero();

    controls?.querySelectorAll(".active")
      .forEach(el => el.classList.remove("active"));

  });

  // ============================================================
  // RESPONSIVE INPUT
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
  // INPUT SEARCH
  // ============================================================

  input.addEventListener("input", () => {

    const text = input.value.trim();
    clearTimeout(TIMER);

    TIMER = setTimeout(() => {

      if (!text) {
        resetAllFilters();
      } else {
        activateSearch({ text });
      }

    }, 250);

  });

  input.addEventListener("keydown", (e) => {

    if (e.key !== "Enter") return;

    const text = input.value.trim();

    if (!text) {
      resetAllFilters();
      resetToHero();
    } else {
      activateSearch({ text });
    }

  });

  // ============================================================
  // CLEAR (MASTER RESET)
  // ============================================================

  clearBtn?.addEventListener("click", () => {

    clearTimeout(TIMER);

    input.value = "";

    resetAllFilters();
    resetToHero();

    controls?.querySelectorAll(".active")
      .forEach(el => el.classList.remove("active"));

    // MOBILE RESET
    document.querySelectorAll("#mobileFilters .active")
      .forEach(el => el.classList.remove("active"));

    mobileFilters?.classList.remove("open");
    filterBtnMobile?.classList.remove("active");

    // CLOSE MAP
    if (MAP_MODE) {

      MAP_MODE = false;
      mapBtn?.classList.remove("active");

      hero?.classList.remove("hidden");
      storeGrid?.classList.remove("hidden");
      resultsToolbar?.classList.remove("hidden");

      mapView?.classList.add("hidden");

      document.dispatchEvent(new CustomEvent("wcl:map-close"));

    }

    input.focus();

  });

  // ============================================================
  // DESKTOP FILTERS
  // ============================================================

  controls?.addEventListener("click", (e) => {

    const btn = e.target.closest("[data-filter], [data-sort]");
    if (!btn) return;

    const { filter, value, sort } = btn.dataset;

    if (filter) {

      const isActive = btn.classList.contains("active");
      btn.classList.toggle("active", !isActive);

      if (filter === "type") toggleChip({ type: value });
      if (filter === "access") toggleChip({ access: value });

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
  // MOBILE FILTER TOGGLE
  // ============================================================

  filterBtnMobile?.addEventListener("click", () => {
    mobileFilters?.classList.toggle("open");
    filterBtnMobile.classList.toggle("active");
  });

  // ============================================================
  // MOBILE FILTER → CARDS (CORE FIX)
  // ============================================================

mobileFilters?.addEventListener("click", (e) => {

  const btn = e.target.closest(".filter-item");
  if (!btn) return;

  const label = btn.textContent.trim();

  // UI
  mobileFilters.querySelectorAll(".filter-item")
    .forEach(el => el.classList.remove("active"));

  btn.classList.add("active");

  // RESET STATE
  resetAllFilters();

  // APPLY FILTER (desktop style)
  if (label === "Stores") {
    toggleChip({ type: "store" });
  }

  if (label === "Lounge") {
    toggleChip({ type: "lounge" });
  }

  if (label === "Members") {
    toggleChip({ access: "members" });
  }

  if (label === "Top Rated") {
    setSort("rating_desc");
  }

  // 🔥 CRITICAL — TRIGGER SEARCH
  activateSearch({
    text: input.value.trim()
  });

  // UX
  mobileFilters.classList.remove("open");
  filterBtnMobile.classList.remove("active");

});
  // ============================================================
  // MOBILE ACTIONS BRIDGE
  // ============================================================

  qs("#mapViewBtnMobile")
    ?.addEventListener("click", () => {
      mapBtn?.click();
    });

  qs("#clearBtnMobile")
    ?.addEventListener("click", () => {
      clearBtn?.click();
    });

  // ============================================================
  // MASTER SYNC
  // ============================================================

  document.addEventListener("wcl:master-change", (e) => {

    const { master } = e.detail || {};

    if (master === "location") {
      input.value = "";
    }

  });

});

// ============================================================
// MOBILE SEARCH OVERRIDE (SUBMIT ONLY)
// ============================================================

(function () {

  const input = document.querySelector("#searchInput");
  if (!input) return;

  const isMobile = () =>
    window.matchMedia("(max-width:768px)").matches;

  // ------------------------------------------------------------
  // BLOCK LIVE SEARCH ON MOBILE
  // ------------------------------------------------------------
  input.addEventListener("input", (e) => {
    if (!isMobile()) return;

    // Stop other listeners from firing
    e.stopImmediatePropagation();
  }, true); // 🔥 capture phase (VERY IMPORTANT)

 // ============================================================
// MOBILE SEARCH OVERRIDE (SUBMIT ONLY · STABLE)
// ============================================================

(function () {

  const input = document.querySelector("#searchInput");
  if (!input) return;

  const isMobile = () =>
    window.matchMedia("(max-width:768px)").matches;

  // ------------------------------------------------------------
// BLOCK LIVE SEARCH (BUT KEEP INPUT WORKING)
// ------------------------------------------------------------
input.addEventListener("input", (e) => {

  if (!isMobile()) return;

  // Stop live-search listeners, but NOT everything
  e.stopPropagation();

}, true);


// ------------------------------------------------------------
// ENTER → TRIGGER SEARCH (MOBILE ONLY)
// ------------------------------------------------------------
input.addEventListener("keydown", (e) => {

  if (!isMobile()) return;

  if (e.key === "Enter") {

    e.preventDefault();

    if (window.WCL_ANALYTICS) {
      WCL_ANALYTICS.setSource("search");
    }

    activateSearch(input.value);

    // Close keyboard
    input.blur();

    // 🔥 IMPORTANT: force top WITHOUT smooth scroll (Safari fix)
    requestAnimationFrame(() => {
      window.scrollTo(0, 0);
    });

  }

});

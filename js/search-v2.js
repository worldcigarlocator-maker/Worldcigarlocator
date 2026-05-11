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

const isMobile = () =>
  window.matchMedia("(max-width:768px)").matches;

const inputDesktop = qs("#searchInput");
const inputMobile  = qs("#searchInputMobile");

const input = isMobile() ? inputMobile : inputDesktop;

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

const submitBtnDesktop = document.getElementById("searchSubmitMobile");
const submitBtnMobile  = document.getElementById("searchSubmitMobileNew");

if (!input) {
  resetToHero();
  return;
}

resetToHero();
  
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
  // INPUT SEARCH (DESKTOP ONLY)
  // ============================================================

  input.addEventListener("input", (e) => {

    if (isMobile()) {
      e.stopImmediatePropagation();
      return;
    }

    const text = input.value.trim();
    clearTimeout(TIMER);

    TIMER = setTimeout(() => {
      if (!text) resetAllFilters();
      else activateSearch({ text });
    }, 250);

  }, true);

  input.addEventListener("keydown", (e) => {

  // 🔥 MOBILE
  if (isMobile()) {

    if (e.key !== "Enter") return;

    e.preventDefault();

    const text = input.value.trim();

    // 🔥 CLOSE KEYBOARD
    input.blur();

    if (!text) {
      resetAllFilters();
      resetToHero();
    } else {
      activateSearch({ text });
    }

    window.scrollTo(0, 0);
    return;
  }

  // 💻 DESKTOP (UNCHANGED)
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
  // MOBILE SEARCH BUTTON (FINAL FIX)
  // ============================================================

  submitBtnMobile?.addEventListener("click", () => {

    if (!isMobile()) return;

    const text = input.value.trim();

    // 🔥 FREEZE SCROLL
    const scrollY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";

    // 🔥 CLOSE KEYBOARD
    input.blur();

    setTimeout(() => {

    if (!text) {
  resetAllFilters();
  resetToHero();
} else {

  // 🔥 FORCE UI STATE
  hero?.classList.add("hidden");
  mapView?.classList.add("hidden");
  storeGrid?.classList.remove("hidden");
  resultsToolbar?.classList.remove("hidden");

  activateSearch({ text });
}

      // 🔥 UNFREEZE
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";

      window.scrollTo(0, 0);

    }, 120);

  });


  // ============================================================
// CLEAR
// ============================================================

clearBtn?.addEventListener("click", () => {

  clearTimeout(TIMER);

  input.value = "";

  resetAllFilters();
  resetToHero();

  // 🔥 NEW — RESET SIDEBAR
  document.dispatchEvent(new CustomEvent("wcl:reset-sidebar"));

  controls?.querySelectorAll(".active")
    .forEach(el => el.classList.remove("active"));

  document.querySelectorAll("#mobileFilters .active")
    .forEach(el => el.classList.remove("active"));

  mobileFilters?.classList.remove("open");
  filterBtnMobile?.classList.remove("active");

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
  // MOBILE FILTERS
  // ============================================================

  filterBtnMobile?.addEventListener("click", () => {
    mobileFilters?.classList.toggle("open");
    filterBtnMobile.classList.toggle("active");
  });

  mobileFilters?.addEventListener("click", (e) => {

    const btn = e.target.closest(".filter-item");
    if (!btn) return;

    const label = btn.textContent.trim();

    mobileFilters.querySelectorAll(".filter-item")
      .forEach(el => el.classList.remove("active"));

    btn.classList.add("active");

    resetAllFilters();

    if (label === "Stores") toggleChip({ type: "store" });
    if (label === "Lounge") toggleChip({ type: "lounge" });
    if (label === "Members") toggleChip({ access: "members" });
    if (label === "Top Rated") {
  setSort("rating_desc");
}

if (label === "Most Saved") {
  setSort("favorites_desc");
}

    mobileFilters.classList.remove("open");
    filterBtnMobile.classList.remove("active");

  });

  // ============================================================
  // MOBILE ACTIONS
  // ============================================================

  qs("#mapViewBtnMobile")?.addEventListener("click", () => {
    mapBtn?.click();
  });

  qs("#clearBtnMobile")?.addEventListener("click", () => {
    clearBtn?.click();
  });

  // ============================================================
  // MASTER SYNC
  // ============================================================

  document.addEventListener("wcl:master-change", (e) => {
    const { master } = e.detail || {};
    if (master === "location") input.value = "";
  });

});

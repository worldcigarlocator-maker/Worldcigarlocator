// ============================================================
// CARDS.JS — WCL FRONTEND (DISCOVERY + SORT READY · v5)
// ============================================================
import { supabase } from "./globals.js";
import { openModal } from "./modal.js";
import { getPhotoUrl, getFlagUrl, buildBadges } from "./store-ui.js";
import { trackEvent } from "./analytics-tracker.js";

const VIEW_OBSERVER =
  window?.WCL_ANALYTICS?.VIEW_OBSERVER ?? { observe() {}, unobserve() {} };

const dom = (sel) => document.querySelector(sel);

// ============================================================
// MASTER
// ============================================================

export const MASTER = {
  IDLE: "idle",
  SEARCH: "search",
  LOCATION: "location",
};

let MASTER_MODE = MASTER.IDLE;

const STATE = {
  location: { continent: null, country: null, state: null, city: null },
  search: { text: "" },
  chips: { type: [], access: [] },   // 🔥 arrays nu
};

let SORT_MODE = "relevance";

// ============================================================
// PAGINATION
// ============================================================

let LAST_RENDERED_STORES = [];
let LAST_CURSOR = null;
let HAS_MORE = true;
const PAGE_SIZE = 50;

export function getLastRenderedStores() {
  return LAST_RENDERED_STORES;
}

function resetPagination() {
  LAST_CURSOR = null;
  HAS_MORE = true;
}

function updateCursor(list) {
  if (!list || !list.length) {
    HAS_MORE = false;
    return;
  }

  const last = list[list.length - 1];
  LAST_CURSOR = last?.id ?? null;

  if (list.length < PAGE_SIZE) {
    HAS_MORE = false;
  }
}

// ============================================================
// COUNT MANAGEMENT (GLOBAL + SEARCH)
// ============================================================

let GLOBAL_TOTAL = null;

async function loadGlobalTotal() {
  if (GLOBAL_TOTAL !== null) return;

  const { count, error } = await supabase
    .from("stores_frontend_public_v5")
    .select("*", { count: "exact", head: true });

  if (!error && typeof count === "number") {
    GLOBAL_TOTAL = count;
    updateSearchCount(GLOBAL_TOTAL);
  }
}

function updateSearchCount(value) {
  const el = document.querySelector("#sidebarGlobalCount");
  if (!el) return;

  if (typeof value !== "number") {
    el.textContent = "";
    return;
  }

  el.textContent = `(${value})`;
}

// ============================================================
// HERO RESET
// ============================================================

export function resetToHero() {
  const grid = dom("#storeGrid");
  const hero = dom("#heroImage");

  if (grid) grid.innerHTML = "";

  const btn = document.getElementById("loadMoreBtn");
  if (btn) btn.style.display = "none";

  if (hero) hero.style.display = "block";

  resetPagination();
  LAST_RENDERED_STORES = [];

  if (MASTER_MODE === MASTER.IDLE) {
    updateSearchCount(GLOBAL_TOTAL);
  }
}

// ============================================================
// HELPERS
// ============================================================

function clearLocation() {
  STATE.location = { continent: null, country: null, state: null, city: null };
}

function clearSearch() {
  STATE.search.text = "";
}

function hasAnyLocation() {
  return Object.values(STATE.location).some(Boolean);
}

function hasAnyChips() {
  return (
    (Array.isArray(STATE.chips.type) && STATE.chips.type.length > 0) ||
    (Array.isArray(STATE.chips.access) && STATE.chips.access.length > 0)
  );
}

function snapshot() {
  return {
    master: MASTER_MODE,
    ...STATE.location,
    search: STATE.search.text,
    type: STATE.chips.type,
    access: STATE.chips.access,
  };
}

// ============================================================
// CHIP FILTER (FRONTEND-OWNED · SAFE)
// ============================================================

function asArray(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean);
  if (typeof v === "string") return [v];
  return [];
}

function hasToken(list, token) {
  if (!token) return true;
  return asArray(list).some((x) => String(x).toLowerCase() === String(token).toLowerCase());
}

function applyChipFilters(rows) {

  const selectedTypes = (STATE.chips.type || [])
    .map(t => String(t).toLowerCase());

  const selectedAccess = (STATE.chips.access || [])
    .map(a => String(a).toLowerCase());

  if (selectedTypes.length === 0 && selectedAccess.length === 0) {
    return rows || [];
  }

  return (rows || []).filter((s) => {

    const storeTypes = Array.isArray(s.types)
      ? s.types.map(t => String(t).toLowerCase())
      : [];

    const accessVal = s.access
      ? String(s.access).toLowerCase()
      : null;

    const typeOk =
      selectedTypes.length === 0 ||
      selectedTypes.some(t => storeTypes.includes(t));

    const accessOk =
      selectedAccess.length === 0 ||
      selectedAccess.includes(accessVal);

    return typeOk && accessOk;
  });
}
// ============================================================
// FILTER API
// ============================================================

export function activateSearch({ text = "", sort } = {}) {
  MASTER_MODE = MASTER.SEARCH;
  clearLocation();

  if (text !== undefined) {
    STATE.search.text = text;
  }

  if (sort) {
    SORT_MODE = sort;
  }

  resetPagination();

  document.dispatchEvent(
    new CustomEvent("wcl:master-change", {
      detail: { master: MASTER_MODE }
    })
  );

  runSearch();
}

export function activateLocation(next) {
  MASTER_MODE = MASTER.LOCATION;
  clearSearch();

  const isMajorChange =
    next.continent || next.country || next.state;

  if (isMajorChange) {
   STATE.chips.type = [];
STATE.chips.access = [];

    document.dispatchEvent(
      new CustomEvent("wcl:clear-chips-ui")
    );
  }

  STATE.location = { ...STATE.location, ...next };

  resetPagination();

  document.dispatchEvent(
    new CustomEvent("wcl:master-change", {
      detail: { master: MASTER_MODE }
    })
  );

  runSearch();
}

export function toggleChip({ type, access }) {

  if (type !== undefined) {
    const i = STATE.chips.type.indexOf(type);

    if (i > -1) {
      STATE.chips.type.splice(i, 1);
    } else {
      STATE.chips.type.push(type);
    }
  }

  if (access !== undefined) {
    const i = STATE.chips.access.indexOf(access);

    if (i > -1) {
      STATE.chips.access.splice(i, 1);
    } else {
      STATE.chips.access.push(access);
    }
  }

  resetPagination();

  if (MASTER_MODE === MASTER.IDLE) {
    return;
  }

  runSearch();
}
export function clearSearchMaster() {
  if (MASTER_MODE === MASTER.SEARCH) {
    clearSearch();
    MASTER_MODE = MASTER.IDLE;
    resetPagination();
    runSearch();
  }
}

export function clearLocationMaster() {
  if (MASTER_MODE === MASTER.LOCATION) {
    clearLocation();
    MASTER_MODE = MASTER.IDLE;
    resetPagination();
    runSearch();
  }
}

export function setSort(mode) {
  SORT_MODE = mode || "relevance";
  resetPagination();
  runSearch();
}

// ============================================================
// STORE VIEW OBSERVER
// ============================================================

let storeViewObserver = null;

function initStoreViewObserver() {

  if (storeViewObserver) return;

  storeViewObserver = new IntersectionObserver(

    (entries) => {

      entries.forEach((entry) => {

        if (!entry.isIntersecting) return;

        const el = entry.target;

        const storeId = el.dataset.storeId;
        const city = el.dataset.city;
        const country = el.dataset.country;

        trackEvent("store_viewed", {
          store_id: Number(storeId),
          source: "search",
          city,
          country
        });

        storeViewObserver.unobserve(el);

      });

    },

    {
      threshold: 0.6
    }

  );

}

// ============================================================
// RENDER
// ============================================================

function renderCards(list, append = false) {
  const grid = dom("#storeGrid");
  const hero = dom("#heroImage");

if (!grid) return;

grid.style.display = "grid";   // ← lägg till denna rad

if (hero) hero.style.display = "none";

  if (!append) {
    LAST_RENDERED_STORES = list || [];
    grid.innerHTML = LAST_RENDERED_STORES.map(cardHTML).join("");
  } else {
    LAST_RENDERED_STORES = [...LAST_RENDERED_STORES, ...list];
    grid.insertAdjacentHTML("beforeend", list.map(cardHTML).join(""));
  }

  // ============================================================
// VIEW TRACKING
// ============================================================

grid.querySelectorAll(".store-card").forEach((card) => {
  VIEW_OBSERVER.observe(card);
});
  ensureLoadMoreButton();
}

function buildStars(avg, count) {
  const v = Number(avg) || 0;
  const full = "★".repeat(Math.round(v));
  const empty = "☆".repeat(5 - Math.round(v));

  return `
    <div class="stars-row">
      <span class="stars">${full}${empty}</span>
      <span class="rating-count">(${count || 0})</span>
    </div>
  `;
}

function cardHTML(s) {
  const img = getPhotoUrl(s);
  const flag = getFlagUrl(s);

  return `
  <article class="store-card" data-store-id="${s.id}">
    <img src="${img}" class="store-img" loading="lazy"
      onerror="this.onerror=null;this.src='images/store.jpg'" />

    <div class="store-body">
      <h3 class="store-title">${s.name || "Unnamed"}</h3>

      <div class="locrow">
        <div class="loc-top">
          ${flag ? `<img src="${flag}" class="flag" />` : ""}
          <span>${[s.continent, s.country].filter(Boolean).join(", ")}</span>
        </div>
        <p class="city-label">${s.city || ""}</p>
      </div>

      ${buildStars(s.rating_avg, s.rating_count)}

      <div class="badge-row">
        ${buildBadges(s)}
      </div>

      <div class="infoblock">
        <div class="info-row">
          <span class="info-label">Address</span>
          <span class="info-value">${s.address || "—"}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Phone</span>
          <span class="info-value">${s.phone || "—"}</span>
        </div>
      </div>

      ${
        s.website
          ? `<div class="visit-link">
               <a href="${s.website}" target="_blank" rel="noopener">
                 Visit
               </a>
             </div>`
          : ""
      }

      <button class="reviews-btn" type="button">
        Comment (${s.comment_count || 0})
      </button>
    </div>
  </article>
  `;
}

// ============================================================
// LOAD MORE
// ============================================================

function ensureLoadMoreButton() {
  let btn = document.getElementById("loadMoreBtn");

  if (!btn) {
    btn = document.createElement("button");
    btn.id = "loadMoreBtn";
    btn.textContent = "Load more";
    btn.className = "load-more-btn";
    btn.style.display = "none";

    const grid = dom("#storeGrid");
    grid?.after(btn);

    btn.addEventListener("click", () => {
      if (!HAS_MORE) return;
      runSearch(true);
    });
  }

  btn.style.display = HAS_MORE ? "block" : "none";
}

// ============================================================
// BACKEND RPC
// ============================================================

async function loadStores(filters = {}) {
  const { data, error } = await supabase.rpc("search_stores_v2", {
    p_q: STATE.search.text || null,
    p_continent: filters.continent || null,
    p_country: filters.country || null,
    p_state: filters.state || null,
    p_city: filters.city || null,
    p_limit: PAGE_SIZE,
    p_cursor: LAST_CURSOR,
    p_sort: SORT_MODE,
  });

  if (error) return { error };
  return { data: data || [] };
}

// ============================================================
// RUN SEARCH
// ============================================================

export async function runSearch(isLoadMore = false) {
  const snap = snapshot();

  // IDLE → hero + global total
  if (
    snap.master === MASTER.IDLE &&
    !snap.search &&
    !hasAnyLocation() &&
    !hasAnyChips()
  ) {
    resetToHero();
    updateSearchCount(GLOBAL_TOTAL);
    return;
  }

  if (!isLoadMore) resetPagination();

  const resp = await loadStores(snap);
  console.log("RUN SEARCH STARTED", snap);
  if (!resp || resp.error) return;

  const rawRows = resp.data || [];
  console.log("DEBUG ROW:", rawRows[0]);

  // Cursor måste baseras på RAW (inte filtrerade)
  updateCursor(rawRows);

  // Chips filtrerar frontend-side (modifiers)
  const filteredRows = applyChipFilters(rawRows);

// TEST LOG
console.log("RUN SEARCH FIRED", STATE.search.text);

renderCards(filteredRows, isLoadMore);

  // ============================================================
// SEARCH ANALYTICS
// ============================================================

if (!isLoadMore) {

  trackEvent("search", {
    query: STATE.search.text || null,

    type_filters: STATE.chips.type || [],
    access_filters: STATE.chips.access || [],

    continent: STATE.location.continent || null,
    country: STATE.location.country || null,
    state: STATE.location.state || null,
    city: STATE.location.city || null,

    results: filteredRows.length,
    sort: SORT_MODE,

    source: "search"
  });

}

  // Count ska visa vad som faktiskt visas
  if (!isLoadMore) {
    updateSearchCount(LAST_RENDERED_STORES.length);
  } else {
    updateSearchCount(LAST_RENDERED_STORES.length);
  }
}

// ============================================================
// GRID CLICK
// ============================================================

let GRID_BOUND = false;

function bindGrid() {
  if (GRID_BOUND) return;
  GRID_BOUND = true;

  const grid = dom("#storeGrid");
  if (!grid) return;

  grid.addEventListener("click", (e) => {
    const card = e.target.closest(".store-card");
    if (!card) return;

    const id = Number(card.dataset.storeId);
    if (!id) return;

    openModal(id);
  });
}

// ============================================================
// INIT
// ============================================================

document.addEventListener("DOMContentLoaded", async () => {
  bindGrid();
  await loadGlobalTotal();
  updateSearchCount(GLOBAL_TOTAL);
});

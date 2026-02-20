// ============================================================
// CARDS.JS — WCL FRONTEND (DISCOVERY + SORT READY)
// ============================================================

import { supabase } from "./globals.js";
import { openModal } from "./modal.js";
import { getPhotoUrl, getFlagUrl, buildBadges } from "./store-ui.js";

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
  chips: { type: null, access: null },
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
// HERO RESET
// ============================================================

export function resetToHero() {
  const grid = dom("#storeGrid");
  const heading = dom("#resultHeading");
  const hero = dom("#heroImage");

  if (grid) grid.innerHTML = "";
  if (heading) {
    heading.style.display = "none";
    heading.textContent = "";
  }
  if (hero) hero.style.display = "block";

  resetPagination();
  LAST_RENDERED_STORES = [];
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
  return Boolean(STATE.chips.type || STATE.chips.access);
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
// FILTER API
// ============================================================

export function activateSearch({ text = "" } = {}) {
  MASTER_MODE = MASTER.SEARCH;
  clearLocation();
  STATE.search.text = text;
  resetPagination();
  runSearch();
}

export function activateLocation(next) {
  MASTER_MODE = MASTER.LOCATION;
  clearSearch();
  STATE.location = { ...STATE.location, ...next };
  resetPagination();
  runSearch();
}

export function toggleChip({ type, access }) {
  if (type !== undefined) {
    STATE.chips.type = STATE.chips.type === type ? null : type;
  }
  if (access !== undefined) {
    STATE.chips.access = STATE.chips.access === access ? null : access;
  }
  resetPagination();
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
// RENDER
// ============================================================

function renderCards(list, append = false) {
  const grid = dom("#storeGrid");
  const hero = dom("#heroImage");

  if (!grid) return;
  if (hero) hero.style.display = "none";

  if (!append) {
    LAST_RENDERED_STORES = list || [];
    grid.innerHTML = LAST_RENDERED_STORES.map(cardHTML).join("");
  } else {
    LAST_RENDERED_STORES = [...LAST_RENDERED_STORES, ...list];
    grid.insertAdjacentHTML("beforeend", list.map(cardHTML).join(""));
  }

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

  const address =
    s.address?.includes(",")
      ? s.address.split(",")[0] + "…"
      : s.address || "—";

  return `
  <article class="store-card" data-store-id="${s.id}">
    <img src="${img}" class="store-img" loading="lazy"
      onerror="this.onerror=null;this.src='images/store.jpg'" />

    <div class="store-body">
      <h3 class="store-title">${s.name || "Unnamed"}</h3>

      <div class="badge-row">${buildBadges(s)}</div>

${
  s.website
    ? `<div class="visit-link">
         <a href="${s.website}" target="_blank" rel="noopener">
           Visit
         </a>
       </div>`
    : ""
}

${buildStars(s.rating_avg, s.rating_count)}

      ${buildStars(s.rating_avg, s.rating_count)}

      <div class="locrow">
        <div class="loc-top">
          ${flag ? `<img src="${flag}" class="flag" />` : ""}
          <span>${[s.continent, s.country].filter(Boolean).join(", ")}</span>
        </div>
        <p class="city-label">${s.city || ""}</p>
      </div>

      <div class="infoblock">
        <p><strong>Address:</strong> ${address}</p>
        <p><strong>Phone:</strong> ${s.phone || "—"}</p>
      </div>

      <button class="reviews-btn" type="button">
        (${s.comment_count || 0})
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
    p_sort: SORT_MODE
  });

  if (error) return { error };
  return { data: data || [] };
}

// ============================================================
// RUN SEARCH
// ============================================================

export async function runSearch(isLoadMore = false) {
  const snap = snapshot();
  const heading = dom("#resultHeading");

  if (
    snap.master === MASTER.IDLE &&
    !snap.search &&
    !hasAnyLocation() &&
    !hasAnyChips()
  ) {
    resetToHero();
    return;
  }

  if (!isLoadMore) resetPagination();

  if (heading && !isLoadMore) {
    heading.textContent = "Loading…";
    heading.style.display = "block";
  }

  const resp = await loadStores(snap);
  if (!resp || resp.error) {
    if (heading) heading.textContent = "Error loading results";
    return;
  }

  const rows = resp.data || [];
  updateCursor(rows);

  renderCards(rows, isLoadMore);

  if (heading && !isLoadMore) {
    heading.textContent = `${LAST_RENDERED_STORES.length} results`;
  }
}
// ============================================================
// GRID CLICK (DELEGATED)
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

document.addEventListener("DOMContentLoaded", () => {
  bindGrid();
});

/* ============================================================
   VISIT LINK
============================================================ */

.visit-link {
  margin-top: 6px;
}

.visit-link a {
  color: #3b82f6;              /* tydlig blå */
  text-decoration: underline;  /* ser ut som riktig länk */
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.visit-link a:hover {
  opacity: 0.75;
}

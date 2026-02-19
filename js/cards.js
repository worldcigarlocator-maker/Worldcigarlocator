// ============================================================
// CARDS.JS — WCL FRONTEND (CANONICAL CORE)
// ------------------------------------------------------------
// • Owns STATE + MASTER
// • Owns rendering
// • Owns search orchestration
// • Modal is external (modal.js)
// • No expanded cards
// • No global leaks
// ============================================================

import { supabase } from "./globals.js";
import { openModal } from "./modal.js";
import { getPhotoUrl, getFlagUrl, buildBadges } from "./store-ui.js";

// ============================================================
// ANALYTICS SAFE FALLBACK
// ============================================================

const VIEW_OBSERVER =
  window?.WCL_ANALYTICS?.VIEW_OBSERVER ?? { observe() {}, unobserve() {} };

// ============================================================
// DOM
// ============================================================

const dom = (sel) => document.querySelector(sel);

// ============================================================
// STATE
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

let RUN_SEQ = 0;
let ACTIVE_REQUEST = 0;

let LAST_RENDERED_STORES = [];

export function getLastRenderedStores() {
  return LAST_RENDERED_STORES;
}

// ============================================================
// HERO RESET (REQUIRED BY search-v2)
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
// PUBLIC FILTER API
// ============================================================

export function activateSearch({ text = "" } = {}) {
  MASTER_MODE = MASTER.SEARCH;
  clearLocation();
  STATE.search.text = text;
  runSearch();
}

export function activateLocation(next) {
  MASTER_MODE = MASTER.LOCATION;
  clearSearch();
  STATE.location = { ...STATE.location, ...next };
  runSearch();
}

export function toggleChip({ type, access }) {
  if (type !== undefined) {
    STATE.chips.type = STATE.chips.type === type ? null : type;
  }
  if (access !== undefined) {
    STATE.chips.access = STATE.chips.access === access ? null : access;
  }
  runSearch();
}

export function clearSearchMaster() {
  if (MASTER_MODE === MASTER.SEARCH) {
    clearSearch();
    MASTER_MODE = MASTER.IDLE;
    runSearch();
  }
}

export function clearLocationMaster() {
  if (MASTER_MODE === MASTER.LOCATION) {
    clearLocation();
    MASTER_MODE = MASTER.IDLE;
    runSearch();
  }
}

// ============================================================
// CARD HTML
// ============================================================

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
// RENDER
// ============================================================

function renderCards(list) {
  const grid = dom("#storeGrid");
  const hero = dom("#heroImage");

  if (!grid) return;

  if (hero) hero.style.display = "none";

  LAST_RENDERED_STORES = list || [];
  grid.innerHTML = LAST_RENDERED_STORES.map(cardHTML).join("");

  grid.querySelectorAll(".store-card").forEach((card) => {
    VIEW_OBSERVER.observe(card);
  });
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

    if (e.target.closest("a")) return;

    openModal(id);
  });
}

// ============================================================
// BACKEND RPC
// ============================================================

async function loadStores(filters = {}) {
  ACTIVE_REQUEST++;
  const reqId = ACTIVE_REQUEST;

  const { data, error } = await supabase.rpc("search_stores_v1", {
    p_q: STATE.search.text || null,
    p_continent: filters.continent || null,
    p_country: filters.country || null,
    p_state: filters.state || null,
    p_city: filters.city || null,
  });

  if (reqId !== ACTIVE_REQUEST) return null;
  if (error) return { error };

  return { data: data || [] };
}

// ============================================================
// RUN SEARCH
// ============================================================

export async function runSearch() {
  RUN_SEQ++;
  const runId = RUN_SEQ;

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

  if (heading) {
    heading.textContent = "Loading…";
    heading.style.display = "block";
  }

  renderCards([]);

  const resp = await loadStores(snap);

  if (runId !== RUN_SEQ) return;
  if (!resp || resp.error) {
    if (heading) heading.textContent = "Error loading results";
    return;
  }

  const rows = resp.data || [];

  if (heading) {
    heading.textContent = `${rows.length} results`;
    heading.style.display = "block";
  }

  renderCards(rows);
}

// ============================================================
// INIT
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  bindGrid();
});

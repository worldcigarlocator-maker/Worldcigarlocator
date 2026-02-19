// ============================================================
// CARDS.JS — WCL Frontend (CANONICAL · CORE UI)
// ------------------------------------------------------------
// • Single source of truth: STATE + MASTER_MODE
// • LAW: last action wins between SEARCH and LOCATION
// • Chips are modifiers only (never master)
// • Search intent resolved in backend (search_stores_v1)
// • Frontend search = trigger & render only
//
// 🔒 IMPORTANT:
// cards.js is CORE UI and must NEVER hard-depend on analytics.
// Analytics is optional, append-only, and injected if present.
// ============================================================

import { supabase } from "./globals.js";
import { openModal } from "./modal.js";


// ============================================================
// ANALYTICS SAFE FALLBACK (NO HARD DEPENDENCY)
// ============================================================
const VIEW_OBSERVER =
  window?.WCL_ANALYTICS?.VIEW_OBSERVER ?? { observe() {}, unobserve() {} };

// ============================================================
// CONFIG
// ============================================================
const FALLBACK_IMAGE = "images/store.jpg";
const PHOTO_PROXY_BASE = "https://gbxxoeplkzbhsvagnfsr.functions.supabase.co";
const dom = (sel) => document.querySelector(sel);

// ============================================================
// RACE / REQUEST CONTROL
// ============================================================
let RUN_SEQ = 0;
let ACTIVE_REQUEST = 0;

// Last dataset rendered (Single Source for Modal)
let LAST_RENDERED_STORES = [];

// ============================================================
// DOM READY (locked – UI init handled by search-v2.js)
// ============================================================
let DOM_READY = true;

// ============================================================
// CANONICAL FILTER STATE & MASTER CONTROLLER (WCL)
// ============================================================
export const MASTER = {
  IDLE: "idle",
  SEARCH: "search",
  LOCATION: "location",
};

let MASTER_MODE = MASTER.IDLE;

// hero & welcome only on first load
let STARTUP_HERO = true;

const STATE = {
  location: { continent: null, country: null, state: null, city: null },
  search: { text: "" },
  chips: {
    type: null, // "store" | "lounge" | null
    access: null, // "public" | "members" | null
  },
};

// ============================================================
// INTERNAL HELPERS
// ============================================================
function clearLocation() {
  STATE.location.continent = null;
  STATE.location.country = null;
  STATE.location.state = null;
  STATE.location.city = null;
}

function clearSearch() {
  STATE.search.text = "";
}

function hasAnyLocation() {
  return Boolean(
    STATE.location.continent ||
      STATE.location.country ||
      STATE.location.state ||
      STATE.location.city
  );
}

function hasAnyChips() {
  return Boolean(STATE.chips.type || STATE.chips.access);
}

function snapshotState() {
  return {
    master: MASTER_MODE,
    location: { ...STATE.location },
    search: { ...STATE.search },
    chips: { ...STATE.chips },
  };
}

// ============================================================
// PUBLIC API — ENDA SÄTTET ATT ÄNDRA FILTER
// ============================================================

// 🔍 SEARCH becomes master
export function activateSearch({ text = "" } = {}) {
  MASTER_MODE = MASTER.SEARCH;
  clearLocation();
  STATE.search.text = text;
  runSearch();
}

// 📍 LOCATION becomes master
export function activateLocation(next) {
  STARTUP_HERO = false;

  MASTER_MODE = MASTER.LOCATION;
  clearSearch();

  STATE.location.continent = next?.continent ?? null;
  STATE.location.country = next?.country ?? null;
  STATE.location.state = next?.state ?? null;
  STATE.location.city = next?.city ?? null;

  runSearch();
}

// 🧩 Chips — modifiers only
export function toggleChip({ type, access }) {
  if (type !== undefined) {
    STATE.chips.type = STATE.chips.type === type ? null : type;
  }
  if (access !== undefined) {
    STATE.chips.access = STATE.chips.access === access ? null : access;
  }
  runSearch();
}

// ❌ Clear search (only if search is master)
export function clearSearchMaster() {
  if (MASTER_MODE === MASTER.SEARCH) {
    clearSearch();
    MASTER_MODE = MASTER.IDLE;
    runSearch();
  }
}

// optional future
export function clearLocationMaster() {
  if (MASTER_MODE === MASTER.LOCATION) {
    clearLocation();
    MASTER_MODE = MASTER.IDLE;
    runSearch();
  }
}

export function getActiveFilterSnapshot() {
  return snapshotState();
}

// ============================================================
// FLAG HELPER
// ============================================================
function getFlagUrl(store) {
  const iso = store.country_iso2?.toLowerCase();
  if (!iso) return null;
  return `assets/flags/${iso}.svg`;
}

// ============================================================
// BADGES
// ============================================================
function buildBadges(store) {
  const badges = [];
  const arr = Array.isArray(store.types)
    ? store.types.map((t) => String(t).toLowerCase())
    : [];

  if (arr.includes("store"))
    badges.push(`<span class="badge badge-store">Store</span>`);
  if (arr.includes("lounge"))
    badges.push(`<span class="badge badge-lounge">Lounge</span>`);

  const A = String(store.access || "").trim().toLowerCase();
  if (A === "public") {
    badges.push(
      `<span class="badge badge-access badge-access-public">PUBLIC</span>`
    );
  } else if (A) {
    // keep backend string (e.g., members)
    badges.push(`<span class="badge badge-access">${A.toUpperCase()}</span>`);
  }

  return badges.join(" ");
}

// ============================================================
// PHOTO URL
// ============================================================
function getPhotoUrl(store) {
  if (store.photo_cdn_url) return store.photo_cdn_url;
  if (store.photo_url) return store.photo_url;

  if (store.photo_reference) {
    return `${PHOTO_PROXY_BASE}/photo-proxy?photo_reference=${encodeURIComponent(
      store.photo_reference
    )}&maxwidth=800`;
  }

  return FALLBACK_IMAGE;
}

// ============================================================
// HERO RESET
// ============================================================
export function resetToHero() {
  if (!DOM_READY) {
    document.addEventListener("DOMContentLoaded", resetToHero, { once: true });
    return;
  }

  const grid = dom("#storeGrid");
  const heading = dom("#resultHeading");
  const heroImage = dom("#heroImage");
  const heroText = dom("#heroText");

  if (grid) grid.innerHTML = "";
  if (heading) {
    heading.style.display = "none";
    heading.textContent = "";
  }

  heroImage?.style.setProperty("display", "block");
  heroText?.style.setProperty("display", "block");
}

// ============================================================
// STARS (CARD DISPLAY)
// ============================================================
function buildStars(avg, count) {
  const v = Number(avg) || 0;
  const f = "★".repeat(Math.round(v));
  const e = "☆".repeat(5 - Math.round(v));
  return `
    <div class="stars-row">
      <span class="stars">${f}${e}</span>
      <span class="rating-count">(${count || 0})</span>
    </div>`;
}

// ============================================================
// CARD HTML
// ============================================================
function cardHTML(s) {
  const img = getPhotoUrl(s);
  const flag = getFlagUrl(s);

  const displayName = s.name || "Unnamed";
  const displayCity = s.city || "";
  const displayCountry = s.country || "";

  let displayAddress = "—";
  if (s.address) {
    const trimmed = String(s.address).trim();
    displayAddress = trimmed.includes(",")
      ? trimmed.split(",")[0] + "…"
      : trimmed;
  }

  return `
  <article class="store-card"
    data-store-id="${s.id}"
    data-country="${s.country || ""}"
    data-city="${s.city || ""}"
    data-continent="${s.continent || ""}">

    <img src="${img}" class="store-img" alt="${displayName}" loading="lazy"
      onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}'" />

    <div class="store-body">
      <h3 class="store-title">${displayName}</h3>
      <div class="badge-row">${buildBadges(s)}</div>
      ${buildStars(s.rating_avg, s.rating_count)}

      <div class="locrow">
        <div class="loc-top">
          ${flag ? `<img src="${flag}" class="flag" />` : ""}
          <span>${[s.continent, displayCountry].filter(Boolean).join(", ")}</span>
        </div>
        <p class="city-label">${displayCity}</p>
      </div>

      <div class="infoblock">
        <p><strong>Address:</strong> ${displayAddress}</p>
        <p><strong>Phone:</strong> ${s.phone || "—"}</p>
        <p><strong>Website:</strong>
          ${
            s.website
              ? `<a href="${s.website}" target="_blank" rel="noopener" class="visit-website" data-store-id="${s.id}">Visit</a>`
              : "—"
          }
        </p>
      </div>

      <button class="reviews-btn" type="button">(${s.comment_count || 0})</button>
    </div>
  </article>`;
}

// ============================================================
// RENDER CARDS (CANONICAL · FAST · DELEGATION)
// ============================================================
let GRID_EVENTS_BOUND = false;

function bindGridEventsOnce() {
  if (GRID_EVENTS_BOUND) return;
  GRID_EVENTS_BOUND = true;

  const grid = dom("#storeGrid");
  if (!grid) return;

  // One listener for ALL cards (and future re-renders)
  grid.addEventListener("click", (e) => {
    const card = e.target.closest(".store-card");
    if (!card) return;

    // Prevent link default (Visit website)
    if (e.target.closest("a")) return;

    const storeId = Number(card.dataset.storeId);
    if (!storeId) return;

    openModal(storeId);
  });
}

function renderCards(list) {
  const grid = dom("#storeGrid");
  if (!grid) return;

  // Close modal on re-render (clean system)
  closeModal();

  LAST_RENDERED_STORES = list || [];

  grid.innerHTML = LAST_RENDERED_STORES.map(cardHTML).join("");

  grid.querySelectorAll(".store-card").forEach((card) => {
    VIEW_OBSERVER.observe(card);
  });
}

// 🔓 Public export (used by search + sidebar)
export function renderStores(list) {
  renderCards(list);
}

// ============================================================
// FRONTEND FILTERS (CHIPS ONLY)
// ============================================================
function matchesType(store, type) {
  if (!type) return true;
  const types = Array.isArray(store.types)
    ? store.types.map((t) => String(t).toLowerCase())
    : [];
  return types.includes(String(type).toLowerCase());
}

function matchesAccess(store, access) {
  if (!access) return true;
  return (
    String(store.access || "").toLowerCase() === String(access).toLowerCase()
  );
}

function applyFrontendFilters(rows, snapshot) {
  return (rows || []).filter((s) => {
    return matchesType(s, snapshot.type) && matchesAccess(s, snapshot.access);
  });
}

// ============================================================
// LOAD STORES (RPC)
// ============================================================
export async function loadStores(filters = {}) {
  if (!DOM_READY) {
    await new Promise((res) =>
      document.addEventListener("DOMContentLoaded", res, { once: true })
    );
  }

  ACTIVE_REQUEST++;
  const reqId = ACTIVE_REQUEST;

  const { data, error } = await supabase.rpc("search_stores_v1", {
    p_q: STATE.search.text || null,
    p_continent: filters?.continent || null,
    p_country: filters?.country || null,
    p_state: filters?.state || null,
    p_city: filters?.city || null,
  });

  if (reqId !== ACTIVE_REQUEST) return null;

  if (error) {
    console.error(error);
    return { error };
  }

  return { data: data || [] };
}

// ============================================================
// RUN SEARCH (CANONICAL)
// ============================================================
export async function runSearch() {
  if (!DOM_READY) {
    await new Promise((res) =>
      document.addEventListener("DOMContentLoaded", res, { once: true })
    );
  }

  RUN_SEQ++;
  const runId = RUN_SEQ;

  const snap = getActiveFilterSnapshot();

  const snapshot = {
    master: snap.master,
    continent: snap.location.continent,
    country: snap.location.country,
    state: snap.location.state,
    city: snap.location.city,
    search: snap.search.text,
    type: snap.chips.type,
    access: snap.chips.access,
  };

  const heading = dom("#resultHeading");
  const heroImage = dom("#heroImage");
  const heroText = dom("#heroText");

  if (
    snapshot.master === MASTER.IDLE &&
    !snapshot.search &&
    !hasAnyLocation() &&
    !hasAnyChips()
  ) {
    if (STARTUP_HERO) {
      resetToHero();
      return;
    }
  }

  heroImage && (heroImage.style.display = "none");
  heroText && (heroText.style.display = "none");

  if (heading) {
    heading.textContent = "Loading…";
    heading.style.display = "block";
  }

  renderCards([]);

  const resp = await loadStores({
    continent: snapshot.continent,
    country: snapshot.country,
    state: snapshot.state,
    city: snapshot.city,
  });

  if (runId !== RUN_SEQ) return;
  if (!resp || resp.error) {
    heading && (heading.textContent = "Error loading results");
    return;
  }

  const rows = resp.data || [];
  const filtered = applyFrontendFilters(rows, snapshot);

  if (heading) {
    heading.textContent = `${filtered.length} results`;
    heading.style.display = "block";
  }

  if (!filtered.length) {
    renderCards([]);
    return;
  }

  renderCards(filtered);
}

// ============================================================
// WEBSITE CLICK ANALYTICS (OPTIONAL)
// ============================================================
document.addEventListener("click", (e) => {
  const a = e.target.closest("a.visit-website");
  if (!a) return;

  const storeId = Number(a.dataset.storeId);
  if (!storeId) return;

  if (window.WCL_ANALYTICS?.send) {
    window.WCL_ANALYTICS.send("website_clicked", { store_id: storeId });
  }
});


// ============================================================
// INIT (DOM SAFE)
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  bindGridEventsOnce();
});

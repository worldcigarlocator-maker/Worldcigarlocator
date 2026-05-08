// ============================================================
// CARDS.JS — WCL FRONTEND (DISCOVERY + SORT READY · v5)
// ============================================================

import { supabase } from "/js/globals.js";
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

// ============================================================
// STATE
// ============================================================

const STATE = {
  location: {
    continent: null,
    country: null,
    state: null,
    city: null
  },
  search: {
    text: ""
  },
  chips: {
    type: [],
    access: []
  }
};

let SORT_MODE = "relevance";

let RUN_SEQ = 0;

let CURRENT_RENDER_SOURCE = "direct";
// ============================================================
// GLOBAL RESET (SINGLE SOURCE OF TRUTH)
// ============================================================

export function resetAllFilters() {

  STATE.location = {
    continent: null,
    country: null,
    state: null,
    city: null
  };

  STATE.search.text = "";

  STATE.chips.type = [];
  STATE.chips.access = [];

  MASTER_MODE = MASTER.IDLE;

  SORT_MODE = "relevance";

  resetPagination();

}

// ============================================================
// PAGINATION
// ============================================================

let LAST_RENDERED_STORES = [];
let LAST_CURSOR = null;
let HAS_MORE = true;
const PAGE_SIZE = 50;

let IS_LOADING_MORE = false;

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

  const formatted = new Intl.NumberFormat().format(value);
el.textContent = `${formatted} Listings found`;
}
// ============================================================
// HERO RESET
// ============================================================

export function resetToHero() {

  const grid = dom("#storeGrid");
  const hero = dom("#heroImage");

  if (grid) {
    grid.innerHTML = "";
    grid.style.display = "none";
  }

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

function hasAnyLocation() {
  return (
    STATE.location.continent ||
    STATE.location.country ||
    STATE.location.state ||
    STATE.location.city
  );
}

function hasAnyChips() {
  return (
    (STATE.chips.type && STATE.chips.type.length > 0) ||
    (STATE.chips.access && STATE.chips.access.length > 0)
  );
}

function snapshot() {
  return {
    master: MASTER_MODE,

    continent: STATE.location.continent,
    country: STATE.location.country,
    state: STATE.location.state,
    city: STATE.location.city,

    search: STATE.search.text,

    type: STATE.chips.type,
    access: STATE.chips.access
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
  return asArray(list).some(
    (x) => String(x).toLowerCase() === String(token).toLowerCase()
  );
}

function applyChipFilters(rows) {
  const selectedTypes = (STATE.chips.type || []).map((t) =>
    String(t).toLowerCase()
  );

  const selectedAccess = (STATE.chips.access || []).map((a) =>
    String(a).toLowerCase()
  );

  if (selectedTypes.length === 0 && selectedAccess.length === 0) {
    return rows || [];
  }

  return (rows || []).filter((s) => {
    const storeTypes = Array.isArray(s.types)
      ? s.types.map((t) => String(t).toLowerCase())
      : [];

    const accessVal = s.access ? String(s.access).toLowerCase() : null;

    const typeOk =
      selectedTypes.length === 0 ||
      selectedTypes.some((t) => storeTypes.includes(t));

    const accessOk =
      selectedAccess.length === 0 || selectedAccess.includes(accessVal);

    return typeOk && accessOk;
  });
}

// ============================================================
// FILTER API
// ============================================================

export function activateSearch({ text = "", sort } = {}) {
  CURRENT_RENDER_SOURCE = "search";
  MASTER_MODE = MASTER.SEARCH;

STATE.location = {
  continent: null,
  country: null,
  state: null,
  city: null
};

  if (text !== undefined) {
    STATE.search.text = text;
  }

  if (sort) {
    SORT_MODE = sort;
  }

  resetPagination();

  document.dispatchEvent(
    new CustomEvent("wcl:master-change", {
      detail: { master: MASTER_MODE },
    })
  );

  runSearch();

  /* ============================================================
     MOBILE UX — SCROLL TO RESULTS
     ============================================================ */

  if (window.innerWidth <= 768) {
    setTimeout(() => {
      const grid = document.getElementById("storeGrid");

      if (grid) {
        grid.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }, 180);
  }
}

// ============================================================
// LOCATION ACTIVATION
// ============================================================

export function activateLocation(next = {}) {
CURRENT_RENDER_SOURCE = "sidebar";
  MASTER_MODE = MASTER.LOCATION;

  STATE.search.text = "";

  STATE.location = {
    ...STATE.location,
    ...next,
  };

  resetPagination();

  runSearch();
}


// ============================================================
// CHIP TOGGLE
// ============================================================

export function toggleChip({ type, access }) {
  if (type) {
    const i = STATE.chips.type.indexOf(type);

    if (i > -1) {
      STATE.chips.type.splice(i, 1);
    } else {
      STATE.chips.type.push(type);
    }
  }

  if (access) {
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

// ============================================================
// SORT CONTROL
// ============================================================

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

trackEvent("store_view", {
  store_id: Number(storeId),
  source: window.CURRENT_SOURCE || "map",
  session_hash: localStorage.getItem("wcl_session")
});

console.log("STORE VIEW EVENT", {
  store_id: storeId,
  source: window.CURRENT_SOURCE,
  session: localStorage.getItem("wcl_session")
});
        
        storeViewObserver.unobserve(el);
      });
    },
    {
      threshold: 0.6,
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

  grid.style.display = "grid";

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

setTimeout(() => {

  grid.querySelectorAll(".store-card").forEach((card) => {

    const city = card.dataset.city;
    const country = card.dataset.country;

    // 🔒 STRICT VALIDATION
    if (!city || !country || city.trim() === "" || country.trim() === "") {
      return;
    }

    VIEW_OBSERVER.observe(card);

  });

}, 0);

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
<article 
  class="store-card" 
  data-store-id="${s.id}"
  data-city="${s.city || ""}"
  data-country="${s.country || ""}"
  data-source="${CURRENT_RENDER_SOURCE}"
>

    <button
      class="favorite-heart"
      type="button"
      data-store-id="${s.id}"
      aria-label="Favorite"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M12 21s-6.7-4.35-9.2-8.1C.9 9.9 2 5.9 5.7 4.5c2.1-.8 4.4-.1 5.8 1.7 1.4-1.8 3.7-2.5 5.8-1.7 3.7 1.4 4.8 5.4 2.9 8.4C18.7 16.65 12 21 12 21z"/>
      </svg>
    </button>

    <img
      src="${img}"
      class="store-img"
      loading="lazy"
      onerror="this.onerror=null;this.src='images/store.jpg'"
    />

    <div class="store-body">

      <h3 class="store-title">
        ${s.name || "Unnamed"}
      </h3>

      <div class="locrow">

        <div class="loc-top">
          ${flag ? `<img src="${flag}" class="flag" />` : ""}
          <span>
            ${[s.continent, s.country]
              .filter(Boolean)
              .join(", ")}
          </span>
        </div>

        <p class="city-label">
          ${s.city || ""}
        </p>

      </div>

      ${buildStars(
        s.rating_avg,
        s.rating_count
      )}

      <div class="badge-row">
        ${buildBadges(s)}
      </div>

      <div class="infoblock">

        <div class="info-row">
          <span class="info-label">
            Address
          </span>

          <span class="info-value">
            ${s.address || "—"}
          </span>
        </div>

        <div class="info-row">
          <span class="info-label">
            Phone
          </span>

          <span class="info-value">
            ${s.phone || "—"}
          </span>
        </div>

      </div>

      ${
        s.website
          ? `
            <div class="visit-link">
              <a
                href="${s.website}"
                target="_blank"
                rel="noopener"
              >
                Visit
              </a>
            </div>
          `
          : ""
      }

      <button
        class="reviews-btn"
        type="button"
      >
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

  if (isLoadMore && IS_LOADING_MORE) return;
  if (isLoadMore) IS_LOADING_MORE = true;

  const seq = ++RUN_SEQ;

  console.trace("RUN SEARCH TRIGGERED");

  const snap = snapshot();

// ============================================================
// IDLE STATE → HERO (NO SEARCH)
// ============================================================

if (
  snap.master === MASTER.IDLE &&
  !snap.search &&
  !snap.continent &&
  !snap.country &&
  !snap.state &&
  !snap.city &&
  (!snap.type || snap.type.length === 0) &&
  (!snap.access || snap.access.length === 0)
) {

  // 🔥 ENDast visa hero — MEN nollställ UI korrekt
  resetToHero();

  updateSearchCount(GLOBAL_TOTAL);

  return;
}

  if (!isLoadMore) resetPagination();

  const resp = await loadStores(snap);

if (seq !== RUN_SEQ) return;

console.log("RUN SEARCH STARTED", snap);
if (!resp || resp.error) return;

  const rawRows = resp.data || [];
  console.log("DEBUG ROW:", rawRows[0]);
console.log(
  "MISSING GEO:",
  rawRows.filter(r => !r.city || !r.country).slice(0, 10)
);
  
  // Cursor måste baseras på RAW (inte filtrerade)
  updateCursor(rawRows);

  // Chips filtrerar frontend-side (modifiers)
  const filteredRows = applyChipFilters(rawRows);

  // TEST LOG
  console.log("RUN SEARCH FIRED", STATE.search.text);

  renderCards(filteredRows, isLoadMore);
  if (!isLoadMore) {
  requestAnimationFrame(() => {
    window.scrollTo(0, 0);
  });
}

  /* ============================================================
   STORE GRID VISIBILITY
   ============================================================ */

  const grid = document.getElementById("storeGrid");

  if (grid) {
    grid.style.display = "grid";
  }

  // ============================================================
  // SEARCH ANALYTICS
  // ============================================================

CURRENT_RENDER_SOURCE = window.CURRENT_SOURCE || "direct";
  
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

      source: "search",
    });
  }

 // Count ska visa vad som faktiskt visas
updateSearchCount(LAST_RENDERED_STORES.length);

// reset load-more lock
IS_LOADING_MORE = false;

}

// ============================================================
// FAVORITES
// ============================================================

const FAVORITES = new Set();

async function loadFavoritesState() {

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return;

  const { data, error } =
    await supabase
      .from("store_favorites")
      .select("store_id");

  if (error) {
    console.error(error);
    return;
  }

  FAVORITES.clear();

  (data || []).forEach((row) => {
    FAVORITES.add(Number(row.store_id));
  });

  syncAllFavoriteButtons();
  renderCards(filteredRows, isLoadMore);
}

export async function toggleFavorite(storeId) {

  const id = Number(storeId);

  if (!id) return false;

  const isActive =
    FAVORITES.has(id);

  if (isActive) {

    const { error } =
      await supabase.rpc(
        "remove_store_favorite_v1",
        {
          p_store_id: id
        }
      );

    if (error) {
      console.error(error);
      return false;
    }

    FAVORITES.delete(id);

  } else {

    const { error } =
      await supabase.rpc(
        "save_store_favorite_v1",
        {
          p_store_id: id
        }
      );

    if (error) {
      console.error(error);
      return false;
    }

    FAVORITES.add(id);
  }

  syncFavoriteUI(id);

  return FAVORITES.has(id);
}

export function isFavorite(storeId) {

  return FAVORITES.has(
    Number(storeId)
  );
}

export function syncFavoriteUI(storeId) {

  const id = Number(storeId);

  if (!id) return;

  const active =
    FAVORITES.has(id);

  document
    .querySelectorAll(
      `[data-store-id="${id}"].favorite-heart,
       #modalFavoriteBtn[data-store-id="${id}"]`
    )
    .forEach((el) => {

      el.classList.toggle(
        "active",
        active
      );

    });
}

function syncAllFavoriteButtons() {

  document
    .querySelectorAll(
      ".favorite-heart"
    )
    .forEach((btn) => {

      const storeId =
        Number(
          btn.dataset.storeId
        );

      if (!storeId) return;

      syncFavoriteUI(storeId);

    });
}

window.syncFavoriteUI =
  syncFavoriteUI;

window.toggleFavorite =
  toggleFavorite;


// ============================================================
// GRID CLICK
// ============================================================

let GRID_BOUND = false;

function bindGrid() {

  if (GRID_BOUND) return;

  GRID_BOUND = true;

  const grid = dom("#storeGrid");

  if (!grid) return;

  grid.addEventListener(
    "click",
    async (e) => {

      // ============================================================
      // FAVORITE HEART
      // ============================================================

      const favoriteBtn =
        e.target.closest(
          ".favorite-heart"
        );

      if (favoriteBtn) {

        e.stopPropagation();

        const storeId =
          Number(
            favoriteBtn.dataset.storeId
          );

        if (!storeId) return;

        const isActive =
          FAVORITES.has(storeId);

        if (isActive) {

          const { error } =
            await supabase.rpc(
              "remove_store_favorite_v1",
              {
                p_store_id: storeId
              }
            );

          if (error) {
            console.error(error);
            return;
          }

          FAVORITES.delete(storeId);

        } else {

          const { error } =
            await supabase.rpc(
              "save_store_favorite_v1",
              {
                p_store_id: storeId
              }
            );

          if (error) {
            console.error(error);
            return;
          }

          FAVORITES.add(storeId);
        }

        syncFavoriteUI(storeId);

        return;
      }

      // ============================================================
      // STORE CARD
      // ============================================================

      const card =
        e.target.closest(
          ".store-card"
        );

      if (!card) return;

      const id =
        Number(
          card.dataset.storeId
        );

      if (!id) return;

      openModal({
        id: id,
        source:
          card.dataset.source
      });

    }
  );

}

// ============================================================
// INIT
// ============================================================

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    bindGrid();

    initStoreViewObserver();

    await loadGlobalTotal();

    await loadFavoritesState();

    updateSearchCount(
      GLOBAL_TOTAL
    );

  }
);


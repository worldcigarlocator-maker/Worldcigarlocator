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
// STARS
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
    const trimmed = s.address.trim();
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
      <!-- Expanded panel is injected here (JS) -->
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

  const storeId = Number(card.dataset.storeId);
  if (!storeId) return;

  // If this card already expanded → close
  if (EXPANDED_ACTIVE_CARD === card) {
    closeModal();
    return;
  }

  // Prevent link default
  if (e.target.closest("a")) return;

  openModal(storeId);
});
}

function renderCards(list) {
  const grid = dom("#storeGrid");
  if (!grid) return;

  // If an expanded card is open, close it before re-render
  if (EXPANDED_ACTIVE_CARD) closeModal();

  grid.innerHTML = (list || []).map(cardHTML).join("");

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
// EXPANDED (MAIN OVERLAY) — SAME API NAMES (A)
// ------------------------------------------------------------
// openModal(id) opens an expanded card (centered in MAIN)
// closeModal() closes it
// ============================================================

let EXPANDED_OVERLAY = null;
let EXPANDED_ACTIVE_CARD = null;
let EXPANDED_ACTIVE_STORE_ID = null;
let EXPANDED_PLACEHOLDER = null;

let EXPANDED_PANEL = null;
let PANEL_STAR_PICKER = null;
let PANEL_SEND_RATING = null;
let PANEL_COMMENTS_BOX = null;
let PANEL_COMMENT_INPUT = null;
let PANEL_SEND_COMMENT = null;

let USER_TEMP_RATING = 0;
let PANEL_LOAD_SEQ = 0;

function ensureExpandedOverlay() {
  if (EXPANDED_OVERLAY) return EXPANDED_OVERLAY;

  const overlay = document.createElement("div");
  overlay.className = "wcl-overlay";
  overlay.style.position = "fixed";
  overlay.style.zIndex = "99999";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.background = "rgba(0,0,0,0.78)";
  overlay.style.backdropFilter = "blur(6px)";

  const applyPosition = () => {
    const main = document.querySelector(".main");
    const left = main ? main.getBoundingClientRect().left : 0;

    overlay.style.left = `${left}px`;
    overlay.style.top = "0px";
    overlay.style.width = `calc(100vw - ${left}px)`;
    overlay.style.height = `${window.innerHeight}px`;
  };

  applyPosition();
  window.addEventListener("resize", applyPosition);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });

  document.body.appendChild(overlay);
  EXPANDED_OVERLAY = overlay;
  return overlay;
}


function createExpandedPanelOnce() {
  if (EXPANDED_PANEL) return EXPANDED_PANEL;

  const panel = document.createElement("div");
  panel.className = "wcl-expanded-panel";

  panel.innerHTML = `
    <div class="wcl-rating-label">Your rating</div>
    <div class="star-picker" aria-label="Rate this place">
      <span data-val="1">☆</span>
      <span data-val="2">☆</span>
      <span data-val="3">☆</span>
      <span data-val="4">☆</span>
      <span data-val="5">☆</span>
    </div>

    <div class="wcl-comments-title">Comments</div>
    <div class="card-comments-box"></div>

    <textarea class="card-comment-input" placeholder="Write a comment…"></textarea>
    <button type="button" class="card-send-comment">Post comment</button>
  `;

  PANEL_STAR_PICKER = panel.querySelector(".star-picker");

  PANEL_COMMENTS_BOX = panel.querySelector(".card-comments-box");
  PANEL_COMMENT_INPUT = panel.querySelector(".card-comment-input");
  PANEL_SEND_COMMENT = panel.querySelector(".card-send-comment");

  // Stop bubbling: do NOT close while interacting
  const stopList = [
    PANEL_STAR_PICKER,
    PANEL_SEND_RATING,
    PANEL_COMMENTS_BOX,
    PANEL_COMMENT_INPUT,
    PANEL_SEND_COMMENT,
  ];

  stopList.forEach((el) => {
    if (!el) return;
    el.addEventListener("click", (e) => e.stopPropagation());
    el.addEventListener("mousedown", (e) => e.stopPropagation());
    el.addEventListener("pointerdown", (e) => e.stopPropagation());
    el.addEventListener("touchstart", (e) => e.stopPropagation(), {
      passive: true,
    });
    el.addEventListener("wheel", (e) => e.stopPropagation(), { passive: true });
  });

// =========================
// STAR PICKER (AUTO SAVE)
// =========================
PANEL_STAR_PICKER.querySelectorAll("span").forEach((star) => {

  // Hover preview
  star.addEventListener("mouseenter", () => {
    const hoverVal = Number(star.dataset.val) || 0;
    highlightStars(hoverVal);
  });

  star.addEventListener("mouseleave", () => {
    highlightStars(USER_TEMP_RATING);
  });

  // Click = save directly
  star.addEventListener("click", async () => {
    const value = Number(star.dataset.val) || 0;

    // Click same star twice → clear rating
    if (USER_TEMP_RATING === value) {
      USER_TEMP_RATING = 0;
    } else {
      USER_TEMP_RATING = value;
    }

    highlightStars(USER_TEMP_RATING);
    await saveRatingDirect(USER_TEMP_RATING);
  });
});


  // Submit comment
  PANEL_SEND_COMMENT.addEventListener("click", submitComment);

  EXPANDED_PANEL = panel;
  return panel;
}

function highlightStars(count) {
  const n = Number(count) || 0;
  if (!PANEL_STAR_PICKER) return;

  PANEL_STAR_PICKER.querySelectorAll("span").forEach((s, i) => {
    if (i < n) s.classList.add("active");
    else s.classList.remove("active");
    s.textContent = i < n ? "★" : "☆";
  });
}

async function saveRatingDirect(ratingValue) {
  if (!EXPANDED_ACTIVE_STORE_ID) return;

  const userResp = await supabase.auth.getUser();
  const user = userResp.data.user;
  if (!user) {
    alert("Login required.");
    return;
  }

  // If 0 → delete rating (clear)
  if (!ratingValue) {
    const { error } = await supabase
      .from("ratings")
      .delete()
      .eq("store_id", EXPANDED_ACTIVE_STORE_ID)
      .eq("user_id", user.id);

    if (error) {
      console.error("Clear rating error:", error);
      return;
    }

    return;
  }

  // Otherwise upsert
  const { error } = await supabase.from("ratings").upsert({
    store_id: EXPANDED_ACTIVE_STORE_ID,
    user_id: user.id,
    rating: ratingValue,
  });

  if (error) {
    console.error("Rating save error:", error);
  }
}


// ✅ Same name as before
async function openModal(id) {
  const storeId = Number(id);
  if (!storeId) return;

  // find card in grid
  const grid = dom("#storeGrid");
  if (!grid) return;

  const card = grid.querySelector(`.store-card[data-store-id="${storeId}"]`);
  if (!card) return;

  // If another is open, close first
  if (EXPANDED_ACTIVE_CARD && EXPANDED_ACTIVE_CARD !== card) {
    closeModal();
  }

  // Toggle behavior: clicking same card again closes
  if (EXPANDED_ACTIVE_CARD === card) {
    closeModal();
    return;
  }

  const overlay = ensureExpandedOverlay();

  // placeholder keeps grid position
  EXPANDED_PLACEHOLDER = document.createComment("wcl-expanded-placeholder");
  card.parentNode?.insertBefore(EXPANDED_PLACEHOLDER, card);

  overlay.appendChild(card);
  card.classList.add("expanded");

  // whole card scroll
  card.style.maxHeight = "90vh";
  card.style.overflowY = "auto";

  // reviews button becomes label in expanded (optional)
  const reviewsBtn = card.querySelector(".reviews-btn");
  if (reviewsBtn) reviewsBtn.textContent = "Comments";

  // panel injected in card
  const panel = createExpandedPanelOnce();
  const body = card.querySelector(".store-body");
  body?.appendChild(panel);

  EXPANDED_ACTIVE_CARD = card;
  EXPANDED_ACTIVE_STORE_ID = storeId;

  await loadExpandedData(storeId);
}

// ✅ Same name as before
function closeModal() {
  if (!EXPANDED_ACTIVE_CARD) return;

  const card = EXPANDED_ACTIVE_CARD;

  // Remove expanded panel
  if (EXPANDED_PANEL?.parentNode) {
    EXPANDED_PANEL.parentNode.removeChild(EXPANDED_PANEL);
  }

  // Remove expanded class & scroll styles
  card.classList.remove("expanded");
  card.style.maxHeight = "";
  card.style.overflowY = "";

  // Put card back to original position
  if (EXPANDED_PLACEHOLDER && EXPANDED_PLACEHOLDER.parentNode) {
    EXPANDED_PLACEHOLDER.parentNode.insertBefore(card, EXPANDED_PLACEHOLDER);
    EXPANDED_PLACEHOLDER.parentNode.removeChild(EXPANDED_PLACEHOLDER);
  } else {
    dom("#storeGrid")?.appendChild(card);
  }

  // 🔥 REMOVE OVERLAY COMPLETELY
  if (EXPANDED_OVERLAY) {
    EXPANDED_OVERLAY.remove();
    EXPANDED_OVERLAY = null;
  }

  // Reset state
  EXPANDED_PLACEHOLDER = null;
  EXPANDED_ACTIVE_CARD = null;
  EXPANDED_ACTIVE_STORE_ID = null;

  USER_TEMP_RATING = 0;
}

// ✅ ESC closes
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

// ============================================================
// LAZY DATA: USER RATING + COMMENTS
// ============================================================
async function loadExpandedData(storeId) {
  PANEL_LOAD_SEQ++;
  const seq = PANEL_LOAD_SEQ;

  if (PANEL_COMMENTS_BOX) PANEL_COMMENTS_BOX.innerHTML = "<p>Loading…</p>";
  USER_TEMP_RATING = 0;
  highlightStars(0);

  await Promise.all([loadUserRating(storeId, seq), loadComments(storeId, seq)]);
}

async function loadUserRating(store_id, seq) {
  try {
    const userResp = await supabase.auth.getUser();
    const user = userResp.data.user;

    if (seq !== PANEL_LOAD_SEQ) return;
    if (EXPANDED_ACTIVE_STORE_ID !== store_id) return;

    if (!user) {
      USER_TEMP_RATING = 0;
      highlightStars(0);
      return;
    }

    const { data, error } = await supabase
      .from("ratings")
      .select("rating")
      .eq("store_id", store_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (seq !== PANEL_LOAD_SEQ) return;
    if (EXPANDED_ACTIVE_STORE_ID !== store_id) return;

    if (error) {
      console.error("loadUserRating error:", error);
      USER_TEMP_RATING = 0;
      highlightStars(0);
      return;
    }

    USER_TEMP_RATING = Number(data?.rating) || 0;
    highlightStars(USER_TEMP_RATING);
  } catch (err) {
    console.error("loadUserRating fatal:", err);
  }
}

async function submitRating() {
  if (!EXPANDED_ACTIVE_STORE_ID) return;

  const rating = Number(USER_TEMP_RATING) || 0;
  if (!rating) return alert("Select a rating first!");

  const userResp = await supabase.auth.getUser();
  const user = userResp.data.user;
  if (!user) return alert("Login required.");

  const { error } = await supabase.from("ratings").upsert({
    store_id: EXPANDED_ACTIVE_STORE_ID,
    user_id: user.id,
    rating,
  });

  if (error) {
    console.error("submitRating error:", error);
    alert("Could not submit rating.");
    return;
  }

  // NOTE: aggregated stars in grid are not refreshed here (lightweight by design)
}

async function loadComments(store_id, seq) {
  if (!PANEL_COMMENTS_BOX) return;

  try {
    const { data, error } = await supabase
      .from("store_comments")
      .select("*")
      .eq("store_id", store_id)
      .order("created_at", { ascending: false });

    if (seq !== PANEL_LOAD_SEQ) return;
    if (EXPANDED_ACTIVE_STORE_ID !== store_id) return;

    if (error) {
      console.error("loadComments error:", error);
      PANEL_COMMENTS_BOX.innerHTML = "<p>Could not load comments.</p>";
      return;
    }

    if (!data || !data.length) {
      PANEL_COMMENTS_BOX.innerHTML = "<p>No comments yet.</p>";
      return;
    }

    PANEL_COMMENTS_BOX.innerHTML = data
      .map(
        (c) => `
        <div class="comment">
          <p>${String(c.text || "")}</p>
          <small>${new Date(c.created_at).toLocaleString()}</small>
        </div>`
      )
      .join("");
  } catch (err) {
    console.error("loadComments fatal:", err);
    PANEL_COMMENTS_BOX.innerHTML = "<p>Could not load comments.</p>";
  }
}

async function submitComment() {
  if (!EXPANDED_ACTIVE_STORE_ID) return;
  if (!PANEL_COMMENT_INPUT) return;

  const text = PANEL_COMMENT_INPUT.value.trim();
  if (!text) return;

  const userResp = await supabase.auth.getUser();
  const user = userResp.data.user;
  if (!user) return alert("Login required.");

  const { error } = await supabase.from("store_comments").insert({
    store_id: EXPANDED_ACTIVE_STORE_ID,
    user_id: user.id,
    text,
  });

  if (error) {
    console.error("submitComment error:", error);
    alert("Could not post comment.");
    return;
  }

  PANEL_COMMENT_INPUT.value = "";
  PANEL_LOAD_SEQ++;
  const seq = PANEL_LOAD_SEQ;
  loadComments(EXPANDED_ACTIVE_STORE_ID, seq);
}

// ============================================================
// INIT (DOM SAFE)
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  bindGridEventsOnce();
});

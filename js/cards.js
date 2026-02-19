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
// MODAL (CLEAN SYSTEM — #storeModal)
// ============================================================

let MODAL_ACTIVE_STORE_ID = null;
let MODAL_LOAD_SEQ = 0;
let MODAL_USER_TEMP_RATING = 0;

// cached DOM refs (resolved lazily)
const modalEl = () => document.getElementById("storeModal");
const modalImg = () => document.getElementById("modalImg");
const modalName = () => document.getElementById("modalName");
const modalFlag = () => document.getElementById("modalFlag");
const modalLocation = () => document.getElementById("modalLocation");
const modalBadges = () => document.getElementById("modalBadges");
const modalAddress = () => document.getElementById("modalAddress");
const modalPhone = () => document.getElementById("modalPhone");
const modalWebsite = () => document.getElementById("modalWebsite");
const modalStarPicker = () => document.getElementById("modalStarPicker");
const modalSendRating = () => document.getElementById("modalSendRating");
const modalComments = () => document.getElementById("modalComments");
const modalCommentInput = () => document.getElementById("modalCommentInput");
const modalSendComment = () => document.getElementById("modalSendComment");

function findStoreInLastRendered(storeId) {
  const id = Number(storeId);
  if (!id) return null;
  return (LAST_RENDERED_STORES || []).find((x) => Number(x?.id) === id) || null;
}

function setBodyScrollLocked(locked) {
  document.body.style.overflow = locked ? "hidden" : "";
}

function highlightModalStars(count) {
  const n = Number(count) || 0;
  const picker = modalStarPicker();
  if (!picker) return;

  picker.querySelectorAll("span").forEach((s, i) => {
    s.textContent = i < n ? "★" : "☆";
    if (i < n) s.classList.add("active");
    else s.classList.remove("active");
  });
}

function resetModalUI() {
  if (modalImg()) modalImg().src = "";
  if (modalName()) modalName().textContent = "";
  if (modalLocation()) modalLocation().textContent = "";
  if (modalBadges()) modalBadges().innerHTML = "";
  if (modalAddress()) modalAddress().textContent = "";
  if (modalPhone()) modalPhone().textContent = "";

  const flagEl = modalFlag();
  if (flagEl) {
    flagEl.removeAttribute("src");
    flagEl.style.display = "none";
  }

  const web = modalWebsite();
  if (web) {
    web.href = "#";
    web.style.display = "none";
  }

  const commentsBox = modalComments();
  if (commentsBox) commentsBox.innerHTML = "";

  const input = modalCommentInput();
  if (input) input.value = "";

  MODAL_USER_TEMP_RATING = 0;
  highlightModalStars(0);
}

async function openModal(id) {
  const storeId = Number(id);
  if (!storeId) return;

  const s = findStoreInLastRendered(storeId);
  if (!s) return;

  MODAL_ACTIVE_STORE_ID = storeId;
  MODAL_LOAD_SEQ++;
  const seq = MODAL_LOAD_SEQ;

  const m = modalEl();
  if (!m) return;

  resetModalUI();

  m.classList.remove("hidden");
  setBodyScrollLocked(true);

  // Fill from canonical rendered object (no parallel fetch)
  modalImg().src = getPhotoUrl(s);
const nameEl = modalName();
if (nameEl) nameEl.textContent = s.name || "Unnamed";


  // flag
  const flag = getFlagUrl(s);
  const flagEl = modalFlag();
  if (flagEl && flag) {
    flagEl.src = flag;
    flagEl.style.display = "";
  } else if (flagEl) {
    flagEl.style.display = "none";
  }

  modalLocation().textContent = [s.continent, s.country, s.city]
    .filter(Boolean)
    .join(", ");

  modalBadges().innerHTML = buildBadges(s);
  modalAddress().textContent = s.address || "—";
  modalPhone().textContent = s.phone || "—";

  const web = modalWebsite();
  if (web && s.website) {
    web.href = s.website;
    web.style.display = "inline";
  } else if (web) {
    web.style.display = "none";
  }

  // Load rating + comments (async, guarded)
  await Promise.all([loadModalUserRating(storeId, seq), loadModalComments(storeId, seq)]);
}

function closeModal() {
  const m = modalEl();
  if (!m) return;

  m.classList.add("hidden");
  setBodyScrollLocked(false);

  MODAL_ACTIVE_STORE_ID = null;
  MODAL_USER_TEMP_RATING = 0;
  // Keep LAST_RENDERED_STORES intact (modal can reopen without re-search)
}

async function loadModalUserRating(store_id, seq) {
  try {
    const userResp = await supabase.auth.getUser();
    const user = userResp?.data?.user;

    if (seq !== MODAL_LOAD_SEQ) return;
    if (MODAL_ACTIVE_STORE_ID !== store_id) return;

    if (!user) {
      MODAL_USER_TEMP_RATING = 0;
      highlightModalStars(0);
      return;
    }

    const { data, error } = await supabase
      .from("ratings")
      .select("rating")
      .eq("store_id", store_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (seq !== MODAL_LOAD_SEQ) return;
    if (MODAL_ACTIVE_STORE_ID !== store_id) return;

    if (error) {
      console.error("loadModalUserRating error:", error);
      MODAL_USER_TEMP_RATING = 0;
      highlightModalStars(0);
      return;
    }

    MODAL_USER_TEMP_RATING = Number(data?.rating) || 0;
    highlightModalStars(MODAL_USER_TEMP_RATING);
  } catch (err) {
    console.error("loadModalUserRating fatal:", err);
  }
}

async function saveModalRating(ratingValue) {
  if (!MODAL_ACTIVE_STORE_ID) return;

  const userResp = await supabase.auth.getUser();
  const user = userResp?.data?.user;
  if (!user) {
    alert("Login required.");
    return;
  }

  const value = Number(ratingValue) || 0;

  // 0 = clear rating
  if (value === 0) {
    const { error } = await supabase
      .from("ratings")
      .delete()
      .eq("store_id", MODAL_ACTIVE_STORE_ID)
      .eq("user_id", user.id);

    if (error) console.error("clear rating error:", error);
    return;
  }

  const { error } = await supabase.from("ratings").upsert({
    store_id: MODAL_ACTIVE_STORE_ID,
    user_id: user.id,
    rating: value,
  });

  if (error) console.error("save rating error:", error);
}

async function loadModalComments(store_id, seq) {
  const box = modalComments();
  const countEl = document.getElementById("modalCommentCount");

  if (!box) return;

  box.innerHTML = "";

  const { data } = await supabase
    .from("store_comments")
    .select("*")
    .eq("store_id", store_id)
    .order("created_at", { ascending: false });

  if (seq !== MODAL_LOAD_SEQ) return;

  const comments = data || [];

  if (countEl) {
    countEl.textContent = `Comments ${comments.length}`;
  }

  if (!comments.length) return;

  const { data: authData } = await supabase.auth.getUser();
  const currentUser = authData?.user;

  const isAdmin = currentUser?.email === "YOUR_ADMIN_EMAIL_HERE";

  box.innerHTML = comments.map(c => {

    const isOwner = currentUser && c.user_id === currentUser.id;
    const canDelete = isOwner || isAdmin;

    return `
      <div class="modal-comment">
        <div class="modal-comment-header">
          <span class="modal-comment-author">
            ${c.user_name || "Anonymous"}
          </span>

          <div class="modal-comment-meta">
            <span class="modal-comment-date">
              ${new Date(c.created_at).toLocaleDateString()}
            </span>

            ${
              canDelete
                ? `<button class="modal-comment-delete" data-id="${c.id}">
                     Delete
                   </button>`
                : ""
            }
          </div>
        </div>

        <div class="modal-comment-text">
          ${c.comment || ""}
        </div>
      </div>
    `;
  }).join("");
}



async function submitModalComment() {
  if (!MODAL_ACTIVE_STORE_ID) return;

  const input = modalCommentInput();
  if (!input) return;

  const text = input.value.trim();
  if (!text) return;

  const userResp = await supabase.auth.getUser();
  const user = userResp?.data?.user;
  if (!user) {
    alert("Login required.");
    return;
  }

const { error } = await supabase.from("store_comments").insert({
  store_id: MODAL_ACTIVE_STORE_ID,
  user_id: user.id,
  comment: text,
});


  if (error) {
    console.error("submitModalComment error:", error);
    alert("Could not post comment.");
    return;
  }

  input.value = "";

  MODAL_LOAD_SEQ++;
  const seq = MODAL_LOAD_SEQ;
  loadModalComments(MODAL_ACTIVE_STORE_ID, seq);
}

// ============================================================
// MODAL EVENTS (BOUND ONCE)
// ============================================================
let MODAL_EVENTS_BOUND = false;

function bindModalEventsOnce() {
  if (MODAL_EVENTS_BOUND) return;
  MODAL_EVENTS_BOUND = true;

  // Close via backdrop / X
  document.addEventListener("click", (e) => {
    if (e.target.closest(".modal-close")) closeModal();
    if (e.target.classList.contains("modal-backdrop")) closeModal();
  });

  // ESC closes
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  // Star picker (toggle + hover preview)
  const picker = modalStarPicker();
  if (picker) {
    picker.querySelectorAll("span").forEach((star) => {
      star.addEventListener("mouseenter", () => {
        const hoverVal = Number(star.dataset.val) || 0;
        highlightModalStars(hoverVal);
      });

      star.addEventListener("mouseleave", () => {
        highlightModalStars(MODAL_USER_TEMP_RATING);
      });

      star.addEventListener("click", () => {
        const value = Number(star.dataset.val) || 0;

        // click same star twice → clear
        MODAL_USER_TEMP_RATING = MODAL_USER_TEMP_RATING === value ? 0 : value;
        highlightModalStars(MODAL_USER_TEMP_RATING);
      });
    });
  }

  // Submit rating button
  const btn = modalSendRating();
  if (btn) {
    btn.addEventListener("click", async () => {
      await saveModalRating(MODAL_USER_TEMP_RATING);
      // refresh from DB (optional) — keeps canonical display
      if (MODAL_ACTIVE_STORE_ID) {
        MODAL_LOAD_SEQ++;
        const seq = MODAL_LOAD_SEQ;
        await loadModalUserRating(MODAL_ACTIVE_STORE_ID, seq);
      }
    });
  }

  // Submit comment
  const cbtn = modalSendComment();
  if (cbtn) {
    cbtn.addEventListener("click", submitModalComment);
  }
}

// ============================================================
// DELETE COMMENT
// ============================================================

document.addEventListener("click", async (e) => {
  const btn = e.target.closest(".modal-comment-delete");
  if (!btn) return;

  const id = btn.dataset.id;
  if (!id) return;

  const { error } = await supabase
    .from("store_comments")
    .delete()
    .eq("id", id);

  if (!error) {
    MODAL_LOAD_SEQ++;
    loadModalComments(MODAL_ACTIVE_STORE_ID, MODAL_LOAD_SEQ);
  }
});


// ============================================================
// INIT (DOM SAFE)
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  bindGridEventsOnce();
});

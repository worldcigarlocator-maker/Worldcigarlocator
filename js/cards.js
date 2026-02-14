// ============================================================
// CARDS.JS — WCL Frontend (CANONICAL · CORE UI · FULL FILE)
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
//
// ✅ FIXES INCLUDED (why your modal/cards weren’t working):
// • NO duplicate const/let declarations (fixes “Cannot declare const twice: modal”)
// • Modal init is SINGLE + LAZY (ensureModalInit) + DOM-safe
// • Card clicks use ONE delegated listener on #storeGrid (not 1057 listeners)
// • Modal elements are resolved safely even if HTML moves
// • No “document.querySelector('.store-card').addEventListener” at global scope
// ============================================================

import { supabase } from "./globals.js";

// ============================================================
// ANALYTICS SAFE FALLBACK (NO HARD DEPENDENCY)
// ============================================================
const VIEW_OBSERVER =
  window?.WCL_ANALYTICS?.VIEW_OBSERVER ??
  { observe() {}, unobserve() {} };

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
  location: {
    continent: null,
    country: null,
    state: null,
    city: null,
  },
  search: {
    text: "",
  },
  chips: {
    type: null,   // "store" | "lounge" | null
    access: null, // "public" | "members" | null
  },
};

// ============================================================
// INTERNAL HELPERS — STATE
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
  STARTUP_HERO = false; // 🔑 viktig

  MASTER_MODE = MASTER.LOCATION;
  clearSearch();

  STATE.location.continent = next?.continent ?? null;
  STATE.location.country   = next?.country   ?? null;
  STATE.location.state     = next?.state     ?? null;
  STATE.location.city      = next?.city      ?? null;

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

// ❌ Clear location (only if location is master)
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
  const iso = store?.country_iso2?.toLowerCase();
  if (!iso) return null;
  return `assets/flags/${iso}.svg`;
}

// ============================================================
// BADGES
// ============================================================
function buildBadges(store) {
  const badges = [];
  const arr = Array.isArray(store?.types)
    ? store.types.map((t) => String(t).toLowerCase())
    : [];

  if (arr.includes("store"))  badges.push(`<span class="badge badge-store">Store</span>`);
  if (arr.includes("lounge")) badges.push(`<span class="badge badge-lounge">Lounge</span>`);

  const A = String(store?.access || "").trim().toLowerCase();
  if (A === "public") {
    badges.push(`<span class="badge badge-access badge-access-public">PUBLIC</span>`);
  } else if (A) {
    badges.push(`<span class="badge badge-access">${A.toUpperCase()}</span>`);
  }

  return badges.join(" ");
}

// ============================================================
// PHOTO URL
// ============================================================
function getPhotoUrl(store) {
  // 1) Helig CDN-bild
  if (store?.photo_cdn_url) return store.photo_cdn_url;

  // 2) Legacy direkt-URL
  if (store?.photo_url) return store.photo_url;

  // 3) Google Places via proxy
  if (store?.photo_reference) {
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
  const r = Math.round(v);
  const f = "★".repeat(r);
  const e = "☆".repeat(5 - r);
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

  const displayName = s?.name || "Unnamed";
  const displayCity = s?.city || "";
  const displayCountry = s?.country || "";

  let displayAddress = "—";
  if (s?.address) {
    const trimmed = String(s.address).trim();
    displayAddress = trimmed.includes(",") ? trimmed.split(",")[0] + "…" : trimmed;
  }

  return `
  <article class="store-card"
    data-store-id="${s?.id ?? ""}"
    data-country="${s?.country || ""}"
    data-city="${s?.city || ""}"
    data-continent="${s?.continent || ""}">

    <img src="${img}" class="store-img" alt="${displayName}" loading="lazy"
      onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}'" />

    <div class="store-body">
      <h3 class="store-title">${displayName}</h3>

      <div class="badge-row">${buildBadges(s)}</div>

      ${buildStars(s?.rating_avg, s?.rating_count)}

      <div class="locrow">
        <div class="loc-top">
          ${flag ? `<img src="${flag}" class="flag" />` : ""}
          <span>${[s?.continent, displayCountry].filter(Boolean).join(", ")}</span>
        </div>
        <p class="city-label">${displayCity}</p>
      </div>

      <div class="infoblock">
        <p><strong>Address:</strong> ${displayAddress}</p>
        <p><strong>Phone:</strong> ${s?.phone || "—"}</p>
        <p><strong>Website:</strong>
          ${
            s?.website
              ? `<a href="${s.website}" target="_blank" rel="noopener" class="visit-website" data-store-id="${s.id}">Visit</a>`
              : "—"
          }
        </p>
      </div>

      <button class="reviews-btn" type="button">(${s?.comment_count || 0})</button>
    </div>
  </article>`;
}

// ============================================================
// RENDER CARDS (CANONICAL · SAFE · MODAL-AWARE)
// ============================================================
function renderCards(list) {
  const grid = dom("#storeGrid");
  if (!grid) return;

  // 1️⃣ Render HTML
  grid.innerHTML = (list || []).map(cardHTML).join("");

  // 2️⃣ Analytics-safe observer (no-op if analytics not loaded)
  grid.querySelectorAll(".store-card").forEach((card) => {
    VIEW_OBSERVER.observe(card);
  });

  // 3️⃣ NO per-card click listeners here (delegation below).
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
  const types = Array.isArray(store?.types)
    ? store.types.map((t) => String(t).toLowerCase())
    : [];
  return types.includes(String(type).toLowerCase());
}

function matchesAccess(store, access) {
  if (!access) return true;
  return String(store?.access || "").toLowerCase() === String(access).toLowerCase();
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

  // stale response guard
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

  // Hero mode if absolutely nothing active
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

  // clear grid quickly (keeps UI crisp)
  renderCards([]);

  const resp = await loadStores({
    continent: snapshot.continent,
    country: snapshot.country,
    state: snapshot.state,
    city: snapshot.city,
  });

  if (runId !== RUN_SEQ) return;

  if (!resp || resp.error) {
    if (heading) heading.textContent = "Error loading results";
    return;
  }

  const rows = resp.data || [];
  const filtered = applyFrontendFilters(rows, snapshot);

  if (heading) {
    heading.textContent = `${filtered.length} results`;
    heading.style.display = "block";
  }

  renderCards(filtered);
}

// ============================================================
// WEBSITE CLICK ANALYTICS (safe)
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
// MODAL SYSTEM (CANONICAL · SINGLE INIT · LAZY)
// ============================================================
let MODAL_READY = false;

let modalEl = null;
let modalCloseBtn = null;
let modalBackdrop = null;

let starPickerEl = null;
let ratingSendBtnEl = null;

let commentsBoxEl = null;
let commentInputEl = null;
let sendCommentBtnEl = null;

let CURRENT_STORE = null;
let USER_TEMP_RATING = 0;

function ensureModalInit() {
  if (MODAL_READY) return;
  MODAL_READY = true;

  modalEl = dom("#storeModal");
  modalCloseBtn = dom(".modal-close");
  modalBackdrop = dom(".modal-backdrop");

  starPickerEl = dom("#modalStarPicker");
  ratingSendBtnEl = dom("#modalSendRating");

  commentsBoxEl = dom("#modalComments");
  commentInputEl = dom("#modalCommentInput");
  sendCommentBtnEl = dom("#modalSendComment");

  // Close handlers
  modalCloseBtn?.addEventListener("click", closeModal);
  modalBackdrop?.addEventListener("click", closeModal);

  // Star hover + click
  starPickerEl?.querySelectorAll("span").forEach((star) => {
    star.addEventListener("mouseenter", () =>
      highlightStars(Number(star.dataset.val) || 0)
    );
    star.addEventListener("mouseleave", () => highlightStars(USER_TEMP_RATING));
    star.addEventListener("click", () => {
      USER_TEMP_RATING = Number(star.dataset.val) || 0;
      highlightStars(USER_TEMP_RATING);
    });
  });

  // Submit rating / comment
  ratingSendBtnEl?.addEventListener("click", submitRating);
  sendCommentBtnEl?.addEventListener("click", submitComment);
}

function openModalVisible() {
  modalEl?.classList.remove("hidden");
}

function closeModal() {
  modalEl?.classList.add("hidden");
}

async function openModal(id) {
  ensureModalInit();

  const storeId = Number(id);
  if (!storeId) return;

  CURRENT_STORE = storeId;

  const { data, error } = await supabase
    .from("stores_frontend_public_v4")
    .select("*")
    .eq("id", storeId)
    .single();

  if (error) {
    console.error("Modal store load error:", error);
    return;
  }
  if (!data) return;

  fillModal(data);

  // Load comments + user rating in parallel
  await Promise.all([loadComments(storeId), loadUserRating(storeId)]);

  openModalVisible();
}

function fillModal(s) {
  const img = dom("#modalImg");
  const name = dom("#modalName");
  const flag = dom("#modalFlag");
  const loc = dom("#modalLocation");
  const addr = dom("#modalAddress");
  const phone = dom("#modalPhone");
  const w = dom("#modalWebsite");
  const badges = dom("#modalBadges");
  const stars = dom("#modalStars");

  if (img) img.src = getPhotoUrl(s);
  if (name) name.textContent = s?.name || "";
  if (flag) flag.src = getFlagUrl(s) || "";
  if (loc) loc.textContent = `${s?.city || ""}, ${s?.country || ""}`;

  if (addr) addr.textContent = s?.address || "—";
  if (phone) phone.textContent = s?.phone || "—";

  if (w) {
    if (s?.website) {
      w.href = s.website;
      w.style.display = "inline";
    } else {
      w.style.display = "none";
    }
  }

  if (badges) badges.innerHTML = buildBadges(s);
  if (stars) stars.innerHTML = buildStars(s?.rating_avg, s?.rating_count);
}

function highlightStars(count) {
  if (!starPickerEl) return;
  const n = Number(count) || 0;
  starPickerEl.querySelectorAll("span").forEach((s, i) => {
    s.textContent = i < n ? "★" : "☆";
  });
}

async function loadUserRating(store_id) {
  const userResp = await supabase.auth.getUser();
  const user = userResp?.data?.user;
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

  if (error) {
    console.error("loadUserRating error:", error);
    return;
  }

  USER_TEMP_RATING = Number(data?.rating) || 0;
  highlightStars(USER_TEMP_RATING);
}

async function submitRating() {
  if (!CURRENT_STORE) return;

  const rating = Number(USER_TEMP_RATING) || 0;
  if (!rating) return alert("Select a rating first!");

  const userResp = await supabase.auth.getUser();
  const user = userResp?.data?.user;
  if (!user) return alert("Login required.");

  const { error } = await supabase.from("ratings").upsert({
    store_id: CURRENT_STORE,
    user_id: user.id,
    rating,
  });

  if (error) {
    console.error("submitRating error:", error);
    alert("Failed to submit rating.");
    return;
  }

  // Refresh modal store data (new avg/count)
  await loadModalStore();
}

async function loadModalStore() {
  if (!CURRENT_STORE) return;

  const { data, error } = await supabase
    .from("stores_frontend_public_v4")
    .select("*")
    .eq("id", CURRENT_STORE)
    .single();

  if (error) {
    console.error("loadModalStore error:", error);
    return;
  }

  if (data) fillModal(data);
}

async function loadComments(store_id) {
  if (!commentsBoxEl) return;

  const { data, error } = await supabase
    .from("store_comments")
    .select("*")
    .eq("store_id", store_id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("loadComments error:", error);
    commentsBoxEl.innerHTML = "<p>Failed to load comments.</p>";
    return;
  }

  commentsBoxEl.innerHTML = "";

  if (!data || !data.length) {
    commentsBoxEl.innerHTML = "<p>No comments yet.</p>";
    return;
  }

  commentsBoxEl.innerHTML = data
    .map(
      (c) => `
        <div class="comment">
          <p>${c?.text ?? ""}</p>
          <small>${new Date(c?.created_at).toLocaleString()}</small>
        </div>`
    )
    .join("");
}

async function submitComment() {
  if (!CURRENT_STORE) return;
  if (!commentInputEl) return;

  const text = commentInputEl.value.trim();
  if (!text) return;

  const userResp = await supabase.auth.getUser();
  const user = userResp?.data?.user;
  if (!user) return alert("Login required.");

  const { error } = await supabase.from("store_comments").insert({
    store_id: CURRENT_STORE,
    user_id: user.id,
    text,
  });

  if (error) {
    console.error("submitComment error:", error);
    alert("Failed to post comment.");
    return;
  }

  commentInputEl.value = "";
  await loadComments(CURRENT_STORE);

  // Optional: refresh modal store (comment_count)
  await loadModalStore();
}

// ============================================================
// CARD CLICK (DELEGATION) — ONE listener only
// ============================================================
let CARD_EVENTS_BOUND = false;

function bindCardClicksOnce() {
  if (CARD_EVENTS_BOUND) return;
  CARD_EVENTS_BOUND = true;

  document.addEventListener("click", (e) => {
    const card = e.target.closest(".store-card");
    if (!card) return;

    // allow links to behave normally
    if (e.target.closest("a")) return;

    const id = Number(card.dataset.storeId);
    if (!id) return;

    openModal(id);
  });
}

// ============================================================
// INIT (DOM SAFE)
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  // Safe: binds once, no matter how many rerenders you do
  bindCardClicksOnce();

  // Safe: pre-init modal if it exists already (it does in your HTML)
  // but still works if you move modal around later.
  ensureModalInit();
});

// DEBUG ONLY
window.__openModalTest = openModal;


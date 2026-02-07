// ============================================================
// CARDS.JS — WCL FRONTEND (CANONICAL, LAW + SMART SEARCH)
// - Single source of truth: STATE + MASTER_MODE
// - LAW: last action wins between SEARCH and LOCATION
// - Chips are always modifiers
// - Search intent handled in backend (search_stores_v1)
// - Frontend search = trigger only, no semantic matching
// ============================================================

import { supabase } from "./globals.js";
import { VIEW_OBSERVER } from "./analytics-frontend.js";

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
// DOM READY
// ============================================================
let DOM_READY = false;
document.addEventListener("DOMContentLoaded", () => {
  DOM_READY = true;
  initAutocomplete();
  initLiveSearchAndFilters();
});

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
    type: null,    // "store" | "lounge" | null
    access: null,  // "public" | "members" | null
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
  if (store.photo_cdn_url) return store.photo_cdn_url;

  // 2) Legacy direkt-URL
  if (store.photo_url) return store.photo_url;

  // 3) Google Places via proxy
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
// AUTOCOMPLETE (UI only)
// ============================================================
let AC_BOX = null;
function initAutocomplete() {
  AC_BOX = dom("#autocomplete");
  if (!AC_BOX) return;

  document.addEventListener("click", (e) => {
    const searchInput = dom("#searchInput");
    if (!AC_BOX.contains(e.target) && e.target !== searchInput) {
      AC_BOX.classList.add("hidden");
    }
  });
}

// ============================================================
// SEARCH TOKEN PARSER
// ============================================================
function parseSearchTokens(raw) {
  const s = (raw || "").trim();
  if (!s) return { text: "", type: null, access: null };

  const tokens = s.split(/\s+/);
  const keep = [];

  let type = null;
  let access = null;

  for (const t0 of tokens) {
    const t = t0.toLowerCase();

    if (t === "store" || t === "stores") { type = "store"; continue; }
    if (t === "lounge" || t === "lounges") { type = "lounge"; continue; }
    if (t === "public") { access = "public"; continue; }
    if (t === "member" || t === "members") { access = "members"; continue; }

    keep.push(t0);
  }

  return { text: keep.join(" ").trim(), type, access };
}

// ============================================================
// FILTER UI SYNC
// ============================================================
function updateChipUI() {
  const box = dom("#searchFilters");
  if (!box) return;

  box.querySelectorAll("input[type='checkbox'][data-filter]").forEach((cb) => {
    const filter = cb.dataset.filter;
    const val = cb.dataset.value;

    const isActive =
      (filter === "type" && STATE.chips.type === val) ||
      (filter === "access" && STATE.chips.access === val);

    cb.checked = Boolean(isActive);
  });
}

function initLiveSearchAndFilters() {
  const input    = dom("#searchInput");
  const searchBtn = dom("#searchBtn");
  const clearBtn  = dom("#clearBtn");
  const chips     = dom("#searchFilters");

  // ============================================================
  // FILTER TOGGLES — modifiers only
  // ============================================================
  chips?.addEventListener("change", (e) => {
    const cb = e.target.closest("input[type='checkbox'][data-filter]");
    if (!cb) return;

    STARTUP_HERO = false;   // 🔑 lämna startup-state
    cancelDebounce();

    const filter = cb.dataset.filter;
    const value  = cb.dataset.value;

    if (filter === "type")   toggleChip({ type: value });
    if (filter === "access") toggleChip({ access: value });

    updateChipUI();
  });

  // ============================================================
  // LIVE SEARCH INPUT — SEARCH blir master
  // ============================================================
  input?.addEventListener("input", () => {
    STARTUP_HERO = false;   // 🔑 VIKTIGAST AV ALLT

    cancelDebounce();

    const text = input.value.trim();

    SEARCH_TIMER = setTimeout(() => {
      if (!text) {
        clearSearchMaster();   // går tillbaka till IDLE
        updateChipUI();
        return;
      }

      activateSearch({ text }); // 🔥 detta saknades tidigare
      updateChipUI();
    }, 300);
  });

  // ============================================================
  // SEARCH BUTTON / ENTER — instant search
  // ============================================================
  const triggerSearch = () => {
    if (!input) return;

    STARTUP_HERO = false;
    cancelDebounce();

    const text = input.value.trim();

    if (!text) {
      clearSearchMaster();
      updateChipUI();
      return;
    }

    activateSearch({ text });
    updateChipUI();
  };

  searchBtn && (searchBtn.onclick = triggerSearch);

  input?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") triggerSearch();
  });

  // ============================================================
  // CLEAR BUTTON — rensar SEARCH master
  // ============================================================
  clearBtn && (clearBtn.onclick = () => {
    cancelDebounce();
    STARTUP_HERO = false;

    if (input) input.value = "";
    clearSearchMaster();
    updateChipUI();
  });

  updateChipUI();
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
    displayAddress = trimmed.includes(",") ? trimmed.split(",")[0] + "…" : trimmed;
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
          ${s.website ? `<a href="${s.website}" target="_blank" rel="noopener" class="visit-website" data-store-id="${s.id}">Visit</a>` : "—"}
        </p>
      </div>

      <button class="reviews-btn">(${s.comment_count || 0})</button>
    </div>
  </article>`;
}

// ============================================================
// RENDER
// ============================================================
function renderCards(list) {
  const grid = dom("#storeGrid");
  if (!grid) return;

  grid.innerHTML = (list || []).map(cardHTML).join("");

  grid.querySelectorAll(".store-card").forEach((el) => {
    VIEW_OBSERVER.observe(el);
  });

  grid.querySelectorAll(".store-card").forEach((c) => {
    c.addEventListener("click", (e) => {
      if (e.target.closest("a")) return;
      openModal(c.dataset.storeId);
    });
  });
}

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
  return String(store.access || "").toLowerCase() === String(access).toLowerCase();
}

function applyFrontendFilters(rows, snapshot) {
  return (rows || []).filter((s) => {
    return (
      matchesType(s, snapshot.type) &&
      matchesAccess(s, snapshot.access)
    );
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
// MODAL SYSTEM
// ============================================================
const modal = dom("#storeModal");
const closeBtn = dom(".modal-close");
const backdrop = dom(".modal-backdrop");

let CURRENT_STORE = null;

async function openModal(id) {
  const storeId = Number(id);
  if (!storeId) return;

  CURRENT_STORE = storeId;

  const { data } = await supabase
    .from("stores_frontend_public_v4")
    .select("*")
    .eq("id", storeId)
    .single();

  if (!data) return;

  fillModal(data);
  loadComments(storeId);
  loadUserRating(storeId);

  modal?.classList.remove("hidden");
}

function closeModal() {
  modal?.classList.add("hidden");
}

closeBtn?.addEventListener("click", closeModal);
backdrop?.addEventListener("click", closeModal);

function fillModal(s) {
  dom("#modalImg").src = getPhotoUrl(s);
  dom("#modalName").textContent = s.name;
  dom("#modalFlag").src = getFlagUrl(s) || "";
  dom("#modalLocation").textContent = `${s.city || ""}, ${s.country || ""}`;

  dom("#modalAddress").textContent = s.address || "—";
  dom("#modalPhone").textContent = s.phone || "—";

  const w = dom("#modalWebsite");
  if (s.website) {
    w.href = s.website;
    w.style.display = "inline";
  } else {
    w.style.display = "none";
  }

  dom("#modalBadges").innerHTML = buildBadges(s);
  dom("#modalStars").innerHTML = buildStars(s.rating_avg, s.rating_count);
}

// ============================================================
// RATINGS
// ============================================================
const starPicker = dom("#modalStarPicker");
const ratingSendBtn = dom("#modalSendRating");
let USER_TEMP_RATING = 0;

function highlightStars(count) {
  if (!starPicker) return;
  starPicker.querySelectorAll("span").forEach((s, i) => {
    s.textContent = i < count ? "★" : "☆";
  });
}

starPicker?.querySelectorAll("span").forEach((star) => {
  star.addEventListener("mouseenter", () => highlightStars(star.dataset.val));
  star.addEventListener("mouseleave", () => highlightStars(USER_TEMP_RATING));
  star.addEventListener("click", () => {
    USER_TEMP_RATING = Number(star.dataset.val);
    highlightStars(USER_TEMP_RATING);
  });
});

async function loadUserRating(store_id) {
  const userResp = await supabase.auth.getUser();
  const user = userResp.data.user;
  if (!user) return;

  const { data } = await supabase
    .from("ratings")
    .select("rating")
    .eq("store_id", store_id)
    .eq("user_id", user.id)
    .single();

  USER_TEMP_RATING = data?.rating || 0;
  highlightStars(USER_TEMP_RATING);
}

ratingSendBtn?.addEventListener("click", async () => {
  const rating = USER_TEMP_RATING;
  if (!rating) return alert("Select a rating first!");

  const userResp = await supabase.auth.getUser();
  const user = userResp.data.user;
  if (!user) return alert("Login required.");

  await supabase.from("ratings").upsert({
    store_id: CURRENT_STORE,
    user_id: user.id,
    rating,
  });

  loadModalStore();
});

async function loadModalStore() {
  const { data } = await supabase
    .from("stores_frontend_public_v4")
    .select("*")
    .eq("id", CURRENT_STORE)
    .single();

  if (data) fillModal(data);
}

// ============================================================
// COMMENTS
// ============================================================
const commentsBox = dom("#modalComments");
const commentInput = dom("#modalCommentInput");
const sendCommentBtn = dom("#modalSendComment");

async function loadComments(store_id) {
  const { data } = await supabase
    .from("store_comments")
    .select("*")
    .eq("store_id", store_id)
    .order("created_at", { ascending: false });

  if (!commentsBox) return;

  commentsBox.innerHTML = "";

  if (!data || !data.length) {
    commentsBox.innerHTML = "<p>No comments yet.</p>";
    return;
  }

  commentsBox.innerHTML = data
    .map(
      (c) => `
        <div class="comment">
          <p>${c.text}</p>
          <small>${new Date(c.created_at).toLocaleString()}</small>
        </div>`
    )
    .join("");
}

sendCommentBtn?.addEventListener("click", async () => {
  const text = commentInput.value.trim();
  if (!text) return;

  const userResp = await supabase.auth.getUser();
  const user = userResp.data.user;
  if (!user) return alert("Login required.");

  await supabase.from("store_comments").insert({
    store_id: CURRENT_STORE,
    user_id: user.id,
    text,
  });

  commentInput.value = "";
  loadComments(CURRENT_STORE);
});

// ============================================================
// WEBSITE CLICK ANALYTICS
// ============================================================
document.addEventListener("click", (e) => {
  const a = e.target.closest("a.visit-website");
  if (!a) return;

  const storeId = Number(a.dataset.storeId);
  if (!storeId) return;

  window.WCL_ANALYTICS.send("website_clicked", { store_id: storeId });
});

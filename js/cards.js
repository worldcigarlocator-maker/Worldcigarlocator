/* ============================================================
   WCL Analytics Client (V1) — frontend
   - session_hash
   - fire-and-forget event sender
   ============================================================ */

// 1) Var events ska skickas (Edge Function / endpoint)
// Byt till din riktiga ingest-endpoint när du har den.
const ANALYTICS_INGEST_URL = "https://gbxxoeplkzbhsvagnfsr.functions.supabase.co/analytics-ingest";

// 2) Session: 30 min idle → ny session
const SESSION_IDLE_MS = 30 * 60 * 1000;

function getOrCreateSession() {
  const now = Date.now();
  const raw = localStorage.getItem("wcl_session_v1");
  if (raw) {
    try {
      const s = JSON.parse(raw);
      if (s?.id && s?.t && (now - s.t) < SESSION_IDLE_MS) {
        s.t = now; // bump
        localStorage.setItem("wcl_session_v1", JSON.stringify(s));
        return s.id;
      }
    } catch {}
  }
  // ny session
  const id = crypto?.randomUUID ? crypto.randomUUID() : `${now}-${Math.random().toString(16).slice(2)}`;
  localStorage.setItem("wcl_session_v1", JSON.stringify({ id, t: now }));
  return id;
}

// 3) Dedup: 1 view per store per session
function hasViewedThisSession(storeId) {
  return localStorage.getItem(`wcl_viewed_v1:${getOrCreateSession()}:${storeId}`) === "1";
}
function markViewedThisSession(storeId) {
  localStorage.setItem(`wcl_viewed_v1:${getOrCreateSession()}:${storeId}`, "1");
}

// 4) Fire-and-forget sender (blockar aldrig UX)
function sendAnalyticsEvent(event_type, payload) {
  const body = JSON.stringify({
    event_type,
    timestamp: new Date().toISOString(),
    source: "frontend",
    actor_type: "anon",
    session_hash: getOrCreateSession(),
    ...payload
  });

  // fetch keepalive (stabilt i Safari)
  try {
    fetch(ANALYTICS_INGEST_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
      credentials: "omit"
    }).catch(() => {});
  } catch {}
}


// ============================================================
// EXPOSE ANALYTICS (DEBUG / GLOBAL ACCESS)
// ============================================================
window.WCL_ANALYTICS = {
  send: sendAnalyticsEvent
};

/* ============================================================
   3A — store_viewed (viewport impression, 1x per session/store)
   ============================================================ */

const VIEW_OBSERVER = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;

    const el = entry.target;
    const storeId = el?.dataset?.storeId;
    if (!storeId) continue;

    // Dedup per session/store
    if (hasViewedThisSession(storeId)) {
      VIEW_OBSERVER.unobserve(el);
      continue;
    }

    // Markera direkt så vi inte dubbelräknar
    markViewedThisSession(storeId);

    // plocka geo från dataset (sätts när du renderar card)
    const payload = {
      store_id: Number(storeId),
      country: el.dataset.country || null,
      city: el.dataset.city || null,
      continent: el.dataset.continent || null
    };

    sendAnalyticsEvent("store_viewed", payload);

    // Vi behöver bara första view
    VIEW_OBSERVER.unobserve(el);
  }
}, {
  // 40% synligt = räknas som view (lagom strict)
  threshold: 0.4
});



// ============================================================
// CARDS.JS — WCL FRONTEND (STABLE + LIVE SEARCH + FILTER CHIPS)
// Single pipeline: FILTER_STATE -> runSearch() -> fetch -> frontend filter -> render
// ============================================================

import { supabase, resolveStoreImage } from "./globals.js";


// 🔢 COUNT HELPERS (isolated, no UI logic)
async function fetchApprovedCount(continent) {
  const { data, error } = await supabase.rpc(
    "count_approved_by_continent",
    { p_continent: continent }
  );

  if (error) {
    console.error("Count RPC error", error);
    return null;
  }

  return data?.[0]?.count ?? 0;
}



// ============================================================
// CONFIG
// ============================================================
const FALLBACK_IMAGE = "images/store.jpg";
const dom = (sel) => document.querySelector(sel);

// ============================================================
// RACE / REQUEST CONTROL (prevents "locks" + wrong "not found")
// ============================================================
let RUN_SEQ = 0;           // increases for every runSearch call
let ACTIVE_REQUEST = 0;    // increases for every backend fetch

// ============================================================
// DOM READY
// ============================================================
let DOM_READY = false;
document.addEventListener("DOMContentLoaded", () => {
  DOM_READY = true;
  initAutocomplete();
  initLiveSearchAndFilters(); // ✅ enables live-search + chips
});

// ============================================================
// CANONICAL FILTER STATE & MASTER CONTROLLER (WCL)
// ============================================================

export const MASTER = { ... };

let MASTER_MODE = MASTER.IDLE;

const STATE = { ... };

// ------------------------------------------------------------
// TEMP BRIDGE — legacy UI helpers expect FILTER_STATE
// ------------------------------------------------------------
const FILTER_STATE = {
  get continent() { return STATE.location.continent; },
  get country()   { return STATE.location.country; },
  get state()     { return STATE.location.state; },
  get city()      { return STATE.location.city; },

  get search()    { return STATE.search.text; },

  get type()      { return STATE.chips.type; },
  get access()    { return STATE.chips.access; }
};


// ------------------------------------------------------------
// INTERNAL HELPERS (private)
// ------------------------------------------------------------
function clearLocation() {
  STATE.location.continent = null;
  STATE.location.country = null;
  STATE.location.state = null;
  STATE.location.city = null;
}

function clearSearch() {
  STATE.search.text = "";
}

function snapshotState() {
  return {
    master: MASTER_MODE,
    location: { ...STATE.location },
    search: { ...STATE.search },
    chips: { ...STATE.chips },
  };
}

// ------------------------------------------------------------
// PUBLIC API — ENDA SÄTTET ATT ÄNDRA FILTER
// ------------------------------------------------------------

// 🔍 SEARCH becomes master
export function activateSearch({ text = "" } = {}) {
  MASTER_MODE = MASTER.SEARCH;
  clearLocation();
  STATE.search.text = text;
  runSearch();
}

// 📍 LOCATION becomes master (from sidebar)
export function activateLocation(next) {
  MASTER_MODE = MASTER.LOCATION;
  clearSearch();

  STATE.location.continent = next?.continent ?? null;
  STATE.location.country   = next?.country   ?? null;
  STATE.location.state     = next?.state     ?? null;
  STATE.location.city      = next?.city      ?? null;

  runSearch();
}

// 🧩 Chips — modifiers only (never change master)
export function toggleChip({ type, access }) {
  if (type !== undefined) {
    STATE.chips.type = STATE.chips.type === type ? null : type;
  }
  if (access !== undefined) {
    STATE.chips.access = STATE.chips.access === access ? null : access;
  }
  runSearch();
}

// ❌ Clear search (only meaningful if search is master)
export function clearSearchMaster() {
  if (MASTER_MODE === MASTER.SEARCH) {
    clearSearch();
    MASTER_MODE = MASTER.IDLE;
    runSearch();
  }
}

// ❌ Clear location (optional, future)
export function clearLocationMaster() {
  if (MASTER_MODE === MASTER.LOCATION) {
    clearLocation();
    MASTER_MODE = MASTER.IDLE;
    runSearch();
  }
}

// ------------------------------------------------------------
// READ-ONLY ACCESS FOR runSearch()
// ------------------------------------------------------------
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
  const arr = Array.isArray(store.types) ? store.types.map((t) => String(t).toLowerCase()) : [];

  if (arr.includes("store"))  badges.push(`<span class="badge badge-store">Store</span>`);
  if (arr.includes("lounge")) badges.push(`<span class="badge badge-lounge">Lounge</span>`);

  const A = String(store.access || "").trim().toLowerCase();
  if (A === "public") {
    badges.push(`<span class="badge badge-access badge-access-public">PUBLIC</span>`);
  } else if (A) {
    badges.push(`<span class="badge badge-access">${A.toUpperCase()}</span>`);
  }

  return badges.join(" ");
}

// ============================================================
// PHOTO URL — DEBUG VERSION (STEGET FÖRE FIX)
// ============================================================
function getPhotoUrl(store) {
  console.log("🖼️ PHOTO DEBUG", {
    id: store.id,
    photo_reference: store.photo_reference,
    photo_url: store.photo_url,
    photo_cdn_url: store.photo_cdn_url,
  });

  // 1️⃣ Helig: manuellt satt CDN-bild
  if (store.photo_cdn_url) {
    return store.photo_cdn_url;
  }

  // 2️⃣ Äldre direkt-URL (om den finns kvar i DB)
  if (store.photo_url) {
    return store.photo_url;
  }

  // 3️⃣ Google Places via proxy (som FÖRR)
  if (store.photo_reference) {
    return `${supabase.functions.url}/photo-proxy?photo_reference=${encodeURIComponent(
      store.photo_reference
    )}&maxwidth=800`;
  }

  // 4️⃣ Fallback
  return FALLBACK_IMAGE;
}


// ============================================================
// RESET HERO
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
// FILTER TOKEN PARSER (power input: "london members lounge")
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

    // type tokens
    if (t === "store" || t === "stores") { type = "store"; continue; }
    if (t === "lounge" || t === "lounges") { type = "lounge"; continue; }

    // access tokens
    if (t === "public") { access = "public"; continue; }
    if (t === "member" || t === "members") { access = "members"; continue; }

    keep.push(t0);
  }

  return { text: keep.join(" ").trim(), type, access };
}

// ============================================================
// CHIP UI
// ============================================================
function updateChipUI() {
  const box = dom("#searchFilters");
  if (!box) return;

  box.querySelectorAll(".chip").forEach((btn) => {
    const filter = btn.dataset.filter;
    const val = btn.dataset.value;

    const isActive =
      (filter === "type" && FILTER_STATE.type === val) ||
      (filter === "access" && FILTER_STATE.access === val);

    btn.classList.toggle("active", !!isActive);
  });
}

// ============================================================
// LIVE SEARCH + FILTER CHIPS (debounced + safe)
// ============================================================
let SEARCH_TIMER = null;

function cancelDebounce() {
  if (SEARCH_TIMER) {
    clearTimeout(SEARCH_TIMER);
    SEARCH_TIMER = null;
  }
}

function hasAnyFilterActive() {
  return !!(
    FILTER_STATE.search ||
    FILTER_STATE.type ||
    FILTER_STATE.access ||
    FILTER_STATE.continent ||
    FILTER_STATE.country ||
    FILTER_STATE.state ||
    FILTER_STATE.city
  );
}

function initLiveSearchAndFilters() {
  const input = dom("#searchInput");
  const searchBtn = dom("#searchBtn");
  const clearBtn = dom("#clearBtn");
  const chips = dom("#searchFilters");

  // --- chips (toggle on/off) ---
  chips?.addEventListener("click", (e) => {
    const btn = e.target.closest(".chip");
    if (!btn) return;

    cancelDebounce();

    const filter = btn.dataset.filter; // "type" | "access"
    const value = btn.dataset.value;   // "store"/"lounge"/"public"/"members"

    if (filter === "type") {
      FILTER_STATE.type = (FILTER_STATE.type === value) ? null : value;
    } else if (filter === "access") {
      FILTER_STATE.access = (FILTER_STATE.access === value) ? null : value;
    }

    updateChipUI();

    if (!hasAnyFilterActive()) {
      resetToHero();
      return;
    }

    runSearch(); // ✅ immediate + safe
  });

  // --- live input (debounced) ---
  input?.addEventListener("input", () => {
    const raw = input.value;

    const parsed = parseSearchTokens(raw);

    // sync tokens into state
    if (parsed.type) FILTER_STATE.type = parsed.type;
    if (parsed.access) FILTER_STATE.access = parsed.access;

    FILTER_STATE.search = parsed.text;
    updateChipUI();

    cancelDebounce();
    SEARCH_TIMER = setTimeout(() => {
      if (!hasAnyFilterActive()) {
        resetToHero();
        return;
      }
      runSearch();
    }, 350);
  });

  // --- explicit search button / Enter (instant) ---
  const triggerInstant = () => {
    if (!input) return;

    cancelDebounce();

    const parsed = parseSearchTokens(input.value);
    if (parsed.type) FILTER_STATE.type = parsed.type;
    if (parsed.access) FILTER_STATE.access = parsed.access;

    FILTER_STATE.search = parsed.text;
    updateChipUI();

    if (!hasAnyFilterActive()) {
      resetToHero();
      return;
    }

    runSearch();
  };

  if (searchBtn) searchBtn.onclick = triggerInstant;

  input?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") triggerInstant();
  });

  // --- clear (clears search+chips, keeps sidebar location) ---
  if (clearBtn) {
    clearBtn.onclick = () => {
      cancelDebounce();

      if (input) input.value = "";

      FILTER_STATE.search = "";
      FILTER_STATE.type = null;
      FILTER_STATE.access = null;

      updateChipUI();

      // if location is selected -> show that location (not hero)
      if (FILTER_STATE.continent || FILTER_STATE.country || FILTER_STATE.state || FILTER_STATE.city) {
        runSearch();
      } else {
        resetToHero();
      }
    };
  }

  updateChipUI();
}

// ============================================================
// PUBLIC API FOR SIDEBAR (location filters)
// ============================================================
export function setLocationFilter(next) {
  cancelDebounce();

  FILTER_STATE.continent = next?.continent ?? null;
  FILTER_STATE.country = next?.country ?? null;
  FILTER_STATE.state = next?.state ?? null;
  FILTER_STATE.city = next?.city ?? null;
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
 <article
  class="store-card"
  data-store-id="${s.id}"
  data-country="${s.country || ""}"
  data-city="${s.city || ""}"
  data-continent="${s.continent || ""}"
>

    <img
      src="${img}"
      class="store-img"
      alt="${displayName}"
      loading="lazy"
      onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}'"
    />
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
              ? `<a href="${s.website}"
                   target="_blank"
                   rel="noopener"
                   class="visit-website"
                   data-store-id="${s.id}">
                   Visit
                 </a>`
              : "—"
          }
        </p>
      </div>

      <button class="reviews-btn">(${s.comment_count || 0})</button>
    </div>
   </article>
`;
}


// ============================================================
// RENDER
// ============================================================
function renderCards(list) {
  const grid = dom("#storeGrid");
  if (!grid) return;

  grid.innerHTML = (list || []).map(cardHTML).join("");

  // 👁️ Analytics: store_viewed (1x per session/store)
  grid.querySelectorAll(".store-card").forEach((el) => {
    VIEW_OBSERVER.observe(el);
  });

  // 🖱️ Öppna modal (men inte vid länk-klick)
  grid.querySelectorAll(".store-card").forEach((c) => {
    c.addEventListener("click", (e) => {
      if (e.target.closest("a")) return;
      openModal(c.dataset.id);
    });
  });
}

// Backwards compat (if something imports renderStores)
export function renderStores(list) {
  renderCards(list);
}

// ============================================================
// FRONTEND FILTERING (type/access + powerful text match)
// ============================================================
function normalize(s) {
  return (s || "").toString().toLowerCase().trim();
}

function matchesText(store, text) {
  const q = normalize(text);
  if (!q) return true;

  // power search across multiple fields (frontend)
  const hay = [
    store.name,
    store.city,
    store.state,
    store.country,
    store.continent,
    store.address,
    store.website,
  ].map(normalize).join(" | ");

  return hay.includes(q);
}

function matchesType(store, type) {
  if (!type) return true;
  const types = Array.isArray(store.types) ? store.types.map((t) => normalize(t)) : [];
  return types.includes(type);
}

function matchesAccess(store, access) {
  if (!access) return true;
  return normalize(store.access) === access;
}

function applyFrontendFilters(rows, snapshot) {
  return (rows || []).filter((s) => {
    return (
      matchesText(s, snapshot.search) &&
      matchesType(s, snapshot.type) &&
      matchesAccess(s, snapshot.access)
    );
  });
}

// ============================================================
// LOAD STORES (RPC) — PURE FETCH (no DOM writes)
// ============================================================
export async function loadStores(filters = {}, search = null) {
  if (!DOM_READY) {
    await new Promise((res) => document.addEventListener("DOMContentLoaded", res, { once: true }));
  }

  ACTIVE_REQUEST++;
  const reqId = ACTIVE_REQUEST;

  const { data, error } = await supabase.rpc("search_stores_v1", {
    p_q: search || null,
    p_continent: filters?.continent || null,
    p_country: filters?.country || null,
    p_state: filters?.state || null,
    p_city: filters?.city || null,
  });

  // if a newer fetch started, ignore this one
  if (reqId !== ACTIVE_REQUEST) return null;

  if (error) {
    console.error(error);
    return { error };
  }

  return { data: data || [] };
}

// ============================================================
// RUN SEARCH (SINGLE OWNER OF MAIN COUNT + HEADING)
// ============================================================
export async function runSearch() {
  if (!DOM_READY) {
    await new Promise((res) =>
      document.addEventListener("DOMContentLoaded", res, { once: true })
    );
  }

  RUN_SEQ++;
  const runId = RUN_SEQ;

  // Snapshot = deterministisk input
  const snapshot = {
    continent: FILTER_STATE.continent,
    country: FILTER_STATE.country,
    state: FILTER_STATE.state,
    city: FILTER_STATE.city,
    search: FILTER_STATE.search,
    type: FILTER_STATE.type,
    access: FILTER_STATE.access,
  };

  const heading = dom("#resultHeading");
  const heroImage = dom("#heroImage");
  const heroText = dom("#heroText");

  // ---- UI reset ----
  heroImage && (heroImage.style.display = "none");
  heroText && (heroText.style.display = "none");

  if (heading) {
    heading.textContent = "Loading…";
    heading.style.display = "block";
  }

  renderCards([]); // tom grid under load

  // ---- Fetch stores (PURE DATA) ----
  const resp = await loadStores(
    {
      continent: snapshot.continent,
      country: snapshot.country,
      state: snapshot.state,
      city: snapshot.city,
    },
    null // frontend search gäller
  );

  if (runId !== RUN_SEQ) return;
  if (!resp || resp.error) {
    heading && (heading.textContent = "Error loading results");
    return;
  }

  const rows = resp.data || [];
  const filtered = applyFrontendFilters(rows, snapshot);

  // ============================================================
  // ✅ MAIN COUNT DECISION TREE (THE IMPORTANT PART)
  // ============================================================

  let finalCount = 0;

  const hasSearch =
    !!snapshot.search || !!snapshot.type || !!snapshot.access;

  const hasLocation =
    !!snapshot.continent ||
    !!snapshot.country ||
    !!snapshot.state ||
    !!snapshot.city;

  if (hasSearch) {
    // 1️⃣ SEARCH OVERRIDES EVERYTHING
    finalCount = filtered.length;

  } else if (hasLocation) {
    // 2️⃣ HIERARCHY CONTEXT (sidebar navigation)
    finalCount = rows.length;

  } else {
    // 3️⃣ DEFAULT = TOTAL APPROVED (GLOBAL VALUE)
    // OBS: backend-RPC, stabil siffra
    const { data } = await supabase.rpc("count_all_approved_v1");
    finalCount = data?.[0]?.count ?? rows.length;
  }

  // ---- Render ----
  if (!filtered.length) {
    heading && (heading.textContent = "0 results");
    renderCards([]);
    return;
  }

  renderCards(filtered);

  if (heading) {
    heading.textContent = `${finalCount} results`;
    heading.style.display = "block";
  }
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

  const badgeBox = dom("#modalBadges");
  badgeBox.innerHTML = buildBadges(s);

  dom("#modalStars").innerHTML = buildStars(s.rating_avg, s.rating_count);
}

// ============================================================
// RATING SYSTEM
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
// COMMENTS SYSTEM
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
document.addEventListener("click", (e) => {
  const a = e.target.closest("a.visit-website");
  if (!a) return;

  const storeId = Number(a.dataset.storeId);
  if (!storeId) return;

  window.WCL_ANALYTICS.send("website_clicked", {
    store_id: storeId
  });
});


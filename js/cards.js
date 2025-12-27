// ============================================================
// CARDS.JS — WCL FRONTEND (STABLE + LIVE SEARCH + FILTER CHIPS)
// ============================================================

import { supabase } from "./globals.js";

// ============================================================
// CONFIG
// ============================================================
const FALLBACK_IMAGE = "images/store.jpg";

// Helper selectors
const dom = (sel) => document.querySelector(sel);

// Cancel-token for safe loading
let ACTIVE_REQUEST = 0;

// Track DOM ready
let DOM_READY = false;
document.addEventListener("DOMContentLoaded", () => {
  DOM_READY = true;
  initAutocomplete();
  initLiveSearchAndFilters(); // ✅ enables live-search + chips
});

// ============================================================
// GLOBAL FILTER STATE — SINGLE SOURCE OF TRUTH
// ============================================================
const FILTER_STATE = {
  continent: null,
  country: null,
  city: null,
  // free text (after token parsing)
  search: "",
  // chips
  type: null,   // "store" | "lounge" | null
  access: null, // "public" | "members" | null
};

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
  const arr = Array.isArray(store.types) ? store.types.map((t) => t.toLowerCase()) : [];

  if (arr.includes("store"))  badges.push(`<span class="badge badge-store">Store</span>`);
  if (arr.includes("lounge")) badges.push(`<span class="badge badge-lounge">Lounge</span>`);

  const A = (store.access || "").trim().toLowerCase();
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
  if (store.photo_reference) {
    return `${supabase.functions.url}/photo-proxy?photo_reference=${encodeURIComponent(
      store.photo_reference
    )}&maxwidth=800`;
  }
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

function initLiveSearchAndFilters() {
  const input = dom("#searchInput");
  const searchBtn = dom("#searchBtn");
  const clearBtn = dom("#clearBtn");
  const chips = dom("#searchFilters");

  // --- chips (toggle on/off) ---
  chips?.addEventListener("click", (e) => {
    const btn = e.target.closest(".chip");
    if (!btn) return;

    const filter = btn.dataset.filter;   // "type" | "access"
    const value = btn.dataset.value;     // "store"/"lounge"/"public"/"members"

    if (filter === "type") {
      FILTER_STATE.type = (FILTER_STATE.type === value) ? null : value;
    }
    if (filter === "access") {
      FILTER_STATE.access = (FILTER_STATE.access === value) ? null : value;
    }

    updateChipUI();
    runSearch(); // ✅ immediate
  });

  // --- live input (debounced) ---
  input?.addEventListener("input", () => {
    const raw = input.value;

    // parse power tokens from input
    const parsed = parseSearchTokens(raw);

    // If user typed tokens, sync them into state (but don't override chips if already set)
    if (parsed.type) FILTER_STATE.type = parsed.type;
    if (parsed.access) FILTER_STATE.access = parsed.access;

    FILTER_STATE.search = parsed.text;
    updateChipUI();

    clearTimeout(SEARCH_TIMER);
    SEARCH_TIMER = setTimeout(() => {
      // if nothing selected and no text -> show hero
      if (!FILTER_STATE.search && !FILTER_STATE.continent && !FILTER_STATE.country && !FILTER_STATE.city) {
        resetToHero();
        return;
      }
      runSearch();
    }, 350);
  });

  // --- explicit search button / Enter (instant, no debounce) ---
  const triggerInstant = () => {
    if (!input) return;

    const parsed = parseSearchTokens(input.value);
    if (parsed.type) FILTER_STATE.type = parsed.type;
    if (parsed.access) FILTER_STATE.access = parsed.access;

    FILTER_STATE.search = parsed.text;
    updateChipUI();

    if (!FILTER_STATE.search && !FILTER_STATE.continent && !FILTER_STATE.country && !FILTER_STATE.city) {
      resetToHero();
      return;
    }

    runSearch();
  };

  searchBtn && (searchBtn.onclick = triggerInstant);
  input?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") triggerInstant();
  });

  // --- clear ---
  clearBtn && (clearBtn.onclick = () => {
    if (input) input.value = "";
    FILTER_STATE.search = "";
    FILTER_STATE.type = null;
    FILTER_STATE.access = null;
    updateChipUI();
    resetToHero();
  });

  updateChipUI();
}

// ============================================================
// PUBLIC API FOR SIDEBAR (location filters)
// ============================================================
export function setLocationFilter({ continent = null, country = null, city = null } = {}) {
  FILTER_STATE.continent = continent;
  FILTER_STATE.country = country;
  FILTER_STATE.city = city;
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
    <article class="store-card" data-id="${s.id}">
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
            ${s.website ? `<a href="${s.website}" target="_blank">Visit</a>` : "—"}
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

  grid.innerHTML = list.map(cardHTML).join("");

  grid.querySelectorAll(".store-card").forEach((c) => {
    c.addEventListener("click", () => openModal(c.dataset.id));
  });
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
    store.country,
    store.continent,
    store.address,
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

function applyFrontendFilters(rows) {
  return (rows || []).filter((s) => {
    return (
      matchesText(s, FILTER_STATE.search) &&
      matchesType(s, FILTER_STATE.type) &&
      matchesAccess(s, FILTER_STATE.access)
    );
  });
}

// ============================================================
// RUN SEARCH (single entry point)
// ============================================================
export async function runSearch() {
  // fetch by location from backend, then filter locally by q/type/access
  const rows = await loadStores(
    {
      continent: FILTER_STATE.continent,
      country: FILTER_STATE.country,
      city: FILTER_STATE.city,
    },
    null // IMPORTANT: we do frontend text match for "superpower" now
  );

  if (!rows) return;

  const filtered = applyFrontendFilters(rows);

  const heading = dom("#resultHeading");
  const heroImage = dom("#heroImage");
  const heroText = dom("#heroText");

  heroImage && (heroImage.style.display = "none");
  heroText && (heroText.style.display = "none");

  if (!filtered.length) {
    heading && (heading.textContent = "No results found.", heading.style.display = "block");
    renderCards([]);
    return;
  }

  renderCards(filtered);
  heading && (heading.textContent = `${filtered.length} results`, heading.style.display = "block");
}

// ============================================================
// LOAD STORES (RPC) — returns rows (no rendering here)
// ============================================================
export async function loadStores(filters = {}, search = null) {
  if (!DOM_READY) {
    document.addEventListener("DOMContentLoaded", () => loadStores(filters, search), { once: true });
    return null;
  }

  ACTIVE_REQUEST++;
  const reqId = ACTIVE_REQUEST;

  const grid = dom("#storeGrid");
  const heading = dom("#resultHeading");
  const heroImage = dom("#heroImage");
  const heroText = dom("#heroText");

  heroImage && (heroImage.style.display = "none");
  heroText && (heroText.style.display = "none");

  heading && (heading.textContent = "Loading…", heading.style.display = "block");
  grid && (grid.innerHTML = "");

  const { data, error } = await supabase.rpc("search_stores_v1", {
    p_q: search,
    p_continent: filters?.continent || null,
    p_country: filters?.country || null,
    p_city: filters?.city || null,
  });

  if (reqId !== ACTIVE_REQUEST) return null;

  if (error) {
    console.error(error);
    heading && (heading.textContent = "Error loading locations.", heading.style.display = "block");
    return null;
  }

  return data || [];
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

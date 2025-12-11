// ============================================================
// CARDS.JS — PREMIUM WCL FRONTEND
// With Modal, Rating, Comments & Safe Async Loading
// ============================================================

import { supabase } from "./globals.js";

// Track DOM ready
let DOM_READY = false;
document.addEventListener("DOMContentLoaded", () => {
  DOM_READY = true;
  initAutocomplete();
  initLiveSearch();
});

// Helper selector
const dom = (sel) => document.querySelector(sel);

// Cancel-token for safe loading:
let ACTIVE_REQUEST = 0;

/* ------------------------------------------------------------
   FLAG HELPER (Safe + lowercase)
------------------------------------------------------------ */
function getFlagUrl(store) {
  const iso = store.country_iso2?.toLowerCase();
  if (!iso) return null;
  return `assets/flags/${iso}.svg`;
}

/* ------------------------------------------------------------
   BADGE BUILDER — Identical to Backend Logic
------------------------------------------------------------ */
function buildBadges(store) {
  const badges = [];

  const arr = Array.isArray(store.types)
    ? store.types.map((t) => t.toLowerCase())
    : [];

  if (arr.includes("store")) {
    badges.push(`<span class="badge badge-store">Store</span>`);
  }

  if (arr.includes("lounge")) {
    badges.push(`<span class="badge badge-lounge">Lounge</span>`);
  }

  const A = (store.access || "").trim().toLowerCase();

  if (A === "public") {
    badges.push(
      `<span class="badge badge-access badge-access-public">PUBLIC</span>`
    );
  } else if (A) {
    badges.push(
      `<span class="badge badge-access">${A.toUpperCase()}</span>`
    );
  }

  return badges.join(" ");
}

/* ------------------------------------------------------------
   FALLBACK IMAGE
------------------------------------------------------------ */
const FALLBACK_IMAGE = "images/store.jpg";

/* ------------------------------------------------------------
   RESET HERO
------------------------------------------------------------ */
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

/* ------------------------------------------------------------
   STARS BUILDER
------------------------------------------------------------ */
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

/* ------------------------------------------------------------
   HIGHLIGHT HELPER (for search terms)
------------------------------------------------------------ */
function highlight(text, words) {
  if (!text || !words || !words.length) return text;
  let result = text;

  words.forEach((w) => {
    if (!w) return;
    const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escaped})`, "gi");
    result = result.replace(regex, `<mark class="hl">$1</mark>`);
  });

  return result;
}

/* ------------------------------------------------------------
   AUTOCOMPLETE STATE + INIT
------------------------------------------------------------ */
let AC_BOX = null;

function initAutocomplete() {
  AC_BOX = dom("#autocomplete");
  if (!AC_BOX) return;

  document.addEventListener("click", (e) => {
    if (!AC_BOX) return;
    const input = dom("#searchInput");
    if (!AC_BOX.contains(e.target) && e.target !== input) {
      AC_BOX.classList.add("hidden");
    }
  });
}

function updateAutocomplete(list, words) {
  if (!AC_BOX) return;
  if (!words || words.length === 0) {
    AC_BOX.classList.add("hidden");
    return;
  }

  const lower = words.map((w) => w.toLowerCase());
  const matches = [];

  for (const s of list) {
    const hay = `${s.name || ""} ${s.city || ""} ${s.country || ""} ${
      Array.isArray(s.types) ? s.types.join(" ") : ""
    }`.toLowerCase();

    if (lower.every((w) => hay.includes(w))) {
      matches.push({
        id: s.id,
        label: s.name || "Unnamed",
        sub: s.city || s.country || "",
      });
    }
    if (matches.length >= 12) break;
  }

  if (!matches.length) {
    AC_BOX.classList.add("hidden");
    return;
  }

  AC_BOX.innerHTML = matches
    .map(
      (m) => `
      <div class="ac-item" data-name="${m.label}">
        <strong>${m.label}</strong><br>
        <small>${m.sub}</small>
      </div>
    `
    )
    .join("");

  AC_BOX.classList.remove("hidden");

  AC_BOX.querySelectorAll(".ac-item").forEach((item) => {
    item.addEventListener("click", () => {
      const v = item.dataset.name;
      const input = dom("#searchInput");
      if (input) input.value = v;
      AC_BOX.classList.add("hidden");
      loadStores({}, v);
    });
  });
}

/* ------------------------------------------------------------
   LIVE SEARCH INIT
------------------------------------------------------------ */
function initLiveSearch() {
  const input = dom("#searchInput");
  if (!input) return;

  let t;
  input.addEventListener("input", () => {
    const val = input.value.trim();
    clearTimeout(t);
    t = setTimeout(() => {
      loadStores({}, val);
    }, 250);
  });
}

/* ------------------------------------------------------------
   CARD HTML
------------------------------------------------------------ */
function cardHTML(s) {
  const img = s.photo_final_url || FALLBACK_IMAGE;
  const flag = getFlagUrl(s);

  let displayAddress = "—";
  if (s.address) {
    const trimmed = s.address.trim();
    displayAddress = trimmed.includes(",")
      ? trimmed.split(",")[0] + "…"
      : trimmed;
  }

  return `
    <article class="store-card" data-id="${s.id}">
      <img src="${img}" class="store-img" alt="${s.name}"
           onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}'" />

      <div class="store-body">

        <h3 class="store-title">${s.name || "Unnamed"}</h3>

        <div class="badge-row">
          ${buildBadges(s)}
        </div>

        ${buildStars(s.rating_avg, s.rating_count)}

        <div class="locrow">
          <div class="loc-top">
            ${flag ? `<img src="${flag}" class="flag" />` : ""}
            <span>${[s.continent, s.country].filter(Boolean).join(", ")}</span>
          </div>
          <p class="city-label">${s.city || ""}</p>
        </div>

        <div class="infoblock">
          <p class="info-row"><strong>Address:</strong> <span>${displayAddress}</span></p>
          <p class="info-row"><strong>Phone:</strong> <span>${s.phone || "—"}</span></p>
          <p class="info-row"><strong>Website:</strong>
            ${
              s.website
                ? `<a href="${s.website}" target="_blank">Visit</a>`
                : "<span>—</span>"
            }
          </p>
        </div>

        <button class="reviews-btn">
          Comments (${s.comment_count || 0})
        </button>

      </div>
    </article>`;
}

/* ------------------------------------------------------------
   RENDER CARDS
------------------------------------------------------------ */
function renderCards(list) {
  const grid = dom("#storeGrid");
  if (!grid) return;

  grid.innerHTML = list.map(cardHTML).join("");

  grid.querySelectorAll(".store-card").forEach((c) => {
    c.addEventListener("click", () => openModal(c.dataset.id));
  });
}

export function renderStores(list) {
  renderCards(list);
}

/* ------------------------------------------------------------
   LOAD STORES — ADVANCED SEARCH ENGINE (FULL POWER, SAFE)
------------------------------------------------------------ */
export async function loadStores(filters = {}, search = "") {
  if (!DOM_READY) {
    document.addEventListener(
      "DOMContentLoaded",
      () => loadStores(filters, search),
      { once: true }
    );
    return;
  }

  ACTIVE_REQUEST++;
  const reqId = ACTIVE_REQUEST;

  const grid = dom("#storeGrid");
  const heading = dom("#resultHeading");
  const heroImage = dom("#heroImage");
  const heroText = dom("#heroText");

  if (heroImage) heroImage.style.display = "none";
  if (heroText) heroText.style.display = "none";

  if (heading) {
    heading.style.display = "block";
    heading.textContent = "Loading…";
  }
  if (grid) grid.innerHTML = "";

  let query = supabase.from("stores_frontend_public_v4").select("*");

  // 1) Normalize search
  search = (search || "").toLowerCase().trim();

  const synonyms = {
    usa: "united states",
    us: "united states",
    uk: "united kingdom",
    españa: "spain",
    espanja: "spain",
    ldh: "la casa del habano",
    nyc: "new york",
    sverige: "sweden",
  };

  if (synonyms[search]) search = synonyms[search];

  const words = search.split(/\s+/).filter(Boolean);

  // 2) Prepare filters
  const textFilters = [];
  let wantStore = false;
  let wantLounge = false;
  let wantMembers = false;
  let wantPublic = false;

  let cmdCity = null;
  let cmdType = null;
  let cmdAccess = null;

  for (const word of words) {
    // Commands
    if (word.startsWith("city:")) {
      cmdCity = word.replace("city:", "").trim();
      continue;
    }
    if (word.startsWith("type:")) {
      cmdType = word.replace("type:", "").trim();
      continue;
    }
    if (word.startsWith("access:")) {
      cmdAccess = word.replace("access:", "").trim();
      continue;
    }

    // Badge triggers
    if (["store", "butik", "shop"].includes(word)) {
      wantStore = true;
      continue;
    }
    if (["lounge", "bar"].includes(word)) {
      wantLounge = true;
      continue;
    }
    if (["members", "member", "medlem"].includes(word)) {
      wantMembers = true;
      continue;
    }
    if (["public", "öppen"].includes(word)) {
      wantPublic = true;
      continue;
    }

    // Text search
    textFilters.push(`
      name.ilike.%${word}%,
      city.ilike.%${word}%,
      country.ilike.%${word}%,
      address.ilike.%${word}%,
      continent.ilike.%${word}%
    `);
  }

  // 3) Multiword text search
  if (textFilters.length > 0) {
    query = query.or(textFilters.join(","));
  }

  // 4) TYPES (badges)
  if (wantStore) query = query.contains("types", ["store"]);
  if (wantLounge) query = query.contains("types", ["lounge"]);

  // 5) ACCESS badges
  if (wantMembers) query = query.eq("access", "members");
  if (wantPublic) query = query.eq("access", "public");

  // 6) Command filters
  if (cmdCity) query = query.ilike("city", `%${cmdCity}%`);
  if (cmdType) query = query.contains("types", [cmdType]);
  if (cmdAccess) query = query.eq("access", cmdAccess);

  // 7) UI dropdown filters
  if (filters.continent) query = query.eq("continent", filters.continent);
  if (filters.country) query = query.eq("country", filters.country);
  if (filters.city) query = query.eq("city", filters.city);

  // 8) Safe fetch
  let data, error;
  try {
    const resp = await query.order("created_at", { ascending: false });
    data = resp.data;
    error = resp.error;
  } catch (e) {
    if (e.name === "AbortError") return;
    console.error("Unexpected Supabase error:", e);
    if (heading) heading.textContent = "Error loading locations.";
    return;
  }

  if (reqId !== ACTIVE_REQUEST) return;

  if (error) {
    console.error(error);
    if (heading) heading.textContent = "Error loading locations.";
    return;
  }

  if (!data || data.length === 0) {
    if (heading) heading.textContent = "No results found.";
    return;
  }

  // 9) Highlight + autocomplete
  const hlWords = words;

  const highlighted = data.map((s) => ({
    ...s,
    name: highlight(s.name, hlWords),
    city: highlight(s.city, hlWords),
    country: highlight(s.country, hlWords),
  }));

  renderCards(highlighted);
  updateAutocomplete(data, hlWords);

  if (reqId !== ACTIVE_REQUEST) return;
  if (heading) heading.textContent = `${data.length} results`;
}

/* ============================================================
   ===================  MODAL SYSTEM ==========================
   ============================================================ */

const modal = dom("#storeModal");
const closeBtn = dom(".modal-close");
const backdrop = dom(".modal-backdrop");

let CURRENT_STORE = null;

/* ------------------------------------------------------------
   OPEN MODAL
------------------------------------------------------------ */
async function openModal(id) {
  CURRENT_STORE = id;

  const { data } = await supabase
    .from("stores_frontend_public_v4")
    .select("*")
    .eq("id", id)
    .single();

  if (!data) return;

  fillModal(data);
  loadComments(id);
  loadUserRating(id);

  modal.classList.remove("hidden");
}

/* ------------------------------------------------------------
   CLOSE MODAL
------------------------------------------------------------ */
function closeModal() {
  modal.classList.add("hidden");
}
closeBtn?.addEventListener("click", closeModal);
backdrop?.addEventListener("click", closeModal);

/* ------------------------------------------------------------
   FILL MODAL
------------------------------------------------------------ */
function fillModal(s) {
  dom("#modalImg").src = s.photo_final_url || FALLBACK_IMAGE;
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

/* ============================================================
   ================  RATING SYSTEM  ============================
   ============================================================ */
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
  star.addEventListener("mouseenter", () =>
    highlightStars(star.dataset.val)
  );
  star.addEventListener("mouseleave", () =>
    highlightStars(USER_TEMP_RATING)
  );
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

/* ============================================================
   ====================  COMMENTS SYSTEM =======================
   ============================================================ */
const commentsBox = dom("#modalComments");
const commentInput = dom("#modalCommentInput");
const sendCommentBtn = dom("#modalSendComment");

async function loadComments(store_id) {
  const { data } = await supabase
    .from("comments")
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

  await supabase.from("comments").insert({
    store_id: CURRENT_STORE,
    user_id: user.id,
    text,
  });

  commentInput.value = "";
  loadComments(CURRENT_STORE);
});

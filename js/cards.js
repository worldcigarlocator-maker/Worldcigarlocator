// ============================================================
// CARDS.JS — WCL FRONTEND (STABLE, SINGLE SOURCE)
// Cards render + loadStores RPC + modal/comments/ratings
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
});

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
// AUTOCOMPLETE (UI only, does not trigger search)
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

export function renderStores(list) {
  renderCards(list);
}

// ============================================================
// LOAD STORES (ONLY WAY TO FILL GRID)
// ============================================================
export async function loadStores(filters = {}, search = "") {
  if (!DOM_READY) {
    document.addEventListener("DOMContentLoaded", () => loadStores(filters, search), {
      once: true,
    });
    return;
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
    q: search || null,
    continent: filters?.continent || null,
    country: filters?.country || null,
    city: filters?.city || null,
  });

  if (reqId !== ACTIVE_REQUEST) return;

  if (error) {
    console.error(error);
    heading && (heading.textContent = "Error loading locations.");
    return;
  }

  if (!data || !data.length) {
    heading && (heading.textContent = "No results found.");
    return;
  }

  renderCards(data);
  heading && (heading.textContent = `${data.length} results`);
}

// ============================================================
// MODAL SYSTEM
// ============================================================
const modal = dom("#storeModal");
const closeBtn = dom(".modal-close");
const backdrop = dom(".modal-backdrop");

let CURRENT_STORE = null;

// OPEN MODAL
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

// CLOSE MODAL
function closeModal() {
  modal?.classList.add("hidden");
}
closeBtn?.addEventListener("click", closeModal);
backdrop?.addEventListener("click", closeModal);

// FILL MODAL
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

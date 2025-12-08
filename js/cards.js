// ============================================================
// CARDS.JS — PREMIUM WCL FRONTEND
// With Modal, Rating, Comments & Safe Async Loading
// ============================================================

import { supabase } from "./globals.js";

// Track DOM ready
let DOM_READY = false;
document.addEventListener("DOMContentLoaded", () => (DOM_READY = true));

// Helper selectors
const dom = (sel) => document.querySelector(sel);

// Cancel-token for safe loading:
let ACTIVE_REQUEST = 0;

/* ------------------------------------------------------------
   FLAG HELPER
------------------------------------------------------------ */
function getFlagUrl(store) {
  if (!store.country_iso2) return null;
  return `assets/flags/${store.country_iso2.toLowerCase()}.svg`;
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
   CARD HTML
------------------------------------------------------------ */
function cardHTML(s) {
  const img = s.photo_final_url || FALLBACK_IMAGE;
  const flag = getFlagUrl(s);

  // Address truncation (clean)
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
          ${s.type ? `<span class="badge blue">${s.type}</span>` : ""}
          ${s.access ? `<span class="badge access ${s.access}">${s.access}</span>` : ""}
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
            ${s.website ? `<a href="${s.website}" target="_blank">Visit</a>` : "<span>—</span>"}
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

  // Attach modal opener
  grid.querySelectorAll(".store-card").forEach((c) => {
    c.addEventListener("click", () => openModal(c.dataset.id));
  });
}

export function renderStores(list) {
  renderCards(list);
}

/* ------------------------------------------------------------
   LOAD STORES (SAFE WITH ACTIVE_REQUEST)
------------------------------------------------------------ */
export async function loadStores(filters = {}, search = "") {
  if (!DOM_READY) {
    document.addEventListener("DOMContentLoaded", () => loadStores(filters, search), { once: true });
    return;
  }

  ACTIVE_REQUEST++;       // ← New request
  const reqId = ACTIVE_REQUEST;

  const grid = dom("#storeGrid");
  const heading = dom("#resultHeading");
  const heroImage = dom("#heroImage");
  const heroText = dom("#heroText");

  heroImage.style.display = "none";
  heroText.style.display = "none";

  heading.style.display = "block";
  heading.textContent = "Loading…";

  grid.innerHTML = "";

  // Build query
  let query = supabase.from("stores_frontend_public_v4").select("*");

  if (search) {
    query = query.or(`
      name.ilike.%${search}%,
      city.ilike.%${search}%,
      country.ilike.%${search}%
    `);
  }

  if (filters.continent) query = query.eq("continent", filters.continent);
  if (filters.country)   query = query.eq("country", filters.country);
  if (filters.city)      query = query.eq("city", filters.city);

  const { data, error } = await query.order("created_at", { ascending: false });

  // Check cancellation
  if (reqId !== ACTIVE_REQUEST) return;

  if (error) {
    console.error(error);
    heading.textContent = "Error loading locations.";
    return;
  }

  if (!data.length) {
    heading.textContent = "No results found.";
    return;
  }

  renderCards(data);

  if (reqId !== ACTIVE_REQUEST) return;
  heading.textContent = `${data.length} results`;
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
closeBtn.addEventListener("click", closeModal);
backdrop.addEventListener("click", closeModal);

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

  // Website
  const w = dom("#modalWebsite");
  if (s.website) {
    w.href = s.website;
    w.style.display = "inline";
  } else {
    w.style.display = "none";
  }

  // Badges
  const badgeBox = dom("#modalBadges");
  badgeBox.innerHTML = "";
  if (s.type) badgeBox.innerHTML += `<span class="badge blue">${s.type}</span>`;
  if (s.access)
    badgeBox.innerHTML += `<span class="badge access ${s.access}">${s.access}</span>`;

  dom("#modalStars").innerHTML = buildStars(s.rating_avg, s.rating_count);
}

/* ============================================================
   ================  RATING SYSTEM  ============================
   ============================================================ */
const starPicker = dom("#modalStarPicker");
const ratingSendBtn = dom("#modalSendRating");
let USER_TEMP_RATING = 0;

function highlightStars(count) {
  starPicker.querySelectorAll("span").forEach((s, i) => {
    s.textContent = i < count ? "★" : "☆";
  });
}

starPicker.querySelectorAll("span").forEach((star) => {
  star.addEventListener("mouseenter", () => highlightStars(star.dataset.val));
  star.addEventListener("mouseleave", () => highlightStars(USER_TEMP_RATING));
  star.addEventListener("click", () => {
    USER_TEMP_RATING = Number(star.dataset.val);
    highlightStars(USER_TEMP_RATING);
  });
});

async function loadUserRating(store_id) {
  const user = (await supabase.auth.getUser()).data.user;
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

ratingSendBtn.addEventListener("click", async () => {
  const rating = USER_TEMP_RATING;
  if (!rating) return alert("Select a rating first!");

  const user = (await supabase.auth.getUser()).data.user;
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

  commentsBox.innerHTML = "";

  if (!data.length) {
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

sendCommentBtn.addEventListener("click", async () => {
  const text = commentInput.value.trim();
  if (!text) return;

  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return alert("Login required.");

  await supabase.from("comments").insert({
    store_id: CURRENT_STORE,
    user_id: user.id,
    text,
  });

  commentInput.value = "";
  loadComments(CURRENT_STORE);
});

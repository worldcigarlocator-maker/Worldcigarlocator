// ============================================================
// CARDS.JS — PREMIUM VERSION FOR WCL FRONTEND + MODAL SUPPORT
// ============================================================

import { supabase } from "./globals.js";

let DOM_READY = false;
document.addEventListener("DOMContentLoaded", () => (DOM_READY = true));

/* ------------------------------------------------------------
   DOM HELPER
------------------------------------------------------------ */
const dom = (sel) => document.querySelector(sel);

/* ------------------------------------------------------------
   FLAG HELPER (ISO2 → /assets/flags/xx.svg)
------------------------------------------------------------ */
function getFlagUrl(store) {
  if (!store.country_iso2) return null;
  return `assets/flags/${store.country_iso2.toLowerCase()}.svg`;
}

/* ------------------------------------------------------------
   RESET TO HERO
------------------------------------------------------------ */
export function resetToHero() {
  if (!DOM_READY) {
    document.addEventListener("DOMContentLoaded", resetToHero, { once: true });
    return;
  }

  dom("#storeGrid").innerHTML = "";
  dom("#resultHeading").style.display = "none";
  dom("#heroImage").style.display = "block";
  dom("#heroText").style.display = "block";
}

/* ------------------------------------------------------------
   STARS BUILDER
------------------------------------------------------------ */
function buildStars(avg, count) {
  const v = Number(avg) || 0;
  const filled = "★".repeat(Math.round(v));
  const empty = "☆".repeat(5 - Math.round(v));

  return `
    <div class="stars-row">
      <span class="stars">${filled}${empty}</span>
      <span class="rating-count">(${count || 0})</span>
    </div>
  `;
}

/* ------------------------------------------------------------
   OPEN MODAL (CORE FUNCTION)
------------------------------------------------------------ */
function openModal(store) {
  const modal = dom("#storeModal");
  if (!modal) return;

  // Fill modal content
  dom("#modalImg").src = store.photo_final_url || "images/store.jpg";
  dom("#modalName").textContent = store.name || "Unnamed";

  // Badges
  dom("#modalBadges").innerHTML = `
    ${store.type ? `<span class="badge blue">${store.type}</span>` : ""}
    ${store.access ? `<span class="badge access ${store.access}">${store.access}</span>` : ""}
  `;

  // Stars
  dom("#modalStars").innerHTML = buildStars(store.rating_avg, store.rating_count);

  // Location
  const flag = getFlagUrl(store);
  dom("#modalFlag").src = flag || "";
  dom("#modalLocation").textContent =
    `${store.city || ""}, ${store.country || ""}`;

  // Full info
  dom("#modalAddress").textContent = store.address || "—";
  dom("#modalPhone").textContent = store.phone || "—";

  const websiteEl = dom("#modalWebsite");
  if (store.website) {
    websiteEl.href = store.website;
    websiteEl.style.opacity = 1;
  } else {
    websiteEl.href = "#";
    websiteEl.style.opacity = 0.3;
  }

  // Comments placeholder
  dom("#modalComments").innerHTML = `
    <p style="opacity:.7;">Loading comments…</p>
  `;

  // Load comments from Supabase
  loadComments(store.id);

  // OPEN
  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden"; // lock scroll

  // Save active store for rating/comments
  modal.dataset.storeId = store.id;
}

/* ------------------------------------------------------------
   CLOSE MODAL
------------------------------------------------------------ */
function closeModal() {
  const modal = dom("#storeModal");
  if (!modal) return;

  modal.classList.add("hidden");
  document.body.style.overflow = "auto";
}

document.addEventListener("click", (e) => {
  if (e.target.classList.contains("modal-backdrop")) closeModal();
  if (e.target.classList.contains("modal-close")) closeModal();
});

/* ESC to close */
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

/* ------------------------------------------------------------
   LOAD COMMENTS
------------------------------------------------------------ */
async function loadComments(storeId) {
  const box = dom("#modalComments");
  if (!storeId) return;

  const { data, error } = await supabase
    .from("store_comments")
    .select("*")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });

  if (error) {
    box.innerHTML = `<p style="color:#f66;">Error loading comments</p>`;
    return;
  }

  if (!data || data.length === 0) {
    box.innerHTML = `<p style="opacity:.7;">No comments yet.</p>`;
    return;
  }

  box.innerHTML = data
    .map((c) => `<p>• ${c.text}</p>`)
    .join("");
}

/* ------------------------------------------------------------
   CARD HTML
------------------------------------------------------------ */
function cardHTML(s) {

  const FALLBACK_IMAGE = "images/store.jpg";
  const img = s.photo_final_url || FALLBACK_IMAGE;
  const flag = getFlagUrl(s);

  // Truncate address after first comma
  let displayAddress = "—";
  if (s.address) {
    const trimmed = s.address.trim();
    if (trimmed.includes(",")) {
      displayAddress = trimmed.split(",")[0] + "…";
    } else {
      displayAddress = trimmed;
    }
  }

  const type = s.type?.trim() || null;
  const access = s.access?.trim() || null;

  return `
    <article class="store-card" data-id="${s.id}">

      <img src="${img}" class="store-img" alt="${s.name}"
           onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}'" />

      <div class="store-body">

        <h3 class="store-title">${s.name || "Unnamed"}</h3>

        <div class="badge-row">
          ${type ? `<span class="badge blue">${type}</span>` : ""}
          ${access ? `<span class="badge access ${access.toLowerCase()}">${access}</span>` : ""}
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
          <p class="info-row"><strong>Address:</strong> ${displayAddress}</p>
          <p class="info-row"><strong>Phone:</strong> ${s.phone || "—"}</p>
          <p class="info-row">
            <strong>Website:</strong>
            ${s.website ? `<a href="${s.website}" target="_blank">Visit</a>` : "—"}
          </p>
        </div>

        <button class="reviews-btn">
          Comments (${s.comment_count || 0})
        </button>

      </div>
    </article>
  `;
}

/* ------------------------------------------------------------
   RENDER CARDS + ATTACH CLICK HANDLERS
------------------------------------------------------------ */
function renderCards(list) {
  const grid = dom("#storeGrid");
  if (!grid) return;

  grid.innerHTML = list.map(cardHTML).join("");

  // Click handlers
  grid.querySelectorAll(".store-card").forEach((card) => {
    card.addEventListener("click", () => {
      const id = card.dataset.id;
      const store = list.find((s) => String(s.id) === String(id));
      if (store) openModal(store);
    });
  });
}

/* ------------------------------------------------------------
   PUBLIC EXPORT
------------------------------------------------------------ */
export function renderStores(list) {
  renderCards(list);
}

/* ------------------------------------------------------------
   LOAD STORES
------------------------------------------------------------ */
export async function loadStores(filters = {}, search = "") {

  if (!DOM_READY) {
    document.addEventListener("DOMContentLoaded", () =>
      loadStores(filters, search), { once: true }
    );
    return;
  }

  const grid = dom("#storeGrid");
  const heading = dom("#resultHeading");

  dom("#heroImage").style.display = "none";
  dom("#heroText").style.display = "none";

  heading.style.display = "block";
  heading.textContent = "Loading…";

  grid.innerHTML = "";

  let query = supabase.from("stores_frontend_public_v4").select("*");

  if (search) {
    query = query.or(`
      name.ilike.%${search}%,
      city.ilike.%${search}%,
      country.ilike.%${search}%
    `);
  }

  if (filters.continent) query = query.eq("continent", filters.continent);
  if (filters.country) query = query.eq("country", filters.country);
  if (filters.city) query = query.eq("city", filters.city);

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    heading.textContent = "Error loading locations.";
    return;
  }

  if (!data || data.length === 0) {
    heading.textContent = "No results found.";
    return;
  }

  renderCards(data);
  heading.textContent = `${data.length} results`;
}

// ============================================================
// CARDS.JS — PREMIUM VERSION FOR WCL FRONTEND (with MODAL)
// ============================================================

import { supabase } from "./globals.js";

let DOM_READY = false;
document.addEventListener("DOMContentLoaded", () => (DOM_READY = true));

/* ------------------------------------------------------------
   DOM HELPER
------------------------------------------------------------ */
const dom = (sel) => document.querySelector(sel);

/* ------------------------------------------------------------
   FLAG HELPER
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

  const grid = dom("#storeGrid");
  const heading = dom("#resultHeading");
  const heroImage = dom("#heroImage");
  const heroText = dom("#heroText");

  if (grid) grid.innerHTML = "";
  if (heading) {
    heading.style.display = "none";
    heading.textContent = "";
  }

  if (heroImage) heroImage.style.display = "block";
  if (heroText) heroText.style.display = "block";
}

/* ------------------------------------------------------------
   STAR BUILDER
------------------------------------------------------------ */
function buildStars(avg, count) {
  const val = Number(avg) || 0;
  const filled = "★".repeat(Math.round(val));
  const empty = "☆".repeat(5 - Math.round(val));

  return `
    <div class="stars-row">
      <span class="stars">${filled}${empty}</span>
      <span class="rating-count">(${count || 0})</span>
    </div>
  `;
}

/* ------------------------------------------------------------
   MODAL OPEN
------------------------------------------------------------ */
function openStoreModal(store) {
  const modal = dom("#storeModal");
  if (!modal) return;

  // Elements
  dom("#modalImg").src = store.photo_final_url || "images/store.jpg";
  dom("#modalName").textContent = store.name || "Unnamed location";

  // Badges
  dom("#modalBadges").innerHTML = `
    ${store.type ? `<span class="badge blue">${store.type}</span>` : ""}
    ${store.access ? `<span class="badge access ${store.access.toLowerCase()}">${store.access}</span>` : ""}
  `;

  // Stars
  dom("#modalStars").innerHTML = buildStars(store.rating_avg, store.rating_count);

  // Location
  dom("#modalFlag").src = getFlagUrl(store) || "";
  dom("#modalLocation").textContent =
    `${store.city || ""}, ${store.country || ""} (${store.continent || ""})`;

  // Info
  dom("#modalAddress").textContent = store.address || "—";
  dom("#modalPhone").textContent = store.phone || "—";

  if (store.website) {
    dom("#modalWebsite").href = store.website;
    dom("#modalWebsite").style.display = "inline";
  } else {
    dom("#modalWebsite").style.display = "none";
  }

  // Comments placeholder (later dynamic)
  dom("#modalComments").innerHTML = `<p class="loading">Loading comments…</p>`;

  // Show modal
  modal.classList.remove("hidden");
  document.body.classList.add("no-scroll");
}

/* ------------------------------------------------------------
   MODAL CLOSE
------------------------------------------------------------ */
function setupModalClose() {
  const modal = dom("#storeModal");
  if (!modal) return;

  dom(".modal-close").addEventListener("click", () => {
    modal.classList.add("hidden");
    document.body.classList.remove("no-scroll");
  });

  dom(".modal-backdrop").addEventListener("click", () => {
    modal.classList.add("hidden");
    document.body.classList.remove("no-scroll");
  });
}

document.addEventListener("DOMContentLoaded", setupModalClose);

/* ------------------------------------------------------------
   CARD HTML
------------------------------------------------------------ */
function cardHTML(store) {
  const FALLBACK_IMAGE = "images/store.jpg";
  const img = store.photo_final_url || FALLBACK_IMAGE;
  const flag = getFlagUrl(store);

  // Address truncated
  let displayAddress = "—";
  if (store.address) {
    const trimmed = store.address.trim();
    displayAddress = trimmed.includes(",")
      ? trimmed.split(",")[0] + "…"
      : trimmed;
  }

  return `
    <article class="store-card" data-store='${JSON.stringify(store)}'>

      <img src="${img}" class="store-img" alt="${store.name}"
        onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}'" />

      <div class="store-body">

        <h3 class="store-title">${store.name || "Unnamed"}</h3>

        <div class="badge-row">
          ${store.type ? `<span class="badge blue">${store.type}</span>` : ""}
          ${store.access ? `<span class="badge access ${store.access.toLowerCase()}">${store.access}</span>` : ""}
        </div>

        ${buildStars(store.rating_avg, store.rating_count)}

        <div class="locrow">
          <div class="loc-top">
            ${flag ? `<img src="${flag}" class="flag" />` : ""}
            <span>${[store.continent, store.country].filter(Boolean).join(", ")}</span>
          </div>
          <p class="city-label">${store.city || ""}</p>
        </div>

        <div class="infoblock">
          <p class="info-row"><strong>Address:</strong> <span>${displayAddress}</span></p>
          <p class="info-row"><strong>Phone:</strong> <span>${store.phone || "—"}</span></p>
          <p class="info-row">
            <strong>Website:</strong>
            ${store.website ? `<a href="${store.website}" target="_blank">Visit</a>` : "—"}
          </p>
        </div>

        <button class="reviews-btn">Comments (${store.comment_count || 0})</button>

      </div>
    </article>
  `;
}

/* ------------------------------------------------------------
   RENDER CARDS
------------------------------------------------------------ */
function renderCards(list) {
  const grid = dom("#storeGrid");
  if (!grid) return;

  grid.innerHTML = list.map(cardHTML).join("");

  // Make every card clickable
  grid.querySelectorAll(".store-card").forEach((card) => {
    const store = JSON.parse(card.dataset.store);

    card.addEventListener("click", () => {
      openStoreModal(store);
    });
  });
}

/* ------------------------------------------------------------
   EXPORT FOR main.js
------------------------------------------------------------ */
export function renderStores(list) {
  renderCards(list);
}

/* ------------------------------------------------------------
   LOAD STORES
------------------------------------------------------------ */
export async function loadStores(filters = {}, search = "") {
  if (!DOM_READY) {
    document.addEventListener("DOMContentLoaded", () => loadStores(filters, search), { once: true });
    return;
  }

  const grid = dom("#storeGrid");
  const heading = dom("#resultHeading");
  const showAll = dom("#showAllBtn");
  const heroImage = dom("#heroImage");
  const heroText = dom("#heroText");

  if (heroImage) heroImage.style.display = "none";
  if (heroText) heroText.style.display = "none";

  if (heading) {
    heading.style.display = "block";
    heading.textContent = "Loading…";
  }

  if (grid) grid.innerHTML = "";
  if (showAll) showAll.style.display = "none";

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
    console.error("LOAD ERROR:", error);
    if (heading) heading.textContent = "Error loading locations.";
    return;
  }

  if (!data || data.length === 0) {
    if (heading) heading.textContent = "No results found.";
    return;
  }

  renderCards(data);

  if (heading) heading.textContent = `${data.length} results`;

  if (showAll) {
    const filtered = search || Object.keys(filters).length > 0;
    showAll.style.display = filtered ? "inline-block" : "none";
    showAll.onclick = resetToHero;
  }
}

// ============================================================
// CARDS.JS — PREMIUM VERSION FOR WCL FRONTEND
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
   STAR BUILDER — ALWAYS 5 STARS + (count)
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
   CARD HTML — PREMIUM STRUCTURE
------------------------------------------------------------ */
function cardHTML(s) {
  const FALLBACK_IMAGE = "images/store.jpg";
  const img = s.photo_final_url || FALLBACK_IMAGE;
  const flag = getFlagUrl(s);

  // Normalize badges (fix so STORE, Lounge, Shop etc always appear)
  const type = s.type?.trim() || null;
  const access = s.access?.trim() || null;

  return `
    <article class="store-card">

      <!-- IMAGE -->
      <img
        src="${img}"
        class="store-img"
        alt="${s.name}"
        onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}'"
      />

      <div class="store-body">

        <!-- TITLE -->
        <h3 class="store-title">${s.name || "Unnamed location"}</h3>

        <!-- BADGES -->
        <div class="badge-row">
          ${type ? `<span class="badge blue">${type}</span>` : ""}
          ${access ? `<span class="badge access ${access.toLowerCase()}">${access}</span>` : ""}
        </div>

        <!-- STARS -->
        ${buildStars(s.rating_avg, s.rating_count)}

        <!-- LOCATION -->
        <div class="locrow" data-city="${s.city || ''}">
          <div class="loc-top">
            ${flag ? `<img src="${flag}" class="flag" alt="${s.country}" />` : ""}
            <span>${[s.continent, s.country].filter(Boolean).join(", ")}</span>
          </div>
          <p class="city-label">${s.city || ""}</p>
        </div>

        <!-- INFO BLOCK -->
        <div class="infoblock">

          <!-- Address: trunkeras till 1 rad -->
          <p class="info-row">
            <strong>Address:</strong>
            <span>${(s.address || "—")}</span>
          </p>

          <!-- Phone: FULLT nummer -->
          <p class="info-row">
            <strong>Phone:</strong>
            <span>${s.phone || "—"}</span>
          </p>

          <!-- Website -->
          <p class="info-row">
            <strong>Website:</strong>
            ${
              s.website
                ? `<a href="${s.website}" target="_blank" rel="noopener">Visit</a>`
                : "<span>—</span>"
            }
          </p>

        </div>

        <!-- COMMENTS BUTTON -->
        <button class="reviews-btn">
          Comments (${s.comment_count || 0})
        </button>

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
    document.addEventListener(
      "DOMContentLoaded",
      () => loadStores(filters, search),
      { once: true }
    );
    return;
  }

  const grid = dom("#storeGrid");
  const heading = dom("#resultHeading");
  const showAll = dom("#showAllBtn");
  const heroImage = dom("#heroImage");
  const heroText = dom("#heroText");

  // Hide hero on results
  if (heroImage) heroImage.style.display = "none";
  if (heroText) heroText.style.display = "none";

  if (heading) {
    heading.style.display = "block";
    heading.textContent = "Loading…";
  }

  if (grid) grid.innerHTML = "";
  if (showAll) showAll.style.display = "none";

  // Build query
  let query = supabase.from("stores_frontend_public_v4").select("*");

  // Search support
  if (search) {
    query = query.or(`
      name.ilike.%${search}%,
      city.ilike.%${search}%,
      country.ilike.%${search}%
    `);
  }

  // Filters
  if (filters.continent) query = query.eq("continent", filters.continent);
  if (filters.country) query = query.eq("country", filters.country);
  if (filters.city) query = query.eq("city", filters.city);

  // Order newest first
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

  // Render cards
  renderCards(data);

  if (heading) heading.textContent = `${data.length} results`;

  // Enable Show All if filtered or searched
  if (showAll) {
    const filtered = search || Object.keys(filters).length > 0;
    showAll.style.display = filtered ? "inline-block" : "none";
    showAll.onclick = resetToHero;
  }
}

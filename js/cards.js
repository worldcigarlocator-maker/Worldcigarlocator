// ============================================================
// CARDS.JS — PREMIUM VERSION (matches cards.css)
// For table: stores_frontend_public_v4
// ============================================================

import { supabase } from "./globals.js";

let DOM_READY = false;
document.addEventListener("DOMContentLoaded", () => (DOM_READY = true));

/* ------------------------------------------------------------
   DOM HELPER
------------------------------------------------------------ */
function dom(sel) {
  return document.querySelector(sel);
}

/* ------------------------------------------------------------
   FLAG (ISO2) — matches your /assets/flags/xx.svg
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
  const showAllBtn = dom("#showAllBtn");
  const hero = dom("#heroImage");
  const heroText = dom("#heroText");

  if (grid) grid.innerHTML = "";
  if (heading) {
    heading.style.display = "none";
    heading.textContent = "";
  }
  if (showAllBtn) showAllBtn.style.display = "none";

  if (hero) hero.style.display = "block";
  if (heroText) heroText.style.display = "block";
}

/* ------------------------------------------------------------
   PREMIUM CARD HTML (matches cards.css)
------------------------------------------------------------ */
function cardHTML(s) {
  const FALLBACK_PHOTO = "images/store.jpg";
  const imgSrc = s.photo_final_url || FALLBACK_PHOTO;
  const flagUrl = getFlagUrl(s);

  // Badges
  const typeBadge = s.type
    ? `<span class="badge blue">${s.type}</span>`
    : "";

  const accessBadge = s.access
    ? `<span class="badge access ${s.access}">${s.access}</span>`
    : "";

const avg = Number(s.rating_avg) || 0;
const count = Number(s.rating_count) || 0;

const filled = "★".repeat(Math.round(avg));
const empty = "☆".repeat(5 - Math.round(avg));

const stars = `
  <span class="stars">${filled}${empty}</span>
  <span class="rating-count">(${count})</span>
`;

  return `
    <article class="store-card">
      <img
        src="${imgSrc}"
        class="store-img"
        alt="${s.name}"
        onerror="this.onerror=null;this.src='${FALLBACK_PHOTO}';"
      />

      <div class="store-body">

        <h3 class="store-title">${s.name || "Unnamed location"}</h3>

        <div class="badge-row">
          ${typeBadge}
          ${accessBadge}
        </div>

        <div class="stars">${stars}</div>

        <div class="locrow">
          <div class="loc-top">
            ${
              flagUrl
                ? `<img src="${flagUrl}" class="flag" alt="${s.country}" />`
                : ""
            }
            <span>${[s.city, s.country].filter(Boolean).join(", ")}</span>
          </div>
          <p class="continent-label">${s.continent || ""}</p>
        </div>

        <div class="infoblock">
          <p class="info-row">${s.address || ""}</p>
          <p class="info-row">${s.phone || ""}</p>
          <p class="info-row">
            ${
              s.website
                ? `<a href="${s.website}" target="_blank" rel="noopener">Visit website</a>`
                : ""
            }
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
   RENDER STORES
------------------------------------------------------------ */
function renderCards(list) {
  const grid = dom("#storeGrid");
  if (!grid) return;
  grid.innerHTML = list.map(cardHTML).join("");
}

/* ------------------------------------------------------------
   EXPORTED WRAPPER (NEEDED FOR main.js)
------------------------------------------------------------ */
export function renderStores(list) {
  renderCards(list);
}

/* ------------------------------------------------------------
   LOAD STORES (v4 TABLE)
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
  const showAllBtn = dom("#showAllBtn");
  const hero = dom("#heroImage");
  const heroText = dom("#heroText");

  // Hide hero
  if (hero) hero.style.display = "none";
  if (heroText) heroText.style.display = "none";

  if (heading) {
    heading.style.display = "block";
    heading.textContent = "Loading…";
  }

  if (grid) grid.innerHTML = "";
  if (showAllBtn) showAllBtn.style.display = "none";

  // Query table
  let query = supabase.from("stores_frontend_public_v4").select("*");

  // Search
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

  const { data, error } = await query.order("created_at", {
    ascending: false,
  });

  if (error) {
    console.error("Load error:", error);
    heading.textContent = "Error loading stores.";
    return;
  }

  if (!data?.length) {
    heading.textContent = "No results found.";
    return;
  }

  // Render
  renderCards(data);

  heading.textContent = `${data.length} results`;

  // Show "Show All" button if filtered
  if (showAllBtn) {
    const filtered = search || Object.keys(filters).length > 0;
    showAllBtn.style.display = filtered ? "inline-block" : "none";
    showAllBtn.onclick = resetToHero;
  }
}

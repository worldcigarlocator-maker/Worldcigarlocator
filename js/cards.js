// ============================================================
// CARDS.JS — Premium Edition for stores_frontend_public_v4
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
   FLAG — ISO2 → /assets/flags/xx.svg
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
  if (heading) heading.style.display = "none";
  if (showAllBtn) showAllBtn.style.display = "none";

  if (hero) hero.style.display = "block";
  if (heroText) heroText.style.display = "block";
}

/* ------------------------------------------------------------
   RATING SYSTEM — filled + empty stars + count
------------------------------------------------------------ */
function renderStars(avg = 0, count = 0) {
  avg = Number(avg) || 0;
  count = Number(count) || 0;

  const filled = "★".repeat(Math.round(avg));
  const empty = "☆".repeat(5 - Math.round(avg));

  return `
    <div class="stars">
      ${filled}${empty}
      <span class="rating-count">(${count})</span>
    </div>
  `;
}

/* ------------------------------------------------------------
   CARD HTML
------------------------------------------------------------ */
function cardHTML(s) {
  const FALLBACK_PHOTO = "images/store.jpg";
  const imgSrc = s.photo_final_url || FALLBACK_PHOTO;
  const flagUrl = getFlagUrl(s);

  // badges
  const typeBadge = s.type
    ? `<span class="badge blue">${s.type}</span>`
    : "";

  const accessBadge = s.access
    ? `<span class="badge access ${s.access}">${s.access}</span>`
    : "";

  // rating
  const stars = renderStars(s.rating_avg, s.rating_count);

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

        ${stars}

        <div class="locrow">
          <div class="loc-top">
            ${flagUrl ? `<img src="${flagUrl}" class="flag" alt="${s.country}" />` : ""}
            <span>${[s.city, s.country].filter(Boolean).join(", ")}</span>
          </div>
          <p class="continent-label">${s.continent || ""}</p>
        </div>

        <div class="infoblock">
          <p class="info-row">
            <strong>Address:</strong> ${s.address || ""}
          </p>
          <p class="info-row">
            <strong>Phone:</strong> ${s.phone || ""}
          </p>
          <p class="info-row">
            <strong>Website:</strong>
            ${
              s.website
                ? `<a href="${s.website}" target="_blank" rel="noopener">Visit</a>`
                : "—"
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
   RENDER CARDS
------------------------------------------------------------ */
function renderCards(list) {
  const grid = dom("#storeGrid");
  if (!grid) return;
  grid.innerHTML = list.map(cardHTML).join("");
}

/* ------------------------------------------------------------
   EXPORTED WRAPPER
------------------------------------------------------------ */
export function renderStores(list) {
  renderCards(list);
}

/* ------------------------------------------------------------
   LOAD STORES — v4 TABLE
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

  // hide hero
  if (hero) hero.style.display = "none";
  if (heroText) heroText.style.display = "none";

  if (heading) {
    heading.style.display = "block";
    heading.textContent = "Loading…";
  }

  if (grid) grid.innerHTML = "";
  if (showAllBtn) showAllBtn.style.display = "none";

  // query
  let query = supabase.from("stores_frontend_public_v4").select("*");

  // search
  if (search) {
    query = query.or(`
      name.ilike.%${search}%,
      city.ilike.%${search}%,
      country.ilike.%${search}%
    `);
  }

  // filters
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

  // render results
  renderCards(data);

  heading.textContent = `${data.length} results`;

  // show “show all”
  if (showAllBtn) {
    const filtered = search || Object.keys(filters).length > 0;
    showAllBtn.style.display = filtered ? "inline-block" : "none";
    showAllBtn.onclick = resetToHero;
  }
}

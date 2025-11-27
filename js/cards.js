// js/cards.js
import { supabase } from "./globals.js";

/* ============================================================
   FALLBACK IMAGE
============================================================ */
const FALLBACK_PHOTO = "images/store.jpg";

/* ============================================================
   FLAG ALIASES
============================================================ */
const FLAG_ALIASES = {
  "united states": "united-states",
  "united states of america": "united-states",
  "usa": "united-states",
  "united kingdom": "united-kingdom",
  "uk": "united-kingdom",
  "czech republic": "czechia",
  "viet nam": "vietnam"
};

function getFlagSlug(country) {
  if (!country) return null;
  const raw = country.toLowerCase().trim();
  if (FLAG_ALIASES[raw]) return FLAG_ALIASES[raw];
  return raw.replaceAll(" ", "-");
}

/* ============================================================
   ⭐ RATING (Always 5 stars + count)
============================================================ */
function renderStars(avg, count) {
  const value = Number(avg) || 0;
  const rounded = Math.round(value);
  const filled = "★".repeat(rounded);
  const empty = "☆".repeat(5 - rounded);
  return `${filled}${empty} (${count || 0})`;
}

/* ============================================================
   RESET HERO VIEW
============================================================ */
export function resetToHero() {
  const grid = qs("#storeGrid");
const heading = qs("#resultHeading");
  const showAllBtn = qs("showAllBtn");
  const hero = qs("heroImage");
  const heroText = qs("heroText");

  if (grid) grid.innerHTML = "";
  if (heading) heading.style.display = "none";
  if (showAllBtn) showAllBtn.style.display = "none";
  if (hero) hero.style.display = "block";
  if (heroText) heroText.style.display = "block";
}

/* ============================================================
   RENDER STORE CARDS
============================================================ */
export function renderStores(list) {
  const grid = qs("storeGrid");
  if (!grid) return;

  grid.innerHTML = "";

  list.forEach((s) => {
    const card = document.createElement("article");
    card.className = "store-card";

    const imgSrc = s.photo_final_url || FALLBACK_PHOTO;
    const flagSlug = getFlagSlug(s.country);

    const typeBadge = s.type ? `<span class="badge blue">${s.type}</span>` : "";
    const accessBadge = s.access ? `<span class="badge access ${s.access}">${s.access}</span>` : "";

    card.innerHTML = `
      <img 
        src="${imgSrc}"
        class="store-img"
        alt="${s.name || "Cigar location"}"
        onerror="this.onerror=null;this.src='${FALLBACK_PHOTO}';"
      />

      <div class="store-body">

        <h3 class="store-title">${s.name || "Unnamed location"}</h3>

        <div class="badge-row">${typeBadge}${accessBadge}</div>

        <div class="stars">${renderStars(s.rating_avg, s.rating_count)}</div>

        <div class="locrow">
          <div class="loc-top">
            ${flagSlug ? `<img src="assets/flags/${flagSlug}.svg" class="flag" alt="">` : ""}
            <span>${[s.city, s.country].filter(Boolean).join(", ")}</span>
          </div>
          ${s.continent ? `<p class="continent-label">${s.continent}</p>` : ""}
        </div>

        <div class="infoblock">
          <p class="info-row"><strong>Address:</strong> ${s.address || "—"}</p>
          <p class="info-row"><strong>Phone:</strong> ${s.phone || "—"}</p>
          <p class="info-row"><strong>Website:</strong> 
            ${s.website ? `<a href="${s.website}" target="_blank">Visit</a>` : "—"}
          </p>
        </div>

        <button class="reviews-btn">Comments (${s.comment_count || 0})</button>
      </div>
    `;

    grid.appendChild(card);
  });
}

/* ============================================================
   LOAD STORES (v4)
============================================================ */
export async function loadStores(filters = {}, search = "") {
  const grid = qs("storeGrid");
  const heading = qs("resultHeading");

  heading.style.display = "block";
  heading.textContent = "Loading…";

  let query = supabase.from("stores_frontend_public_v4").select("*");

  if (search) {
    query = query.or(
      `name.ilike.%${search}%,city.ilike.%${search}%,country.ilike.%${search}%`
    );
  }

  if (filters.continent) query = query.eq("continent", filters.continent);
  if (filters.country) query = query.eq("country", filters.country);
  if (filters.city) query = query.eq("city", filters.city);

  const { data, error } = await query;

  if (error) {
    heading.textContent = "Error loading stores.";
    return;
  }

  if (!data?.length) {
    heading.textContent = "No results found.";
    return;
  }

  heading.textContent = `${data.length} results`;
  renderStores(data);
}

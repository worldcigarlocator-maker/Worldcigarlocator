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
  const grid = document.getElementById("storeGrid");
  const heading = document.getElementById("resultHeading");
  const showAllBtn = document.getElementById("showAllBtn");
  const hero = document.getElementById("heroImage");
  const heroText = document.getElementById("heroText");

  if (grid) grid.innerHTML = "";
  if (heading) {
    heading.style.display = "none";
    heading.textContent = "";
  }
  if (showAllBtn) showAllBtn.style.display = "none";
  if (hero) hero.style.display = "block";
  if (heroText) heroText.style.display = "block";
}

/* ============================================================
   RENDER STORE CARDS — PREMIUM DARK
============================================================ */
export function renderStores(list) {
  const grid = document.getElementById("storeGrid");
  if (!grid) return;
  grid.innerHTML = "";

  list.forEach((s) => {
    const card = document.createElement("article");
    card.className = "store-card";

    const imgSrc = s.photo_final_url || FALLBACK_PHOTO;
    const flagSlug = getFlagSlug(s.country);

    // Badges
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

        <!-- NAME -->
        <h3 class="store-title">${s.name || "Unnamed location"}</h3>

        <!-- BADGES -->
        <div class="badge-row">
          ${typeBadge}
          ${accessBadge}
        </div>

        <!-- ⭐ RATING -->
        <div class="stars">
          ${renderStars(s.rating_avg, s.rating_count)}
        </div>

        <!-- LOCATION -->
        <div class="locrow">
          <div class="loc-top">
            ${
              flagSlug
                ? `<img src="assets/flags/${flagSlug}.svg" class="flag" alt="${s.country}" />`
                : ""
            }
            <span>${[s.city, s.country].filter(Boolean).join(", ")}</span>
          </div>

          ${
            s.continent
              ? `<p class="continent-label">${s.continent}</p>`
              : ""
          }
        </div>

        <!-- INFO BLOCK -->
        <div class="infoblock">
          <p class="info-row"><strong>Address:</strong> ${s.address || "—"}</p>
          <p class="info-row"><strong>Phone:</strong> ${s.phone || "—"}</p>
          <p class="info-row">
            <strong>Website:</strong> 
            ${
              s.website
                ? `<a href="${s.website}" target="_blank" rel="noopener">Visit</a>`
                : "—"
            }
          </p>
        </div>

        <!-- COMMENTS BUTTON -->
        <button class="reviews-btn">
          Comments (${s.comment_count || 0})
        </button>

      </div>
    `;

    grid.appendChild(card);
  });
}

/* ============================================================
   LOAD STORES
============================================================ */
export async function loadStores(filters = {}, search = "") {
  const grid = document.getElementById("storeGrid");
  const heading = document.getElementById("resultHeading");
  const showAllBtn = document.getElementById("showAllBtn");

  const heroImg = document.getElementById("heroImage");
  const heroText = document.getElementById("heroText");
  if (heroImg) heroImg.style.display = "none";
  if (heroText) heroText.style.display = "none";

  if (grid) grid.innerHTML = "";
  if (heading) {
    heading.style.display = "block";
    heading.textContent = "Loading…";
  }
  if (showAllBtn) showAllBtn.style.display = "none";

  let query = supabase
    .from("stores_frontend_public_v4")
    .select("*");

  if (search) {
    query = query.or(
      `name.ilike.%${search}%,city.ilike.%${search}%,country.ilike.%${search}%`
    );
  }

  if (filters.continent) query = query.eq("continent", filters.continent);
  if (filters.country) query = query.eq("country", filters.country);
  if (filters.city) query = query.eq("city", filters.city);

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    console.error("Load error:", error);
    if (heading) heading.textContent = "Error loading stores.";
    return;
  }

  if (!data?.length) {
    heading.textContent = "No results found.";
    return;
  }

  heading.textContent = `${data.length} results`;
  renderStores(data);
}

// js/cards.js
import { supabase } from "./globals.js";

/* ============================================================
   FALLBACK
============================================================ */
const FALLBACK_PHOTO = "images/store.jpg";

/* ============================================================
   FLAG ALIASES — samma logik som backend
============================================================ */
const FLAG_ALIASES = {
  "united states": "united-states",
  "united states of america": "united-states",
  "usa": "united-states",

  "united kingdom": "united-kingdom",
  "uk": "united-kingdom",

  "czech republic": "czechia",
  "viet nam": "vietnam",
};

function getFlagSlug(country) {
  if (!country) return null;
  const raw = country.toLowerCase().trim();
  if (FLAG_ALIASES[raw]) return FLAG_ALIASES[raw];
  return raw.replaceAll(" ", "-");
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
   RENDER STORE CARDS
============================================================ */
export function renderStores(list) {
  const grid = document.getElementById("storeGrid");
  if (!grid) return;

  grid.innerHTML = "";

  list.forEach((s) => {
    const card = document.createElement("article");
    card.className = "store-card";

    // Bild från backend view (KAN EJ FAILA längre)
    const imgSrc = s.photo_final_url || FALLBACK_PHOTO;

    // Flag slug
    const flagSlug = getFlagSlug(s.country);

    card.innerHTML = `
      <div class="store-photo-wrap">
        <img
          src="${imgSrc}"
          alt="${s.name || "Cigar location"}"
          class="store-img"
          onerror="this.onerror=null;this.src='${FALLBACK_PHOTO}';"
        />
      </div>

      <div class="store-body">
        <h3 class="store-title">${s.name || "Unnamed location"}</h3>

        <div class="stars">
          ${
            s.rating
              ? "★".repeat(Math.round(s.rating))
              : '<span class="no-rating">No rating yet</span>'
          }
        </div>

        <div class="locrow">
          <div class="loc-top">
            ${
              flagSlug
                ? `<img
                     src="assets/flags/${flagSlug}.svg"
                     class="flag"
                     alt="${s.country || ""}"
                     onerror="this.style.display='none';"
                   />`
                : ""
            }
            <span>${[s.city, s.country].filter(Boolean).join(", ")}</span>
          </div>
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

 let query = supabase.from("stores_frontend_public_v3").select("*");

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
    if (heading) heading.textContent = "No results found.";
    return;
  }

  heading.textContent = `${data.length} results`;
  renderStores(data);
}

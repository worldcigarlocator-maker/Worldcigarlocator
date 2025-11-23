// js/cards.js
import { supabase } from "./globals.js";

/* ============================================================
   PHOTO URL HELPER  (mirror backend behaviour)
   ============================================================ */

const FALLBACK_PHOTO = "images/store.jpg";  // you also have lounge.jpg etc.
const PHOTO_PROXY_URL = "/functions/v1/photo-proxy";


function getPhotoUrl(store) {
  // 1) CDN image (Cloudflare / Supabase Storage)
  if (store.photo_cdn_url) return store.photo_cdn_url;

  // 2) Direct URL already stored
  if (store.photo_url) return store.photo_url;

  // 3) Google Places reference via your proxy
  if (store.photo_reference) {
    const ref = encodeURIComponent(store.photo_reference);
    return `${PHOTO_PROXY_URL}?ref=${ref}&maxwidth=800`;
  }

  // 4) Nothing -> fallback
  return FALLBACK_PHOTO;
}

/* ============================================================
   RESET HERO VIEW
   ============================================================ */
export function resetToHero() {
  const grid = document.getElementById("storeGrid");
  const heading = document.getElementById("resultHeading");
  const showAllBtn = document.getElementById("showAllBtn");
  const heroImg = document.getElementById("heroImage");
  const heroText = document.getElementById("heroText");

  if (grid) grid.innerHTML = "";
  if (heading) {
    heading.style.display = "none";
    heading.textContent = "";
  }
  if (showAllBtn) showAllBtn.style.display = "none";
  if (heroImg) heroImg.style.display = "block";
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

const flagFile = (s.country || "")
  .toLowerCase()
  .replaceAll(" ", "-");

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
      ${"★".repeat(Math.round(s.rating || 0)) ||
        '<span class="no-rating">No rating yet</span>'}
    </div>

    <div class="locrow">
      <div class="loc-top">
        <img
          src="assets/flags/${flagFile}.svg"
          class="flag"
          alt="${s.country || ""}"
          onerror="this.style.display='none';"
        />
        <span>${[s.city, s.country].filter(Boolean).join(", ")}</span>
      </div>
    </div>


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
   LOAD STORES (search + filters)
   ============================================================ */
export async function loadStores(filters = {}, search = "") {
  const grid = document.getElementById("storeGrid");
  const heading = document.getElementById("resultHeading");
  const showAllBtn = document.getElementById("showAllBtn");

  // hide hero when we actually load results
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

  let query = supabase.from("stores_frontend_public_v2").select("*");

  // Search string
  if (search) {
    query = query.or(
      `name.ilike.%${search}%,city.ilike.%${search}%,country.ilike.%${search}%`
    );
  }

  // Filters from sidebar
  if (filters.continent) query = query.eq("continent", filters.continent);
  if (filters.country) query = query.eq("country", filters.country);
  if (filters.city) query = query.eq("city", filters.city);

  // Newest first – view already only has approved/clean rows
  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    console.error("Load error:", error);
    if (heading) heading.textContent = "Error loading stores.";
    return;
  }

  if (!data || !data.length) {
    if (heading) heading.textContent = "No results found.";
    return;
  }

  if (heading) heading.textContent = `${data.length} results`;
  renderStores(data);
}

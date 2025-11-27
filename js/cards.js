// ============================================================
// CARDS.JS — Render + Store Loading + Hero Reset (Stable v2025)
// ============================================================

import { supabase } from "./globals.js";

// Flag used to avoid DOM race conditions
let DOM_READY = false;
document.addEventListener("DOMContentLoaded", () => DOM_READY = true);


/* ============================================================
   DOM Resolution Helper (WAIT UNTIL DOM EXISTS)
============================================================ */
function dom(sel) {
  const el = qs(sel);
  if (!el) console.warn("DOM element not ready:", sel);
  return el;
}


/* ============================================================
   RESET TO HERO VIEW
============================================================ */
export function resetToHero() {
  if (!DOM_READY) {
    // Retry once DOM is ready
    document.addEventListener("DOMContentLoaded", resetToHero, { once: true });
    return;
  }

  const grid = dom("#storeGrid");
  const heading = dom("#resultHeading");
  const heroText = dom("#heroText");
  const heroImage = dom("#heroImage");
  const showAll = dom("#showAllBtn");

  if (!grid) return;

  // Hide result section
  if (heading) heading.style.display = "none";
  if (showAll) showAll.style.display = "none";

  // Clear stores
  grid.innerHTML = "";

  // Show hero
  if (heroText) heroText.style.display = "";
  if (heroImage) heroImage.style.display = "";
}


/* ============================================================
   CLEAN CARD HTML BUILDER
============================================================ */
function cardHTML(store) {
  return `
    <div class="card">
      <img class="card-photo" src="${store.photo_url || 'images/store.jpg'}" alt="">
      <div class="card-info">
        <h3>${store.name}</h3>
        <p>${store.city}, ${store.country}</p>
      </div>
    </div>
  `;
}


/* ============================================================
   RENDER CARDS INTO GRID
============================================================ */
function renderCards(stores) {
  const grid = dom("#storeGrid");
  if (!grid) return;

  grid.innerHTML = stores.map(cardHTML).join("");
}


/* ============================================================
   LOAD STORES (stable version)
// ============================================================ */
export async function loadStores(filters = {}, search = "") {

  // Wait for DOM
  if (!DOM_READY) {
    document.addEventListener("DOMContentLoaded", () => loadStores(filters, search), { once: true });
    return;
  }

  const grid = dom("#storeGrid");
  const heading = dom("#resultHeading");
  const heroText = dom("#heroText");
  const heroImage = dom("#heroImage");
  const showAll = dom("#showAllBtn");

  if (!grid || !heading) return;

  // Switch to result UI
  if (heroText) heroText.style.display = "none";
  if (heroImage) heroImage.style.display = "none";

  heading.style.display = "block";
  heading.textContent = "Loading…";
  grid.innerHTML = "";

  // Start query
  let query = supabase.from("stores_frontend_public_v4").select("*");

  // TEXT SEARCH
  if (search) {
    query = query.or(`
      name.ilike.%${search}%,
      city.ilike.%${search}%,
      country.ilike.%${search}%
    `);
  }

  // FILTERS
  if (filters.continent) query = query.eq("continent", filters.continent);
  if (filters.country)   query = query.eq("country", filters.country);
  if (filters.city)      query = query.eq("city", filters.city);

  const { data, error } = await query;

  if (error) {
    heading.textContent = "Error loading stores";
    console.error(error);
    return;
  }

  if (!data || data.length === 0) {
    heading.textContent = "No results found.";
    return;
  }

  // Render
  heading.textContent = `${data.length} locations found`;
  renderCards(data);

  // Show All button if needed
  if (showAll) {
    showAll.style.display = search || Object.keys(filters).length ? "inline-block" : "none";
    showAll.onclick = resetToHero;
  }
}


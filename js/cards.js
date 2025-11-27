// ============================================================
// CARDS.JS — FINAL VERSION FOR stores_frontend_public_v4
// ============================================================

import { supabase } from "./globals.js";

let DOM_READY = false;
document.addEventListener("DOMContentLoaded", () => DOM_READY = true);

/* ------------------------------------------------------------
   DOM SAFE SELECTOR
------------------------------------------------------------ */
function dom(sel) {
  return document.querySelector(sel);
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
  const heroText = dom("#heroText");
  const heroImage = dom("#heroImage");
  const showAll = dom("#showAllBtn");

  if (grid) grid.innerHTML = "";
  if (heading) heading.style.display = "none";
  if (showAll) showAll.style.display = "none";

  if (heroText) heroText.style.display = "";
  if (heroImage) heroImage.style.display = "";
}

/* ------------------------------------------------------------
   CARD HTML BUILDER
------------------------------------------------------------ */

function cardHTML(store) {
  const photo = store.photo_final_url || "images/store.jpg";

  return `
    <div class="card">
      <img class="card-photo" src="${photo}" alt="${store.name}">
      <div class="card-info">
        <h3>${store.name}</h3>
        <p>${store.city}, ${store.country}</p>
      </div>
    </div>
  `;
}

/* ------------------------------------------------------------
   RENDER CARDS
------------------------------------------------------------ */
function renderCards(stores) {
  const grid = dom("#storeGrid");
  if (!grid) return;

  grid.innerHTML = stores.map(cardHTML).join("");
}

/* ------------------------------------------------------------
   LOAD STORES (MATCHES YOUR TABLE)
------------------------------------------------------------ */
export async function loadStores(filters = {}, search = "") {

  if (!DOM_READY) {
    document.addEventListener("DOMContentLoaded", () => loadStores(filters, search), { once: true });
    return;
  }

  const grid = dom("#storeGrid");
  const heading = dom("#resultHeading");
  const heroText = dom("#heroText");
  const heroImage = dom("#heroImage");
  const showAll = dom("#showAllBtn");

  // Hide hero, show result-heading
  if (heroText) heroText.style.display = "none";
  if (heroImage) heroImage.style.display = "none";

  if (heading) {
    heading.style.display = "block";
    heading.textContent = "Loading…";
  }

  if (grid) grid.innerHTML = "";

  // Build query
  let query = supabase.from("stores_frontend_public_v4").select("*");

  // Search (name, city, country)
  if (search) {
    query = query.or(`
      name.ilike.%${search}%,
      city.ilike.%${search}%,
      country.ilike.%${search}%
    `);
  }

  // Filters
  if (filters.continent) query = query.eq("continent", filters.continent);
  if (filters.country)   query = query.eq("country", filters.country);
  if (filters.city)      query = query.eq("city", filters.city);

  const { data, error } = await query;

  if (error) {
    console.error("Error loading stores:", error);
    heading.textContent = "Error loading stores.";
    return;
  }

  if (!data || data.length === 0) {
    heading.textContent = "No results found.";
    return;
  }

  // Render results
  renderCards(data);

  heading.textContent = `${data.length} locations found`;

  // Show "Show All" if filtered
  if (showAll) {
    const filtered = search || Object.keys(filters).length > 0;
    showAll.style.display = filtered ? "inline-block" : "none";
    showAll.onclick = resetToHero;
  }
}


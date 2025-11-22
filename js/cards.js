import { supabase } from "./globals.js";

/* ============================================================
   RESET HERO VIEW
   ============================================================ */
export function resetToHero() {
  const grid = document.getElementById("storeGrid");
  const heading = document.getElementById("resultHeading");
  const showAll = document.getElementById("showAllBtn");

  grid.innerHTML = "";
  heading.style.display = "none";
  showAll.style.display = "none";

  document.getElementById("heroImage").style.display = "block";
  document.getElementById("heroText").style.display = "block";
}

/* ============================================================
   RENDER STORES
   ============================================================ */
export function renderStores(list) {
  const grid = document.getElementById("storeGrid");
  grid.innerHTML = "";

  list.forEach((s) => {
    const card = document.createElement("div");
    card.className = "store-card";

    const img = s.photo_cdn_url || "images/fallback.jpg";

    card.innerHTML = `
      <img src="${img}" class="store-img" />

      <div class="store-body">
        <div class="store-title">${s.name}</div>

        <div class="stars">
          ${"★".repeat(Math.round(s.rating || 0))}
        </div>

        <div class="locrow">
          <div class="loc-top">
            <img src="flags/${(s.country_iso2 || "xx").toLowerCase()}.svg" class="flag" />
            <span>${s.city || ""}, ${s.country || ""}</span>
          </div>
        </div>

        <div class="infoblock">
          <div class="info-row">${s.address || ""}</div>
          <div class="info-row">${s.phone || ""}</div>
          <div class="info-row">
            ${
              s.website
                ? `<a href="${s.website}" target="_blank">${s.website}</a>`
                : ""
            }
          </div>
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

  // Dölj hero
  document.getElementById("heroImage").style.display = "none";
  document.getElementById("heroText").style.display = "none";

  grid.innerHTML = "";
  heading.style.display = "block";

  let query = supabase.from("stores_frontend_public").select("*");

  if (search) {
    heading.textContent = `Results for "${search}"`;
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
    heading.textContent = "Error loading stores.";
    return;
  }

  if (!data.length) {
    heading.textContent = "No results found.";
    return;
  }

  heading.textContent = `${data.length} results`;

  renderStores(data);
}

import { supabase } from "./globals.js";

/* ============================================================
   RESET HERO VIEW
   ============================================================ */
export function resetToHero() {
  document.getElementById("storeGrid").innerHTML = "";
  document.getElementById("resultHeading").style.display = "none";
  document.getElementById("showAllBtn").style.display = "none";

  // Visa hero + hero-text igen
  document.querySelector(".hero").style.display = "block";
  document.querySelector(".hero-text").style.display = "block";
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

    const img = s.photo_cdn_url
      ? s.photo_cdn_url
      : "images/fallback.jpg";

    card.innerHTML = `
      <img src="${img}" class="store-img">

      <div class="store-body">
        <div class="store-title">${s.name}</div>

        <div class="stars">
          ${"★".repeat(Math.round(s.rating || 0))}
        </div>

        <div class="locrow">
          <div class="loc-top">
            <img src="flags/${(s.country_iso2 || "xx").toLowerCase()}.svg" class="flag">
            <span>${s.city || ""}, ${s.country || ""}</span>
          </div>
        </div>

        <div class="infoblock">
          <div class="info-row">${s.address || ""}</div>
          <div class="info-row">${s.phone || ""}</div>
          <div class="info-row">
            ${s.website ? `<a href="${s.website}" target="_blank">${s.website}</a>` : ""}
          </div>
        </div>

        <button class="reviews-btn">Comments (${s.comment_count || 0})</button>
      </div>
    `;

    grid.appendChild(card);
  });
}

/* ============================================================
   LOAD STORES
   ============================================================ */
export async function loadStores(filters = {}, search = "") {
  // Dölj hero
  document.querySelector(".hero").style.display = "none";
  document.querySelector(".hero-text").style.display = "none";

  let query = supabase.from("stores_public").select("*");

  if (search && search.length > 1) {
    query = query.ilike("name", `%${search}%`);
  }

  if (filters.continent) query = query.eq("continent", filters.continent);
  if (filters.country) query = query.eq("country", filters.country);
  if (filters.city) query = query.eq("city", filters.city);

  const { data, error } = await query.order("created_at", { ascending: false }).limit(200);

  if (error) {
    console.error("Load error:", error);
    return;
  }

  document.getElementById("resultHeading").style.display = "block";
  document.getElementById("resultHeading").textContent =
    search ? `Results for "${search}"` : "Browse";

  renderStores(data);
}

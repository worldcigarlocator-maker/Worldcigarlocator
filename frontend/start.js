/* ============================================================
   start.js — World Cigar Locator (Frontend Design A)
   ============================================================ */

import { supabase, photoURL, getContinentFromCountry } from "./globals.js";
import { renderCards } from "./cards.js";

/* ---------- Helpers ---------- */
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}
function qs(id) {
  return document.getElementById(id);
}

/* ============================================================
   LOAD STORES
   ============================================================ */

async function loadStores(filter = {}, searchTerm = "") {
  const grid = qs("storeGrid");
  const heading = qs("resultHeading");

  if (grid) {
    grid.innerHTML =
      "<p style='color:#777;text-align:center;margin-top:1rem;'>Loading…</p>";
  }

  let query = supabase
    .from("stores_public")
    .select("*")
    .order("id", { ascending: false })
    .limit(40);

  if (filter.city) query = query.eq("city", filter.city);
  else if (filter.country) query = query.eq("country", filter.country);
  else if (filter.continent) {
    const { data: all, error } = await query;
    if (error || !all) {
      console.error(error);
      renderCards([]);
      return;
    }
    const filtered = all.filter(
      (s) => getContinentFromCountry(s.country) === filter.continent
    );
    if (heading) heading.textContent = `${filter.continent} — ${filtered.length} places`;
    renderCards(filtered);
    return;
  }

  if (searchTerm) {
    query = query.or(
      `name.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%,country.ilike.%${searchTerm}%`
    );
  }

  const { data: stores, error } = await query;
  if (error) {
    console.error(error);
    renderCards([]);
    if (heading) heading.textContent = "Error loading data";
    return;
  }

  // Fallback: säkerställ continent
  const withCont = (stores || []).map((s) => ({
    ...s,
    continent: s.continent || getContinentFromCountry(s.country),
  }));

  if (heading) {
    if (filter.city) {
      heading.textContent = `${filter.city} — ${withCont.length} places`;
    } else if (filter.country) {
      heading.textContent = `${filter.country} — ${withCont.length} places`;
    } else {
      heading.textContent = `Latest ${withCont.length} worldwide`;
    }
  }

  renderCards(withCont);
}

/* ============================================================
   SIDEBAR
   ============================================================ */

async function buildSidebar() {
  const menu = qs("sidebarMenu");
  if (!menu) return;
  menu.innerHTML = "<li style='color:#666'>Loading…</li>";

  const { data: stores, error } = await supabase
    .from("stores_public")
    .select("id,name,city,country");

  if (error || !stores) {
    console.error(error);
    menu.innerHTML =
      "<li style='color:#f56;font-size:0.85rem;'>Failed to load data</li>";
    return;
  }

  const grouped = {};
  for (const s of stores) {
    const cont = getContinentFromCountry(s.country);
    if (!grouped[cont]) grouped[cont] = {};
    const ctry = s.country || "Unknown";
    if (!grouped[cont][ctry]) grouped[cont][ctry] = {};
    const city = s.city || "Unknown";
    if (!grouped[cont][ctry][city]) grouped[cont][ctry][city] = [];
    grouped[cont][ctry][city].push(s);
  }

  menu.innerHTML = "";
  Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([continent, countries]) => {
      const contLine = el("button", "line continent");
      const contCount = Object.values(countries).reduce(
        (acc, c) => acc + Object.values(c).reduce((a, b) => a + b.length, 0),
        0
      );
      contLine.innerHTML = `<span class="label">${continent}</span><span class="pill">${contCount}</span>`;
      const nested = el("div", "nested");

      contLine.addEventListener("click", () => {
        const isOpen = nested.classList.toggle("show");
        contLine.classList.toggle("open", isOpen);
        if (isOpen) loadStores({ continent });
      });

      Object.entries(countries)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([country, cities]) => {
          const countryLine = el("button", "line country");
          const count = Object.values(cities).reduce(
            (a, b) => a + b.length,
            0
          );
          countryLine.innerHTML = `<span class="label">${country}</span><span class="pill">${count}</span>`;
          const nestedCity = el("div", "nested");

          countryLine.addEventListener("click", (e) => {
            e.stopPropagation();
            const isOpen = nestedCity.classList.toggle("show");
            countryLine.classList.toggle("open", isOpen);
            if (isOpen) loadStores({ country });
          });

          Object.entries(cities)
            .sort(([, a], [, b]) => b.length - a.length)
            .forEach(([city, cityStores]) => {
              const btnCity = el("button", "line city");
              btnCity.innerHTML = `<span class="label">${city}</span><span class="pill">${cityStores.length}</span>`;
              btnCity.addEventListener("click", (e) => {
                e.stopPropagation();
                document
                  .querySelector(".main")
                  .scrollIntoView({ behavior: "smooth" });
                loadStores({ city });
              });
              nestedCity.appendChild(btnCity);
            });

          nested.append(countryLine, nestedCity);
        });

      menu.append(contLine, nested);
    });
}

/* ============================================================
   MODAL (View comments / rating — mock)
   ============================================================ */

window.openStoreModal = function openStoreModal(store) {
  const modal = document.getElementById("storeModal");
  if (!modal) return;

  const photoEl = document.getElementById("mPhoto");
  const titleEl = document.getElementById("mTitle");
  const addrEl = document.getElementById("mAddress");
  const locEl = document.getElementById("mLocation");
  const starsEl = document.getElementById("mStars");
  const visitBtn = document.getElementById("mVisit");

  photoEl.src = photoURL(store.photo_reference, 800);
  photoEl.onerror = () => (photoEl.src = photoURL(null));

  titleEl.textContent = store.name || "";
  addrEl.textContent = store.address || "";
  locEl.textContent = [store.city, store.country].filter(Boolean).join(", ");

  const rating = Math.round(Number(store.rating) || 0);
  starsEl.textContent = "★★★★★"
    .split("")
    .map((_, i) => (i < rating ? "★" : "☆"))
    .join("");

  if (store.website) {
    visitBtn.style.display = "inline-flex";
    visitBtn.onclick = () => {
      window.open(store.website, "_blank", "noopener");
    };
  } else {
    visitBtn.style.display = "none";
    visitBtn.onclick = null;
  }

  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
};

function initModalClose() {
  const modal = qs("storeModal");
  if (!modal) return;
  const closeBtn = modal.querySelector(".modal-close");
  const close = () => {
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
  };
  closeBtn?.addEventListener("click", close);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) close();
  });
}

/* ============================================================
   INIT
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  console.log("🌙 Frontend Design A loaded");
  buildSidebar();
  loadStores();

  const searchInput = qs("searchInput");
  const searchBtn = qs("searchBtn");
  const clearBtn = qs("clearBtn");
  const showAllBtn = qs("showAllBtn");

  searchBtn?.addEventListener("click", () =>
    loadStores({}, searchInput.value.trim())
  );
  clearBtn?.addEventListener("click", () => {
    searchInput.value = "";
    loadStores();
  });
  searchInput?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") loadStores({}, searchInput.value.trim());
  });
  showAllBtn?.addEventListener("click", () => {
    loadStores();
    showAllBtn.style.display = "none";
  });

  initModalClose();
});

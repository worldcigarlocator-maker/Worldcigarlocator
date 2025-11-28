// ============================================================
// SIDEBAR.JS — Premium Hierarchy Navigation
// ============================================================

import { loadStores, resetToHero } from "./cards.js";

/* DOM helper */
const dom = (sel) => document.querySelector(sel);

/* Container */
const menu = dom("#sidebarMenu");

/* ============================================================
   BUILD SIDEBAR HIERARCHY
   continents → countries → cities
   ============================================================ */
export function buildFrontendSidebar(supabase, loadFunc = loadStores) {
  menu.innerHTML = "Loading…";

  supabase
    .from("stores_frontend_public_v4")
    .select("continent, country, city")
    .order("continent", { ascending: true })
    .order("country", { ascending: true })
    .order("city", { ascending: true })
    .then(({ data, error }) => {
      if (error) {
        console.error(error);
        menu.innerHTML = "Failed to load menu.";
        return;
      }

      // Build tree structure
      const tree = {};

      data.forEach((row) => {
        if (!row.continent) return;

        if (!tree[row.continent]) tree[row.continent] = {};
        if (!tree[row.continent][row.country]) tree[row.continent][row.country] = [];

        if (row.city) tree[row.continent][row.country].push(row.city);
      });

      /* Render menu */
      menu.innerHTML = "";

      Object.entries(tree).forEach(([continent, countries]) => {
        const continentItem = createLine("continent", continent);
        const contNested = createNested();

        // Insert continent block
        menu.append(continentItem, contNested);

        // Add countries
        Object.entries(countries).forEach(([country, cities]) => {
          const countryItem = createLine("country", country);
          const countryNested = createNested();

          contNested.append(countryItem, countryNested);

          // Add cities
          cities.forEach((city) => {
            const cityItem = createLine("city", city);
            cityItem.addEventListener("click", () => {
              loadFunc({ city }, "");
            });

            countryNested.append(cityItem);
          });

          /* COUNTRY CLICK → open + filter */
          countryItem.addEventListener("click", () => {
            toggle(countryItem, countryNested, ".country");
            loadFunc({ country }, "");
          });
        });

        /* CONTINENT CLICK → open + filter */
        continentItem.addEventListener("click", () => {
          toggle(continentItem, contNested, ".continent");
          loadFunc({ continent }, "");
        });
      });
    });
}

/* ============================================================
   CREATE ELEMENT HELPERS
   ============================================================ */

function createLine(type, label) {
  const el = document.createElement("div");
  el.className = `line ${type}`;
  el.innerHTML = `
    <span class="label">${label}</span>
    <span class="arrow">›</span>
  `;
  return el;
}

function createNested() {
  const el = document.createElement("div");
  el.className = "nested";
  return el;
}

/* ============================================================
   TOGGLE SYSTEM — only ONE open per level
   ============================================================ */
function toggle(clickedItem, clickedNested, selector) {
  const allItems = document.querySelectorAll(selector);
  const allNested = document.querySelectorAll(selector + " + .nested");

  allItems.forEach((item, i) => {
    const nest = allNested[i];

    if (item === clickedItem) {
      // Toggle clicked one
      item.classList.toggle("open");
      nest.classList.toggle("show");
    } else {
      // Close all others
      item.classList.remove("open");
      nest.classList.remove("show");
    }
  });
}

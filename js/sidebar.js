// ============================================================
// SIDEBAR.JS — WCL Premium Hierarchy Navigation v3.0
// ============================================================

import { loadStores, resetToHero } from "./cards.js";

const dom = (sel) => document.querySelector(sel);
const menu = dom("#sidebarMenu");

/* ============================================================
   BUILD SIDEBAR HIERARCHY WITH COUNTS
   ============================================================ */
export function buildFrontendSidebar(supabase, loadFunc = loadStores) {
  menu.innerHTML = "Loading…";

  supabase
    .from("stores_frontend_public_v4")
    .select("id, continent, country, city")
    .order("continent")
    .order("country")
    .order("city")
    .then(({ data, error }) => {
      if (error) {
        console.error(error);
        menu.innerHTML = "Failed to load menu.";
        return;
      }

      // Build tree with counts
      const tree = {};

      data.forEach((row) => {
        const { continent, country, city } = row;
        if (!continent || !country) return;

        if (!tree[continent]) tree[continent] = {};
        if (!tree[continent][country]) tree[continent][country] = {};

        if (city) {
          tree[continent][country][city] =
            (tree[continent][country][city] || 0) + 1;
        }
      });

      // Render
      menu.innerHTML = "";

      Object.entries(tree).forEach(([continent, countries]) => {
        const continentCount = countTotal(countries);
        const contItem = createLine("continent", continent, continentCount);
        const contNested = createNested();
        menu.append(contItem, contNested);

        contItem.addEventListener("click", () => {
          toggle(contItem, contNested, ".continent");
          loadFunc({ continent }, "");
        });

        Object.entries(countries).forEach(([country, cities]) => {
          const countryCount = countTotal(cities);

          const countryItem = createLine("country", country, countryCount);
          const countryNested = createNested();
          contNested.append(countryItem, countryNested);

          countryItem.addEventListener("click", () => {
            toggle(countryItem, countryNested, ".country");
            loadFunc({ country }, "");
          });

          Object.entries(cities).forEach(([city, count]) => {
            const cityItem = createLine("city", city, count);

            // CITY CLICK → filter only, no toggle
            cityItem.addEventListener("click", (e) => {
              e.stopPropagation();
              loadFunc({ city }, "");
            });

            countryNested.append(cityItem);
          });
        });
      });
    });
}

/* ============================================================
   HELPERS
   ============================================================ */
function countTotal(obj) {
  // Sum all values in nested object
  return Object.values(obj).reduce((a, b) => {
    if (typeof b === "number") return a + b;
    if (typeof b === "object") return a + countTotal(b);
    return a;
  }, 0);
}

function createLine(type, label, count) {
  const el = document.createElement("div");
  el.className = `line ${type}`;
  el.innerHTML = `
    <span class="label">${label}</span>
    <span class="pill">${count}</span>
    ${type !== "city" ? `<span class="arrow">›</span>` : ""}
  `;
  return el;
}

function createNested() {
  const el = document.createElement("div");
  el.className = "nested";
  return el;
}

/* ============================================================
   TOGGLE SYSTEM — one open per level
   ============================================================ */
function toggle(clickedItem, clickedNested, selector) {
  const allItems = document.querySelectorAll(selector);
  const allNesteds = [...allItems].map((i) => i.nextElementSibling);

  allItems.forEach((item, i) => {
    const nest = allNesteds[i];

    if (item === clickedItem) {
      const isOpen = item.classList.contains("open");
      item.classList.toggle("open", !isOpen);
      nest.classList.toggle("show", !isOpen);
    } else {
      item.classList.remove("open");
      nest.classList.remove("show");
    }
  });
}

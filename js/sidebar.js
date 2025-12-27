// ============================================================
// SIDEBAR.JS — WCL Frontend Hierarchy (FINAL, SYNCED WITH CARDS)
// ============================================================

import { loadStores } from "./cards.js";

const dom = (sel) => document.querySelector(sel);
const menu = dom("#sidebarMenu");

/* ============================================================
   BUILD SIDEBAR
   ============================================================ */
export async function buildFrontendSidebar(supabase) {
  if (!menu) return;
  menu.innerHTML = "Loading…";

  const { data, error } = await supabase
    .from("stores_frontend_public_v4")
    .select("id, continent, country, city")
    .order("continent")
    .order("country")
    .order("city");

  if (error) {
    console.error(error);
    menu.innerHTML = "Failed to load menu.";
    return;
  }

  /* ------------------------------------------------------------
     BUILD TREE
     ------------------------------------------------------------ */
  const tree = {};

  data.forEach(({ continent, country, city }) => {
    if (!continent || !country) return;

    if (!tree[continent]) tree[continent] = {};
    if (!tree[continent][country]) tree[continent][country] = {};

    if (city) {
      tree[continent][country][city] =
        (tree[continent][country][city] || 0) + 1;
    }
  });

  /* ------------------------------------------------------------
     RENDER SIDEBAR
     ------------------------------------------------------------ */
  menu.innerHTML = "";

  Object.entries(tree).forEach(([continent, countries]) => {
    const continentCount = countTotal(countries);

    const contLine = createLine("continent", continent, continentCount);
    const contNested = createNested();

    menu.append(contLine, contNested);

    contLine.addEventListener("click", () => {
      toggle(contLine, contNested, ".continent");
      loadStores({ continent }, "");
    });

    Object.entries(countries).forEach(([country, cities]) => {
      const countryCount = countTotal(cities);

      const countryLine = createLine("country", country, countryCount);
      const countryNested = createNested();

      contNested.append(countryLine, countryNested);

      countryLine.addEventListener("click", () => {
        toggle(countryLine, countryNested, ".country");
        loadStores({ country }, "");
      });

      Object.entries(cities).forEach(([city, count]) => {
        const cityLine = createLine("city", city, count);

        cityLine.addEventListener("click", (e) => {
          e.stopPropagation();
          loadStores({ city }, "");
        });

        countryNested.append(cityLine);
      });
    });
  });
}

/* ============================================================
   HELPERS
   ============================================================ */

function createLine(type, label, count) {
  const el = document.createElement("div");

  // continent / country / city
  el.className = `line ${type}`;

  // 🔑 KRITISKT: gör klicket synligt för cards.js
  el.dataset[type] = label;

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

function countTotal(obj) {
  return Object.values(obj).reduce((sum, val) => {
    if (typeof val === "number") return sum + val;
    if (typeof val === "object") return sum + countTotal(val);
    return sum;
  }, 0);
}

/* ============================================================
   TOGGLE SYSTEM (ONE OPEN PER LEVEL)
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

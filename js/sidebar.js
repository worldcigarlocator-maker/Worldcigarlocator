// ============================================================
// SIDEBAR.JS — WCL Premium Hierarchy Navigation
// ============================================================

console.log("🚨 ACTIVE SIDEBAR FILE LOADED");

import { setLocationFilter, runSearch } from "./cards.js";


const dom = (sel) => document.querySelector(sel);
const menu = dom("#sidebarMenu");

/* ============================================================
   INTERNAL GUARD — prevent duplicate / empty searches
   ============================================================ */
let LAST_LOCATION = {
  continent: null,
  country: null,
  state: null,
  city: null,
};

function isSameLocation(next) {
  return (
    LAST_LOCATION.continent === (next.continent ?? null) &&
    LAST_LOCATION.country === (next.country ?? null) &&
    LAST_LOCATION.state === (next.state ?? null) &&
    LAST_LOCATION.city === (next.city ?? null)
  );
}

function applyLocation(next) {
  if (isSameLocation(next)) return; // 🔒 STOP duplicates

  LAST_LOCATION = {
    continent: next.continent ?? null,
    country: next.country ?? null,
    state: next.state ?? null,
    city: next.city ?? null,
  };

  setLocationFilter(LAST_LOCATION);
  runSearch();
}

/* ============================================================
   BUILD SIDEBAR HIERARCHY (DEDUPED, USA HAS STATE LEVEL)
   ============================================================ */
export async function buildFrontendSidebar(supabase) {
  if (!menu) return;
  menu.innerHTML = "Loading…";

 const { data, error } = await supabase
  .rpc("sidebar_counts_v1");


  if (error) {
    console.error(error);
    menu.innerHTML = "Failed to load menu.";
    return;
  }

// ============================================================
// BUILD TREE (from aggregated backend counts)
// ============================================================
const tree = {};

data.forEach(({ continent, country, region, city, count }) => {
  if (!continent || !country || !region || !city) return;

  if (!tree[continent]) tree[continent] = {};
  if (!tree[continent][country]) tree[continent][country] = {};
  if (!tree[continent][country][region]) {
    tree[continent][country][region] = {};
  }

  tree[continent][country][region][city] =
    (tree[continent][country][region][city] || 0) + count;
});


  // ============================================================
// RENDER
// ============================================================
menu.innerHTML = "";

Object.entries(tree).forEach(([continent, countries]) => {
  const contLine = createLine("continent", continent, countTotal(countries));
  const contNested = createNested();

  menu.append(contLine, contNested);

  contLine.addEventListener("click", () => {
    toggle(contLine, contNested, ".continent");
    applyLocation({ continent, country: null, state: null, city: null });
  });

  Object.entries(countries).forEach(([country, regions]) => {
    const countryLine = createLine("country", country, countTotal(regions));
    const countryNested = createNested();

    contNested.append(countryLine, countryNested);

    countryLine.addEventListener("click", (e) => {
      e.stopPropagation();
      toggle(countryLine, countryNested, ".country");
      applyLocation({ continent, country, state: null, city: null });
    });

    // 🌍 ALL COUNTRIES → REGION → CITY
    Object.entries(regions).forEach(([region, cities]) => {
      const regionLine = createLine("state", region, countTotal(cities));
      const regionNested = createNested();

      countryNested.append(regionLine, regionNested);

      regionLine.addEventListener("click", (e) => {
        e.stopPropagation();
        toggle(regionLine, regionNested, ".state");
        applyLocation({ continent, country, state: region, city: null });
      });

      Object.entries(cities).forEach(([city, count]) => {
        const cityLine = createLine("city", city, count);
        regionNested.append(cityLine);

        cityLine.addEventListener("click", (e) => {
          e.stopPropagation();
          applyLocation({ continent, country, state: region, city });
        });
      });
    });
  });
});


/* ============================================================
   HELPERS
   ============================================================ */
function countTotal(obj) {
  return Object.values(obj).reduce((sum, val) => {
    if (typeof val === "number") return sum + val;
    if (typeof val === "object") return sum + countTotal(val);
    return sum;
  }, 0);
}

function createLine(type, label, count) {
  const el = document.createElement("div");
  el.className = `line ${type}`;

  // 🔍 DEBUG – BEVISA ATT KLICKET NÅR ELEMENTET
  el.addEventListener("click", () => {
    console.log("🧪 CLICK ON LINE", { type, label, count });
  });

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
    if (!nest) return;

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

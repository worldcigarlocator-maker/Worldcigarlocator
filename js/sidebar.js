// ============================================================
// SIDEBAR.JS — WCL Premium Hierarchy Navigation (Frontend)
// Uses: setLocationFilter + runSearch (single search pipeline)
// ============================================================

import { setLocationFilter, runSearch, resetToHero } from "./cards.js";

const dom = (sel) => document.querySelector(sel);
const menu = dom("#sidebarMenu");

/* ============================================================
   BUILD SIDEBAR HIERARCHY WITH CORRECT COUNTS (DEDUPED)
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

  // ✅ DEDUP (one store = one count)
  const uniqueStores = Array.from(new Map((data || []).map((s) => [s.id, s])).values());

  // BUILD TREE
  const tree = {};
  uniqueStores.forEach((row) => {
    const continent = row.continent;
    const country = row.country;
    const city = row.city;

    if (!continent || !country) return;

    if (!tree[continent]) tree[continent] = {};
    if (!tree[continent][country]) tree[continent][country] = {};

    if (city) {
      tree[continent][country][city] = (tree[continent][country][city] || 0) + 1;
    }
  });

  // RENDER
  menu.innerHTML = "";

  Object.entries(tree).forEach(([continent, countries]) => {
    const continentCount = countTotal(countries);

    const contLine = createLine("continent", continent, continentCount);
    const contNested = createNested();

    menu.append(contLine, contNested);

    contLine.addEventListener("click", () => {
      toggle(contLine, contNested, ".continent");

      // ✅ set location filter + run search
      setLocationFilter({ continent, country: null, city: null });
      runSearch();
    });

    Object.entries(countries).forEach(([country, cities]) => {
      const countryCount = countTotal(cities);

      const countryLine = createLine("country", country, countryCount);
      const countryNested = createNested();

      contNested.append(countryLine, countryNested);

      countryLine.addEventListener("click", (e) => {
        e.stopPropagation();
        toggle(countryLine, countryNested, ".country");

        // ✅ set location filter + run search
        setLocationFilter({ continent, country, city: null });
        runSearch();
      });

      Object.entries(cities).forEach(([city, count]) => {
        const cityLine = createLine("city", city, count);
        countryNested.append(cityLine);

        cityLine.addEventListener("click", (e) => {
          e.stopPropagation();

          // ✅ set location filter + run search
          setLocationFilter({ continent, country, city });
          runSearch();
        });
      });
    });
  });
}

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

  // NOTE: keep exact markup you had (label, pill, arrow)
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

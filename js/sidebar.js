// ============================================================
// SIDEBAR.JS — WCL Premium Hierarchy Navigation (USA = State level)
// Single search pipeline via setLocationFilter + runSearch
// ============================================================

import { setLocationFilter, runSearch, resetToHero } from "./cards.js";

const dom = (sel) => document.querySelector(sel);
const menu = dom("#sidebarMenu");

/* ============================================================
   BUILD SIDEBAR HIERARCHY (DEDUPED, USA HAS STATE LEVEL)
   ============================================================ */
export async function buildFrontendSidebar(supabase) {
  if (!menu) return;
  menu.innerHTML = "Loading…";

  const { data, error } = await supabase
    .from("stores_frontend_public_v4")
    .select("id, continent, country, state, city")
    .order("continent")
    .order("country")
    .order("state")
    .order("city");

  if (error) {
    console.error(error);
    menu.innerHTML = "Failed to load menu.";
    return;
  }

  // ============================================================
  // DEDUP — one store = one count
  // ============================================================
  const uniqueStores = Array.from(
    new Map((data || []).map((s) => [s.id, s])).values()
  );

  // ============================================================
  // BUILD TREE
  // Structure:
  // continent
  //   └─ country
  //       ├─ (USA) state -> city
  //       └─ (else) city
  // ============================================================
  const tree = {};

  uniqueStores.forEach((row) => {
    const { continent, country, state, city } = row;
    if (!continent || !country) return;

    if (!tree[continent]) tree[continent] = {};
    if (!tree[continent][country]) tree[continent][country] = {};

    // 🇺🇸 United States → state → city
    if (country === "United States") {
      const st = state || "Unknown";
      if (!tree[continent][country][st]) {
        tree[continent][country][st] = {};
      }
      if (city) {
        tree[continent][country][st][city] =
          (tree[continent][country][st][city] || 0) + 1;
      }
    }
    // 🌍 All other countries → city
    else {
      if (city) {
        tree[continent][country][city] =
          (tree[continent][country][city] || 0) + 1;
      }
    }
  });

  // ============================================================
  // RENDER SIDEBAR
  // ============================================================
  menu.innerHTML = "";

  Object.entries(tree).forEach(([continent, countries]) => {
    const continentCount = countTotal(countries);
    const contLine = createLine("continent", continent, continentCount);
    const contNested = createNested();

    menu.append(contLine, contNested);

    contLine.addEventListener("click", () => {
      toggle(contLine, contNested, ".continent");
      setLocationFilter({ continent, country: null, state: null, city: null });
      runSearch();
    });

    Object.entries(countries).forEach(([country, node]) => {
      const countryCount = countTotal(node);
      const countryLine = createLine("country", country, countryCount);
      const countryNested = createNested();

      contNested.append(countryLine, countryNested);

      countryLine.addEventListener("click", (e) => {
        e.stopPropagation();
        toggle(countryLine, countryNested, ".country");
        setLocationFilter({ continent, country, state: null, city: null });
        runSearch();
      });

      // 🇺🇸 USA → state level
      if (country === "United States") {
        Object.entries(node).forEach(([state, cities]) => {
          const stateCount = countTotal(cities);
          const stateLine = createLine("state", state, stateCount);
          const stateNested = createNested();

          countryNested.append(stateLine, stateNested);

          stateLine.addEventListener("click", (e) => {
            e.stopPropagation();
            toggle(stateLine, stateNested, ".state");
            setLocationFilter({ continent, country, state, city: null });
            runSearch();
          });

          Object.entries(cities).forEach(([city, count]) => {
            const cityLine = createLine("city", city, count);
            stateNested.append(cityLine);

            cityLine.addEventListener("click", (e) => {
              e.stopPropagation();
              setLocationFilter({ continent, country, state, city });
              runSearch();
            });
          });
        });
      }
      // 🌍 Other countries → city directly
      else {
        Object.entries(node).forEach(([city, count]) => {
          const cityLine = createLine("city", city, count);
          countryNested.append(cityLine);

          cityLine.addEventListener("click", (e) => {
            e.stopPropagation();
            setLocationFilter({ continent, country, state: null, city });
            runSearch();
          });
        });
      }
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

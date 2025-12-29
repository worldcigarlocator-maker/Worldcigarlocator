// ============================================================
// SIDEBAR.JS — WCL Premium Hierarchy Navigation (USA = State level)
// STABLE VERSION — safe with live-search + debounce
// ============================================================

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
  // ============================================================
  const tree = {};

  uniqueStores.forEach(({ continent, country, state, city }) => {
    if (!continent || !country) return;

    if (!tree[continent]) tree[continent] = {};
    if (!tree[continent][country]) tree[continent][country] = {};

    // 🇺🇸 USA → state → city
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
    // 🌍 Other countries → city
    else {
      if (city) {
        tree[continent][country][city] =
          (tree[continent][country][city] || 0) + 1;
      }
    }
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

    Object.entries(countries).forEach(([country, node]) => {
      const countryLine = createLine("country", country, countTotal(node));
      const countryNested = createNested();

      contNested.append(countryLine, countryNested);

      countryLine.addEventListener("click", (e) => {
        e.stopPropagation();
        toggle(countryLine, countryNested, ".country");
        applyLocation({ continent, country, state: null, city: null });
      });

      // 🇺🇸 USA → STATE LEVEL
      if (country === "United States") {
        Object.entries(node).forEach(([state, cities]) => {
          const stateLine = createLine("state", state, countTotal(cities));
          const stateNested = createNested();

          countryNested.append(stateLine, stateNested);

          stateLine.addEventListener("click", (e) => {
            e.stopPropagation();
            toggle(stateLine, stateNested, ".state");
            applyLocation({ continent, country, state, city: null });
          });

          Object.entries(cities).forEach(([city, count]) => {
            const cityLine = createLine("city", city, count);
            stateNested.append(cityLine);

            cityLine.addEventListener("click", (e) => {
              e.stopPropagation();
              applyLocation({ continent, country, state, city });
            });
          });
        });
      }
      // 🌍 OTHER COUNTRIES → CITY
      else {
        Object.entries(node).forEach(([city, count]) => {
          const cityLine = createLine("city", city, count);
          countryNested.append(cityLine);

          cityLine.addEventListener("click", (e) => {
            e.stopPropagation();
            applyLocation({ continent, country, state: null, city });
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

// ============================================================
// SIDEBAR.JS — WCL Premium Hierarchy Navigation (CANONICAL)
// Sidebar is STATIC. Backend is the single source of truth.
// ============================================================

console.log("🚨 ACTIVE SIDEBAR FILE LOADED (CANONICAL)");

import { setLocationFilter, runSearch } from "./cards.js";

const dom = (sel) => document.querySelector(sel);
const menu = dom("#sidebarMenu");

/* ============================================================
   INTERNAL STATE — prevent duplicate searches
   ============================================================ */
let LAST_LOCATION = { continent: null, country: null, state: null, city: null };

function sameLocation(a, b) {
  return (
    a.continent === b.continent &&
    a.country === b.country &&
    a.state === b.state &&
    a.city === b.city
  );
}

function applyLocation(next) {
  const normalized = {
    continent: next.continent ?? null,
    country: next.country ?? null,
    state: next.state ?? null,
    city: next.city ?? null,
  };

  if (sameLocation(LAST_LOCATION, normalized)) return;

  LAST_LOCATION = normalized;
  setLocationFilter(normalized);
  runSearch();
}

/* ============================================================
   FETCH ALL RPC ROWS (bypass PostgREST 1000 cap)
   ============================================================ */
async function fetchAllSidebarRows(supabase) {
  const PAGE = 1000;
  let from = 0;
  let all = [];

  while (true) {
    const { data, error } = await supabase
      .rpc("sidebar_counts_frontend_v1")
      .range(from, from + PAGE - 1);

    if (error) throw error;

    all = all.concat(data || []);

    if (!data || data.length < PAGE) break;
    from += PAGE;
  }

  return all;
}

/* ============================================================
   BUILD SIDEBAR — CANONICAL (continent → country → state → city)
   ============================================================ */
export async function buildFrontendSidebar(supabase) {
  if (!menu) return;
  menu.innerHTML = "Loading…";

  let data = [];
  try {
    data = await fetchAllSidebarRows(supabase);
  } catch (e) {
    console.error("❌ Sidebar RPC error:", e);
    menu.innerHTML = "Failed to load sidebar.";
    return;
  }

  // ----------------------------------------------------------
  // TREE STRUCTURE
  // ----------------------------------------------------------
  const tree = {};

  for (const row of data) {
    const continent = row.continent ?? "Unknown";
    const country   = row.country ?? "Unknown";
    const state     = row.state ?? "Unknown";
    const city      = row.city ?? "Unknown";
    const count     = Number(row.count || 0);

    if (!tree[continent]) tree[continent] = { count: 0, countries: {} };
    tree[continent].count += count;

    if (!tree[continent].countries[country]) {
      tree[continent].countries[country] = { count: 0, states: {} };
    }
    tree[continent].countries[country].count += count;

    if (!tree[continent].countries[country].states[state]) {
      tree[continent].countries[country].states[state] = { count: 0, cities: {} };
    }
    tree[continent].countries[country].states[state].count += count;

    tree[continent].countries[country].states[state].cities[city] =
      (tree[continent].countries[country].states[state].cities[city] || 0) + count;
  }

  // ----------------------------------------------------------
  // RENDER
  // ----------------------------------------------------------
  menu.innerHTML = "";

  Object.entries(tree).forEach(([continent, cData]) => {
    const contLine = createLine("continent", continent, cData.count);
    const contNested = createNested();
    menu.append(contLine, contNested);

    contLine.addEventListener("click", () => {
      applyLocation({ continent });
    });

    Object.entries(cData.countries).forEach(([country, coData]) => {
      const countryLine = createLine("country", country, coData.count);
      const countryNested = createNested();
      contNested.append(countryLine, countryNested);

      countryLine.addEventListener("click", (e) => {
        e.stopPropagation();
        toggle(countryLine, countryNested, ".country");
        applyLocation({ continent, country });
        countryNested.classList.add("group-active");
      });

      Object.entries(coData.states).forEach(([state, sData]) => {
        const stateLine = createLine("state", state, sData.count);
        const stateNested = createNested();
        countryNested.append(stateLine, stateNested);

        stateLine.addEventListener("click", (e) => {
          e.stopPropagation();
          toggle(stateLine, stateNested, ".state");
          applyLocation({ continent, country, state });
        });

        Object.entries(sData.cities).forEach(([city, count]) => {
          const cityLine = createLine("city", city, count);
          stateNested.append(cityLine);

          cityLine.addEventListener("click", (e) => {
            e.stopPropagation();
            applyLocation({ continent, country, state, city });
          });
        });
      });
    });
  });
}

/* ============================================================
   UI HELPERS
   ============================================================ */
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
   TOGGLE — one open per level (country/state)
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
      nest.classList.remove("group-active");
    }
  });
}

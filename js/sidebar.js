// ============================================================
// SIDEBAR.JS — WCL Premium Hierarchy Navigation (CANONICAL)
// Sidebar is STATIC. Backend is the single source of truth.
// Levels: Continent → Country → State
// ============================================================

console.log("🚨 ACTIVE SIDEBAR FILE LOADED (CANONICAL)");

import { setLocationFilter, runSearch } from "./cards.js";

const dom = (sel) => document.querySelector(sel);
const menu = dom("#sidebarMenu");

/* ============================================================
   INTERNAL STATE — prevent duplicate searches
   ============================================================ */
let LAST_LOCATION = {
  continent: null,
  country: null,
  state: null,
};

function sameLocation(a, b) {
  return (
    a.continent === b.continent &&
    a.country === b.country &&
    a.state === b.state
  );
}

function applyLocation(next) {
  const normalized = {
    continent: next.continent ?? null,
    country: next.country ?? null,
    state: next.state ?? null,
  };

  if (sameLocation(LAST_LOCATION, normalized)) return;

  LAST_LOCATION = normalized;
  setLocationFilter(normalized);
  runSearch();
}

/* ============================================================
   BUILD SIDEBAR — CANONICAL
   NO frontend aggregation
   ============================================================ */
export async function buildFrontendSidebar(supabase) {
  if (!menu) return;
  menu.innerHTML = "Loading…";

  const { data, error } = await supabase.rpc(
    "sidebar_counts_frontend_v2"
  );

  console.log("SIDEBAR RAW DATA:", data?.length, data);

  if (error) {
    console.error("❌ Sidebar RPC error:", error);
    menu.innerHTML = "Failed to load sidebar.";
    return;
  }

  // ----------------------------------------------------------
  // TREE STRUCTURE (continent → country → state)
  // ----------------------------------------------------------
  const tree = {};

  data.forEach(({ continent, country, state, count }) => {
    if (!continent || !country || !state) return;

    if (!tree[continent]) {
      tree[continent] = { count: 0, countries: {} };
    }
    tree[continent].count += count;

    if (!tree[continent].countries[country]) {
      tree[continent].countries[country] = {
        count: 0,
        states: {},
      };
    }
    tree[continent].countries[country].count += count;

    tree[continent].countries[country].states[state] = {
      count,
    };
  });

  // ----------------------------------------------------------
  // RENDER
  // ----------------------------------------------------------
  menu.innerHTML = "";

  Object.entries(tree).forEach(([continent, cData]) => {
    const contLine = createLine("continent", continent, cData.count);
    const contNested = createNested();

    menu.append(contLine, contNested);

    contLine.addEventListener("click", () => {
      toggle(contLine, contNested, ".continent");
      applyLocation({ continent });
    });

    Object.entries(cData.countries).forEach(([country, coData]) => {
      const countryLine = createLine(
        "country",
        country,
        coData.count
      );
      const countryNested = createNested();

      contNested.append(countryLine, countryNested);

      countryLine.addEventListener("click", (e) => {
        e.stopPropagation();
        toggle(countryLine, countryNested, ".country");
        applyLocation({ continent, country });
      });

      Object.entries(coData.states).forEach(([state, sData]) => {
        const stateLine = createLine(
          "state",
          state,
          sData.count
        );

        countryNested.append(stateLine);

        stateLine.addEventListener("click", (e) => {
          e.stopPropagation();
          applyLocation({ continent, country, state });
        });
      });
    });
  });

  console.log("✅ Sidebar built correctly");
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
    ${type !== "state" ? `<span class="arrow">›</span>` : ""}
  `;
  return el;
}

function createNested() {
  const el = document.createElement("div");
  el.className = "nested";
  return el;
}

/* ============================================================
   TOGGLE — one open per level
   ============================================================ */
function toggle(clickedItem, clickedNested, selector) {
  const allItems = document.querySelectorAll(selector);
  const allNesteds = [...allItems].map(
    (i) => i.nextElementSibling
  );

  allItems.forEach((item, i) => {
    const nest = allNesteds[i];
    if (!nest) return;

    if (item === clickedItem) {
      const open = item.classList.contains("open");
      item.classList.toggle("open", !open);
      nest.classList.toggle("show", !open);
    } else {
      item.classList.remove("open");
      nest.classList.remove("show");
    }
  });
}

// ============================================================
// SIDEBAR.JS — WCL Hierarchy
// CANONICAL · STRUCTURE-FIRST · CSS-DRIVEN
// ============================================================

import { setLocationFilter, runSearch } from "./cards.js";

const menu = document.querySelector("#sidebarMenu");
if (!menu) {
  console.warn("sidebarMenu not found");
}

/* ============================================================
   INTERNAL STATE — SINGLE SOURCE OF TRUTH
   ============================================================ */
let ACTIVE_PATH = {
  continent: null,
  country: null,
  state: null,
  city: null,
};

/* ============================================================
   FETCH — ALL ROWS (BYPASS 1000 LIMIT)
   ============================================================ */
async function fetchAllRows(supabase) {
  const PAGE = 1000;
  let from = 0;
  let rows = [];

  while (true) {
    const { data, error } = await supabase
      .rpc("sidebar_counts_frontend_v1")
      .range(from, from + PAGE - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    rows.push(...data);
    if (data.length < PAGE) break;

    from += PAGE;
  }

  return rows;
}

/* ============================================================
   BUILD TREE — STRICT (NO UNKNOWN)
   ============================================================ */
function buildTree(rows) {
  const tree = {};

  for (const r of rows) {
    const continent = r.continent;
    const country   = r.country;
    const state     = r.state;
    const city      = r.city;
    const count     = Number(r.count || 0);

    if (
      !continent || continent === "Unknown" ||
      !country   || country   === "Unknown"
    ) continue;

    tree[continent] ??= { count: 0, countries: {} };
    tree[continent].count += count;

    tree[continent].countries[country] ??= { count: 0, states: {} };
    tree[continent].countries[country].count += count;

    if (state && state !== "Unknown") {
      tree[continent].countries[country].states[state] ??= {
        count: 0,
        cities: {}
      };
      tree[continent].countries[country].states[state].count += count;

      if (city && city !== "Unknown") {
        tree[continent].countries[country].states[state].cities[city] =
          (tree[continent].countries[country].states[state].cities[city] || 0) + count;
      }
    }
  }

  return tree;
}

/* ============================================================
   APPLY LOCATION — SINGLE ENTRY POINT
   ============================================================ */
function applyLocation(next) {
  ACTIVE_PATH = {
    continent: next.continent ?? null,
    country:   next.country   ?? null,
    state:     next.state     ?? null,
    city:      next.city      ?? null,
  };

  setLocationFilter(ACTIVE_PATH);
  runSearch();
  updateActiveClasses();
}

/* ============================================================
   RENDER SIDEBAR
   ============================================================ */
export async function buildFrontendSidebar(supabase) {
  if (!menu) return;

  menu.innerHTML = "Loading…";

  let rows;
  try {
    rows = await fetchAllRows(supabase);
  } catch (e) {
    console.error("Sidebar RPC failed", e);
    menu.innerHTML = "Failed to load sidebar";
    return;
  }

  const tree = buildTree(rows);
  menu.innerHTML = "";

  Object.entries(tree).forEach(([continent, cData]) => {
    const contLine = createLine("continent", continent, cData.count);
    contLine.classList.add("open");

    const contChildren = createChildren(true); // open by default

    contLine.onclick = () =>
      applyLocation({ continent, country: null, state: null, city: null });

    menu.append(contLine, contChildren);

    Object.entries(cData.countries).forEach(([country, coData]) => {
      const coLine = createLine("country", country, coData.count);
      const coChildren = createChildren(false);

      coLine.querySelector(".arrow").onclick = (e) => {
        e.stopPropagation();
        toggle(coLine, coChildren);
      };

      coLine.onclick = () =>
        applyLocation({ continent, country, state: null, city: null });

      contChildren.append(coLine, coChildren);

      Object.entries(coData.states).forEach(([state, sData]) => {
        const stLine = createLine("state", state, sData.count);
        const stChildren = createChildren(false);

        stLine.querySelector(".arrow").onclick = (e) => {
          e.stopPropagation();
          toggle(stLine, stChildren);
        };

        stLine.onclick = () =>
          applyLocation({ continent, country, state, city: null });

        coChildren.append(stLine, stChildren);

        Object.entries(sData.cities).forEach(([city, count]) => {
          const ctLine = createLine("city", city, count);
          ctLine.onclick = () =>
            applyLocation({ continent, country, state, city });

          stChildren.append(ctLine);
        });
      });
    });
  });

  updateActiveClasses();
}

/* ============================================================
   UI HELPERS
   ============================================================ */
function createLine(type, label, count) {
  const el = document.createElement("div");
  el.className = `line ${type}`;
  el.dataset.label = label;

  el.innerHTML = `
    <span class="arrow">${type === "city" ? "•" : "▸"}</span>
    <span class="label">${label}</span>
    <span class="pill">${count}</span>
  `;

  return el;
}

function createChildren(open) {
  const el = document.createElement("div");
  el.className = "nested" + (open ? " show" : "");
  return el;
}

/* ============================================================
   TOGGLE OPEN / CLOSE
   ============================================================ */
function toggle(line, children) {
  const isOpen = line.classList.toggle("open");
  children.classList.toggle("show", isOpen);
}

/* ============================================================
   ACTIVE PATH — GOLD TEXT ONLY
   ============================================================ */
function updateActiveClasses() {
  const labels = Object.values(ACTIVE_PATH).filter(Boolean);

  menu.querySelectorAll(".line").forEach((el) => {
    el.classList.toggle(
      "active",
      labels.includes(el.dataset.label)
    );
  });
}

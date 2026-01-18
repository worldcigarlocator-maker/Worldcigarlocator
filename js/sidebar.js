// ============================================================
// SIDEBAR.JS — WCL Hierarchy (CANONICAL, STRUCTURE-FIRST)
// ============================================================

import { setLocationFilter, runSearch } from "./cards.js";

const menu = document.querySelector("#sidebarMenu");

/* ============================================================
   INTERNAL STATE
   ============================================================ */
let ACTIVE_PATH = {
  continent: null,
  country: null,
  state: null,
  city: null,
};

/* ============================================================
   FETCH — ALL ROWS (NO 1000 CAP)
   ============================================================ */
async function fetchAllRows(supabase) {
  const PAGE = 1000;
  let from = 0;
  let all = [];

  while (true) {
    const { data, error } = await supabase
      .rpc("sidebar_counts_frontend_v1")
      .range(from, from + PAGE - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    all.push(...data);
    if (data.length < PAGE) break;

    from += PAGE;
  }

  return all;
}

/* ============================================================
   BUILD TREE
   ============================================================ */
function buildTree(rows) {
  const tree = {};

  rows.forEach(r => {
    const continent = r.continent;
    const country   = r.country;
    const state     = r.state;
    const city      = r.city;
    const count     = Number(r.count || 0);

    // ❌ Drop Unknown completely
    if (
      !continent || continent === "Unknown" ||
      !country   || country   === "Unknown"
    ) return;

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
  });

  return tree;
}

/* ============================================================
   APPLY LOCATION (SINGLE SOURCE)
   ============================================================ */
function applyLocation(path) {
  ACTIVE_PATH = { ...ACTIVE_PATH, ...path };
  setLocationFilter(ACTIVE_PATH);
  runSearch();
  updateActiveClasses();
}

/* ============================================================
   RENDER
   ============================================================ */
export async function buildFrontendSidebar(supabase) {
  if (!menu) return;

  menu.innerHTML = "Loading…";

  let rows;
  try {
    rows = await fetchAllRows(supabase);
  } catch (e) {
    console.error("Sidebar RPC failed", e);
    menu.innerHTML = "Failed to load";
    return;
  }

  const tree = buildTree(rows);
  menu.innerHTML = "";

  Object.entries(tree).forEach(([continent, cData]) => {
    const cont = createNode("continent", continent, cData.count);
    cont.classList.add("open"); // ✅ open by default

    const contWrap = document.createElement("div");
    contWrap.className = "node";

    const contChildren = document.createElement("div");
    contChildren.className = "children show";

    cont.onclick = () => applyLocation({
      continent,
      country: null,
      state: null,
      city: null
    });

    contWrap.append(cont, contChildren);
    menu.append(contWrap);

    Object.entries(cData.countries).forEach(([country, coData]) => {
      const co = createNode("country", country, coData.count);
      const coChildren = document.createElement("div");
      coChildren.className = "children";

      co.querySelector(".arrow").onclick = e => {
        e.stopPropagation();
        toggle(co, coChildren);
      };

      co.onclick = () => applyLocation({
        continent,
        country,
        state: null,
        city: null
      });

      contChildren.append(co, coChildren);

      Object.entries(coData.states).forEach(([state, sData]) => {
        const st = createNode("state", state, sData.count);
        const stChildren = document.createElement("div");
        stChildren.className = "children";

        st.querySelector(".arrow").onclick = e => {
          e.stopPropagation();
          toggle(st, stChildren);
        };

        st.onclick = () => applyLocation({
          continent,
          country,
          state,
          city: null
        });

        coChildren.append(st, stChildren);

        Object.entries(sData.cities).forEach(([city, count]) => {
          const ct = createNode("city", city, count);
          ct.onclick = () => applyLocation({
            continent,
            country,
            state,
            city
          });
          stChildren.append(ct);
        });
      });
    });
  });

  updateActiveClasses();
}

/* ============================================================
   NODE FACTORY
   ============================================================ */
function createNode(type, label, count) {
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

/* ============================================================
   TOGGLE
   ============================================================ */
function toggle(line, children) {
  const open = line.classList.toggle("open");
  children.classList.toggle("show", open);
}

/* ============================================================
   ACTIVE PATH HIGHLIGHT
   ============================================================ */
function updateActiveClasses() {
  document
    .querySelectorAll("#sidebarMenu .line")
    .forEach(el => {
      const label = el.dataset.label;
      el.classList.toggle(
        "active",
        label === ACTIVE_PATH.continent ||
        label === ACTIVE_PATH.country ||
        label === ACTIVE_PATH.state ||
        label === ACTIVE_PATH.city
      );
    });
}

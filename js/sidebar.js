// ============================================================
// SIDEBAR.JS — WCL Sidebar Hierarchy (CANONICAL FINAL)
// ============================================================

import { setLocationFilter, runSearch } from "./cards.js";

const menu = document.querySelector("#sidebarMenu");

/* ============================================================
   STATE
   ============================================================ */
let ACTIVE_PATH = {
  continent: null,
  country: null,
  state: null,
  city: null,
};

/* ============================================================
   FETCH ALL ROWS (NO 1000 CAP)
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
   BUILD TREE (COUNT LOGIC UNCHANGED)
   ============================================================ */
function buildTree(rows) {
  const tree = {};

  rows.forEach(r => {
    const {
      continent,
      country,
      country_iso2,
      state,
      city,
      count
    } = r;

    if (!continent || !country) return;

    tree[continent] ??= { count: 0, countries: {} };
    tree[continent].count += Number(count);

    tree[continent].countries[country] ??= {
      count: 0,
      iso2: country_iso2 || null,
      states: {}
    };
    tree[continent].countries[country].count += Number(count);

    if (state) {
      tree[continent].countries[country].states[state] ??= {
        count: 0,
        cities: {}
      };
      tree[continent].countries[country].states[state].count += Number(count);

      if (city) {
        tree[continent].countries[country].states[state].cities[city] =
          (tree[continent].countries[country].states[state].cities[city] || 0) +
          Number(count);
      }
    }
  });

  return tree;
}

/* ============================================================
   APPLY LOCATION
   ============================================================ */
function applyLocation(next) {
  ACTIVE_PATH = { ...ACTIVE_PATH, ...next };
  setLocationFilter(ACTIVE_PATH);
  runSearch();
  updateActiveClasses();
}

/* ============================================================
   BUILD SIDEBAR
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
    const cont = createLine({
      type: "continent",
      label: continent,
      count: cData.count
    });

    const contChildren = createChildren(true);
    cont.classList.add("open");

    cont.addEventListener("click", () =>
      applyLocation({ continent, country: null, state: null, city: null })
    );

    menu.append(cont, contChildren);

    Object.entries(cData.countries).forEach(([country, coData]) => {
      const co = createLine({
        type: "country",
        label: country,
        count: coData.count,
        iso2: coData.iso2
      });

      const coChildren = createChildren();

      co.querySelector(".arrow")?.addEventListener("click", e => {
        e.stopPropagation();
        toggle(co, coChildren);
      });

      co.addEventListener("click", () =>
        applyLocation({ continent, country, state: null, city: null })
      );

      contChildren.append(co, coChildren);

      Object.entries(coData.states).forEach(([state, sData]) => {
        const st = createLine({
          type: "state",
          label: state,
          count: sData.count
        });

        const stChildren = createChildren();

        st.querySelector(".arrow")?.addEventListener("click", e => {
          e.stopPropagation();
          toggle(st, stChildren);
        });

        st.addEventListener("click", () =>
          applyLocation({ continent, country, state, city: null })
        );

        coChildren.append(st, stChildren);

        Object.entries(sData.cities).forEach(([city, count]) => {
          const ct = createLine({
            type: "city",
            label: city,
            count
          });

          ct.addEventListener("click", () =>
            applyLocation({ continent, country, state, city })
          );

          stChildren.append(ct);
        });
      });
    });
  });

  updateActiveClasses();
}

/* ============================================================
   LINE FACTORY (GRID-COMPATIBLE)
   ============================================================ */
function createLine({ type, label, count, iso2 = null }) {
  const el = document.createElement("div");
  el.className = `line ${type}`;
  el.dataset.label = label;

  const flag =
    type === "country" && iso2
      ? `<img class="flag" src="assets/flags/${iso2.toLowerCase()}.svg"
              alt="" onerror="this.style.display='none'">`
      : "";

  el.innerHTML = `
    <span class="arrow">${type === "city" ? "•" : "▸"}</span>
    <span class="label-wrap">
      ${flag}
      <span class="label">${label}</span>
    </span>
    <span class="pill">${count}</span>
  `;

  return el;
}

function createChildren(show = false) {
  const el = document.createElement("div");
  el.className = "children" + (show ? " show" : "");
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
   ACTIVE PATH
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

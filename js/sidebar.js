// ============================================================
// SIDEBAR.JS — WCL Sidebar Hierarchy (v2, CANONICAL)
// ============================================================

import { setLocationFilter, runSearch } from "./cards.js";

const menu = document.querySelector("#sidebarMenu");

// ============================================================
// STATE
// ============================================================
let ACTIVE_PATH = {
  continent: null,
  country: null,
  state: null,
  city: null,
};

// ============================================================
// HELPERS
// ============================================================
const sortAZ = (a, b) =>
  String(a).localeCompare(String(b), undefined, { sensitivity: "base" });

// ============================================================
// FETCH — canonical frontend-safe hierarchy
// ============================================================
async function fetchRows(supabase) {
  const { data, error } = await supabase.rpc("sidebar_hierarchy_v2");
  if (error) throw error;
  return data || [];
}

// ============================================================
// BUILD TREE — v2 rows are already aggregated
// ============================================================
function buildTree(rows) {
  const tree = {};

  rows.forEach(r => {
    const { level, continent, country, state, city, count, country_iso2 } = r;
    if (!continent) return;

    // ---------- CONTINENT ----------
    tree[continent] ??= { count: 0, countries: {} };

    if (level === "continent") {
      tree[continent].count = Number(count);
      return;
    }

    if (!country) return;

    // ---------- COUNTRY ----------
    tree[continent].countries[country] ??= {
      count: 0,
      iso2: country_iso2 || null,
      states: {}
    };

    if (level === "country") {
      tree[continent].countries[country].count = Number(count);
      return;
    }

    if (!state) return;

    // ---------- STATE ----------
    tree[continent].countries[country].states[state] ??= {
      count: 0,
      cities: {}
    };

    if (level === "state") {
      tree[continent].countries[country].states[state].count = Number(count);
      return;
    }

    if (!city) return;

    // ---------- CITY ----------
    if (level === "city") {
      tree[continent]
        .countries[country]
        .states[state]
        .cities[city] = Number(count);
    }
  });

  return tree;
}

// ============================================================
// APPLY LOCATION — single source of truth
// ============================================================
function applyLocation(next) {
  ACTIVE_PATH = { ...ACTIVE_PATH, ...next };
  setLocationFilter(ACTIVE_PATH);
  runSearch();
  updateActiveClasses();
}

// ============================================================
// BUILD SIDEBAR
// ============================================================
export async function buildFrontendSidebar(supabase) {
  if (!menu) return;

  menu.innerHTML = "Loading…";

  let rows;
  try {
    rows = await fetchRows(supabase);
  } catch (e) {
    console.error("Sidebar load failed", e);
    menu.innerHTML = "Failed to load";
    return;
  }

  const tree = buildTree(rows);
  menu.innerHTML = "";

  Object.entries(tree)
    .sort(([a], [b]) => sortAZ(a, b))
    .forEach(([continent, cData]) => {
      const cont = createLine({
        type: "continent",
        label: continent,
        count: cData.count
      });

      const contChildren = createChildren(true);
      cont.classList.add("open");

      cont.onclick = () =>
        applyLocation({ continent, country: null, state: null, city: null });

      menu.append(cont, contChildren);

      Object.entries(cData.countries)
        .sort(([a], [b]) => sortAZ(a, b))
        .forEach(([country, coData]) => {
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

          co.onclick = () =>
            applyLocation({ continent, country, state: null, city: null });

          contChildren.append(co, coChildren);

          Object.entries(coData.states)
            .sort(([a], [b]) => sortAZ(a, b))
            .forEach(([state, sData]) => {
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

              st.onclick = () =>
                applyLocation({ continent, country, state, city: null });

              coChildren.append(st, stChildren);

              Object.entries(sData.cities)
                .sort(([a], [b]) => sortAZ(a, b))
                .forEach(([city, count]) => {
                  const ct = createLine({
                    type: "city",
                    label: city,
                    count
                  });

                  ct.onclick = () =>
                    applyLocation({ continent, country, state, city });

                  stChildren.append(ct);
                });
            });
        });
    });

  updateActiveClasses();
}

// ============================================================
// LINE FACTORY
// ============================================================
function createLine({ type, label, count, iso2 = null }) {
  const el = document.createElement("div");
  el.className = `line ${type}`;
  el.dataset.label = label;

  const flag =
    type === "country" && iso2
      ? `<img class="flag"
              src="assets/flags/${iso2.toLowerCase()}.svg"
              alt=""
              onerror="this.style.display='none'">`
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

// ============================================================
// TOGGLE
// ============================================================
function toggle(line, children) {
  const open = line.classList.toggle("open");
  children.classList.toggle("show", open);
}

// ============================================================
// ACTIVE PATH HIGHLIGHT
// ============================================================
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

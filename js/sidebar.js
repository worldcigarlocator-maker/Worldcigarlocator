// ============================================================
// SIDEBAR.JS — WCL Sidebar Hierarchy (CANONICAL, FINAL)
// - State visas ENDAST för USA
// - Övriga länder: Country → City
// - Sidebar sätter LOCATION som master
// ============================================================

import { activateLocation } from "./cards.js";

const menu = document.querySelector("#sidebarMenu");

// ============================================================
// STATE (UI only)
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

const IS_USA = (country) =>
  country === "United States" || country === "United States of America";

// ============================================================
// FETCH — canonical frontend-safe hierarchy
// ============================================================
async function fetchRows(supabase) {
  const { data, error } = await supabase.rpc("sidebar_hierarchy_v2");
  if (error) throw error;
  return data || [];
}

// ============================================================
// BUILD TREE — normalized for UI rules
// ============================================================
function buildTree(rows) {
  const tree = {};

  rows.forEach((r) => {
    const {
      continent,
      country,
      state,
      city,
      count,
      country_iso2,
      level,
    } = r;

    if (!continent) return;

    const lvl = String(level || "").toLowerCase();

    // ---------- CONTINENT ----------
    tree[continent] ??= { count: 0, countries: {} };

    if (lvl === "continent") {
      tree[continent].count = Number(count);
      return;
    }

    if (!country) return;

    // ---------- COUNTRY ----------
    tree[continent].countries[country] ??= {
      count: 0,
      iso2: country_iso2 || null,
      states: {},   // used ONLY for USA
      cities: {},   // used for non-USA
    };

    const cNode = tree[continent].countries[country];

    if (lvl === "country") {
      cNode.count = Number(count);
      return;
    }

    // ---------- USA: STATE → CITY ----------
    if (IS_USA(country)) {
      if (!state) return;

      cNode.states[state] ??= { count: 0, cities: {} };

      if (lvl === "state") {
        cNode.states[state].count = Number(count);
        return;
      }

      if (lvl === "city" && city) {
        cNode.states[state].cities[city] = Number(count);
      }

      return;
    }

    // ---------- NON-USA: CITY directly under COUNTRY ----------
    if (lvl === "city" && city) {
      cNode.cities[city] = Number(count);
    }
  });

  return tree;
}

// ============================================================
// APPLY LOCATION — CANONICAL
// ============================================================
function applyLocation(next) {
  ACTIVE_PATH = { ...ACTIVE_PATH, ...next };
  activateLocation(ACTIVE_PATH);
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
        count: cData.count,
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
            iso2: coData.iso2,
          });

          const coChildren = createChildren();

          co.querySelector(".arrow")?.addEventListener("click", (e) => {
            e.stopPropagation();
            toggle(co, coChildren);
          });

          co.onclick = () =>
            applyLocation({ continent, country, state: null, city: null });

          contChildren.append(co, coChildren);

          // ---------- USA ----------
          if (IS_USA(country)) {
            Object.entries(coData.states)
              .sort(([a], [b]) => sortAZ(a, b))
              .forEach(([state, sData]) => {
                const st = createLine({
                  type: "state",
                  label: state,
                  count: sData.count,
                });

                const stChildren = createChildren();

                st.querySelector(".arrow")?.addEventListener("click", (e) => {
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
                      count,
                    });

                    ct.onclick = () =>
                      applyLocation({ continent, country, state, city });

                    stChildren.append(ct);
                  });
              });

            return;
          }

          // ---------- NON-USA ----------
          Object.entries(coData.cities)
            .sort(([a], [b]) => sortAZ(a, b))
            .forEach(([city, count]) => {
              const ct = createLine({
                type: "city",
                label: city,
                count,
              });

              ct.onclick = () =>
                applyLocation({ continent, country, state: null, city });

              coChildren.append(ct);
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
// ACTIVE PATH HIGHLIGHT (UI only)
// ============================================================
function updateActiveClasses() {
  document
    .querySelectorAll("#sidebarMenu .line")
    .forEach((el) => {
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


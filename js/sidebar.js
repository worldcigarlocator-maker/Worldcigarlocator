// ============================================================
// SIDEBAR.JS — WCL Sidebar (CANONICAL, STATIC)
// ------------------------------------------------------------
// - Loads ONCE
// - Uses backend hierarchy + counts
// - Never reacts to search or chips
// - Click = navigation only
// ============================================================

import { activateLocation } from "./cards.js";

// ============================================================
// DOM
// ============================================================
const menu = document.querySelector("#sidebarMenu");

// ============================================================
// HELPERS
// ============================================================
const sortAZ = (a, b) =>
  String(a).localeCompare(String(b), undefined, { sensitivity: "base" });

const IS_US = (iso2) => iso2?.toLowerCase() === "us";

// ============================================================
// FETCH — CANONICAL BACKEND SOURCE
// ============================================================
async function fetchSidebarData(supabase) {
  const { data, error } = await supabase.rpc("sidebar_hierarchy_v2");
  if (error) throw error;
  return data || [];
}

// ============================================================
// BUILD TREE — TRUST BACKEND 100%
// ============================================================
function buildTree(rows) {
  const tree = {};

  rows.forEach((r) => {
    const { continent, country, state, city, count, country_iso2, level } = r;

    if (!continent) return;

    tree[continent] ??= { count: 0, countries: {} };

    if (level === "continent") {
      tree[continent].count = Number(count);
      return;
    }

    if (!country) return;

    tree[continent].countries[country] ??= {
      count: 0,
      iso2: country_iso2,
      states: {},
      cities: {},
    };

    if (level === "country") {
      tree[continent].countries[country].count = Number(count);
      return;
    }

    const isUS = IS_US(country_iso2);

    if (isUS && level === "state" && state) {
      tree[continent].countries[country].states[state] ??= {
        count: Number(count),
        cities: {},
      };
      return;
    }

    if (level === "city" && city) {
      if (isUS && state) {
        tree[continent]
          .countries[country]
          .states[state]
          .cities[city] = Number(count);
      } else {
        tree[continent]
          .countries[country]
          .cities[city] = Number(count);
      }
    }
  });

  return tree;
}

// ============================================================
// PUBLIC — BUILD SIDEBAR ONCE
// ============================================================
export async function buildFrontendSidebar(supabase) {
  if (!menu) return;

  menu.innerHTML = "Loading…";

  let rows;
  try {
    rows = await fetchSidebarData(supabase);
  } catch (e) {
    console.error("❌ Sidebar failed", e);
    menu.innerHTML = "Failed to load";
    return;
  }

  const tree = buildTree(rows);
  menu.innerHTML = "";

  Object.entries(tree)
    .sort(([a], [b]) => sortAZ(a, b))
    .forEach(([continent, cData]) => {
      const cont = createLine("continent", continent, cData.count);
      const contChildren = createChildren(true);
      cont.classList.add("open");

      cont.onclick = () =>
        activateLocation({ continent, country: null, state: null, city: null });

      menu.append(cont, contChildren);

      Object.entries(cData.countries)
        .sort(([a], [b]) => sortAZ(a, b))
        .forEach(([country, coData]) => {
          const co = createLine(
            "country",
            country,
            coData.count,
            coData.iso2
          );
          const coChildren = createChildren(false);

          co.querySelector(".arrow")?.addEventListener("click", (e) => {
            e.stopPropagation();
            toggle(co, coChildren);
          });

          co.onclick = () =>
            activateLocation({
              continent,
              country,
              state: null,
              city: null,
            });

          contChildren.append(co, coChildren);

          if (IS_US(coData.iso2)) {
            Object.entries(coData.states)
              .sort(([a], [b]) => sortAZ(a, b))
              .forEach(([state, sData]) => {
                const st = createLine("state", state, sData.count);
                const stChildren = createChildren(false);

                st.querySelector(".arrow")?.addEventListener("click", (e) => {
                  e.stopPropagation();
                  toggle(st, stChildren);
                });

                st.onclick = () =>
                  activateLocation({
                    continent,
                    country,
                    state,
                    city: null,
                  });

                coChildren.append(st, stChildren);

                Object.entries(sData.cities)
                  .sort(([a], [b]) => sortAZ(a, b))
                  .forEach(([city, count]) => {
                    const ct = createLine("city", city, count);
                    ct.onclick = () =>
                      activateLocation({
                        continent,
                        country,
                        state,
                        city,
                      });
                    stChildren.append(ct);
                  });
              });

            return;
          }

          Object.entries(coData.cities)
            .sort(([a], [b]) => sortAZ(a, b))
            .forEach(([city, count]) => {
              const ct = createLine("city", city, count);
              ct.onclick = () =>
                activateLocation({
                  continent,
                  country,
                  state: null,
                  city,
                });
              coChildren.append(ct);
            });
        });
    });
}

// ============================================================
// UI HELPERS
// ============================================================
function createLine(type, label, count, iso2 = null) {
  const el = document.createElement("div");
  el.className = `line ${type}`;

  const flag =
    type === "country" && iso2
      ? `<img class="flag" src="assets/flags/${iso2.toLowerCase()}.svg">`
      : "";

  el.innerHTML = `
    <span class="arrow">${type === "city" ? "•" : "▸"}</span>
    <span class="label-wrap">${flag}<span class="label">${label}</span></span>
    <span class="pill">${count}</span>
  `;

  return el;
}

function createChildren(show = false) {
  const el = document.createElement("div");
  el.className = "children" + (show ? " show" : "");
  return el;
}

function toggle(line, children) {
  const open = line.classList.toggle("open");
  children.classList.toggle("show", open);
}

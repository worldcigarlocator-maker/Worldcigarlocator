// ============================================================
// SIDEBAR.JS — WCL Sidebar (STATIC, FINAL)
// ------------------------------------------------------------
// - Byggs EN GÅNG vid inloggning
// - Backend är single source of truth
// - Sidebar = överblick + navigation
// - Reagerar INTE på search
// ============================================================

import { activateLocation } from "./cards.js";
import { supabase } from "./globals.js";

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
// FETCH — CANONICAL BACKEND VIEW
// ============================================================
async function fetchSidebarRows() {
  const { data, error } = await supabase.rpc("sidebar_nodes_v1");
  if (error) throw error;
  return data || [];
}

// ============================================================
// BUILD SIDEBAR (STATIC)
// ============================================================
export async function buildFrontendSidebar() {
  if (!menu) return;

  menu.innerHTML = "Loading…";

  let rows;
  try {
    rows = await fetchSidebarRows();
  } catch (e) {
    console.error("❌ Sidebar load failed", e);
    menu.innerHTML = "Failed to load";
    return;
  }

  menu.innerHTML = "";

  const continents = {};

  rows.forEach((r) => {
    const {
      continent,
      country,
      country_iso2,
      state,
      city,
      level,
    } = r;

    const n = Number(r.count) || 0;

    continents[continent] ??= { count: 0, countries: {} };
    continents[continent].count += n;

    if (level === "continent") return;

    continents[continent].countries[country] ??= {
      iso2: country_iso2,
      count: 0,
      states: {},
      cities: {},
    };
    continents[continent].countries[country].count += n;

    if (level === "country") return;

    const isUS = IS_US(country_iso2);

    if (isUS && state) {
      continents[continent].countries[country].states[state] ??= {
        count: 0,
        cities: {},
      };
      continents[continent].countries[country].states[state].count += n;

      if (level === "city") {
        continents[continent].countries[country].states[state].cities[city] = n;
      }
    } else {
      if (level === "city") {
        continents[continent].countries[country].cities[city] = n;
      }
    }
  });

  // ==========================================================
  // RENDER
  // ==========================================================
  Object.entries(continents)
    .sort(([a], [b]) => sortAZ(a, b))
    .forEach(([continent, cData]) => {
      const cont = createLine("continent", continent, cData.count);
      const contChildren = createChildren(true);
      cont.classList.add("open");

      cont.onclick = () =>
        activateLocation({
          continent,
          country: null,
          state: null,
          city: null,
        });

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

          const isUS = IS_US(coData.iso2);

          if (isUS) {
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
                  .forEach(([city, n]) => {
                    const ct = createLine("city", city, n);
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
          } else {
            Object.entries(coData.cities)
              .sort(([a], [b]) => sortAZ(a, b))
              .forEach(([city, n]) => {
                const ct = createLine("city", city, n);
                ct.onclick = () =>
                  activateLocation({
                    continent,
                    country,
                    state: null,
                    city,
                  });
                coChildren.append(ct);
              });
          }
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
      ? `<img class="flag" src="assets/flags/${iso2.toLowerCase()}.svg" />`
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

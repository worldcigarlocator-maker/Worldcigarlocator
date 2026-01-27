// ============================================================
// SIDEBAR.JS — WCL Sidebar (STATIC, FINAL, CANONICAL)
// ============================================================
// - Byggs EN GÅNG efter auth
// - Backend: sidebar_nodes_v2 (single source of truth)
// - Sidebar = navigation + overview
// - Påverkas ALDRIG av search
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
// FETCH — CANONICAL RPC
// ============================================================
async function fetchSidebarRows() {
  const { data, error } = await supabase.rpc("sidebar_nodes_v2");
  if (error) throw error;
  return data || [];
}

// ============================================================
// ENTRY POINT
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
    const { continent, country, country_iso2, state, city, level, count } = r;
    const n = Number(count) || 0;

    if (level === "continent") {
      continents[continent] = { count: n, countries: {} };
      return;
    }

    continents[continent] ??= { count: 0, countries: {} };

    if (level === "country") {
      continents[continent].countries[country] = {
        iso2: country_iso2,
        count: n,
        states: {},
        cities: {},
      };
      return;
    }

    continents[continent].countries[country] ??= {
      iso2: country_iso2,
      count: 0,
      states: {},
      cities: {},
    };

    const isUS = IS_US(country_iso2);

    if (level === "state" && isUS && state) {
      continents[continent].countries[country].states[state] = {
        count: n,
        cities: {},
      };
      return;
    }

    if (level === "city") {
      if (isUS && state) {
        continents[continent].countries[country].states[state] ??= {
          count: 0,
          cities: {},
        };
        continents[continent].countries[country].states[state].cities[city] = n;
      } else {
        continents[continent].countries[country].cities[city] = n;
      }
    }
  });

  renderSidebar(continents);
}

// ============================================================
// RENDER
// ============================================================
function renderSidebar(continents) {
  Object.entries(continents)
    .sort(([a], [b]) => sortAZ(a, b))
    .forEach(([continent, cData]) => {
      const cont = createLine("continent", continent, cData.count);
      const contChildren = createChildren();

      bindRowToggle(cont, contChildren);

      cont.querySelector(".label-wrap")?.addEventListener("click", () => {
        setActivePath(cont);
        activateLocation({ continent, country: null, state: null, city: null });
      });

      menu.append(cont, contChildren);

      Object.entries(cData.countries)
        .sort(([a], [b]) => sortAZ(a, b))
        .forEach(([country, coData]) => {
          const co = createLine("country", country, coData.count, coData.iso2);
          const coChildren = createChildren();

          bindRowToggle(co, coChildren);

          co.querySelector(".label-wrap")?.addEventListener("click", () => {
            setActivePath(co);
            activateLocation({
              continent,
              country,
              state: null,
              city: null,
            });
          });

          contChildren.append(co, coChildren);

          if (IS_US(coData.iso2)) {
            Object.entries(coData.states)
              .sort(([a], [b]) => sortAZ(a, b))
              .forEach(([state, sData]) => {
                const st = createLine("state", state, sData.count);
                const stChildren = createChildren();

                bindRowToggle(st, stChildren);

                st.querySelector(".label-wrap")?.addEventListener("click", () => {
                  setActivePath(st);
                  activateLocation({
                    continent,
                    country,
                    state,
                    city: null,
                  });
                });

                coChildren.append(st, stChildren);

                Object.entries(sData.cities)
                  .sort(([a], [b]) => sortAZ(a, b))
                  .forEach(([city, n]) => {
                    const ct = createLine("city", city, n);

                    ct.addEventListener("click", () => {
                      setActivePath(ct);
                      activateLocation({
                        continent,
                        country,
                        state,
                        city,
                      });
                    });

                    stChildren.append(ct);
                  });
              });
          } else {
            Object.entries(coData.cities)
              .sort(([a], [b]) => sortAZ(a, b))
              .forEach(([city, n]) => {
                const ct = createLine("city", city, n);

                ct.addEventListener("click", () => {
                  setActivePath(ct);
                  activateLocation({
                    continent,
                    country,
                    state: null,
                    city,
                  });
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

function createChildren() {
  const el = document.createElement("div");
  el.className = "children";
  return el;
}

function toggle(line, children) {
  const open = line.classList.toggle("open");
  children.classList.toggle("show", open);
}

// Klick var som helst på raden (utom label)
// → öppna / stäng
function bindRowToggle(line, children) {
  line.addEventListener("click", (e) => {
    if (e.target.closest(".label-wrap")) return;
    toggle(line, children);
  });
}

// ============================================================
// ACTIVE PATH — HIGHLIGHT + AUTO-EXPAND
// ============================================================
function setActivePath(lineEl) {
  document
    .querySelectorAll("#sidebarMenu .line.active")
    .forEach((el) => el.classList.remove("active"));

 

  let el = lineEl;

  while (el && el !== document) {
    if (el.classList.contains("line")) el.classList.add("active");
    if (el.classList.contains("children")) el.classList.add("show");
    el = el.parentElement;
  }
}

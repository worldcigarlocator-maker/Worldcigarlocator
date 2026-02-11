// ============================================================
// SIDEBAR.JS — WCL Sidebar (CANONICAL · STABLE TOGGLES)
// ============================================================
// - Built once after auth
// - Backend: sidebar_nodes_v2 (single source of truth)
// - Toggle ONLY on arrow (or row whitespace)
// - Label click = activateLocation (never toggles)
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

    if (level === "city" && city) {
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
  bindSidebarEvents(); // 🔑 single delegated listener
}

// ============================================================
// RENDER
// ============================================================
function renderSidebar(continents) {
  Object.entries(continents)
    .sort(([a], [b]) => sortAZ(a, b))
    .forEach(([continent, cData]) => {
      const cont = createLine("continent", continent, cData.count, null, {
        continent,
      });
      const contChildren = createChildren();

      menu.append(cont, contChildren);

      Object.entries(cData.countries)
        .sort(([a], [b]) => sortAZ(a, b))
        .forEach(([country, coData]) => {
          const co = createLine("country", country, coData.count, coData.iso2, {
            continent,
            country,
          });
          const coChildren = createChildren();

          contChildren.append(co, coChildren);

          if (IS_US(coData.iso2)) {
            Object.entries(coData.states)
              .sort(([a], [b]) => sortAZ(a, b))
              .forEach(([state, sData]) => {
                const st = createLine("state", state, sData.count, null, {
                  continent,
                  country,
                  state,
                });
                const stChildren = createChildren();

                coChildren.append(st, stChildren);

                Object.entries(sData.cities)
                  .sort(([a], [b]) => sortAZ(a, b))
                  .forEach(([city, n]) => {
                    const ct = createLine("city", city, n, null, {
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
                const ct = createLine("city", city, n, null, {
                  continent,
                  country,
                  city,
                });
                coChildren.append(ct);
              });
          }
        });
    });
}

// ============================================================
// UI BUILDERS
// ============================================================
function createLine(type, label, count, iso2 = null, path = {}) {
  const el = document.createElement("div");
  el.className = `line ${type}`;

  // dataset path for activateLocation
  el.dataset.level = type;
  el.dataset.continent = path.continent ?? "";
  el.dataset.country = path.country ?? "";
  el.dataset.state = path.state ?? "";
  el.dataset.city = path.city ?? "";

  const flag =
    type === "country" && iso2
      ? `<img class="flag" src="assets/flags/${iso2.toLowerCase()}.svg" />`
      : "";

  el.innerHTML = `
    <span class="arrow" role="button" aria-label="Toggle">
      ${type === "city" ? "•" : "▸"}
    </span>
    <span class="label-wrap">
      ${flag}<span class="label">${label}</span>
    </span>
    <span class="pill">${count}</span>
  `;

  return el;
}

function createChildren() {
  const el = document.createElement("div");
  el.className = "children";
  return el;
}

// ============================================================
// EVENTS — ONE LISTENER (DELEGATION)
// ============================================================
let EVENTS_BOUND = false;

function bindSidebarEvents() {
  if (EVENTS_BOUND) return;
  EVENTS_BOUND = true;

  menu.addEventListener("click", (e) => {
    const line = e.target.closest(".line");
    if (!line) return;

    const isCity = line.classList.contains("city");
    const clickedArrow = Boolean(e.target.closest(".arrow"));
    const clickedLabel = Boolean(e.target.closest(".label-wrap"));

    // 1) Label click => activateLocation ONLY (no toggle)
    if (clickedLabel) {
      setActivePath(line);

      activateLocation({
        continent: line.dataset.continent || null,
        country: line.dataset.country || null,
        state: line.dataset.state || null,
        city: line.dataset.city || null,
      });

      return;
    }

    // 2) Toggle => arrow click OR row whitespace click (not city)
    if (!isCity && (clickedArrow || !clickedLabel)) {
      const children = line.nextElementSibling;
      if (!children || !children.classList.contains("children")) return;

      const open = line.classList.toggle("open");
      children.classList.toggle("show", open);
    }
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
    if (el.classList?.contains("line")) el.classList.add("active");
    if (el.classList?.contains("children")) el.classList.add("show");
    el = el.parentElement;
  }
}

// ============================================================
// SIDEBAR.JS — WCL Sidebar v3
// SINGLE SOURCE OF TRUTH: MAIN FILTERED ROWS
// ============================================================

import { activateLocation } from "./cards.js";

// ============================================================
// DOM
// ============================================================
const menu = document.querySelector("#sidebarMenu");

// ============================================================
// HELPERS
// ============================================================
const norm = (v) => (v ?? "").toString().trim();
const sortAZ = (a, b) =>
  String(a).localeCompare(String(b), undefined, { sensitivity: "base" });

const IS_US = (iso2) => iso2?.toLowerCase() === "us";

// ============================================================
// PUBLIC API — called from cards.js
// ============================================================
export function renderSidebarFromRows(rows = []) {
  if (!menu) return;

  menu.innerHTML = "";

  if (!rows.length) {
    menu.innerHTML = "<div class='line muted'>No results</div>";
    return;
  }

  const tree = buildTreeFromRows(rows);

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
            activateLocation({ continent, country, state: null, city: null });

          contChildren.append(co, coChildren);

          // ---------- USA ----------
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
                  activateLocation({ continent, country, state, city: null });

                coChildren.append(st, stChildren);

                Object.entries(sData.cities)
                  .sort(([a], [b]) => sortAZ(a, b))
                  .forEach(([city, count]) => {
                    const ct = createLine("city", city, count);
                    ct.onclick = () =>
                      activateLocation({ continent, country, state, city });
                    stChildren.append(ct);
                  });
              });

            return;
          }

          // ---------- NON-USA ----------
          Object.entries(coData.cities)
            .sort(([a], [b]) => sortAZ(a, b))
            .forEach(([city, count]) => {
              const ct = createLine("city", city, count);
              ct.onclick = () =>
                activateLocation({ continent, country, state: null, city });
              coChildren.append(ct);
            });
        });
    });
}

// ============================================================
// TREE BUILDER — FROM MAIN ROWS
// ============================================================
function buildTreeFromRows(rows) {
  const tree = {};

  rows.forEach((r) => {
    const continent = norm(r.continent);
    const country = norm(r.country);
    const state = norm(r.state);
    const city = norm(r.city);
    const iso2 = r.country_iso2 || null;

    if (!continent || !country || !city) return;

    tree[continent] ??= { count: 0, countries: {} };
    tree[continent].count++;

    tree[continent].countries[country] ??= {
      count: 0,
      iso2,
      states: {},
      cities: {},
    };
    tree[continent].countries[country].count++;

    if (IS_US(iso2) && state) {
      tree[continent].countries[country].states[state] ??= {
        count: 0,
        cities: {},
      };
      tree[continent].countries[country].states[state].count++;

      tree[continent].countries[country].states[state].cities[city] ??= 0;
      tree[continent].countries[country].states[state].cities[city]++;
    } else {
      tree[continent].countries[country].cities[city] ??= 0;
      tree[continent].countries[country].cities[city]++;
    }
  });

  return tree;
}

// ============================================================
// UI HELPERS
// ============================================================
function createLine(type, label, count, iso2 = null) {
  const el = document.createElement("div");
  el.className = `line ${type}`;
  el.dataset.label = label;

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

// ============================================================
// SIDEBAR.JS — WCL Sidebar (CANONICAL, DETERMINISTIC)
// ------------------------------------------------------------
// STRATEGI (LÅST):
// - Backend är korrekt (nodes + counts)
// - Frontend ansvarar för korrekt matchning
// - En (1) canonical key-funktion
// - Inga cities visas om count = 0
// - USA: Continent → Country → State → City
// - Övriga: Continent → Country → City
// - Sidebar sätter LOCATION som master (LAW)
// ============================================================

import { activateLocation } from "./cards.js";

// ============================================================
// DOM
// ============================================================
const menu = document.querySelector("#sidebarMenu");

// ============================================================
// HELPERS — CANONICAL NORMALIZATION
// ============================================================
const norm = (v) => (v ?? "").toString().trim();

const makeKey = ({
  continent = "",
  country = "",
  state = "",
  city = "",
  level = "",
}) =>
  [
    norm(continent),
    norm(country),
    norm(state),
    norm(city),
    norm(level),
  ].join("|");

// USA check (ISO2 är canonical)
const IS_US = (iso2) => iso2?.toLowerCase() === "us";

// Sort A–Z (UI only)
const sortAZ = (a, b) =>
  String(a).localeCompare(String(b), undefined, { sensitivity: "base" });

// ============================================================
// FETCH
// ============================================================
async function fetchNodesAndCounts(supabase) {
  const [nodesRes, countsRes] = await Promise.all([
    supabase.rpc("sidebar_nodes_v1"),
    supabase.rpc("sidebar_counts_v1"),
  ]);

  if (nodesRes.error) throw nodesRes.error;
  if (countsRes.error) throw countsRes.error;

  return {
    nodes: nodesRes.data || [],
    counts: countsRes.data || [],
  };
}

// ============================================================
// BUILD TREE — PURE, NO GUESSING
// ============================================================
function buildTree(nodes, counts) {
  const tree = {};

  // ---- build count lookup ----
  const countMap = {};
  counts.forEach((r) => {
    const key = makeKey({
      continent: r.continent,
      country: r.country,
      state: r.state,
      city: r.city,
      level: r.level,
    });
    countMap[key] = Number(r.count || 0);
  });

  const getCount = (args) => countMap[makeKey(args)] || 0;

  // ---- build structure from nodes ----
  nodes.forEach((n) => {
    const { continent, country, country_iso2, state, city, level } = n;
    if (!continent || !country) return;

    // ---------- CONTINENT ----------
    tree[continent] ??= {
      count: getCount({ continent, level: "continent" }),
      countries: {},
    };

    // ---------- COUNTRY ----------
    tree[continent].countries[country] ??= {
      iso2: country_iso2 || null,
      count: getCount({ continent, country, level: "country" }),
      states: {},
      cities: {},
    };

    const isUS = IS_US(country_iso2);

    // ---------- STATE (USA ONLY) ----------
    if (isUS && level === "state" && state) {
      tree[continent].countries[country].states[state] ??= {
        count: getCount({
          continent,
          country,
          state,
          level: "state",
        }),
        cities: {},
      };
      return;
    }

    // ---------- CITY ----------
    if (level === "city" && city) {
      const cityCount = isUS
        ? getCount({
            continent,
            country,
            state,
            city,
            level: "city",
          })
        : getCount({
            continent,
            country,
            city,
            level: "city",
          });

      // 🔒 RULE: city without cards is NOT rendered
      if (cityCount <= 0) return;

      if (isUS && state) {
        tree[continent].countries[country].states[state] ??= {
          count: getCount({
            continent,
            country,
            state,
            level: "state",
          }),
          cities: {},
        };

        tree[continent].countries[country].states[state].cities[city] =
          cityCount;
      } else {
        tree[continent].countries[country].cities[city] = cityCount;
      }
    }
  });

  return tree;
}

// ============================================================
// APPLY LOCATION (LAW)
// ============================================================
let ACTIVE_PATH = {
  continent: null,
  country: null,
  state: null,
  city: null,
};

function applyLocation(next) {
  ACTIVE_PATH = { ...ACTIVE_PATH, ...next };
  activateLocation(ACTIVE_PATH);
  updateActiveClasses();
}

// ============================================================
// BUILD SIDEBAR (PUBLIC)
// ============================================================
export async function buildFrontendSidebar(supabase) {
  if (!menu) return;

  menu.innerHTML = "Loading…";

  let payload;
  try {
    payload = await fetchNodesAndCounts(supabase);
  } catch (e) {
    console.error("❌ Sidebar fetch failed", e);
    menu.innerHTML = "Failed to load";
    return;
  }

  const tree = buildTree(payload.nodes, payload.counts);
  menu.innerHTML = "";

  Object.entries(tree)
    .sort(([a], [b]) => sortAZ(a, b))
    .forEach(([continent, cData]) => {
      // ---------- CONTINENT ----------
      const cont = createLine({
        type: "continent",
        label: continent,
        count: cData.count,
      });

      // continents öppna default, men toggelbara
      const contChildren = createChildren(true);
      cont.classList.add("open");

      // arrow = toggle only
      cont.querySelector(".arrow")?.addEventListener("click", (e) => {
        e.stopPropagation();
        toggle(cont, contChildren);
      });

      // row click = location + toggle
      cont.onclick = () => {
        applyLocation({ continent, country: null, state: null, city: null });
        toggle(cont, contChildren);
      };

      menu.append(cont, contChildren);

      // ---------- COUNTRIES ----------
      Object.entries(cData.countries)
        .sort(([a], [b]) => sortAZ(a, b))
        .forEach(([country, coData]) => {
          const co = createLine({
            type: "country",
            label: country,
            count: coData.count,
            iso2: coData.iso2,
          });

          const coChildren = createChildren(false);

          // arrow = toggle only
          co.querySelector(".arrow")?.addEventListener("click", (e) => {
            e.stopPropagation();
            toggle(co, coChildren);
          });

          // row click = location + open
          co.onclick = () => {
            applyLocation({ continent, country, state: null, city: null });
            co.classList.add("open");
            coChildren.classList.add("show");
          };

          contChildren.append(co, coChildren);

          // ---------- USA ----------
          if (IS_US(coData.iso2)) {
            Object.entries(coData.states)
              .sort(([a], [b]) => sortAZ(a, b))
              .forEach(([state, sData]) => {
                const st = createLine({
                  type: "state",
                  label: state,
                  count: sData.count,
                });

                const stChildren = createChildren(false);

                st.querySelector(".arrow")?.addEventListener("click", (e) => {
                  e.stopPropagation();
                  toggle(st, stChildren);
                });

                st.onclick = () => {
                  applyLocation({ continent, country, state, city: null });
                  st.classList.add("open");
                  stChildren.classList.add("show");
                };

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
// UI HELPERS
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

function toggle(line, children) {
  const open = line.classList.toggle("open");
  children.classList.toggle("show", open);
}

function updateActiveClasses() {
  document.querySelectorAll("#sidebarMenu .line").forEach((el) => {
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

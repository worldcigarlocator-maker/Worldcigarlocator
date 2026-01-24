// ============================================================
// SIDEBAR.JS — WCL Sidebar (CANONICAL, FINAL)
// ------------------------------------------------------------
// DATA CONTRACT:
// - sidebar_nodes_v1  → REN STRUKTUR (continent/country/state/city)
// - sidebar_counts_v1 → ENDA KÄLLA FÖR SIFFROR
//
// RULES:
// - USA: Continent → Country → State → City
// - Övriga: Continent → Country → City
// - Sidebar sätter LOCATION som master (LAW)
// ============================================================

import { activateLocation } from "./cards.js";

console.log("✅ SIDEBAR.JS (NODES + COUNTS) LOADED");

const menu = document.querySelector("#sidebarMenu");

// ============================================================
// UI STATE (highlight only)
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

const isUS = (iso2) => String(iso2 || "").toLowerCase() === "us";

// ============================================================
// FETCH
// ============================================================
async function fetchNodes(supabase) {
  const { data, error } = await supabase.rpc("sidebar_nodes_v1");
  if (error) throw error;
  return data || [];
}

async function fetchCounts(supabase) {
  const { data, error } = await supabase.rpc("sidebar_counts_v1");
  if (error) throw error;
  return data || [];
}

// ============================================================
// BUILD TREE — PURE + DETERMINISTIC
// ============================================================
function buildTree(nodes, counts) {
  const tree = {};

  // ---- count lookup (single source of truth) ----
  const countMap = {};
  counts.forEach((r) => {
    const key = [
      r.level,
      r.continent ?? "",
      r.country ?? "",
      r.state ?? "",
      r.city ?? "",
    ].join("|");
    countMap[key] = Number(r.count || 0);
  });

  const getCount = (level, continent, country, state, city) =>
    countMap[[level, continent ?? "", country ?? "", state ?? "", city ?? ""].join("|")] || 0;

  // ---- build structure from nodes ----
  nodes.forEach((n) => {
    const { continent, country, country_iso2, state, city } = n;
    if (!continent || !country || !city) return;

    tree[continent] ??= {
      count: getCount("continent", continent),
      countries: {},
    };

    tree[continent].countries[country] ??= {
      iso2: country_iso2 || null,
      count: getCount("country", continent, country),
      states: {},
      cities: {},
    };

    const usa = isUS(country_iso2);

    if (usa && state) {
      tree[continent].countries[country].states[state] ??= {
        count: getCount("state", continent, country, state),
        cities: {},
      };

      tree[continent].countries[country].states[state].cities[city] =
        getCount("city", continent, country, state, city);
    } else {
      tree[continent].countries[country].cities[city] =
        getCount("city", continent, country, null, city);
    }
  });

  return tree;
}

// ============================================================
// APPLY LOCATION — LAW
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

  let nodes, counts;
  try {
    [nodes, counts] = await Promise.all([
      fetchNodes(supabase),
      fetchCounts(supabase),
    ]);
  } catch (e) {
    console.error("❌ Sidebar fetch failed", e);
    menu.innerHTML = "Failed to load";
    return;
  }

  const tree = buildTree(nodes, counts);
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
          if (isUS(coData.iso2)) {
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


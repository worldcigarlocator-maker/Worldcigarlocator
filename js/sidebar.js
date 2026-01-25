// ============================================================
// SIDEBAR.JS — WCL Sidebar v4 (STATIC, CANONICAL)
// - Loads ONCE after auth
// - Uses backend nodes + counts
// - Never reacts to search
// - Sidebar sets LOCATION master (LAW)
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
// FETCH (STATIC)
// ============================================================
async function fetchSidebarData(supabase) {
  const [nodesRes, countsRes] = await Promise.all([
    supabase.rpc("sidebar_nodes_v1"),
    supabase.rpc("sidebar_counts_v2"),
  ]);

  if (nodesRes.error) throw nodesRes.error;
  if (countsRes.error) throw countsRes.error;

  return {
    nodes: nodesRes.data || [],
    counts: countsRes.data || [],
  };
}

// ============================================================
// BUILD SIDEBAR — PUBLIC API
// ============================================================
export async function buildFrontendSidebar(supabase) {
  if (!menu) return;

  menu.innerHTML = "Loading…";

  let payload;
  try {
    payload = await fetchSidebarData(supabase);
  } catch (e) {
    console.error("❌ Sidebar load failed", e);
    menu.innerHTML = "Failed to load";
    return;
  }

  const tree = buildTree(payload.nodes, payload.counts);
  menu.innerHTML = "";

  Object.entries(tree)
    .sort(([a], [b]) => sortAZ(a, b))
    .forEach(([continent, cData]) => {
      // ---------------- CONTINENT ----------------
      const cont = createLine("continent", continent, cData.count);
      const contChildren = createChildren(true);
      cont.classList.add("open");

      cont.querySelector(".arrow")?.addEventListener("click", (e) => {
        e.stopPropagation();
        toggle(cont, contChildren);
      });

      cont.onclick = () =>
        activateLocation({ continent, country: null, state: null, city: null });

      menu.append(cont, contChildren);

      // ---------------- COUNTRIES ----------------
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

          // ---------- NON-USA ----------
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
// TREE BUILDER — NODES + COUNTS
// ============================================================
function buildTree(nodes, counts) {
  const countMap = {};
  counts.forEach((c) => {
    countMap[`${c.level}|${c.key}`] = c.count;
  });

  const tree = {};

  nodes.forEach((n) => {
    const continent = norm(n.continent);
    const country = norm(n.country);
    const state = norm(n.state);
    const city = norm(n.city);
    const iso2 = n.country_iso2 || null;

    if (!continent || !country) return;

    tree[continent] ??= {
      count: countMap[`continent|${continent}`] || 0,
      countries: {},
    };

    tree[continent].countries[country] ??= {
      count: countMap[`country|${continent}|${country}`] || 0,
      iso2,
      states: {},
      cities: {},
    };

    if (IS_US(iso2) && state) {
      tree[continent].countries[country].states[state] ??= {
        count:
          countMap[`state|${continent}|${country}|${state}`] || 0,
        cities: {},
      };

      if (city) {
        tree[continent].countries[country].states[state].cities[city] =
          countMap[
            `city|${continent}|${country}|${state}|${city}`
          ] || 0;
      }
    } else if (city) {
      tree[continent].countries[country].cities[city] =
        countMap[`city|${continent}|${country}|${city}`] || 0;
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

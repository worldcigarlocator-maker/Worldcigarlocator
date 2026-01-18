// ============================================================
// SIDEBAR.JS — WCL Canonical Sidebar (STEP 1: ROW STRUCTURE)
// ============================================================

import { setLocationFilter, runSearch } from "./cards.js";

const menu = document.querySelector("#sidebarMenu");

/* ============================================================
   INTERNAL STATE
   ============================================================ */
let LAST_LOCATION = { continent: null, country: null, state: null, city: null };

function sameLocation(a, b) {
  return (
    a.continent === b.continent &&
    a.country === b.country &&
    a.state === b.state &&
    a.city === b.city
  );
}

function applyLocation(next) {
  const normalized = {
    continent: next.continent ?? null,
    country: next.country ?? null,
    state: next.state ?? null,
    city: next.city ?? null,
  };

  if (sameLocation(LAST_LOCATION, normalized)) return;
  LAST_LOCATION = normalized;

  setLocationFilter(normalized);
  runSearch();
}

/* ============================================================
   FETCH ALL SIDEBAR ROWS
   ============================================================ */
async function fetchAllSidebarRows(supabase) {
  const PAGE = 1000;
  let from = 0;
  let all = [];

  while (true) {
    const { data, error } = await supabase
      .rpc("sidebar_counts_frontend_v1")
      .range(from, from + PAGE - 1);

    if (error) throw error;
    all = all.concat(data || []);
    if (!data || data.length < PAGE) break;

    from += PAGE;
  }

  return all;
}

/* ============================================================
   BUILD SIDEBAR
   ============================================================ */
export async function buildFrontendSidebar(supabase) {
  if (!menu) return;
  menu.innerHTML = "Loading…";

  const rows = await fetchAllSidebarRows(supabase);

  // ---------- Build tree ----------
  const tree = {};

  for (const r of rows) {
    const c1 = r.continent ?? "Unknown";
    const c2 = r.country ?? "Unknown";
    const c3 = r.state ?? "Unknown";
    const c4 = r.city ?? "Unknown";
    const count = Number(r.count || 0);

    tree[c1] ??= { count: 0, countries: {} };
    tree[c1].count += count;

    tree[c1].countries[c2] ??= { count: 0, states: {} };
    tree[c1].countries[c2].count += count;

    tree[c1].countries[c2].states[c3] ??= { count: 0, cities: {} };
    tree[c1].countries[c2].states[c3].count += count;

    tree[c1].countries[c2].states[c3].cities[c4] =
      (tree[c1].countries[c2].states[c3].cities[c4] || 0) + count;
  }

  // ---------- Render ----------
  menu.innerHTML = "";

  Object.entries(tree).forEach(([continent, cData]) => {
    const contLine = createLine("continent", continent, cData.count);
    const contNest = createNested();

    menu.append(contLine, contNest);

    contLine.addEventListener("click", () =>
      applyLocation({ continent })
    );

    Object.entries(cData.countries).forEach(([country, coData]) => {
      const countryLine = createLine("country", country, coData.count, country);
      const countryNest = createNested();

      contNest.append(countryLine, countryNest);

      countryLine.addEventListener("click", (e) => {
        e.stopPropagation();
        toggle(countryLine, countryNest);
        applyLocation({ continent, country });
      });

      Object.entries(coData.states).forEach(([state, sData]) => {
        const stateLine = createLine("state", state, sData.count);
        const stateNest = createNested();

        countryNest.append(stateLine, stateNest);

        stateLine.addEventListener("click", (e) => {
          e.stopPropagation();
          toggle(stateLine, stateNest);
          applyLocation({ continent, country, state });
        });

        Object.entries(sData.cities).forEach(([city, count]) => {
          const cityLine = createLine("city", city, count);

          stateNest.append(cityLine);

          cityLine.addEventListener("click", (e) => {
            e.stopPropagation();
            applyLocation({ continent, country, state, city });
          });
        });
      });
    });
  });
}

/* ============================================================
   UI HELPERS — STRUCTURE LOCKED HERE
   ============================================================ */
function createLine(type, label, count, countryName = null) {
  const el = document.createElement("div");
  el.className = `line ${type}`;

  const left = document.createElement("div");
  left.className = "left";

  if (type !== "city") {
    const arrow = document.createElement("span");
    arrow.className = "arrow";
    arrow.textContent = "▸";
    left.appendChild(arrow);
  }

  if (type === "country" && countryName) {
    const img = document.createElement("img");
    img.className = "flag";
    img.src = `assets/flags/${countryName.toLowerCase().slice(0,2)}.svg`;
    img.onerror = () => img.remove();
    left.appendChild(img);
  }

  const text = document.createElement("span");
  text.className = "label";
  text.textContent = label;

  left.appendChild(text);

  const pill = document.createElement("span");
  pill.className = "pill";
  pill.textContent = count;

  el.append(left, pill);
  return el;
}

function createNested() {
  const el = document.createElement("div");
  el.className = "nested";
  return el;
}

/* ============================================================
   TOGGLE (OPEN / CLOSE)
   ============================================================ */
function toggle(line, nested) {
  const open = line.classList.toggle("open");
  nested.classList.toggle("show", open);

  const arrow = line.querySelector(".arrow");
  if (arrow) arrow.textContent = open ? "▾" : "▸";
}

// ============================================================
// SIDEBAR.JS — WCL Flat Hierarchy (CANONICAL)
// ============================================================

import { setLocationFilter, runSearch } from "./cards.js";

const menu = document.querySelector("#sidebarMenu");

let ACTIVE_PATH = {
  continent: null,
  country: null,
  state: null,
  city: null,
};

/* ============================================================
   BUILD SIDEBAR
   ============================================================ */
export async function buildFrontendSidebar(supabase) {
  if (!menu) return;
  menu.innerHTML = "Loading…";

  const data = await fetchAll(supabase);

  const tree = {};
  for (const r of data) {
    const c = r.continent || "Unknown";
    const co = r.country || "Unknown";
    const s = r.state || "Unknown";
    const ci = r.city || "Unknown";
    const n = Number(r.count || 0);

    tree[c] ??= { count: 0, countries: {} };
    tree[c].count += n;

    tree[c].countries[co] ??= { count: 0, states: {} };
    tree[c].countries[co].count += n;

    tree[c].countries[co].states[s] ??= { count: 0, cities: {} };
    tree[c].countries[co].states[s].count += n;

    tree[c].countries[co].states[s].cities[ci] =
      (tree[c].countries[co].states[s].cities[ci] || 0) + n;
  }

  menu.innerHTML = "";

  Object.entries(tree).forEach(([continent, cData]) => {
    const cLine = line("continent", continent, cData.count);
    const cNest = nest(true); // OPEN BY DEFAULT

    menu.append(cLine, cNest);

    cLine.classList.add("open");

    cLine.onclick = () => activate({ continent });

    Object.entries(cData.countries).forEach(([country, coData]) => {
      const coLine = line("country", country, coData.count);
      const coNest = nest();

      cNest.append(coLine, coNest);

      coLine.onclick = (e) => {
        e.stopPropagation();
        toggle(coLine, coNest);
        activate({ continent, country });
      };

      Object.entries(coData.states).forEach(([state, sData]) => {
        const sLine = line("state", state, sData.count);
        const sNest = nest();

        coNest.append(sLine, sNest);

        sLine.onclick = (e) => {
          e.stopPropagation();
          toggle(sLine, sNest);
          activate({ continent, country, state });
        };

        Object.entries(sData.cities).forEach(([city, count]) => {
          const ciLine = line("city", city, count);
          sNest.append(ciLine);

          ciLine.onclick = (e) => {
            e.stopPropagation();
            activate({ continent, country, state, city });
          };
        });
      });
    });
  });
}

/* ============================================================
   HELPERS
   ============================================================ */
function line(type, label, count) {
  const el = document.createElement("div");
  el.className = `line ${type}`;
  el.innerHTML = `
    ${type !== "city" ? `<span class="arrow">▸</span>` : `<span></span>`}
    <span class="label">${label}</span>
    <span></span>
    <span class="pill">${count}</span>
  `;
  return el;
}

function nest(open = false) {
  const el = document.createElement("div");
  el.className = "nested";
  if (open) el.classList.add("show");
  return el;
}

function toggle(line, nested) {
  const open = line.classList.toggle("open");
  nested.classList.toggle("show", open);
}

/* ============================================================
   ACTIVE PATH LOGIC
   ============================================================ */
function activate(next) {
  ACTIVE_PATH = { continent: null, country: null, state: null, city: null, ...next };

  document.querySelectorAll("#sidebarMenu .line").forEach((el) => {
    const type = [...el.classList].find(c =>
      ["continent","country","state","city"].includes(c)
    );
    const name = el.querySelector(".label")?.textContent;

    if (ACTIVE_PATH[type] === name) el.classList.add("active");
    else el.classList.remove("active");
  });

  setLocationFilter(ACTIVE_PATH);
  runSearch();
}

/* ============================================================
   FETCH (NO 1000 CAP)
   ============================================================ */
async function fetchAll(supabase) {
  let out = [];
  let from = 0;
  const STEP = 1000;

  while (true) {
    const { data } = await supabase
      .rpc("sidebar_counts_frontend_v1")
      .range(from, from + STEP - 1);

    if (!data || !data.length) break;
    out = out.concat(data);
    if (data.length < STEP) break;
    from += STEP;
  }

  return out;
}

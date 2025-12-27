// ============================================================
// SIDEBAR.JS — WCL Frontend Hierarchy (CLEAN VERSION)
// ============================================================

import { setLocationFilter, runSearch, resetToHero } from "./cards.js";

const menu = document.querySelector("#sidebarMenu");

/* ============================================================
   INIT
============================================================ */
export async function buildFrontendSidebar(supabase) {
  if (!menu) return;
  menu.innerHTML = "Loading…";

  const { data, error } = await supabase
    .from("stores_frontend_public_v4")
    .select("id, continent, country, city");

  if (error) {
    console.error(error);
    menu.innerHTML = "Failed to load sidebar";
    return;
  }

  const tree = buildTree(data);
  renderSidebar(tree);
}

/* ============================================================
   TREE BUILDER (BACKEND = FACIT)
============================================================ */
function buildTree(rows) {
  const tree = {};

  rows.forEach(({ continent, country, city }) => {
    if (!continent || !country) return;

    tree[continent] ??= {};
    tree[continent][country] ??= {};
    tree[continent][country][city ?? "__none__"] ??= 0;
    tree[continent][country][city ?? "__none__"]++;
  });

  return tree;
}

/* ============================================================
   RENDER
============================================================ */
function renderSidebar(tree) {
  menu.innerHTML = "";

  Object.entries(tree).forEach(([continent, countries]) => {
    const contLine = line("continent", continent, count(countries));
    const contWrap = nested();

    contLine.onclick = () => {
      toggle(contLine, contWrap, ".continent");
      loadStores({ continent }, "");
    };

    menu.append(contLine, contWrap);

    Object.entries(countries).forEach(([country, cities]) => {
      const countryLine = line("country", country, count(cities));
      const countryWrap = nested();

      countryLine.onclick = (e) => {
        e.stopPropagation();
        toggle(countryLine, countryWrap, ".country");
        loadStores({ country }, "");
      };

      contWrap.append(countryLine, countryWrap);

      Object.entries(cities).forEach(([city, cnt]) => {
        if (city === "__none__") return;

        const cityLine = line("city", city, cnt);

        cityLine.onclick = (e) => {
          e.stopPropagation();
          loadStores({ city }, "");
        };

        countryWrap.append(cityLine);
      });
    });
  });
}

/* ============================================================
   UI HELPERS
============================================================ */
function line(type, label, count) {
  const el = document.createElement("div");
  el.className = `line ${type}`;
  el.innerHTML = `
    <span class="label">${label}</span>
    <span class="pill">${count}</span>
    ${type !== "city" ? `<span class="arrow">›</span>` : ""}
  `;
  return el;
}

function nested() {
  const el = document.createElement("div");
  el.className = "nested";
  return el;
}

function count(obj) {
  return Object.values(obj).reduce(
    (sum, v) => sum + (typeof v === "number" ? v : count(v)),
    0
  );
}

/* ============================================================
   TOGGLE (ONE OPEN PER LEVEL)
============================================================ */
function toggle(active, wrap, selector) {
  document.querySelectorAll(selector).forEach((el) => {
    const next = el.nextElementSibling;
    if (el === active) {
      el.classList.toggle("open");
      next?.classList.toggle("show");
    } else {
      el.classList.remove("open");
      next?.classList.remove("show");
    }
  });
}

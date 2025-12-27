// ============================================================
// SIDEBAR.JS — WCL Premium Hierarchy Navigation (CLEAN VERSION)
// UI ONLY — NO FILTER LOGIC
// ============================================================

const dom = (sel) => document.querySelector(sel);
const menu = dom("#sidebarMenu");

/* ============================================================
   BUILD SIDEBAR HIERARCHY (DEDUPED, READ-ONLY)
   ============================================================ */
export async function buildFrontendSidebar(supabase) {
  menu.innerHTML = "Loading…";

  const { data, error } = await supabase
    .from("stores_frontend_public_v4")
    .select("id, continent, country, city")
    .order("continent")
    .order("country")
    .order("city");

  if (error) {
    console.error(error);
    menu.innerHTML = "Failed to load menu.";
    return;
  }

  /* --------------------------------------------------
     DEDUPLICATE STORES (ID SAFE)
  -------------------------------------------------- */
  const uniqueStores = Array.from(
    new Map(data.map((s) => [s.id, s])).values()
  );

  /* --------------------------------------------------
     BUILD TREE STRUCTURE
  -------------------------------------------------- */
  const tree = {};

  uniqueStores.forEach(({ continent, country, city }) => {
    if (!continent || !country) return;

    tree[continent] ??= {};
    tree[continent][country] ??= {};
    if (city) {
      tree[continent][country][city] =
        (tree[continent][country][city] || 0) + 1;
    }
  });

  /* --------------------------------------------------
     RENDER SIDEBAR
  -------------------------------------------------- */
  menu.innerHTML = "";

  Object.entries(tree).forEach(([continent, countries]) => {
    const continentCount = countTotal(countries);

    const contLine = createLine("continent", continent, continentCount);
    const contNested = createNested();

    menu.append(contLine, contNested);

    contLine.addEventListener("click", () => {
      toggle(contLine, contNested, ".continent");
    });

    Object.entries(countries).forEach(([country, cities]) => {
      const countryCount = countTotal(cities);

      const countryLine = createLine("country", country, countryCount);
      const countryNested = createNested();

      contNested.append(countryLine, countryNested);

      countryLine.addEventListener("click", () => {
        toggle(countryLine, countryNested, ".country");
      });

      Object.entries(cities).forEach(([city, count]) => {
        const cityLine = createLine("city", city, count);
        countryNested.append(cityLine);
      });
    });
  });
}

/* ============================================================
   HELPERS
   ============================================================ */
function countTotal(obj) {
  return Object.values(obj).reduce((sum, val) => {
    if (typeof val === "number") return sum + val;
    if (typeof val === "object") return sum + countTotal(val);
    return sum;
  }, 0);
}

function createLine(type, label, count) {
  const el = document.createElement("div");
  el.className = `line ${type}`;
  el.innerHTML = `
    <span class="label" data-${type}="${label}">
      ${label}
    </span>
    <span class="pill">${count}</span>
    ${type !== "city" ? `<span class="arrow">›</span>` : ""}
  `;
  return el;
}

function createNested() {
  const el = document.createElement("div");
  el.className = "nested";
  return el;
}

/* ============================================================
   TOGGLE SYSTEM — ONE OPEN PER LEVEL
   ============================================================ */
function toggle(clickedItem, clickedNested, selector) {
  const allItems = document.querySelectorAll(selector);
  const allNesteds = [...allItems].map((i) => i.nextElementSibling);

  allItems.forEach((item, i) => {
    const nest = allNesteds[i];
    if (item === clickedItem) {
      const isOpen = item.classList.contains("open");
      item.classList.toggle("open", !isOpen);
      nest.classList.toggle("show", !isOpen);
    } else {
      item.classList.remove("open");
      nest.classList.remove("show");
    }
  });
}

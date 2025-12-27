// ============================================================
// SIDEBAR.JS — WCL Premium Hierarchy Navigation v3.1 (NO MODULES)
// - No import / no export
// - Exposes: window.buildFrontendSidebar(supabase, loadFunc)
// - Default loadFunc: window.loadStores
// ============================================================

(function () {
  "use strict";

  const dom = (sel) => document.querySelector(sel);

  function getMenu() {
    return dom("#sidebarMenu");
  }

  /* ============================================================
     BUILD SIDEBAR HIERARCHY WITH CORRECT COUNTS (DEDUPED)
     ============================================================ */
  window.buildFrontendSidebar = function buildFrontendSidebar(supabase, loadFunc) {
    const menu = getMenu();
    if (!menu) {
      console.error("sidebar.js: #sidebarMenu not found");
      return Promise.resolve();
    }

    // Default load function from cards.js (global)
    const fallbackLoad = window.loadStores;
    const loader = typeof loadFunc === "function" ? loadFunc : fallbackLoad;

    if (typeof loader !== "function") {
      console.error("sidebar.js: loadStores missing. cards.js did not load or did not expose window.loadStores");
      menu.innerHTML = "Failed to load menu.";
      return Promise.resolve();
    }

    if (!supabase || typeof supabase.from !== "function") {
      console.error("sidebar.js: invalid supabase client passed in");
      menu.innerHTML = "Failed to load menu.";
      return Promise.resolve();
    }

    menu.innerHTML = "Loading…";

    // Return the promise so main.js can await it
    return supabase
      .from("stores_frontend_public_v4")
      .select("id, continent, country, city")
      .order("continent")
      .order("country")
      .order("city")
      .then(({ data, error }) => {
        if (error) {
          console.error(error);
          menu.innerHTML = "Failed to load menu.";
          return;
        }

        const rows = Array.isArray(data) ? data : [];

        /* --------------------------------------------------
           ✅ DEDUPLICATE STORES (CRITICAL FIX)
           One store = one count, always
        -------------------------------------------------- */
        const uniqueStores = Array.from(new Map(rows.map((s) => [s.id, s])).values());

        /* --------------------------------------------------
           BUILD TREE STRUCTURE
        -------------------------------------------------- */
        const tree = {};

        uniqueStores.forEach((row) => {
          const continent = row?.continent;
          const country = row?.country;
          const city = row?.city;

          if (!continent || !country) return;

          if (!tree[continent]) tree[continent] = {};
          if (!tree[continent][country]) tree[continent][country] = {};

          if (city) {
            tree[continent][country][city] = (tree[continent][country][city] || 0) + 1;
          }
        });

        /* --------------------------------------------------
           RENDER SIDEBAR
        -------------------------------------------------- */
        menu.innerHTML = "";

        Object.entries(tree).forEach(([continent, countries]) => {
          const continentCount = countTotal(countries);
          const contItem = createLine("continent", continent, continentCount);
          const contNested = createNested();

          // (Du har <ul id="sidebarMenu"> men använder divs – vi behåller exakt som din original)
          menu.append(contItem, contNested);

          contItem.addEventListener("click", () => {
            toggle(contItem, contNested, ".continent");
            loader({ continent }, "");
          });

          Object.entries(countries).forEach(([country, cities]) => {
            const countryCount = countTotal(cities);
            const countryItem = createLine("country", country, countryCount);
            const countryNested = createNested();

            contNested.append(countryItem, countryNested);

            countryItem.addEventListener("click", () => {
              toggle(countryItem, countryNested, ".country");
              loader({ country }, "");
            });

            Object.entries(cities).forEach(([city, count]) => {
              const cityItem = createLine("city", city, count);

              cityItem.addEventListener("click", (e) => {
                e.stopPropagation();
                loader({ city }, "");
              });

              countryNested.append(cityItem);
            });
          });
        });
      });
  };

  /* ============================================================
     HELPERS
     ============================================================ */
  function countTotal(obj) {
    return Object.values(obj).reduce((sum, val) => {
      if (typeof val === "number") return sum + val;
      if (typeof val === "object" && val) return sum + countTotal(val);
      return sum;
    }, 0);
  }

  function createLine(type, label, count) {
    const el = document.createElement("div");
    el.className = `line ${type}`;
    el.innerHTML = `
      <span class="label">${label}</span>
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
     TOGGLE SYSTEM — one open per level
     ============================================================ */
  function toggle(clickedItem, clickedNested, selector) {
    const allItems = document.querySelectorAll(selector);
    const allNesteds = [...allItems].map((i) => i.nextElementSibling);

    allItems.forEach((item, i) => {
      const nest = allNesteds[i];
      if (item === clickedItem) {
        const isOpen = item.classList.contains("open");
        item.classList.toggle("open", !isOpen);
        if (nest) nest.classList.toggle("show", !isOpen);
      } else {
        item.classList.remove("open");
        if (nest) nest.classList.remove("show");
      }
    });
  }

})();

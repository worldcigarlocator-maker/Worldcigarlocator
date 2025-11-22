/* ============================================================
   SIDEBAR — Hierarchy (Continent → Country → City)
   ============================================================ */

import { getContinent } from "./globals.js";

export function buildFrontendSidebar(supabase, loadStores) {
  const menu = document.getElementById("sidebarMenu");
  if (!menu) return;

  menu.innerHTML = `<li style="color:#999">Loading…</li>`;

  supabase
    .from("stores_frontend_public")
    .select("id,name,country,city")
    .then(({ data, error }) => {
      if (error || !data) {
        console.error("Sidebar fetch error:", error);
        menu.innerHTML = `<li style="color:#f55">Failed to load.</li>`;
        return;
      }

      /* --------------------------------------------------------
         GROUP: continent → country → city
      ---------------------------------------------------------*/
      const grouped = {};

      for (const s of data) {
        const cont = getContinent(s.country);
        if (!grouped[cont]) grouped[cont] = {};

        const ctry = s.country || "Unknown";
        if (!grouped[cont][ctry]) grouped[cont][ctry] = {};

        const city = s.city || "Unknown";
        if (!grouped[cont][ctry][city]) grouped[cont][ctry][city] = [];

        grouped[cont][ctry][city].push(s);
      }

      menu.innerHTML = "";

      /* --------------------------------------------------------
         BUILD TREE
      ---------------------------------------------------------*/
      Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([continent, countries]) => {
          const contBtn = document.createElement("button");
          contBtn.className = "line continent";

          const totalStores = Object.values(countries).reduce(
            (acc, cities) =>
              acc + Object.values(cities).reduce((n, list) => n + list.length, 0),
            0
          );

          contBtn.innerHTML = `
            <span class="arrow">▶</span>
            <span class="label">${continent}</span>
            <span class="pill">${totalStores}</span>
          `;

          const nestedCountries = document.createElement("div");
          nestedCountries.className = "nested";

          /* -----------------------------------------------
             CONTINENT CLICK
          ------------------------------------------------*/
          contBtn.addEventListener("click", () => {
            const isOpen = nestedCountries.classList.toggle("show");
            contBtn.classList.toggle("open", isOpen);

            contBtn.querySelector(".arrow").style.transform =
              isOpen ? "rotate(90deg)" : "rotate(0deg)";

            if (isOpen) loadStores({ continent });
          });

          /* -----------------------------------------------
             COUNTRIES
          ------------------------------------------------*/
          Object.entries(countries)
            .sort(([a], [b]) => a.localeCompare(b))
            .forEach(([country, cities]) => {
              const cBtn = document.createElement("button");
              cBtn.className = "line country";

              const count = Object.values(cities).reduce(
                (n, list) => n + list.length,
                0
              );

              cBtn.innerHTML = `
                <span class="arrow">▶</span>
                <span class="label">${country}</span>
                <span class="pill">${count}</span>
              `;

              const nestedCity = document.createElement("div");
              nestedCity.className = "nested";

              /* --------------------------------------------
                 COUNTRY CLICK
              ---------------------------------------------*/
              cBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                const isOpen = nestedCity.classList.toggle("show");
                cBtn.classList.toggle("open", isOpen);

                cBtn.querySelector(".arrow").style.transform =
                  isOpen ? "rotate(90deg)" : "rotate(0deg)";

                if (isOpen) loadStores({ country });
              });

              /* --------------------------------------------
                 CITIES
              ---------------------------------------------*/
              Object.entries(cities)
                .sort(([, a], [, b]) => b.length - a.length)
                .forEach(([city, cityStores]) => {
                  const cityBtn = document.createElement("button");
                  cityBtn.className = "line city";

                  cityBtn.innerHTML = `
                    <span class="label">${city}</span>
                    <span class="pill">${cityStores.length}</span>
                  `;

                  cityBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    document
                      .querySelector(".main")
                      ?.scrollIntoView({ behavior: "smooth" });

                    loadStores({ city });
                  });

                  nestedCity.appendChild(cityBtn);
                });

              nestedCountries.appendChild(cBtn);
              nestedCountries.appendChild(nestedCity);
            });

          menu.appendChild(contBtn);
          menu.appendChild(nestedCountries);
        });
    });
}

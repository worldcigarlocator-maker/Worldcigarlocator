/* ============================================================
   SIDEBAR — Continent → Country → City
   ============================================================ */

export function buildFrontendSidebar(supabase, loadStores, getContinent) {
  const menu = document.getElementById("sidebarMenu");
  if (!menu) return;

  menu.innerHTML = `<li style="color:#777;">Loading…</li>`;

  supabase
    .from("stores_public")
    .select("id, name, country, city")
    .then(({ data, error }) => {
      if (error || !data) {
        menu.innerHTML = `<li style="color:#c44;">Sidebar failed.</li>`;
        console.error(error);
        return;
      }

      /* -------------------------------------------
         Group data: continent → country → city
      ------------------------------------------- */
      const grouped = {};

      for (const s of data) {
        const cont = getContinent(s.country);
        const country = s.country || "Unknown";
        const city = s.city || "Unknown";

        grouped[cont] ??= {};
        grouped[cont][country] ??= {};
        grouped[cont][country][city] ??= [];

        grouped[cont][country][city].push(s);
      }

      menu.innerHTML = "";

      /* -------------------------------------------
         Build DOM structure
      ------------------------------------------- */
      Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([continent, countries]) => {
          /* ---------- CONTINENT BUTTON ---------- */
          const contBtn = document.createElement("button");
          contBtn.className = "line continent";

          const storeCount = Object.values(countries).reduce(
            (acc, cities) =>
              acc +
              Object.values(cities).reduce((a, list) => a + list.length, 0),
            0
          );

          contBtn.innerHTML = `
            <span class="label">${continent}</span>
            <span class="pill">${storeCount}</span>
          `;

          const nestedCountries = document.createElement("div");
          nestedCountries.className = "nested";

          contBtn.addEventListener("click", () => {
            const isOpen = nestedCountries.classList.toggle("show");
            if (isOpen) loadStores({ continent });
          });

          /* ---------- COUNTRIES ---------- */
          Object.entries(countries)
            .sort(([a], [b]) => a.localeCompare(b))
            .forEach(([country, cities]) => {
              const cBtn = document.createElement("button");
              cBtn.className = "line country";

              const cCount = Object.values(cities).reduce(
                (acc, list) => acc + list.length,
                0
              );

              cBtn.innerHTML = `
                <span class="label">${country}</span>
                <span class="pill">${cCount}</span>
              `;

              const nestedCities = document.createElement("div");
              nestedCities.className = "nested";

              cBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                const isOpen = nestedCities.classList.toggle("show");
                if (isOpen) loadStores({ country });
              });

              /* ---------- CITIES ---------- */
              Object.entries(cities).forEach(([city, stores]) => {
                const cityBtn = document.createElement("button");
                cityBtn.className = "line city";
                cityBtn.innerHTML = `
                  <span class="label">${city}</span>
                  <span class="pill">${stores.length}</span>
                `;
                cityBtn.addEventListener("click", (e) => {
                  e.stopPropagation();
                  loadStores({ city });
                });

                nestedCities.appendChild(cityBtn);
              });

              nestedCountries.appendChild(cBtn);
              nestedCountries.appendChild(nestedCities);
            });

          menu.appendChild(contBtn);
          menu.appendChild(nestedCountries);
        });
    });
}

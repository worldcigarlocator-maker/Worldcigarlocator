/* ============================================================
   SIDEBAR — Hierarchy (Continent → Country → City)
   Uses backend continent directly (NO getContinent needed)
   ============================================================ */

export function buildFrontendSidebar(supabase, loadStores) {
  const menu = document.getElementById("sidebarMenu");
  if (!menu) return;

  menu.innerHTML = `<li style="color:#999">Loading…</li>`;

  supabase
    .from("stores_frontend_public")
    .select("id,name,country,city,continent")
    .then(({ data, error }) => {
      if (error || !data) {
        console.error("Sidebar fetch error:", error);
        menu.innerHTML = `<li style="color:#f55">Failed to load.</li>`;
        return;
      }

      /* ============================================================
         1. GROUP DATA
         ============================================================ */
      const grouped = {};

      for (const s of data) {
        const cont = s.continent || "Unknown";
        const country = s.country || "Unknown";
        const city = s.city || "Unknown";

        if (!grouped[cont]) grouped[cont] = {};
        if (!grouped[cont][country]) grouped[cont][country] = {};
        if (!grouped[cont][country][city]) grouped[cont][country][city] = [];

        grouped[cont][country][city].push(s);
      }

      /* ============================================================
         2. RENDER SIDEBAR
         ============================================================ */
      menu.innerHTML = "";

      Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([continent, countries]) => {
          const contCount = Object.values(countries).reduce(
            (acc, cityBlock) =>
              acc +
              Object.values(cityBlock).reduce(
                (subtotal, list) => subtotal + list.length,
                0
              ),
            0
          );

          /* ---- CONTINENT BUTTON ---- */
          const contBtn = document.createElement("button");
          contBtn.className = "line continent";
          contBtn.innerHTML = `
            <span class="arrow">▶</span>
            <span class="label">${continent}</span>
            <span class="pill">${contCount}</span>
          `;

          const nestedCountries = document.createElement("div");
          nestedCountries.className = "nested";

          contBtn.addEventListener("click", () => {
            const open = nestedCountries.classList.toggle("show");
            contBtn.classList.toggle("open", open);
            contBtn.querySelector(".arrow").style.transform = open
              ? "rotate(90deg)"
              : "rotate(0deg)";

            if (open) loadStores({ continent });
          });

          /* ---- COUNTRIES ---- */
          Object.entries(countries)
            .sort(([a], [b]) => a.localeCompare(b))
            .forEach(([country, cities]) => {
              const countryCount = Object.values(cities).reduce(
                (total, list) => total + list.length,
                0
              );

              const countryBtn = document.createElement("button");
              countryBtn.className = "line country";
              countryBtn.innerHTML = `
                <span class="arrow">▶</span>
                <span class="label">${country}</span>
                <span class="pill">${countryCount}</span>
              `;

              const nestedCity = document.createElement("div");
              nestedCity.className = "nested";

              countryBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                const open = nestedCity.classList.toggle("show");
                countryBtn.classList.toggle("open", open);
                countryBtn.querySelector(".arrow").style.transform = open
                  ? "rotate(90deg)"
                  : "rotate(0deg)";

                if (open) loadStores({ country });
              });

              /* ---- CITIES ---- */
              Object.entries(cities)
                .sort(([, a], [, b]) => b.length - a.length)
                .forEach(([city, list]) => {
                  const cityBtn = document.createElement("button");
                  cityBtn.className = "line city";
                  cityBtn.innerHTML = `
                    <span class="label">${city}</span>
                    <span class="pill">${list.length}</span>
                  `;

                  cityBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    loadStores({ city });
                  });

                  nestedCity.appendChild(cityBtn);
                });

              nestedCountries.appendChild(countryBtn);
              nestedCountries.appendChild(nestedCity);
            });

          menu.appendChild(contBtn);
          menu.appendChild(nestedCountries);
        });
    });
}

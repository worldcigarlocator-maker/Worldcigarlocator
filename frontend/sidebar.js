/* ============================================================
   FRONTEND SIDEBAR — Clean, fast and isolated (v1.0)
   Works ONLY with: stores_public
   ============================================================ */

export async function buildFrontendSidebar(loadStores, getContinentFromCountry) {
  const menu = document.getElementById("sidebarMenu");
  if (!menu) return;

  menu.innerHTML = `<li style="color:#777;">Loading…</li>`;

  /* Fetch only what we need */
  const { data: stores, error } = await supabase
    .from("stores_public")
    .select("id, name, city, country");

  if (error || !stores) {
    menu.innerHTML = `<li style="color:#f55;">Failed to load data</li>`;
    return;
  }

  /* ===== Build hierarchical structure ===== */
  const grouped = {};

  for (const s of stores) {
    const continent = getContinentFromCountry(s.country);
    if (!grouped[continent]) grouped[continent] = {};

    const country = s.country || "Unknown";
    if (!grouped[continent][country]) grouped[continent][country] = {};

    const city = s.city || "Unknown";
    if (!grouped[continent][country][city])
      grouped[continent][country][city] = [];

    grouped[continent][country][city].push(s);
  }

  /* ===== Render sidebar ===== */
  menu.innerHTML = "";

  Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([continent, countries]) => {
      const contTotal = Object.values(countries).reduce(
        (acc, c) => acc + Object.values(c).reduce((a, b) => a + b.length, 0),
        0
      );

      // CONTINENT BUTTON
      const line = document.createElement("button");
      line.className = "line continent";
      line.innerHTML = `
        <span class="arrow">▶</span>
        <span class="label">${continent}</span>
        <span class="pill">${contTotal}</span>
      `;

      const nestedCountries = document.createElement("div");
      nestedCountries.className = "nested";

      line.addEventListener("click", () => {
        const open = nestedCountries.classList.toggle("show");
        line.classList.toggle("open", open);
        line.querySelector(".arrow").style.transform = open ? "rotate(90deg)" : "";
        if (open) loadStores({ continent });
      });

      /* COUNTRIES INSIDE */
      Object.entries(countries)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([country, cities]) => {
          const countryTotal = Object.values(cities).reduce(
            (acc, arr) => acc + arr.length,
            0
          );

          const lineCountry = document.createElement("button");
          lineCountry.className = "line country";
          lineCountry.innerHTML = `
            <span class="arrow">▶</span>
            <span class="label">${country}</span>
            <span class="pill">${countryTotal}</span>
          `;

          const nestedCities = document.createElement("div");
          nestedCities.className = "nested";

          lineCountry.addEventListener("click", (e) => {
            e.stopPropagation();
            const open = nestedCities.classList.toggle("show");
            lineCountry.classList.toggle("open", open);
            lineCountry.querySelector(".arrow").style.transform = open ? "rotate(90deg)" : "";
            if (open) loadStores({ country });
          });

          /* CITIES INSIDE */
          Object.entries(cities)
            .sort(([, a], [, b]) => b.length - a.length)
            .forEach(([city, list]) => {
              const btnCity = document.createElement("button");
              btnCity.className = "line city";
              btnCity.innerHTML = `
                <span class="label">${city}</span>
                <span class="pill">${list.length}</span>
              `;
              btnCity.addEventListener("click", (e) => {
                e.stopPropagation();
                document.querySelector(".main").scrollIntoView({ behavior: "smooth" });
                loadStores({ city });
              });
              nestedCities.appendChild(btnCity);
            });

          nestedCountries.appendChild(lineCountry);
          nestedCountries.appendChild(nestedCities);
        });

      menu.appendChild(line);
      menu.appendChild(nestedCountries);
    });
}

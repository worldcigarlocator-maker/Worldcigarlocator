/* ============================================================
   SIDEBAR — Hierarchy (Continent → Country → City) — FIXED
   ============================================================ */

export function buildFrontendSidebar(supabase, loadStores, getContinent) {
  const menu = document.getElementById("sidebarMenu");
  if (!menu) return;

  menu.innerHTML = `<li style="color:#999; padding:6px;">Loading…</li>`;

  supabase
    .from("stores_public")
    .select("id,name,country,city")
    .then(({ data, error }) => {
      if (error || !data) {
        console.error("Sidebar fetch error:", error);
        menu.innerHTML = `<li style="color:#f55; padding:6px;">Failed to load.</li>`;
        return;
      }

      /* GROUP: continent → country → city */
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

      /* BUILD SIDEBAR */
      Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([continent, countries]) => {

          /* WRAPPER LI for continent */
          const liCont = document.createElement("li");

          const contBtn = document.createElement("button");
          contBtn.className = "line continent";

          const storeCount = Object.values(countries)
            .reduce(
              (acc, cities) =>
                acc +
                Object.values(cities).reduce((a, list) => a + list.length, 0),
              0
            );

          contBtn.innerHTML = `
            <span class="arrow">▶</span>
            <span class="label">${continent}</span>
            <span class="pill">${storeCount}</span>
          `;

          const nestedC = document.createElement("ul");
          nestedC.className = "nested";

          contBtn.addEventListener("click", () => {
            const open = nestedC.classList.toggle("show");
            contBtn.classList.toggle("open", open);
            contBtn.querySelector(".arrow").style.transform = open
              ? "rotate(90deg)"
              : "rotate(0deg)";

            if (open) loadStores({ continent });
          });

          /* COUNTRIES */
          Object.entries(countries)
            .sort(([a], [b]) => a.localeCompare(b))
            .forEach(([country, cities]) => {

              const liCountry = document.createElement("li");

              const cBtn = document.createElement("button");
              cBtn.className = "line country";

              const cCount = Object.values(cities)
                .reduce((a, list) => a + list.length, 0);

              cBtn.innerHTML = `
                <span class="arrow">▶</span>
                <span class="label">${country}</span>
                <span class="pill">${cCount}</span>
              `;

              const nestedCity = document.createElement("ul");
              nestedCity.className = "nested";

              cBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                const open = nestedCity.classList.toggle("show");
                cBtn.classList.toggle("open", open);
                cBtn.querySelector(".arrow").style.transform = open
                  ? "rotate(90deg)"
                  : "rotate(0deg)";

                if (open) loadStores({ country });
              });

              /* CITIES */
              Object.entries(cities)
                .sort(([, a], [, b]) => b.length - a.length)
                .forEach(([city, list]) => {
                  const liCity = document.createElement("li");

                  const cityBtn = document.createElement("button");
                  cityBtn.className = "line city";

                  cityBtn.innerHTML = `
                    <span class="label">${city}</span>
                    <span class="pill">${list.length}</span>
                  `;

                  cityBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    document.querySelector(".main")
                      ?.scrollIntoView({ behavior: "smooth" });
                    loadStores({ city });
                  });

                  liCity.appendChild(cityBtn);
                  nestedCity.appendChild(liCity);
                });

              liCountry.appendChild(cBtn);
              liCountry.appendChild(nestedCity);
              nestedC.appendChild(liCountry);
            });

          liCont.appendChild(contBtn);
          liCont.appendChild(nestedC);
          menu.appendChild(liCont);
        });
    });
}

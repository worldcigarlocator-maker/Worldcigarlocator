/* ============================================================
   SIDEBAR — Hierarchy (Continent → Country → City)
   ============================================================ */
export function buildFrontendSidebar(supabase, loadStores) {
  const menu = document.getElementById("sidebarMenu");
  if (!menu) return;

  menu.innerHTML = `<li style="color:#777">Loading…</li>`;

  supabase
    .from("stores_public")
    .select("id,name,country,city,continent")
    .then(({ data, error }) => {
      if (error || !data) {
        menu.innerHTML = `<li style="color:#f55">Failed to load sidebar.</li>`;
        return;
      }

      // Group
      const grouped = {};
      for (const s of data) {
        if (!grouped[s.continent]) grouped[s.continent] = {};
        if (!grouped[s.continent][s.country]) grouped[s.continent][s.country] = {};
        if (!grouped[s.continent][s.country][s.city])
          grouped[s.continent][s.country][s.city] = [];

        grouped[s.continent][s.country][s.city].push(s);
      }

      menu.innerHTML = "";

      Object.entries(grouped).forEach(([continent, countries]) => {
        const contBtn = document.createElement("button");
        contBtn.className = "line continent";
        contBtn.innerHTML = `
          <span class="label">${continent}</span>
        `;

        const nest = document.createElement("div");
        nest.className = "nested";

        contBtn.onclick = () => {
          nest.classList.toggle("show");
          loadStores({ continent });
        };

        Object.entries(countries).forEach(([country, cities]) => {
          const cBtn = document.createElement("button");
          cBtn.className = "line country";
          cBtn.innerHTML = `<span class="label">${country}</span>`;

          const nestCity = document.createElement("div");
          nestCity.className = "nested";

          cBtn.onclick = (e) => {
            e.stopPropagation();
            nestCity.classList.toggle("show");
            loadStores({ country });
          };

          Object.entries(cities).forEach(([city]) => {
            const cityBtn = document.createElement("button");
            cityBtn.className = "line city";
            cityBtn.innerHTML = `<span class="label">${city}</span>`;
            cityBtn.onclick = (e) => {
              e.stopPropagation();
              loadStores({ city });
            };
            nestCity.appendChild(cityBtn);
          });

          nest.appendChild(cBtn);
          nest.appendChild(nestCity);
        });

        menu.appendChild(contBtn);
        menu.appendChild(nest);
      });
    });
}

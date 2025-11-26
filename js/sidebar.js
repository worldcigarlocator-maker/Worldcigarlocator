import { getContinent } from "./globals.js";

export function buildFrontendSidebar(supabase, loadStores) {
  console.log("🔥 Sidebar init…");

  const menu = document.getElementById("sidebarMenu");
  if (!menu) return;

  menu.innerHTML = `<li style="color:#999">Loading…</li>`;

  supabase
    .from("stores_frontend_public_v3")
    .select("id,name,country,city")
    .then(({ data, error }) => {
      console.log("📦 SIDEBAR DATA:", data);
      console.log("❌ SIDEBAR ERROR:", error);

      if (error || !data) {
        menu.innerHTML = `<li style="color:#f55">Failed to load.</li>`;
        return;
      }

      const grouped = {};

      data.forEach((s) => {
        const cont = getContinent(s.country) || "Unknown";
        if (!grouped[cont]) grouped[cont] = {};

        const ctry = s.country || "Unknown";
        if (!grouped[cont][ctry]) grouped[cont][ctry] = {};

        const city = s.city || "Unknown";
        if (!grouped[cont][ctry][city]) grouped[cont][ctry][city] = [];

        grouped[cont][ctry][city].push(s);
      });

      menu.innerHTML = "";

      Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([continent, countries]) => {
          const contBtn = document.createElement("button");
          contBtn.className = "line continent";

          const total = Object.values(countries).reduce(
            (sum, cities) =>
              sum +
              Object.values(cities).reduce((n, list) => n + list.length, 0),
            0
          );

          contBtn.innerHTML = `
            <span class="arrow">▶</span>
            <span class="label">${continent}</span>
            <span class="pill">${total}</span>
          `;

          const nestedC = document.createElement("div");
          nestedC.className = "nested";

          contBtn.onclick = () => {
            const open = nestedC.classList.toggle("show");
            contBtn.classList.toggle("open", open);
            contBtn.querySelector(".arrow").style.transform =
              open ? "rotate(90deg)" : "rotate(0deg)";
            if (open) loadStores({ continent });
          };

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

              cBtn.onclick = (e) => {
                e.stopPropagation();
                const open = nestedCity.classList.toggle("show");
                cBtn.classList.toggle("open", open);
                cBtn.querySelector(".arrow").style.transform =
                  open ? "rotate(90deg)" : "rotate(0deg)";
                if (open) loadStores({ country });
              };

              Object.entries(cities)
                .sort(([, a], [, b]) => b.length - a.length)
                .forEach(([city, cityStores]) => {
                  const cityBtn = document.createElement("button");
                  cityBtn.className = "line city";

                  cityBtn.innerHTML = `
                    <span class="label">${city}</span>
                    <span class="pill">${cityStores.length}</span>
                  `;

                  cityBtn.onclick = (e) => {
                    e.stopPropagation();
                    loadStores({ city });
                  };

                  nestedCity.appendChild(cityBtn);
                });

              nestedC.appendChild(cBtn);
              nestedC.appendChild(nestedCity);
            });

          menu.appendChild(contBtn);
          menu.appendChild(nestedC);
        });
    });
}

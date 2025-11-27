import { qs } from "./globals.js";

/* ============== Toggle Helper ============== */
function toggleNested(btn, box, onOpen) {
  const isOpen = box.classList.toggle("show");
  btn.classList.toggle("open", isOpen);
  const arrow = btn.querySelector(".arrow");
  if (arrow) arrow.style.transform = isOpen ? "rotate(90deg)" : "rotate(0deg)";

  if (isOpen && onOpen) onOpen();
}

/* ============== Continent Resolver ============== */
function getContinent(country) {
  if (!country) return "Other";
  const c = country.toLowerCase();

  if (["usa", "united states", "canada", "mexico"].some(x => c.includes(x)))
    return "North America";

  if (
    ["sweden","germany","france","uk","spain","italy","norway","poland","denmark"]
      .some(x => c.includes(x))
  )
    return "Europe";

  if (["china","japan","korea","india","thailand","vietnam"].some(x=>c.includes(x)))
    return "Asia";

  if (["south africa","nigeria","egypt"].some(x=>c.includes(x)))
    return "Africa";

  if (["australia","new zealand"].some(x=>c.includes(x)))
    return "Oceania";

  if (["brazil","argentina","chile"].some(x=>c.includes(x)))
    return "South America";

  return "Other";
}

/* ============== Build Sidebar ============== */
export function buildFrontendSidebar(supabase, loadStores) {
  const menu = qs("sidebarMenu");
  if (!menu) return;

  menu.innerHTML = `<li style="color:#888">Loading…</li>`;

  supabase
    .from("stores_frontend_public_v4")
    .select("id,name,country,city")
    .then(({ data, error }) => {
      if (error || !data) {
        menu.innerHTML = `<li style="color:#f33">Failed to load</li>`;
        console.error(error);
        return;
      }

      const tree = {};

      data.forEach((s) => {
        const cont = getContinent(s.country);
        tree[cont] ??= {};
        tree[cont][s.country] ??= {};
        tree[cont][s.country][s.city] ??= [];
        tree[cont][s.country][s.city].push(s);
      });

      menu.innerHTML = "";

      Object.entries(tree).forEach(([continent, countries]) => {
        const contBtn = document.createElement("button");
        contBtn.className = "line continent";

        const total = Object.values(countries).reduce(
          (sum, cities) =>
            sum + Object.values(cities).reduce((a, b) => a + b.length, 0),
          0
        );

        contBtn.innerHTML = `
          <span class="arrow">▶</span>
          <span class="label">${continent}</span>
          <span class="pill">${total}</span>
        `;

        const contBox = document.createElement("div");
        contBox.className = "nested";

        contBtn.onclick = () =>
          toggleNested(contBtn, contBox, () => loadStores({ continent }));

        Object.entries(countries).forEach(([country, cities]) => {
          const cBtn = document.createElement("button");
          cBtn.className = "line country";

          const count = Object.values(cities).reduce(
            (sum, arr) => sum + arr.length,
            0
          );

          cBtn.innerHTML = `
            <span class="arrow">▶</span>
            <span class="label">${country}</span>
            <span class="pill">${count}</span>
          `;

          const cBox = document.createElement("div");
          cBox.className = "nested";

          cBtn.onclick = (ev) =>
            toggleNested(cBtn, cBox, () => loadStores({ country }));

          Object.entries(cities).forEach(([city, list]) => {
            const cityBtn = document.createElement("button");
            cityBtn.className = "line city";
            cityBtn.innerHTML = `
              <span class="label">${city}</span>
              <span class="pill">${list.length}</span>
            `;
            cityBtn.onclick = (e) => {
              e.stopPropagation();
              loadStores({ city });
            };
            cBox.appendChild(cityBtn);
          });

          contBox.appendChild(cBtn);
          contBox.appendChild(cBox);
        });

        menu.appendChild(contBtn);
        menu.appendChild(contBox);
      });
    });
}

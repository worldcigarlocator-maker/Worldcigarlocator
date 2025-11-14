/* ============================================================
   SIDEBAR — Same hierarchy logic as Backoffice
   ============================================================ */

export function buildFrontendSidebar(supabase, loadStores, getContinent){

  const menu = document.getElementById("sidebarMenu");
  if (!menu) return;

  menu.innerHTML = `<li style="color:#999">Loading…</li>`;

  supabase
    .from("stores_public")
    .select("id,name,country,city")
    .then(({ data, error }) => {

      if (error || !data){
        menu.innerHTML = `<li style="color:red">Failed to load</li>`;
        return;
      }

      /* GROUPED HIERARCHY */
      const grouped = {};

      data.forEach(s=>{
        const cont = getContinent(s.country);
        grouped[cont] ??= {};
        const country = s.country || "Unknown";
        grouped[cont][country] ??= {};
        const city = s.city || "Unknown";
        grouped[cont][country][city] ??= [];
        grouped[cont][country][city].push(s);
      });

      /* RENDER */
      menu.innerHTML = "";

      Object.entries(grouped).sort().forEach(([continent, countries])=>{
        const contBtn = document.createElement("button");
        contBtn.className = "line continent";
        contBtn.innerHTML = `
          <span class="arrow">▶</span>
          <span class="label">${continent}</span>
          <span class="pill">${
            Object.values(countries).reduce((sum,c)=>
              sum + Object.values(c).reduce((a,b)=>a+b.length,0)
            ,0)
          }</span>
        `;

        const nestedC = document.createElement("div");
        nestedC.className = "nested";

        contBtn.addEventListener("click",()=>{
          const open = nestedC.classList.toggle("show");
          contBtn.classList.toggle("open", open);
          contBtn.querySelector(".arrow").style.transform = open ? "rotate(90deg)" : "rotate(0deg)";
          if (open) loadStores({ continent });
        });

        Object.entries(countries).sort().forEach(([country, cities])=>{
          const cBtn = document.createElement("button");
          cBtn.className = "line country";
          cBtn.innerHTML = `
            <span class="arrow">▶</span>
            <span class="label">${country}</span>
            <span class="pill">${
              Object.values(cities).reduce((sum,arr)=> sum+arr.length ,0)
            }</span>
          `;
          const nestedCity = document.createElement("div");
          nestedCity.className = "nested";

          cBtn.addEventListener("click",(e)=>{
            e.stopPropagation();
            const open = nestedCity.classList.toggle("show");
            cBtn.classList.toggle("open", open);
            cBtn.querySelector(".arrow").style.transform = open ? "rotate(90deg)" : "rotate(0deg)";
            if (open) loadStores({ country });
          });

          Object.entries(cities).sort((a,b)=> b[1].length - a[1].length).forEach(([city, list])=>{
            const cityBtn = document.createElement("button");
            cityBtn.className = "line city";
            cityBtn.innerHTML = `
              <span class="label">${city}</span>
              <span class="pill">${list.length}</span>
            `;
            cityBtn.addEventListener("click",(e)=>{
              e.stopPropagation();
              document.querySelector(".main").scrollIntoView({behavior:"smooth"});
              loadStores({ city });
            });
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

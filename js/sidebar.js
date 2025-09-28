// === Supabase init ===
const supabaseUrl = "https://gbxxoeplkzbhsvagnfsr.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4";
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// Statisk struktur: kontinenter och länder visas alltid
const structure = {
  Europe: ["Sweden", "Norway", "Denmark", "Germany", "Finland"],
  "North America": ["USA", "Canada", "Mexico"],
  South America: ["Brazil", "Argentina", "Cuba"],
  Asia: ["Japan", "China", "India"],
  Africa: ["South Africa", "Egypt", "Morocco"],
  Oceania: ["Australia", "New Zealand"]
};

const sidebar = document.querySelector(".sidebar");
const sidebarMenu = document.getElementById("sidebarMenu");
const sidebarSearch = document.getElementById("sidebarSearch");

// Bygg statisk lista: kontinenter -> länder (alltid synliga)
function renderStaticStructure() {
  sidebarMenu.innerHTML = "";
  Object.entries(structure).forEach(([continent, countries]) => {
    const continentEl = document.createElement("div");
    continentEl.className = "continent";
    continentEl.innerHTML = `<strong>${continent}</strong>`;

    const countryList = document.createElement("ul");
    countries.forEach(country => {
      const li = document.createElement("li");
      li.innerHTML = `
        <span class="country">${country}</span>
        <ul id="cities-${continent}-${country}"></ul>
      `;
      countryList.appendChild(li);
    });

    continentEl.appendChild(countryList);
    sidebarMenu.appendChild(continentEl);
  });
}

// Hämta städer som har butiker och lägg in under rätt land
async function loadCitiesWithStores() {
  // stores + joina city (kräver FK stores.city_id -> cities.id)
  const { data, error } = await supabase
    .from("stores")
    .select("id, city:cities(name, country, continent)");

  if (error) {
    console.error("Error fetching stores/cities:", error);
    return;
  }

  (data || []).forEach(row => {
    const city = row.city;
    if (!city) return;

    // Viktigt: country i databasen måste matcha texten i structure (t.ex. "USA" vs "United States")
    const listId = `cities-${city.continent}-${city.country}`;
    const targetList = document.getElementById(listId);
    if (!targetList) return;

    // Lägg bara till staden en gång
    if (!targetList.querySelector(`[data-city='${city.name}']`)) {
      const li = document.createElement("li");
      li.dataset.city = city.name;
      li.innerHTML = `<a href="city.html?city=${encodeURIComponent(city.name)}">${city.name}</a>`;
      targetList.appendChild(li);
    }
  });
}

// Sök/filter: döljer icke-matchande rader, men behåller struktur
function bindSearch() {
  sidebarSearch?.addEventListener("input", () => {
    const term = (sidebarSearch.value || "").toLowerCase();

    // Visa/dölj kontinenter, länder och städer baserat på textmatch
    sidebarMenu.querySelectorAll(".continent").forEach(contEl => {
      const continentName = contEl.querySelector("strong")?.innerText?.toLowerCase() || "";
      let continentHasMatch = continentName.includes(term);

      // Sök i länder
      contEl.querySelectorAll("> ul > li").forEach(countryLi => {
        const countryName = countryLi.querySelector(".country")?.innerText?.toLowerCase() || "";
        let countryHasMatch = countryName.includes(term);

        // Sök i städer
        let cityHasAny = false;
        countryLi.querySelectorAll("ul > li").forEach(cityLi => {
          const cityName = cityLi.innerText.toLowerCase();
          const hit = cityName.includes(term) || countryHasMatch || continentHasMatch;
          cityLi.style.display = hit ? "" : "none";
          if (hit) cityHasAny = true;
        });

        // Visa land om det självt matchar eller om någon stad matchar
        const showCountry = countryHasMatch || cityHasAny || continentHasMatch || term === "";
        countryLi.style.display = showCountry ? "" : "none";
        if (showCountry) continentHasMatch = true;
      });

      // Visa kontinent om den själv/länder/städer matchar
      contEl.style.display = (continentHasMatch || term === "") ? "" : "none";
    });
  });
}

// Hamburger för mobil
function bindHamburger() {
  const burger = document.querySelector(".hamburger");
  burger?.addEventListener("click", () => {
    sidebar.classList.toggle("active");
  });
}

// Init
document.addEventListener("DOMContentLoaded", async () => {
  renderStaticStructure();
  await loadCitiesWithStores();
  bindSearch();
  bindHamburger();
});

const supabaseUrl = "https://gbxxoeplkzbhsvagnfsr.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4";
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

let grouped = {}; // lagra trädet globalt

async function loadSidebar() {
  // 1. Hämta alla stores → få city_ids
  const { data: stores } = await supabase.from("stores").select("city_id");
  const cityIds = [...new Set(stores.map(s => s.city_id))];

  // 2. Hämta städer
  const { data: cities } = await supabase
    .from("cities")
    .select("id, name, country, continent")
    .in("id", cityIds);

  // 3. Gruppera
  grouped = {};
  cities.forEach(c => {
    if (!grouped[c.continent]) grouped[c.continent] = {};
    if (!grouped[c.continent][c.country]) grouped[c.continent][c.country] = [];
    grouped[c.continent][c.country].push(c);
  });

  // 4. Rendera hela trädet
  renderSidebar(grouped);
}

function renderSidebar(data, filter = "") {
  const container = document.getElementById("menu-structure");
  container.innerHTML = "";

  Object.keys(data).sort().forEach(cont => {
    let continentMatches = cont.toLowerCase().includes(filter);
    const continentDiv = document.createElement("div");
    continentDiv.classList.add("toggle");
    continentDiv.innerHTML = `<span>►</span>${cont}`;
    const countryList = document.createElement("ul");

    Object.keys(data[cont]).sort().forEach(country => {
      let countryMatches = country.toLowerCase().includes(filter);
      const countryLi = document.createElement("li");
      const countryToggle = document.createElement("div");
      countryToggle.classList.add("toggle");
      countryToggle.innerHTML = `<span>►</span>${country}`;
      const cityUl = document.createElement("ul");

      let cityHasMatch = false;
      data[cont][country]
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach(city => {
          const cityName = city.name;
          const matches = cityName.toLowerCase().includes(filter);
          if (matches || countryMatches || continentMatches) {
            const cityLi = document.createElement("li");
            cityLi.innerHTML = `<a href="city.html?city=${encodeURIComponent(cityName)}">${cityName}</a>`;
            cityUl.appendChild(cityLi);
            cityHasMatch = true;
          }
        });

      if (cityHasMatch || countryMatches || continentMatches) {
        countryToggle.addEventListener("click", () => {
          cityUl.classList.toggle("open");
          const arrow = countryToggle.querySelector("span");
          arrow.textContent = cityUl.classList.contains("open") ? "▼" : "►";
        });
        countryLi.appendChild(countryToggle);
        countryLi.appendChild(cityUl);
        countryList.appendChild(countryLi);
      }
    });

    if (countryList.children.length > 0 || continentMatches) {
      continentDiv.addEventListener("click", () => {
        countryList.classList.toggle("open");
        const arrow = continentDiv.querySelector("span");
        arrow.textContent = countryList.classList.contains("open") ? "▼" : "►";
      });
      container.appendChild(continentDiv);
      container.appendChild(countryList);
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadSidebar();

  // koppla sökruta
  const searchBox = document.getElementById("searchBox");
  searchBox.addEventListener("input", () => {
    const filter = searchBox.value.trim().toLowerCase();
    renderSidebar(grouped, filter);
  });
});

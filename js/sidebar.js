// === Supabase init ===
const supabaseUrl = "https://gbxxoeplkzbhsvagnfsr.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4";
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

const sidebarMenu = document.getElementById("sidebarMenu");
const sidebarSearch = document.getElementById("sidebarSearch");

// Statisk struktur (alla kontinenter och länder)
const structure = {
  Europe: ["Sweden", "Norway", "Denmark", "Germany", "Finland"],
  "North America": ["USA", "Canada", "Mexico"],
  South America: ["Brazil", "Argentina", "Cuba"],
  Asia: ["Japan", "China", "India"],
  Africa: ["South Africa", "Egypt", "Morocco"],
  Oceania: ["Australia", "New Zealand"]
};

// === Rendera statisk struktur ===
function renderStaticStructure() {
  sidebarMenu.innerHTML = "";

  Object.entries(structure).forEach(([continent, countries]) => {
    const continentEl = document.createElement("div");
    continentEl.className = "continent";
    continentEl.innerHTML = `<strong>${continent}</strong>`;

    const countryList = document.createElement("ul");
    countries.forEach((country) => {
      const li = document.createElement("li");
      li.innerHTML = `<span class="country">${country}</span>
                      <ul id="cities-${continent}-${country}"></ul>`;
      countryList.appendChild(li);
    });

    continentEl.appendChild(countryList);
    sidebarMenu.appendChild(continentEl);
  });
}

// === Hämta städer som har butiker ===
async function loadCities() {
  const { data: stores, error } = await supabase
    .from("stores")
    .select("id, name, city:cities(name, country, continent)");

  if (error) {
    console.error("Error fetching cities:", error);
    return;
  }

  stores.forEach((store) => {
    const city = store.city;
    if (!city) return;

    const targetList = document.getElementById(
      `cities-${city.continent}-${city.country}`
    );
    if (targetList) {
      if (!targetList.querySelector(`[data-city='${city.name}']`)) {
        const cityLi = document.createElement("li");
        cityLi.dataset.city = city.name;
        cityLi.innerHTML = `<a href="city.html?city=${encodeURIComponent(
          city.name
        )}">${city.name}</a>`;
        targetList.appendChild(cityLi);
      }
    }
  });
}

// === Sökfunktion ===
sidebarSearch.addEventListener("input", () => {
  const term = sidebarSearch.value.toLowerCase();
  const items = sidebarMenu.querySelectorAll("li, .continent");

  items.forEach((item) => {
    if (item.innerText.toLowerCase().includes(term) || term === "") {
      item.style.display = "";
    } else {
      item.style.display = "none";
    }
  });
});

// === Init ===
renderStaticStructure();
loadCities();

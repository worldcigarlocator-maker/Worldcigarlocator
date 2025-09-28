// === Supabase init ===
const supabaseUrl = "https://gbxxoeplkzbhsvagnfsr.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4";
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// ===== Struktur för världsdelar & länder (statisk) =====
const structure = {
  Europe: ["Sweden", "Norway", "France", "Germany", "Spain", "Italy"],
  "North America": ["USA", "Canada", "Mexico"],
  "South America": ["Brazil", "Argentina", "Chile"],
  Asia: ["Japan", "China", "Thailand"],
  Africa: ["South Africa", "Egypt", "Morocco"],
  Oceania: ["Australia", "New Zealand"]
};

// ===== Render sidebar =====
async function renderSidebar() {
  const menu = document.getElementById("sidebarMenu");
  menu.innerHTML = "";

  // Hämta alla städer som faktiskt har butiker
  const { data: stores, error } = await supabase
    .from("stores")
    .select("id, name, city:cities(name, country, continent)");

  if (error) {
    console.error("Error fetching stores:", error);
    return;
  }

  // Gruppera städer som har butiker
  const citiesWithStores = {};
  stores.forEach((store) => {
    const city = store.city;
    if (!city) return;
    if (!citiesWithStores[city.country]) {
      citiesWithStores[city.country] = new Set();
    }
    citiesWithStores[city.country].add(city.name);
  });

  // Bygg världsdelar och länder
  Object.entries(structure).forEach(([continent, countries]) => {
    // Continent-knapp
    const contBtn = document.createElement("div");
    contBtn.className = "menu-continent";
    contBtn.textContent = continent;

    const arrow = document.createElement("span");
    arrow.className = "toggle-arrow";
    arrow.textContent = "►";
    contBtn.appendChild(arrow);

    const countryList = document.createElement("div");
    countryList.className = "menu-countries";
    countryList.style.display = "none";

    // Länder under varje världsdel
    countries.forEach((country) => {
      const countryDiv = document.createElement("div");
      countryDiv.className = "menu-country";
      countryDiv.textContent = country;

      const arrow2 = document.createElement("span");
      arrow2.className = "toggle-arrow";
      arrow2.textContent = "►";
      countryDiv.appendChild(arrow2);

      const cityList = document.createElement("div");
      cityList.className = "menu-cities";

      // Lägg till städer (endast de med butiker)
      if (citiesWithStores[country]) {
        citiesWithStores[country].forEach((city) => {
          const a = document.createElement("a");
          a.href = `city.html?city=${encodeURIComponent(city)}`;
          a.textContent = city;
          cityList.appendChild(a);
        });
      }

      // Toggle länder
      countryDiv.addEventListener("click", () => {
        const isOpen = cityList.style.display === "block";
        cityList.style.display = isOpen ? "none" : "block";
        arrow2.textContent = isOpen ? "►" : "▼";
      });

      countryDiv.appendChild(cityList);
      countryList.appendChild(countryDiv);
    });

    // Toggle kontinenter
    contBtn.addEventListener("click", () => {
      const isOpen = countryList.style.display === "block";
      countryList.style.display = isOpen ? "none" : "block";
      arrow.textContent = isOpen ? "►" : "▼";
    });

    menu.appendChild(contBtn);
    menu.appendChild(countryList);
  });
}

// ===== Sökfunktion =====
document.getElementById("sidebarSearch").addEventListener("input", function () {
  const query = this.value.toLowerCase();
  document.querySelectorAll("#sidebarMenu a").forEach((a) => {
    a.style.display = a.textContent.toLowerCase().includes(query)
      ? "block"
      : "none";
  });
});

// ===== Kör =====
renderSidebar();

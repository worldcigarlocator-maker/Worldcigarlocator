// === Supabase init ===
const supabaseUrl = "https://gbxxoeplkzbhsvagnfsr.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4";
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// === Statisk struktur (utan Antarktis) ===
const structure = {
  Europe: { Sweden: [], France: [], Germany: [] },
  Asia: { Japan: [], China: [], India: [] },
  Africa: { Egypt: [], SouthAfrica: [] },
  "North America": { USA: [], Canada: [] },
  "South America": { Brazil: [], Argentina: [] },
  Oceania: { Australia: [], NewZealand: [] }
};

// === Rendera sidebar ===
async function renderSidebar() {
  const menu = document.getElementById("sidebarMenu");
  if (!menu) return;
  menu.innerHTML = "";

  // 1. Hämta städer som har butiker
  const { data: stores, error } = await supabaseClient
    .from("stores")
    .select("id, city_id, cities(name, country, continent)")
    .neq("city_id", null);

  if (error) {
    console.error("Fel vid hämtning av städer:", error);
    return;
  }

  // 2. Placera städer i rätt kontinent/land
  stores.forEach(store => {
    const city = store.cities;
    if (!city) return;
    const { name, country, continent } = city;
    if (structure[continent] && structure[continent][country]) {
      if (!structure[continent][country].includes(name)) {
        structure[continent][country].push(name);
      }
    }
  });

  // 3. Bygg menyerna
  for (const continent in structure) {
    const continentBtn = document.createElement("button");
    continentBtn.className = "sidebar-btn";
    continentBtn.textContent = continent;

    const countryList = document.createElement("ul");
    countryList.className = "nested hidden";

    for (const country in structure[continent]) {
      const countryLi = document.createElement("li");
      const countryBtn = document.createElement("button");
      countryBtn.className = "sidebar-subbtn";
      countryBtn.textContent = country;

      const cityList = document.createElement("ul");
      cityList.className = "nested hidden";

      structure[continent][country].forEach(city => {
        const cityLi = document.createElement("li");
        cityLi.innerHTML = `<a href="city.html?city=${encodeURIComponent(city)}">${city}</a>`;
        cityList.appendChild(cityLi);
      });

      countryBtn.addEventListener("click", () => {
        cityList.classList.toggle("hidden");
      });

      countryLi.appendChild(countryBtn);
      if (cityList.children.length > 0) {
        countryLi.appendChild(cityList);
      }
      countryList.appendChild(countryLi);
    }

    continentBtn.addEventListener("click", () => {
      countryList.classList.toggle("hidden");
    });

    menu.appendChild(continentBtn);
    menu.appendChild(countryList);
  }
}

// === Sökfunktion ===
function setupSearch() {
  const input = document.getElementById("sidebarSearch");
  if (!input) return;
  input.addEventListener("input", () => {
    const filter = input.value.toLowerCase();
    const items = document.querySelectorAll("#sidebarMenu li, #sidebarMenu a, #sidebarMenu button");
    items.forEach(el => {
      if (el.textContent.toLowerCase().includes(filter)) {
        el.style.display = "";
      } else {
        el.style.display = "none";
      }
    });
  });
}

renderSidebar();
setupSearch();

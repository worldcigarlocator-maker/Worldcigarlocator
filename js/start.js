// js/start.js
console.log("✅ start.js med landräknare laddat");

// Initiera Supabase
const SUPABASE_URL = "https://gbxxoeplkzbhsvagnfsr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// === Hämta kontinenter ===
async function loadContinents() {
  console.log("🌍 Hämtar kontinenter...");
  const { data, error } = await supabase.from("continents").select("*").order("name", { ascending: true });
  if (error) {
    console.error("Fel vid hämtning av kontinenter:", error.message);
    return;
  }

  const sidebarMenu = document.getElementById("sidebarMenu");
  sidebarMenu.innerHTML = ""; // rensa först

  data.forEach(continent => {
    const continentEl = createContinentElement(continent);
    sidebarMenu.appendChild(continentEl);
  });
}

// === Skapa kontinent-element ===
function createContinentElement(continent) {
  const li = document.createElement("li");
  li.classList.add("continent-item");

  // Toggle ikon
  const toggleIcon = document.createElement("span");
  toggleIcon.classList.add("toggle-icon");
  toggleIcon.textContent = "+";

  // Namn
  const nameSpan = document.createElement("span");
  nameSpan.textContent = continent.name;

  // Länder-lista
  const countryList = document.createElement("ul");
  countryList.classList.add("country-list");

  // Klick för att toggla
  li.addEventListener("click", async () => {
    if (countryList.classList.contains("open")) {
      countryList.classList.remove("open");
      toggleIcon.textContent = "+";
    } else {
      if (countryList.children.length === 0) {
        await loadCountriesForContinent(continent.id, countryList);
      }
      countryList.classList.add("open");
      toggleIcon.textContent = "–";
    }
  });

  li.appendChild(toggleIcon);
  li.appendChild(nameSpan);
  li.appendChild(countryList);

  return li;
}

// === Hämta länder för en kontinent ===
async function loadCountriesForContinent(continentId, container) {
  console.log(`🌎 Hämtar länder för kontinent: ${continentId}`);
  const { data, error } = await supabase
    .from("countries")
    .select("*")
    .eq("continent_id", continentId)
    .order("name", { ascending: true });

  if (error) {
    console.error("Fel vid hämtning av länder:", error.message);
    return;
  }

  data.forEach(country => {
    const countryEl = createCountryElement(country);
    container.appendChild(countryEl);
  });
}

// === Skapa land-element ===
function createCountryElement(country) {
  const li = document.createElement("li");
  li.classList.add("country-item");

  // Toggle ikon
  const toggleIcon = document.createElement("span");
  toggleIcon.classList.add("toggle-icon");
  toggleIcon.textContent = "+";

  // Flagga + namn
  const nameSpan = document.createElement("span");
  nameSpan.textContent = `${country.flag || ""} ${country.name}`;

  // Cities-lista
  const cityList = document.createElement("ul");
  cityList.classList.add("city-list");

  // Klick för att toggla
  li.addEventListener("click", async (e) => {
    e.stopPropagation(); // stoppa bubbla så inte kontinent också togglar
    if (cityList.classList.contains("open")) {
      cityList.classList.remove("open");
      toggleIcon.textContent = "+";
    } else {
      if (cityList.children.length === 0) {
        await loadCitiesForCountry(country.id, cityList);
      }
      cityList.classList.add("open");
      toggleIcon.textContent = "–";
    }
  });

  li.appendChild(toggleIcon);
  li.appendChild(nameSpan);
  li.appendChild(cityList);

  return li;
}

// === Hämta städer för ett land ===
async function loadCitiesForCountry(countryId, container) {
  console.log(`🏙️ Hämtar städer för land: ${countryId}`);
  const { data, error } = await supabase
    .from("cities")
    .select("*")
    .eq("country_id", countryId)
    .order("name", { ascending: true });

  if (error) {
    console.error("Fel vid hämtning av städer:", error.message);
    return;
  }

  data.forEach(city => {
    const li = document.createElement("li");
    li.classList.add("city-item");
    li.textContent = city.name;
    container.appendChild(li);
  });
}

// === Init ===
document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 start.js laddat");
  loadContinents();
});

// Initiera Supabase
const SUPABASE_URL = "https://gbxxoeplkzbhsvagnfsr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// === Ladda kontinenter ===
async function loadContinents() {
  const { data, error } = await supabase.from("continents").select("*").order("name");
  if (error) {
    console.error("Fel vid hämtning av kontinenter:", error);
    return;
  }

  const sidebarMenu = document.getElementById("sidebarMenu");
  sidebarMenu.innerHTML = "";

  data.forEach(continent => {
    const li = document.createElement("li");
    li.classList.add("continent-item");

    // Toggleikon till vänster
    const toggle = document.createElement("span");
    toggle.classList.add("toggle-icon");
    toggle.textContent = "+";

    const name = document.createElement("span");
    name.textContent = continent.name;

    const countries = document.createElement("ul");
    countries.classList.add("country-list");

    li.appendChild(toggle);
    li.appendChild(name);
    li.appendChild(countries);

    li.addEventListener("click", async () => {
      if (countries.style.display === "block") {
        countries.style.display = "none";
        toggle.textContent = "+";
      } else {
        if (countries.children.length === 0) {
          await loadCountries(continent.id, countries);
        }
        countries.style.display = "block";
        toggle.textContent = "–";
      }
    });

    sidebarMenu.appendChild(li);
  });
}

// === Ladda länder ===
async function loadCountries(continentId, container) {
  const { data, error } = await supabase
    .from("countries")
    .select("*")
    .eq("continent_id", continentId)
    .order("name");

  if (error) {
    console.error("Fel vid hämtning av länder:", error);
    return;
  }

  data.forEach(country => {
    const li = document.createElement("li");
    li.classList.add("country-item");

    const toggle = document.createElement("span");
    toggle.classList.add("toggle-icon");
    toggle.textContent = "+";

    const name = document.createElement("span");
    name.textContent = `${country.flag || ""} ${country.name}`;

    const cities = document.createElement("ul");
    cities.classList.add("city-list");

    li.appendChild(toggle);
    li.appendChild(name);
    li.appendChild(cities);

    li.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (cities.style.display === "block") {
        cities.style.display = "none";
        toggle.textContent = "+";
      } else {
        if (cities.children.length === 0) {
          await loadCities(country.id, cities);
        }
        cities.style.display = "block";
        toggle.textContent = "–";
      }
    });

    container.appendChild(li);
  });
}

// === Ladda städer ===
async function loadCities(countryId, container) {
  const { data, error } = await supabase
    .from("cities")
    .select("*")
    .eq("country_id", countryId)
    .order("name");

  if (error) {
    console.error("Fel vid hämtning av städer:", error);
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
  console.log("🚀 Mini-fixad start.js laddad");
  loadContinents();
});

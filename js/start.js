// js/start.js
console.log("✅ start.js med landräknare laddat");

// Initiera Supabase
const SUPABASE_URL = "https://gbxxoeplkzbhsvagnfsr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ start.js loaded");
  loadContinents();
});

// Ladda kontinenter
async function loadContinents() {
  console.log("🔎 Hämtar kontinenter...");
  const { data, error } = await supabase.from("continents").select("*").order("name");

  if (error) {
    console.error("❌ Error loading continents:", error);
    return;
  }

  const menu = document.getElementById("sidebarMenu");
  menu.innerHTML = ""; // rensa

  data.forEach(continent => {
    const continentItem = document.createElement("li");
    continentItem.className = "continent-item";

    const toggle = document.createElement("span");
    toggle.className = "toggle-icon";
    toggle.textContent = "+";

    const label = document.createElement("span");
    label.textContent = continent.name;

    const countriesList = document.createElement("ul");
    countriesList.className = "country-list";
    countriesList.style.display = "none";

    continentItem.appendChild(toggle);
    continentItem.appendChild(label);
    continentItem.appendChild(countriesList);

    toggle.addEventListener("click", async () => {
      if (countriesList.style.display === "none") {
        countriesList.style.display = "block";
        toggle.textContent = "−";
        await loadCountries(continent.id, countriesList);
      } else {
        countriesList.style.display = "none";
        toggle.textContent = "+";
      }
    });

    menu.appendChild(continentItem);
  });
}

// Ladda länder
async function loadCountries(continentId, container) {
  container.innerHTML = "⏳ Loading...";
  const { data, error } = await supabase
    .from("countries")
    .select("id, name, flag")
    .eq("continent_id", continentId)
    .order("name");

  if (error) {
    console.error("❌ Error loading countries:", error);
    container.innerHTML = "<li>Error loading countries</li>";
    return;
  }

  container.innerHTML = "";
  for (const country of data) {
    const countryItem = document.createElement("li");
    countryItem.className = "country-item";

    const toggle = document.createElement("span");
    toggle.className = "toggle-icon";
    toggle.textContent = "+";

    const label = document.createElement("span");
    label.textContent = `${country.flag} ${country.name}`;

    const count = document.createElement("span");
    count.className = "store-count";
    count.textContent = await getStoreCountByCountry(country.id);

    const citiesList = document.createElement("ul");
    citiesList.className = "city-list";
    citiesList.style.display = "none";

    countryItem.appendChild(toggle);
    countryItem.appendChild(label);
    countryItem.appendChild(count);
    countryItem.appendChild(citiesList);

    toggle.addEventListener("click", async () => {
      if (citiesList.style.display === "none") {
        citiesList.style.display = "block";
        toggle.textContent = "−";
        await loadCities(country.id, citiesList);
      } else {
        citiesList.style.display = "none";
        toggle.textContent = "+";
      }
    });

    container.appendChild(countryItem);
  }
}

// Ladda städer
async function loadCities(countryId, container) {
  container.innerHTML = "⏳ Loading...";
  const { data, error } = await supabase
    .from("cities")
    .select("id, name")
    .eq("country_id", countryId)
    .order("name");

  if (error) {
    console.error("❌ Error loading cities:", error);
    container.innerHTML = "<li>Error loading cities</li>";
    return;
  }

  container.innerHTML = "";
  for (const city of data) {
    const cityItem = document.createElement("li");
    cityItem.className = "city-item";

    const label = document.createElement("span");
    label.textContent = city.name;

    const count = document.createElement("span");
    count.className = "store-count";
    count.textContent = await getStoreCountByCity(city.id);

    cityItem.appendChild(label);
    cityItem.appendChild(count);
    container.appendChild(cityItem);
  }
}

// Hämta antal butiker per land
async function getStoreCountByCountry(countryId) {
  const { count, error } = await supabase
    .from("stores")
    .select("*", { count: "exact", head: true })
    .eq("country_id", countryId);

  if (error) {
    console.error("❌ Error counting stores for country:", error);
    return "0";
  }
  return count;
}

// Hämta antal butiker per stad
async function getStoreCountByCity(cityId) {
  const { count, error } = await supabase
    .from("stores")
    .select("*", { count: "exact", head: true })
    .eq("city_id", cityId);

  if (error) {
    console.error("❌ Error counting stores for city:", error);
    return "0";
  }
  return count;
}

// ====== Konfigurera Supabase ======
const SUPABASE_URL = "https://gbxxoeplkzbhsvagnfsr.supabase.co"; // byt till din
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4"; // byt till din
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// ====== Build sidebar ======
async function buildSidebar() {
  const sidebarMenu = document.getElementById("sidebarMenu");
  sidebarMenu.innerHTML = "";

  // Hämta kontinenter
  const { data: continents, error } = await supabase
    .from("continents")
    .select("id, name")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error loading continents:", error);
    return;
  }

  continents.forEach((continent) => {
    const contSection = document.createElement("li");

    // Header för kontinent
    const contHeader = document.createElement("div");
    contHeader.className = "continent-header";

    const leftWrapper = document.createElement("div");
    leftWrapper.className = "left-wrapper";

    const contToggle = document.createElement("span");
    contToggle.textContent = "+";
    contToggle.className = "continent-toggle";

    const contName = document.createElement("span");
    contName.textContent = continent.name;

    leftWrapper.appendChild(contToggle);
    leftWrapper.appendChild(contName);

    contHeader.appendChild(leftWrapper);

    contSection.appendChild(contHeader);

    // Lista för länder
    const countriesList = document.createElement("ul");
    countriesList.className = "country-list";
    contSection.appendChild(countriesList);

    // Toggle expand/collapse
    contHeader.addEventListener("click", () => {
      const expanded = countriesList.style.display === "block";
      countriesList.style.display = expanded ? "none" : "block";
      contToggle.textContent = expanded ? "+" : "-";

      if (!expanded && countriesList.childElementCount === 0) {
        loadCountries(continent.id, countriesList);
      }
    });

    sidebarMenu.appendChild(contSection);
  });
}

// ====== Load countries ======
async function loadCountries(continentId, container) {
  const { data: countries, error } = await supabase
    .from("countries")
    .select("id, name, flag, store_count")
    .eq("continent_id", continentId)
    .order("name", { ascending: true });

  if (error) {
    console.error("Error loading countries:", error);
    return;
  }

  countries.forEach((country) => {
    const li = document.createElement("li");
    li.className = "country-row";

    const leftWrapper = document.createElement("div");
    leftWrapper.className = "left-wrapper";

    const toggleIcon = document.createElement("span");
    toggleIcon.textContent = "+";
    toggleIcon.className = "toggle-icon";

    const flag = document.createElement("span");
    flag.textContent = country.flag || "🏳️";

    const name = document.createElement("span");
    name.textContent = country.name;

    leftWrapper.appendChild(toggleIcon);
    leftWrapper.appendChild(flag);
    leftWrapper.appendChild(name);

    const count = document.createElement("span");
    count.textContent = country.store_count || 0;
    count.className = "count";

    li.appendChild(leftWrapper);
    li.appendChild(count);

    // Lista för städer
    const cityList = document.createElement("ul");
    cityList.className = "city-list";
    li.appendChild(cityList);

    li.addEventListener("click", (e) => {
      if (e.target === count) return; // ignorera klick på count
      const expanded = cityList.style.display === "block";
      cityList.style.display = expanded ? "none" : "block";
      toggleIcon.textContent = expanded ? "+" : "-";

      if (!expanded && cityList.childElementCount === 0) {
        loadCities(country.id, cityList);
      }
    });

    container.appendChild(li);
  });
}

// ====== Load cities ======
async function loadCities(countryId, container) {
  const { data: cities, error } = await supabase
    .from("cities")
    .select("id, name, store_count")
    .eq("country_id", countryId)
    .order("name", { ascending: true });

  if (error) {
    console.error("Error loading cities:", error);
    return;
  }

  cities.forEach((city) => {
    const li = document.createElement("li");
    li.className = "city-row";

    const name = document.createElement("span");
    name.textContent = city.name;

    const count = document.createElement("span");
    count.textContent = city.store_count || 0;
    count.className = "count";

    li.appendChild(name);
    li.appendChild(count);

    container.appendChild(li);
  });
}

// ====== Init ======
document.addEventListener("DOMContentLoaded", buildSidebar);

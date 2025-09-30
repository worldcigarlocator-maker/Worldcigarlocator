// ====== Konfigurera Supabase ======
const SUPABASE_URL = "https://gbxxoeplkzbhsvagnfsr.supabase.co"; // byt till din
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4"; // byt till din
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ====== Bygg sidomenyn ======
async function buildSidebar() {
  const sidebarMenu = document.getElementById("sidebarMenu");
  if (!sidebarMenu) {
    console.error("❌ Hittade inget element med id=sidebarMenu i start.html");
    return;
  }

  // Hämta alla världsdelar
  const { data: continents, error: contErr } = await supabase
    .from("continents")
    .select("id, name")
    .order("name", { ascending: true });

  if (contErr) {
    console.error("Fel vid hämtning av världsdelar:", contErr.message);
    return;
  }

  continents.forEach(continent => {
    const contSection = document.createElement("div");
    contSection.classList.add("continent-section");

    // Header med namn + toggle
    const contHeader = document.createElement("div");
    contHeader.classList.add("continent-header");

    const contName = document.createElement("span");
    contName.textContent = continent.name;

    const contToggle = document.createElement("span");
    contToggle.textContent = "+"; // stängd från start
    contToggle.classList.add("continent-toggle");

    contHeader.appendChild(contName);
    contHeader.appendChild(contToggle);

    // Lista för länder (gömd från början)
    const countryList = document.createElement("ul");
    countryList.classList.add("country-list");
    countryList.style.display = "none";

    contHeader.addEventListener("click", async () => {
      const visible = countryList.style.display === "block";
      if (visible) {
        countryList.style.display = "none";
        contToggle.textContent = "+";
      } else {
        // Om tom – hämta länder
        if (countryList.childElementCount === 0) {
          await loadCountries(continent.id, countryList);
        }
        countryList.style.display = "block";
        contToggle.textContent = "–";
      }
    });

    contSection.appendChild(contHeader);
    contSection.appendChild(countryList);
    sidebarMenu.appendChild(contSection);
  });
}

// ====== Ladda länder för en världsdel ======
async function loadCountries(continentId, countryList) {
  const { data: countries, error: countryErr } = await supabase
    .from("countries")
    .select("id, name, flag, store_count")
    .eq("continent_id", continentId)
    .order("name", { ascending: true });

  if (countryErr) {
    console.error("Fel vid hämtning av länder:", countryErr.message);
    return;
  }

  countries.forEach(country => {
    const li = document.createElement("li");
    li.classList.add("country-row");

    const toggleIcon = document.createElement("span");
    toggleIcon.classList.add("toggle-icon");
    toggleIcon.textContent = "+";

    const flag = document.createElement("img");
    flag.src = country.flag;   // i Supabase: flag = emoji eller URL
    flag.alt = "";
    flag.classList.add("country-flag");

    const name = document.createElement("span");
    name.classList.add("country-name");
    name.textContent = country.name;

    const count = document.createElement("span");
    count.classList.add("country-count");
    count.textContent = country.store_count ?? 0;

    li.appendChild(toggleIcon);
    li.appendChild(flag);
    li.appendChild(name);
    li.appendChild(count);

    // Städer-lista
    const cityList = document.createElement("ul");
    cityList.classList.add("city-list");

    li.addEventListener("click", async (e) => {
      e.stopPropagation(); // hindra bubbla upp till continent
      const visible = cityList.style.display === "block";
      if (visible) {
        cityList.style.display = "none";
        toggleIcon.textContent = "+";
      } else {
        if (cityList.childElementCount === 0) {
          await loadCities(country.id, cityList);
        }
        cityList.style.display = "block";
        toggleIcon.textContent = "–";
      }
    });

    countryList.appendChild(li);
    countryList.appendChild(cityList);
  });
}

// ====== Ladda städer för ett land ======
async function loadCities(countryId, cityList) {
  const { data: cities, error: cityErr } = await supabase
    .from("cities")
    .select("id, name, store_count")
    .eq("country_id", countryId)
    .order("name", { ascending: true });

  if (cityErr) {
    console.error("Fel vid hämtning av städer:", cityErr.message);
    return;
  }

  cities.forEach(city => {
    const li = document.createElement("li");
    li.classList.add("city-item");
    li.textContent = `${city.name} (${city.store_count ?? 0})`;
    cityList.appendChild(li);
  });
}

// ====== Init ======
document.addEventListener("DOMContentLoaded", buildSidebar);

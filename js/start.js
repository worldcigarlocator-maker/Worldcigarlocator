// ===== Supabase init =====
const SUPABASE_URL = "https://gbxxoeplkzbhsvagnfsr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4"; // byt till din riktiga nyckel
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// ===== Ladda världsdelar =====
async function loadContinents() {
  console.log("🌍 Hämtar världsdelar...");
  const { data: continents, error } = await supabaseClient
    .from("continents")
    .select("id, name")
    .order("name", { ascending: true });

  if (error) {
    console.error("Fel vid hämtning av världsdelar:", error);
    return;
  }

  const sidebar = document.getElementById("sidebarMenu");
  sidebar.innerHTML = "";

  continents.forEach(continent => {
    const contEl = document.createElement("div");
    contEl.classList.add("continent-header");

    const toggleIcon = document.createElement("span");
    toggleIcon.classList.add("toggle-icon");
    toggleIcon.textContent = "+";

    const nameSpan = document.createElement("span");
    nameSpan.textContent = continent.name;

    contEl.appendChild(toggleIcon);
    contEl.appendChild(nameSpan);

    // Länder-lista (gömd först)
    const countryList = document.createElement("div");
    countryList.style.display = "none";

    // Toggle för världsdel
    contEl.addEventListener("click", async () => {
      const open = countryList.style.display === "block";
      if (open) {
        countryList.style.display = "none";
        toggleIcon.textContent = "+";
      } else {
        if (countryList.childElementCount === 0) {
          await loadCountries(continent.id, countryList);
        }
        countryList.style.display = "block";
        toggleIcon.textContent = "–";
      }
    });

    sidebar.appendChild(contEl);
    sidebar.appendChild(countryList);
  });
}

// ===== Ladda länder =====
async function loadCountries(continentId, container) {
  console.log("🏳️ Hämtar länder för kontinent:", continentId);
  const { data: countries, error } = await supabaseClient
    .from("countries")
    .select("id, name, flag")
    .eq("continent_id", continentId)
    .order("name", { ascending: true });

  if (error) {
    console.error("Fel vid hämtning av länder:", error);
    return;
  }

  countries.forEach(country => {
    const row = document.createElement("div");
    row.classList.add("country-row");

    const toggle = document.createElement("span");
    toggle.classList.add("country-toggle");
    toggle.textContent = "+";

    const flag = document.createElement("span");
    flag.classList.add("country-flag");
    flag.textContent = country.flag || "🏳️";

    const name = document.createElement("span");
    name.classList.add("country-name");
    name.textContent = country.name;

    const count = document.createElement("span");
    count.classList.add("country-count");
    count.textContent = "0"; // TODO: hämta antal stores

    row.appendChild(toggle);
    row.appendChild(flag);
    row.appendChild(name);
    row.appendChild(count);

    // Stad-lista
    const cityList = document.createElement("ul");
    cityList.classList.add("city-list");
    cityList.style.display = "none";

    row.addEventListener("click", async (e) => {
      e.stopPropagation(); // undvik att bubbla upp till kontinent
      const open = cityList.style.display === "block";
      if (open) {
        cityList.style.display = "none";
        toggle.textContent = "+";
      } else {
        if (cityList.childElementCount === 0) {
          await loadCities(country.id, cityList);
        }
        cityList.style.display = "block";
        toggle.textContent = "–";
      }
    });

    container.appendChild(row);
    container.appendChild(cityList);
  });
}

// ===== Ladda städer =====
async function loadCities(countryId, container) {
  console.log("🏙️ Hämtar städer för land:", countryId);
  const { data: cities, error } = await supabaseClient
    .from("cities")
    .select("id, name")
    .eq("country_id", countryId)
    .order("name", { ascending: true });

  if (error) {
    console.error("Fel vid hämtning av städer:", error);
    return;
  }

  cities.forEach(city => {
    const li = document.createElement("li");
    li.classList.add("city-item");

    const name = document.createElement("span");
    name.classList.add("city-name");
    name.textContent = city.name;

    const count = document.createElement("span");
    count.classList.add("city-count");
    count.textContent = "0"; // TODO: hämta antal stores

    li.appendChild(name);
    li.appendChild(count);
    container.appendChild(li);
  });
}

// ===== Starta =====
document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 DOM laddad, kör loadContinents()");
  loadContinents();
});

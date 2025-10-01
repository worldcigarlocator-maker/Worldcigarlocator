// ====== Konfigurera Supabase ======
const SUPABASE_URL = "https://gbxxoeplkzbhsvagnfsr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ====== Bygg sidomenyn ======
async function buildSidebar() {
  const sidebarMenu = document.getElementById("sidebarMenu");
  sidebarMenu.innerHTML = "";

  // Hämta kontinenter
  const { data: continents, error } = await supabase
    .from("continents")
    .select("id, name, store_count")
    .order("name", { ascending: true });

  if (error) {
    console.error("⚠️ Fel vid hämtning av kontinenter:", error);
    sidebarMenu.innerHTML = "<li>Fel vid hämtning av data</li>";
    return;
  }

  continents.forEach(continent => {
    const contLi = document.createElement("li");
    contLi.classList.add("continent");
    contLi.innerHTML = `<span class="label">🌍 ${continent.name} (${continent.store_count})</span>`;

    // när du klickar på kontinent → visa dess stores i main
    contLi.addEventListener("click", async () => {
      const stores = await getStoresByContinent(continent.id);
      renderGrid(stores, `Alla stores i ${continent.name}`);
    });

    // skapa container för länder
    const countryUl = document.createElement("ul");
    countryUl.classList.add("nested");
    contLi.appendChild(countryUl);

    // klick för att expandera länder
    contLi.querySelector(".label").addEventListener("click", async (e) => {
      e.stopPropagation();
      if (countryUl.childElementCount === 0) {
        await loadCountries(continent.id, countryUl);
      }
      countryUl.style.display = countryUl.style.display === "block" ? "none" : "block";
    });

    sidebarMenu.appendChild(contLi);
  });
}

// ====== Ladda länder ======
async function loadCountries(continentId, container) {
  const { data: countries, error } = await supabase
    .from("countries")
    .select("id, name, store_count")
    .eq("continent_id", continentId)
    .order("name", { ascending: true });

  if (error) {
    console.error("⚠️ Fel vid hämtning av länder:", error);
    return;
  }

  countries.forEach(country => {
    const li = document.createElement("li");
    li.classList.add("country");
    li.innerHTML = `<span class="label">🇨🇭 ${country.name} (${country.store_count})</span>`;

    // klick → visa stores i landet
    li.addEventListener("click", async () => {
      const stores = await getStoresByCountry(country.id);
      renderGrid(stores, `Alla stores i ${country.name}`);
    });

    const cityUl = document.createElement("ul");
    cityUl.classList.add("nested");
    li.appendChild(cityUl);

    // expandera städer
    li.querySelector(".label").addEventListener("click", async (e) => {
      e.stopPropagation();
      if (cityUl.childElementCount === 0) {
        await loadCities(country.id, cityUl);
      }
      cityUl.style.display = cityUl.style.display === "block" ? "none" : "block";
    });

    container.appendChild(li);
  });
}

// ====== Ladda städer ======
async function loadCities(countryId, container) {
  const { data: cities, error } = await supabase
    .from("cities")
    .select("id, name, store_count")
    .eq("country_id", countryId)
    .order("name", { ascending: true });

  if (error) {
    console.error("⚠️ Fel vid hämtning av städer:", error);
    return;
  }

  cities.forEach(city => {
    const li = document.createElement("li");
    li.classList.add("city");
    li.textContent = `${city.name} (${city.store_count})`;

    li.addEventListener("click", async (e) => {
      e.stopPropagation();
      const stores = await getStoresByCity(city.id);
      renderGrid(stores, `Stores i ${city.name}`);
    });

    container.appendChild(li);
  });
}

// ====== Hämtfunktioner ======
async function getStoresByContinent(continentId) {
  const { data, error } = await supabase
    .from("stores")
    .select("id, name, address, rating, city_id, cities!inner(country_id, countries!inner(continent_id))")
    .eq("cities.countries.continent_id", continentId);

  if (error) { console.error(error); return []; }
  return data;
}

async function getStoresByCountry(countryId) {
  const { data, error } = await supabase
    .from("stores")
    .select("id, name, address, rating, city_id, cities!inner(country_id)")
    .eq("cities.country_id", countryId);

  if (error) { console.error(error); return []; }
  return data;
}

async function getStoresByCity(cityId) {
  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .eq("city_id", cityId);

  if (error) { console.error(error); return []; }
  return data;
}

// ====== Render grid i main ======
function renderGrid(stores, title) {
  const main = document.getElementById("main");
  main.innerHTML = `<h2>${title}</h2>`;

  if (!stores || stores.length === 0) {
    main.innerHTML += "<p>Inga stores här ännu.</p>";
    return;
  }

  const grid = document.createElement("div");
  grid.classList.add("grid");

  stores.forEach(store => {
    const card = document.createElement("div");
    card.classList.add("card");
    card.innerHTML = `
      <h3>${store.name}</h3>
      <p>${store.address}</p>
      <p>⭐ ${store.rating || "No rating"}</p>
    `;
    grid.appendChild(card);
  });

  main.appendChild(grid);
}

// ====== Initiera ======
document.addEventListener("DOMContentLoaded", buildSidebar);

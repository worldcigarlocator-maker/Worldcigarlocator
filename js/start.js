// Initiera Supabase
const supabaseUrl = "https://gbxxoeplkzbhsvagnfsr.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4";
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

async function loadRecentStores() {
  const container = document.getElementById("recentStores");
  if (!container) return;

  container.innerHTML = "<p>Loading...</p>";

  const { data, error } = await supabase
    .from("stores")
    .select("id, name, address, link, created_at, cities(name)")
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    container.innerHTML = `<p class="error">Error loading stores: ${error.message}</p>`;
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = "<p>No stores added yet.</p>";
    return;
  }

  const ul = document.createElement("ul");
  ul.className = "store-list";

  data.forEach(store => {
    const li = document.createElement("li");
    li.className = "store-card";

    li.innerHTML = `
      <h3><a href="store.html?store=${store.id}">${store.name}</a></h3>
      <p>${store.address || ""}</p>
      <p><em>${store.cities?.name || ""}</em></p>
      ${store.link ? `<p><a href="${store.link}" target="_blank">Website</a></p>` : ""}
    `;

    ul.appendChild(li);
  });

  container.innerHTML = "";
  container.appendChild(ul);
}

// Kör vid laddning
document.addEventListener("DOMContentLoaded", () => {
  loadRecentStores();
});

// Bara världsdelar hårdkodade
const continents = ["Europe", "North America", "South America", "Asia", "Africa", "Oceania"];

async function loadSidebar() {
  const sidebar = document.getElementById("continentList");
  sidebar.innerHTML = "";

  // Hämta alla städer som har butiker
  const { data: cities } = await supabase
    .from("cities")
    .select("id, name, country, continent, stores(id)")
    .not("stores", "is", null);

  if (!cities) return;

  // Gruppera: kontinent → land → städer
  const grouped = {};
  continents.forEach(c => grouped[c] = {});

  cities.forEach(city => {
    if (!grouped[city.continent]) return; // hoppa över om continent inte matchar
    if (!grouped[city.continent][city.country]) {
      grouped[city.continent][city.country] = [];
    }
    grouped[city.continent][city.country].push(city);
  });

  // Bygg sidebar
  for (const cont of continents) {
    const contLi = document.createElement("li");
    contLi.className = "continent";

    const contBtn = document.createElement("button");
    contBtn.textContent = cont;
    contBtn.addEventListener("click", () => contLi.classList.toggle("open"));
    contLi.appendChild(contBtn);

    const countryUl = document.createElement("ul");
    for (const country in grouped[cont]) {
      const countryLi = document.createElement("li");
      countryLi.className = "country";

      const countryBtn = document.createElement("button");
      countryBtn.textContent = country;
      countryBtn.addEventListener("click", () => countryLi.classList.toggle("open"));
      countryLi.appendChild(countryBtn);

      const cityUl = document.createElement("ul");
      grouped[cont][country]
        .sort((a, b) => a.name.localeCompare(b.name)) // sortera städer
        .forEach(city => {
          const cityLi = document.createElement("li");
          cityLi.innerHTML = `<a href="city.html?city=${encodeURIComponent(city.name)}">${city.name}</a>`;
          cityUl.appendChild(cityLi);
        });

      countryLi.appendChild(cityUl);
      countryUl.appendChild(countryLi);
    }

    contLi.appendChild(countryUl);
    sidebar.appendChild(contLi);
  }
}

// Enkel sökfunktion
document.getElementById("sidebarSearch")?.addEventListener("input", e => {
  const q = e.target.value.toLowerCase();
  document.querySelectorAll("#continentList li").forEach(li => {
    const text = li.textContent.toLowerCase();
    li.style.display = text.includes(q) ? "" : "none";
  });
});

// Kör
loadSidebar();

async function loadMenu() {
  const { data, error } = await supabaseClient
    .from("cities")
    .select("*")
    .order("continent, country, name");

  if (error) {
    console.error(error);
    return;
  }

  // Gruppera
  const continents = {};
  data.forEach(city => {
    if (!continents[city.continent]) continents[city.continent] = {};
    if (!continents[city.continent][city.country]) continents[city.continent][city.country] = [];
    continents[city.continent][city.country].push(city);
  });

  // Bygg HTML
  const menu = document.getElementById("sidebarMenu");
  for (const [continent, countries] of Object.entries(continents)) {
    const continentLi = document.createElement("li");
    continentLi.innerHTML = `<strong>${continent}</strong><ul></ul>`;

    for (const [country, cities] of Object.entries(countries)) {
      const countryLi = document.createElement("li");
      countryLi.innerHTML = `<em>${country}</em><ul></ul>`;

      cities.forEach(c => {
        const cityLi = document.createElement("li");
        cityLi.innerHTML = `<a href="city.html?city=${encodeURIComponent(c.name)}">${c.name}</a>`;
        countryLi.querySelector("ul").appendChild(cityLi);
      });

      continentLi.querySelector("ul").appendChild(countryLi);
    }
    menu.appendChild(continentLi);
  }
}

loadMenu();

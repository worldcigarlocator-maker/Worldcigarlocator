// js/start.js
console.log("✅ start.js med landräknare laddat");

// Initiera Supabase
const SUPABASE_URL = "https://gbxxoeplkzbhsvagnfsr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// När sidan laddas
document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 DOMContentLoaded, laddar kontinenter...");
  loadContinents();
});

async function loadContinents() {
  const menu = document.getElementById("sidebarMenu");
  if (!menu) {
    console.error("❌ Hittade inte #sidebarMenu i DOM");
    return;
  }

  const { data: continents, error } = await supabase
    .from("continents")
    .select("id, name")
    .order("name");

  if (error) {
    console.error("Fel vid hämtning av kontinenter:", error);
    return;
  }

  console.log("🌍 Kontinenter:", continents);

  continents.forEach(continent => {
    const li = document.createElement("li");
    li.className = "continent-item";

    const header = document.createElement("div");
    header.className = "continent-header";
    header.innerHTML = `<span class="toggle">+</span> ${continent.name}`;

    // Container för länder
    const ul = document.createElement("ul");
    ul.className = "country-list";
    ul.style.display = "none";
    ul.id = `continent-${continent.id}-countries`;

    header.addEventListener("click", async () => {
      const toggle = header.querySelector(".toggle");
      if (ul.style.display === "none") {
        ul.style.display = "block";
        toggle.textContent = "–";
        await renderCountriesUnder(continent);
      } else {
        ul.style.display = "none";
        toggle.textContent = "+";
      }
    });

    li.appendChild(header);
    li.appendChild(ul);
    menu.appendChild(li);
  });
}

// === Hjälpfunktion för att räkna butiker per land ===
async function getStoreCountsByCountry(continentName) {
  const { data, error } = await supabase
    .from("stores_with_city") // du skapar vyn i SQL-editor
    .select("country, continent")
    .eq("continent", continentName);

  if (error) {
    console.error("Kunde inte hämta store-counts:", error);
    return {};
  }

  const counts = {};
  for (const row of data || []) {
    const c = row.country || "";
    if (!c) continue;
    counts[c] = (counts[c] || 0) + 1;
  }
  return counts;
}

// === Rendera länder under en kontinent ===
async function renderCountriesUnder(continent) {
  const { data: countries, error } = await supabase
    .from("countries")
    .select("id, name, flag")
    .eq("continent_id", continent.id)
    .order("name");

  if (error) {
    console.error("Fel vid hämtning av länder:", error);
    return;
  }

  const counts = await getStoreCountsByCountry(continent.name);

  const ul = document.getElementById(`continent-${continent.id}-countries`);
  if (!ul) return;
  ul.innerHTML = "";

  countries.forEach(c => {
    const li = document.createElement("li");
    li.className = "country-item";

    const flag = c.flag ? `${c.flag} ` : "";
    const count = counts[c.name] ? `<span class="count">(${counts[c.name]})</span>` : "";

    li.innerHTML = `${flag}${c.name} ${count}`;
    ul.appendChild(li);
  });
}

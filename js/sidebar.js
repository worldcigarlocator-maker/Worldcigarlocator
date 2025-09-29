// ===== Supabase init =====
const SUPABASE_URL = "https://gbxxoeplkzbhsvagnfsr.supabase.co";
const SUPABASE_ANON_KEY ="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function loadSidebar() {
  console.log("🚀 Laddar sidomeny...");

  // Hämta kontinenter
  const { data: continents, error: contError } = await supabase
    .from("continents")
    .select("*");

  if (contError) {
    console.error("Fel vid hämtning av kontinenter:", contError);
    return;
  }
  console.log("✅ Kontinenter:", continents);

  // Hämta länder
  const { data: countries, error: countryError } = await supabase
    .from("countries")
    .select("*");

  if (countryError) {
    console.error("Fel vid hämtning av länder:", countryError);
    return;
  }
  console.log("✅ Länder:", countries);

  // Bygg meny
  const menu = document.getElementById("sidebarMenu");
  menu.innerHTML = "";

  continents.forEach(continent => {
    // skapa en li för kontinenten
    const li = document.createElement("li");

    const btn = document.createElement("button");
    btn.textContent = continent.name;
    btn.classList.add("continent-btn");

    // ul för länder
    const ul = document.createElement("ul");
    ul.style.display = "none";

    // filtrera länder
    const relatedCountries = countries.filter(
      c => c.continent_id === continent.id
    );

    console.log(`🌍 ${continent.name} ->`, relatedCountries);

    relatedCountries.forEach(country => {
      const countryLi = document.createElement("li");
      countryLi.textContent = country.name;
      ul.appendChild(countryLi);
    });

    btn.addEventListener("click", () => {
      ul.style.display = ul.style.display === "none" ? "block" : "none";
    });

    li.appendChild(btn);
    li.appendChild(ul);
    menu.appendChild(li);
  });
}

document.addEventListener("DOMContentLoaded", loadSidebar);

// Initiera Supabase-klient
const supabaseUrl = "; /https://abc123xyz.supabase.co/ byt ut
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4""; // byt ut
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Bygg sidomenyn
async function buildSidebar() {
  const sidebar = document.getElementById("sidebarMenu");
  if (!sidebar) {
    console.error("Ingen #sidebarMenu hittades i HTML.");
    return;
  }

  // Hämta kontinenter och länder från databasen
  const { data: continents, error: errCont } = await supabase
    .from("continents")
    .select("id, name")
    .order("name");

  const { data: countries, error: errCountries } = await supabase
    .from("countries")
    .select("id, name, flag, continent_id")
    .order("name");

  if (errCont) console.error("Fel vid hämtning av kontinenter:", errCont);
  if (errCountries) console.error("Fel vid hämtning av länder:", errCountries);

  if (!continents || continents.length === 0) {
    sidebar.innerHTML = "<li>Inga kontinenter hittades</li>";
    return;
  }

  // Bygg hierarkin: kontinenter > länder
  continents.forEach(cont => {
    const contLi = document.createElement("li");

    // Kontinentknapp
    const contBtn = document.createElement("button");
    contBtn.textContent = cont.name;
    contBtn.classList.add("continent-btn");

    // Lista för länder (gömda som standard)
    const countryUl = document.createElement("ul");
    countryUl.style.display = "none";

    // Fyll länder för denna kontinent
    countries
      .filter(c => c.continent_id === cont.id)
      .forEach(c => {
        const countryLi = document.createElement("li");
        countryLi.textContent = `${c.flag || ""} ${c.name}`;
        countryUl.appendChild(countryLi);
      });

    // Toggle logik
    contBtn.addEventListener("click", () => {
      countryUl.style.display = countryUl.style.display === "none" ? "block" : "none";
    });

    contLi.appendChild(contBtn);
    contLi.appendChild(countryUl);
    sidebar.appendChild(contLi);
  });
}

document.addEventListener("DOMContentLoaded", buildSidebar);


// Initiera Supabase-klient
const supabaseUrl = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4"; // byt ut
const supabaseKey = "YOUR_ANON_KEY"; // byt ut
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

async function buildSidebar() {
  const sidebar = document.getElementById("sidebarMenu");
  if (!sidebar) {
    console.error("Hittar inte #sidebarMenu i HTML");
    return;
  }

  // Hämta kontinenter
  const { data: continents, error: err1 } = await supabaseClient
    .from("continents")
    .select("id, name")
    .order("name");

  if (err1) {
    console.error("Kunde inte hämta kontinenter:", err1);
    return;
  }

  // Hämta länder
  const { data: countries, error: err2 } = await supabaseClient
    .from("countries")
    .select("id, name, flag, continent_id")
    .order("name");

  if (err2) {
    console.error("Kunde inte hämta länder:", err2);
    return;
  }

  // Bygg hierarkin: kontinenter → länder
  continents.forEach(cont => {
    const contLi = document.createElement("li");
    contLi.classList.add("continent");

    const contTitle = document.createElement("span");
    contTitle.textContent = cont.name;
    contLi.appendChild(contTitle);

    const countryUl = document.createElement("ul");
    countryUl.classList.add("country-list");

    countries
      .filter(c => c.continent_id === cont.id)
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach(c => {
        const countryLi = document.createElement("li");
        countryLi.classList.add("country");
        countryLi.textContent = `${c.flag || ""} ${c.name}`;
        countryUl.appendChild(countryLi);
      });

    contLi.appendChild(countryUl);
    sidebar.appendChild(contLi);
  });
}

document.addEventListener("DOMContentLoaded", buildSidebar);

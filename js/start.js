// start.js - debug version
const SUPABASE_URL = "https://gbxxoeplkzbhsvagnfsr.supabase.co"; // byt till din
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4"; // byt till din
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


console.log("✅ start.js laddat");
console.log("👉 Supabase URL:", SUPABASE_URL);

// 2. Hämta kontinenter
async function loadContinents() {
  console.log("🔎 Försöker hämta kontinenter...");
  const { data, error } = await supabase
    .from("continents")
    .select("id, name");

  if (error) {
    console.error("❌ Fel vid hämtning av kontinenter:", error);
    return;
  }

  console.log("🌍 Kontinenter hämtade:", data);

  const menu = document.getElementById("sidebarMenu");
  if (!menu) {
    console.warn("⚠️ Hittade inte #sidebarMenu i HTML!");
    return;
  }

  menu.innerHTML = ""; // töm först

  data.forEach(continent => {
    const li = document.createElement("li");
    li.textContent = continent.name;
    li.style.color = "gold";
    li.style.cursor = "pointer";
    li.onclick = () => loadCountries(continent.id, li);
    menu.appendChild(li);
  });
}

// 3. Hämta länder för en kontinent
async function loadCountries(continentId, liElement) {
  console.log(`🔎 Försöker hämta länder för continent_id=${continentId}...`);

  const { data, error } = await supabase
    .from("countries")
    .select("id, name, flag")
    .eq("continent_id", continentId);

  if (error) {
    console.error("❌ Fel vid hämtning av länder:", error);
    return;
  }

  console.log(`🌐 Länder i kontinent ${continentId}:`, data);

  // skapa lista under kontinenten
  let ul = liElement.querySelector("ul");
  if (!ul) {
    ul = document.createElement("ul");
    liElement.appendChild(ul);
  }
  ul.innerHTML = "";

  data.forEach(country => {
    const li = document.createElement("li");
    li.textContent = `${country.flag || ""} ${country.name}`;
    ul.appendChild(li);
  });
}

// 4. Starta när sidan laddas
document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 DOMContentLoaded, kör loadContinents()");
  loadContinents();
});

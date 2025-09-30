// js/city.js

// Initiera Supabase
const supabaseUrl = "https://gbxxoeplkzbhsvagnfsr.supabase.co"; // <-- ändra
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4"; // <-- ändra
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const cityName = params.get("city");

  if (!cityName) {
    document.getElementById("cityName").textContent = "No city selected";
    return;
  }

  document.getElementById("cityName").textContent = cityName;

  const { data, error } = await supabaseClient
    .from("stores")
    .select("id, name, address, website, cities(name)")
    .eq("cities.name", cityName);

  if (error) {
    console.error("Error loading stores:", error);
    return;
  }

  const container = document.getElementById("cityStores");
  container.innerHTML = "";

  if (!data || data.length === 0) {
    container.innerHTML = "<p>No stores found in this city.</p>";
    return;
  }

  data.forEach(store => {
    const div = document.createElement("div");
    div.className = "store-card";
    div.innerHTML = `
      <h3><a href="store.html?id=${store.id}">${store.name}</a></h3>
      <p>${store.address || ""}</p>
      ${store.website ? `<a href="${store.website}" target="_blank">Website</a>` : ""}
    `;
    container.appendChild(div);
  });
});

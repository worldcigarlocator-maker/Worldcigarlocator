// js/city.js

// Initiera Supabase
const supabaseUrl = "https://gbxxoeplkzbhsvagnfsr.supabase.co"; // <-- ändra
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4"; // <-- ändra
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// Hämta city från URL (?city=Stockholm)
const params = new URLSearchParams(window.location.search);
const cityName = params.get("city");

// Element i DOM
const cityTitleEl = document.getElementById("city-title");
const storeListEl = document.getElementById("store-list");

// Funktion för att rita stjärnor (fulla, halva, tomma)
function renderStars(avg) {
  const fullStars = Math.floor(avg);
  const halfStar = avg % 1 >= 0.5 ? 1 : 0;
  const emptyStars = 5 - fullStars - halfStar;

  let starsHTML = "";

  for (let i = 0; i < fullStars; i++) {
    starsHTML += `<span class="star full">★</span>`;
  }
  if (halfStar) {
    starsHTML += `<span class="star half">★</span>`;
  }
  for (let i = 0; i < emptyStars; i++) {
    starsHTML += `<span class="star empty">★</span>`;
  }

  return `<div class="stars">${starsHTML}</div>`;
}

// Ladda städer & butiker
async function loadCity() {
  if (!cityName) {
    cityTitleEl.textContent = "No city selected";
    return;
  }

  cityTitleEl.textContent = cityName;

  // Hämta stadens ID
  const { data: city, error: cityError } = await supabase
    .from("cities")
    .select("*")
    .ilike("name", cityName)
    .single();

  if (cityError || !city) {
    storeListEl.textContent = "City not found";
    return;
  }

  // Hämta butiker i staden
  const { data: stores, error: storeError } = await supabase
    .from("stores")
    .select("*")
    .eq("city_id", city.id);

  if (storeError || !stores || stores.length === 0) {
    storeListEl.textContent = "No stores found in this city.";
    return;
  }

  // Bygg lista
  storeListEl.innerHTML = "";
  for (const store of stores) {
    // Hämta betygssammanfattning
    const { data: summary, error: summaryError } = await supabase
      .from("store_ratings_summary")
      .select("*")
      .eq("store_id", store.id)
      .single();

    const storeDiv = document.createElement("div");
    storeDiv.classList.add("card");

    storeDiv.innerHTML = `
      <h2><a href="store.html?store=${store.id}">${store.name}</a></h2>
      <p>${store.address || ""}</p>
      ${store.link ? `<p><a href="${store.link}" target="_blank">Website</a></p>` : ""}
    `;

    if (summary) {
      storeDiv.innerHTML += `
        ${renderStars(summary.avg_rating || 0)}
        <p>${(summary.avg_rating || 0).toFixed(1)} / 5 (${summary.total_ratings} ratings)</p>
      `;
    } else {
      storeDiv.innerHTML += `<p>No ratings yet</p>`;
    }

    storeListEl.appendChild(storeDiv);
  }
}

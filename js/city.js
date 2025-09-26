// js/city.js

// Initiera Supabase
const supabaseUrl = "https://gbxxoeplkzbhsvagnfsr.supabase.co"; // <-- ändra
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4"; // <-- ändra
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

const params = new URLSearchParams(window.location.search);
const cityName = params.get("city");

document.addEventListener("DOMContentLoaded", async () => {
  const cityTitle = document.getElementById("city-title");
  if (cityTitle && cityName) {
    cityTitle.textContent = cityName;
  }

  // Hämta city-id
  let { data: cities, error: cityError } = await supabase
    .from("cities")
    .select("id, name")
    .eq("name", cityName);

  if (cityError) {
    console.error("Error loading city:", cityError);
    return;
  }
  if (!cities || cities.length === 0) {
    document.getElementById("store-list").innerHTML =
      "<p>No stores found for this city.</p>";
    return;
  }

  const cityId = cities[0].id;

  // Hämta butiker
  let { data: stores, error: storeError } = await supabase
    .from("stores")
    .select("id, name, address, link")
    .eq("city_id", cityId);

  if (storeError) {
    console.error("Error loading stores:", storeError);
    return;
  }

  const listContainer = document.getElementById("store-list");
  listContainer.innerHTML = "";

  for (let store of stores) {
    // Hämta betyg
    let { data: ratingData } = await supabase
      .from("store_ratings_summary")
      .select("avg_rating, total_ratings, total_reviews")
      .eq("store_id", store.id)
      .single();

    const avg = ratingData?.avg_rating
      ? Number(ratingData.avg_rating).toFixed(1)
      : null;
    const total = ratingData?.total_ratings || 0;

    // Rendera stjärnor (med halva)
function renderStars(avg) {
  if (!avg) return "No ratings yet";

  const fullStars = Math.floor(avg);
  const halfStar = avg - fullStars >= 0.5;
  const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

  let starsHtml = "";

  // hela stjärnor
  for (let i = 0; i < fullStars; i++) {
    starsHtml += `<span class="star full">★</span>`;
  }

  // halv stjärna
  if (halfStar) {
    starsHtml += `<span class="star half">★</span>`;
  }

  // tomma stjärnor
  for (let i = 0; i < emptyStars; i++) {
    starsHtml += `<span class="star empty">★</span>`;
  }

  return starsHtml;
    }

    // Skapa kort
    const card = document.createElement("div");
    card.className = "store-card";

    card.innerHTML = `
      <h2>
        <a href="store.html?store=${store.id}">
          ${store.name}
        </a>
      </h2>
      <p>${store.address || ""}</p>
      ${store.link ? `<a href="${store.link}" target="_blank">Visit website</a>` : ""}
      <p><strong>Rating:</strong> ${avg ? `${avg}/5` : "–"} <span class="stars">${starsHtml}</span> (${total} votes)</p>
    `;

    listContainer.appendChild(card);
  }
});

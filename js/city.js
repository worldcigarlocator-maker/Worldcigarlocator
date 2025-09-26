// js/city.js

// 1. Initiera Supabase-klienten
const supabaseUrl = "https://YOUR_PROJECT.supabase.co"; // <-- ändra
const supabaseKey = "YOUR_ANON_KEY"; // <-- ändra
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// 2. Hämta city från URL (ex. city.html?city=Norrköping)
const params = new URLSearchParams(window.location.search);
const cityName = params.get("city");

// 3. Kör när sidan laddats
document.addEventListener("DOMContentLoaded", async () => {
  const cityTitle = document.getElementById("city-title");
  if (cityTitle && cityName) {
    cityTitle.textContent = cityName;
  }

  // 4. Hämta city-id
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

  // 5. Hämta butiker + deras betyg från view store_ratings_summary
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
    // hämta betyg för butiken från view
    let { data: ratingData, error: ratingError } = await supabase
      .from("store_ratings_summary")
      .select("avg_rating, total_ratings, total_reviews")
      .eq("store_id", store.id)
      .single();

    if (ratingError) {
      console.warn("Rating fetch error for store", store.id, ratingError);
    }

    const avg = ratingData?.avg_rating
      ? Number(ratingData.avg_rating).toFixed(1)
      : "No rating yet";
    const total = ratingData?.total_ratings || 0;

    // skapa kort
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
      <p><strong>Rating:</strong> ${avg} ⭐ (${total} votes)</p>
    `;

    listContainer.appendChild(card);
  }
});

// js/city.js

// 1. Initiera Supabase-klienten
const supabaseUrl = "https://YOUR_PROJECT.supabase.co"; // byt ut
const supabaseKey = "YOUR_ANON_KEY"; // byt ut
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// 2. Hämta city från URL, t.ex. city.html?city=Norrköping
const params = new URLSearchParams(window.location.search);
const cityName = params.get("city");

// 3. Visa stadstitel
document.addEventListener("DOMContentLoaded", async () => {
  const cityTitle = document.getElementById("city-title");
  if (cityTitle && cityName) {
    cityTitle.textContent = cityName;
  }

  // 4. Hämta städer från tabellen "cities"
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

  // 5. Hämta butiker kopplade till city_id
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

  stores.forEach((store) => {
    const card = document.createElement("div");
    card.className = "store-card";

    card.innerHTML = `
      <h2>
        <a href="store.html?store=${store.id}">
          ${store.name}
        </a>
      </h2>
      <p>${store.address}</p>
      ${store.link ? `<a href="${store.link}" target="_blank">Visit website</a>` : ""}
    `;

    listContainer.appendChild(card);
  });
});

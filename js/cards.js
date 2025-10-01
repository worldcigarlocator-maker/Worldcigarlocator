// cards.js

// Hämta stores från Supabase
const { createClient } = supabase;
const supabaseUrl = "DIN_SUPABASE_URL";
const supabaseKey = "DIN_SUPABASE_ANON_KEY";
const db = createClient(supabaseUrl, supabaseKey);

async function fetchStores() {
  const { data, error } = await db.from("stores").select("*");
  if (error) {
    console.error("❌ Error fetching stores:", error);
    return [];
  }
  return data;
}

function renderCards(stores) {
  const grid = document.querySelector(".card-grid");
  grid.innerHTML = "";

  stores.forEach(store => {
    // Thumbnail (Google Maps bild eller fallback)
    const thumbnail = store.photo_reference
      ? `<img src="${store.photo_reference}" alt="${store.name}" class="card-img">`
      : `<img src="img/placeholder.jpg" alt="No image" class="card-img">`;

    // Rating med stjärnor
    let stars = "";
    for (let i = 1; i <= 5; i++) {
      stars += i <= store.rating ? "★" : "☆";
    }

    // Kortets HTML
    const card = document.createElement("div");
    card.classList.add("card");
    card.innerHTML = `
      ${thumbnail}
      <h2>${store.name}</h2>
      <p>${store.address || ""}</p>
      <p><strong>${store.city || ""}, ${store.country || ""}</strong></p>
      <div class="rating">${stars}</div>
      <a href="${store.website || "#"}" target="_blank" class="btn">Visit Website</a>
    `;

    grid.appendChild(card);
  });
}

// Initiera
(async () => {
  const stores = await fetchStores();
  renderCards(stores);
})();

const dummyStores = [
  {
    type: "store",
    name: "Cigar King",
    address: "123 Main Street",
    city: "Stockholm",
    country: "Sweden",
    phone: "+46 123 456 789",
    website: "https://example.com",
    rating: 4
  },
  {
    type: "lounge",
    name: "Lounge Deluxe",
    address: "456 Sunset Blvd",
    city: "Gothenburg",
    country: "Sweden",
    phone: "+46 987 654 321",
    website: "https://example.com",
    rating: 5
  }
];

function renderCards(stores) {
  const grid = document.querySelector(".card-grid");
  grid.innerHTML = "";

  stores.forEach(store => {
    // 🔑 Rätt filnamn och versaler
    let imgSrc = store.type === "lounge" 
      ? "images/lounge.jpeg" 
      : "images/Store.png";

    const card = document.createElement("div");
    card.classList.add("card");

    card.innerHTML = `
      <div class="card-left">
        <div class="card-type">
          <span class="toggle ${store.type === "store" ? "active" : ""}">Store</span>
          <span class="toggle ${store.type === "lounge" ? "active" : ""}">Lounge</span>
        </div>
        <h2>${store.name}</h2>
        <p>${store.address}</p>
        <p><strong>${store.city}, ${store.country}</strong></p>
        <p>${store.phone}</p>
        <div class="rating">
          ${"★".repeat(store.rating)}${"☆".repeat(5 - store.rating)}
        </div>
        <a href="${store.website}" target="_blank">Visit Website</a>
      </div>
      <div class="card-right">
        <img src="${imgSrc}" alt="${store.type}" 
             onerror="this.src='images/lounge.jpeg';">
      </div>
    `;

    grid.appendChild(card);
  });
}

// Rendera test-datan
renderCards(dummyStores);

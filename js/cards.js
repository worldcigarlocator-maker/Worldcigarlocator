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
  const container = document.querySelector(".card-grid");
  container.innerHTML = "";

  stores.forEach(store => {
    // välj defaultbild beroende på typ
    let imgSrc = store.type === "lounge" ? "images/lounge.jpeg" : "images/paris.jpg";

    // stjärnor
    const stars = "★".repeat(store.rating) + "☆".repeat(5 - store.rating);

    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <div class="card-content">
        <div class="toggle">
          <span class="toggle-btn ${store.type === "store" ? "active" : ""}">Store</span>
          <span class="toggle-btn ${store.type === "lounge" ? "active" : ""}">Lounge</span>
        </div>
        <h2>${store.name}</h2>
        <p>${store.address}</p>
        <p><strong>${store.city}, ${store.country}</strong></p>
        <p>${store.phone}</p>
        <p class="stars">${stars}</p>
        <a href="${store.website}" target="_blank">Visit Website</a>
      </div>
      <div class="card-image">
        <img src="${imgSrc}" 
             alt="${store.type}" 
             onerror="this.onerror=null; this.src='${store.type === "lounge" ? "images/lounge.jpeg" : "images/store.png"}';">
      </div>
    `;

    container.appendChild(card);
  });
}

// rendera dummy-data
renderCards(dummyStores);

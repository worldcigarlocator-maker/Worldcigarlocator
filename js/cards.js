const dummyStores = [
  {
    type: "store",
    name: "Cigar King",
    address: "123 Main Street",
    city: "Stockholm",
    country: "Sweden",
    phone: "+46 123 456 789",
    website: "https://example.com",
    rating: 4,
    image: "images/store.png"
  },
  {
    type: "lounge",
    name: "Lounge Deluxe",
    address: "456 Sunset Blvd",
    city: "Gothenburg",
    country: "Sweden",
    phone: "+46 987 654 321",
    website: "https://example.com",
    rating: 5,
    image: "images/lounge.jpg"
  },
  {
    type: "other",
    name: "Cuba Café",
    address: "Example Road 1",
    city: "Madrid",
    country: "Spain",
    phone: "+34 123 456 789",
    website: "https://cubacafe.example.com",
    rating: 3,
    image: "images/cafe.jpg"
  }
];

function renderCards(stores) {
  const cardGrid = document.getElementById("cardGrid");
  cardGrid.innerHTML = "";

  stores.forEach(store => {
    const badgeClass = store.type.toLowerCase();

    const card = document.createElement("div");
    card.classList.add("card");

    card.innerHTML = `
      <div class="card-content">
        <span class="card-type ${badgeClass}">
          ${store.type.charAt(0).toUpperCase() + store.type.slice(1)}
        </span>
        <div class="stars">
          ${"★".repeat(store.rating)}${"☆".repeat(5 - store.rating)}
        </div>
        <h2>${store.name}</h2>
        <p>${store.address}, ${store.city}</p>
        <p>${store.phone || ""}</p>
        <a href="${store.website}" target="_blank">Visit website</a>
      </div>
      <div class="card-image">
        <img src="${store.image}" alt="${store.name}">
      </div>
    `;

    cardGrid.appendChild(card);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderCards(dummyStores);
});

const dummyStores = [
  { name: "Cigar Lounge Stockholm", city: "Stockholm", country: "Sweden", type: "Lounge", rating: 4 },
  { name: "Havana House", city: "Berlin", country: "Germany", type: "Store", rating: 3 },
  { name: "Barcelona Cigar Club", city: "Barcelona", country: "Spain", type: "Lounge", rating: 5 }
];

function renderCards() {
  console.log("Rendering cards..."); // debug
  const grid = document.querySelector(".card-grid");
  if (!grid) {
    console.error("❌ Hittar inte .card-grid");
    return;
  }

  grid.innerHTML = "";

  dummyStores.forEach(store => {
    const card = document.createElement("div");
    card.classList.add("card");
    card.innerHTML = `
      <h2>${store.name}</h2>
      <p>${store.city}, ${store.country}</p>
      <p><strong>${store.type}</strong></p>
      <p>${"⭐".repeat(store.rating)}${"☆".repeat(5 - store.rating)}</p>
      <button>View Details</button>
    `;
    grid.appendChild(card);
  });
}

renderCards();

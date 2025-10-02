// Dummy-data för test
const stores = [
  {
    type: "store",
    name: "Cigar Store Example",
    address: "123 Main Street",
    phone: "+46 70 123 45 67",
    website: "https://example.com",
    rating: 4
  },
  {
    type: "lounge",
    name: "Lounge Example",
    address: "456 Side Road",
    phone: "+46 70 987 65 43",
    website: "https://example.org",
    rating: 5
  }
];

function renderCards(stores) {
  const grid = document.querySelector(".card-grid");
  grid.innerHTML = "";

  stores.forEach(store => {
    // 🔑 Rätt bildväg (case sensitive på GitHub Pages!)
    let imgSrc = store.type === "lounge" 
      ? "images/lounge.jpeg" 
      : "images/Store.png";

    // Välj fallback beroende på typ
    let fallbackImg = store.type === "lounge"
      ? "images/lounge.jpeg"
      : "images/Store.png";

    // Bygg kortet
    const card = document.createElement("div");
    card.classList.add("card");

    card.innerHTML = `
      <div class="card-content">
        <div class="type-toggle">
          <span class="${store.type === "store" ? "active" : ""}">Store</span>
          <span class="${store.type === "lounge" ? "active" : ""}">Lounge</span>
        </div>
        <div class="rating">
          ${"★".repeat(store.rating)}${"☆".repeat(5 - store.rating)}
        </div>
        <h2>${store.name}</h2>
        <p>${store.address}</p>
        <p>${store.phone}</p>
        <a href="${store.website}" target="_blank">Visit Website</a>
      </div>
      <div class="card-image">
        <img src="${imgSrc}" 
             alt="${store.type}" 
             onerror="this.onerror=null; this.src='${fallbackImg}';">
      </div>
    `;

    grid.appendChild(card);
  });
}

// Rendera korten
renderCards(stores);

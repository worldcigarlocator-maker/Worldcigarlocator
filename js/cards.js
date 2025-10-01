function renderCards(stores) {
  const container = document.getElementById("cardGrid");
  container.innerHTML = "";

  stores.forEach(store => {
    const card = document.createElement("div");
    card.className = "card";

    // Toggle labels
    const toggleHTML = `
      <div class="toggle">
        <span class="${store.type === "store" ? "active" : ""}">Store</span>
        <span class="${store.type === "lounge" ? "active" : ""}">Lounge</span>
      </div>
    `;

    // Stjärnor
    let stars = "";
    for (let i = 0; i < 5; i++) {
      stars += i < store.rating ? "★" : "☆";
    }

    // Bygg kortet
    card.innerHTML = `
      <div class="card-left">
        ${toggleHTML}
        <h2>${store.name}</h2>
        <p>${store.address}</p>
        <p><strong>${store.city}, ${store.country}</strong></p>
        <p>${store.phone}</p>
        <div class="stars">${stars}</div>
        <a href="${store.website}" target="_blank">Visit Website</a>
      </div>
      <div class="card-right">
        <img src="${store.image}" alt="${store.type}">
      </div>
    `;

    container.appendChild(card);
  });
}

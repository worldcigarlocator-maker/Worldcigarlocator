function renderCards(stores) {
  const container = document.getElementById("cardGrid");
  container.innerHTML = "";

  stores.forEach(store => {
    const card = document.createElement("div");
    card.className = "card";

    // Toggle-knappar
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

    // Innehåll
    card.innerHTML = `
      <div class="card-left">
        ${toggleHTML}
        <div class="stars">${stars}</div>
        <p><strong>Name:</strong> ${store.name}</p>
        <p><strong>Address:</strong> ${store.address}</p>
        <p><strong>Phone:</strong> ${store.phone}</p>
        <a href="${store.website}" target="_blank">Visit Website</a>
      </div>
      <div class="card-right">
        <img src="${store.image}" alt="${store.type}">
      </div>
    `;

    container.appendChild(card);
  });
}

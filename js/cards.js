function renderCards(stores) {
  const cardGrid = document.getElementById("cardGrid");
  cardGrid.innerHTML = "";

  stores.forEach(store => {
    let badgeClass = "";
    if (store.type === "store") {
      badgeClass = "store";
    } else if (store.type === "lounge") {
      badgeClass = "lounge";
    } else if (store.type === "other") {
      badgeClass = "other";
    }

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

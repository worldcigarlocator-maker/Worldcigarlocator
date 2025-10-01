function renderCards(stores) {
  const grid = document.querySelector(".card-grid");
  grid.innerHTML = "";

  stores.forEach(store => {
    let thumbnail;

    if (store.photo_reference) {
      // Har Google Maps bild
      thumbnail = `<img src="${store.photo_reference}" alt="${store.name}" class="card-img">`;
    } else {
      // Fallback beroende på typ
      if (store.type && store.type.toLowerCase() === "lounge") {
        thumbnail = `<img src="img/lounge.jpg" alt="Lounge" class="card-img">`;
      } else {
        thumbnail = `<img src="img/store.png" alt="Store" class="card-img">`;
      }
    }

    // Rating med stjärnor
    let stars = "";
    for (let i = 1; i <= 5; i++) {
      stars += i <= store.rating ? "★" : "☆";
    }

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

// === Helper for missing fields ===
function safe(v) {
  return v && v !== "" ? v : "—";
}

// === Render cards ===
function renderCards(stores) {
  const container = document.getElementById("storeGrid");
  container.innerHTML = "";

  stores.forEach(store => {

    // Bild
    let img = store.photo_cdn_url || store.photo_url || "images/Store.png";

    // Badge
    const badge = store.type ? store.type.toUpperCase() : "STORE";
    const badgeClass = badge.toLowerCase();

    // Rating
    const ratingNum = store.rating ? Math.round(store.rating) : 0;
    const stars =
      "★".repeat(ratingNum) + "☆".repeat(5 - ratingNum);

    // Flagga
    const flagUrl = store.country_iso2
      ? `https://flagcdn.com/24x18/${store.country_iso2.toLowerCase()}.png`
      : "";

    // Stad + Land
    const locText = [store.country, store.city].filter(Boolean).join(", ");

    // HTML
    const card = document.createElement("div");
    card.className = "store-card";

    card.innerHTML = `
      <img class="store-img" src="${img}" alt="${store.name}">

      <div class="card-body">

        <div class="badge-row">
          <span class="type-badge-inline ${badgeClass}">${badge}</span>
        </div>

        <div class="title-wrap">
          <h3 class="card-title">${safe(store.name)}</h3>
        </div>

        <div class="rating-stars">${stars}</div>

        <div class="locrow">
          ${flagUrl ? `<img class="flag" src="${flagUrl}">` : ""}
          <span>${locText}</span>
        </div>

        <div class="continent">${safe(store.continent)}</div>

        <div class="card-info"><strong>Address:</strong> ${safe(store.address)}</div>
        <div class="card-info"><strong>Phone:</strong> ${safe(store.phone)}</div>
        <div class="card-info"><strong>Website:</strong> ${
          store.website ? `<a href="${store.website}" target="_blank">Visit</a>` : "—"
        }</div>

        <button class="comment-btn">View comments</button>

      </div>
    `;

    container.appendChild(card);
  });
}

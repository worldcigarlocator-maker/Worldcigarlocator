// Dummy-data för test
const stores = [
  {
    type: "store",
    name: "Cigar World",
    address: "Main Street 123, New York",
    phone: "+1 123 456 789",
    website: "https://cigarworld.com",
    rating: 4,
    image: "images/Store.png"
  },
  {
    type: "lounge",
    name: "Havana Lounge",
    address: "Boulevard 45, Miami",
    phone: "+1 987 654 321",
    website: "https://havanalounge.com",
    rating: 5,
    image: "images/lounge.jpeg"
  }
];

// Funktion för att rendera kort
function renderCards() {
  const container = document.querySelector(".card-grid");
  container.innerHTML = "";

  stores.forEach(store => {
    let imgSrc = store.image || (store.type === "lounge" ? "images/lounge.jpeg" : "images/Store.png");

    const card = document.createElement("div");
    card.classList.add("card");

    card.innerHTML = `
      <div class="card-content">
        <div class="stars">${'★'.repeat(store.rating)}${'☆'.repeat(5 - store.rating)}</div>
        <div class="card-type ${store.type}">${store.type === "store" ? "Store" : "Lounge"}</div>
        <h2>${store.name}</h2>
        <p>${store.address}</p>
        <p>${store.phone}</p>
        <a href="${store.website}" target="_blank">Visit website</a>
      </div>
      <div class="card-image">
        <img src="${imgSrc}" alt="${store.type}" 
             onerror="this.onerror=null; this.src='${store.type === "lounge" ? "images/lounge.jpeg" : "images/Store.png"}';">
      </div>
    `;

    container.appendChild(card);
  });
}

// Kör när sidan laddas
document.addEventListener("DOMContentLoaded", renderCards);

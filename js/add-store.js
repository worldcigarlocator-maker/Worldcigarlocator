
  // Init Supabase
const supabaseUrl = "https://https://gbxxoeplkzbhsvagnfsr.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4Y";
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);


// Globala variabler
let selectedRating = 0;
let selectedLat = null;
let selectedLng = null;

// Toast-funktion
function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerText = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ⭐ Rating stars
const ratingEl = document.getElementById("rating");
for (let i = 1; i <= 5; i++) {
  const star = document.createElement("span");
  star.classList.add("star");
  star.innerHTML = "★";
  star.dataset.value = i;

  // Hover-effekt
  star.addEventListener("mouseover", () => {
    document.querySelectorAll(".star").forEach(s => s.classList.remove("hover"));
    for (let j = 0; j < i; j++) {
      document.querySelectorAll(".star")[j].classList.add("hover");
    }
  });

  star.addEventListener("mouseout", () => {
    document.querySelectorAll(".star").forEach(s => s.classList.remove("hover"));
  });

  // Klick
  star.addEventListener("click", () => {
    selectedRating = i;
    document.querySelectorAll(".star").forEach(s => s.classList.remove("selected"));
    for (let j = 0; j < i; j++) {
      document.querySelectorAll(".star")[j].classList.add("selected");
    }
  });

  ratingEl.appendChild(star);
}

// 📍 Google Autocomplete
const autocompleteEl = document.getElementById("address");

autocompleteEl.addEventListener("gmpx-placechange", () => {
  const place = autocompleteEl.getPlace();
  if (!place) return;

  // Fyll fälten
  document.getElementById("name").value = place.displayName || "";
  document.getElementById("phone").value = place.formattedPhoneNumber || "";
  document.getElementById("website").value = place.websiteUri || "";

  const cityComp = place.addressComponents?.find(c => c.types.includes("locality"));
  const countryComp = place.addressComponents?.find(c => c.types.includes("country"));
  document.getElementById("city").value = cityComp?.longText || "";
  document.getElementById("country").value = countryComp?.longText || "";

  // Preview-bild
  if (place.photos && place.photos.length > 0) {
    const photoUrl = place.photos[0].getURI({ maxHeight: 200 });
    document.getElementById("imagePreview").innerHTML = `<img src="${photoUrl}" alt="Preview">`;
  } else {
    document.getElementById("imagePreview").innerHTML = "";
  }

  // Spara koordinater (osynligt)
  selectedLat = place.location?.lat() || null;
  selectedLng = place.location?.lng() || null;
});

// 🚀 Form-submit
const form = document.getElementById("storeForm");
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("name").value.trim();
  const address = document.getElementById("address").value.trim();
  const city = document.getElementById("city").value.trim();
  const country = document.getElementById("country").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const website = document.getElementById("website").value.trim();
  const type = document.querySelector('input[name="store-type"]:checked')?.value || null;

  if (!name || !address || !type) {
    showToast("Please fill in required fields", "error");
    return;
  }

  const { error } = await supabase.from("stores").insert([{
    name,
    address,
    city,
    country,
    phone,
    website,
    type,
    rating: selectedRating,
    latitude: selectedLat,
    longitude: selectedLng,
    approved: false
  }]);

  if (error) {
    showToast("Error saving store: " + error.message, "error");
  } else {
    showToast("Store saved successfully!", "success");
    form.reset();
    document.getElementById("imagePreview").innerHTML = "";
    selectedRating = 0;
    selectedLat = null;
    selectedLng = null;

    // Rensa stjärnor
    document.querySelectorAll(".star").forEach(s => {
      s.classList.remove("selected", "hover");
    });
  }
});

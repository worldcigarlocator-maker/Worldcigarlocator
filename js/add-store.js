
  // Init Supabase
const supabaseUrl = "https://https://gbxxoeplkzbhsvagnfsr.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4Y";
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

let selectedRating = 0;

// Build stars
const ratingContainer = document.getElementById("rating");
for (let i = 1; i <= 5; i++) {
  const star = document.createElement("span");
  star.classList.add("star");
  star.textContent = "★";
  star.dataset.value = i;

  star.addEventListener("mouseover", () => {
    document.querySelectorAll(".star").forEach(s => s.classList.remove("hover"));
    for (let j = 0; j < i; j++) {
      document.querySelectorAll(".star")[j].classList.add("hover");
    }
  });

  star.addEventListener("mouseout", () => {
    document.querySelectorAll(".star").forEach(s => s.classList.remove("hover"));
  });

  star.addEventListener("click", () => {
    selectedRating = i;
    document.querySelectorAll(".star").forEach(s => s.classList.remove("selected"));
    for (let j = 0; j < i; j++) {
      document.querySelectorAll(".star")[j].classList.add("selected");
    }
  });

  ratingContainer.appendChild(star);
}

// Toast helper
function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// Place selection
const autocomplete = document.getElementById("address");
let selectedPlace = null;

autocomplete.addEventListener("gmpx-placechange", () => {
  const place = autocomplete.getPlace();
  selectedPlace = place;

  if (place.formatted_address) {
    document.getElementById("address").value = place.formatted_address;
  }
  if (place.address_components) {
    const cityComp = place.address_components.find(c => c.types.includes("locality"));
    const countryComp = place.address_components.find(c => c.types.includes("country"));
    if (cityComp) document.getElementById("city").value = cityComp.long_name;
    if (countryComp) document.getElementById("country").value = countryComp.long_name;
  }
  if (place.formatted_phone_number) {
    document.getElementById("phone").value = place.formatted_phone_number;
  }
  if (place.website) {
    document.getElementById("website").value = place.website;
  }
  if (place.photos && place.photos.length > 0) {
    const photoUrl = place.photos[0].getUrl();
    document.getElementById("imagePreview").innerHTML = `<img src="${photoUrl}" alt="Store image">`;
  }
});

// Form submit
document.getElementById("storeForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("name").value;
  const address = autocomplete.value;
  const city = document.getElementById("city").value;
  const country = document.getElementById("country").value;
  const phone = document.getElementById("phone").value;
  const website = document.getElementById("website").value;
  const type = document.querySelector("input[name='store-type']:checked")?.value;

  if (!name || !address || !type || selectedRating === 0) {
    showToast("Please fill in all required fields.", "error");
    return;
  }

  const lat = selectedPlace?.geometry?.location?.lat();
  const lng = selectedPlace?.geometry?.location?.lng();

  const { error } = await supabase.from("stores").insert([{
    name, address, city, country, phone, website,
    type, rating: selectedRating,
    latitude: lat,
    longitude: lng,
    approved: false
  }]);

  if (error) {
    console.error(error);
    showToast("Failed to save store.", "error");
  } else {
    showToast("Store added successfully!", "success");
    e.target.reset();
    document.getElementById("imagePreview").innerHTML = "";
    document.querySelectorAll(".star").forEach(s => s.classList.remove("selected"));
    selectedRating = 0;
  }
});

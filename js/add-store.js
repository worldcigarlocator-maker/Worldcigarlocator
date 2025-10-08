
// Supabase init
const supabase = window.supabase.createClient(
  "https://https://gbxxoeplkzbhsvagnfsr.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4"
);

let selectedRating = 0;

// ⭐ Rating stars
document.querySelectorAll(".star").forEach(star => {
  star.addEventListener("click", () => {
    selectedRating = parseInt(star.dataset.value);
    document.querySelectorAll(".star").forEach(s => s.classList.remove("selected"));
    for (let i = 0; i < selectedRating; i++) {
      document.querySelectorAll(".star")[i].classList.add("selected");
    }
  });
});

// 🟡 Toast helper
function showToast(message, type="success") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// 📍 Handle place selection
const placeEl = document.getElementById("storeAddress");
placeEl.addEventListener("gmpx-placechange", () => {
  const place = placeEl.getPlace();
  if (!place) return;

  document.getElementById("storeName").value = place.displayName || "";
  document.getElementById("city").value = place.addressComponents?.locality || "";
  document.getElementById("country").value = place.addressComponents?.country || "";
  document.getElementById("phone").value = place.formattedPhoneNumber || "";
  document.getElementById("website").value = place.websiteUri || "";

  // Preview image
  const photoUrl = place.photos?.[0]?.getURI({maxWidth: 400});
  const preview = document.getElementById("previewImage");
  if (photoUrl) {
    preview.src = photoUrl;
    preview.style.display = "block";
  } else {
    preview.style.display = "none";
  }
});

// 🚀 Submit form
document.getElementById("storeForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const place = placeEl.getPlace();
  if (!place) return showToast("Select a place first!", "error");

  const name = document.getElementById("storeName").value;
  const address = place.formattedAddress || "";
  const city = document.getElementById("city").value;
  const country = document.getElementById("country").value;
  const phone = document.getElementById("phone").value;
  const website = document.getElementById("website").value;
  const type = document.querySelector("input[name='store-type']:checked")?.value || "";
  const lat = place.location?.lat();
  const lng = place.location?.lng();

  if (!name || !type || !selectedRating) {
    return showToast("Fill in name, type, and rating!", "error");
  }

  const { error } = await supabase.from("stores").insert([{
    name, address, city, country, phone, website,
    type, rating: selectedRating,
    latitude: lat,
    longitude: lng,
    approved: false
  }]);

  if (error) {
    showToast("Error saving store: " + error.message, "error");
  } else {
    showToast("Store saved successfully!");
    document.getElementById("storeForm").reset();
    document.querySelectorAll(".star").forEach(s => s.classList.remove("selected"));
    selectedRating = 0;
    document.getElementById("previewImage").style.display = "none";
  }
});

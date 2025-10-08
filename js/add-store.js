// ===== Supabase Init =====
const supabaseUrl = "https://gbxxoeplkzbhsvagnfsr.supabase.co"; 
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4"; 
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);


let selectedRating = 0;
let lastLat = null;
let lastLng = null;

// Toast helper
function showToast(msg, type="success") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  document.getElementById("toast-container").appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ⭐ Star rating setup
const starContainer = document.getElementById("star-rating");
starContainer.innerHTML = ""; // nollställ
for (let i = 1; i <= 5; i++) {
  const star = document.createElement("span");
  star.classList.add("star");
  star.dataset.value = i;
  star.innerHTML = "★";
  star.addEventListener("click", () => {
    selectedRating = i;
    document.querySelectorAll(".star").forEach(s => s.classList.remove("selected"));
    for (let j = 0; j < i; j++) {
      document.querySelectorAll(".star")[j].classList.add("selected");
    }
  });
  starContainer.appendChild(star);
}

}
document.querySelectorAll("#star-rating span").forEach(star => {
  star.addEventListener("click", e => {
    selectedRating = parseInt(e.target.dataset.val);
    document.querySelectorAll("#star-rating span").forEach((s, idx) => {
      s.classList.toggle("active", idx < selectedRating);
    });
  });
});

// 📷 Preview helper
function setPreview(url) {
  const img = document.getElementById("preview-image");
  if (url) {
    img.src = url;
    img.style.display = "block";
  } else {
    img.src = "";
    img.style.display = "none";
  }
}

// ➕ Add button → fill form
document.getElementById("addBtn").addEventListener("click", () => {
  const autocompleteEl = document.getElementById("place-autocomplete");
  const place = autocompleteEl.getPlace();

  if (!place) {
    showToast("No place selected.", "error");
    return;
  }

  document.getElementById("store-name").value = place.displayName || "";
  document.getElementById("store-address").value = place.formattedAddress || "";

  let city="", country="";
  place.addressComponents?.forEach(c=>{
    if (c.types.includes("locality")) city = c.longText;
    if (c.types.includes("country")) country = c.longText;
  });
  document.getElementById("store-city").value = city;
  document.getElementById("store-country").value = country;

  document.getElementById("store-phone").value = place.internationalPhoneNumber || "";
  document.getElementById("store-website").value = place.websiteUri || "";

  // Save lat/lng
  lastLat = place.location?.lat() || null;
  lastLng = place.location?.lng() || null;

  if (place.photos && place.photos.length > 0) {
    setPreview(place.photos[0].getURI({maxWidth:400}));
  } else {
    setPreview(null);
  }
});

// 💾 Save button → Supabase insert
document.getElementById("saveBtn").addEventListener("click", async () => {
  const name = document.getElementById("store-name").value;
  const address = document.getElementById("store-address").value;
  const city = document.getElementById("store-city").value;
  const country = document.getElementById("store-country").value;
  const phone = document.getElementById("store-phone").value;
  const website = document.getElementById("store-website").value;
  const type = document.querySelector("input[name='store-type']:checked")?.value;

  if (!name || !address || !city || !country) {
    showToast("Please fill required fields", "error");
    return;
  }

  const { error } = await supabase.from("stores").insert([{
    name, address, city, country, phone, website,
    type, rating: selectedRating,
    latitude: lastLat,
    longitude: lastLng,
    approved: false
  }]);

  if (error) {
    console.error(error);
    showToast("Error saving store", "error");
  } else {
    showToast("Store saved!", "success");
    document.querySelector("form")?.reset?.();
    setPreview(null);
    selectedRating = 0;
    lastLat = null;
    lastLng = null;
    document.querySelectorAll("#star-rating span").forEach(s=>s.classList.remove("active"));
  }
});

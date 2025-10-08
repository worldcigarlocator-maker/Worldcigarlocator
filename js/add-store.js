// ===== Supabase Init =====
const supabaseUrl = "https://gbxxoeplkzbhsvagnfsr.supabase.co"; 
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4"; 
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);


// ⭐ Rating logic
let currentRating = 0;
document.getElementById("star-container").innerHTML = "";
for (let i = 1; i <= 5; i++) {
  const star = document.createElement("span");
  star.textContent = "★";
  star.classList.add("star");
  star.addEventListener("mouseover", () => highlightStars(i));
  star.addEventListener("click", () => setRating(i));
  document.getElementById("star-container").appendChild(star);
}
function highlightStars(r) {
  document.querySelectorAll(".star").forEach((s, i) =>
    s.style.color = i < r ? "gold" : "#ccc"
  );
}
function setRating(r) {
  currentRating = r;
  highlightStars(r);
}

// 🔎 Autocomplete
let autocomplete;
window.initMap = function() {
  const input = document.getElementById("maps-input");
  autocomplete = new google.maps.places.Autocomplete(input, {
    fields: ["place_id", "name", "formatted_address", "geometry", "address_components", "photos"]
  });
  autocomplete.addListener("place_changed", () => {
    const place = autocomplete.getPlace();
    if (!place.place_id) return;
    fillFormFromPlace(place);
  });
};
window.addEventListener("load", () => {
  if (typeof google !== "undefined") window.initMap();
});

// 📋 Add button (parse Maps link)
document.getElementById("add-btn").addEventListener("click", () => {
  const link = document.getElementById("maps-input").value.trim();
  if (link.includes("google.com/maps")) {
    const match = link.match(/place\/.*?\/(@|data=)?/);
    if (match) {
      showToast("Parsing link...", "info");
      // Förenklad: här kan du extrahera place_id om du vill
    } else {
      showToast("Invalid Google Maps link", "error");
    }
  }
});

// 📝 Fill form
function fillFormFromPlace(place) {
  document.getElementById("name").value = place.name || "";
  document.getElementById("address").value = place.formatted_address || "";

  let city = "", country = "";
  if (place.address_components) {
    place.address_components.forEach(c => {
      if (c.types.includes("locality")) city = c.long_name;
      if (c.types.includes("country")) country = c.long_name;
    });
  }
  document.getElementById("city").value = city;
  document.getElementById("country").value = country;

  const imgEl = document.getElementById("preview-image");
  if (place.photos && place.photos.length > 0) {
    imgEl.src = place.photos[0].getUrl({maxWidth: 400});
    imgEl.style.display = "block";
  } else {
    imgEl.style.display = "none";
  }
}

// 💾 Save store
document.getElementById("save-btn").addEventListener("click", async () => {
  const name = document.getElementById("name").value.trim();
  const address = document.getElementById("address").value.trim();
  const city = document.getElementById("city").value.trim();
  const country = document.getElementById("country").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const website = document.getElementById("website").value.trim();
  const type = document.querySelector("input[name='type']:checked")?.value || null;

  if (!name || !address || !city || !country || !type) {
    showToast("Please fill required fields", "error");
    return;
  }

  const { error } = await supabase.from("stores").insert([{
    name, address, city, country, phone, website, type, rating: currentRating, approved: false
  }]);

  if (error) {
    showToast("Error saving store", "error");
  } else {
    showToast("Store saved (pending approval)", "success");
    document.querySelector("form")?.reset?.();
  }
});

// 🔔 Toast
function showToast(msg, type="info") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  document.getElementById("toast-container").appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

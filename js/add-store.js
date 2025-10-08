// ===== Supabase Init =====
const supabaseUrl = "https://gbxxoeplkzbhsvagnfsr.supabase.co"; 
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4"; 
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);


// === Star rating ===
let selectedRating = 0;
document.querySelectorAll(".star").forEach(star => {
  star.addEventListener("click", () => {
    selectedRating = parseInt(star.dataset.value);
    document.querySelectorAll(".star").forEach(s => {
      s.classList.toggle("selected", s.dataset.value <= selectedRating);
    });
  });
});

// === Global vars for Google Place ===
let lastPlaceId = null;
let lastPhotoReference = null;

// === Toast ===
function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerText = message;
  document.getElementById("toast-container").appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// === Fill form with place data ===
function fillFormFromPlace(place) {
  document.getElementById("storeName").value = place.name || "";
  document.getElementById("address").value = place.formatted_address || "";

  let city = "", country = "";
  if (place.address_components) {
    for (const comp of place.address_components) {
      if (comp.types.includes("locality")) city = comp.long_name;
      if (comp.types.includes("country")) country = comp.long_name;
    }
  }
  document.getElementById("city").value = city;
  document.getElementById("country").value = country;

  document.getElementById("phone").value = place.formatted_phone_number || "";
  document.getElementById("website").value = place.website || "";

  lastPlaceId = place.place_id || null;
  lastPhotoReference = null;

  const img = document.getElementById("preview-image");
  if (place.photos && place.photos.length > 0) {
    const photoUrl = place.photos[0].getUrl({ maxWidth: 400 });
    img.src = photoUrl;
    img.style.display = "block";
    lastPhotoReference = place.photos[0].photo_reference;
  } else {
    img.removeAttribute("src");
    img.style.display = "none";
  }
}

// === Parse Maps link ===
document.getElementById("addBtn").addEventListener("click", async () => {
  const link = document.getElementById("mapsLink").value.trim();
  if (!link) return showToast("Please paste a Google Maps link", "error");

  const placeIdMatch = link.match(/place\/.*\/(.*)\//) || link.match(/placeid=([^&]+)/);
  let placeId = placeIdMatch ? placeIdMatch[1] : null;

  if (!placeId) {
    return showToast("Could not extract Place ID", "error");
  }

  const service = new google.maps.places.PlacesService(document.createElement("div"));
  service.getDetails({ placeId, fields: ["name","formatted_address","address_components","formatted_phone_number","website","place_id","photos"] },
    (place, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK) {
        fillFormFromPlace(place);
      } else {
        showToast("Failed to fetch place details", "error");
      }
    }
  );
});

// === Save store ===
document.getElementById("saveBtn").addEventListener("click", async () => {
  const name = document.getElementById("storeName").value.trim();
  const address = document.getElementById("address").value.trim();
  const city = document.getElementById("city").value.trim();
  const country = document.getElementById("country").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const website = document.getElementById("website").value.trim();
  const type = document.querySelector("input[name='type']:checked").value;

  if (!name || !address || !city || !country) {
    return showToast("Please fill in all required fields", "error");
  }

  const { error } = await supabase.from("stores").insert([{
    name, address, city, country, phone, website,
    type, rating: selectedRating, place_id: lastPlaceId, photo_reference: lastPhotoReference,
    approved: false
  }]);

  if (error) {
    console.error(error);
    showToast("Error saving store", "error");
  } else {
    showToast("Store saved for review ✅", "success");
    resetForm();
  }
});

// === Reset form ===
function resetForm() {
  document.getElementById("mapsLink").value = "";
  document.getElementById("storeName").value = "";
  document.getElementById("address").value = "";
  document.getElementById("city").value = "";
  document.getElementById("country").value = "";
  document.getElementById("phone").value = "";
  document.getElementById("website").value = "";
  document.querySelector("input[name='type'][value='store']").checked = true;
  selectedRating = 0;
  document.querySelectorAll(".star").forEach(s => s.classList.remove("selected"));
  const img = document.getElementById("preview-image");
  img.removeAttribute("src");
  img.style.display = "none";
}

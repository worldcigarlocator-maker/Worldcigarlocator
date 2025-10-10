
  // Init Supabase
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";

const supabaseUrl = "https://https://gbxxoeplkzbhsvagnfsr.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4Y";
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);


// ---- Star rating ----
let selectedRating = 0;
const ratingContainer = document.getElementById("rating");
if (ratingContainer) {
  ratingContainer.innerHTML = "";
  for (let i = 1; i <= 5; i++) {
    const star = document.createElement("span");
    star.classList.add("star");
    star.textContent = "★";
    star.dataset.value = i;
    star.addEventListener("click", () => {
      selectedRating = i;
      document.querySelectorAll(".star").forEach((s, idx) => {
        s.classList.toggle("selected", idx < i);
      });
    });
    ratingContainer.appendChild(star);
  }
}

// ---- Google Autocomplete ----
let selectedLat = null;
let selectedLng = null;
let selectedPlaceId = null;
let selectedPhotoRef = null;

const autocompleteEl = document.getElementById("address");

if (autocompleteEl) {
  autocompleteEl.addEventListener("gmpx-placechange", () => {
    const place = autocompleteEl.getPlace();
    if (!place) return;

    // Plocka fält
    document.getElementById("name").value = place.displayName || "";
    document.getElementById("phone").value = place.formattedPhoneNumber || "";
    document.getElementById("website").value = place.websiteUri || "";

    // Addresskomponenter
    let city = "";
    let country = "";
    if (place.addressComponents) {
      for (const comp of place.addressComponents) {
        if (comp.types.includes("locality")) city = comp.longText;
        if (comp.types.includes("country")) country = comp.longText;
      }
    }
    document.getElementById("city").value = city;
    document.getElementById("country").value = country;

    // Lat/Lng
    if (place.location) {
      selectedLat = place.location.lat();
      selectedLng = place.location.lng();
    }

    selectedPlaceId = place.id || null;

    // Preview-bild
    const preview = document.getElementById("preview");
    if (place.photos && place.photos.length > 0) {
      const url = place.photos[0].getURI({ maxHeight: 200 });
      preview.innerHTML = `<img src="${url}" alt="Preview">`;
      selectedPhotoRef = place.photos[0].name || null;
    } else {
      preview.innerHTML = "";
      selectedPhotoRef = null;
    }
  });
}

// ---- Toast helper ----
function showToast(msg, type = "success") {
  const container = document.getElementById("toast-container");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// ---- Submit ----
const form = document.getElementById("store-form");
if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const address = document.getElementById("address").value.trim();
    const city = document.getElementById("city").value.trim();
    const country = document.getElementById("country").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const website = document.getElementById("website").value.trim();
    const type = form.querySelector("input[name='store-type']:checked")?.value;

    if (!name || !address || !city || !country || !type || !selectedRating) {
      showToast("Please fill in all required fields.", "error");
      return;
    }

    const { error } = await supabase.from("stores").insert([
      {
        name,
        address,
        city,
        country,
        type,
        rating: selectedRating,
        phone,
        website,
        latitude: selectedLat,
        longitude: selectedLng,
        place_id: selectedPlaceId,
        photo_reference: selectedPhotoRef,
        approved: false,
        flagged: false
      }
    ]);

    if (error) {
      console.error(error);
      showToast("Error saving store.", "error");
    } else {
      showToast("Store added successfully!", "success");
      form.reset();
      document.getElementById("preview").innerHTML = "";
      selectedRating = 0;
      document.querySelectorAll(".star").forEach(s => s.classList.remove("selected"));
    }
  });
}

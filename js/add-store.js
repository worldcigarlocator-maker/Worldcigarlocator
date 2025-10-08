// ===== Supabase Init =====
const supabaseUrl = "https://gbxxoeplkzbhsvagnfsr.supabase.co"; 
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4"; 
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// Vars
let selectedPlace = null;
let selectedRating = 0;

// Toast helper
function showToast(msg, type="success") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  document.getElementById("toast-container").appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// Star rating
const stars = document.getElementById("star-rating").textContent.trim().split("");
document.getElementById("star-rating").innerHTML = stars.map((s,i) => `<span data-val="${i+1}">★</span>`).join("");
document.querySelectorAll("#star-rating span").forEach(star => {
  star.addEventListener("click", e => {
    selectedRating = e.target.dataset.val;
    document.querySelectorAll("#star-rating span").forEach((s,idx)=>{
      s.classList.toggle("active", idx < selectedRating);
    });
  });
});

// Preview helper
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

// Add button
document.getElementById("addBtn").addEventListener("click", () => {
  if (!selectedPlace) {
    showToast("No place selected.", "error");
    return;
  }

  const service = new google.maps.places.PlacesService(document.createElement("div"));
  service.getDetails({ placeId: selectedPlace.place_id, fields: ["name","formatted_address","address_components","photos","international_phone_number","website","geometry"] }, (place, status) => {
    if (status === google.maps.places.PlacesServiceStatus.OK) {
      // Fill form
      document.getElementById("store-name").value = place.name || "";
      document.getElementById("store-address").value = place.formatted_address || "";

      let city="", country="";
      place.address_components.forEach(c=>{
        if (c.types.includes("locality")) city = c.long_name;
        if (c.types.includes("country")) country = c.long_name;
      });
      document.getElementById("store-city").value = city;
      document.getElementById("store-country").value = country;

      document.getElementById("store-phone").value = place.international_phone_number || "";
      document.getElementById("store-website").value = place.website || "";

      // Preview image
      if (place.photos && place.photos.length > 0) {
        setPreview(place.photos[0].getUrl({maxWidth:400}));
      } else {
        setPreview(null);
      }
    } else {
      showToast("Could not fetch details", "error");
    }
  });
});

// Listen to autocomplete selection
const autocompleteEl = document.getElementById("place-autocomplete");
autocompleteEl.addEventListener("gmpx-placechange", () => {
  selectedPlace = autocompleteEl.value;
  console.log("Selected:", selectedPlace);
});

// Save button
document.getElementById("saveBtn").addEventListener("click", async () => {
  const name = document.getElementById("store-name").value;
  const address = document.getElementById("store-address").value;
  const city = document.getElementById("store-city").value;
  const country = document.getElementById("store-country").value;
  const phone = document.getElementById("store-phone").value;
  const website = document.getElementById("store-website").value;
  const type = document.querySelector("input[name='store-type']:checked").value;

  if (!name || !address || !city || !country) {
    showToast("Please fill required fields", "error");
    return;
  }

  const { error } = await supabase.from("stores").insert([{
    name, address, city, country, phone, website,
    type, rating: selectedRating,
    approved: false
  }]);

  if (error) {
    showToast("Error saving store", "error");
  } else {
    showToast("Store saved!", "success");
    document.querySelector("form")?.reset?.();
    setPreview(null);
    selectedRating = 0;
    document.querySelectorAll("#star-rating span").forEach(s=>s.classList.remove("active"));
  }
});

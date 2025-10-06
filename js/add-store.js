// ===== Supabase Init =====
const supabaseUrl = "https://gbxxoeplkzbhsvagnfsr.supabase.co"; 
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4"; 
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// Toast helper
function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerText = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// --- Stars ---
let currentRating = 0;
const stars = document.querySelectorAll("#starRating span");

stars.forEach(star => {
  star.addEventListener("mouseover", () => {
    resetStars();
    star.classList.add("hover");
    let val = parseInt(star.dataset.value);
    for (let i = 0; i < val; i++) {
      stars[i].classList.add("hover");
    }
  });
  star.addEventListener("mouseout", () => resetStars(true));
  star.addEventListener("click", () => {
    currentRating = parseInt(star.dataset.value);
    resetStars();
    for (let i = 0; i < currentRating; i++) {
      stars[i].classList.add("selected");
    }
  });
});

function resetStars(preserve = false) {
  stars.forEach(s => s.classList.remove("hover", "selected"));
  if (preserve && currentRating > 0) {
    for (let i = 0; i < currentRating; i++) {
      stars[i].classList.add("selected");
    }
  }
}

// --- Add button (parse maps link) ---
document.getElementById("addBtn").addEventListener("click", async () => {
  const link = document.getElementById("mapsLink").value.trim();
  if (!link) return showToast("Please paste a Maps link", "error");

  // Extract query or placeId
  let query = null;
  const url = new URL(link);
  if (url.searchParams.get("query")) {
    query = url.searchParams.get("query");
  } else {
    query = url.pathname.replace("/maps/place/", "").replace("/", "");
  }

  if (!query) return showToast("Could not parse link", "error");

  // Google Maps PlacesService
  const map = new google.maps.Map(document.createElement("div"));
  const service = new google.maps.places.PlacesService(map);

  service.findPlaceFromQuery(
    { query: query, fields: ["name","formatted_address","geometry","place_id"] },
    (results, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && results[0]) {
        const place = results[0];
        document.getElementById("name").value = place.name || "";
        document.getElementById("address").value = place.formatted_address || "";

        // För city + country tar vi första delen
        if (place.formatted_address) {
          const parts = place.formatted_address.split(",");
          document.getElementById("city").value = parts[parts.length-2]?.trim() || "";
          document.getElementById("country").value = parts[parts.length-1]?.trim() || "";
        }

        // Preview image
        const imgDiv = document.getElementById("previewImage");
        imgDiv.innerHTML = `<img src="https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(place.formatted_address)}&zoom=15&size=400x200&key=DIN_GOOGLE_KEY" alt="Preview" />`;
      } else {
        showToast("No results from Maps", "error");
      }
    }
  );
});

// --- Save button ---
document.getElementById("saveBtn").addEventListener("click", async () => {
  const name = document.getElementById("name").value.trim();
  const address = document.getElementById("address").value.trim();
  const city = document.getElementById("city").value.trim();
  const country = document.getElementById("country").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const website = document.getElementById("website").value.trim();
  const type = document.querySelector('input[name="type"]:checked')?.value || "Store";

  if (!name || !address || !city || !country) {
    return showToast("Please fill in required fields", "error");
  }

  const { error } = await supabase.from("stores").insert([{
    name, address, city, country, phone, website, type, rating: currentRating, approved: false
  }]);

  if (error) {
    console.error(error);
    showToast("Error saving store", "error");
  } else {
    showToast("Submission received and pending review ✅", "success");

    // reset form
    document.getElementById("mapsLink").value = "";
    document.getElementById("previewImage").innerHTML = "";
    document.querySelectorAll("input[type=text]").forEach(el => el.value = "");
    currentRating = 0;
    resetStars();
  }
});

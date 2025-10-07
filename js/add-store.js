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

// ===== STAR RATING =====
let currentRating = 0;
const stars = document.querySelectorAll("#starRating span");

stars.forEach(star => {
  star.addEventListener("mouseover", () => {
    resetStars();
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

// ===== GEMENSAM FUNKTION FÖR ATT FYLLA FORMULÄRET =====
function fillFormFromPlace(place) {
  if (!place) return;

  document.getElementById("name").value = place.name || "";
  document.getElementById("address").value = place.formatted_address || "";

  // City & Country
  let city = "";
  let country = "";

  if (place.address_components) {
    const cityComp = place.address_components.find(c => c.types.includes("locality"));
    const countryComp = place.address_components.find(c => c.types.includes("country"));
    city = cityComp ? cityComp.long_name : "";
    country = countryComp ? countryComp.long_name : "";
  } else if (place.formatted_address) {
    const parts = place.formatted_address.split(",");
    city = parts[parts.length - 2]?.trim() || "";
    country = parts[parts.length - 1]?.trim() || "";
  }

  document.getElementById("city").value = city;
  document.getElementById("country").value = country;

  // Preview image
  if (place.formatted_address) {
    const imgDiv = document.getElementById("previewImage");
    imgDiv.innerHTML = `<img src="https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(
      place.formatted_address
    )}&zoom=15&size=400x200&key=DIN_GOOGLE_KEY" alt="Preview" />`;
  }
}

// ===== GOOGLE AUTOCOMPLETE CALLBACK =====
window.initAutocomplete = function () {
  console.log("Google Maps API loaded ✅");

  const input = document.getElementById("address");
  if (input) {
    const autocomplete = new google.maps.places.Autocomplete(input, {
      fields: ["name","formatted_address","address_components","geometry"]
    });

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      console.log("Autocomplete place:", place);
      fillFormFromPlace(place);
    });
  }
};

// ===== ADD-BUTTON (MAPS LINK) =====
document.getElementById("addBtn").addEventListener("click", async () => {
  const link = document.getElementById("mapsLink").value.trim();
  if (!link) return showToast("Please paste a Maps link", "error");

  let query = null;
  try {
    const url = new URL(link);
    if (url.searchParams.get("query")) {
      query = url.searchParams.get("query");
    } else if (url.pathname.includes("/maps/place/")) {
      query = decodeURIComponent(url.pathname.split("/maps/place/")[1].split("/")[0]);
    }
  } catch {
    return showToast("Invalid link", "error");
  }

  if (!query) return showToast("Could not parse link", "error");

  const map = new google.maps.Map(document.createElement("div"));
  const service = new google.maps.places.PlacesService(map);

  service.findPlaceFromQuery(
    { query: query, fields: ["name","formatted_address","geometry","place_id","address_components"] },
    (results, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && results[0]) {
        fillFormFromPlace(results[0]);
      } else {
        showToast("No results from Maps", "error");
      }
    }
  );
});

// ===== SAVE-BUTTON =====
document.getElementById("saveBtn").addEventListener("click", async () => {
  const name = document.getElementById("name").value.trim();
  const address = document.getElementById("address").value.trim();
  const city = document.getElementById("city").value.trim();
  const country = document.getElementById("country").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const website = document.getElementById("website").value.trim();
  const type = document.querySelector('input[name="type"]:checked')?.value.toLowerCase() || "store";

  if (!name || !address || !city || !country) {
    return showToast("Please fill in required fields", "error");
  }

  const { error } = await supabase.from("stores").insert([{
    name, address, city, country, phone, website, type, rating: currentRating, approved: false
  }]);

  if (error) {
    console.error(error);
    showToast("Error saving store ❌", "error");
  } else {
    showToast("Submission received and pending review ✅", "success");

    // Reset form
    document.getElementById("mapsLink").value = "";
    document.getElementById("previewImage").innerHTML = "";
    document.querySelectorAll("input[type=text]").forEach(el => el.value = "");
    currentRating = 0;
    resetStars();
  }
});

// ===== Supabase Init =====
const supabaseUrl = "https://gbxxoeplkzbhsvagnfsr.supabase.co"; 
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4"; 
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// ===== Star Rating =====
let currentRating = 0;
const stars = document.querySelectorAll('#starRating span');

stars.forEach((star, index) => {
  star.addEventListener('click', () => {
    currentRating = index + 1;
    stars.forEach(s => s.classList.remove('selected'));
    for (let i = 0; i < currentRating; i++) {
      stars[i].classList.add('selected');
    }
    console.log("Rating set:", currentRating);
  });
});

function getRating() {
  return currentRating;
}

// ===== Google Autocomplete =====
function initAutocomplete() {
  const input = document.getElementById("address");
  const autocomplete = new google.maps.places.Autocomplete(input);
  autocomplete.setFields(["address_components", "formatted_address"]);

  autocomplete.addListener("place_changed", () => {
    const place = autocomplete.getPlace();
    document.getElementById("address").value = place.formatted_address;

    const city = place.address_components.find(c => c.types.includes("locality"));
    const country = place.address_components.find(c => c.types.includes("country"));

    if (city) document.getElementById("city").value = city.long_name;
    if (country) document.getElementById("country").value = country.long_name;
  });
}
window.initAutocomplete = initAutocomplete;

// ===== Paste Maps Link =====
document.getElementById("pasteBtn").addEventListener("click", async () => {
  try {
    const text = await navigator.clipboard.readText();
    console.log("Clipboard text:", text);

    if (!text.includes("google.com/maps")) {
      alert("This does not look like a Google Maps link.");
      return;
    }

    const url = new URL(text);
    const query = url.searchParams.get("q");
    const placeId = url.searchParams.get("query_place_id") || url.searchParams.get("placeid");

    if (query) {
      document.getElementById("address").value = decodeURIComponent(query);
    }

    if (placeId && typeof google !== "undefined") {
      const service = new google.maps.places.PlacesService(document.createElement("div"));
      service.getDetails({ placeId, fields: ["name", "formatted_address", "address_components"] }, (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
          document.getElementById("name").value = place.name || "";
          document.getElementById("address").value = place.formatted_address || "";

          const cityComponent = place.address_components.find(c => c.types.includes("locality"));
          const countryComponent = place.address_components.find(c => c.types.includes("country"));

          if (cityComponent) document.getElementById("city").value = cityComponent.long_name;
          if (countryComponent) document.getElementById("country").value = countryComponent.long_name;
        }
      });
    }

  } catch (err) {
    console.error("Clipboard error:", err);
    alert("Could not read from clipboard. Allow clipboard access in your browser.");
  }
});

// ===== Save Store =====
document.getElementById("saveBtn").addEventListener("click", async (e) => {
  e.preventDefault();
  console.log("Save clicked ✅");

  const name = document.getElementById("name").value.trim();
  const address = document.getElementById("address").value.trim();
  const city = document.getElementById("city").value.trim() || "Unknown";
  const country = document.getElementById("country").value.trim() || "Unknown";
  const phone = document.getElementById("phone").value.trim();
  const website = document.getElementById("website").value.trim();
  const type = document.querySelector('input[name="type"]:checked')?.value || "store";
  const rating = getRating();

  console.log("Saving:", { name, address, city, country, phone, website, type, rating });

  const { error } = await supabase.from("stores").insert([
    { name, address, city, country, phone, website, type, rating }
  ]);

  if (error) {
    console.error("Error saving:", error);
    alert("Could not save store ❌");
  } else {
    alert("Store saved! ✅");

    // Reset fields
    document.getElementById("name").value = "";
    document.getElementById("address").value = "";
    document.getElementById("city").value = "";
    document.getElementById("country").value = "";
    document.getElementById("phone").value = "";
    document.getElementById("website").value = "";
    document.querySelector('input[name="type"][value="store"]').checked = true;

    // Reset stars
    stars.forEach(s => s.classList.remove("selected"));
    currentRating = 0;
  }
});


// ===== Supabase Init =====
const supabaseUrl = "https://gbxxoeplkzbhsvagnfsr.supabase.co"; 
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4"; 
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// =======================
// STAR RATING
// =======================
let currentRating = 0;

const stars = document.querySelectorAll("#starRating span");
stars.forEach((star, index) => {
  star.addEventListener("click", () => {
    currentRating = index + 1;
    updateStars();
  });
});

function updateStars() {
  stars.forEach((star, idx) => {
    star.classList.toggle("selected", idx < currentRating);
  });
}

function getRating() {
  return currentRating;
}

// =======================
// GOOGLE AUTOCOMPLETE
// =======================
window.initAutocomplete = function () {
  const addressInput = document.getElementById("address");
  if (!addressInput) return;

  const autocomplete = new google.maps.places.Autocomplete(addressInput, {
    types: ["geocode"],
    fields: ["formatted_address", "address_components", "name"],
  });

  autocomplete.addListener("place_changed", function () {
    const place = autocomplete.getPlace();
    if (!place) return;

    document.getElementById("address").value =
      place.formatted_address || "";

    // Name
    if (place.name) {
      document.getElementById("name").value = place.name;
    }

    // City & Country
    let city = "";
    let country = "";
    if (place.address_components) {
      place.address_components.forEach((comp) => {
        if (comp.types.includes("locality")) city = comp.long_name;
        if (comp.types.includes("country")) country = comp.long_name;
      });
    }
    document.getElementById("city").value = city;
    document.getElementById("country").value = country;
  });
};

// =======================
// PASTE BUTTON (Google Maps link)
// =======================
document.getElementById("pasteBtn").addEventListener("click", async () => {
  try {
    const text = await navigator.clipboard.readText();
    console.log("Clipboard text:", text);

    let placeQuery = "";

    const placeMatch = text.match(/\/place\/([^/]+)/);
    if (placeMatch && placeMatch[1]) {
      placeQuery = decodeURIComponent(placeMatch[1].replace(/\+/g, " "));
    }

    if (!placeQuery) {
      alert("Could not extract place from the link.");
      return;
    }

    const service = new google.maps.places.PlacesService(
      document.createElement("div")
    );

    service.findPlaceFromQuery(
      {
        query: placeQuery,
        fields: ["name", "formatted_address", "address_components"],
      },
      (results, status) => {
        if (
          status === google.maps.places.PlacesServiceStatus.OK &&
          results[0]
        ) {
          const place = results[0];
          console.log("Place details:", place);

          document.getElementById("name").value = place.name || "";
          document.getElementById("address").value =
            place.formatted_address || "";

          let city = "";
          let country = "";
          if (place.address_components) {
            place.address_components.forEach((comp) => {
              if (comp.types.includes("locality")) city = comp.long_name;
              if (comp.types.includes("country")) country = comp.long_name;
            });
          }
          document.getElementById("city").value = city;
          document.getElementById("country").value = country;
        } else {
          console.error("Places lookup failed:", status);
          alert("Could not fetch place details. Try typing manually.");
        }
      }
    );
  } catch (err) {
    console.error("Clipboard error:", err);
    alert("Clipboard access not allowed. Paste manually instead.");
  }
});

// =======================
// SAVE BUTTON
// =======================
document.getElementById("saveBtn").addEventListener("click", async () => {
  console.log("Save clicked");

  const name = document.getElementById("name").value.trim();
  const address = document.getElementById("address").value.trim();
  const city = document.getElementById("city").value.trim() || "Unknown";
  const country =
    document.getElementById("country").value.trim() || "Unknown";
  const phone = document.getElementById("phone").value.trim();
  const website = document.getElementById("website").value.trim();
  const type = document.querySelector("input[name='type']:checked")?.value;
  const rating = getRating();

  if (!name || !address) {
    alert("Name and Address are required");
    return;
  }

  const { data, error } = await supabase
    .from("stores")
    .insert([
      {
        name,
        address,
        city,
        country,
        phone,
        website,
        type,
        rating,
        approved: false, // default
      },
    ])
    .select();

  if (error) {
    console.error("Error saving store:", error);
    alert("Error saving store: " + error.message);
  } else {
    console.log("Saved:", data);
    alert("Store saved successfully!");

    // Reset form
    document.getElementById("name").value = "";
    document.getElementById("address").value = "";
    document.getElementById("city").value = "";
    document.getElementById("country").value = "";
    document.getElementById("phone").value = "";
    document.getElementById("website").value = "";
    document.querySelector("input[name='type'][value='Store']").checked = true;
    currentRating = 0;
    updateStars();
  }
});

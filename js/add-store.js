// === Supabase init ===
const sb = supabase.createClient(
  "https://gbxxoeplkzbhsvagnfsr.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4"
);

// === Stjärnbetyg ===
let selectedRating = 0;
document.querySelectorAll(".star").forEach(star => {
  star.addEventListener("click", () => {
    selectedRating = star.dataset.value;
    document.querySelectorAll(".star").forEach(s => s.classList.remove("selected"));
    star.classList.add("selected");
  });
});

// === Hjälpmetod för att extrahera söktext ur en Google Maps URL ===
function extractQueryFromUrl(url) {
  try {
    const match = url.match(/\/place\/([^/]+)/);
    if (match && match[1]) {
      return decodeURIComponent(match[1].replace(/\+/g, " "));
    }
  } catch (e) {}
  return url; // fallback
}

// === Paste-knappen ===
document.getElementById("pasteBtn").addEventListener("click", async () => {
  const input = document.getElementById("mapsUrl");
  const text = await navigator.clipboard.readText();
  input.value = text;

  const queryText = extractQueryFromUrl(text);
  if (!queryText) {
    alert("Could not extract a place query from URL.");
    return;
  }

  // initiera PlacesService
  const mapDiv = document.createElement("div");
  const map = new google.maps.Map(mapDiv);
  const service = new google.maps.places.PlacesService(map);

  // 1. Hitta PlaceID
  service.findPlaceFromQuery({ query: queryText, fields: ["place_id"] }, (results, status) => {
    if (status === google.maps.places.PlacesServiceStatus.OK && results[0]) {
      const placeId = results[0].place_id;

      // 2. Hämta detaljer
      service.getDetails(
        {
          placeId: placeId,
          fields: ["name", "formatted_address", "geometry", "international_phone_number", "website"]
        },
        (place, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK) {
            // Sätt värden i formuläret
            document.getElementById("name").value = place.name || "";
            document.getElementById("address").value = place.formatted_address || "";
            document.getElementById("phone").value = place.international_phone_number || "";
            document.getElementById("website").value = place.website || "";

            // Extrahera stad + land från address
            const parts = place.formatted_address.split(",");
            if (parts.length >= 2) {
              document.getElementById("city").value = parts[parts.length - 2].trim();
              document.getElementById("country").value = parts[parts.length - 1].trim();
            }

            // Spara hidden metadata på wrappern
            const wrapper = document.getElementById("form-wrapper");
            wrapper.dataset.placeId = placeId;
            if (place.geometry && place.geometry.location) {
              wrapper.dataset.lat = place.geometry.location.lat();
              wrapper.dataset.lng = place.geometry.location.lng();
            }

            alert("✅ Place details fetched!");
          } else {
            alert("❌ Error fetching details: " + status);
          }
        }
      );
    } else {
      alert("❌ Could not resolve PlaceID: " + status);
    }
  });
});

// === Spara-knappen ===
document.getElementById("saveBtn").addEventListener("click", async () => {
  const wrapper = document.getElementById("form-wrapper");

  const storeData = {
    name: document.getElementById("name").value,
    address: document.getElementById("address").value,
    city: document.getElementById("city").value,
    country: document.getElementById("country").value,
    phone: document.getElementById("phone").value,
    website: document.getElementById("website").value,
    type: document.querySelector('input[name="type"]:checked')?.value || "other",
    rating: selectedRating,
    status: "pending",
    place_id: wrapper.dataset.placeId || null,
    lat: wrapper.dataset.lat || null,
    lng: wrapper.dataset.lng || null
  };

  const { data, error } = await sb.from("stores").insert([storeData]);

  if (error) {
    alert("❌ Error saving: " + error.message);
  } else {
    alert("✅ Store saved!");
    console.log("Saved:", data);
  }
});

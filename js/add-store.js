// === Supabase init ===
const sb = supabase.createClient(
  "https://gbxxoeplkzbhsvagnfsr.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4"
);

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
            document.getElementById("storeName").value = place.name || "";
            document.getElementById("storeAddress").value = place.formatted_address || "";
            document.getElementById("storePhone").value = place.international_phone_number || "";
            document.getElementById("storeWebsite").value = place.website || "";

            // Extrahera stad + land från address
            const parts = place.formatted_address.split(",");
            if (parts.length >= 2) {
              document.getElementById("storeCity").value = parts[parts.length - 2].trim();
              document.getElementById("storeCountry").value = parts[parts.length - 1].trim();
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

// =============================
// ⭐ Stjärnor klickbara
// =============================
document.querySelectorAll('.stars span').forEach((star, index) => {
  star.addEventListener('click', () => {
    // Nollställ alla
    document.querySelectorAll('.stars span').forEach(s => s.classList.remove('selected'));
    // Markera fram till klickad stjärna
    for (let i = 0; i <= index; i++) {
      document.querySelectorAll('.stars span')[i].classList.add('selected');
    }
  });
});

function getRating() {
  return document.querySelectorAll('.stars .selected').length;
}

// =============================
// 💾 Save-funktion
// =============================
async function saveStore(e) {
  e.preventDefault(); // stoppar reload

  const wrapper = document.getElementById("form-wrapper");

  const name = document.getElementById("storeName").value.trim();
  const address = document.getElementById("storeAddress").value.trim();
  const city = document.getElementById("storeCity").value.trim() || "Unknown";
  const country = document.getElementById("storeCountry").value.trim() || "Unknown";
  const phone = document.getElementById("storePhone").value.trim();
  const website = document.getElementById("storeWebsite").value.trim();
  const type = document.querySelector('input[name="type"]:checked')?.value || "Other";

  // ⭐ Hämta rating
  let rating = getRating();
  if (isNaN(rating) || rating < 0 || rating > 5) rating = 0;

  // Skicka till Supabase
  const { data, error } = await sb
    .from("stores")
    .insert([
      { name, address, city, country, phone, website, type, rating }
    ]);

  if (error) {
    console.error("Error saving:", error);
    alert("❌ Kunde inte spara: " + error.message);
  } else {
    alert("✅ Store sparad!");
    document.querySelector("form").reset();

    // Rensa stjärnorna visuellt
    document.querySelectorAll('.stars span').forEach(s => s.classList.remove('selected'));
  }
}

// =============================
// 🔘 Koppla Save-knappen
// =============================
document.getElementById("saveBtn").addEventListener("click", saveStore);

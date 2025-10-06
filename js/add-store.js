// ==========================
// Config
// ==========================
const sb = supabase.createClient(
  "https://gbxxoeplkzbhsvagnfsr.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4"
);

// ===========================
// Hjälpfunktion: extrahera PlaceID från Google Maps-URL
// ===========================
function extractPlaceIdFromUrl(url) {
  const regex = /!1s([^!]+)!/; // lång URL med !1sPLACEID!
  const match = url.match(regex);
  if (match && match[1]) {
    console.log("✅ Extracted PlaceID:", match[1]);
    return match[1];
  }

  const qMatch = url.match(/place_id:([^&]+)/); // typ ?q=place_id:XYZ
  if (qMatch && qMatch[1]) {
    console.log("✅ Extracted PlaceID:", qMatch[1]);
    return qMatch[1];
  }

  console.warn("⚠️ Ingen PlaceID hittad i URL:", url);
  return null;
}

// ===========================
// Stjärnbetyg
// ===========================
let selectedRating = 0;
document.querySelectorAll(".star").forEach((star, index) => {
  star.addEventListener("click", () => {
    selectedRating = index + 1;
    document.querySelectorAll(".star").forEach((s, i) => {
      s.classList.toggle("selected", i < selectedRating);
    });
  });
});

// ===========================
// Paste-knapp → hämta platsdata
// ===========================
document.getElementById("pasteBtn").addEventListener("click", () => {
  const url = document.getElementById("mapsUrl").value.trim();
  const placeId = extractPlaceIdFromUrl(url);

  if (!placeId) {
    alert("Ingen giltig PlaceID hittades i länken.");
    return;
  }

  // Initiera en "osynlig" karta för PlacesService
  const mapDiv = document.createElement("div");
  const map = new google.maps.Map(mapDiv);
  const service = new google.maps.places.PlacesService(map);

  service.getDetails(
    {
      placeId: placeId,
      fields: [
        "name",
        "formatted_address",
        "geometry",
        "international_phone_number",
        "website",
        "address_components"
      ]
    },
    (place, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK) {
        console.log("🎉 Platsdata:", place);

        // Autofyll fälten
        document.getElementById("name").value = place.name || "";
        document.getElementById("address").value = place.formatted_address || "";
        document.getElementById("phone").value = place.international_phone_number || "";
        document.getElementById("website").value = place.website || "";

        // Stad & land
        if (place.address_components) {
          const city = place.address_components.find(c => c.types.includes("locality"));
          const country = place.address_components.find(c => c.types.includes("country"));
          document.getElementById("city").value = city ? city.long_name : "";
          document.getElementById("country").value = country ? country.long_name : "";
        }

        // Koordinater + PlaceID sparas i dataset
        const formWrapper = document.getElementById("form-wrapper");
        if (place.geometry && place.geometry.location) {
          formWrapper.dataset.lat = place.geometry.location.lat();
          formWrapper.dataset.lng = place.geometry.location.lng();
        }
        formWrapper.dataset.placeId = placeId;
      } else {
        console.error("❌ Misslyckades att hämta platsinfo:", status);
      }
    }
  );
});

// ===========================
// Spara till Supabase
// ===========================
document.getElementById("storeForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const formWrapper = document.getElementById("form-wrapper");

  const newStore = {
    name: document.getElementById("name").value.trim(),
    address: document.getElementById("address").value.trim(),
    city: document.getElementById("city").value.trim(),
    country: document.getElementById("country").value.trim(),
    phone: document.getElementById("phone").value.trim(),
    website: document.getElementById("website").value.trim(),
    type: document.querySelector('input[name="type"]:checked')?.value || "store",
    rating: selectedRating,
    status: "pending",
    place_id: formWrapper.dataset.placeId || null,
    lat: formWrapper.dataset.lat || null,
    lng: formWrapper.dataset.lng || null
  };

  console.log("📤 Sparar till Supabase:", newStore);

  const { data, error } = await sb.from("stores").insert([newStore]);

  if (error) {
    console.error("❌ Fel vid sparning:", error);
    alert("Något gick fel, försök igen.");
  } else {
    console.log("✅ Sparad i Supabase:", data);
    alert("Platsen sparad som 'pending' i databasen!");
    document.getElementById("storeForm").reset();
    selectedRating = 0;
    document.querySelectorAll(".star").forEach(s => s.classList.remove("selected"));
  }
});

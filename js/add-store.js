// ==== CONFIG ====
const GOOGLE_API_KEY = "AIzaSyClP5xnMvYaHC1xjHzuTFj3K9tHw0g6O00; // lägg din riktiga key här
const SUPABASE_URL = "https://gbxxoeplkzbhsvagnfsr.supabase.co";
const SUPABASE_KEY = "DIN_SUPABASE_KEY_HÄR"; 


// Supabase klient
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// === STAR RATING ===
let selectedRating = 0;
document.querySelectorAll(".star").forEach(star => {
  star.addEventListener("click", () => {
    selectedRating = star.dataset.value;
    document.querySelectorAll(".star").forEach(s => {
      s.classList.toggle("selected", s.dataset.value <= selectedRating);
    });
  });
});

// === FETCH PLACE DETAILS ===
async function fetchPlaceDetails(url) {
  console.log("Analyserar Maps URL:", url);

  // 1) Försök hitta PlaceID (!1s...)
  const placeIdMatch = url.match(/!1s([^!]+)!/);
  if (placeIdMatch) {
    const placeId = placeIdMatch[1];
    console.log("Hittade PlaceID:", placeId);

    const resp = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${GOOGLE_API_KEY}&fields=name,formatted_address,address_component,geometry,international_phone_number,website`
    );
    const data = await resp.json();
    console.log("Places API svar:", data);

    if (data.result) {
      return {
        name: data.result.name,
        address: data.result.formatted_address,
        city: data.result.address_components?.find(c =>
          c.types.includes("locality")
        )?.long_name || "",
        country: data.result.address_components?.find(c =>
          c.types.includes("country")
        )?.long_name || "",
        phone: data.result.international_phone_number || "",
        website: data.result.website || "",
        lat: data.result.geometry?.location.lat || null,
        lng: data.result.geometry?.location.lng || null,
      };
    }
  }

  // 2) Försök hitta koordinater i länken
  const coordsMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (coordsMatch) {
    const lat = parseFloat(coordsMatch[1]);
    const lng = parseFloat(coordsMatch[2]);
    console.log("Hittade koordinater:", lat, lng);

    const geoResp = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_API_KEY}`
    );
    const geoData = await geoResp.json();
    console.log("Geocoding svar:", geoData);

    const result = geoData.results[0];
    return {
      name: result?.address_components?.[0]?.long_name || "",
      address: result?.formatted_address || "",
      city: result?.address_components?.find(c =>
        c.types.includes("locality")
      )?.long_name || "",
      country: result?.address_components?.find(c =>
        c.types.includes("country")
      )?.long_name || "",
      phone: "",
      website: "",
      lat,
      lng,
    };
  }

  return null;
}

// === PASTE BUTTON ===
document.getElementById("pasteBtn").addEventListener("click", async () => {
  const pasteBtn = document.getElementById("pasteBtn");
  const mapsUrl = document.getElementById("mapsUrl").value;

  if (!mapsUrl) {
    alert("Klistra in en Google Maps URL först!");
    return;
  }

  try {
    // Visa spinner
    pasteBtn.disabled = true;
    pasteBtn.innerHTML = `<span class="spinner"></span> Laddar...`;

    const placeDetails = await fetchPlaceDetails(mapsUrl);

    if (placeDetails) {
      document.getElementById("name").value = placeDetails.name || "";
      document.getElementById("address").value = placeDetails.address || "";
      document.getElementById("city").value = placeDetails.city || "";
      document.getElementById("country").value = placeDetails.country || "";
      document.getElementById("phone").value = placeDetails.phone || "";
      document.getElementById("website").value = placeDetails.website || "";
    } else {
      alert("Kunde inte hämta platsdata. Kontrollera länken.");
    }
  } catch (err) {
    console.error("Fel vid hämtning:", err);
    alert("Något gick fel. Se konsolen.");
  } finally {
    // Återställ knappen
    pasteBtn.disabled = false;
    pasteBtn.textContent = "Paste";
  }
});

// === FORM SUBMIT ===
document.getElementById("storeForm").addEventListener("submit", async e => {
  e.preventDefault();

  const newStore = {
    name: document.getElementById("name").value,
    address: document.getElementById("address").value,
    city: document.getElementById("city").value,
    country: document.getElementById("country").value,
    phone: document.getElementById("phone").value,
    website: document.getElementById("website").value,
    type: document.querySelector('input[name="type"]:checked').value,
    rating: selectedRating ? parseInt(selectedRating) : null,
    status: "pending",
  };

  console.log("Sparar i Supabase:", newStore);

  const { data, error } = await sb.from("stores").insert([newStore]);
  if (error) {
    console.error(error);
    alert("Fel vid sparning!");
  } else {
    alert("Butiken sparad som pending.");
    e.target.reset();
  }
});

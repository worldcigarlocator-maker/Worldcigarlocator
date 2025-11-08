/* ================================
   js/add-store.js
   Frontend Add Store form
   Shared logic via add-shared.js
   ================================ */

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("addStoreForm");
  const submitBtn = document.getElementById("saveBtn");
  const preview = document.getElementById("preview");

  // 🔹 Google Place-data som fylls automatiskt
  let selectedPlace = {};

  // 🗺️ Initieras av Google Maps callback (från add-shared.js)
  window.initAutocomplete = async function initAutocomplete() {
    const input = document.getElementById("placeInput");
    const autocomplete = new google.maps.places.Autocomplete(input, {
      fields: ["place_id", "geometry", "formatted_address", "name", "photos", "address_components"],
      types: ["establishment"],
    });

   autocomplete.addListener("place_changed", async () => {
  const place = autocomplete.getPlace();
  if (!place.place_id) return;

  // 🔸 Grunddata
  selectedPlace = {
    name: place.name || "",
    address: place.formatted_address || "",
    place_id: place.place_id,
    lat: place.geometry?.location?.lat() || null,
    lng: place.geometry?.location?.lng() || null,
  };

  // 🔹 Hämta land & stad
  const comp = place.address_components || [];
  const cityObj = comp.find(c => c.types.includes("locality")) ||
                  comp.find(c => c.types.includes("postal_town"));
  const countryObj = comp.find(c => c.types.includes("country"));
  selectedPlace.city = cityObj?.long_name || "";
  selectedPlace.country = countryObj?.long_name || "";

  // 🌍 Bestäm kontinent via shared.js
  selectedPlace.continent = WCL.countryToContinent(selectedPlace.country);

  // 📞💻 Hämta telefon & webbplats via Places v1
  try {
    const details = await WCL.fetchPlaceDetails(place.place_id);
    if (details) {
      selectedPlace.phone = details.phone || "";
      selectedPlace.website = details.website || "";
    }
  } catch (err) {
    console.warn("fetchPlaceDetails failed", err);
  }

  // 🖼️ Hämta fotoreferenser via REST → photo-proxy
  const refs = await WCL.fetchPhotoRefs(place.place_id);
  if (refs.length) {
    selectedPlace.photo_reference = refs[0];
    const url = await WCL.resolveGooglePhotoUrl(refs[0]);
    preview.innerHTML = `<img src="${url}" alt="Preview">`;
  } else {
    const fallback = WCL.fallbackForType("store");
    preview.innerHTML = `<img src="${fallback}" alt="Preview">`;
  }

  // 🧠 Autofyll eventuella fält i formuläret
  if (selectedPlace.phone && $("#phone")) $("#phone").value = selectedPlace.phone;
  if (selectedPlace.website && $("#website")) $("#website").value = selectedPlace.website;

  toast("✅ Platsdata hämtad!", "success");
});
  };

  // 💾 Spara till Supabase
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;

    try {
      const type = document.querySelector("input[name='type']:checked")?.value || "store";
      const rating = Number(document.querySelector("input[name='rating']")?.value || 0);
      const added_by = document.querySelector("#added_by")?.value || "anonymous";

      const payload = {
        ...selectedPlace,
        type,
        types: [type],
        rating,
        added_by,
        approved: false,
        flagged: false,
        deleted: false,
      };
// 🌍 Säkerställ att kontinent alltid fylls
if (!selectedPlace.continent && selectedPlace.country) {
  selectedPlace.continent = WCL.countryToContinent(selectedPlace.country);
}

      // 🧩 Spara till Supabase
      const { data, error } = await supabase.from("stores").insert([payload]);

      if (error) throw error;
      toast("✅ Store added successfully!", "success");
      form.reset();
      preview.innerHTML = "";
      selectedPlace = {};
    } catch (err) {
      console.error(err);
      toast("❌ Error saving store", "error");
    } finally {
      submitBtn.disabled = false;
    }
  });
});

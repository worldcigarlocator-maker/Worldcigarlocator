/* ================================
   js/add-store.js
   Frontend Add Store form
   Shared logic via add-shared.js
   ================================ */

// 🌍 Global plats-data tillgänglig överallt
window.selectedPlace = {};

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("addStoreForm");
  const submitBtn = document.getElementById("saveBtn");
  const preview = document.getElementById("preview");

  // 🗺️ Initieras av Google Maps callback (från add-shared.js)
  window.initAutocomplete = async function initAutocomplete() {
    const input = document.getElementById("placeInput");
    const autocomplete = new google.maps.places.Autocomplete(input, {
      fields: [
        "place_id",
        "geometry",
        "formatted_address",
        "name",
        "photos",
        "address_components",
        "international_phone_number",
        "website"
      ],
      types: ["establishment"],
    });

    autocomplete.addListener("place_changed", async () => {
      const place = autocomplete.getPlace();
      if (!place.place_id) return;

      // 🔸 Grunddata
      window.selectedPlace = {
        name: place.name || "",
        address: place.formatted_address || "",
        place_id: place.place_id,
        lat: place.geometry?.location?.lat() || null,
        lng: place.geometry?.location?.lng() || null,
      };

      // 🔹 Hämta land & stad
      const comp = place.address_components || [];
      const cityObj =
        comp.find(c => c.types.includes("locality")) ||
        comp.find(c => c.types.includes("postal_town"));
      const countryObj = comp.find(c => c.types.includes("country"));
      window.selectedPlace.city = cityObj?.long_name || "";
      window.selectedPlace.country = countryObj?.long_name || "";

      // 🌍 Bestäm kontinent via shared.js
      window.selectedPlace.continent = WCL.countryToContinent(window.selectedPlace.country);

  // 📞💻 Hämta telefon & webbplats via Supabase Edge Function
try {
  const res = await fetch("https://gbxxoeplkzbhsvagnfsr.functions.supabase.co/fetch-place-details", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ place_id: place.place_id }),
  });

  if (res.ok) {
    const details = await res.json();
    selectedPlace.phone = details.phone || "";
    selectedPlace.website = details.website || "";
  } else {
    console.warn("fetch-place-details failed", res.status);
  }
} catch (err) {
  console.warn("fetch-place-details error", err);
}


      // 🖼️ Hämta fotoreferenser via REST → photo-proxy
      const refs = await WCL.fetchPhotoRefs(place.place_id);
      if (refs.length) {
        window.selectedPlace.photo_reference = refs[0];
        const url = await WCL.resolveGooglePhotoUrl(refs[0]);
        preview.innerHTML = `<img src="${url}" alt="Preview">`;
      } else {
        const fallback = WCL.fallbackForType("store");
        preview.innerHTML = `<img src="${fallback}" alt="Preview">`;
      }

      // 🧠 Autofyll formulärfält
      if (window.selectedPlace.phone && $("#phone"))
        $("#phone").value = window.selectedPlace.phone;
      if (window.selectedPlace.website && $("#website"))
        $("#website").value = window.selectedPlace.website;

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

      // 📦 Bygg payload med all data
      const payload = {
        ...window.selectedPlace,
        type,
        types: [type],
        rating,
        added_by,
        approved: false,
        flagged: false,
        deleted: false,
        phone: window.selectedPlace.phone || null,
        website: window.selectedPlace.website || null,
        continent:
          window.selectedPlace.continent ||
          (window.selectedPlace.country
            ? WCL.countryToContinent(window.selectedPlace.country)
            : null),
      };

      console.log("📦 Saving payload →", payload);

      // 🧩 Spara till Supabase
      const { data, error } = await supabase.from("stores").insert([payload]);
      if (error) throw error;

      toast("✅ Store added successfully!", "success");
      form.reset();
      preview.innerHTML = "";
      window.selectedPlace = {}; // nollställ globalen
    } catch (err) {
      console.error(err);
      toast("❌ Error saving store", "error");
    } finally {
      submitBtn.disabled = false;
    }
  });
});

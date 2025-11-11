/* ================================
   js/add-store.js
   Add Store — Backoffice version
   Shared logic via add-shared.js
   ================================ */

console.log("🚀 Add Store Backoffice loaded");

/* 🌍 Global platsdata */
window.selectedPlace = {};
window.photoRefs = [];
let currentIndex = 0;
let selectedTypes = [];

/* ================================
   GOOGLE AUTOCOMPLETE
   ================================ */
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("addStoreForm");
  const submitBtn = document.getElementById("saveBtn");
  const preview = document.getElementById("preview");

  // ✅ Exporteras globalt till Google callback
  window.initAutocomplete = async function initAutocomplete() {
    const input = document.getElementById("gAddress");
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
      language: "en"
    });

    autocomplete.addListener("place_changed", async () => {
      try {
        const place = autocomplete.getPlace();
        if (!place.place_id) return;

        console.log("📍 Full place object:", place);

        // 🔸 Grunddata
        window.selectedPlace = {
          name: place.name || "",
          address: place.formatted_address || "",
          place_id: place.place_id,
          lat: place.geometry?.location?.lat() || null,
          lng: place.geometry?.location?.lng() || null,
        };

        // 🔹 Land & stad
        const comp = place.address_components || [];
        const cityObj =
          comp.find(c => c.types.includes("locality")) ||
          comp.find(c => c.types.includes("postal_town"));
        const countryObj = comp.find(c => c.types.includes("country"));

        window.selectedPlace.city = cityObj?.long_name || "";
        window.selectedPlace.country_iso2 = countryObj?.short_name?.toLowerCase() || null;
        window.selectedPlace.country = countryObj?.long_name || "";

        // 🌍 Kontinent
        window.selectedPlace.continent = WCL.countryToContinent(
          window.selectedPlace.country,
          window.selectedPlace.country_iso2
        );

        // 📞💻 Hämta phone/website via Supabase-funktion
        try {
          const res = await fetch(
            "https://gbxxoeplkzbhsvagnfsr.functions.supabase.co/fetch-place-details",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ place_id: place.place_id }),
            }
          );

          if (res.ok) {
            const details = await res.json();
            window.selectedPlace.phone = details.phone || "";
            window.selectedPlace.website = details.website || "";
          } else {
            console.warn("fetch-place-details failed:", res.status);
          }
        } catch (err) {
          console.warn("fetch-place-details error:", err);
        }

        // 🖼️ Foto (hämtar och aktiverar navigation)
        const refs = await WCL.fetchPhotoRefs(place.place_id);
        window.photoRefs = refs;
        currentIndex = 0;

        function showCurrentPhoto() {
          if (!preview) return;

          if (!window.photoRefs.length) {
            const fallback = WCL.fallbackForType("store");
            preview.innerHTML = `<img src="${fallback}" alt="Preview">`;
            return;
          }

          const ref = window.photoRefs[currentIndex];
          window.selectedPlace.photo_reference = ref;
          const url = WCL.buildProxyUrl(ref, 800);

          preview.innerHTML = `
            <div class="photo-picker">
              <button id="add-prev" class="photo-nav">◀</button>
              <img id="add-photo" class="preview-photo" src="${url}" alt="Preview">
              <button id="add-next" class="photo-nav">▶</button>
            </div>
            <div class="muted center">Photo ${currentIndex + 1} / ${window.photoRefs.length}</div>
          `;

          document.getElementById("add-prev").onclick = () => {
            if (!window.photoRefs.length) return;
            currentIndex = (currentIndex - 1 + window.photoRefs.length) % window.photoRefs.length;
            showCurrentPhoto();
          };
          document.getElementById("add-next").onclick = () => {
            if (!window.photoRefs.length) return;
            currentIndex = (currentIndex + 1) % window.photoRefs.length;
            showCurrentPhoto();
          };
        }

        showCurrentPhoto();
        WCL.toastShared(`✅ ${refs.length} photos found!`, "success");

      } catch (err) {
        console.error("❌ place_changed failed:", err);
      }
    });
  };
});

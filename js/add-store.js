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

  window.initAutocomplete = async function initAutocomplete() {
    const input = document.getElementById("autocomplete");
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

      // 🔹 Land & stad
      const comp = place.address_components || [];
      const cityObj =
        comp.find((c) => c.types.includes("locality")) ||
        comp.find((c) => c.types.includes("postal_town"));
      const countryObj = comp.find((c) => c.types.includes("country"));

      window.selectedPlace.city = cityObj?.long_name || "";
      window.selectedPlace.country_iso2 = countryObj?.short_name?.toLowerCase() || null;

      // 🇬🇧 Land på engelska
      const ISO2_TO_COUNTRY_EN = {
        se: "Sweden", no: "Norway", dk: "Denmark", fi: "Finland",
        gb: "United Kingdom", us: "United States", de: "Germany", fr: "France",
        es: "Spain", it: "Italy", nl: "Netherlands", be: "Belgium", pt: "Portugal",
        ca: "Canada", mx: "Mexico", br: "Brazil", jp: "Japan", cn: "China",
        au: "Australia", nz: "New Zealand"
      };
      window.selectedPlace.country =
        ISO2_TO_COUNTRY_EN[window.selectedPlace.country_iso2] ||
        (countryObj?.long_name || "");

      // 🌍 Kontinent
     window.selectedPlace.continent = WCL.countryToContinent(
  window.selectedPlace.country,
  window.selectedPlace.country_iso2
);

       
      // 📞💻 Hämta phone/website via Supabase-funktion
      try {
        const res = await fetch("https://gbxxoeplkzbhsvagnfsr.functions.supabase.co/fetch-place-details", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ place_id: place.place_id }),
        });

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
        if (!window.photoRefs.length) {
          const fallback = WCL.fallbackForType("store");
          preview.innerHTML = `<img src="${fallback}" alt="Preview">`;
          return;
        }

        const ref = window.photoRefs[currentIndex];
        window.selectedPlace.photo_reference = ref;
        const url = WCL.buildPhotoProxyUrl(ref, 800);

        preview.innerHTML = `
          <div class="photo-picker">
            <button id="add-prev" class="photo-nav">◀</button>
            <img id="add-photo" class="preview-photo" src="${url}" alt="Preview">
            <button id="add-next" class="photo-nav">▶</button>
          </div>
          <div class="muted center">Photo ${currentIndex + 1} / ${window.photoRefs.length}</div>
        `;

        // aktivera navigation
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

      // 🧠 Autofyll formulärfält
      if (window.selectedPlace.phone && $("#phone")) $("#phone").value = window.selectedPlace.phone;
      if (window.selectedPlace.website && $("#website")) $("#website").value = window.selectedPlace.website;

      toast(`✅ ${refs.length ? refs.length + " photos found!" : "No photos found"}`, "success");
    });
  };

  /* ================================
     TYPE SELECTOR — Multi-select
     ================================ */
  document.querySelectorAll(".type-btn input").forEach(cb => {
    cb.addEventListener("change", () => {
      const val = cb.value;
      if (cb.checked) {
        if (!selectedTypes.includes(val)) selectedTypes.push(val);
      } else {
        selectedTypes = selectedTypes.filter(t => t !== val);
      }
      console.log("🟩 Selected types →", selectedTypes);
    });
  });

  /* ================================
     FORM SUBMIT
     ================================ */
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;

    try {
      const types = selectedTypes.length ? selectedTypes : ["store"];
      const rating = Number(document.querySelector("input[name='rating']")?.value || 0);
      const added_by = document.querySelector("#added_by")?.value || "anonymous";

      const payload = {
        ...window.selectedPlace,
        photo_reference: window.selectedPlace.photo_reference || null, // ✅ aktuell bild
        types,
        rating,
        added_by,
        approved: false,
        flagged: false,
        deleted: false,
        phone: window.selectedPlace.phone || null,
        website: window.selectedPlace.website || null,
        continent:
         continent:
  window.selectedPlace.continent ||
  (window.selectedPlace.country || window.selectedPlace.country_iso2
    ? WCL.countryToContinent(window.selectedPlace.country, window.selectedPlace.country_iso2)
    : null),

        country_iso2: window.selectedPlace.country_iso2 || null,
      };

      console.log("📦 Saving payload →", payload);

      const { data, error } = await supabase.from("stores").insert([payload]);
      if (error) throw error;

      toast("✅ Store added successfully!", "success");
      form.reset();
      preview.innerHTML = "";
      window.selectedPlace = {};
      window.photoRefs = [];
      currentIndex = 0;
      selectedTypes = [];
      document.querySelectorAll(".type-btn").forEach((b) => b.classList.remove("active"));

    } catch (err) {
      console.error(err);
      toast("❌ Error saving store", "error");
    } finally {
      submitBtn.disabled = false;
    }
  });
});

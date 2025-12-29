/* ================================================================
   js/add-store.js
   Backoffice — Add Store (FIXED: Places Details + Proxy Photos)
   Date: 2025-12-29
   ================================================================ */

console.log("🚀 Add Store Backoffice loaded (fixed)");

/* 🌍 Globals */
window.selectedPlace = {};
window.photoRefs = [];        // array of photo_reference strings
let currentIndex = 0;
let selectedTypes = [];

/* ================================================================
   GOOGLE AUTOCOMPLETE (stable: place_id -> getDetails)
   ================================================================ */
window.initAutocomplete = function initAutocomplete() {
  console.log("✅ initAutocomplete ready (fixed)");

  const input = document.getElementById("gAddress");
  if (!input) {
    console.error("❌ Input #gAddress not found");
    return;
  }

  // Only request place_id from autocomplete (reliable)
  const autocomplete = new google.maps.places.Autocomplete(input, {
    fields: ["place_id"],
    types: ["establishment"],
  });

  // Places Details service
  const svc = new google.maps.places.PlacesService(document.createElement("div"));

  autocomplete.addListener("place_changed", () => {
    const basic = autocomplete.getPlace();
    if (!basic?.place_id) {
      console.warn("⚠️ Invalid place (no place_id)");
      return;
    }

    const placeId = basic.place_id;
    console.log("📍 place_id:", placeId);

    // Ask for full details
    svc.getDetails(
      {
        placeId,
        fields: [
          "place_id",
          "geometry",
          "formatted_address",
          "name",
          "address_components",
          "international_phone_number",
          "website",
        ],
      },
      async (place, status) => {
        try {
          if (status !== google.maps.places.PlacesServiceStatus.OK || !place) {
            console.error("❌ getDetails failed:", status);
            WCL.toastShared("Failed to load place details", "error");
            return;
          }

          console.log("✅ Place details:", place);

          /* -----------------------------
             Parse address components
          ----------------------------- */
          const comp = place.address_components || [];
          const getLong = (type) =>
            comp.find((c) => c.types?.includes(type))?.long_name || "";
          const getShort = (type) =>
            comp.find((c) => c.types?.includes(type))?.short_name || "";

          // City: locality -> postal_town -> admin_area_level_2 fallback
          const city =
            getLong("locality") ||
            getLong("postal_town") ||
            getLong("administrative_area_level_2") ||
            "";

          // State (US etc)
          const state = getLong("administrative_area_level_1") || "";

          const country = getLong("country") || "";
          const country_iso2 = (getShort("country") || "").toLowerCase();

          // Build selectedPlace
          window.selectedPlace = {
            name: place.name || "",
            address: place.formatted_address || "",
            place_id: place.place_id,
            lat: place.geometry?.location?.lat() || null,
            lng: place.geometry?.location?.lng() || null,
            city,
            state,
            country,
            country_iso2,
            continent: WCL.countryToContinent(country, country_iso2),
            phone: place.international_phone_number || "",
            website: place.website || "",
            photo_reference: null, // set after refs load
          };

          /* -----------------------------
             Photos via your Edge Function (photo-refs -> photo-proxy)
          ----------------------------- */
          const previewImg = document.getElementById("preview-photo");
          const meta = document.getElementById("photo-meta");
          const prevBtn = document.getElementById("prev-photo");
          const nextBtn = document.getElementById("next-photo");

          // Default UI
          if (meta) meta.textContent = "Loading photos…";
          if (previewImg) previewImg.src = WCL.fallbackForType("store");

          const refs = await WCL.fetchPhotoRefs(placeId);
          window.photoRefs = Array.isArray(refs) ? refs : [];

          if (window.photoRefs.length) {
            currentIndex = 0;
            window.selectedPlace.photo_reference = window.photoRefs[0];

            // Load first photo via proxy (blob safe)
            await WCL.loadProxyPhotoInto(previewImg, window.photoRefs[0], "store");

            if (meta) meta.textContent = `Photo 1 / ${window.photoRefs.length}`;

            // Navigation
            if (prevBtn) {
              prevBtn.onclick = async () => {
                currentIndex = (currentIndex - 1 + window.photoRefs.length) % window.photoRefs.length;
                const ref = window.photoRefs[currentIndex];
                window.selectedPlace.photo_reference = ref;
                await WCL.loadProxyPhotoInto(previewImg, ref, "store");
                if (meta) meta.textContent = `Photo ${currentIndex + 1} / ${window.photoRefs.length}`;
              };
            }

            if (nextBtn) {
              nextBtn.onclick = async () => {
                currentIndex = (currentIndex + 1) % window.photoRefs.length;
                const ref = window.photoRefs[currentIndex];
                window.selectedPlace.photo_reference = ref;
                await WCL.loadProxyPhotoInto(previewImg, ref, "store");
                if (meta) meta.textContent = `Photo ${currentIndex + 1} / ${window.photoRefs.length}`;
              };
            }
          } else {
            if (previewImg) previewImg.src = WCL.fallbackForType("store");
            if (meta) meta.textContent = "No photo found";
            if (prevBtn) prevBtn.onclick = null;
            if (nextBtn) nextBtn.onclick = null;
          }

          /* -----------------------------
             Autofill form fields
          ----------------------------- */
          const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = val || "";
          };

          setVal("name", window.selectedPlace.name);
          setVal("addr", window.selectedPlace.address);
          setVal("city", window.selectedPlace.city);
          setVal("state", window.selectedPlace.state);           // ✅ IMPORTANT (if you have the input)
          setVal("country", window.selectedPlace.country);
          setVal("continent", window.selectedPlace.continent);
          setVal("phone", window.selectedPlace.phone);
          setVal("website", window.selectedPlace.website);

          WCL.toastShared(`✅ Data loaded for ${window.selectedPlace.name}`, "success");
        } catch (err) {
          console.error("❌ place_changed failed:", err);
          WCL.toastShared("Error fetching place details", "error");
        }
      }
    );
  });
};

/* ================================================================
   TYPE SELECTOR + BUTTONS
   ================================================================ */
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".type-btn input").forEach((cb) => {
    cb.addEventListener("change", () => {
      const val = cb.value;
      if (cb.checked && !selectedTypes.includes(val)) selectedTypes.push(val);
      else selectedTypes = selectedTypes.filter((t) => t !== val);
      console.log("🟩 Selected types:", selectedTypes);
    });
  });

  const clearBtn = document.getElementById("clearBtn");
  if (clearBtn) clearBtn.addEventListener("click", resetForm);

  const saveBtn = document.getElementById("saveBtn");
  if (saveBtn) saveBtn.addEventListener("click", saveStore);
});

/* ================================================================
   RESET FORM
   ================================================================ */
function resetForm() {
  document.querySelectorAll("input, textarea").forEach((el) => {
    if (!["checkbox", "radio"].includes(el.type)) el.value = "";
    else el.checked = false;
  });

  const img = document.getElementById("preview-photo");
  const meta = document.getElementById("photo-meta");
  if (img) img.src = WCL.fallbackForType("store");
  if (meta) meta.textContent = "No photo loaded";

  window.selectedPlace = {};
  window.photoRefs = [];
  currentIndex = 0;
  selectedTypes = [];

  const prevBtn = document.getElementById("prev-photo");
  const nextBtn = document.getElementById("next-photo");
  if (prevBtn) prevBtn.onclick = null;
  if (nextBtn) nextBtn.onclick = null;

  WCL.toastShared("Form cleared", "info");
}

/* ================================================================
   SAVE STORE
   ================================================================ */
async function saveStore() {
  const name = document.getElementById("name")?.value.trim() || "";
  const address = document.getElementById("addr")?.value.trim() || "";
  const city = document.getElementById("city")?.value.trim() || "";
  const state = document.getElementById("state")?.value.trim() || ""; // ✅
  const country = document.getElementById("country")?.value.trim() || "";

  const continent =
    (document.getElementById("continent")?.value || "").trim() ||
    WCL.countryToContinent(country, window.selectedPlace.country_iso2);

  const phone = (document.getElementById("phone")?.value || "").trim() || null;
  const website = (document.getElementById("website")?.value || "").trim() || null;
  const commentText = (document.getElementById("comment")?.value || "").trim();

  if (!name || !address || !city || !country) {
    WCL.toastShared("⚠️ Please fill all required fields", "error");
    return;
  }

  const payload = {
    ...window.selectedPlace,

    // Always use current form values (user can edit)
    name,
    address,
    city,
    state: state || window.selectedPlace.state || null, // ✅
    country,
    continent,

    phone,
    website,

    types: selectedTypes.length ? selectedTypes : ["store"],
    access: document.querySelector("input[name='access']:checked")?.value || null,

    photo_reference: window.selectedPlace.photo_reference || null,

    approved: false,
    flagged: false,
    deleted: false,
  };

  try {
    const { data, error } = await WCL.supabase
      .from("stores")
      .insert([payload])
      .select()
      .single();

    if (error) throw error;

    if (commentText) {
      await WCL.supabase.from("store_comments").insert([
        { store_id: data.id, comment: commentText, user_name: "Backoffice" },
      ]);
    }

    WCL.toastShared("✅ Store saved successfully!", "success");
    resetForm();
  } catch (err) {
    console.error("❌ Error saving store:", err);
    WCL.toastShared("Error saving store", "error");
  }
}

// Expose for external buttons (if needed)
window.saveStore = saveStore;
window.resetForm = resetForm;

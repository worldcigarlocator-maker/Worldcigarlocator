/* ================================================================
   js/add-store.js
   Backoffice — Add Store (CANONICAL + SAFE)
   ================================================================ */

console.log("🚀 Add Store Backoffice loaded (canonical)");

/* ================================================================
   GLOBAL STATE
   ================================================================ */
window.selectedPlace = {};
window.photoRefs = [];
let currentIndex = 0;
let selectedTypes = [];

/* ================================================================
   GOOGLE AUTOCOMPLETE
   ================================================================ */
window.initAutocomplete = function initAutocomplete() {
  const input = document.getElementById("gAddress");
  if (!input) {
    console.error("❌ Input #gAddress not found");
    return;
  }

  const autocomplete = new google.maps.places.Autocomplete(input, {
    fields: ["place_id"],
    types: ["establishment"],
  });

  const svc = new google.maps.places.PlacesService(
    document.createElement("div")
  );

  autocomplete.addListener("place_changed", () => {
    const basic = autocomplete.getPlace();
    if (!basic?.place_id) return;

    const placeId = basic.place_id;

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
          if (
            status !== google.maps.places.PlacesServiceStatus.OK ||
            !place
          ) {
            throw new Error("getDetails failed");
          }

         /* ====================================================
   ADDRESS PARSING — STRICT ORDER (CANONICAL)
   ==================================================== */
const comp = place.address_components || [];

const getLong = (type) =>
  comp.find((c) => c.types?.includes(type))?.long_name || "";

const getShort = (type) =>
  comp.find((c) => c.types?.includes(type))?.short_name || "";

/* ----------------------------
   1️⃣ City (priority order)
---------------------------- */
const city =
  getLong("locality") ||
  getLong("postal_town") ||
  getLong("administrative_area_level_2") ||
  "";

/* ----------------------------
   2️⃣ Country (ALWAYS before state)
---------------------------- */
const country = getLong("country") || "";
const country_iso2 = (getShort("country") || "").toLowerCase();

/* ----------------------------
   3️⃣ Raw state / region
---------------------------- */
const rawState =
  getLong("administrative_area_level_1") || "";

/* ----------------------------
   4️⃣ Canonical state
   (UK-aware, global-safe)
---------------------------- */
const state = WCL.normalizeUKState(
  rawState,
  country,
  city
);


          /* ====================================================
             BUILD CANONICAL selectedPlace
             ==================================================== */
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

            photo_reference: null,
          };

          /* ====================================================
             PHOTOS
             ==================================================== */
          const previewImg = document.getElementById("preview-photo");
          const meta = document.getElementById("photo-meta");
          const prevBtn = document.getElementById("prev-photo");
          const nextBtn = document.getElementById("next-photo");

          if (meta) meta.textContent = "Loading photos…";
          if (previewImg)
            previewImg.src = WCL.fallbackForType("store");

          const refs = await WCL.fetchPhotoRefs(placeId);
          window.photoRefs = Array.isArray(refs) ? refs : [];

          if (window.photoRefs.length) {
            currentIndex = 0;
            window.selectedPlace.photo_reference =
              window.photoRefs[0];

            await WCL.loadProxyPhotoInto(
              previewImg,
              window.photoRefs[0],
              "store"
            );

            if (meta)
              meta.textContent = `Photo 1 / ${window.photoRefs.length}`;

            prevBtn.onclick = async () => {
              currentIndex =
                (currentIndex - 1 + window.photoRefs.length) %
                window.photoRefs.length;
              const ref = window.photoRefs[currentIndex];
              window.selectedPlace.photo_reference = ref;
              await WCL.loadProxyPhotoInto(previewImg, ref, "store");
              if (meta)
                meta.textContent = `Photo ${
                  currentIndex + 1
                } / ${window.photoRefs.length}`;
            };

            nextBtn.onclick = async () => {
              currentIndex =
                (currentIndex + 1) % window.photoRefs.length;
              const ref = window.photoRefs[currentIndex];
              window.selectedPlace.photo_reference = ref;
              await WCL.loadProxyPhotoInto(previewImg, ref, "store");
              if (meta)
                meta.textContent = `Photo ${
                  currentIndex + 1
                } / ${window.photoRefs.length}`;
            };
          } else {
            if (meta) meta.textContent = "No photo found";
          }

          /* ====================================================
             AUTOFILL FORM
             ==================================================== */
          const setVal = (id, v) => {
            const el = document.getElementById(id);
            if (el) el.value = v || "";
          };

          setVal("name", window.selectedPlace.name);
          setVal("addr", window.selectedPlace.address);
          setVal("city", window.selectedPlace.city);
          setVal("state", window.selectedPlace.state);
          setVal("country", window.selectedPlace.country);
          setVal("continent", window.selectedPlace.continent);
          setVal("phone", window.selectedPlace.phone);
          setVal("website", window.selectedPlace.website);

          WCL.toastShared(
            `✅ Loaded ${window.selectedPlace.name}`,
            "success"
          );
        } catch (err) {
          console.error("❌ place_changed failed:", err);
          WCL.toastShared("Failed to load place", "error");
        }
      }
    );
  });
};

/* ================================================================
   SAVE STORE — SINGLE SOURCE OF TRUTH
   ================================================================ */
async function saveStore() {
  const name = document.getElementById("name")?.value.trim();
  const address = document.getElementById("addr")?.value.trim();
  const city = document.getElementById("city")?.value.trim();
  const rawState = document.getElementById("state")?.value.trim();
  const country = document.getElementById("country")?.value.trim();

  if (!name || !address || !city || !country) {
    WCL.toastShared("⚠️ Missing required fields", "error");
    return;
  }

  const finalState = WCL.normalizeUKState(
    rawState || window.selectedPlace.state || null,
    country,
    city
  );

  const payload = {
    // 🔒 EXPLICIT ONLY — NO SPREAD
    place_id: window.selectedPlace.place_id || null,
    lat: window.selectedPlace.lat || null,
    lng: window.selectedPlace.lng || null,
    country_iso2: window.selectedPlace.country_iso2 || null,

    name,
    address,
    city,
    state: finalState,
    country,
    continent:
      window.selectedPlace.continent ||
      WCL.countryToContinent(country, window.selectedPlace.country_iso2),

    phone: document.getElementById("phone")?.value || null,
    website: document.getElementById("website")?.value || null,

    // ✅ JSONB-safe
    types: selectedTypes.length ? [...selectedTypes] : ["store"],
    access:
      document.querySelector("input[name='access']:checked")?.value || null,

    approved: false,
    flagged: false,
    deleted: false,
  };

  console.log("📦 INSERT payload", payload);

  try {
    const { data, error } = await WCL.supabase
      .from("stores")
      .insert(payload)
      .select()
      .single();

    if (error) throw error;

    WCL.toastShared("✅ Store saved", "success");
    resetForm();
  } catch (err) {
    console.error("❌ SAVE FAILED", err);
    WCL.toastShared("Save failed", "error");
  }
}


window.saveStore = saveStore;

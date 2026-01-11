/* ================================================================
   js/add-store.js
   Backoffice — Add Store (CANONICAL, SAFE, STABLE)
   ================================================================ */

console.log("🚀 Add Store Backoffice loaded");

/* ================================================================
   GLOBAL STATE — SINGLE SOURCE OF TRUTH
   ================================================================ */
window.selectedPlace = null;
window.photoRefs = [];
let currentPhotoIndex = 0;
let selectedTypes = [];

/* ================================================================
   INIT (DOM READY)
   ================================================================ */
document.addEventListener("DOMContentLoaded", () => {
  bindTypeSelector();
  bindButtons();
});

/* ================================================================
   GOOGLE AUTOCOMPLETE (place_id → getDetails)
   ================================================================ */
window.initAutocomplete = function initAutocomplete() {
  const input = document.getElementById("gAddress");
  if (!input) {
    console.error("❌ #gAddress not found");
    return;
  }

  const autocomplete = new google.maps.places.Autocomplete(input, {
    fields: ["place_id"],
    types: ["establishment"],
  });

  const service = new google.maps.places.PlacesService(
    document.createElement("div")
  );

  autocomplete.addListener("place_changed", () => {
    const basic = autocomplete.getPlace();
    if (!basic?.place_id) return;

    service.getDetails(
      {
        placeId: basic.place_id,
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
      onPlaceDetails
    );
  });
};

/* ================================================================
   PLACE DETAILS HANDLER
   ================================================================ */
async function onPlaceDetails(place, status) {
  try {
    if (
      status !== google.maps.places.PlacesServiceStatus.OK ||
      !place
    ) {
      throw new Error("getDetails failed");
    }

    /* -------------------------------
       ADDRESS PARSING (STRICT ORDER)
       ------------------------------- */
    const comp = place.address_components || [];
    const getLong = (t) =>
      comp.find((c) => c.types?.includes(t))?.long_name || "";
    const getShort = (t) =>
      comp.find((c) => c.types?.includes(t))?.short_name || "";

    const city =
      getLong("locality") ||
      getLong("postal_town") ||
      getLong("administrative_area_level_2") ||
      "";

    const country = getLong("country") || "";
    const country_iso2 = (getShort("country") || "").toLowerCase();

    const rawState =
      getLong("administrative_area_level_1") || "";

    const state = WCL.normalizeUKState(rawState, country, city);

    /* -------------------------------
       BUILD CANONICAL selectedPlace
       ------------------------------- */
    window.selectedPlace = {
      place_id: place.place_id,
      lat: place.geometry?.location?.lat() || null,
      lng: place.geometry?.location?.lng() || null,

      name: place.name || "",
      address: place.formatted_address || "",
      city,
      state,
      country,
      country_iso2,
      continent: WCL.countryToContinent(country, country_iso2),

      phone: place.international_phone_number || "",
      website: place.website || "",

      photo_reference: null,
    };

    console.log("📦 selectedPlace =", window.selectedPlace);

    autofillForm();
    await loadPhotos(place.place_id);

    WCL.toastShared(`✅ Loaded ${place.name}`, "success");
  } catch (err) {
    console.error("❌ Place load failed", err);
    WCL.toastShared("Failed to load place", "error");
  }
}

/* ================================================================
   AUTOFILL FORM
   ================================================================ */
function autofillForm() {
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val || "";
  };

  set("name", window.selectedPlace.name);
  set("addr", window.selectedPlace.address);
  set("city", window.selectedPlace.city);
  set("state", window.selectedPlace.state);
  set("country", window.selectedPlace.country);
  set("continent", window.selectedPlace.continent);
  set("phone", window.selectedPlace.phone);
  set("website", window.selectedPlace.website);
}

/* ================================================================
   PHOTOS
   ================================================================ */
async function loadPhotos(placeId) {
  const img = document.getElementById("preview-photo");
  const meta = document.getElementById("photo-meta");

  if (meta) meta.textContent = "Loading photos…";
  if (img) img.src = WCL.fallbackForType("store");

  const refs = await WCL.fetchPhotoRefs(placeId);
  window.photoRefs = Array.isArray(refs) ? refs : [];
  currentPhotoIndex = 0;

  if (!window.photoRefs.length) {
    if (meta) meta.textContent = "No photo found";
    return;
  }

  window.selectedPlace.photo_reference =
    window.photoRefs[0];

  await WCL.loadProxyPhotoInto(
    img,
    window.photoRefs[0],
    "store"
  );

  if (meta)
    meta.textContent = `Photo 1 / ${window.photoRefs.length}`;

  document.getElementById("prev-photo").onclick =
    () => changePhoto(-1);
  document.getElementById("next-photo").onclick =
    () => changePhoto(1);
}

async function changePhoto(dir) {
  const img = document.getElementById("preview-photo");
  const meta = document.getElementById("photo-meta");

  currentPhotoIndex =
    (currentPhotoIndex + dir + window.photoRefs.length) %
    window.photoRefs.length;

  const ref = window.photoRefs[currentPhotoIndex];
  window.selectedPlace.photo_reference = ref;

  await WCL.loadProxyPhotoInto(img, ref, "store");

  if (meta)
    meta.textContent = `Photo ${
      currentPhotoIndex + 1
    } / ${window.photoRefs.length}`;
}

/* ================================================================
   TYPE SELECTOR
   ================================================================ */
function bindTypeSelector() {
  document.querySelectorAll(".type-btn input").forEach((cb) => {
    cb.addEventListener("change", () => {
      const val = cb.value;

      if (cb.checked) {
        if (!selectedTypes.includes(val))
          selectedTypes.push(val);
        cb.parentElement.classList.add("active");
      } else {
        selectedTypes = selectedTypes.filter(
          (t) => t !== val
        );
        cb.parentElement.classList.remove("active");
      }

      console.log("🟩 selectedTypes =", selectedTypes);
    });
  });
}

/* ================================================================
   SAVE STORE
   ================================================================ */
async function saveStore() {
  if (!window.selectedPlace) {
    WCL.toastShared("Select a place first", "error");
    return;
  }

  const name = document.getElementById("name").value.trim();
  const address = document.getElementById("addr").value.trim();
  const city = document.getElementById("city").value.trim();
  const rawState = document.getElementById("state").value.trim();
  const country = document.getElementById("country").value.trim();

  if (!name || !address || !city || !country) {
    WCL.toastShared("Missing required fields", "error");
    return;
  }

  if (!selectedTypes.length) {
    WCL.toastShared("Select at least one type", "error");
    return;
  }

  const state = WCL.normalizeUKState(
    rawState,
    country,
    city
  );

  const payload = {
    place_id: window.selectedPlace.place_id,
    lat: window.selectedPlace.lat,
    lng: window.selectedPlace.lng,
    country_iso2: window.selectedPlace.country_iso2,

    name,
    address,
    city,
    state,
    country,
    continent:
      document.getElementById("continent").value ||
      window.selectedPlace.continent,

    phone: document.getElementById("phone").value || null,
    website: document.getElementById("website").value || null,

    types: [...selectedTypes],
    access:
      document.querySelector(
        "input[name='access']:checked"
      )?.value || null,

    approved: false,
    flagged: false,
    deleted: false,
  };

  console.log("📦 INSERT payload =", payload);

  try {
    const { error } = await WCL.supabase
      .from("stores")
      .insert([payload]);

    if (error) throw error;

    WCL.toastShared("✅ Store saved", "success");
    resetForm();
  } catch (err) {
    console.error("❌ SAVE FAILED", err);
    WCL.toastShared(err.message || "Save failed", "error");
  }
}

/* ================================================================
   RESET
   ================================================================ */
function resetForm() {
  document.querySelectorAll("input, textarea").forEach((el) => {
    if (!["checkbox", "radio"].includes(el.type))
      el.value = "";
    else el.checked = false;
  });

  document
    .querySelectorAll(".type-btn")
    .forEach((b) => b.classList.remove("active"));

  window.selectedPlace = null;
  window.photoRefs = [];
  selectedTypes = [];
  currentPhotoIndex = 0;

  const img = document.getElementById("preview-photo");
  const meta = document.getElementById("photo-meta");
  if (img) img.src = WCL.fallbackForType("store");
  if (meta) meta.textContent = "No photo loaded";
}

/* ================================================================
   BUTTON BINDINGS
   ================================================================ */
function bindButtons() {
  const saveBtn = document.getElementById("saveBtn");
  const clearBtn = document.getElementById("clearBtn");

  if (saveBtn) saveBtn.addEventListener("click", saveStore);
  if (clearBtn) clearBtn.addEventListener("click", resetForm);
}

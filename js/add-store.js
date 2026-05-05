/* ================================================================
   js/add-store.js
   Backoffice — Add Store (STRICT + HYBRID SAFE)
   ================================================================ */

console.log("🚀 Add Store Backoffice loaded");

/* ================================================================
   GLOBAL STATE
   ================================================================ */
window.selectedPlace = null;
window.photoRefs = [];
let currentPhotoIndex = 0;
let selectedTypes = [];

/* ================================================================
   INIT
   ================================================================ */
document.addEventListener("DOMContentLoaded", () => {
  bindTypeSelector();
  bindButtons();

  // Country → load existing cities
  document
    .getElementById("country")
    ?.addEventListener("change", loadCitiesForCountry);
});

/* ================================================================
   CITY DROPDOWN (Backoffice)
   ================================================================ */
async function loadCitiesForCountry() {

  const country = document.getElementById("country")?.value.trim();
  if (!country) return;

  const listEl = document.getElementById("city-list");
  if (!listEl) return;

  listEl.innerHTML = "";

  try {
    const { data, error } = await WCL.supabase
      .from("stores")
      .select("city")
      .ilike("country", country)
      .not("city", "is", null);

    if (error || !data) return;

    const unique = [...new Set(
      data.map(r => r.city).filter(Boolean)
    )].sort();

    unique.forEach(city => {
      const option = document.createElement("option");
      option.value = city;
      listEl.appendChild(option);
    });

  } catch (err) {
    console.error("City load failed:", err);
  }
}

/* ================================================================
   GOOGLE AUTOCOMPLETE
   ================================================================ */
window.initAutocomplete = function initAutocomplete() {

  const input = document.getElementById("gAddress");
  if (!input) return;

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
   PLACE DETAILS
   ================================================================ */
async function onPlaceDetails(place, status) {

  if (
    status !== google.maps.places.PlacesServiceStatus.OK ||
    !place
  ) {
    return;
  }

  const comp = place.address_components || [];

  const getLong = (t) =>
    comp.find((c) => c.types?.includes(t))?.long_name || "";

  const getShort = (t) =>
    comp.find((c) => c.types?.includes(t))?.short_name || "";

  const country = getLong("country") || "";
  const country_iso2 = (getShort("country") || "").toUpperCase();
  const state = getLong("administrative_area_level_1") || "";

  const city =
    getLong("locality") ||
    getLong("postal_town") ||
    getLong("administrative_area_level_2") ||
    "";

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
    phone: place.international_phone_number || "",
    website: place.website || "",
    photo_reference: null,
  };

  autofillForm();
  await loadPhotos(place.place_id);
}

/* ================================================================
   AUTOFILL
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
  set("phone", window.selectedPlace.phone);
  set("website", window.selectedPlace.website);

  loadCitiesForCountry();
}

/* ================================================================
   PHOTOS
   ================================================================ */
async function loadPhotos(placeId) {

  const img = document.getElementById("preview-photo");
  const meta = document.getElementById("photo-meta");

  img.src = WCL.fallbackForType("store");
  meta.textContent = "Loading photos…";

  const refs = await WCL.fetchPhotoRefs(placeId);
  window.photoRefs = refs || [];
  currentPhotoIndex = 0;

  if (!window.photoRefs.length) {
    meta.textContent = "No photo found";
    return;
  }

  window.selectedPlace.photo_reference = window.photoRefs[0];
  await WCL.loadProxyPhotoInto(img, window.photoRefs[0], "store");

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

  meta.textContent =
    `Photo ${currentPhotoIndex + 1} / ${window.photoRefs.length}`;
}

/* ================================================================
   TYPE SELECTOR
   ================================================================ */
function bindTypeSelector() {

  document.querySelectorAll(".pill input[type='checkbox']")
    .forEach((cb) => {

      cb.addEventListener("change", () => {

        const val = cb.value;

        if (cb.checked) {
          if (!selectedTypes.includes(val))
            selectedTypes.push(val);
        } else {
          selectedTypes =
            selectedTypes.filter((t) => t !== val);
        }

      });
    });
}

/* ================================================================
   SAVE STORE (STRICT MODE)
   ================================================================ */
async function saveStore() {

  const name = document.getElementById("name")?.value.trim();
  const address = document.getElementById("addr")?.value.trim();
  const city = document.getElementById("city")?.value.trim();
  const stateRaw = document.getElementById("state")?.value.trim();
const state = stateRaw || null;

  const country = document.getElementById("country")?.value.trim();
  const phone = document.getElementById("phone")?.value.trim();
  const website = document.getElementById("website")?.value.trim();

  if (!name) return WCL.toastShared("Name is required", "error");
  if (!address) return WCL.toastShared("Address is required", "error");
  if (!city) return WCL.toastShared("City is required", "error");
  if (!country) return WCL.toastShared("Country is required", "error");
  if (!selectedTypes.length)
    return WCL.toastShared("Select at least one type", "error");

  if (window.selectedPlace?.country_iso2 === "US") {

  // Om state är tomt men Google hade en
  if (!state && window.selectedPlace?.state) {
    state = window.selectedPlace.state;
    document.getElementById("state").value = state;
  }

  if (!state) {
    return WCL.toastShared(
      "State is required for USA",
      "error"
    );
  }
}


  const access =
    document.querySelector("input[name='access']:checked")
      ?.value;

  if (!access)
    return WCL.toastShared("Select access type", "error");

  const payload = {
    name,
    address,
    city,
    state,
    country,
    phone,
    website,
    types: [...selectedTypes],
    access,
    approved: false,
    flagged: false,
    deleted: false,
    place_id: window.selectedPlace?.place_id || null,
    country_iso2: window.selectedPlace?.country_iso2 || null,
    lat: window.selectedPlace?.lat || null,
    lng: window.selectedPlace?.lng || null,
    photo_reference:
      window.selectedPlace?.photo_reference || null,
  };

  try {
    const { error } = await WCL.supabase
      .from("stores")
      .insert([payload]);

    if (error) throw error;

    WCL.toastShared("✅ Store saved", "success");
    resetForm();

  } catch (err) {
    console.error(err);
    WCL.toastShared("Save failed", "error");
  }
}

/* ================================================================
   RESET
   ================================================================ */
function resetForm() {

  document.querySelectorAll("input, textarea")
    .forEach((el) => {
      if (!["checkbox", "radio"].includes(el.type))
        el.value = "";
      else el.checked = false;
    });

  document.querySelectorAll(".type-btn")
    .forEach((b) =>
      b.classList.remove("active")
    );

  window.selectedPlace = null;
  window.photoRefs = [];
  selectedTypes = [];
  currentPhotoIndex = 0;

  document.getElementById("preview-photo").src =
    WCL.fallbackForType("store");

  document.getElementById("photo-meta").textContent =
    "No photo loaded";
}

/* ================================================================
   BUTTONS
   ================================================================ */
function bindButtons() {
  document.getElementById("saveBtn")
    ?.addEventListener("click", saveStore);

  document.getElementById("clearBtn")
    ?.addEventListener("click", resetForm);
}

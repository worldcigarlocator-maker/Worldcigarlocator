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
   POSSIBLE MATCH — DB CHECK (soft, non-blocking)
   ================================================================ */
async function checkPossibleMatch(place) {
  if (!place?.address || !place?.city || !place?.country) return [];

  try {
    const street = place.address.split(",")[0];

    const { data, error } = await WCL.supabase
      .from("stores")
      .select("id,name,address,city,country,types,approved")
      .ilike("address", `%${street}%`)
      .ilike("city", place.city)
      .ilike("country", place.country)
      .eq("deleted", false);

    if (error) throw error;
    return data || [];
  } catch (e) {
    console.warn("Possible match check failed:", e);
    return [];
  }
}

/* ================================================================
   GOOGLE AUTOCOMPLETE (place_id → getDetails)
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
   PLACE DETAILS HANDLER (CANONICAL)
   ================================================================ */
async function onPlaceDetails(place, status) {
  try {
    if (
      status !== google.maps.places.PlacesServiceStatus.OK ||
      !place
    ) {
      throw new Error("getDetails failed");
    }

    /* ---------- ADDRESS PARSING ---------- */
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
    const rawState = getLong("administrative_area_level_1") || "";

    const state = WCL.normalizeUKState(rawState, country, city);

    /* ---------- CANONICAL PLACE ---------- */
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

console.log("🔍 checkPossibleMatch() start", {
  address: window.selectedPlace.address,
  city: window.selectedPlace.city,
  country: window.selectedPlace.country
});

const matches = await checkPossibleMatch(window.selectedPlace);

console.log("🔍 possible matches result:", matches);

     
    /* ---------- POSSIBLE MATCH (SOFT) ---------- */
    const matches = await checkPossibleMatch(window.selectedPlace);
    if (matches.length) {
      window.selectedPlace._possibleMatches = matches;
      renderPossibleMatchNotice(matches);
      WCL.toastShared(
        `⚠️ Possible match found (${matches.length})`,
        "info"
      );
    } else {
      clearPossibleMatchNotice();
    }

    autofillForm();
    await loadPhotos(place.place_id);

    WCL.toastShared(`✅ Loaded ${place.name}`, "success");
  } catch (err) {
    console.error("Place load failed:", err);
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
   POSSIBLE MATCH — UI (minimal, no CSS collision)
   ================================================================ */
function renderPossibleMatchNotice(matches) {
  let box = document.getElementById("possible-match-box");

  if (!box) {
    box = document.createElement("div");
    box.id = "possible-match-box";
    box.style.margin = "0.75rem 0";
    box.style.padding = "0.4rem 0";
    box.style.fontSize = "0.75rem";
    box.style.color = "#a07900";

    const form =
      document.getElementById("add-store-form") ||
      document.querySelector("form");

    if (form) form.prepend(box);
  }

  box.innerHTML = `
    ⚠️ Possible existing store(s):
    ${matches
      .map(
        (m) => `<div>#${m.id} — ${m.name}</div>`
      )
      .join("")}
  `;
}

function clearPossibleMatchNotice() {
  document.getElementById("possible-match-box")?.remove();
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

  window.selectedPlace.photo_reference = window.photoRefs[0];
  await WCL.loadProxyPhotoInto(img, window.photoRefs[0], "store");

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
        if (!selectedTypes.includes(val)) selectedTypes.push(val);
        cb.parentElement.classList.add("active");
      } else {
        selectedTypes = selectedTypes.filter((t) => t !== val);
        cb.parentElement.classList.remove("active");
      }
    });
  });
}

/* ================================================================
   SAVE STORE (SOFT DUPLICATE GUARD)
   ================================================================ */
async function saveStore() {
  if (!window.selectedPlace) {
    WCL.toastShared("Select a place first", "error");
    return;
  }

  if (window.selectedPlace._possibleMatches?.length) {
    const ok = confirm(
      "Possible duplicate detected.\n\n" +
      "If this is the SAME place, do NOT create a new one.\n\n" +
      "Press OK to continue anyway."
    );
    if (!ok) return;
  }

  if (!selectedTypes.length) {
    WCL.toastShared("Select at least one type", "error");
    return;
  }

  const payload = {
    place_id: window.selectedPlace.place_id,
    lat: window.selectedPlace.lat,
    lng: window.selectedPlace.lng,
    country_iso2: window.selectedPlace.country_iso2,

    name: document.getElementById("name").value.trim(),
    address: document.getElementById("addr").value.trim(),
    city: document.getElementById("city").value.trim(),
    state: document.getElementById("state").value.trim(),
    country: document.getElementById("country").value.trim(),
    continent:
      document.getElementById("continent").value ||
      window.selectedPlace.continent,

    phone: document.getElementById("phone").value || null,
    website: document.getElementById("website").value || null,

    types: [...selectedTypes],
    access:
      document.querySelector("input[name='access']:checked")?.value ||
      null,

    approved: false,
    flagged: false,
    deleted: false,
  };

  try {
    const { error } = await WCL.supabase
      .from("stores")
      .insert([payload]);

    if (error) throw error;

    WCL.toastShared("✅ Store saved", "success");
    resetForm();
  } catch (err) {
    console.error("Save failed:", err);
    WCL.toastShared("Save failed", "error");
  }
}

/* ================================================================
   RESET
   ================================================================ */
function resetForm() {
  document.querySelectorAll("input, textarea").forEach((el) => {
    if (!["checkbox", "radio"].includes(el.type)) el.value = "";
    else el.checked = false;
  });

  document
    .querySelectorAll(".type-btn")
    .forEach((b) => b.classList.remove("active"));

  window.selectedPlace = null;
  window.photoRefs = [];
  selectedTypes = [];
  currentPhotoIndex = 0;

  clearPossibleMatchNotice();

  const img = document.getElementById("preview-photo");
  const meta = document.getElementById("photo-meta");
  if (img) img.src = WCL.fallbackForType("store");
  if (meta) meta.textContent = "No photo loaded";
}

/* ================================================================
   BUTTONS
   ================================================================ */
function bindButtons() {
  document.getElementById("saveBtn")?.addEventListener("click", saveStore);
  document.getElementById("clearBtn")?.addEventListener("click", resetForm);
}

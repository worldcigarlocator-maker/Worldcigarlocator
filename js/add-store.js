/* ================================================================
   js/add-store.js
   Backoffice — Add Store (CANONICAL, SAFE, STABLE)
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
});

/* ================================================================
   GOOGLE AUTOCOMPLETE (GLOBAL)
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
   PLACE DETAILS (CANONICAL FLOW)
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

const country = getLong("country") || "";
const country_iso2 = (getShort("country") || "").toUpperCase();
const rawState = getLong("administrative_area_level_1") || "";

/* ---------- CITY RESOLUTION ---------- */

// Asia ISO2 set (general fallback kept)
const ASIA_ISO2 = new Set([
  "AF","AM","AZ","BH","BD","BT","BN","KH","CN","GE","HK","ID","IN","IQ","IR","IL","JO","JP","KG","KP","KR",
  "KW","KZ","LA","LB","LK","MM","MN","MO","MV","MY","NP","OM","PH","PK","PS","QA","SA","SG","SY","TH","TJ",
  "TL","TM","TR","TW","AE","UZ","VN","YE"
]);
const isAsia = ASIA_ISO2.has(country_iso2);

// Base city priority (global)
let city =
  getLong("locality") ||
  getLong("postal_town") ||
  getLong("administrative_area_level_2") ||
  "";

// Asia general fallback (KEPT)
// Used for megacities where admin_area_level_1 represents the city
if (!city && isAsia && rawState) {
  city = rawState;
}

/* ---------- CHINA OVERRIDE (ADD-ONLY, HIGHER PRIORITY) ---------- */
if (country_iso2 === "CN") {
  const strip = (s) =>
    (s || "")
      .replace(/\bShi\b$/i, "")
      .replace(/\bSheng\b$/i, "")
      .replace(/\s+/g, " ")
      .trim();

  // Re-evaluate city with China-specific priority
  let cnCity =
    getLong("locality") ||
    getLong("administrative_area_level_2") ||
    "";

  // Allow admin_area_level_1 ONLY if it ends with 'Shi'
  if (!cnCity && /\bShi\b$/i.test(rawState)) {
    cnCity = rawState;
  }

  cnCity = strip(cnCity);

  // Canonical China mappings
  const CN_MAP = {
    "Bei Jing": "Beijing",
    "Shang Hai": "Shanghai",
    "Hai Kou": "Haikou",
    "San Ya": "Sanya",
  };

  if (CN_MAP[cnCity]) cnCity = CN_MAP[cnCity];

  if (cnCity) {
    city = cnCity; // China override wins
  }
}

/* ---------- STATE NORMALIZATION ---------- */
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

  phone: place.international_phone_number || "",
  website: place.website || "",

  photo_reference: null,
};

    /* ============================================================
       DUPLICATE CHECK (SHARED, CANONICAL)
       ============================================================ */
    const { exact, possible } =
      await WCL.checkDuplicates(window.selectedPlace);

    if (exact.length > 0) {
      window.selectedPlace._exactMatches = exact;
      renderPossibleMatchNotice(exact);
      WCL.toastShared(
        `⛔ Exact duplicate found (${exact.length})`,
        "error"
      );
    } else if (possible.length > 0) {
      window.selectedPlace._possibleMatches = possible;
      renderPossibleMatchNotice(possible);
      WCL.toastShared(
        `⚠️ Possible match found (${possible.length})`,
        "info"
      );
    } else {
      clearPossibleMatchNotice();
    }

    /* ---------- CONTINUE NORMAL FLOW ---------- */
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
   DUPLICATE NOTICE UI (MINIMAL, SAFE)
   ================================================================ */
function renderPossibleMatchNotice(list) {
  let box = document.getElementById("possible-match-box");

  if (!box) {
    box = document.createElement("div");
    box.id = "possible-match-box";
    box.style.margin = "0.75rem 0";
    box.style.fontSize = "0.75rem";
    box.style.color = "#a07900";

    const form =
      document.getElementById("add-store-form") ||
      document.querySelector("form");

    if (form) form.prepend(box);
  }

  box.innerHTML =
    "⚠️ Possible existing store(s):" +
    list.map((s) => `<div>#${s.id} — ${s.name}</div>`).join("");
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
    meta.textContent =
      `Photo ${currentPhotoIndex + 1} / ${window.photoRefs.length}`;
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
   SAVE STORE (STRICT MODE v1 — USA state required)
   ================================================================ */
async function saveStore() {

  if (!window.selectedPlace) {
    window.selectedPlace = {};
  }

  // 🔒 Always read latest manual values from form
  const name     = document.getElementById("name")?.value.trim();
  const address  = document.getElementById("addr")?.value.trim();
  const city     = document.getElementById("city")?.value.trim();
  const state    = document.getElementById("state")?.value.trim();
  const country  = document.getElementById("country")?.value.trim();
  const continent= document.getElementById("continent")?.value || null;
  const phone    = document.getElementById("phone")?.value.trim();
  const website  = document.getElementById("website")?.value.trim();

  // 🔒 Strict required fields
  if (!name) {
    WCL.toastShared("Name is required", "error");
    return;
  }

  if (!address) {
    WCL.toastShared("Address is required", "error");
    return;
  }

  if (!city) {
    WCL.toastShared("City is required", "error");
    return;
  }

  if (!country) {
    WCL.toastShared("Country is required", "error");
    return;
  }

  if (!selectedTypes.length) {
    WCL.toastShared("Select at least one type", "error");
    return;
  }

  // 🔒 Write back to selectedPlace (hybrid mode)
  window.selectedPlace = {
    ...window.selectedPlace,
    name,
    address,
    city,
    state,
    country,
    continent,
    phone,
    website
  };


   /* ================================================================
   CITY AUTOSUGGEST (Backoffice)
   ================================================================ */

async function loadCitiesForCountry(country) {
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

    const unique = [...new Set(data.map(r => r.city).filter(Boolean))].sort();

    unique.forEach(city => {
      const option = document.createElement("option");
      option.value = city;
      listEl.appendChild(option);
    });

  } catch (err) {
    console.error("City load failed:", err);
  }
}

/* Trigger when country changes */
document.getElementById("country")?.addEventListener("blur", (e) => {
  loadCitiesForCountry(e.target.value.trim());
});

}

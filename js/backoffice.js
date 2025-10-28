/* Backoffice Add Store — Clean Final Version (2025-10-28)
   Includes 403 fix, Google photo fallback, and full stability
*/

const SUPABASE_URL = "https://gbxxoeplkzbhsvagnfsr.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let FLAG_TARGET_ID = null;

const sel = {
  types: [],
  access: null,
  rating: null,
  lat: null,
  lng: null,
  place_id: null,
  photos: [],
  photo_index: 0,
  state: null,
  photo_reference: null,
  photo_url: null
};

/* 🌍 Simplified Continent Mapper */
function getContinentFromCountry(country) {
  if (!country) return "Other";
  const c = country.trim().toLowerCase();
  const m = {
    sweden: "Europe",
    norway: "Europe",
    denmark: "Europe",
    finland: "Europe",
    iceland: "Europe",
    usa: "North America",
    "united states": "North America",
    canada: "North America",
    france: "Europe",
    germany: "Europe",
    italy: "Europe",
    spain: "Europe",
    brazil: "South America",
    argentina: "South America",
    australia: "Oceania",
    japan: "Asia",
    china: "Asia",
    india: "Asia",
    "south africa": "Africa"
  };
  return m[c] || "Other";
}

/* ---------- UI Binding ---------- */

document.querySelectorAll("#typeRow .chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    chip.classList.toggle("active");
    sel.types = Array.from(
      document.querySelectorAll("#typeRow .chip.active")
    ).map((c) => c.dataset.type);
    document.getElementById("accessBox").style.display = sel.types.includes("lounge")
      ? "block"
      : "none";
  });
});

document.querySelectorAll("input[name='access']").forEach((r) => {
  r.addEventListener("change", () => (sel.access = r.value));
});

document.addEventListener("DOMContentLoaded", () => {
  const stars = document.getElementById("stars");
  if (stars) {
    stars.addEventListener("click", (e) => {
      const v = +e.target.dataset.v;
      if (!v) return;
      sel.rating = v;
      [...stars.children].forEach((el, i) => el.classList.toggle("sel", i < v));
    });
  }

  document.querySelectorAll("#typeRow .chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      chip.classList.toggle("active");
      sel.types = Array.from(
        document.querySelectorAll("#typeRow .chip.active")
      ).map((c) => c.dataset.type);
      document.getElementById("accessBox").style.display = sel.types.includes("lounge")
        ? "block"
        : "none";
    });
  });

  document.querySelectorAll("input[name='access']").forEach((r) => {
    r.addEventListener("change", () => (sel.access = r.value));
  });

  document.getElementById("prev-photo").onclick = () => {
    if (sel.photos.length) {
      sel.photo_index = (sel.photo_index - 1 + sel.photos.length) % sel.photos.length;
      updatePhoto();
    }
  };

  document.getElementById("next-photo").onclick = () => {
    if (sel.photos.length) {
      sel.photo_index = (sel.photo_index + 1) % sel.photos.length;
      updatePhoto();
    }
  };
});


/* ---------- Toast ---------- */

function showToast(msg, type = "info") {
  const c = document.getElementById("toast-container");
  const t = document.createElement("div");
  t.className = `toast ${type}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

/* ---------- Reset Form ---------- */

function resetForm() {
  [
    "gAddress",
    "name",
    "addr",
    "city",
    "state",
    "country",
    "phone",
    "website"
  ].forEach((id) => (document.getElementById(id).value = ""));
  document.querySelectorAll("#typeRow .chip").forEach((c) =>
    c.classList.remove("active")
  );
  document.getElementById("forceDefault").checked = false;
  sel.types = [];
  sel.access = null;
  sel.rating = null;
  sel.lat = null;
  sel.lng = null;
  sel.place_id = null;
  sel.photos = [];
  sel.photo_index = 0;
  sel.state = null;
  sel.photo_reference = null;
  sel.photo_url = null;
  document.getElementById("accessBox").style.display = "none";
  [...stars.children].forEach((el) => el.classList.remove("sel"));
  updatePhoto();
  showToast("Form cleared", "success");
}

/* ---------- Photo Logic ---------- */

function updatePhoto() {
  const img = document.getElementById("preview-photo");
  const meta = document.getElementById("photo-meta");
  const force = document.getElementById("forceDefault").checked;

  if (force || !sel.photos.length) {
    img.src = sel.types.includes("lounge")
      ? "images/lounge.jpg"
      : "images/store.jpg";
    meta.textContent = "Default image in use.";
    sel.photo_reference = null;
    sel.photo_url = null;
    return;
  }

  const p = sel.photos[(sel.photo_index + sel.photos.length) % sel.photos.length];
  const url = p.getUrl({ maxWidth: 800 });
  sel.photo_reference = p.photo_reference;
  sel.photo_url = url;
  img.src = url;
  meta.textContent = `Photo ${sel.photo_index + 1}/${sel.photos.length}`;
}

document.getElementById("prev-photo").onclick = () => {
  if (sel.photos.length) {
    sel.photo_index = (sel.photo_index - 1 + sel.photos.length) % sel.photos.length;
    updatePhoto();
  }
};

document.getElementById("next-photo").onclick = () => {
  if (sel.photos.length) {
    sel.photo_index = (sel.photo_index + 1) % sel.photos.length;
    updatePhoto();
  }
};

/* ---------- Save Store ---------- */

async function saveStore() {
  const name = document.getElementById("name").value.trim();
  const address = document.getElementById("addr").value.trim();
  const city = document.getElementById("city").value.trim();
  const state =
    document.getElementById("state").value.trim() || sel.state || null;
  const country = document.getElementById("country").value.trim();
  const continent = getContinentFromCountry(country);
  const phone = document.getElementById("phone").value.trim();
  const website = document.getElementById("website").value.trim();
  const access = sel.types.includes("lounge")
    ? document.querySelector("input[name='access']:checked")?.value || null
    : null;

  if (!name || !address || !city || !country) {
    showToast("⚠️ Please fill in all required fields", "error");
    return;
  }

  // Duplicate check
  const { data: existing, error: checkError } = await supabase
    .from("stores")
    .select("id")
    .eq("name", name)
    .eq("city", city)
    .eq("country", country)
    .eq("deleted", false)
    .limit(1);

  if (checkError) {
    console.error("Check error:", checkError);
    showToast("⚠️ Could not verify duplicates", "error");
    return;
  }

  if (existing && existing.length) {
    showToast("⚠️ This store already exists!", "error");
    return;
  }

  const force = document.getElementById("forceDefault").checked;

  const payload = {
    name,
    address,
    city,
    state,
    country,
    continent,
    phone,
    website,
    type: sel.types[0] || null,
    types: sel.types.length ? sel.types : null,
    access,
    rating: sel.rating ?? null,
    approved: false,
    status: "pending",
    lat: sel.lat,
    lng: sel.lng,
    place_id: sel.place_id,
    photo_reference: force ? null : sel.photo_reference || null,
    photo_url: null, // no temporary Google photo URLs
    deleted: false
  };

  const { error } = await supabase.from("stores").insert([payload]);
  if (error) {
    console.error(error);
    showToast("❌ Error saving store", "error");
    return;
  }

  showToast("✅ Store saved successfully", "success");
  resetForm();
}

/* ---------- Autocomplete ---------- */

function initAutocomplete() {
  const input = document.getElementById("gAddress");
  const ac = new google.maps.places.Autocomplete(input, {
    fields: [
      "place_id",
      "address_components",
      "geometry",
      "name",
      "formatted_address",
      "international_phone_number",
      "website",
      "photos"
    ]
  });
  ac.addListener("place_changed", () => {
    const place = ac.getPlace();
    if (!place) return;

    document.getElementById("name").value = place.name || "";
    document.getElementById("addr").value = place.formatted_address || "";

    const comps = place.address_components || [];
    const city = comps.find(
      (c) =>
        c.types.includes("locality") ||
        c.types.includes("postal_town") ||
        c.types.includes("administrative_area_level_2")
    );
    const state = comps.find((c) =>
      c.types.includes("administrative_area_level_1")
    );
    const country = comps.find((c) => c.types.includes("country"));

    document.getElementById("city").value = city?.long_name || "";
    document.getElementById("state").value = state?.long_name || "";
    document.getElementById("country").value = country?.long_name || "";

    sel.state = state?.long_name || null;
    document.getElementById("phone").value =
      place.international_phone_number || "";
    document.getElementById("website").value = place.website || "";
    sel.lat = place.geometry?.location?.lat() || null;
    sel.lng = place.geometry?.location?.lng() || null;
    sel.place_id = place.place_id || null;
    sel.photos = place.photos || [];
    sel.photo_index = 0;
    updatePhoto();
  });
}

/* ---------- Map Loader Callback ---------- */
function _mapsReady() {
  if (!window.google || !google.maps || !google.maps.places) {
    console.warn("Google Maps not ready");
    return;
  }
  console.log("✅ Google Maps API Ready");
}

window.initAutocomplete = initAutocomplete;

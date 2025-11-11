/* ==========================================================
   add-store.js — Backoffice Add Store page logic
   Version: Stable 2025-11-11
   Depends on: add-shared.js (Supabase, WCL, photo helpers)
   ========================================================== */

console.log("🚀 Add Store Backoffice loaded");

// ----------------- GLOBAL STATE -----------------
const sel = {
  types: [],
  access: null,
  place_id: null,
  country_iso2: null,
  _photo_refs: [],
  photo_index: 0,
  photo_reference: null,
};

// ----------------- FORM HELPERS -----------------
function resetForm() {
  document.querySelectorAll("input, textarea").forEach(i => {
    if (i.type !== "radio" && i.type !== "checkbox") i.value = "";
  });
  document.querySelectorAll("input[type=checkbox], input[type=radio]").forEach(i => {
    i.checked = false;
  });
  document.querySelectorAll(".type-btn").forEach(b => b.classList.remove("active"));

  sel.types = [];
  sel.access = null;
  sel.place_id = null;
  sel.country_iso2 = null;
  sel._photo_refs = [];
  sel.photo_index = 0;
  sel.photo_reference = null;

  document.getElementById("preview-photo").src = WCL.GITHUB_STORE_FALLBACK;
  document.getElementById("photo-meta").textContent = "No photo loaded";
  WCL.toastShared("Form cleared", "success");
}

async function saveStore() {
  const name = nameEl.value.trim();
  const address = addrEl.value.trim();
  const city = cityEl.value.trim();
  const country = countryEl.value.trim();
  const continent = continentEl.value || WCL.countryToContinent(country);
  const phone = phoneEl.value.trim() || null;
  const website = websiteEl.value.trim() || null;
  const commentText = document.getElementById("comment").value.trim();

  if (!name || !address || !city || !country) {
    return WCL.toastShared("Please fill all required fields", "error");
  }

  const types = sel.types.length ? sel.types : ["store"];

  const payload = {
    name,
    address,
    city,
    country,
    continent,
    phone,
    website,
    types,              // JSON-array
    type: types[0],     // För snabbfiltrering i listor
    access: sel.access,
    place_id: sel.place_id,
    country_iso2: sel.country_iso2,
    photo_reference: sel.photo_reference || null,
    approved: false,
    flagged: false,
    deleted: false,
    status: "pending",
  };

  console.log("📦 Saving payload →", payload);

  const { data, error } = await WCL.supabase
    .from("stores")
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error("❌ Supabase insert error:", error);
    return WCL.toastShared("Error saving store", "error");
  }

  if (commentText) {
    await WCL.supabase.from("store_comments").insert([
      {
        store_id: data.id,
        comment: commentText,
        user_name: "Backoffice",
      },
    ]);
  }

  WCL.toastShared("✅ Store added successfully!", "success");
  resetForm();
}

// ----------------- GOOGLE AUTOCOMPLETE -----------------
function initAutocomplete() {
  const input = document.getElementById("gAddress");
  const ac = new google.maps.places.Autocomplete(input, {
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

  try {
    // 🧠 Grunddata
    window.selectedPlace = {
      name: place.name || "",
      address: place.formatted_address || "",
      place_id: place.place_id,
      lat: place.geometry?.location?.lat() || null,
      lng: place.geometry?.location?.lng() || null,
    };

    // 📍 Stad och land
    const comp = place.address_components || [];
    const cityObj =
      comp.find((c) => c.types.includes("locality")) ||
      comp.find((c) => c.types.includes("postal_town"));
    const countryObj = comp.find((c) => c.types.includes("country"));
    window.selectedPlace.city = cityObj?.long_name || "";
    window.selectedPlace.country_iso2 = countryObj?.short_name?.toLowerCase() || "";
    window.selectedPlace.country = countryObj?.long_name || "";

    // 🌍 Kontinent
    window.selectedPlace.continent = WCL.countryToContinent(
      window.selectedPlace.country,
      window.selectedPlace.country_iso2
    );

    // ☎️ Website + phone från PlaceDetails
    window.selectedPlace.phone = place.international_phone_number || "";
    window.selectedPlace.website = place.website || "";

    // 🖼️ Foto via proxy
    const refs = await WCL.fetchPhotoRefs(place.place_id);
    if (refs.length) {
      window.selectedPlace.photo_reference = refs[0];
      const url = WCL.buildProxyUrl(refs[0]);
      preview.innerHTML = `<img src="${url}" alt="Preview">`;
    } else {
      const fallback = WCL.fallbackForType("store");
      preview.innerHTML = `<img src="${fallback}" alt="Preview">`;
    }

    // 🧾 Autofyll fälten
    document.querySelector("#phone").value = window.selectedPlace.phone;
    document.querySelector("#website").value = window.selectedPlace.website;

    WCL.toastShared(`✅ Data loaded for ${place.name}`, "success");
  } catch (err) {
    console.error("❌ place_changed failed:", err);
    WCL.toastShared("Error fetching place details", "error");
  }
});

/* ================================================================
   js/add-store.js
   Backoffice — Add Store
   ================================================================ */

console.log("🚀 Add Store Backoffice loaded");

/* 🌍 Globals */
window.selectedPlace = {};
window.photoRefs = [];
let currentIndex = 0;
let selectedTypes = [];

/* ================================================================
   GOOGLE AUTOCOMPLETE
   ================================================================ */
window.initAutocomplete = async function initAutocomplete() {
  console.log("✅ initAutocomplete ready");

  const input = document.getElementById("gAddress");
  if (!input) {
    console.error("❌ Input #gAddress not found");
    return;
  }

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
    if (!place || !place.place_id) {
      console.warn("⚠️ Invalid place");
      return;
    }

    try {
      console.log("📍 Place selected:", place);

      // 🧩 Grunddata
      window.selectedPlace = {
        name: place.name || "",
        address: place.formatted_address || "",
        place_id: place.place_id,
        lat: place.geometry?.location?.lat() || null,
        lng: place.geometry?.location?.lng() || null,
      };

      // 📍 Stad & Land
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

      // ☎️ Kontaktinfo
      window.selectedPlace.phone = place.international_phone_number || "";
      window.selectedPlace.website = place.website || "";

      // 🖼️ Foto via proxy
const refs = await WCL.fetchPhotoRefs(place.place_id);
window.photoRefs = refs;

const previewImg = document.getElementById("preview-photo");
const meta = document.getElementById("photo-meta");

if (refs.length) {
  currentIndex = 0;
  window.selectedPlace.photo_reference = refs[0];
  const url = WCL.buildProxyUrl(refs[0]);
  if (previewImg) previewImg.src = url;
  if (meta) meta.textContent = `${refs.length} photo(s) found`;

  // 🧭 aktivera navigation
  const prevBtn = document.getElementById("prev-photo");
  const nextBtn = document.getElementById("next-photo");
  if (prevBtn && nextBtn) {
    prevBtn.onclick = () => {
      currentIndex = (currentIndex - 1 + refs.length) % refs.length;
      const newUrl = WCL.buildProxyUrl(refs[currentIndex]);
      previewImg.src = newUrl;
      meta.textContent = `Photo ${currentIndex + 1} / ${refs.length}`;
    };
    nextBtn.onclick = () => {
      currentIndex = (currentIndex + 1) % refs.length;
      const newUrl = WCL.buildProxyUrl(refs[currentIndex]);
      previewImg.src = newUrl;
      meta.textContent = `Photo ${currentIndex + 1} / ${refs.length}`;
    };
  }
} else {
  if (previewImg) previewImg.src = WCL.fallbackForType("store");
  if (meta) meta.textContent = "No photo found";
}

// 🧾 Autofyll alla fält
document.getElementById("name").value = place.name || "";
document.getElementById("addr").value = place.formatted_address || "";
document.getElementById("city").value = window.selectedPlace.city || "";
document.getElementById("country").value = window.selectedPlace.country || "";
document.getElementById("continent").value = window.selectedPlace.continent || "";
document.getElementById("phone").value = window.selectedPlace.phone || "";
document.getElementById("website").value = window.selectedPlace.website || "";

WCL.toastShared(`✅ Data loaded for ${place.name}`, "success");


/* ================================================================
   TYPE SELECTOR
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
});

/* ================================================================
   SAVE STORE
   ================================================================ */
async function saveStore() {
  const name = document.getElementById("name").value.trim();
  const address = document.getElementById("addr").value.trim();
  const city = document.getElementById("city").value.trim();
  const country = document.getElementById("country").value.trim();
  const continent =
    document.getElementById("continent").value ||
    WCL.countryToContinent(country);
  const phone = document.getElementById("phone").value.trim() || null;
  const website = document.getElementById("website").value.trim() || null;
  const commentText = document.getElementById("comment").value.trim();

  if (!name || !address || !city || !country) {
    WCL.toastShared("⚠️ Please fill all required fields", "error");
    return;
  }

  const payload = {
    ...window.selectedPlace,
    name,
    address,
    city,
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
    const { data, error } = await WCL.supabase.from("stores").insert([payload]).select().single();
    if (error) throw error;

    if (commentText) {
      await WCL.supabase.from("store_comments").insert([
        { store_id: data.id, comment: commentText, user_name: "Backoffice" },
      ]);
    }

    WCL.toastShared("✅ Store saved successfully!", "success");
  } catch (err) {
    console.error("❌ Error saving store:", err);
    WCL.toastShared("Error saving store", "error");
  }
}

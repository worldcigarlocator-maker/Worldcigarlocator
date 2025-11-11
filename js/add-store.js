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

  ac.addListener("place_changed", async () => {
    try {
      const p = ac.getPlace();
      if (!p) return;

      // Fyll i grunddata
      nameEl.value = p.name || "";
      addrEl.value = p.formatted_address || "";
      phoneEl.value = p.international_phone_number || "";
      websiteEl.value = p.website || "";

      const comps = p.address_components || [];
      const city = comps.find(c => c.types.includes("locality") || c.types.includes("postal_town"));
      const country = comps.find(c => c.types.includes("country"));

      cityEl.value = city?.long_name || "";
      countryEl.value = country?.long_name || "";

      sel.country_iso2 = country?.short_name?.toLowerCase() || null;
      continentEl.value = WCL.countryToContinent(country?.long_name) || "";

      sel.place_id = p.place_id || null;

      // 📸 Foto-hantering
      const refs = await WCL.fetchPhotoRefs(sel.place_id);
      sel._photo_refs = refs;
      sel.photo_index = 0;

      const imgEl = document.getElementById("preview-photo");
      const metaEl = document.getElementById("photo-meta");

      function showCurrentPhoto() {
        if (!sel._photo_refs.length) {
          imgEl.src = WCL.GITHUB_STORE_FALLBACK;
          metaEl.textContent = "No photo found";
          sel.photo_reference = null;
          return;
        }
        const ref = sel._photo_refs[sel.photo_index];
        sel.photo_reference = ref;
        WCL.loadProxyPhotoInto(imgEl, ref);
        metaEl.textContent = `Photo ${sel.photo_index + 1} / ${sel._photo_refs.length}`;
      }

      document.getElementById("prev-photo").onclick = () => {
        if (!sel._photo_refs.length) return;
        sel.photo_index = (sel.photo_index - 1 + sel._photo_refs.length) % sel._photo_refs.length;
        showCurrentPhoto();
      };
      document.getElementById("next-photo").onclick = () => {
        if (!sel._photo_refs.length) return;
        sel.photo_index = (sel.photo_index + 1) % sel._photo_refs.length;
        showCurrentPhoto();
      };

      showCurrentPhoto();

      WCL.toastShared(
        refs.length
          ? `✅ ${refs.length} photos found`
          : "No photos found (using fallback)",
        refs.length ? "success" : "error"
      );
    } catch (err) {
      console.error("❌ place_changed failed:", err);
      WCL.toastShared("Error fetching place details", "error");
    }
  });
}

// Gör initAutocomplete global för Google callback
window.initAutocomplete = initAutocomplete;

// ----------------- DOM READY -----------------
window.addEventListener("DOMContentLoaded", () => {
  // Snabb access till inputs
  window.nameEl = document.getElementById("name");
  window.addrEl = document.getElementById("addr");
  window.cityEl = document.getElementById("city");
  window.countryEl = document.getElementById("country");
  window.continentEl = document.getElementById("continent");
  window.phoneEl = document.getElementById("phone");
  window.websiteEl = document.getElementById("website");

  // TYPE
  document.querySelectorAll(".type-btn input").forEach(cb => {
    cb.addEventListener("change", () => {
      const val = cb.value;
      const parent = cb.closest(".type-btn");
      if (cb.checked) {
        if (!sel.types.includes(val)) sel.types.push(val);
        parent.classList.add("active");
      } else {
        sel.types = sel.types.filter(t => t !== val);
        parent.classList.remove("active");
      }
      console.log("🟩 Selected types:", sel.types);
    });
  });

  // ACCESS
  document.querySelectorAll(".access-pill input").forEach(radio => {
    radio.addEventListener("change", () => {
      sel.access = radio.value;
    });
  });

  // BUTTONS
  document.getElementById("clearBtn").onclick = resetForm;
  document.getElementById("saveBtn").onclick = saveStore;
});

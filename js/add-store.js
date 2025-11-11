console.log("🚀 Add Store Backoffice loaded");

window.selectedPlace = {};
window.photoRefs = [];
let currentIndex = 0;
let selectedTypes = [];

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("addStoreForm");
  const submitBtn = document.getElementById("saveBtn");
  const preview = document.getElementById("preview");

  // ✅ Export global initAutocomplete for Google callback
  window.initAutocomplete = async function initAutocomplete() {
    const input = document.getElementById("gAddress");
    const autocomplete = new google.maps.places.Autocomplete(input, {
      fields: ["place_id","geometry","formatted_address","name","photos","address_components","international_phone_number","website"],
      types: ["establishment"], language: "en"
    });

  autocomplete.addListener("place_changed", async () => {
  try {
    const place = autocomplete.getPlace();
    if (!place.place_id) return;

    console.log("📍 Full place object:", place);

    // 🖼️ Foto (hämtar och aktiverar navigation)
    const refs = await WCL.fetchPhotoRefs(place.place_id);
    window.photoRefs = refs;
    currentIndex = 0;

    function showCurrentPhoto() {
      const preview = document.getElementById("preview");
      if (!preview) {
        console.warn("⚠️ Missing #preview element in HTML");
        return;
      }

      if (!window.photoRefs.length) {
        const fallback = WCL.fallbackForType("store");
        preview.innerHTML = `<img src="${fallback}" alt="Preview">`;
        return;
      }

      const ref = window.photoRefs[currentIndex];
      window.selectedPlace.photo_reference = ref;
      const url = WCL.buildProxyUrl(ref, 800);

      preview.innerHTML = `
        <div class="photo-picker">
          <button id="add-prev" class="photo-nav">◀</button>
          <img id="add-photo" class="preview-photo" src="${url}" alt="Preview">
          <button id="add-next" class="photo-nav">▶</button>
        </div>
        <div class="muted center">Photo ${currentIndex + 1} / ${window.photoRefs.length}</div>
      `;

      document.getElementById("add-prev").onclick = () => {
        if (!window.photoRefs.length) return;
        currentIndex = (currentIndex - 1 + window.photoRefs.length) % window.photoRefs.length;
        showCurrentPhoto();
      };

      document.getElementById("add-next").onclick = () => {
        if (!window.photoRefs.length) return;
        currentIndex = (currentIndex + 1) % window.photoRefs.length;
        showCurrentPhoto();
      };
    }

    showCurrentPhoto();
    WCL.toastShared(`✅ ${refs.length} photos found!`, "success");

  } catch (err) {
    console.error("❌ place_changed failed:", err);
  }
}); // <-- end autocomplete.addListener

}); // <-- end DOMContentLoaded

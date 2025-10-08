// ===== Supabase Init =====
const supabaseUrl = "https://gbxxoeplkzbhsvagnfsr.supabase.co"; 
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4"; 
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);


let selectedRating = 0;
let lastLat = null;
let lastLng = null;

// Toast helper
function showToast(msg, type="success") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  document.getElementById("toast-container").appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// Star rating setup
const stars = document.getElementById("star-rating").textContent.trim().split("");
document.getElementById("star-rating").innerHTML = stars.map((s,i) => `<span data-val="${i+1}">★</span>`).join("");
document.querySelectorAll("#star-rating span").forEach(star => {
  star.addEventListener("click", e => {
    selectedRating = e.target.dataset.val;
    document.querySelectorAll("#star-rating span").forEach((s,idx)=>{
      s.classList.toggle("active", idx < selectedRating);
    });
  });
});

// Preview helper
function setPreview(url) {
  const img = document.getElementById("preview-image");
  if (url) {
    img.src = url;
    img.style.display = "block";
  } else {
    img.src = "";
    img.style.display = "none";
  }
}

// Add button → fill form from Google place
document.getElementById("addBtn").addEventListener("click", () => {
  const autocompleteEl = document.getElementById("place-autocomplete");
  const place = autocompleteEl.getPlace();

  if (!place) {
    showToast("No place selected.", "error");
    return;
  }

  document.getElementById("store-name").value = place.displayName || "";
  document.getElementById("store-address").value = place.formattedAddress || "";

  let city="", country="";

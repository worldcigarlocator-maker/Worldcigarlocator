document.addEventListener("DOMContentLoaded", () => {
  const storeBtn = document.getElementById("storeBtn");
  const loungeBtn = document.getElementById("loungeBtn");
  const accessWrapper = document.getElementById("accessWrapper");
  const ratingStars = document.querySelectorAll("#rating span");
  const form = document.getElementById("storeForm");
  const fetchBtn = document.getElementById("fetchBtn");
  const mapsUrl = document.getElementById("mapsUrl");

  let type = "store";
  let rating = 0;

  // Toggle Store / Lounge
  storeBtn.addEventListener("click", () => {
    type = "store";
    storeBtn.classList.add("active");
    loungeBtn.classList.remove("active");
    accessWrapper.classList.add("hidden");
  });

  loungeBtn.addEventListener("click", () => {
    type = "lounge";
    loungeBtn.classList.add("active");
    storeBtn.classList.remove("active");
    accessWrapper.classList.remove("hidden");
  });

  // Rating stars
  ratingStars.forEach(star => {
    star.addEventListener("click", () => {
      rating = star.dataset.value;
      ratingStars.forEach(s => s.classList.remove("active"));
      for (let i = 0; i < rating; i++) {
        ratingStars[i].classList.add("active");
      }
    });
  });

  // --- Fetch data from Google Maps link (basic version) ---
  fetchBtn.addEventListener("click", () => {
    const url = mapsUrl.value.trim();
    if (!url) {
      alert("Please paste a Google Maps link first!");
      return;
    }

    // Example: extract "place/NAME" from the Maps URL
    const nameMatch = url.match(/place\/([^/]+)/);
    if (nameMatch) {
      const name = decodeURIComponent(nameMatch[1].replace(/\+/g, " "));
      document.getElementById("name").value = name;
    }

    // TODO: Replace with Google Places API for full details
    alert("Fetched basic data from URL (expand with Google API later)");
  });

  // Submit
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const data = {
      type,
      name: document.getElementById("name").value,
      address: document.getElementById("address").value,
      website: document.getElementById("website").value,
      phone: document.getElementById("phone").value,
      continent: document.getElementById("continent").value,
      country: document.getElementById("country").value,
      city: document.getElementById("city").value,
      access: type === "lounge" ? document.getElementById("access").value : null,
      rating
    };

    console.log("Saving...", data);
    alert("Form submitted! (check console)");
    // Här kopplar vi in Supabase sen 👌
  });
});

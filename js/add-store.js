document.addEventListener("DOMContentLoaded", () => {
  const storeBtn = document.getElementById("storeBtn");
  const loungeBtn = document.getElementById("loungeBtn");
  const accessWrapper = document.getElementById("accessWrapper");
  const ratingStars = document.querySelectorAll("#rating span");
  const form = document.getElementById("storeForm");

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

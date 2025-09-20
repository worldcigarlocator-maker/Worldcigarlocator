document.addEventListener("DOMContentLoaded", () => {
  const content = document.getElementById("content");

  // Lyssna på alla länkar i sidomenyn
  document.querySelectorAll(".sidebar a[data-country][data-city]").forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();

      const country = link.getAttribute("data-country");
      const city = link.getAttribute("data-city");

      // Byt ut innehållet i <main>
      content.innerHTML = `
        <h1 class="welcome-text">${city}, ${country}</h1>
        <p class="subtitle">Here are the cigar stores and lounges in ${city}.</p>
        <img src="images/cigar-lounge.jpg" alt="${city}" class="hero-img">
        <p>
          This section will soon show detailed information about cigar stores and lounges in <b>${city}</b>.
        </p>
      `;
    });
  });
});

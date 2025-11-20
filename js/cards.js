/* ============================================================
   FRONTEND — CLEAN, MODERN CARD RENDERING
   ============================================================ */

import { WCL, flagURL, photoURL } from "./globals.js";

export function renderCards(stores) {
  const grid = document.getElementById("storeGrid");
  if (!grid) return;
  grid.innerHTML = "";

  stores.forEach((s) => {
    const card = document.createElement("div");
    card.className = "store-card";

    /* ---------------- PHOTO ---------------- */
    const img = document.createElement("img");
    img.className = "store-img";
    img.src = photoURL(s.photo_reference, 800);
    img.onerror = () => (img.src = WCL.FALLBACK_IMG);
    card.appendChild(img);

    /* ---------------- BODY ---------------- */
    const body = document.createElement("div");
    body.className = "store-body";

    /* ---------------- NAME ---------------- */
    const title = document.createElement("h3");
    title.className = "store-title";
    title.textContent = s.name || "";
    body.appendChild(title);

/* ---------------- BADGES ---------------- */
const badgeRow = document.createElement("div");
badgeRow.className = "badge-row";

/* ---------------- TYPES / BADGES ✔️ ---------------- */

types.forEach((t) => {
  if (t === "store" || t === "lounge") {
    const b = document.createElement("span");
    b.className = `badge ${t === "store" ? "blue" : "gold"}`;
    b.textContent = t.toUpperCase();
    badgeRow.appendChild(b);
  }

  if (t === "lounge") {
    const acc = (s.access || "").toLowerCase();
    if (acc === "public" || acc === "members") {
      const a = document.createElement("span");
      a.className = `badge access ${acc}`;
      a.textContent = acc.toUpperCase();
      badgeRow.appendChild(a);
    }
  }
});


    /* ---------------- STARS ---------------- */
    const stars = document.createElement("div");
    stars.className = "stars";

    const rating = Math.round(Number(s.rating) || 0);
    stars.textContent = "★★★★★☆☆☆☆☆".slice(5 - rating, 10 - rating);
    body.appendChild(stars);

  /* ---------------- LOCATION ---------------- */
const loc = document.createElement("div");
loc.className = "locrow";

/* Rad 1: flagga + country, city */
const top = document.createElement("div");
top.className = "loc-top";

const fsrc = flagURL(s.country, s.country_iso2);
if (fsrc) {
  const f = document.createElement("img");
  f.className = "flag";
  f.src = fsrc;
  top.appendChild(f);
}

const geo = document.createElement("span");
geo.className = "geo-main";
geo.textContent = [s.country, s.city].filter(Boolean).join(", ");
top.appendChild(geo);

loc.appendChild(top);

/* Rad 2: continent (indragen) */
if (s.continent) {
  const cont = document.createElement("div");
  cont.className = "continent-label";
  cont.textContent =
    s.continent.charAt(0).toUpperCase() +
    s.continent.slice(1).toLowerCase();
  loc.appendChild(cont);
}

body.appendChild(loc);


    /* ---------------- INFO ---------------- */
    const info = document.createElement("div");
    info.className = "infoblock";

    info.innerHTML = `
      <p class="info-row address"><strong>Address:</strong> ${s.address || "–"}</p>
      <p class="info-row phone"><strong>Phone:</strong> ${s.phone || "–"}</p>
      <p class="info-row website">
        <strong>Website:</strong> ${
          s.website
            ? `<a href="${s.website}" target="_blank">Visit</a>`
            : "–"
        }
      </p>
    `;

    body.appendChild(info);

    /* ---------------- COMMENTS ---------------- */
    const reviewsBtn = document.createElement("button");
    reviewsBtn.className = "reviews-btn";
    reviewsBtn.textContent = "💬 Comments";
    reviewsBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (window.openStoreModal) window.openStoreModal(s);
    });
    body.appendChild(reviewsBtn);

    /* ---------------- CLICK ---------------- */
    card.addEventListener("click", () => {
      if (window.openStoreModal) window.openStoreModal(s);
    });

    card.appendChild(body);
    grid.appendChild(card);
  });
}

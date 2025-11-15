/* ============================================================
   FRONTEND — RENDER STORE CARDS (clean, clickable, correct badges)
   ============================================================ */

import { WCL, flagURL, photoURL } from "./globals.js";

export function renderCards(stores) {
  const grid = document.getElementById("storeGrid");
  if (!grid) return;
  grid.innerHTML = "";

  stores.forEach((s) => {
    /* CARD WRAPPER */
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

    /* ============================================================
       TYPE BADGES — store + lounge + access (public/members)
       ============================================================ */
    const badgeRow = document.createElement("div");
    badgeRow.className = "badge-row";

    // Normalize types field
    let types = [];
    if (Array.isArray(s.types)) {
      types = s.types;
    } else if (typeof s.type === "string") {
      types = s.type.split(",").map((t) => t.trim().toLowerCase());
    }

    types.forEach((t) => {
      if (t !== "store" && t !== "lounge") return;

      // Base badge
      const b = document.createElement("span");
      b.className = `badge ${t === "store" ? "blue" : "gold"}`;
      b.textContent = t.toUpperCase();
      badgeRow.appendChild(b);

      // Access shown only for lounge
      if (t === "lounge" && s.access) {
        const acc = document.createElement("span");
        acc.className = `badge access ${s.access.toLowerCase()}`;
        acc.textContent = s.access.toUpperCase();
        badgeRow.appendChild(acc);
      }
    });

    body.appendChild(badgeRow);

    /* ---------------- STARS ---------------- */
    const stars = document.createElement("div");
    stars.className = "stars";
    const rating = Math.round(Number(s.rating) || 0);
    const starString =
      "★★★★★☆☆☆☆☆".slice(5 - rating, 10 - rating) || "★★★★★";
    stars.textContent = starString;
    body.appendChild(stars);

    /* ---------------- LOCATION ---------------- */
    const loc = document.createElement("div");
    loc.className = "locrow";

    const top = document.createElement("div");
    top.className = "loc-top";

    // Flag
    const fsrc = flagURL(s.country, s.country_iso2);
    if (fsrc) {
      const f = document.createElement("img");
      f.className = "flag";
      f.src = fsrc;
      top.appendChild(f);
    }

    // Country, state, city
    const geo = document.createElement("span");
    geo.textContent = [s.country, s.state, s.city].filter(Boolean).join(", ");
    top.appendChild(geo);
    loc.appendChild(top);

    body.appendChild(loc);

    /* ---------------- INFO BLOCK ---------------- */
    const info = document.createElement("div");
    info.className = "infoblock";
    info.innerHTML = `
      <p><strong>Address:</strong> ${s.address || "–"}</p>
      <p><strong>Phone:</strong> ${s.phone || "–"}</p>
      <p><strong>Website:</strong> ${
        s.website ? `<a href="${s.website}" target="_blank">Visit</a>` : "–"
      }</p>
    `;
    body.appendChild(info);

    /* ---------------- COMMENTS BUTTON ---------------- */
    const reviewsBtn = document.createElement("button");
    reviewsBtn.className = "reviews-btn";
    reviewsBtn.textContent = "💬 Comments";
    reviewsBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (window.openStoreModal) window.openStoreModal(s);
    });
    body.appendChild(reviewsBtn);

    /* ============================================================
       NO STATUS IN FRONTEND (approved/pending/flagged removed)
       ============================================================ */

    /* ---------------- FULL CARD CLICK ---------------- */
    card.addEventListener("click", () => {
      if (window.openStoreModal) window.openStoreModal(s);
    });

    card.appendChild(body);
    grid.appendChild(card);
  });
}

/* ============================================================
   FRONTEND CARDS (v8) — Backoffice layout, dark, gold theme
   ============================================================ */

import { WCL, flagURL, photoURL } from "./globals.js";

/* Helper */
function esc(str){
  return String(str || "").replace(/[&<>"']/g, (c)=>({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  }[c]));
}

/* ============================================================
   MAIN RENDER
   ============================================================ */
export function renderCards(stores) {

  const grid = document.getElementById("storeGrid");
  if (!grid) return;

  grid.innerHTML = "";

  stores.forEach((s) => {

    /* ================================================
       CARD WRAPPER
       ================================================ */
    const card = document.createElement("div");
    card.className = "store-card";

    /* ================================================
       PHOTO
       ================================================ */
    const img = document.createElement("img");
    img.className = "store-img";
    img.src = photoURL(s.photo_reference, 800);
    img.onerror = () => (img.src = WCL.FALLBACK_IMG);
    card.appendChild(img);

    /* ================================================
       BODY
       ================================================ */
    const body = document.createElement("div");
    body.className = "store-body";

    /* ================================================
       NAME (always 2 lines)
       ================================================ */
    const title = document.createElement("h3");
    title.className = "store-title";
    title.textContent = s.name || "Unnamed";
    body.appendChild(title);

    /* ================================================
       BADGES (store/lounge + access)
       ================================================ */
    const badgeRow = document.createElement("div");
    badgeRow.className = "badge-row";

    const types = Array.isArray(s.types)
      ? s.types
      : s.type
      ? [s.type]
      : [];

    types.forEach((tRaw) => {
      const t = String(tRaw).toLowerCase().trim();

      // store, lounge, other
      const badge = document.createElement("span");
      badge.className = `badge ${t}`;
      badge.textContent = t.toUpperCase();
      badgeRow.appendChild(badge);

      if (t === "lounge" && s.access) {
        const acc = document.createElement("span");
        acc.className = `badge access ${s.access}`;
        acc.textContent = s.access.toUpperCase();
        badgeRow.appendChild(acc);
      }
    });

    body.appendChild(badgeRow);

    /* ================================================
       RATING
       ================================================ */
    const ratingDiv = document.createElement("div");
    ratingDiv.className = "stars";

    const rating = Math.round(Number(s.rating) || 0);
    ratingDiv.textContent = "★★★★★☆☆☆☆☆".slice(5 - rating, 10 - rating);
    body.appendChild(ratingDiv);

    /* ================================================
       LOCATION (flag, country/state/city, continent)
       ================================================ */
    const loc = document.createElement("div");
    loc.className = "locrow";

    const top = document.createElement("div");
    top.className = "loc-top";

    // FLAG
    const flagSrc = flagURL(s.country, s.country_iso2);
    if (flagSrc) {
      const f = document.createElement("img");
      f.className = "flag";
      f.src = flagSrc;
      top.appendChild(f);
    }

    // COUNTRY, STATE, CITY
    const geo = document.createElement("span");
    geo.textContent = [s.country, s.state, s.city].filter(Boolean).join(", ");
    top.appendChild(geo);

    loc.appendChild(top);

    // CONTINENT
    if (s.continent) {
      const cont = document.createElement("div");
      cont.className = "continent-line";
      cont.textContent = s.continent.toUpperCase();
      loc.appendChild(cont);
    }

    body.appendChild(loc);

    /* ================================================
       INFO BLOCK (address / phone / website)
       ================================================ */
    const info = document.createElement("div");
    info.className = "infoblock";

    info.innerHTML = `
      <p><strong>Address:</strong> ${esc(s.address || "–")}</p>
      <p><strong>Phone:</strong> ${esc(s.phone || "–")}</p>
      <p><strong>Website:</strong> ${
        s.website
          ? `<a href="${esc(s.website)}" target="_blank" rel="noopener">Visit</a>`
          : "–"
      }</p>
    `;

    body.appendChild(info);

    /* ================================================
       COMMENTS BUTTON
       ================================================ */
    const reviewsBtn = document.createElement("button");
    reviewsBtn.className = "reviews-btn";
    reviewsBtn.textContent = "💬 View Comments";
    reviewsBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (window.openStoreModal) window.openStoreModal(s);
    });
    body.appendChild(reviewsBtn);

    /* ================================================
       CLICK ENTIRE CARD = open modal
       ================================================ */
    card.addEventListener("click", () => {
      if (window.openStoreModal) window.openStoreModal(s);
    });

    /* FINALIZE */
    card.appendChild(body);
    grid.appendChild(card);
  });
}

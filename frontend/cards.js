/* ============================================================
   FRONTEND — Card renderer (Backoffice-look, dark + gold)
   ============================================================ */

import { WCL, flagURL, photoURL } from "./globals.js";

export function renderCards(stores = []) {
  const grid = document.getElementById("storeGrid");
  if (!grid) return;

  grid.innerHTML = "";

  if (!stores.length) {
    grid.innerHTML =
      `<p style="color:#999;text-align:center;margin-top:2rem;">No results found.</p>`;
    return;
  }

  stores.forEach((s) => {
    const card = document.createElement("div");
    card.className = "store-card";

    /* ---------- PHOTO ---------- */
    const img = document.createElement("img");
    img.className = "store-img";
    img.src = photoURL(s.photo_reference, 800);
    img.alt = s.name || "";
    img.onerror = () => (img.src = WCL.FALLBACK_IMG);
    card.appendChild(img);

    /* ---------- BODY ---------- */
    const body = document.createElement("div");
    body.className = "store-body";

    /* Type badges + access */
    const badgeRow = document.createElement("div");
    badgeRow.className = "badge-row";

    const types = Array.isArray(s.types)
      ? s.types
      : s.type
      ? [s.type]
      : [];

    if (types.length) {
      types.forEach((tRaw) => {
        const t = (tRaw || "").toLowerCase();

        if (t !== "store" && t !== "lounge") return;

        const span = document.createElement("span");
        span.className = `badge ${
          t === "store" ? "blue" : t === "lounge" ? "gold" : "gray"
        }`;
        span.textContent = t.toUpperCase();
        badgeRow.appendChild(span);

        // Access direkt efter lounge
        if (t === "lounge" && s.access) {
          const acc = document.createElement("span");
          acc.className =
            "badge access " +
            (s.access === "public"
              ? "green"
              : s.access === "members"
              ? "purple"
              : "gray");
          acc.textContent = (s.access || "").toUpperCase();
          badgeRow.appendChild(acc);
        }
      });
    } else {
      const span = document.createElement("span");
      span.className = "badge gray";
      span.textContent = "–";
      badgeRow.appendChild(span);
    }

    body.appendChild(badgeRow);

    /* Title (2 lines) */
    const title = document.createElement("h3");
    title.className = "store-title";
    title.textContent = s.name || "";
    body.appendChild(title);

    /* Stars row */
    const starsRow = document.createElement("div");
    starsRow.className = "stars-row";
    const ratingValue = Number(s.rating) || 0;
    const rounded = Math.round(ratingValue);
    const stars = Array.from({ length: 5 })
      .map((_, i) => (i < rounded ? "★" : "☆"))
      .join("");
    starsRow.textContent = stars;
    body.appendChild(starsRow);

    /* Location (flag + geo + continent) */
    const loc = document.createElement("div");
    loc.className = "locrow";

    const top = document.createElement("div");
    top.className = "loc-top";

    const flagSrc = flagURL(s.country, s.country_iso2);
    if (flagSrc) {
      const f = document.createElement("img");
      f.className = "flag";
      f.src = flagSrc;
      f.alt = s.country || "";
      f.onerror = () => (f.style.display = "none");
      top.appendChild(f);
    }

    const geo = document.createElement("span");
    geo.className = "loc-text";
    const parts = [];
    if (s.country) parts.push(s.country);
    if (s.state) parts.push(s.state);
    if (s.city) parts.push(s.city);
    geo.textContent = parts.join(", ");
    top.appendChild(geo);

    loc.appendChild(top);

    if (s.continent) {
      const cont = document.createElement("div");
      cont.className = "continent-line";
      cont.textContent = s.continent.toUpperCase();
      loc.appendChild(cont);
    }

    body.appendChild(loc);

    /* Info block */
    const info = document.createElement("div");
    info.className = "infoblock";

    info.innerHTML = `
      <p><strong>Address:</strong> ${s.address || "–"}</p>
      <p><strong>Phone:</strong> ${s.phone || "–"}</p>
      <p><strong>Website:</strong> ${
        s.website
          ? `<a href="${s.website}" target="_blank" rel="noopener">Visit</a>`
          : "–"
      }</p>
    `;
    body.appendChild(info);

    /* Divider-like spacing */
    const divider = document.createElement("div");
    divider.className = "card-divider";
    body.appendChild(divider);

    /* Comments button */
    const reviewsBtn = document.createElement("button");
    reviewsBtn.className = "reviews-btn";
    reviewsBtn.textContent = "💬 View comments / rating";
    reviewsBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (window.openStoreModal) window.openStoreModal(s);
    });
    body.appendChild(reviewsBtn);

    /* Bottom: rating chip (no admin status badges in frontend) */
    const ratingChip = document.createElement("div");
    ratingChip.className = "rating-chip-row";
    ratingChip.innerHTML = `<span class="rating-chip">⭐ ${
      s.rating ?? "–"
    }</span>`;
    body.appendChild(ratingChip);

    /* Click whole card → modal */
    card.addEventListener("click", () => {
      if (window.openStoreModal) window.openStoreModal(s);
    });

    card.appendChild(body);
    grid.appendChild(card);
  });
}

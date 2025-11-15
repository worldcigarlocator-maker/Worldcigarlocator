/* ============================================================
   FRONTEND CARDS — WCL Public Cards Renderer (2025-11)
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

    /* NAME */
    const title = document.createElement("h3");
    title.className = "store-title";
    title.textContent = s.name || "";
    body.appendChild(title);

    /* === TYPE & ACCESS BADGES (matchar Backoffice) === */
const badgeRow = document.createElement("div");
badgeRow.className = "badge-row";

if (s.type) {
  const b = document.createElement("span");
  b.className = `badge ${s.type === "store" ? "blue" : "gold"}`;
  b.textContent = s.type;
  badgeRow.appendChild(b);
}

if (s.access) {
  const acc = document.createElement("span");
  acc.className = `badge access ${
    s.access === "public"   ? "green" :
    s.access === "members" ? "purple" :
                              "gray"
  }`;
  acc.textContent = s.access.toUpperCase();
  badgeRow.appendChild(acc);
}

body.appendChild(badgeRow);


    /* ---------------- STARS ---------------- */
    const stars = document.createElement("div");
    stars.className = "stars";
    const rating = Math.round(Number(s.rating) || 0);
    stars.innerHTML = "★★★★★☆☆☆☆☆".slice(5 - rating, 10 - rating);
    body.appendChild(stars);

    /* ---------------- LOCATION ---------------- */
    const loc = document.createElement("div");
    loc.className = "locrow";

    const top = document.createElement("div");
    top.className = "loc-top";

    const flagSrc = flagURL(s.country, s.country_iso2);
    if (flagSrc) {
      const f = document.createElement("img");
      f.className = "flag";
      f.src = flagSrc;
      top.appendChild(f);
    }

    const geo = document.createElement("span");
    geo.textContent = [s.country, s.city].filter(Boolean).join(" • ");
    top.appendChild(geo);

    loc.appendChild(top);

    if (s.continent) {
      const c = document.createElement("div");
      c.className = "continent-line";
      c.textContent = s.continent.toUpperCase();
      loc.appendChild(c);
    }

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

    /* ---------------- COMMENTS ---------------- */
    const reviewsBtn = document.createElement("button");
    reviewsBtn.className = "reviews-btn";
    reviewsBtn.textContent = "💬 View Comments";
    reviewsBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (window.openStoreModal) window.openStoreModal(s);
    });
    body.appendChild(reviewsBtn);

    /* ---------------- STATUS CHIP ---------------- */
    const statusRow = document.createElement("div");
    statusRow.className = "status-row";

    const statusLabel = !s.approved && !s.flagged && !s.deleted
      ? "PENDING"
      : s.approved
      ? "APPROVED"
      : s.flagged
      ? "FLAGGED"
      : "DELETED";

    const statusColor = !s.approved && !s.flagged && !s.deleted
      ? "gold"
      : s.approved
      ? "green"
      : s.flagged
      ? "red"
      : "gray";

    statusRow.innerHTML = `
      <span class="badge ${statusColor}">${statusLabel}</span>
      <span class="rating-chip">⭐ ${s.rating ?? "–"}</span>
    `;

    body.appendChild(statusRow);

    /* ---------------- CLICK → MODAL ---------------- */
    card.addEventListener("click", () => {
      if (window.openStoreModal) window.openStoreModal(s);
    });

    card.appendChild(body);
    grid.appendChild(card);
  });
}

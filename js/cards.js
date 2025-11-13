import { WCL, flagURL, photoURL } from "./globals.js";

export function renderCards(stores) {
  const grid = document.getElementById("storeGrid");
  if (!grid) return;
  grid.innerHTML = "";

  stores.forEach((s) => {
    const card = document.createElement("div");
    card.className = "store-card";

    /* PHOTO */
    const img = document.createElement("img");
    img.className = "store-img";
    img.src = photoURL(s.photo_reference, 800);
    img.onerror = () => (img.src = WCL.FALLBACK_IMG);
    card.appendChild(img);

    /* BODY */
    const body = document.createElement("div");
    body.className = "store-body";

    /* NAME */
    const title = document.createElement("h3");
    title.className = "store-title";
    title.textContent = s.name || "";
    body.appendChild(title);

    /* BADGES (store/lounge + access) */
    const badgeRow = document.createElement("div");
    badgeRow.className = "badge-row";

    const types = Array.isArray(s.types)
      ? s.types
      : (s.type ? [s.type] : []);

    types.forEach((t) => {
      const b = document.createElement("span");
      b.className = `badge ${
        t === "store" ? "blue" :
        t === "lounge" ? "gold" : "gray"
      }`;
      b.textContent = t;
      badgeRow.appendChild(b);

      if (t === "lounge" && s.access) {
        const acc = document.createElement("span");
        acc.className =
          `badge access ` +
          (s.access === "public"
            ? "green"
            : s.access === "members"
            ? "purple"
            : "gray");
        acc.textContent = s.access.toUpperCase();
        badgeRow.appendChild(acc);
      }
    });

    body.appendChild(badgeRow);

    /* STARS */
    const stars = document.createElement("div");
    stars.className = "stars";
    const rating = Math.round(Number(s.rating) || 0);
    stars.textContent = "★★★★★☆☆☆☆☆".slice(5 - rating, 10 - rating);
    body.appendChild(stars);

    /* LOCATION */
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
    geo.textContent = [s.country, s.state, s.city].filter(Boolean).join(", ");
    top.appendChild(geo);

    loc.appendChild(top);

    if (s.continent) {
      const c = document.createElement("div");
      c.className = "continent-line";
      c.textContent = s.continent.toUpperCase();
      loc.appendChild(c);
    }

    body.appendChild(loc);

    /* INFO BLOCK */
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

    /* COMMENTS BUTTON */
    const reviewsBtn = document.createElement("button");
    reviewsBtn.className = "reviews-btn";
    reviewsBtn.textContent = "💬 View Comments";
    reviewsBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (window.openStoreModal) window.openStoreModal(s);
    });
    body.appendChild(reviewsBtn);

    /* STATUS (approved/pending/flagged/deleted) */
    const statusRow = document.createElement("div");
    statusRow.className = "status-row";

    if (s.approved) statusRow.innerHTML += `<span class="badge green">APPROVED</span>`;
    if (s.flagged)  statusRow.innerHTML += `<span class="badge red">FLAGGED</span>`;
    if (s.deleted)  statusRow.innerHTML += `<span class="badge gray">DELETED</span>`;
    if (!s.approved && !s.flagged && !s.deleted)
      statusRow.innerHTML += `<span class="badge gold">PENDING</span>`;

    statusRow.innerHTML += `<span class="rating-chip">⭐ ${s.rating ?? "–"}</span>`;

    body.appendChild(statusRow);

    /* CLICK WHOLE CARD → MODAL */
    card.addEventListener("click", () => {
      if (window.openStoreModal) window.openStoreModal(s);
    });

    card.appendChild(body);
    grid.appendChild(card);
  });
}

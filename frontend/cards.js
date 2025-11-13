import { WCL, flagURL, photoURL } from "./globals.js";

export function renderCards(stores) {
  const grid = document.getElementById("storeGrid");
  if (!grid) return;
  grid.innerHTML = "";

  stores.forEach((s) => {
    const card = document.createElement("div");
    card.className = "store-card";

    /* PHOTO -------------------------------------------------- */
    const img = document.createElement("img");
    img.className = "store-img";
    img.src = photoURL(s.photo_reference, 800);
    img.onerror = () => (img.src = WCL.FALLBACK_IMG);
    card.appendChild(img);

    /* BODY --------------------------------------------------- */
    const body = document.createElement("div");
    body.className = "store-body";

    /* TITLE -------------------------------------------------- */
    const title = document.createElement("h3");
    title.className = "store-title";
    title.textContent = s.name || "Unnamed";
    body.appendChild(title);

    /* BADGES ------------------------------------------------- */
    const badgeRow = document.createElement("div");
    badgeRow.className = "badge-row";

    const types = Array.isArray(s.types)
      ? s.types
      : s.type
      ? [s.type]
      : [];

    types.forEach((t) => {
      const b = document.createElement("span");
      b.className = `badge ${
        t === "store" ? "blue" :
        t === "lounge" ? "gold" : "gray"
      }`;
      b.textContent = t.toUpperCase();
      badgeRow.appendChild(b);

      if (t === "lounge" && s.access) {
        const a = document.createElement("span");
        a.className =
          "badge access " +
          (s.access === "public"
            ? "green"
            : s.access === "members"
            ? "purple"
            : "gray");
        a.textContent = s.access.toUpperCase();
        badgeRow.appendChild(a);
      }
    });

    body.appendChild(badgeRow);

    /* STARS -------------------------------------------------- */
    const stars = document.createElement("div");
    stars.className = "stars";

    const rating = Math.round(Number(s.rating) || 0);
    stars.textContent = "★★★★★☆☆☆☆☆".slice(5 - rating, 10 - rating);

    body.appendChild(stars);

    /* LOCATION ------------------------------------------------ */
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

    /* INFO BLOCK -------------------------------------------- */
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

    /* SEPARATOR ---------------------------------------------- */
    const sep = document.createElement("div");
    sep.className = "separator";
    body.appendChild(sep);

    /* COMMENTS BUTTON ---------------------------------------- */
    const reviewsBtn = document.createElement("button");
    reviewsBtn.className = "reviews-btn";
    reviewsBtn.textContent = "💬 View comments";
    reviewsBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (window.openStoreModal) window.openStoreModal(s);
    });
    body.appendChild(reviewsBtn);

    /* STATUS ROW (ONLY SHOW RATING IN FRONTEND) -------------- */
    const statusRow = document.createElement("div");
    statusRow.className = "status-row";

    statusRow.innerHTML = `<span class="rating-chip">⭐ ${s.rating ?? "–"}</span>`;
    body.appendChild(statusRow);

    /* CLICK WHOLE CARD --------------------------------------- */
    card.addEventListener("click", () => {
      if (window.openStoreModal) window.openStoreModal(s);
    });

    card.appendChild(body);
    grid.appendChild(card);
  });
}

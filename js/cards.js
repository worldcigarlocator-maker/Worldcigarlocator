/* ============================================================
   FRONTEND — PIXEL-PERFECT BACKOFFICE CARD
   ============================================================ */

export function renderStoreCards(stores) {
  const grid = document.getElementById("storeGrid");
  if (!grid) return;

  grid.innerHTML = "";

  stores.forEach((s) => {
    const card = document.createElement("div");
    card.className = "card-frontend";

    /* ===== PHOTO ===== */
    const img = document.createElement("img");
    img.className = "card-photo";
    img.src = s.photo_reference
      ? buildPhotoProxyUrl(s.photo_reference, 800)
      : "images/store.jpg";
    img.onerror = () => (img.src = "images/store.jpg");
    card.appendChild(img);

    /* ===== BODY ===== */
    const body = document.createElement("div");
    body.className = "card-body";

    /* === TITLE EXACT 2 LINES === */
    const h3 = document.createElement("h3");
    h3.className = "card-title";
    h3.textContent = s.name || "";
    body.appendChild(h3);

    /* === STARS === */
    const stars = document.createElement("div");
    stars.className = "card-stars";
    const r = Math.round(Number(s.rating) || 0);
    stars.innerHTML = Array.from({ length: 5 })
      .map((_, i) => (i < r ? "★" : "☆"))
      .join("");
    body.appendChild(stars);

    /* === FLAG + COUNTRY + CITY === */
    const loc = document.createElement("div");
    loc.className = "locrow";

    const top = document.createElement("div");
    top.className = "loc-top";

    const flagData = flagURL(s.country);
    if (flagData?.svgUrl) {
      const f = document.createElement("img");
      f.className = "flag";
      f.src = flagData.svgUrl;
      top.appendChild(f);
    }

    const geo = document.createElement("span");
    geo.textContent = `${s.country || ""}, ${s.city || ""}`;
    top.appendChild(geo);

    loc.appendChild(top);

    const cont = document.createElement("div");
    cont.className = "continent-line";
    cont.textContent = (s.continent || getContinentFromCountry(s.country)).toUpperCase();
    loc.appendChild(cont);

    body.appendChild(loc);

    /* === ADDRESS / PHONE / WEBSITE === */
    const info = document.createElement("div");
    info.className = "info-block";

    info.innerHTML = `
      <p><strong>Address:</strong> ${s.address || "–"}</p>
      <p><strong>Phone:</strong> ${s.phone || "–"}</p>
      <p><strong>Website:</strong> ${
        s.website ? `<a href="${s.website}" target="_blank">Visit</a>` : "–"
      }</p>
    `;

    body.appendChild(info);

    /* === VIEW COMMENTS BUTTON === */
    const btnWrap = document.createElement("div");
    btnWrap.className = "reviews-btn-wrap";

    const btn = document.createElement("button");
    btn.className = "btn small ghost";
    btn.textContent = "💬 View comments / rating";
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      openStoreModal(s);
    });

    btnWrap.appendChild(btn);
    body.appendChild(btnWrap);

    card.appendChild(body);

    /* === CARD CLICK OPENS MODAL === */
    card.addEventListener("click", () => openStoreModal(s));

    grid.appendChild(card);
  });
}

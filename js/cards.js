export function renderStoreCards(stores) {
  const grid = document.getElementById("storeGrid");
  grid.innerHTML = "";

  stores.forEach((s) => {
    const card = document.createElement("div");
    card.className = "store-card";

    /* IMAGE */
    const img = document.createElement("img");
    img.className = "store-img";
    img.src = s.photo_reference
      ? buildPhotoProxyUrl(s.photo_reference, 800)
      : "images/store.jpg";
    card.appendChild(img);

    /* BODY */
    const body = document.createElement("div");
    body.className = "store-body";

    /* TITLE */
    const title = document.createElement("h3");
    title.className = "store-title";
    title.textContent = s.name || "Unnamed";
    body.appendChild(title);

    /* BADGES (store / lounge + access) */
    const badgeRow = document.createElement("div");
    badgeRow.className = "badge-row";

    const types = Array.isArray(s.types)
      ? s.types
      : s.type ? [s.type] : [];

    types.forEach((t) => {
      const span = document.createElement("span");
      span.className =
        "badge " +
        (t === "store"
          ? "blue"
          : t === "lounge"
          ? "gold"
          : "gray");
      span.textContent = t.toUpperCase();
      badgeRow.appendChild(span);

      if (t === "lounge" && s.access) {
        const acc = document.createElement("span");
        acc.className =
          "badge access " +
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

    /* RATING (★) */
    const rating = document.createElement("div");
    rating.className = "rating-stars";
    const r = Math.round(Number(s.rating) || 0);
    rating.textContent =
      "★".repeat(r) + "☆".repeat(5 - r);
    body.appendChild(rating);

    /* LOCATION */
    const loc = document.createElement("div");
    loc.className = "locrow";

    const top = document.createElement("div");
    top.className = "loc-top";

    const flag = flagURL(s.country);
    if (flag) {
      const f = document.createElement("img");
      f.className = "flag";
      f.src = flag.svgUrl;
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

    /* INFOBLOCK */
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

    /* DIVIDER */
    const divider = document.createElement("div");
    divider.className = "card-divider";
    body.appendChild(divider);

    /* COMMENTS BUTTON */
    const btn = document.createElement("button");
    btn.className = "review-btn";
    btn.textContent = "💬 View Comments";
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      openStoreModal(s);
    });
    body.appendChild(btn);

    card.appendChild(body);

    /* CLICK WHOLE CARD */
    card.addEventListener("click", () => openStoreModal(s));

    grid.appendChild(card);
  });
}

/* ============================================================
   Backoffice Cards Renderer (V5.2.1 — ORIGINAL)
   ============================================================ */

export function renderStoreCards(stores) {
  const grid = document.getElementById("storeGrid");
  if (!grid) return;

  grid.innerHTML = "";

  stores.forEach(s => {

    /* ---------------- CARD WRAPPER ---------------- */
    const card = document.createElement("div");
    card.className = "store-card";

    /* ---------------- IMAGE ---------------- */
    const img = document.createElement("img");
    img.className = "store-img";
    img.src = s.photo_reference
      ? `${PHOTO_PROXY_URL}?photo_reference=${encodeURIComponent(s.photo_reference)}&maxwidth=800`
      : FALLBACK_IMG;

    img.onerror = () => { img.src = FALLBACK_IMG; };
    card.appendChild(img);

    /* ---------------- BODY ---------------- */
    const body = document.createElement("div");
    body.className = "card-body";

    /* ---------------- NAME ---------------- */
    const title = document.createElement("h3");
    title.className = "card-title";
    title.textContent = s.name || "Unnamed";
    body.appendChild(title);

    /* ---------------- BADGES ---------------- */
    const badgeWrap = document.createElement("div");
    badgeWrap.className = "badge-wrap";

    const types = Array.isArray(s.types)
      ? s.types
      : (s.type ? s.type.split(",").map(t => t.trim().toLowerCase()) : []);

    if (types.length) {
      types.forEach(tRaw => {
        const t = tRaw.toLowerCase();

        if (t === "store" || t === "lounge") {
          const span = document.createElement("span");
          span.className = `type-badge ${t}`;
          span.textContent = t.toUpperCase();
          badgeWrap.appendChild(span);
        }

        if (t === "lounge" && s.access) {
          const acc = document.createElement("span");
          acc.className = "access-badge " + (
            s.access === "public" ? "public" :
            s.access === "members" ? "members" : "other"
          );
          acc.textContent = s.access.toUpperCase();
          badgeWrap.appendChild(acc);
        }
      });
    }

    body.appendChild(badgeWrap);

    /* ---------------- RATING (STARS) ---------------- */
    const ratingRow = document.createElement("div");
    ratingRow.className = "rating-stars";
    const baseRating = Math.round(Number(s.rating) || 0);
    ratingRow.textContent =
      Array.from({ length: 5 })
        .map((_, i) => i < baseRating ? "★" : "☆")
        .join("");
    body.appendChild(ratingRow);

    /* ---------------- LOCATION + FLAG ---------------- */
    const loc = document.createElement("div");
    loc.className = "locrow";

    const locTop = document.createElement("div");
    locTop.className = "loc-top";

    const flagData = flagURL(s.country, s.country_iso2);
    if (flagData) {
      const fl = document.createElement("img");
      fl.className = "flag";
      fl.src = flagData;
      fl.onerror = function () { this.style.display = "none"; };
      locTop.appendChild(fl);
    }

    const geo = document.createElement("span");
    geo.className = "loc-text";
    geo.textContent = [s.country, s.city].filter(Boolean).join(", ");
    locTop.appendChild(geo);

    loc.appendChild(locTop);

    const contLine = document.createElement("div");
    contLine.className = "continent-line";
    contLine.textContent = (s.continent || "OTHER").toUpperCase();
    loc.appendChild(contLine);

    body.appendChild(loc);

    /* ---------------- INFO BLOCK ---------------- */
    const info = document.createElement("div");
    info.className = "infoblock";
    info.innerHTML = `
      <p><strong>Address:</strong> ${s.address || "–"}</p>
      <p><strong>Phone:</strong> ${s.phone || "–"}</p>
      <p><strong>Website:</strong> ${s.website ? `<a href="${s.website}" target="_blank">Visit</a>` : "–"}</p>
    `;
    body.appendChild(info);

    /* ---------------- COMMENTS BUTTON ---------------- */
    const reviewsBtn = document.createElement("button");
    reviewsBtn.type = "button";
    reviewsBtn.className = "btn-ghost-small";
    reviewsBtn.textContent = "💬 View Comments / Reviews";
    reviewsBtn.addEventListener("click", e => {
      e.stopPropagation();
      if (window.openStoreModal) window.openStoreModal(s);
    });
    body.appendChild(reviewsBtn);

    /* ---------------- STATUS & RATING CHIP ---------------- */
    const statusRow = document.createElement("div");
    statusRow.className = "status-row";

    if (s.approved) statusRow.innerHTML += `<span class="pill green">APPROVED</span>`;
    if (s.flagged) statusRow.innerHTML += `<span class="pill red">FLAGGED</span>`;
    if (s.deleted) statusRow.innerHTML += `<span class="pill gray">DELETED</span>`;
    if (!s.approved && !s.flagged && !s.deleted)
      statusRow.innerHTML += `<span class="pill gold">PENDING</span>`;

    statusRow.innerHTML += `<span class="rating-chip">⭐ ${s.rating ?? "–"}</span>`;
    body.appendChild(statusRow);

    /* ---------------- MODERATION BUTTONS ---------------- */
    const actions = document.createElement("div");
    actions.className = "actions-row";

    actions.innerHTML = `
      <button class="btn green" onclick="approveStore(${s.id})">Approve</button>
      <button class="btn red" onclick="deleteStore(${s.id})">Delete</button>
      <button class="btn blue" onclick="editStore(${s.id})">Edit</button>
      <button class="btn orange" onclick="repairPhoto(${s.id})">Repair Photo</button>
    `;

    body.appendChild(actions);

    /* ---------------- FINAL ASSEMBLY ---------------- */
    card.appendChild(body);
    grid.appendChild(card);
  });
}

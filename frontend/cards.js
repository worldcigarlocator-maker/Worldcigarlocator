/* ============================================================
   FRONTEND CARDS — Backoffice layout, dark theme, no admin UI
   ============================================================ */

import { WCL, flagURL, photoURL } from "./globals.js";

export function renderCards(stores) {
  const grid = document.getElementById("storeGrid");
  if (!grid) return;
  grid.innerHTML = "";

  stores.forEach((s) => {
    const card = document.createElement("div");
    card.className = "store-card";

    /* =====================================
       PHOTO
    ====================================== */
    const img = document.createElement("img");
    img.className = "store-img";
    img.src = photoURL(s.photo_reference, 800);
    img.onerror = () => (img.src = WCL.FALLBACK_IMG);
    card.appendChild(img);

    /* =====================================
       BODY
    ====================================== */
    const body = document.createElement("div");
    body.className = "store-body";

    /* --------- NAME (2 lines) ---------- */
    const title = document.createElement("h3");
    title.className = "store-title";
    title.textContent = s.name || "Unnamed";
    body.appendChild(title);

    /* --------- TYPE + ACCESS ------------ */
    const typeWrap = document.createElement("div");
    typeWrap.className = "badge-row";

    // Same format as Backoffice
    const types = Array.isArray(s.types)
      ? s.types
      : (s.type ? s.type.split(",").map(t => t.trim().toLowerCase()) : []);

    types.forEach((raw) => {
      const t = raw.toLowerCase();
      if (t !== "store" && t !== "lounge") return;

      const span = document.createElement("span");
      span.className = `badge ${t}`;
      span.textContent = t.toUpperCase();
      typeWrap.appendChild(span);

      // access only for lounge
      if (t === "lounge" && s.access) {
        const acc = s.access.toLowerCase();
        const accSpan = document.createElement("span");
        accSpan.className = `badge access ${acc}`;
        accSpan.textContent = acc.toUpperCase();
        typeWrap.appendChild(accSpan);
      }
    });

    body.appendChild(typeWrap);

    /* --------- RATING STARS ------------- */
    const rating = document.createElement("div");
    rating.className = "stars";

    const r = Math.round(Number(s.rating) || 0);
    rating.textContent =
      "★★★★★☆☆☆☆☆".slice(5 - r, 10 - r); // same trick as BO
    body.appendChild(rating);

    /* --------- LOCATION ----------------- */
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
      const cont = document.createElement("div");
      cont.className = "continent-line";
      cont.textContent = s.continent.toUpperCase();
      loc.appendChild(cont);
    }

    body.appendChild(loc);

    /* --------- INFO BLOCK ---------------- */
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

    /* --------- COMMENTS BUTTON ----------- */
    const comments = document.createElement("button");
    comments.className = "comments-btn";
    comments.textContent = "💬 View Comments";

    comments.onclick = (e) => {
      e.stopPropagation();
      if (window.openStoreModal) window.openStoreModal(s);
    };

    body.appendChild(comments);

    /* --------- CLICK WHOLE CARD ---------- */
    card.onclick = () => {
      if (window.openStoreModal) window.openStoreModal(s);
    };

    card.appendChild(body);
    grid.appendChild(card);
  });
}

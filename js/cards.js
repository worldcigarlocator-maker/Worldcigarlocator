/* ============================================================
   FRONTEND — PERFECT NEW CARD RENDERING (MATCHES CARDS.CSS)
   ============================================================ */

import { WCL, flagURL, photoURL } from "./globals.js";

export function renderCards(stores) {
  const grid = document.getElementById("storeGrid");
  if (!grid) return;
  grid.innerHTML = "";

  stores.forEach((s) => {
    /* CARD */
    const card = document.createElement("div");
    card.className = "store-card";
    card.dataset.id = s.id;

    /* PHOTO */
    const img = document.createElement("img");
    img.className = "store-img";
    img.src = photoURL(s.photo_reference, 800);
    img.onerror = () => (img.src = WCL.FALLBACK_IMG);
    card.appendChild(img);

    /* BODY */
    const body = document.createElement("div");
    body.className = "store-body";

    /* TITLE (1 rad truncering) */
    const title = document.createElement("h3");
    title.className = "store-title";
    title.textContent = s.name || "";
    body.appendChild(title);

    /* ============================================================
       BADGE-ROW (TYPE + ACCESS)
       ============================================================ */
    const badgeRow = document.createElement("div");
    badgeRow.className = "badge-row";

    // normalize store type
    let t = "";
    if (Array.isArray(s.types) && s.types.length) {
      t = s.types[0].toLowerCase();
    } else if (typeof s.type === "string") {
      t = s.type.toLowerCase();
    }

    // Store / Lounge badge
    if (t === "store" || t === "lounge") {
      const b = document.createElement("span");
      b.className = "badge store";
      b.textContent = t.toUpperCase();
      badgeRow.appendChild(b);
    }

    // PUBLIC / MEMBERS
    if (t === "lounge" && s.access) {
      const acc = document.createElement("span");
      acc.className = `access ${s.access.toLowerCase()}`;
      acc.textContent = s.access.toUpperCase();
      badgeRow.appendChild(acc);
    }

    body.appendChild(badgeRow);

    /* ============================================================
       STARS
       ============================================================ */
    const stars = document.createElement("div");
    stars.className = "stars";
    const rating = Math.round(Number(s.rating) || 0);
    stars.textContent = "★★★★★☆☆☆☆☆".slice(5 - rating, 10 - rating);
    body.appendChild(stars);

    /* ---------------- LOCATION ---------------- */
const loc = document.createElement("div");
loc.className = "locrow";

/* First row: flag + Country, City */
const top = document.createElement("div");
top.className = "loc-top";

/* Flag */
const fsrc = flagURL(s.country, s.country_iso2);
if (fsrc) {
  const f = document.createElement("img");
  f.className = "flag";
  f.src = fsrc;
  top.appendChild(f);
}

/* Country + city */
const geo = document.createElement("span");
geo.className = "geo-main";
geo.textContent = [s.country, s.city].filter(Boolean).join(", ");
top.appendChild(geo);

loc.appendChild(top);

/* Second row: continent (Capitalized) */
if (s.continent) {
  const cont = document.createElement("div");
  cont.className = "continent-label";

  // Capitalize properly
  const nice =
    s.continent.charAt(0).toUpperCase() +
    s.continent.slice(1).toLowerCase();

  cont.textContent = nice;
  loc.appendChild(cont);
}

body.appendChild(loc);

    /* ============================================================
       SPACER
       ============================================================ */
    const sep = document.createElement("div");
    sep.className = "separator";
    body.appendChild(sep);

    /* ============================================================
       INFO LINES (always 1-row truncation)
       ============================================================ */

    // Address
    const line1 = document.createElement("div");
    line1.className = "info-line";
    line1.textContent = s.address || "–";
    body.appendChild(line1);

    // Phone
    const line2 = document.createElement("div");
    line2.className = "info-line";
    line2.textContent = s.phone || "–";
    body.appendChild(line2);

    // Website (link if exists)
    const line3 = document.createElement("div");
    line3.className = "info-line";
    if (s.website) {
      const a = document.createElement("a");
      a.href = s.website;
      a.target = "_blank";
      a.textContent = s.website;
      line3.appendChild(a);
    } else {
      line3.textContent = "–";
    }
    body.appendChild(line3);

    /* ============================================================
       BUTTON
       ============================================================ */
    const btn = document.createElement("button");
    btn.className = "reviews-btn";
    btn.textContent = "View details →";
    btn.onclick = (e) => {
      e.stopPropagation();
      if (window.openStoreModal) window.openStoreModal(s);
    };
    body.appendChild(btn);

    /* FULL CARD CLICK */
    card.addEventListener("click", () => {
      if (window.openStoreModal) window.openStoreModal(s);
    });

    card.appendChild(body);
    grid.appendChild(card);
  });
}

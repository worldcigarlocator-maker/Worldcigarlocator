import { WCL, flagURL, photoURL } from "./globals.js";

export function renderCards(stores = []) {
  const grid = document.getElementById("storeGrid");
  if (!grid) return;
  grid.innerHTML = "";

  if (!stores.length) {
    grid.innerHTML =
      "<p style='color:#999;text-align:center;margin-top:1rem;'>No results found.</p>";
    return;
  }

  stores.forEach((s) => {
    const card = document.createElement("div");
    card.className = "store-card";

    /* ---------- Photo ---------- */
    const img = document.createElement("img");
    img.className = "store-img";
    img.src = photoURL(s.photo_reference, 800);
    img.alt = s.name || "";
    img.onerror = () => (img.src = WCL.FALLBACK_IMG);
    card.appendChild(img);

    /* ---------- Body ---------- */
    const body = document.createElement("div");
    body.className = "store-body";

    /* Name */
    const title = document.createElement("h3");
    title.className = "store-title";
    title.textContent = s.name || "Unnamed";
    body.appendChild(title);

    /* Type badges */
    const badgeRow = document.createElement("div");
    badgeRow.className = "badge-row";

    const types = Array.isArray(s.types)
      ? s.types
      : s.type
      ? [s.type]
      : [];

    if (types.length) {
      types.forEach((tRaw) => {
        const t = String(tRaw).toLowerCase();
        const b = document.createElement("span");
        b.className =
          "badge " +
          (t === "store"
            ? "blue"
            : t === "lounge"
            ? "gold"
            : "gray");
        b.textContent = t;
        badgeRow.appendChild(b);

        if (t === "lounge" && s.access) {
          const acc = document.createElement("span");
          const val = String(s.access).toLowerCase();
          acc.className =
            "badge access " +
            (val === "public"
              ? "green"
              : val === "members"
              ? "purple"
              : "gray");
          acc.textContent = val.toUpperCase();
          badgeRow.appendChild(acc);
        }
      });
    }

    body.appendChild(badgeRow);

    /* Stars (rating only once!) */
    const starsRow = document.createElement("div");
    starsRow.className = "stars-row";
    const rating = Math.round(Number(s.rating) || 0);

    for (let i = 1; i <= 5; i++) {
      const span = document.createElement("span");
      span.className = "star" + (i <= rating ? " filled" : "");
      span.textContent = "★";
      starsRow.appendChild(span);
    }
    body.appendChild(starsRow);

    /* Location */
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

    const countrySpan = document.createElement("span");
    countrySpan.className = "loc-country";
    countrySpan.textContent = s.country || "Unknown";
    top.appendChild(countrySpan);

    loc.appendChild(top);

    if (s.continent) {
      const cont = document.createElement("div");
      cont.className = "loc-continent";
      cont.textContent = String(s.continent).toUpperCase();
      loc.appendChild(cont);
    }

    body.appendChild(loc);

    /* Info block */
    const info = document.createElement("div");
    info.className = "infoblock";

    const addr = document.createElement("p");
    addr.innerHTML = `<strong>Address:</strong> <span>${s.address || "–"}</span>`;
    info.appendChild(addr);

    const phone = document.createElement("p");
    phone.innerHTML = `<strong>Phone:</strong> <span>${s.phone || "–"}</span>`;
    info.appendChild(phone);

    const web = document.createElement("p");
    if (s.website) {
      const safeUrl = String(s.website);
      web.innerHTML = `<strong>Website:</strong> <span><a href="${safeUrl}" target="_blank" rel="noopener">Visit</a></span>`;
    } else {
      web.innerHTML = `<strong>Website:</strong> <span>–</span>`;
    }
    info.appendChild(web);

    body.appendChild(info);

    /* Divider */
    const divider = document.createElement("div");
    divider.className = "card-divider";
    body.appendChild(divider);

    /* Comments button */
    const commentsRow = document.createElement("div");
    commentsRow.className = "comments-row";

    const btn = document.createElement("button");
    btn.className = "btn-comments";
    btn.type = "button";
    btn.innerHTML = `<span>💬</span><span>View Comments / Rating</span>`;
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (window.openStoreModal) window.openStoreModal(s);
    });

    commentsRow.appendChild(btn);
    body.appendChild(commentsRow);

    /* Click hela kortet öppnar samma modal */
    card.addEventListener("click", () => {
      if (window.openStoreModal) window.openStoreModal(s);
    });

    card.appendChild(body);
    grid.appendChild(card);
  });
}


/* ============================================================
   cards.js — WCL Frontend Cards (NO MODULES)
   Exposes: window.loadStores, window.resetToHero
   Depends on: globals.js (window.WCL)
   ============================================================ */
(function () {
  "use strict";

  const WCL = window.WCL;
  if (!WCL || !WCL.supabase) {
    console.error("cards.js: WCL or supabase missing (globals.js failed?)");
    return;
  }

  const CFG = WCL.config;

  function safe(v) { return (v ?? "").toString(); }

  function buildPhoto(photo_reference, maxwidth = 1000) {
    if (!photo_reference) return CFG.FALLBACK_IMG;
    return `${CFG.PHOTO_PROXY_URL}?photo_reference=${encodeURIComponent(photo_reference)}&maxwidth=${maxwidth}`;
  }

  function flagUrl(country_iso2) {
    if (!country_iso2) return "";
    return `${CFG.FLAGS_BASE}/${String(country_iso2).toLowerCase()}.svg`;
  }

  // ---------- HERO ----------
  function resetToHero() {
    const heroText = qs("#heroText");
    const heroImage = qs("#heroImage");
    const heading = qs("#resultHeading");
    const grid = qs("#storeGrid");

    heading.style.display = "none";
    heading.textContent = "";
    grid.innerHTML = "";

    heroText && (heroText.style.display = "block");
    heroImage && (heroImage.style.display = "block");
  }

  // ---------- RENDER ----------
  function renderHeading(text) {
    const heroText = qs("#heroText");
    const heroImage = qs("#heroImage");
    const heading = qs("#resultHeading");

    heroText && (heroText.style.display = "none");
    heroImage && (heroImage.style.display = "none");

    heading.style.display = "block";
    heading.textContent = text || "";
  }

  function renderCards(rows) {
    const grid = qs("#storeGrid");
    grid.innerHTML = "";

    if (!rows.length) {
      grid.innerHTML = `<p class="muted center">No results.</p>`;
      return;
    }

    rows.forEach((s) => {
      const card = document.createElement("div");
      card.className = "store-card";

      const img = document.createElement("img");
      img.className = "store-img";
      img.src = buildPhoto(s.photo_reference, 900);
      img.onerror = () => (img.src = CFG.FALLBACK_IMG);

      const body = document.createElement("div");
      body.className = "store-body";

      const name = document.createElement("h3");
      name.className = "store-name";
      name.textContent = safe(s.name);

      const loc = document.createElement("div");
      loc.className = "store-loc";

      const flag = document.createElement("img");
      flag.className = "flag";
      const f = flagUrl(s.country_iso2);
      if (f) {
        flag.src = f;
        flag.onerror = () => (flag.style.display = "none");
        loc.appendChild(flag);
      }

      const locText = document.createElement("span");
      locText.textContent = `${safe(s.country)}${s.city ? ", " + safe(s.city) : ""}`;
      loc.appendChild(locText);

      const meta = document.createElement("div");
      meta.className = "store-meta";
      meta.innerHTML = `
        <span class="meta-line"><strong>Type:</strong> ${safe(s.type || (Array.isArray(s.types) ? s.types.join(", ") : "–"))}</span>
        <span class="meta-line"><strong>Rating:</strong> ${s.rating ?? "–"}</span>
      `;

      body.append(name, loc, meta);
      card.append(img, body);

      card.addEventListener("click", () => openModal(s));
      grid.appendChild(card);
    });
  }

  // ---------- DATA ----------
  async function loadStores(filters = {}, searchQuery = "") {
    const sb = WCL.supabase;

    // base query from your approved frontend view
    let q = sb
      .from("stores_frontend_public_v4")
      .select("*")
      .order("id", { ascending: false });

    // filters from sidebar
    if (filters.continent) q = q.eq("continent", filters.continent);
    if (filters.country) q = q.eq("country", filters.country);
    if (filters.city) q = q.eq("city", filters.city);

    // simple search (name/city/country)
    const term = (searchQuery || "").trim();
    if (term) {
      // ilike across 3 columns (OR)
      q = q.or(
        `name.ilike.%${term}%,city.ilike.%${term}%,country.ilike.%${term}%`
      );
    }

    const { data, error } = await q;
    if (error) {
      console.error(error);
      renderHeading("Error loading stores");
      qs("#storeGrid").innerHTML = `<p class="error center">Failed to load stores.</p>`;
      return;
    }

    renderHeading(term ? `Results for "${term}"` : "Results");
    renderCards(data || []);
  }

  // ---------- MODAL (uses your existing markup ids) ----------
  function openModal(s) {
    const modal = qs("#storeModal");
    modal.classList.remove("hidden");

    qs("#modalImg").src = buildPhoto(s.photo_reference, 1200);
    qs("#modalImg").onerror = () => (qs("#modalImg").src = CFG.FALLBACK_IMG);

    qs("#modalName").textContent = safe(s.name);

    const badges = qs("#modalBadges");
    badges.innerHTML = "";
    // Basic badges
    const types = Array.isArray(s.types) ? s.types : (s.type ? [s.type] : []);
    types.forEach((t) => {
      const b = document.createElement("span");
      b.className = "badge";
      b.textContent = t;
      badges.appendChild(b);
    });
    if (s.access) {
      const a = document.createElement("span");
      a.className = "badge";
      a.textContent = String(s.access).toUpperCase();
      badges.appendChild(a);
    }

    qs("#modalStars").textContent = `⭐ ${s.rating ?? "–"}`;

    const flag = qs("#modalFlag");
    const f = flagUrl(s.country_iso2);
    if (f) {
      flag.src = f;
      flag.style.display = "";
      flag.onerror = () => (flag.style.display = "none");
    } else {
      flag.style.display = "none";
    }

    qs("#modalLocation").textContent = `${safe(s.country)}${s.city ? ", " + safe(s.city) : ""}`;
    qs("#modalAddress").textContent = safe(s.address || "–");
    qs("#modalPhone").textContent = safe(s.phone || "–");

    const web = qs("#modalWebsite");
    if (s.website) {
      web.href = s.website;
      web.textContent = "Visit";
      web.style.pointerEvents = "";
      web.style.opacity = "";
    } else {
      web.href = "#";
      web.textContent = "–";
      web.style.pointerEvents = "none";
      web.style.opacity = "0.6";
    }

    // Close handlers
    modal.querySelector(".modal-close")?.addEventListener("click", closeModal, { once: true });
    modal.querySelector(".modal-backdrop")?.addEventListener("click", closeModal, { once: true });
  }

  function closeModal() {
    qs("#storeModal").classList.add("hidden");
  }

  // expose
  window.loadStores = loadStores;
  window.resetToHero = resetToHero;

  console.log("✅ cards.js loaded");
})();

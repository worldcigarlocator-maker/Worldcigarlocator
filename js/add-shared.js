/* ==========================================================
   add-shared.js
   Shared logic for Add/Edit Store (Public + Backoffice)
   Canonical & Safe
   ========================================================== */

(function () {
  "use strict";

  /* ==========================================================
     🔐 CONFIG (read-only)
     ========================================================== */
  const CONFIG = Object.freeze({
    SUPABASE_URL: "https://gbxxoeplkzbhsvagnfsr.supabase.co",
    SUPABASE_ANON_KEY:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4",

    GOOGLE_BROWSER_KEY:
      "AIzaSyDdn7E6_dfwUjGQ1IUdJ2rQXUeEYIIzVtQ",

    PHOTO_PROXY_URL:
      "https://gbxxoeplkzbhsvagnfsr.functions.supabase.co/photo-proxy",

    PHOTO_REFS_URL:
      "https://gbxxoeplkzbhsvagnfsr.functions.supabase.co/photo-refs",

    STORE_FALLBACK:
      "https://worldcigarlocator-maker.github.io/Worldcigarlocator/images/store.jpg",

    LOUNGE_FALLBACK:
      "https://worldcigarlocator-maker.github.io/Worldcigarlocator/images/lounge.jpg",
  });

  /* ==========================================================
     🧩 GLOBAL NAMESPACE (safe)
     ========================================================== */
  window.WCL = window.WCL || {};

  /* ==========================================================
     🧩 SUPABASE CLIENT (single instance)
     ========================================================== */
  const supabase =
    window.WCL.supabase ||
    window.supabase.createClient(
      CONFIG.SUPABASE_URL,
      CONFIG.SUPABASE_ANON_KEY
    );

  /* ==========================================================
     🌍 COUNTRY → CONTINENT (deterministic)
     ========================================================== */
  function countryToContinent(country = "", iso2 = "") {
    const i = iso2.toLowerCase().trim();
    const c = country.toLowerCase().trim();

    const ISO_MAP = {
      gb: "Europe", se: "Europe", no: "Europe", fi: "Europe", dk: "Europe",
      fr: "Europe", de: "Europe", es: "Europe", it: "Europe", nl: "Europe",
      be: "Europe", pt: "Europe", pl: "Europe", ch: "Europe", at: "Europe",

      us: "North America", ca: "North America", mx: "North America",
      br: "South America", ar: "South America", cl: "South America",

      cn: "Asia", jp: "Asia", in: "Asia", tr: "Asia", ae: "Asia", sg: "Asia",

      za: "Africa", ng: "Africa", eg: "Africa",

      au: "Oceania", nz: "Oceania",
    };

    if (ISO_MAP[i]) return ISO_MAP[i];

    if (c.includes("united kingdom") || c.includes("england")) return "Europe";
    if (c.includes("united states") || c === "usa") return "North America";
    if (c.includes("brazil") || c.includes("argentina")) return "South America";
    if (c.includes("china") || c.includes("japan")) return "Asia";
    if (c.includes("south africa")) return "Africa";
    if (c.includes("australia")) return "Oceania";

    return "Other";
  }

  /* ==========================================================
     🏴 UK STATE NORMALIZATION (explicit)
     ========================================================== */
  function normalizeUKState(state = "", country = "", city = "") {
    if (!country.toLowerCase().includes("united kingdom")) {
      return state || null;
    }

    const s = state.toLowerCase();
    const c = city.toLowerCase();

    if (s.includes("scotland") || /edinburgh|glasgow/.test(c)) return "Scotland";
    if (s.includes("wales") || /cardiff|swansea/.test(c)) return "Wales";
    if (s.includes("northern ireland") || /belfast/.test(c))
      return "Northern Ireland";

    return "England";
  }

  /* ==========================================================
     📸 PHOTO HELPERS (safe)
     ========================================================== */
  function fallbackForType(type = "store") {
    return String(type).includes("lounge")
      ? CONFIG.LOUNGE_FALLBACK
      : CONFIG.STORE_FALLBACK;
  }

  function buildProxyUrl(ref, width = 800) {
    if (!ref) return null;
    return `${CONFIG.PHOTO_PROXY_URL}?photo_reference=${encodeURIComponent(
      ref
    )}&maxwidth=${width}`;
  }

  async function fetchPhotoRefs(placeId) {
    if (!placeId) return [];
    try {
      const res = await fetch(
        `${CONFIG.PHOTO_REFS_URL}?place_id=${encodeURIComponent(placeId)}`
      );
      if (!res.ok) return [];
      const json = await res.json();
      return Array.isArray(json?.refs) ? json.refs : [];
    } catch {
      return [];
    }
  }

  async function loadProxyPhotoInto(img, ref, type = "store") {
    if (!img) return;
    if (!ref) {
      img.src = fallbackForType(type);
      return;
    }

    try {
      const res = await fetch(buildProxyUrl(ref));
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      img.src = URL.createObjectURL(blob);
    } catch {
      img.src = fallbackForType(type);
    }
  }

  /* ==========================================================
     🔔 TOAST (shared UI utility)
     ========================================================== */
  function toastShared(msg, level = "info") {
    let wrap = document.getElementById("toast-container");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.id = "toast-container";
      wrap.style.cssText =
        "position:fixed;bottom:1rem;right:1rem;z-index:9999;display:flex;flex-direction:column;gap:.4rem";
      document.body.appendChild(wrap);
    }

    const t = document.createElement("div");
    t.textContent = msg;
    t.style.cssText = `
      padding:.6rem 1rem;
      border-radius:6px;
      font-size:.9rem;
      color:#fff;
      background:${
        level === "error" ? "#dc3545" :
        level === "success" ? "#28a745" : "#333"
      };
    `;

    wrap.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  /* ==========================================================
     ✅ EXPORT (single source of truth)
     ========================================================== */
  Object.assign(window.WCL, {
    supabase,

    GOOGLE_BROWSER_KEY: CONFIG.GOOGLE_BROWSER_KEY,

    PHOTO_PROXY_URL: CONFIG.PHOTO_PROXY_URL,
    PHOTO_REFS_URL: CONFIG.PHOTO_REFS_URL,

    fallbackForType,
    buildProxyUrl,
    fetchPhotoRefs,
    loadProxyPhotoInto,

    countryToContinent,
    normalizeUKState,

    toastShared,
  });
})();

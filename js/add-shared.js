/* ==========================================================
   add-shared.js — Shared logic for Add/Edit Store (PUBLIC + BO)
   CANONICAL • SAFE • BACKEND-DRIVEN GEO
   ========================================================== */

(() => {
  "use strict";

  /* ===================== SUPABASE ===================== */
  const SUPABASE_URL = "https://gbxxoeplkzbhsvagnfsr.supabase.co";
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieHhvZXBsa3piaHN2YWduZnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjQ1MDAsImV4cCI6MjA3MzI0MDUwMH0.E4Vk-GyLe22vyyfRy05hZtf4t5w_Bd_B-tkEFZ1alT4";

  const sb = window.supabase?.createClient?.(SUPABASE_URL, SUPABASE_ANON_KEY);
  if (!sb) {
    console.error("Supabase SDK missing. Load supabase-js before add-shared.js");
    return;
  }

  /* ===================== GLOBAL WCL ===================== */
  window.WCL = window.WCL || {};
  window.WCL.supabase = sb;

  /* ===================== GOOGLE ===================== */
  window.WCL.GOOGLE_BROWSER_KEY =
    "AIzaSyDdn7E6_dfwUjGQ1IUdJ2rQXUeEYIIzVtQ";

  /* ===================== MEDIA ===================== */
  window.WCL.PHOTO_PROXY_URL =
    "https://gbxxoeplkzbhsvagnfsr.functions.supabase.co/photo-proxy";
  window.WCL.PHOTO_REFS_URL =
    "https://gbxxoeplkzbhsvagnfsr.functions.supabase.co/photo-refs";

  window.WCL.GITHUB_STORE_FALLBACK =
    "https://worldcigarlocator-maker.github.io/Worldcigarlocator/images/store.jpg";
  window.WCL.GITHUB_LOUNGE_FALLBACK =
    "https://worldcigarlocator-maker.github.io/Worldcigarlocator/images/lounge.jpg";

  /* ==========================================================
     Geography ownership
     ==========================================================
     Frontend:
       - skickar country + country_iso2
       - SÄTTER ALDRIG continent

     Backend:
       - geo_countries (iso2 -> continent)
       - trigger sätter continent
  ========================================================== */

  /* ===================== UK STATE NORMALIZATION ===================== */
  function normalizeUKState(state, country, city) {
    const ctry = String(country || "").toLowerCase();
    if (!ctry.includes("united kingdom") && ctry !== "uk" && ctry !== "gb") {
      return state || null;
    }

    const c = String(city || "").toLowerCase();
    const s = String(state || "").toLowerCase();

    if (s.includes("scotland") || c.match(/edinburgh|glasgow|aberdeen/)) {
      return "Scotland";
    }
    if (s.includes("wales") || c.match(/cardiff|swansea|newport/)) {
      return "Wales";
    }
    if (s.includes("northern") || c.match(/belfast|derry|lisburn/)) {
      return "Northern Ireland";
    }

    return "England";
  }

  /* ===================== PHOTO HELPERS ===================== */
  function fallbackForType(type = "store") {
    const t = String(type || "").toLowerCase();
    return t.includes("lounge")
      ? window.WCL.GITHUB_LOUNGE_FALLBACK
      : window.WCL.GITHUB_STORE_FALLBACK;
  }

  function buildProxyUrl(ref, maxwidth = 800) {
    if (!ref) return null;
    return `${window.WCL.PHOTO_PROXY_URL}?photo_reference=${encodeURIComponent(
      ref
    )}&maxwidth=${maxwidth}`;
  }

  async function fetchPhotoRefs(placeId) {
    if (!placeId) return [];
    try {
      const res = await fetch(
        `${window.WCL.PHOTO_REFS_URL}?place_id=${encodeURIComponent(placeId)}`
      );
      if (!res.ok) return [];
      const json = await res.json();
      return Array.isArray(json?.refs) ? json.refs : [];
    } catch (e) {
      console.warn("fetchPhotoRefs failed:", e);
      return [];
    }
  }

  async function loadProxyPhotoInto(img, ref, type = "store") {
    if (!img) return;

    const fallback = fallbackForType(type);
    if (!ref) {
      img.src = fallback;
      return;
    }

    try {
      const res = await fetch(buildProxyUrl(ref));
      if (!res.ok) {
        img.src = fallback;
        return;
      }
      const blob = await res.blob();
      img.src = URL.createObjectURL(blob);
    } catch (e) {
      console.warn("loadProxyPhotoInto failed:", e);
      img.src = fallback;
    }
  }

  /* ===================== DUPLICATE CHECK ===================== */
  function norm(v) {
    return String(v || "").trim().toLowerCase();
  }

  function streetFromAddress(address) {
    return String(address || "").split(",")[0].trim();
  }

  async function checkDuplicates(place) {
    const { address, city, country } = place || {};
    if (!address || !city || !country) {
      return { exact: [], possible: [] };
    }

    const street = streetFromAddress(address);

    try {
      const { data, error } = await sb
        .from("stores_frontend_public_v5")
        .select(
          "id,name,address,city,country,types,approved,deleted,flagged,flag_reason"
        )
        .eq("deleted", false)
        .ilike("city", city)
        .ilike("country", country)
        .ilike("address", `%${street}%`);

      if (error || !Array.isArray(data)) {
        if (error) console.warn("checkDuplicates error:", error);
        return { exact: [], possible: [] };
      }

      const exact = [];
      const possible = [];

      for (const s of data) {
        const sameName = norm(s.name) === norm(place.name);
        const sameAddress = norm(s.address) === norm(place.address);

        if (sameName && sameAddress) exact.push(s);
        else possible.push(s);
      }

      return { exact, possible };
    } catch (e) {
      console.warn("checkDuplicates failed:", e);
      return { exact: [], possible: [] };
    }
  }

  /* ===================== TOAST ===================== */
  function toastShared(msg, type = "info") {
    let c = document.getElementById("toast-container");
    if (!c) {
      c = document.createElement("div");
      c.id = "toast-container";
      c.style.position = "fixed";
      c.style.bottom = "1rem";
      c.style.right = "1rem";
      c.style.zIndex = "9999";
      c.style.display = "flex";
      c.style.flexDirection = "column";
      c.style.gap = ".4rem";
      document.body.appendChild(c);
    }

    const t = document.createElement("div");
    t.textContent = msg;
    t.style.background =
      type === "error"
        ? "#dc3545"
        : type === "success"
        ? "#28a745"
        : "#333";
    t.style.color = "#fff";
    t.style.padding = ".6rem 1rem";
    t.style.borderRadius = "6px";
    t.style.fontSize = ".9rem";
    c.appendChild(t);

    setTimeout(() => t.remove(), 3000);
  }

  /* ===================== EXPORTS ===================== */
  Object.assign(window.WCL, {
    normalizeUKState,
    fallbackForType,
    buildProxyUrl,
    fetchPhotoRefs,
    loadProxyPhotoInto,
    checkDuplicates,
    toastShared,
  });

})();

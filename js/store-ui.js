// ============================================================
// store-ui.js — Shared UI helpers (Cards + Modal)
// Canonical · No state
// ============================================================

const FALLBACK_IMAGE = "images/store.jpg";
const PHOTO_PROXY_BASE = "https://gbxxoeplkzbhsvagnfsr.functions.supabase.co";

// FLAG
export function getFlagUrl(store) {
  const iso = store?.country_iso2?.toLowerCase?.();
  if (!iso) return null;
  return `assets/flags/${iso}.svg`;
}

// BADGES (same markup used by cards + modal)
export function buildBadges(store) {
  const badges = [];
  const arr = Array.isArray(store?.types)
    ? store.types.map((t) => String(t).toLowerCase())
    : [];

  if (arr.includes("store"))
    badges.push(`<span class="badge badge-store">Store</span>`);
  if (arr.includes("lounge"))
    badges.push(`<span class="badge badge-lounge">Lounge</span>`);

  const A = String(store?.access || "").trim().toLowerCase();
  if (A === "public") {
    badges.push(
      `<span class="badge badge-access badge-access-public">PUBLIC</span>`
    );
  } else if (A) {
    badges.push(`<span class="badge badge-access">${A.toUpperCase()}</span>`);
  }

  return badges.join(" ");
}

// PHOTO
export function getPhotoUrl(store) {
  if (store?.photo_url) return store.photo_url;
  if (store?.photo_cdn_url) return store.photo_cdn_url;

  if (store?.photo_reference) {
    return `${PHOTO_PROXY_BASE}/photo-proxy?photo_reference=${encodeURIComponent(
      store.photo_reference
    )}&maxwidth=800`;
  }

  return FALLBACK_IMAGE;
}

// ============================================================
// VIEW-DEDUPE.JS — WCL STORE VIEW DEDUPE
// Prevents multiple store_viewed events per session
// ============================================================

const VIEW_KEY = "wcl_viewed_stores";

export function hasViewedStore(storeId) {
  const raw = localStorage.getItem(VIEW_KEY);

  if (!raw) return false;

  try {
    const viewed = JSON.parse(raw);
    return viewed.includes(storeId);
  } catch {
    return false;
  }
}

export function markStoreViewed(storeId) {
  let viewed = [];

  const raw = localStorage.getItem(VIEW_KEY);

  if (raw) {
    try {
      viewed = JSON.parse(raw);
    } catch {}
  }

  if (!viewed.includes(storeId)) {
    viewed.push(storeId);
    localStorage.setItem(VIEW_KEY, JSON.stringify(viewed));
  }
}

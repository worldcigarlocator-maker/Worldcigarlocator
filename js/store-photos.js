/* ============================================================
   WCL Store Photos
   Hydrates public store rows with WCL-controlled photo_url.
   ============================================================ */

import { debugLog, supabase } from "/js/globals.js";

let warnedMissingRpc = false;

export async function hydrateStorePhotoUrls(stores) {
  if (!Array.isArray(stores) || !stores.length) return stores || [];

  const ids = [
    ...new Set(
      stores
        .filter((store) => store && !store.photo_url)
        .map((store) => Number(store.id))
        .filter(Boolean)
    )
  ];

  if (!ids.length) return stores;

  const photoMap = await loadPhotoUrlMap(ids);
  if (!photoMap.size) return stores;

  stores.forEach((store) => {
    const photoUrl = photoMap.get(Number(store.id));
    if (photoUrl) store.photo_url = photoUrl;
  });

  return stores;
}

export async function hydrateStorePhotoUrl(store) {
  if (!store || store.photo_url || !store.id) return store;

  await hydrateStorePhotoUrls([store]);
  return store;
}

async function loadPhotoUrlMap(ids) {
  const { data, error } = await supabase.rpc("store_photo_urls_v1", {
    p_store_ids: ids
  });

  if (error) {
    if (!warnedMissingRpc) {
      warnedMissingRpc = true;
      debugLog("store_photo_urls_v1 unavailable:", error);
    }
    return new Map();
  }

  return new Map(
    (data || [])
      .filter((row) => row?.id && row?.photo_url)
      .map((row) => [Number(row.id), row.photo_url])
  );
}

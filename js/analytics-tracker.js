import { supabase } from "./globals.js";

// ============================================================
// SESSION ID
// ============================================================

function getSessionId() {

  let id = localStorage.getItem("wcl_session_id");

  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("wcl_session_id", id);
  }

  return id;

}

// ============================================================
// STORE VIEW MEMORY (dedupe)
// ============================================================

const VIEWED_STORES = new Set();

function hasViewedStore(id) {
  return VIEWED_STORES.has(id);
}

function markStoreViewed(id) {
  VIEWED_STORES.add(id);
}

export async function trackEvent(eventType, payload = {}) {

  try {

    // ============================================================
    // STORE VIEW DEDUPE
    // ============================================================

    if (eventType === "store_viewed" && payload.store_id) {

      if (hasViewedStore(payload.store_id)) {
        return;
      }

      markStoreViewed(payload.store_id);

    }

    // ============================================================
    // SESSION HASH
    // ============================================================

    payload.session_hash = getSessionId();

    // ============================================================
    // INSERT EVENT
    // ============================================================

    await supabase
      .from("analytics_events")
      .insert({
        event_type: eventType,
        payload
      });

  } catch (err) {

    console.warn("Analytics event failed", err);

  }

}

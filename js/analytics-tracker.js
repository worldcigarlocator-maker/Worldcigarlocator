```js
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

// ============================================================
// TRACK EVENT (CANONICAL)
// ============================================================

export async function trackEvent(eventType, payload = {}) {

  try {

    // ============================================================
    // STORE VIEW DEDUPE (CANONICAL EVENT NAME)
    // ============================================================

    if (eventType === "store_view" && payload.store_id) {

      if (hasViewedStore(payload.store_id)) {
        return;
      }

      markStoreViewed(payload.store_id);

    }

    // ============================================================
    // SESSION HASH
    // ============================================================

    const finalPayload = {
      event_type: eventType,
      source: window.CURRENT_SOURCE ?? "direct",
      session_hash: getSessionId(),
      ...payload
    };

    // ============================================================
    // EDGE INGEST (NO DIRECT DB WRITE)
    // ============================================================

    await fetch("/functions/v1/analytics-ingest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(finalPayload)
    });

  } catch (err) {

    console.warn("Analytics event failed", err);

  }

}
```

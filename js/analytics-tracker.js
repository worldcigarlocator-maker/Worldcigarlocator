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
// STORE VIEW MEMORY (DEDUPE)
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

    // ------------------------------------------------------------
    // STORE VIEW DEDUPE
    // ------------------------------------------------------------
    if (eventType === "store_view" && payload.store_id) {
      if (hasViewedStore(payload.store_id)) return;
      markStoreViewed(payload.store_id);
    }

    // ------------------------------------------------------------
    // BUILD PAYLOAD
    // ------------------------------------------------------------
const finalPayload = {
  event_type: eventType,

  // 🔥 KRITISK FIX
  source:
    payload.source ??
    window.MODAL_SOURCE ??
    window.CURRENT_SOURCE ??
    "direct",

  session_hash: getSessionId(),

  ...payload
};

    // ------------------------------------------------------------
    // ENDPOINT
    // ------------------------------------------------------------
    const endpoint =
      "https://gbxxoeplkzbhsvagnfsr.functions.supabase.co/functions/v1/analytics-ingest";

    // ------------------------------------------------------------
    // DEBUG LOGS (VIKTIGA NU)
    // ------------------------------------------------------------
    console.log("🚀 ANALYTICS PAYLOAD:", finalPayload);
    console.log("🌐 ENDPOINT:", endpoint);

    // ------------------------------------------------------------
    // FETCH
    // ------------------------------------------------------------
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(finalPayload)
    });

    // ------------------------------------------------------------
    // RESPONSE DEBUG
    // ------------------------------------------------------------
    console.log("📡 RESPONSE STATUS:", res.status);

    const text = await res.text();
    console.log("📦 RESPONSE BODY:", text);

    if (!res.ok) {
      console.error("❌ ANALYTICS ERROR:", res.status, text);
    } else {
      console.log("✅ ANALYTICS SENT");
    }

  } catch (err) {

    console.error("💥 ANALYTICS CRASH:", err);

  }

}

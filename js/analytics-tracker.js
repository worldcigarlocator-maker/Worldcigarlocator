import { supabase } from "/js/globals.js";


/* ============================================================
   GEO (IP → Country)
   ============================================================ */

let GEO = null;

async function getGeo() {
  if (GEO) return GEO;

  try {
    const res = await fetch("https://ipapi.co/json/");
    const data = await res.json();

    GEO = {
      country: data.country_name,
      country_code: data.country_code,
      city: data.city
    };

    return GEO;
  } catch (err) {
    console.warn("GEO FAILED", err);
    return null;
  }
}

// ============================================================
// SESSION START (AUTO)
// ============================================================

(function trackSessionStart() {

  try {

    let session = localStorage.getItem("wcl_session");

    if (!session) {
      session = crypto.randomUUID();
      localStorage.setItem("wcl_session", session);

      // 🔥 TRACKA ENDAST NY SESSION
trackEvent("session_start", {
  session_hash: session
});

      console.log("🔥 SESSION START:", session);
    }

  } catch (err) {
    console.error("Session tracking failed", err);
  }

})();


// ============================================================
// SESSION ID (SINGLE SOURCE OF TRUTH)
// ============================================================

function getSessionId() {
  let id = localStorage.getItem("wcl_session");

  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("wcl_session", id);
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
const geo = await getGeo();

let geo = GEO;

if (!geo) {
  geo = await getGeo();
}

const finalPayload = {
  event_type: eventType,
  session_hash: getSessionId(),

  source:
    payload?.source ??
    window?.MODAL_SOURCE ??
    window?.CURRENT_SOURCE ??
    "direct",

  ...payload,

  // 🔥 GEO SIST (VIKTIGT)
  country: geo?.country || null,
  city: geo?.city || null
};

    // ------------------------------------------------------------
    // ENDPOINT
    // ------------------------------------------------------------
    const endpoint =
      "https://gbxxoeplkzbhsvagnfsr.functions.supabase.co/functions/v1/analytics-ingest";

    // ------------------------------------------------------------
    // DEBUG LOGS (VIKTIGA NU)
    // ------------------------------------------------------------
    console.log("🚀 ANALYTICS PAYLOAD:", JSON.stringify(finalPayload, null, 2));
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

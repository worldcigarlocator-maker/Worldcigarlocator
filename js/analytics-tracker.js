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

/* ============================================================
   SESSION START (AUTO)
   ============================================================ */

(function trackSessionStart() {
  try {
    let session = localStorage.getItem("wcl_session");

    if (!session) {
      session = crypto.randomUUID();
      localStorage.setItem("wcl_session", session);

      trackEvent("session_start", {
        session_hash: session,
        source: "direct"
      });

      console.log("🔥 SESSION START:", session);
    }
  } catch (err) {
    console.error("Session tracking failed", err);
  }
})();

/* ============================================================
   SESSION ID
   ============================================================ */

function getSessionId() {
  let id = localStorage.getItem("wcl_session");

  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("wcl_session", id);
  }

  return id;
}

/* ============================================================
   STORE VIEW DEDUPE
   ============================================================ */

const VIEWED_STORES = new Set();

function hasViewedStore(id) {
  return VIEWED_STORES.has(id);
}

function markStoreViewed(id) {
  VIEWED_STORES.add(id);
}

/* ============================================================
   TRACK EVENT (CANONICAL)
   ============================================================ */

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
    // GEO
    // ------------------------------------------------------------
    let geo = GEO;
    if (!geo) geo = await getGeo();

    // ------------------------------------------------------------
    // SOURCE (STRICT — NO OVERRIDE)
    // ------------------------------------------------------------
    const resolvedSource =
      payload?.source ??
      window?.MODAL_SOURCE ??
      window?.CURRENT_SOURCE ??
      "direct";

    // ------------------------------------------------------------
    // BUILD PAYLOAD
    // ------------------------------------------------------------
const finalPayload = {
  event_type: eventType,

  session_hash:
    payload?.session_hash ||
    localStorage.getItem("wcl_session") ||
    getSessionId(),

  // 🔒 SOURCE (orörd)
  source: (() => {
    if (payload?.source) return payload.source;
    if (window?.MODAL_SOURCE) return window.MODAL_SOURCE;
    if (window?.CURRENT_SOURCE) return window.CURRENT_SOURCE;

    if (eventType === "store_view") return "map";
    if (eventType === "store_opened") return "search";

    return "direct";
  })(),

  // 🔥 STORE GEO (från payload)
  store_country: payload?.country || null,
  store_city: payload?.city || null,

  // 🔥 USER GEO (från IP)
  user_country: geo?.country || null,
  user_city: geo?.city || null,

  // resten av payload (utan att skriva över ovan)
  ...payload
};

    // ------------------------------------------------------------
    // ENDPOINT
    // ------------------------------------------------------------
    const endpoint =
      "https://gbxxoeplkzbhsvagnfsr.functions.supabase.co/functions/v1/analytics-ingest";

    // ------------------------------------------------------------
    // DEBUG
    // ------------------------------------------------------------
    console.log("🚀 ANALYTICS PAYLOAD:", JSON.stringify(finalPayload, null, 2));

    // ------------------------------------------------------------
    // SEND
    // ------------------------------------------------------------
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(finalPayload)
    });

    const text = await res.text();

    if (!res.ok) {
      console.error("❌ ANALYTICS ERROR:", res.status, text);
    } else {
      console.log("✅ ANALYTICS SENT");
    }

  } catch (err) {
    console.error("💥 ANALYTICS CRASH:", err);
  }
}

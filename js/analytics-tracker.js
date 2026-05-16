/* ============================================================
   WCL — ANALYTICS TRACKER
   CANONICAL · VISITOR + DAILY SESSION MODEL
   ============================================================ */
/* ============================================================
   IMPORTS
   ============================================================ */

import { supabase } from "/js/globals.js";

/* ============================================================
   CONFIG
   ============================================================ */

const ANALYTICS_ENDPOINT =
  "https://gbxxoeplkzbhsvagnfsr.functions.supabase.co/functions/v1/analytics-ingest";

const VISITOR_KEY = "wcl_visitor_id";
const SESSION_KEY = "wcl_session_id";
const SESSION_DATE_KEY = "wcl_session_date";
const ANALYTICS_DEBUG = Boolean(window?.WCL_DEBUG_ANALYTICS);

/* Legacy compatibility */
const LEGACY_SESSION_KEY = "wcl_session";

function debugLog(...args) {
  if (ANALYTICS_DEBUG) console.log(...args);
}

/* ============================================================
   DATE HELPER
   ============================================================ */

function getTodayKey() {
  const d = new Date();

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/* ============================================================
   GEO (IP → USER COUNTRY / CITY)
   ============================================================ */

let GEO = null;

async function getGeo() {
  if (GEO) return GEO;

  try {
    const res = await fetch("https://ipapi.co/json/");
    const data = await res.json();

    GEO = {
      country: data.country_name || null,
      country_code: data.country_code || null,
      city: data.city || null
    };

    return GEO;
  } catch (err) {
    console.warn("GEO FAILED", err);
    return null;
  }
}

/* ============================================================
   IDENTITY MODEL
   ============================================================ */

function getOrCreateVisitorId() {
  let visitorId = localStorage.getItem(VISITOR_KEY);

  if (!visitorId) {
    visitorId = crypto.randomUUID();
    localStorage.setItem(VISITOR_KEY, visitorId);
  }

  return visitorId;
}

function getOrCreateSessionId() {
  const today = getTodayKey();

  let sessionId = localStorage.getItem(SESSION_KEY);
  const sessionDate = localStorage.getItem(SESSION_DATE_KEY);

  if (!sessionId || sessionDate !== today) {
    sessionId = crypto.randomUUID();

    localStorage.setItem(SESSION_KEY, sessionId);
    localStorage.setItem(SESSION_DATE_KEY, today);

    /* legacy compatibility */
    localStorage.setItem(LEGACY_SESSION_KEY, sessionId);
  }

  if (!localStorage.getItem(LEGACY_SESSION_KEY)) {
    localStorage.setItem(LEGACY_SESSION_KEY, sessionId);
  }

  return sessionId;
}

function getIdentity() {
  return {
    visitor_id: getOrCreateVisitorId(),
    session_id: getOrCreateSessionId(),
    session_date: getTodayKey()
  };
}

/* ============================================================
   SOURCE RESOLUTION
   ============================================================ */

function resolveSource(eventType, payload = {}) {
  if (payload?.source) return payload.source;
  if (window?.MODAL_SOURCE) return window.MODAL_SOURCE;
  if (window?.CURRENT_SOURCE) return window.CURRENT_SOURCE;
  if (window?.__WCL__?.MODAL_SOURCE) return window.__WCL__.MODAL_SOURCE;
  if (window?.__WCL__?.CURRENT_SOURCE) return window.__WCL__.CURRENT_SOURCE;

  if (eventType === "store_view") return "map";
  if (eventType === "store_opened") return "search";

  return "direct";
}

function setAnalyticsSource(source = "direct") {
  const next = source || "direct";
  window.CURRENT_SOURCE = next;
  window.__WCL__ = window.__WCL__ || {};
  window.__WCL__.CURRENT_SOURCE = next;
}

function setModalSource(source = "direct") {
  const next = source || "direct";
  window.MODAL_SOURCE = next;
  window.__WCL__ = window.__WCL__ || {};
  window.__WCL__.MODAL_SOURCE = next;
}

/* ============================================================
   STORE VIEW DEDUPE
   ============================================================ */

function getViewedStoreKey() {
  const sessionId = getOrCreateSessionId();
  return `wcl_viewed_stores_${sessionId}`;
}

function getViewedStores() {
  try {
    return new Set(
      JSON.parse(
        sessionStorage.getItem(getViewedStoreKey()) || "[]"
      )
    );
  } catch {
    return new Set();
  }
}

function hasViewedStore(storeId) {
  return getViewedStores().has(Number(storeId));
}

function markStoreViewed(storeId) {
  const viewed = getViewedStores();
  viewed.add(Number(storeId));

  sessionStorage.setItem(
    getViewedStoreKey(),
    JSON.stringify([...viewed])
  );
}

/* ============================================================
   PAYLOAD SANITIZER
   ============================================================ */

function getExtraPayload(payload = {}) {
  const {
    event_type,
    visitor_id,
    session_id,
    session_hash,
    session_date,
    source,
    user_country,
    user_city,
    store_country,
    store_city,
    ...extra
  } = payload;

  return extra;
}

/* ============================================================
   TRACK EVENT
   ============================================================ */

export async function trackEvent(eventType, payload = {}) {

  try {

    if (!eventType) return;

    /* ============================================================
       DEDUPE
       ============================================================ */

    if (eventType === "store_view" && payload.store_id) {

      if (hasViewedStore(payload.store_id)) return;

      markStoreViewed(payload.store_id);
    }

    /* ============================================================
       IDENTITY
       ============================================================ */

    const identity = getIdentity();

    /* ============================================================
       GEO
       ============================================================ */

    let geo = GEO;

    if (!geo) {
      geo = await getGeo();
    }

    /* ============================================================
       AUTH USER
       ============================================================ */

    let authUser = null;

    try {

  if (supabase?.auth?.getUser) {

  const { data } =
    await supabase.auth.getUser();

  authUser = data?.user || null;
}

    } catch (err) {

      console.warn("AUTH USER LOAD FAILED", err);
    }

    /* ============================================================
       SOURCE
       ============================================================ */
    debugLog("AUTH USER DEBUG", authUser);
    const source =
      resolveSource(eventType, payload);

    /* ============================================================
       FINAL PAYLOAD
       ============================================================ */

    const finalPayload = {

      event_type: eventType,

      visitor_id: identity.visitor_id,
      session_id: identity.session_id,
      session_hash: identity.session_id,
      session_date: identity.session_date,

      source,

      /* ============================================================
         AUTH
         ============================================================ */

      user_id: authUser?.id || null,

      email:
        authUser?.email ||
        payload?.email ||
        null,

      display_name:
        authUser?.user_metadata?.display_name ||
        payload?.display_name ||
        null,

      /* ============================================================
         STORE
         ============================================================ */

      store_country:
        payload?.country ||
        payload?.store_country ||
        null,

      store_city:
        payload?.city ||
        payload?.store_city ||
        null,

      /* ============================================================
         GEO
         ============================================================ */

      user_country:
        geo?.country || null,

      user_city:
        geo?.city || null,

      /* ============================================================
         EXTRA
         ============================================================ */

      ...getExtraPayload(payload)
    };

    /* ============================================================
       DEBUG
       ============================================================ */

    debugLog(
      "🚀 ANALYTICS PAYLOAD:",
      JSON.stringify(finalPayload, null, 2)
    );

    /* ============================================================
       SEND
       ============================================================ */

    const res = await fetch(
      ANALYTICS_ENDPOINT,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify(finalPayload)
      }
    );

    const text = await res.text();

    if (!res.ok) {

      console.warn(
        "❌ ANALYTICS ERROR:",
        res.status,
        text
      );

      return;
    }

    debugLog("✅ ANALYTICS SENT");

  } catch (err) {

    console.warn(
      "Analytics tracking skipped:",
      err
    );
  }
}

/* ============================================================
   SESSION START
   ============================================================ */

(function trackSessionStart() {
  try {
    const today = getTodayKey();
    const previousTrackedDate =
      localStorage.getItem("wcl_session_start_tracked_date");

    getIdentity();

    if (previousTrackedDate === today) return;

    localStorage.setItem(
      "wcl_session_start_tracked_date",
      today
    );

    trackEvent("session_start", {
      source: "direct"
    });

    debugLog("🔥 SESSION START TRACKED:", today);

  } catch (err) {
    console.error("Session tracking failed", err);
  }
})();

window.WCL_ANALYTICS = {
  send: trackEvent,
  setSource: setAnalyticsSource,
  setModalSource
};

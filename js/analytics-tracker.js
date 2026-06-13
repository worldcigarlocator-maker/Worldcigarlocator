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
const COOKIE_CONSENT_KEY = "wcl_cookie_consent_v1";
const DAILY_LOGIN_TRACK_KEY = "wcl_login_tracked_date_v1";
const ANALYTICS_DEBUG = Boolean(window?.WCL_DEBUG_ANALYTICS);
const BASIC_AGGREGATE_EVENTS = new Set([
  "site_opened",
  "store_view",
  "store_opened",
  "website_clicked",
  "directions_clicked",
  "search_used"
]);
const AGGREGATE_ONLY_EVENTS = new Set([
  "site_opened",
  "directions_clicked",
  "search_used"
]);
const LEGACY_BASIC_FALLBACK_EVENTS = new Set([
  "store_view",
  "store_opened",
  "website_clicked"
]);

/* Legacy compatibility */
const LEGACY_SESSION_KEY = "wcl_session";

function debugLog(...args) {
  if (ANALYTICS_DEBUG) console.log(...args);
}

function hasEnhancedAnalyticsConsent() {
  try {
    return localStorage.getItem(COOKIE_CONSENT_KEY) === "accepted";
  } catch {
    return false;
  }
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

function buildBasicAggregatePayload(eventType, payload = {}) {
  return {
    event_type: eventType,
    analytics_mode: "basic_aggregate",
    source: resolveSource(eventType, payload),
    store_id: payload?.store_id || null,
    store_country:
      payload?.country ||
      payload?.store_country ||
      null,
    store_city:
      payload?.city ||
      payload?.store_city ||
      null
  };
}

async function sendBasicAggregateEvent(eventType, payload = {}) {
  const cleanPayload =
    buildBasicAggregatePayload(eventType, payload);

  try {
    const { error } = await supabase.rpc(
      "log_public_activity_v1",
      {
        p_event_type: cleanPayload.event_type,
        p_source: cleanPayload.source,
        p_store_id: cleanPayload.store_id,
        p_store_country: cleanPayload.store_country,
        p_store_city: cleanPayload.store_city
      }
    );

    if (!error) {
      debugLog("BASIC AGGREGATE SENT");
      return;
    }

    console.warn("BASIC AGGREGATE RPC FAILED:", error);
  } catch (error) {
    console.warn("BASIC AGGREGATE RPC SKIPPED:", error);
  }

  if (LEGACY_BASIC_FALLBACK_EVENTS.has(eventType)) {
    await sendAnalyticsPayload(cleanPayload);
  }
}

/* ============================================================
   TRACK EVENT
   ============================================================ */

export async function trackEvent(eventType, payload = {}) {

  try {

    if (!eventType) return;

    const hasEnhancedConsent =
      hasEnhancedAnalyticsConsent();

    const isBasicAggregateEvent =
      BASIC_AGGREGATE_EVENTS.has(eventType);

    if (!hasEnhancedConsent && !isBasicAggregateEvent) return;

    if (AGGREGATE_ONLY_EVENTS.has(eventType)) {
      await sendBasicAggregateEvent(eventType, payload);
      return;
    }

    /* ============================================================
       DEDUPE
       ============================================================ */

    if (
      hasEnhancedConsent &&
      eventType === "store_view" &&
      payload.store_id
    ) {

      if (hasViewedStore(payload.store_id)) return;

      markStoreViewed(payload.store_id);
    }

    if (!hasEnhancedConsent) {
      await sendBasicAggregateEvent(eventType, payload);

      return;
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
      "ANALYTICS PAYLOAD:",
      JSON.stringify(finalPayload, null, 2)
    );

    await sendAnalyticsPayload(finalPayload);

  } catch (err) {

    console.warn(
      "Analytics tracking skipped:",
      err
    );
  }
}

export async function trackLoginEvent(source = "login") {
  const tracked = await logUserLogin(source || "login");
  if (tracked) {
    await markCurrentUserLoginTrackedToday();
    return;
  }

  await trackEvent("user_login", {
    source: source || "login"
  });
}

export async function trackAuthenticatedMemberActive(source = "session_active") {
  try {
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user?.id) return;
    if (hasUserLoginTrackedToday(user.id)) return;

    const tracked = await logUserLogin(source || "session_active");
    if (tracked) {
      markUserLoginTrackedToday(user.id);
    }
  } catch (err) {
    console.warn("Authenticated member activity skipped:", err);
  }
}

async function logUserLogin(source = "login") {
  try {
    const { error } = await supabase.rpc("log_user_login_v1", {
      p_source: source || "login"
    });

    if (!error) return true;

    console.warn("LOGIN RPC TRACKING FAILED:", error);
  } catch (err) {
    console.warn("LOGIN RPC TRACKING SKIPPED:", err);
  }

  return false;
}

async function markCurrentUserLoginTrackedToday() {
  try {
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (user?.id) markUserLoginTrackedToday(user.id);
  } catch {
    // Non-blocking analytics marker only.
  }
}

function hasUserLoginTrackedToday(userId) {
  return localStorage.getItem(loginTrackedKey(userId)) === getTodayKey();
}

function markUserLoginTrackedToday(userId) {
  localStorage.setItem(loginTrackedKey(userId), getTodayKey());
}

function loginTrackedKey(userId) {
  return `${DAILY_LOGIN_TRACK_KEY}:${userId}`;
}

async function sendAnalyticsPayload(finalPayload) {
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
      "ANALYTICS ERROR:",
      res.status,
      text
    );

    return;
  }

  debugLog("ANALYTICS SENT");
}

/* ============================================================
   SESSION START
   ============================================================ */

function trackSessionStart() {
  try {
    if (!hasEnhancedAnalyticsConsent()) return;

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

    debugLog("SESSION START TRACKED:", today);

  } catch (err) {
    console.error("Session tracking failed", err);
  }
}

if (hasEnhancedAnalyticsConsent()) {
  trackSessionStart();
} else {
  window.addEventListener(
    "wcl:cookie-consent",
    trackSessionStart,
    { once: true }
  );
}

window.WCL_ANALYTICS = {
  send: trackEvent,
  setSource: setAnalyticsSource,
  setModalSource
};

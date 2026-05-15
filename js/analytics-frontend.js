/* ============================================================
   WCL Analytics — Frontend (CANONICAL v2)
   ------------------------------------------------------------
   - Fire-and-forget
   - 1 view / store / session
   - Traffic source tracking
   - ZERO coupling to sidebar/search/map
   - Frontend → Backend only (never reads back)
   ============================================================ */

// ============================================================
// CONFIG
// ============================================================

window.__WCL__ = window.__WCL__ || {};

const ANALYTICS_INGEST_URL =
  "https://gbxxoeplkzbhsvagnfsr.functions.supabase.co/analytics-ingest";

const SESSION_IDLE_MS = 30 * 60 * 1000; // 30 min
const EVENT_QUEUE = [];
const BATCH_INTERVAL = 5000; // 5 sek
const ANALYTICS_DEBUG = Boolean(window?.WCL_DEBUG_ANALYTICS);

function debugLog(...args) {
  if (ANALYTICS_DEBUG) console.log(...args);
}


// ============================================================
// TRAFFIC SOURCE
// ============================================================

window.__WCL__.CURRENT_SOURCE = "direct";

export function setTrafficSource(src) {
  debugLog("🔥 SET SOURCE →", src);
   
if (!window.__WCL__.CURRENT_SOURCE || window.__WCL__.CURRENT_SOURCE === "direct") {
  window.__WCL__.CURRENT_SOURCE = src || "direct";
}

}

// ============================================================
// SESSION (SINGLE SOURCE OF TRUTH)
// ============================================================

function getSession() {

  let id = localStorage.getItem("wcl_session");

  if (!id) {
    id =
      crypto?.randomUUID?.() ??
      `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    localStorage.setItem("wcl_session", id);
  }

  return id;
}

// ============================================================
// DEDUP — 1 view / store / session
// ============================================================

function hasViewed(storeId) {

  return (
    localStorage.getItem(
      `wcl_viewed_v1:${getSession()}:${storeId}`
    ) === "1"
  );

}

function markViewed(storeId) {

  localStorage.setItem(
    `wcl_viewed_v1:${getSession()}:${storeId}`,
    "1"
  );

}


// ============================================================
// FIRE-AND-FORGET SENDER
// ============================================================

function sendEvent(event_type, payload = {}) {

  try {

    const finalPayload = {
      event_type,
      timestamp: new Date().toISOString(),
      actor_type: "anon",
      session_hash: getSession(),

      // 🔥 RESPEKTERA EXPLICIT SOURCE FÖRST
      source:
        payload?.source ||
        window?.__WCL__?.MODAL_SOURCE ||
        window?.__WCL__?.CURRENT_SOURCE ||
        "direct",

      ...payload
    };

    EVENT_QUEUE.push(finalPayload);

    debugLog("🧠 QUEUED EVENT", finalPayload);

  } catch (err) {
    console.warn("Analytics queue skipped", err);
  }

}

// ============================================================
// STORE VIEW OBSERVER
// ============================================================

const viewedInMemory = new Set();
export const VIEW_OBSERVER = new IntersectionObserver(

  (entries) => {

    for (const entry of entries) {

      if (!entry.isIntersecting) continue;

      const el = entry.target;
      const storeId = el?.dataset?.storeId;

      if (!storeId) continue;

      if (viewedInMemory.has(storeId) || hasViewed(storeId)) {
  VIEW_OBSERVER.unobserve(el);
  continue;
}

viewedInMemory.add(storeId);
markViewed(storeId);

  sendEvent("store_view", {
  store_id: Number(storeId),
  continent: el.dataset.continent || null,
  country: el.dataset.country || null,
  city: el.dataset.city || null,
});

      VIEW_OBSERVER.unobserve(el);

    }

  },

  { threshold: 0.4 }

);


// ============================================================
// PUBLIC API
// ============================================================

window.WCL_ANALYTICS = {

  send: sendEvent,
  setSource: setTrafficSource,
  VIEW_OBSERVER

};

export default window.WCL_ANALYTICS;

setInterval(() => {

  if (!EVENT_QUEUE.length) return;

  const batch = EVENT_QUEUE.splice(0, EVENT_QUEUE.length);

  fetch(ANALYTICS_INGEST_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    keepalive: true,
    credentials: "omit",
    body: JSON.stringify({ events: batch })
  })
  .then(() => debugLog("🚀 BATCH SENT", batch.length))
  .catch(err => console.warn("Analytics batch skipped", err));

}, BATCH_INTERVAL);

window.addEventListener("beforeunload", () => {

  if (!EVENT_QUEUE.length) return;

  const batch = EVENT_QUEUE.splice(0, EVENT_QUEUE.length);

  navigator.sendBeacon(
    ANALYTICS_INGEST_URL,
    JSON.stringify({ events: batch })
  );

});

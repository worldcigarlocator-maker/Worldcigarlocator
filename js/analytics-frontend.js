/* ============================================================
   WCL Analytics — Frontend (CANONICAL)
   ------------------------------------------------------------
   - Fire-and-forget
   - 1 view / store / session
   - ZERO coupling to sidebar, search, filters
   - Frontend → Backend only (never reads back)
   ============================================================ */

// ============================================================
// CONFIG
// ============================================================
const ANALYTICS_INGEST_URL =
  "https://gbxxoeplkzbhsvagnfsr.functions.supabase.co/analytics-ingest";

const SESSION_IDLE_MS = 30 * 60 * 1000; // 30 min

// ============================================================
// SESSION (anonymous, localStorage)
// ============================================================
function getOrCreateSession() {
  const now = Date.now();
  const raw = localStorage.getItem("wcl_session_v1");

  if (raw) {
    try {
      const s = JSON.parse(raw);
      if (s?.id && s?.t && now - s.t < SESSION_IDLE_MS) {
        s.t = now; // bump
        localStorage.setItem("wcl_session_v1", JSON.stringify(s));
        return s.id;
      }
    } catch {}
  }

  const id =
    crypto?.randomUUID?.() ??
    `${now}-${Math.random().toString(16).slice(2)}`;

  localStorage.setItem(
    "wcl_session_v1",
    JSON.stringify({ id, t: now })
  );

  return id;
}

// ============================================================
// DEDUP — 1 view / store / session
// ============================================================
function hasViewed(storeId) {
  return (
    localStorage.getItem(
      `wcl_viewed_v1:${getOrCreateSession()}:${storeId}`
    ) === "1"
  );
}

function markViewed(storeId) {
  localStorage.setItem(
    `wcl_viewed_v1:${getOrCreateSession()}:${storeId}`,
    "1"
  );
}

// ============================================================
// FIRE-AND-FORGET SENDER
// ============================================================
function sendEvent(event_type, payload = {}) {
  try {
    fetch(ANALYTICS_INGEST_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      keepalive: true,
      credentials: "omit",
      body: JSON.stringify({
        event_type,
        timestamp: new Date().toISOString(),
        source: "frontend",
        actor_type: "anon",
        session_hash: getOrCreateSession(),
        ...payload,
      }),
    }).catch(() => {});
  } catch {}
}

// ============================================================
// STORE VIEW OBSERVER
// ============================================================
export const VIEW_OBSERVER = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;

      const el = entry.target;
      const storeId = el?.dataset?.storeId;
      if (!storeId) continue;

      if (hasViewed(storeId)) {
        VIEW_OBSERVER.unobserve(el);
        continue;
      }

      markViewed(storeId);

  sendEvent("store_viewed", {
  store_id: Number(storeId),
  continent: el.dataset.continent || null,
  country: el.dataset.country || null,
  city: el.dataset.city || null,
  source: "search"
});

      VIEW_OBSERVER.unobserve(el);
    }
  },
  { threshold: 0.4 }
);

// ============================================================
// PUBLIC API (debug + simple access)
// ============================================================
window.WCL_ANALYTICS = {
  send: sendEvent,
};

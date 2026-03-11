// ============================================================
// SESSION.JS — WCL SESSION TRACKING
// 30 MIN IDLE SESSION
// ============================================================

const SESSION_KEY = "wcl_session";
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 min

function generateSessionId() {
  return crypto.randomUUID();
}

export function getSessionId() {

  let session = localStorage.getItem(SESSION_KEY);

  if (session) {
    try {
      session = JSON.parse(session);

      const now = Date.now();

      if (now - session.last_seen < SESSION_TIMEOUT) {
        session.last_seen = now;
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        return session.id;
      }

    } catch (e) {}
  }

  const newSession = {
    id: generateSessionId(),
    last_seen: Date.now()
  };

  localStorage.setItem(SESSION_KEY, JSON.stringify(newSession));

  return newSession.id;
}

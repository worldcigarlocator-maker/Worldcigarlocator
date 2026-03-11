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

// ============================================================
// MAP.JS — WCL MAP ENGINE V5
// Enterprise · Stable · Fast · Anchor Lock
// ============================================================

import { supabase } from "./globals.js";
import { openModal } from "./modal.js";
import { buildPin } from "./map-pins.js";

// ============================================================
// STATE
// ============================================================

let map = null;
let markers = new Map();
let clusterer = null;

const markerPool = [];

let hoverTooltip = null;

let hoveredMarkerId = null;
let lockedMarkerId = null;
let activeMarkerId = null;

let googleLoaded = false;
let clusterLoaded = false;

let lastBounds = null;
let lastZoom = null;

let idleTimer = null;
let tooltipRaf = null;

const modalPrefetch = new Map();

const BOUNDS_BUFFER_RATIO = 0.20;

// ============================================================
// SCRIPT LOADER
// ============================================================

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.defer = true;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

// ============================================================
// LOAD GOOGLE
// ============================================================

async function loadGoogle() {
  if (!googleLoaded) {
    await loadScript(
      "https://maps.googleapis.com/maps/api/js?key=AIzaSyBzHH9QNHPGWpQrczIGgWs1wnHGALiwNZw&v=weekly&libraries=marker"
    );
    googleLoaded = true;
  }

  if (!clusterLoaded) {
    await loadScript(
      "https://unpkg.com/@googlemaps/markerclusterer/dist/index.min.js"
    );
    clusterLoaded = true;
  }
}

// ============================================================
// INIT MAP
// ============================================================

export async function initMap() {
  if (map) return;

  await loadGoogle();

  const container = document.getElementById("mapView");
  if (!container) return;

  map = new google.maps.Map(container, {
    center: { lat: 20, lng: 0 },
    zoom: 2,
    minZoom: 2,

    mapId: "50c83dc7ca62c31181c32eb1",

    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,

    tilt: 0,
    heading: 0,

    gestureHandling: "greedy"
  });

  map.addListener("idle", () => {
    clearTimeout(idleTimer);

    idleTimer = setTimeout(() => {
      syncLockedMarkerVisuals();
      refreshTooltipPosition();
      loadStores();
    }, 350);
  });

  // ============================================
  // SMOOTH 3D TILT ON ZOOM
  // ============================================

  map.addListener("zoom_changed", () => {
    const z = map.getZoom();

    if (z >= 15) {
      map.setTilt(45);
    } else {
      map.setTilt(0);
    }

    syncLockedMarkerVisuals();
    scheduleTooltipRefresh();
  });

  map.addListener("center_changed", () => {
    syncLockedMarkerVisuals();
    scheduleTooltipRefresh();
  });
}

// ============================================================
// USE MY LOCATION
// ============================================================

export function useMyLocation() {
  if (!map) return;
  if (!navigator.geolocation) return;

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      const userPos = { lat, lng };

      map.setCenter(userPos);
      map.setZoom(12);

      new google.maps.marker.AdvancedMarkerElement({
        map,
        position: userPos,
        content: buildUserPin()
      });
    },
    () => {
      console.warn("Location denied");
    },
    {
      enableHighAccuracy: true,
      timeout: 5000
    }
  );
}

// ============================================================
// LOAD STORES
// ============================================================

async function loadStores() {
  if (!map) return;

  const rawBounds = map.getBounds();
  if (!rawBounds) return;

  const zoom = map.getZoom();
  const bounds = expandBounds(rawBounds, BOUNDS_BUFFER_RATIO);

  if (lastBounds && lastZoom === zoom) {
    if (!boundsChangedEnough(lastBounds, bounds)) {
      return;
    }
  }

  lastBounds = bounds;
  lastZoom = zoom;

  const { data, error } = await supabase.rpc("stores_within_bounds", {
    p_north: bounds.north,
    p_south: bounds.south,
    p_east: bounds.east,
    p_west: bounds.west
  });

  if (error) {
    console.error(error);
    return;
  }

  renderMarkers(data || []);
}

// ============================================================
// BOUNDS HELPERS
// ============================================================

function expandBounds(bounds, ratio = 0.20) {
  const ne = bounds.getNorthEast();
  const sw = bounds.getSouthWest();

  const north = ne.lat();
  const south = sw.lat();
  const east = ne.lng();
  const west = sw.lng();

  const latSpan = north - south;
  const lngSpan = east - west;

  const latPadding = latSpan * ratio;
  const lngPadding = lngSpan * ratio;

  return {
    north: clampLat(north + latPadding),
    south: clampLat(south - latPadding),
    east: east + lngPadding,
    west: west - lngPadding
  };
}

function boundsChangedEnough(prev, next) {
  return (
    Math.abs(next.north - prev.north) >= 0.2 ||
    Math.abs(next.south - prev.south) >= 0.2 ||
    Math.abs(next.east - prev.east) >= 0.2 ||
    Math.abs(next.west - prev.west) >= 0.2
  );
}

function clampLat(value) {
  return Math.max(-85, Math.min(85, value));
}

// ============================================================
// CREATE / REUSE MARKER
// ============================================================

function createMarker(store) {
  let marker;

  if (markerPool.length) {
    marker = markerPool.pop();
    marker.position = { lat: store.lat, lng: store.lng };
    marker.map = map;
  } else {
    const pin = buildPin(store.types);

marker = new google.maps.marker.AdvancedMarkerElement({
  map,
  position: { lat: store.lat, lng: store.lng },
  content: pin,
  gmpClickable: true,
  anchorPoint: new google.maps.Point(12, 34)
});

    bindMarkerInteractions(marker);
  }

  marker.__store = store;
  marker.__id = Number(store.id);

  syncMarkerPinType(marker, store.types);
  resetMarkerTransientState(marker);
  applyMarkerStates();

  return marker;
}

// ============================================================
// BIND INTERACTIONS (ONCE PER MARKER)
// ============================================================

function bindMarkerInteractions(marker) {
  const pin = marker.content;

  // ================= CLICK =================

  marker.addListener("gmp-click", (e) => {
    if (e?.domEvent) {
      e.domEvent.stopPropagation();
    }

    const store = marker.__store;
    if (!store) return;

    hideTooltip();

    activeMarkerId = Number(store.id);
    lockedMarkerId = Number(store.id);

    applyMarkerStates();

    openModal(store.id);
  });

  // ================= HOVER =================

  pin.addEventListener("mouseenter", () => {
    const store = marker.__store;
    if (!store) return;

    const id = Number(store.id);

    hoveredMarkerId = id;
    lockedMarkerId = id;

    prefetchModal(id);
    applyMarkerStates();
    showTooltip(marker, store);
  });

  pin.addEventListener("mouseleave", () => {
    const store = marker.__store;
    if (!store) return;

    const id = Number(store.id);

    if (hoveredMarkerId === id) {
      hoveredMarkerId = null;
    }

    if (lockedMarkerId === id && activeMarkerId !== id) {
      lockedMarkerId = null;
    }

    hideTooltip();
    applyMarkerStates();
  });
}

// ============================================================
// MARKER PIN TYPE SYNC
// ============================================================

function syncMarkerPinType(marker, types = []) {
  const pin = marker.content;
  if (!pin) return;

  pin.classList.remove("pin-store", "pin-lounge", "pin-split");

  const hasStore = types.includes("store");
  const hasLounge = types.includes("lounge");

  if (hasStore && hasLounge) {
    pin.classList.add("pin-split");
  } else if (hasStore) {
    pin.classList.add("pin-store");
  } else if (hasLounge) {
    pin.classList.add("pin-lounge");
  }
}

// ============================================================
// MARKER STATE
// ============================================================

function resetMarkerTransientState(marker) {
  const pin = marker.content;
  if (!pin) return;

  pin.classList.remove(
    "is-hovered",
    "is-locked",
    "is-active",
    "active",
    "is-dimmed"
  );
}

function applyMarkerStates() {
  markers.forEach((marker) => {
    const pin = marker.content;
    const id = marker.__id;

    if (!pin || !id) return;

    pin.classList.remove(
      "is-hovered",
      "is-locked",
      "is-active",
      "active",
      "is-dimmed"
    );

    const isHovered = hoveredMarkerId === id;
    const isLocked = lockedMarkerId === id;
    const isActive = activeMarkerId === id;

    if (isHovered) {
      pin.classList.add("is-hovered");
    }

    if (isLocked) {
      pin.classList.add("is-locked");
    }

    if (isActive) {
      pin.classList.add("is-active", "active");
    }
  });

  const shouldDim = hoveredMarkerId !== null || lockedMarkerId !== null;

  if (!shouldDim) return;

  markers.forEach((marker) => {
    const pin = marker.content;
    const id = marker.__id;

    if (!pin || !id) return;

    const isHovered = hoveredMarkerId === id;
    const isLocked = lockedMarkerId === id;
    const isActive = activeMarkerId === id;

    if (!isHovered && !isLocked && !isActive) {
      pin.classList.add("is-dimmed");
    }
  });
}

function syncLockedMarkerVisuals() {
  if (
    hoveredMarkerId === null &&
    lockedMarkerId === null &&
    activeMarkerId === null
  ) {
    return;
  }

  applyMarkerStates();
}

// ============================================================
// TOOLTIP LABEL
// ============================================================

function showTooltip(marker, store) {
  if (!marker?.content) return;

  hideTooltip();

  hoverTooltip = document.createElement("div");
  hoverTooltip.style.position = "fixed";
  hoverTooltip.style.pointerEvents = "none";
  hoverTooltip.style.zIndex = "9999";

  hoverTooltip.innerHTML = `
    <div style="
      background:#0a0a0a;
      color:rgb(115,98,75);
      padding:6px 10px;
      border-radius:8px;
      font-size:12px;
      border:1px solid rgba(115,98,75,0.35);
      font-family:DM Sans,sans-serif;
      box-shadow:0 6px 16px rgba(0,0,0,0.55);
      white-space:nowrap;
    ">
      <div style="font-weight:600">${escapeHtml(store.name)}</div>
    </div>
  `;

  hoverTooltip.__markerId = Number(store.id);

  document.body.appendChild(hoverTooltip);
  refreshTooltipPosition();
}

function refreshTooltipPosition() {
  if (!hoverTooltip) return;

  const markerId = hoverTooltip.__markerId;
  if (!markerId) return;

  const marker = markers.get(markerId);
  if (!marker?.content) return;

  const rect = marker.content.getBoundingClientRect();

  hoverTooltip.style.left = rect.left + rect.width / 2 + "px";
  hoverTooltip.style.top = rect.top - 10 + "px";
  hoverTooltip.style.transform = "translate(-50%,-100%)";
}

function scheduleTooltipRefresh() {
  if (tooltipRaf) {
    cancelAnimationFrame(tooltipRaf);
  }

  tooltipRaf = requestAnimationFrame(() => {
    refreshTooltipPosition();
    tooltipRaf = null;
  });
}

function hideTooltip() {
  if (hoverTooltip) {
    hoverTooltip.remove();
    hoverTooltip = null;
  }
}

// ============================================================
// PREFETCH MODAL
// ============================================================

async function prefetchModal(storeId) {
  if (modalPrefetch.has(storeId)) return;

  try {
    const { data } = await supabase.rpc("modal_store_card_v1", {
      p_store_id: storeId
    });

    if (data && data.length) {
      modalPrefetch.set(storeId, data[0]);
    }
  } catch (err) {
    console.warn("prefetch failed", err);
  }
}

// ============================================================
// USER PIN
// ============================================================

function buildUserPin() {
  const el = document.createElement("div");

  el.style.width = "16px";
  el.style.height = "16px";
  el.style.borderRadius = "50%";
  el.style.background = "#3b82f6";
  el.style.border = "3px solid white";
  el.style.boxShadow = "0 0 0 6px rgba(59,130,246,0.25)";

  return el;
}

// ============================================================
// RENDER MARKERS
// ============================================================

function renderMarkers(stores) {
  const incoming = new Set();

  stores.forEach((store) => {
    const id = Number(store.id);
    incoming.add(id);

    if (markers.has(id)) {
      const existing = markers.get(id);

      existing.__store = store;
      existing.__id = id;
      existing.position = { lat: store.lat, lng: store.lng };

      syncMarkerPinType(existing, store.types);
      return;
    }

    const marker = createMarker(store);
    markers.set(id, marker);
  });

  markers.forEach((marker, id) => {
    if (incoming.has(id)) return;

    if (hoveredMarkerId === id) hoveredMarkerId = null;
    if (lockedMarkerId === id) lockedMarkerId = null;
    if (activeMarkerId === id) activeMarkerId = null;

    if (hoverTooltip?.__markerId === id) {
      hideTooltip();
    }

    resetMarkerTransientState(marker);

    marker.map = null;
    marker.__store = null;
    marker.__id = null;

    markerPool.push(marker);
    markers.delete(id);
  });

  applyMarkerStates();
  updateClusters();
  scheduleTooltipRefresh();
}

// ============================================================
// CLUSTERS
// ============================================================

function updateClusters() {
  const zoom = map.getZoom();

  if (clusterer) {
    clusterer.clearMarkers();
    clusterer = null;
  }

  if (zoom <= 5) {
    hideTooltip();

    markers.forEach((m) => {
      m.map = null;
    });

    clusterer = new markerClusterer.MarkerClusterer({
      map,
      markers: Array.from(markers.values())
    });
  } else {
    markers.forEach((m) => {
      m.map = map;
    });
  }

  applyMarkerStates();
}

// ============================================================
// UTILS
// ============================================================

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ============================================================
// EVENTS
// ============================================================

document.addEventListener("wcl:map-open", async () => {
  await initMap();
  useMyLocation();
});

// ============================================================
// MAP.JS — WCL MAP ENGINE V6
// Canonical · Load-All-Once · Cluster-Driven · Stable
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

let hoverTooltip = null;

let hoveredMarkerId = null;
let lockedMarkerId = null;
let activeMarkerId = null;

let googleLoaded = false;
let clusterLoaded = false;

let storesLoaded = false;
let storesLoading = false;

let idleTimer = null;

const modalPrefetch = new Map();

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
// MAP PRELOAD
// ============================================================

export function preloadMap() {
  loadGoogle().catch(() => {});
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
      if (!storesLoaded && !storesLoading) {
        loadAllStoresOnce();
      }
    }, 100);
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

    updateClusters();
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
// LOAD ALL STORES ONCE
// ============================================================

async function loadAllStoresOnce() {
  if (!map || storesLoaded || storesLoading) return;

  storesLoading = true;

  try {
    const { data, error } = await supabase
      .from("stores_frontend_public_v5")
      .select("id, name, lat, lng, types")
      .not("lat", "is", null)
      .not("lng", "is", null);

    if (error) {
      console.error(error);
      return;
    }

    renderAllMarkers(data || []);
    storesLoaded = true;
  } finally {
    storesLoading = false;
  }
}

// ============================================================
// CREATE MARKER
// ============================================================

function createMarker(store) {
  const pin = buildPin(store.types || []);

  const marker = new google.maps.marker.AdvancedMarkerElement({
    map,
    position: { lat: Number(store.lat), lng: Number(store.lng) },
    content: pin,
    gmpClickable: true
  });

  marker.__store = store;
  marker.__id = Number(store.id);

  bindMarkerInteractions(marker);

  return marker;
}

// ============================================================
// BIND INTERACTIONS
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
// MARKER STATE
// ============================================================

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

  document.body.appendChild(hoverTooltip);

  const rect = marker.content.getBoundingClientRect();

  hoverTooltip.style.left = rect.left + rect.width / 2 + "px";
  hoverTooltip.style.top = rect.top - 10 + "px";
  hoverTooltip.style.transform = "translate(-50%,-100%)";
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
// RENDER ALL MARKERS
// ============================================================

function renderAllMarkers(stores) {
  markers.forEach((marker) => {
    marker.map = null;
  });
  markers.clear();

  stores.forEach((store) => {
    const marker = createMarker(store);
    markers.set(Number(store.id), marker);
  });

  applyMarkerStates();
  updateClusters();
}

// ============================================================
// CLUSTERS
// ============================================================

function updateClusters() {
  if (!map) return;

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

  setTimeout(() => {
    useMyLocation();
  }, 100);
});

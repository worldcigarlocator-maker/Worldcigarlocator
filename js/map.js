// ============================================================
// MAP.JS — WCL MAP ENGINE
// Clean · Pins + Cluster · Stable + Fast
// ============================================================

import { supabase } from "./globals.js";
import { openModal } from "./modal.js";
import { buildPin } from "./map-pins.js";

// ============================================================
// STATE
// ============================================================

let mapInstance = null;
let markerCache = new Map();
let markerCluster = null;

let idleTimer = null;
let hoverTooltip = null;

let googleLoaded = false;
let clustererLoaded = false;

let lastBounds = null;
let lastZoom = null;

// ============================================================
// LOAD SCRIPT HELPER
// ============================================================

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.defer = true;
    s.onload = resolve;
    s.onerror = () => reject(new Error("Failed to load " + src));
    document.head.appendChild(s);
  });
}

// ============================================================
// GOOGLE MAPS + CLUSTERER LOADER
// ============================================================

async function loadGoogleMaps() {
  if (!googleLoaded) {
    await loadScript(
      "https://maps.googleapis.com/maps/api/js?key=AIzaSyBzHH9QNHPGWpQrczIGgWs1wnHGALiwNZw&v=weekly&libraries=marker"
    );
    googleLoaded = true;
  }

  if (!clustererLoaded) {
    await loadScript(
      "https://unpkg.com/@googlemaps/markerclusterer/dist/index.min.js"
    );
    clustererLoaded = true;
  }
}

// ============================================================
// INIT MAP
// ============================================================

export async function initMap() {
  if (mapInstance) return;

  await loadGoogleMaps();

  const container = document.getElementById("mapView");
  if (!container) return;

  mapInstance = new google.maps.Map(container, {
    center: { lat: 20, lng: 0 },
    zoom: 2,
    minZoom: 2,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    mapId: "DEMO_MAP_ID",
    styles: [{ featureType: "poi", stylers: [{ visibility: "off" }] }]
  });

  mapInstance.addListener("idle", () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      loadStoresFromBounds();
    }, 200);
  });
}

// ============================================================
// LOAD STORES IN VIEWPORT
// ============================================================

async function loadStoresFromBounds() {
  if (!mapInstance) return;

  const bounds = mapInstance.getBounds();
  if (!bounds) return;

  const zoom = mapInstance.getZoom();

  if (lastBounds && lastZoom === zoom) {
    const ne = bounds.getNorthEast();
    const lastNE = lastBounds.getNorthEast();

    const moveLat = Math.abs(ne.lat() - lastNE.lat());
    const moveLng = Math.abs(ne.lng() - lastNE.lng());

    if (moveLat < 0.2 && moveLng < 0.2) return;
  }

  lastBounds = bounds;
  lastZoom = zoom;

  const ne = bounds.getNorthEast();
  const sw = bounds.getSouthWest();

  const { data, error } = await supabase.rpc("stores_within_bounds", {
    p_north: ne.lat(),
    p_south: sw.lat(),
    p_east: ne.lng(),
    p_west: sw.lng()
  });

  if (error) {
    console.error(error);
    return;
  }

  renderMarkers(data || []);
}

// ============================================================
// CLUSTER RENDERER (WCL STYLE)
// ============================================================

function clusterRenderer() {
  return {
    render({ count, position }) {
      const div = document.createElement("div");

      let size = 32;
      if (count > 20) size = 36;
      if (count > 50) size = 42;
      if (count > 100) size = 48;

      div.style.background = "#0a0a0a";
      div.style.color = "rgb(115,98,75)";
      div.style.border = "1px solid rgba(115,98,75,0.35)";
      div.style.width = size + "px";
      div.style.height = size + "px";
      div.style.borderRadius = "999px";
      div.style.display = "flex";
      div.style.alignItems = "center";
      div.style.justifyContent = "center";
      div.style.fontFamily = "DM Sans, sans-serif";
      div.style.fontSize = "13px";
      div.style.fontWeight = "600";
      div.style.boxShadow = "0 6px 16px rgba(0,0,0,0.55)";
      div.textContent = count;

      return new google.maps.marker.AdvancedMarkerElement({
        position,
        content: div
      });
    }
  };
}

// ============================================================
// RENDER MARKERS
// ============================================================

function renderMarkers(stores) {
  const bounds = mapInstance.getBounds();
  const zoom = mapInstance.getZoom();

  const incoming = new Set();

  stores.forEach(store => {

    const id = Number(store.id);

    if (!bounds?.contains({ lat: store.lat, lng: store.lng })) return;

    incoming.add(id);
    if (markerCache.has(id)) return;

    const pin = buildPin(store.types);

    const marker = new google.maps.marker.AdvancedMarkerElement({
      map: mapInstance,
      position: {
        lat: store.lat,
        lng: store.lng
      },
      content: pin,
      gmpClickable: true
    });

    marker.addListener("gmp-click", () => {

      if (hoverTooltip) {
        hoverTooltip.remove();
        hoverTooltip = null;
      }

      openModal(store);

    });

    markerCache.set(id, marker);
  });

  markerCache.forEach((marker, id) => {

    if (!incoming.has(id)) {

      marker.map = null;

      if (marker.content) {
        marker.content.replaceChildren();
      }

      markerCache.delete(id);
    }

  });

  const shouldCluster = zoom <= 5;

  if (markerCluster) {
    markerCluster.clearMarkers();
    markerCluster = null;
  }

  if (shouldCluster) {

    markerCache.forEach(marker => {
      marker.map = null;
    });

    markerCluster = new markerClusterer.MarkerClusterer({
      map: mapInstance,
      markers: Array.from(markerCache.values()),
      renderer: clusterRenderer()
    });

  } else {

    markerCache.forEach(marker => {
      marker.map = mapInstance;
    });

  }

}

// ============================================================
// EVENTS FROM SEARCH UI
// ============================================================

document.addEventListener("wcl:map-open", () => {
  initMap();
});

document.addEventListener("wcl:map-close", () => {
  // future cleanup
});

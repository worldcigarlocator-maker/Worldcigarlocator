// ============================================================
// MAP.JS — WCL MAP ENGINE V4
// Enterprise · Stable · Fast
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
let activePin = null;

let googleLoaded = false;
let clusterLoaded = false;

let lastBounds = null;
let lastZoom = null;

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
  styles: [{ featureType: "poi", stylers: [{ visibility: "off" }] }]
});

  map.addListener("idle", () => {

    clearTimeout(idleTimer);

    idleTimer = setTimeout(() => {
      loadStores();
    }, 200);

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

  const bounds = map.getBounds();
  if (!bounds) return;

  const zoom = map.getZoom();

  if (lastBounds && lastZoom === zoom) {

    const ne = bounds.getNorthEast();
    const lastNE = lastBounds.getNorthEast();

    if (
      Math.abs(ne.lat() - lastNE.lat()) < 0.2 &&
      Math.abs(ne.lng() - lastNE.lng()) < 0.2
    ) return;

  }

  lastBounds = bounds;
  lastZoom = zoom;

  const ne = bounds.getNorthEast();
  const sw = bounds.getSouthWest();

  const { data, error } = await supabase.rpc(
    "stores_within_bounds",
    {
      p_north: ne.lat(),
      p_south: sw.lat(),
      p_east: ne.lng(),
      p_west: sw.lng()
    }
  );

  if (error) {
    console.error(error);
    return;
  }

  renderMarkers(data || []);

}

// ============================================================
// CREATE MARKER
// ============================================================

function createMarker(store) {

  let marker;

  if (markerPool.length) {

    marker = markerPool.pop();

    marker.position = {
      lat: store.lat,
      lng: store.lng
    };

    marker.map = map;

  } else {

    const pin = buildPin(store.types);

    marker = new google.maps.marker.AdvancedMarkerElement({
      map,
      position: { lat: store.lat, lng: store.lng },
      content: pin,
      gmpClickable: true
    });

  }

  const pin = marker.content;

  marker.__store = store;

  // ================= CLICK =================

  marker.addListener("gmp-click", () => {

    if (hoverTooltip) {
      hoverTooltip.remove();
      hoverTooltip = null;
    }

    if (activePin && activePin !== pin) {
      activePin.style.transform = "scale(1)";
      activePin.style.boxShadow = "";
      activePin.style.zIndex = "";
    }

    activePin = pin;

    pin.style.transform = "scale(1.35)";
    pin.style.boxShadow =
      "0 0 0 3px rgba(115,98,75,0.45), 0 10px 22px rgba(0,0,0,0.65)";
    pin.style.zIndex = "5";

    const id = Number(store.id);
    const cached = modalPrefetch.get(id);

    if (cached) {
      openModal(cached);
    } else {
      openModal(id);
    }

  });

  // ================= HOVER =================

  pin.addEventListener("mouseenter", () => {

    // prefetchModal(Number(store.id));

    pin.style.transform = "scale(1.25)";

    markers.forEach((m) => {

      if (m.content === activePin) return;

      if (m.content !== pin) {
        m.content.style.opacity = "0.35";
      }

    });

    showTooltip(pin, store);

  });

  pin.addEventListener("mouseleave", () => {

    pin.style.transform = "scale(1)";

    markers.forEach((m) => {

      if (m.content === activePin) return;

      m.content.style.opacity = "1";

    });

    if (hoverTooltip) {
      hoverTooltip.remove();
      hoverTooltip = null;
    }

  });

  return marker;

}

// ============================================================
// TOOLTIP LABEL
// ============================================================

function showTooltip(pin, store) {

  if (hoverTooltip) hoverTooltip.remove();

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
    ">
      <div style="font-weight:600">${store.name}</div>
    </div>
  `;

  document.body.appendChild(hoverTooltip);

  const rect = pin.getBoundingClientRect();

  hoverTooltip.style.left = rect.left + rect.width / 2 + "px";
  hoverTooltip.style.top = rect.top - 10 + "px";
  hoverTooltip.style.transform = "translate(-50%,-100%)";

}

// ============================================================
// PREFETCH MODAL
// ============================================================

// async function prefetchModal(storeId) {

//   if (modalPrefetch.has(storeId)) return;

//   try {

//     const { data } = await supabase.rpc(
//       "modal_store_card_v1",
//       { p_store_id: storeId }
//     );

//     if (data && data.length) {
//       modalPrefetch.set(storeId, data[0]);
//     }

//   } catch (err) {
//     console.warn("prefetch failed", err);
//   }

// }

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

    if (markers.has(id)) return;

    const marker = createMarker(store);

    markers.set(id, marker);

  });

  markers.forEach((marker, id) => {

    if (!incoming.has(id)) {

      marker.map = null;
      marker.__store = null;

      markerPool.push(marker);

      markers.delete(id);

    }

  });

  updateClusters();

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

    markers.forEach((m) => (m.map = null));

    clusterer = new markerClusterer.MarkerClusterer({
      map,
      markers: Array.from(markers.values())
    });

  } else {

    markers.forEach((m) => (m.map = map));

  }

}

// ============================================================
// EVENTS
// ============================================================

document.addEventListener("wcl:map-open", async () => {

  await initMap();

  useMyLocation();

});

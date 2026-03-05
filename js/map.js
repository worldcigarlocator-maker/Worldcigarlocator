```javascript
// ============================================================
// MAP.JS — WCL MAP ENGINE (ADVANCED MARKERS)
// ============================================================

import { supabase } from "./globals.js";
import { openModal } from "./modal.js";

// ============================================================
// STATE
// ============================================================

let mapInstance = null;
let markerCache = new Map();
let hoverInfoWindow = null;
let idleTimer = null;
let googleLoaded = false;

// ============================================================
// GOOGLE MAPS LOADER
// ============================================================

async function loadGoogleMaps() {

  if (googleLoaded) return;

  await new Promise((resolve, reject) => {

    const script = document.createElement("script");
    script.src =
      "https://maps.googleapis.com/maps/api/js?key=YOUR_GOOGLE_KEY&v=weekly&libraries=marker";

    script.async = true;
    script.onload = resolve;
    script.onerror = reject;

    document.head.appendChild(script);

  });

  googleLoaded = true;
}

// ============================================================
// INIT MAP
// ============================================================

async function initMap() {

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
    fullscreenControl: false
  });

  hoverInfoWindow = new google.maps.InfoWindow({
    disableAutoPan: true
  });

  mapInstance.addListener("idle", () => {

    clearTimeout(idleTimer);

    idleTimer = setTimeout(() => {
      loadStoresFromBounds();
    }, 200);

  });

}

// ============================================================
// LOAD STORES (VIEWPORT)
// ============================================================

async function loadStoresFromBounds() {

  if (!mapInstance) return;

  const bounds = mapInstance.getBounds();
  if (!bounds) return;

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
// PIN BUILDER
// ============================================================

function buildPin(types) {

  let color = "#3b82f6";

  const hasStore = types?.includes("store");
  const hasLounge = types?.includes("lounge");

  if (hasLounge && !hasStore) {
    color = "#8b5cf6";
  }

  if (hasStore && hasLounge) {
    color = "linear-gradient(90deg,#3b82f6 50%,#8b5cf6 50%)";
  }

  const pin = document.createElement("div");

  pin.style.width = "18px";
  pin.style.height = "18px";
  pin.style.borderRadius = "50%";
  pin.style.background = color;
  pin.style.border = "2px solid white";
  pin.style.boxShadow = "0 0 4px rgba(0,0,0,0.5)";

  return pin;
}

// ============================================================
// RENDER MARKERS
// ============================================================

function renderMarkers(stores) {

  const incoming = new Set();

  stores.forEach(store => {

    const id = Number(store.id);
    incoming.add(id);

    if (markerCache.has(id)) return;

    const pin = buildPin(store.types);

    const marker = new google.maps.marker.AdvancedMarkerElement({
      map: mapInstance,
      position: {
        lat: store.lat,
        lng: store.lng
      },
      content: pin
    });

    // ================= HOVER =================

    marker.addListener("mouseover", () => {

      hoverInfoWindow.setContent(`
        <div style="
          background:#111;
          color:white;
          padding:6px 10px;
          border-radius:6px;
          font-size:12px;
          white-space:nowrap;
        ">
          ${store.name}
        </div>
      `);

      hoverInfoWindow.open({
        map: mapInstance,
        anchor: marker
      });

    });

    marker.addListener("mouseout", () => {
      hoverInfoWindow.close();
    });

    // ================= CLICK =================

    marker.addListener("click", () => {
      openModal(id);
    });

    markerCache.set(id, marker);

  });

  // ================= REMOVE OUTSIDE VIEW =================

  markerCache.forEach((marker, id) => {

    if (!incoming.has(id)) {
      marker.map = null;
      markerCache.delete(id);
    }

  });

}

// ============================================================
// EVENT LISTENERS FROM SEARCH UI
// ============================================================

document.addEventListener("wcl:map-open", () => {
  initMap();
});

document.addEventListener("wcl:map-close", () => {
  // nothing yet
});
```

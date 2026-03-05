// ============================================================
// MAP.JS — WCL MAP ENGINE (PIN VERSION)
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
      "https://maps.googleapis.com/maps/api/js?key=AIzaSyBzHH9QNHPGWpQrczIGgWs1wnHGALiwNZw&v=weekly&libraries=marker";

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
// BUILD PIN
// ============================================================

function buildPin(types) {

  const hasStore = types?.includes("store");
  const hasLounge = types?.includes("lounge");

  const pin = document.createElement("div");

  pin.style.width = "26px";
  pin.style.height = "36px";
  pin.style.position = "relative";

  const body = document.createElement("div");

  body.style.width = "18px";
  body.style.height = "18px";
  body.style.borderRadius = "50%";
  body.style.border = "2px solid white";
  body.style.boxShadow = "0 2px 6px rgba(0,0,0,0.4)";
  body.style.position = "absolute";
  body.style.left = "4px";
  body.style.top = "0";

  // ================= COLOR =================

  if (hasStore && hasLounge) {

    body.style.background =
      "linear-gradient(90deg,#3b82f6 50%,#8b5cf6 50%)";

  } else if (hasLounge) {

    body.style.background = "#8b5cf6";

  } else {

    body.style.background = "#3b82f6";

  }

  const tip = document.createElement("div");

  tip.style.width = "0";
  tip.style.height = "0";
  tip.style.borderLeft = "6px solid transparent";
  tip.style.borderRight = "6px solid transparent";
  tip.style.borderTop = "10px solid white";
  tip.style.position = "absolute";
  tip.style.left = "7px";
  tip.style.top = "18px";

  pin.appendChild(body);
  pin.appendChild(tip);

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

// ============================================================
// EVENTS FROM SEARCH UI
// ============================================================

document.addEventListener("wcl:map-open", () => {
  initMap();
});

document.addEventListener("wcl:map-close", () => {
  // future cleanup
});

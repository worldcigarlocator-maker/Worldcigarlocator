// ============================================================
// MAP.JS — WCL MAP ENGINE
// Clean · Pins + Cluster · Stable + Fast
// ============================================================

import { supabase } from "./globals.js";
import { openModal } from "./modal.js";

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

  // MarkerClusterer (v2 package on unpkg)
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
    styles: [
      { featureType: "poi", stylers: [{ visibility: "off" }] }
    ]
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

  // --- Skip tiny pans, but NEVER skip zoom changes ---
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
// PIN BUILDER
// ============================================================

function buildPin(types) {
  const hasStore  = types?.includes("store");
  const hasLounge = types?.includes("lounge");

  let color = "#3b82f6";
  if (hasLounge && !hasStore) color = "#8b5cf6";
  if (hasStore && hasLounge) {
    color = "linear-gradient(90deg,#3b82f6 50%,#8b5cf6 50%)";
  }

  const pin = document.createElement("div");
  pin.style.cursor = "pointer";
  
  pin.style.width = "24px";
  pin.style.height = "34px";
  pin.style.position = "relative";
  pin.style.display = "flex";
  pin.style.justifyContent = "center";

  const head = document.createElement("div");
  head.style.width = "16px";
  head.style.height = "16px";
  head.style.borderRadius = "50%";
  head.style.background = color;
  head.style.border = "2px solid white";
  head.style.boxShadow = "0 4px 10px rgba(0,0,0,0.35)";
  head.style.position = "relative";
  head.style.zIndex = "2";

  const gloss = document.createElement("div");
  gloss.style.position = "absolute";
  gloss.style.top = "2px";
  gloss.style.left = "3px";
  gloss.style.width = "8px";
  gloss.style.height = "5px";
  gloss.style.borderRadius = "50%";
  gloss.style.background = "rgba(255,255,255,0.6)";
  gloss.style.filter = "blur(1px)";
  head.appendChild(gloss);

  const needle = document.createElement("div");
  needle.style.position = "absolute";
  needle.style.top = "18px";
  needle.style.left = "50%";
  needle.style.transform = "translateX(-50%)";
  needle.style.width = "2px";
  needle.style.height = "14px";
  needle.style.background = "#6b7280";
  needle.style.borderRadius = "2px";

  pin.appendChild(head);
  pin.appendChild(needle);

  return pin;
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

  // --- create markers (cached) ---
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

// ================= HOVER START =================

pin.addEventListener("mouseenter", () => {

  pin.style.transform = "scale(1.25)";
  pin.style.boxShadow =
    "0 0 0 2px rgba(115,98,75,0.35), 0 6px 16px rgba(0,0,0,0.55)";
  pin.style.transition =
    "transform 0.12s ease-out, box-shadow 0.12s ease-out";

  // dim other pins
markerCache.forEach((m) => {
  if (m !== marker && m.map === mapInstance) {
    m.content.style.opacity = "0.35";
  }
});

  if (!hoverTooltip) {
    hoverTooltip = document.createElement("div");
    hoverTooltip.style.position = "fixed";
    hoverTooltip.style.pointerEvents = "none";
    hoverTooltip.style.zIndex = "9999";
    document.body.appendChild(hoverTooltip);
  }

  const ratingHTML = store.rating_avg
    ? `<div style="
         color:rgb(115,98,75);
         font-size:11px;
         margin-top:2px;
       ">
         ★ ${Number(store.rating_avg).toFixed(1)}
         ${store.rating_count ? `• ${store.rating_count}` : ""}
       </div>`
    : "";

hoverTooltip.innerHTML = `
  <div style="
    background:#0a0a0a;
    color:rgb(115,98,75);
    padding:6px 10px;
    border-radius:8px;
    font-size:12px;
    white-space:nowrap;
    border:1px solid rgba(115,98,75,0.35);
    font-family:DM Sans, sans-serif;
    box-shadow:0 6px 16px rgba(0,0,0,0.55);
  ">
    <div style="font-weight:600">
      ${store.name}
    </div>
    ${ratingHTML}
  </div>
`;

const rect = pin.getBoundingClientRect();

hoverTooltip.style.left = rect.left + rect.width / 2 + "px";
hoverTooltip.style.top = rect.top - 10 + "px";
hoverTooltip.style.transform = "translate(-50%, -100%)";

hoverTooltip.style.opacity = "1";

});


// ================= HOVER END =================

pin.addEventListener("mouseleave", () => {

  pin.style.transform = "scale(1)";
  pin.style.boxShadow = "";

  // restore other pins
markerCache.forEach((m) => {
  if (m.map === mapInstance) {
    m.content.style.opacity = "1";
  }
});

  if (hoverTooltip) {
    hoverTooltip.remove();
    hoverTooltip = null;
  }

});

// ================= CLICK =================

pin.addEventListener("click", (e) => {

  e.stopPropagation();   // 🔧 stop map click bubbling

  console.log("PIN CLICK", id);

  if (hoverTooltip) {
    hoverTooltip.remove();
    hoverTooltip = null;
  }

  openModal(id);

});

markerCache.set(id, marker);

});

  // ============================================================
  // REMOVE MARKERS OUTSIDE VIEW
  // ============================================================

markerCache.forEach((marker, id) => {

  if (!incoming.has(id)) {

    marker.map = null;

    // 🔧 cleanup DOM
    if (marker.content) {
      marker.content.replaceChildren();
    }

    markerCache.delete(id);
  }

});

  // ============================================================
  // CLUSTER ENGINE
  // ============================================================

  const shouldCluster = zoom <= 5;

  // clear cluster before rebuild
  if (markerCluster) {
    markerCluster.clearMarkers();
    markerCluster = null;
  }

  if (shouldCluster) {

    // hide pins while clustering
    markerCache.forEach(marker => {
      marker.map = null;
    });

    markerCluster = new markerClusterer.MarkerClusterer({
      map: mapInstance,
      markers: Array.from(markerCache.values()),
      renderer: clusterRenderer()
    });

  } else {

    // show pins when zoomed in
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

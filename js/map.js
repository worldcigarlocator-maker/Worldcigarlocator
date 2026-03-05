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
let markerCluster = null;
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
  fullscreenControl: false,
  mapId: "DEMO_MAP_ID",

  styles: [
    {
      featureType: "poi",
      stylers: [{ visibility: "off" }]
    }
  ]

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

function buildPin(types) {

  const hasStore = types?.includes("store");
  const hasLounge = types?.includes("lounge");

  let color = "#3b82f6";

  if (hasLounge && !hasStore) {
    color = "#8b5cf6";
  }

  if (hasStore && hasLounge) {
    color = "linear-gradient(90deg,#3b82f6 50%,#8b5cf6 50%)";
  }

  const pin = document.createElement("div");
  pin.style.width = "24px";
  pin.style.height = "34px";
  pin.style.position = "relative";
  pin.style.display = "flex";
  pin.style.justifyContent = "center";

  // ================= HEAD =================

  const head = document.createElement("div");

  head.style.width = "16px";
  head.style.height = "16px";
  head.style.borderRadius = "50%";
  head.style.background = color;
  head.style.border = "2px solid white";
  head.style.boxShadow = "0 4px 10px rgba(0,0,0,0.35)";
  head.style.position = "relative";
  head.style.zIndex = "2";

  // glossy highlight

  const gloss = document.createElement("div");

  gloss.style.position = "absolute";
  gloss.style.top = "2px";
  gloss.style.left = "3px";
  gloss.style.width = "14px";
  gloss.style.height = "8px";
  gloss.style.borderRadius = "50%";
  gloss.style.background = "rgba(255,255,255,0.6)";
  gloss.style.filter = "blur(1px)";

  head.appendChild(gloss);

  // ================= NEEDLE =================

  const needle = document.createElement("div");

  needle.style.position = "absolute";
  needle.style.top = "22px";
  needle.style.left = "50%";
  needle.style.transform = "translateX(-50%)";
  needle.style.width = "2px";
  needle.style.height = "16px";
  needle.style.background = "#6b7280";
  needle.style.borderRadius = "2px";
  needle.style.boxShadow = "0 2px 3px rgba(0,0,0,0.3)";

  pin.appendChild(head);
  pin.appendChild(needle);

  return pin;
}

// ============================================================
// RENDER MARKERS
// ============================================================

function renderMarkers(stores) {

  stores.forEach(store => {

    const id = Number(store.id);

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

  if (markerCluster) {
    markerCluster.clearMarkers();
  }

 markerCluster = new markerClusterer.MarkerClusterer({
  map: mapInstance,
  markers: Array.from(markerCache.values()),

  renderer: {
    render({ count, position }) {

      const div = document.createElement("div");

      div.style.background = "#0a0a0a";
div.style.color = "rgb(115,98,75)";
div.style.border = "1px solid rgba(115,98,75,0.35)";
      
      div.style.padding = "6px 12px";
      div.style.borderRadius = "999px";

      div.style.fontFamily = "DM Sans, sans-serif";
      div.style.fontSize = "13px";
      div.style.fontWeight = "600";

      div.style.display = "flex";
      div.style.alignItems = "center";
      div.style.justifyContent = "center";

      div.style.boxShadow = "0 4px 14px rgba(0,0,0,0.55)";

      div.textContent = count;

      return new google.maps.marker.AdvancedMarkerElement({
        position,
        content: div
      });

    }
  }

});

} 

// ============================================================
// EVENTS FROM SEARCH UI

document.addEventListener("wcl:map-open", () => {
  initMap();
});

document.addEventListener("wcl:map-close", () => {
  // future cleanup
});

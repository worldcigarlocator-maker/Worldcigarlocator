// ============================================================
// MAP.JS — WCL MAP VIEW
// Canonical · Viewport Loading · Marker Cache · Custom Pins
// ============================================================

import { supabase } from "./globals.js";
import { openModal } from "./modal.js";
import { getPin } from "./map-pins.js";

// ============================================================
// STATE
// ============================================================

let mapInstance = null;
let markerCache = new Map();
let debounceTimer = null;


// ============================================================
// INIT MAP
// ============================================================

export function initMap() {

  const mapContainer = document.getElementById("map");

  mapInstance = new google.maps.Map(mapContainer, {
    center: { lat: 20, lng: 0 },
    zoom: 2,
    minZoom: 2,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false
  });

  // ----------------------------------------------------------
  // VIEWPORT LISTENER
  // ----------------------------------------------------------

  mapInstance.addListener("idle", () => {

    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
      loadStoresFromBounds();
    }, 180);

  });

}


// ============================================================
// LOAD STORES FROM VIEWPORT
// ============================================================

async function loadStoresFromBounds() {

  const bounds = mapInstance.getBounds();
  if (!bounds) return;

  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();

  const { data, error } = await supabase.rpc(
    "map_stores_in_bounds_v1",
    {
      p_min_lat: sw.lat(),
      p_max_lat: ne.lat(),
      p_min_lng: sw.lng(),
      p_max_lng: ne.lng()
    }
  );

  if (error) {
    console.error("Map RPC error:", error);
    return;
  }

  renderMarkers(data || []);

}


// ============================================================
// RENDER MARKERS
// ============================================================

function renderMarkers(stores) {

  stores.forEach(store => {

    // --------------------------------------------------------
    // SKIP IF MARKER EXISTS
    // --------------------------------------------------------

    if (markerCache.has(store.id)) return;

    // --------------------------------------------------------
    // GET PIN
    // --------------------------------------------------------

    const icon = getPin(store.types);
    if (!icon) return;

    // --------------------------------------------------------
    // CREATE MARKER
    // --------------------------------------------------------

    const marker = new google.maps.Marker({
      position: {
        lat: store.lat,
        lng: store.lng
      },
      map: mapInstance,
      icon: {
        ...icon,
        anchor: new google.maps.Point(14, 28)
      }
    });

    // --------------------------------------------------------
    // CLICK → MODAL
    // --------------------------------------------------------

    marker.addListener("click", () => {
      openModal(store.id);
    });

    // --------------------------------------------------------
    // CACHE
    // --------------------------------------------------------

    markerCache.set(store.id, marker);

  });

}


// ============================================================
// CLEAR MAP (HELPER)
// ============================================================

export function clearMap() {

  markerCache.forEach(marker => {
    marker.setMap(null);
  });

  markerCache.clear();

}

// ============================================================
// GOOGLE MAPS GLOBAL INIT
// ============================================================

window.initMap = initMap;

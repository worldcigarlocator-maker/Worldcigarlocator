// ============================================================
// MAP.JS — WCL MAP VIEW
// Viewport loading · Marker cache · Custom pins
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

  const ne = bounds.getNorthEast();
  const sw = bounds.getSouthWest();

  const north = ne.lat();
  const east = ne.lng();
  const south = sw.lat();
  const west = sw.lng();

  const { data, error } = await supabase.rpc(
    "map_stores_in_bounds_v1",
    { north, south, east, west }
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

    // skip om marker redan finns
    if (markerCache.has(store.id)) return;

    const icon = getPin(store.types);
    if (!icon) return;

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

    marker.addListener("click", () => {
      openModal(store.id);
    });

    markerCache.set(store.id, marker);

  });

}


// ============================================================
// CLEAR MAP (optional helper)
// ============================================================

export function clearMap() {

  markerCache.forEach(marker => {
    marker.setMap(null);
  });

  markerCache.clear();

}

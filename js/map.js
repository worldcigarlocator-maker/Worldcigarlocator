// ============================================================
// MAP.JS — WCL MAP VIEW
// Canonical · Viewport Loading · Marker Cache
// ============================================================

import { supabase } from "./globals.js";
import { getPin } from "./map-pins.js";
import { openModal } from "./modal.js";

// ============================================================
// STATE
// ============================================================

let mapInstance = null;
let markerCache = new Map();
let boundsDebounce = null;

// ============================================================
// DOM
// ============================================================

const mapContainer = document.getElementById("map");

// ============================================================
// INIT MAP
// ============================================================

export function initMap() {

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

    if(boundsDebounce){
      clearTimeout(boundsDebounce);
    }

    boundsDebounce = setTimeout(() => {
      loadStoresFromBounds();
    }, 180);

  });

}

// ============================================================
// LOAD STORES FROM VIEWPORT
// ============================================================

async function loadStoresFromBounds(){

  const bounds = mapInstance.getBounds();

  if(!bounds) return;

  const ne = bounds.getNorthEast();
  const sw = bounds.getSouthWest();

  const north = ne.lat();
  const east = ne.lng();
  const south = sw.lat();
  const west = sw.lng();

  // ----------------------------------------------------------
  // SUPABASE RPC
  // ----------------------------------------------------------

  const { data, error } = await supabase.rpc(
    "map_stores_in_bounds_v1",
    {
      north,
      south,
      east,
      west
    }
  );

  if(error){
    console.error("Map RPC error:", error);
    return;
  }

  renderMarkers(data || []);

}

// ============================================================
// RENDER MARKERS
// ============================================================

function renderMarkers(stores){

  stores.forEach(store => {

    // --------------------------------------------------------
    // SKIP IF MARKER EXISTS
    // --------------------------------------------------------

    if(markerCache.has(store.id)) return;

    // --------------------------------------------------------
    // PIN
    // --------------------------------------------------------

    const icon = getPin(store.types);

    if(!icon) return;

    // --------------------------------------------------------
    // MARKER
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
// PUBLIC HELPER
// ============================================================

export function clearMap(){

  markerCache.forEach(marker => {
    marker.setMap(null);
  });

  markerCache.clear();

}

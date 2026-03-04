// ============================================================
// search-v2.js — WCL Frontend (Search v2 · CANONICAL)
// ============================================================

import { supabase } from "./globals.js";
import { openModal } from "./modal.js";

import {
  activateSearch,
  clearSearchMaster,
  clearLocationMaster,
  toggleChip,
  resetToHero,
  setSort
} from "./cards.js";

const qs = (sel) => document.querySelector(sel);

document.addEventListener("DOMContentLoaded", () => {

  const input    = qs("#searchInput");
  const clearBtn = qs("#clearBtn");
  const label    = qs(".search-label");
  const controls = qs("#searchControls");

  if (!input) return;

/* ============================================================
   MAP MODE + GOOGLE MAPS (CLEAN VERSION)
   ============================================================ */

const mapBtn = qs("#mapViewBtn");
const mapView = qs("#mapView");
const hero = qs("#heroImage");
const storeGrid = qs("#storeGrid");
const resultsToolbar = qs(".results-toolbar");

let MAP_MODE = false;
let googleMapsLoaded = false;
let mapInstance = null;
  let currentMarkers = [];
let isFetching = false;

/* ================= GOOGLE MAPS LOADER ================= */

function loadGoogleMaps() {
  return new Promise((resolve, reject) => {

    if (googleMapsLoaded) {
      resolve();
      return;
    }

    const existingScript = document.querySelector(
      "script[src*='maps.googleapis.com/maps/api/js']"
    );

    if (existingScript) {
      googleMapsLoaded = true;
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src =
      "https://maps.googleapis.com/maps/api/js?key=AIzaSyBzHH9QNHPGWpQrczIGgWs1wnHGALiwNZw&v=weekly";

    script.async = true;
    script.defer = true;

    script.onload = () => {
      googleMapsLoaded = true;
      console.log("Google Maps loaded");
      resolve();
    };

    script.onerror = () => reject("Google Maps failed to load");

    document.head.appendChild(script);

  });
}

/* ================= MAP INITIALIZATION ================= */

function initMap() {

  if (mapInstance) return;

  const mapContainer = document.getElementById("mapView");
  if (!mapContainer) return;

  mapInstance = new google.maps.Map(mapContainer, {
    center: { lat: 20, lng: 0 },
    zoom: 2,
    minZoom: 2,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
  });

  // 👇 LÄGG DEN HÄR
mapInstance.addListener("idle", loadStoresFromBounds);
  
  // 🔥 CREATE LOCATION BUTTON INSIDE MAP
  const locateBtn = document.createElement("button");
  locateBtn.id = "locateBtn";
  locateBtn.className = "map-locate-btn";
  locateBtn.textContent = "Use my location";

  mapContainer.appendChild(locateBtn);

  enableUserLocation();
}

  /* ================= VIEWPORT STORE LOADING ================= */

async function loadStoresFromBounds() {

  if (!mapInstance || isFetching) return;

  const bounds = mapInstance.getBounds();
  if (!bounds) return;

  isFetching = true;

  const ne = bounds.getNorthEast();
  const sw = bounds.getSouthWest();

  const { data, error } = await supabase.rpc(
    "stores_within_bounds",
    {
      p_north: ne.lat(),
      p_south: sw.lat(),
      p_east:  ne.lng(),
      p_west:  sw.lng()
    }
  );

  if (!error) {
    renderStoreMarkers(data);
  } else {
    console.error(error);
  }

  isFetching = false;
}
  /* ================= USER GEOLOCATION ================= */

function enableUserLocation() {

  const locateBtn = document.getElementById("locateBtn");
  if (!locateBtn) return;

  locateBtn.addEventListener("click", () => {

    if (!navigator.geolocation) {
      alert("Geolocation not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(

      (position) => {

        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;

        mapInstance.setCenter({ lat: userLat, lng: userLng });
        mapInstance.setZoom(14);

        new google.maps.Marker({
          position: { lat: userLat, lng: userLng },
          map: mapInstance,
        });

      },

      () => {
        alert("Location permission denied");
      }

    );

  });

}

  /* ================= RENDER STORE MARKERS ================= */

function renderStoreMarkers(stores) {

  // Rensa gamla markers
  currentMarkers.forEach(m => m.setMap(null));
  currentMarkers = [];

  if (!stores) return;

  stores.forEach(store => {

    const hasStore  = store.types?.includes("store");
const hasLounge = store.types?.includes("lounge");

let fillColor;

// 🔵 Allt som innehåller store (store eller store+lounge)
if (hasStore) {
  fillColor = "#3b82f6"; // store blå
}

// 🟣 Endast lounge
else if (hasLounge) {
  fillColor = "#8b5cf6"; // lounge lila
}

// Annars visa inte alls
else {
  return;
}

const marker = new google.maps.Marker({
  position: { lat: store.lat, lng: store.lng },
  map: mapInstance,
  icon: {
    path: google.maps.SymbolPath.CIRCLE,
    scale: 7,
    fillColor: fillColor,
    fillOpacity: 1,
    strokeWeight: 2,
    strokeColor: fillColor
  }
});

// 🔥 Klick öppnar WCL modal
marker.addListener("click", () => {
  openModal(store);
});

currentMarkers.push(marker);

  });

}
/* ================= MAP TOGGLE ================= */

if (mapBtn && mapView) {

  mapBtn.addEventListener("click", async () => {

    MAP_MODE = !MAP_MODE;
    mapBtn.classList.toggle("active");

    if (MAP_MODE) {

      hero?.classList.add("hidden");
      storeGrid?.classList.add("hidden");
      resultsToolbar?.classList.add("hidden");

      mapView.classList.remove("hidden");

   try {
  await loadGoogleMaps();
  initMap();
  enableUserLocation();
} catch (err) {
  console.error(err);
}

    } else {

      hero?.classList.remove("hidden");
      storeGrid?.classList.remove("hidden");
      resultsToolbar?.classList.remove("hidden");

      mapView.classList.add("hidden");

    }

  });

}
  // ============================================================
// BRAND = HOME
// ============================================================

const homeBtn = qs("#homeBtn");

homeBtn?.addEventListener("click", () => {

  if (input) input.value = "";

  clearSearchMaster();
  clearLocationMaster();
  resetToHero();
  setSort("relevance");

  controls?.querySelectorAll(".active")
    .forEach(el => el.classList.remove("active"));
});

 // ============================================================
// RESPONSIVE
// ============================================================

const mq = window.matchMedia("(max-width: 900px)");

const syncSearchUI = () => {
  if (mq.matches) {
    input.placeholder = "Search";
    if (label) label.style.display = "none";
  } else {
    input.placeholder = "Search by name, city or address";
    if (label) label.style.display = "inline";
  }
};

syncSearchUI();
mq.addEventListener("change", syncSearchUI);

// 🔑 Hide placeholder immediately on focus
input.addEventListener("focus", () => {
  input.dataset.placeholder = input.placeholder;
  input.placeholder = "";
});

input.addEventListener("blur", () => {
  if (!input.value.trim()) {
    input.placeholder = input.dataset.placeholder || "";
  }
});
  
// ============================================================
// FOCUS RESET (FORCED)
// ============================================================

input.addEventListener("focus", () => {

  input.value = "";

  clearSearchMaster();
  clearLocationMaster();
  resetToHero();
  setSort("relevance");

  controls?.querySelectorAll(".active")
    .forEach(el => el.classList.remove("active"));
});

  // ============================================================
  // INPUT (DEBOUNCED)
  // ============================================================

  let TIMER = null;

  input.addEventListener("input", () => {
    const text = input.value.trim();

    clearTimeout(TIMER);

    TIMER = setTimeout(() => {
      if (!text) {
        clearSearchMaster();
      } else {
        activateSearch({ text });
      }
    }, 250);
  });

  input.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;

    const text = input.value.trim();
    if (!text) {
      clearSearchMaster();
    } else {
      activateSearch({ text });
    }
  });

  // ============================================================
  // CLEAR BUTTON
  // ============================================================

  clearBtn?.addEventListener("click", () => {
    input.value = "";

    clearSearchMaster();
    clearLocationMaster();
    resetToHero();
    setSort("relevance");

    controls?.querySelectorAll(".active")
      .forEach(el => el.classList.remove("active"));

    input.focus();
  });

  // ============================================================
  // FILTERS + SORT
  // ============================================================

  controls?.addEventListener("click", (e) => {

    const btn = e.target.closest("[data-filter], [data-sort]");
    if (!btn) return;

    const { filter, value, sort } = btn.dataset;

 // ============================================================
// FILTERS (FULL MULTI-SELECT)
// ============================================================

    if (filter) {

  const isActive = btn.classList.contains("active");

  // Toggle visual state only (no group reset)
  btn.classList.toggle("active", !isActive);

  // Delegate logic to cards.js
  if (filter === "type") {
    toggleChip({ type: value });
  }

  if (filter === "access") {
    toggleChip({ access: value });
  }

  return;
}

    // SORT
    if (sort) {

      const isActive = btn.classList.contains("active");

      controls.querySelectorAll("[data-sort]")
        .forEach(el => el.classList.remove("active"));

      if (!isActive) {
        btn.classList.add("active");
        setSort(sort);
      } else {
        setSort("relevance");
      }
    }

  });

  // ============================================================
  // MASTER SYNC (SEARCH ↔ LOCATION)
  // ============================================================

  document.addEventListener("wcl:master-change", (e) => {
    const { master } = e.detail || {};

    if (master === "location") {
      if (input) input.value = "";
    }
  });

});

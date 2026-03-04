// ============================================================
// MAP-PINS.JS — WCL MAP PIN SYSTEM
// Canonical · Cached SVG Icons · Google Maps Ready
// ============================================================

// ------------------------------------------------------------
// CACHE
// ------------------------------------------------------------

let PIN_STORE = null;
let PIN_LOUNGE = null;
let PIN_STORE_LOUNGE = null;


// ------------------------------------------------------------
// STORE PIN (BLUE)
// ------------------------------------------------------------

function buildStorePin(){

return {
  url: `data:image/svg+xml;charset=UTF-8,
<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 48 48">

<defs>
<linearGradient id="shine" x1="0" y1="0" x2="0" y2="1">
<stop offset="0%" stop-color="white" stop-opacity="0.35"/>
<stop offset="40%" stop-color="white" stop-opacity="0"/>
</linearGradient>
</defs>

<path d="M24 2C15 2 8 9 8 18c0 11 16 28 16 28s16-17 16-28c0-9-7-16-16-16z"
fill="#1E88E5"/>

<circle cx="24" cy="16" r="9" fill="url(#shine)"/>

</svg>`
};

}


// ------------------------------------------------------------
// LOUNGE PIN (PURPLE)
// ------------------------------------------------------------

function buildLoungePin(){

return {
  url: `data:image/svg+xml;charset=UTF-8,
<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 48 48">

<defs>
<linearGradient id="shine" x1="0" y1="0" x2="0" y2="1">
<stop offset="0%" stop-color="white" stop-opacity="0.35"/>
<stop offset="40%" stop-color="white" stop-opacity="0"/>
</linearGradient>
</defs>

<path d="M24 2C15 2 8 9 8 18c0 11 16 28 16 28s16-17 16-28c0-9-7-16-16-16z"
fill="#8E24AA"/>

<circle cx="24" cy="16" r="9" fill="url(#shine)"/>

</svg>`
};

}


// ------------------------------------------------------------
// STORE + LOUNGE PIN (FADE SPLIT)
// ------------------------------------------------------------

function buildStoreLoungePin(){

return {
  url: `data:image/svg+xml;charset=UTF-8,
<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 48 48">

<defs>

<linearGradient id="split" x1="0" y1="0" x2="1" y2="0">
<stop offset="0%" stop-color="#1E88E5"/>
<stop offset="48%" stop-color="#1E88E5"/>
<stop offset="52%" stop-color="#8E24AA"/>
<stop offset="100%" stop-color="#8E24AA"/>
</linearGradient>

<linearGradient id="shine" x1="0" y1="0" x2="0" y2="1">
<stop offset="0%" stop-color="white" stop-opacity="0.35"/>
<stop offset="40%" stop-color="white" stop-opacity="0"/>
</linearGradient>

</defs>

<path d="M24 2C15 2 8 9 8 18c0 11 16 28 16 28s16-17 16-28c0-9-7-16-16-16z"
fill="url(#split)"/>

<circle cx="24" cy="16" r="9" fill="url(#shine)"/>

</svg>`
};

}


// ------------------------------------------------------------
// PUBLIC PIN GETTER (CACHED)
// ------------------------------------------------------------

export function getPin(types){

if(types.includes("store") && types.includes("lounge")){

  if(!PIN_STORE_LOUNGE){
    PIN_STORE_LOUNGE = buildStoreLoungePin();
  }

  return PIN_STORE_LOUNGE;

}

if(types.includes("store")){

  if(!PIN_STORE){
    PIN_STORE = buildStorePin();
  }

  return PIN_STORE;

}

if(types.includes("lounge")){

  if(!PIN_LOUNGE){
    PIN_LOUNGE = buildLoungePin();
  }

  return PIN_LOUNGE;

}

return null;

}

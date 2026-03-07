// ============================================================
// MAP-PINS.JS — WCL ADVANCED MARKER PINS
// ============================================================

export function buildPin(types = []) {
  const hasStore = types.includes("store");
  const hasLounge = types.includes("lounge");

  const pin = document.createElement("div");
  pin.className = "wcl-pin";

  if (hasStore && hasLounge) {
    pin.classList.add("pin-split");
  } else if (hasStore) {
    pin.classList.add("pin-store");
  } else if (hasLounge) {
    pin.classList.add("pin-lounge");
  }

  // head
  const head = document.createElement("div");
  head.className = "pin-head";

  // gloss highlight
  const gloss = document.createElement("div");
  gloss.className = "pin-gloss";

  head.appendChild(gloss);

  // needle
  const needle = document.createElement("div");
  needle.className = "pin-needle";

  pin.appendChild(head);
  pin.appendChild(needle);

  return pin;
}

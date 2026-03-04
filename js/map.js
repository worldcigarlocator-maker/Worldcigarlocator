import { getPin } from "./map-pins.js";

const icon = getPin(store.types);

if(!icon) return;

const marker = new google.maps.Marker({
  position: { lat: store.lat, lng: store.lng },
  map: mapInstance,
  icon: icon
});

// ============================================================
// MAP PINS — WCL
// ============================================================

export function getPin(types) {

  let color = "#1E88E5"; // store default

  if (types?.includes("lounge") && !types?.includes("store")) {
    color = "#8E24AA";
  }

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 48 48">
<path d="M24 2C15 2 8 9 8 18c0 11 16 28 16 28s16-17 16-28c0-9-7-16-16-16z"
fill="${color}"/>
</svg>
`;

  return {
    url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg),
    scaledSize: new google.maps.Size(28, 28),
    anchor: new google.maps.Point(14, 28)
  };

}

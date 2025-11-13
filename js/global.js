/* ============================================================
   GLOBALS — Backend V5.2.1 shared logic for frontend
   ============================================================ */

export const WCL = {
  SUPABASE_URL: "https://gbxxoeplkzbhsvagnfsr.supabase.co",
  PHOTO_PROXY_URL: "https://gbxxoeplkzbhsvagnfsr.functions.supabase.co/photo-proxy",
  FALLBACK_IMG: "https://worldcigarlocator-maker.github.io/Worldcigarlocator/images/store.jpg",
  FLAGS_BASE: "https://worldcigarlocator-maker.github.io/Worldcigarlocator/assets/flags"
};

/* ---------------- PHOTO URL ---------------- */
export function photoURL(ref, w = 800) {
  if (!ref) return WCL.FALLBACK_IMG;
  return `${WCL.PHOTO_PROXY_URL}?photo_reference=${encodeURIComponent(ref)}&maxwidth=${w}`;
}

/* ---------------- ISO2 ENGINE (same as Backoffice) ---------------- */
const ISO2_BASE = {
  "us":"united states","gb":"united kingdom","se":"sweden","de":"germany","fr":"france","it":"italy","es":"spain",
  "ca":"canada","mx":"mexico","br":"brazil","ar":"argentina","ch":"switzerland","no":"norway","fi":"finland",
  "dk":"denmark","nl":"netherlands","be":"belgium","pt":"portugal","pl":"poland","jp":"japan","cn":"china",
  "kr":"south korea","au":"australia","nz":"new zealand","za":"south africa","th":"thailand","sg":"singapore",
  "ae":"united arab emirates","sa":"saudi arabia","gr":"greece","at":"austria","ie":"ireland","cz":"czechia",
  "ro":"romania","bg":"bulgaria","hu":"hungary","hr":"croatia","rs":"serbia","ua":"ukraine"
};

/* NAME → ISO2 */
const COUNTRY_TO_ISO2 = {};
for (const [iso, name] of Object.entries(ISO2_BASE)) {
  COUNTRY_TO_ISO2[name] = iso;
}

/* Normalize */
function norm(str) {
  return (str || "")
    .toLowerCase()
    .trim()
    .replace(/[’']/g, "'")
    .replace(/\./g, "")
    .replace(/,/g, "")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ");
}

/* Resolve flag URL */
export function flagURL(country, isoOverride = null) {
  if (!country && !isoOverride) return null;

  if (isoOverride && ISO2_BASE[isoOverride]) {
    return `${WCL.FLAGS_BASE}/${isoOverride}.svg`;
  }

  const key = norm(country);

  if (ISO2_BASE[key]) {
    return `${WCL.FLAGS_BASE}/${key}.svg`;
  }

  const iso = COUNTRY_TO_ISO2[key];
  return iso ? `${WCL.FLAGS_BASE}/${iso}.svg` : null;
}

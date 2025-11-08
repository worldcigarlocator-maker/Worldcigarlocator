/* ================================
   js/add-store.js
   Frontend Add Store form
   Shared logic via add-shared.js
   ================================ */

// 🌍 Global plats-data tillgänglig överallt
window.selectedPlace = {};

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("addStoreForm");
  const submitBtn = document.getElementById("saveBtn");
  const preview = document.getElementById("preview");

  // 🗺️ Initieras av Google Maps callback (från add-shared.js)
  window.initAutocomplete = async function initAutocomplete() {
const autocomplete = new google.maps.places.Autocomplete(input, {
  fields: [
    "place_id",
    "geometry",
    "formatted_address",
    "name",
    "photos",
    "address_components",
    "international_phone_number",
    "website"
  ],
  types: ["establishment"],
  language: "en", // 👈 Force English output from Google Places
});


autocomplete.addListener("place_changed", async () => {
  const place = autocomplete.getPlace();
  if (!place.place_id) return;

  // 🔸 Grunddata
  window.selectedPlace = {
    name: place.name || "",
    address: place.formatted_address || "",
    place_id: place.place_id,
    lat: place.geometry?.location?.lat() || null,
    lng: place.geometry?.location?.lng() || null,
  };

// 🔹 Land & stad
const comp = place.address_components || [];
const cityObj =
  comp.find((c) => c.types.includes("locality")) ||
  comp.find((c) => c.types.includes("postal_town"));
const countryObj = comp.find((c) => c.types.includes("country"));

window.selectedPlace.city = cityObj?.long_name || "";
window.selectedPlace.country_iso2 = countryObj?.short_name?.toLowerCase() || null;

// ============================================================
// 🌍 ISO2 → English Country Names (UN complete list)
// ============================================================
const ISO2_TO_COUNTRY_EN = {
  af:"Afghanistan", al:"Albania", dz:"Algeria", as:"American Samoa", ad:"Andorra",
  ao:"Angola", ai:"Anguilla", ag:"Antigua and Barbuda", ar:"Argentina", am:"Armenia",
  aw:"Aruba", au:"Australia", at:"Austria", az:"Azerbaijan", bs:"Bahamas",
  bh:"Bahrain", bd:"Bangladesh", bb:"Barbados", by:"Belarus", be:"Belgium",
  bz:"Belize", bj:"Benin", bm:"Bermuda", bt:"Bhutan", bo:"Bolivia",
  ba:"Bosnia and Herzegovina", bw:"Botswana", br:"Brazil", io:"British Indian Ocean Territory",
  vg:"British Virgin Islands", bn:"Brunei", bg:"Bulgaria", bf:"Burkina Faso", bi:"Burundi",
  kh:"Cambodia", cm:"Cameroon", ca:"Canada", cv:"Cape Verde", ky:"Cayman Islands",
  cf:"Central African Republic", td:"Chad", cl:"Chile", cn:"China", cx:"Christmas Island",
  cc:"Cocos (Keeling) Islands", co:"Colombia", km:"Comoros", cg:"Congo", cd:"Congo (DRC)",
  ck:"Cook Islands", cr:"Costa Rica", hr:"Croatia", cu:"Cuba", cw:"Curaçao",
  cy:"Cyprus", cz:"Czech Republic", dk:"Denmark", dj:"Djibouti", dm:"Dominica",
  do:"Dominican Republic", ec:"Ecuador", eg:"Egypt", sv:"El Salvador", gq:"Equatorial Guinea",
  er:"Eritrea", ee:"Estonia", sz:"Eswatini", et:"Ethiopia", fk:"Falkland Islands",
  fo:"Faroe Islands", fj:"Fiji", fi:"Finland", fr:"France", gf:"French Guiana",
  pf:"French Polynesia", ga:"Gabon", gm:"Gambia", ge:"Georgia", de:"Germany",
  gh:"Ghana", gi:"Gibraltar", gr:"Greece", gl:"Greenland", gd:"Grenada",
  gp:"Guadeloupe", gu:"Guam", gt:"Guatemala", gg:"Guernsey", gn:"Guinea",
  gw:"Guinea-Bissau", gy:"Guyana", ht:"Haiti", hn:"Honduras", hk:"Hong Kong",
  hu:"Hungary", is:"Iceland", in:"India", id:"Indonesia", ir:"Iran", iq:"Iraq",
  ie:"Ireland", im:"Isle of Man", il:"Israel", it:"Italy", jm:"Jamaica",
  jp:"Japan", je:"Jersey", jo:"Jordan", kz:"Kazakhstan", ke:"Kenya",
  ki:"Kiribati", kp:"North Korea", kr:"South Korea", kw:"Kuwait", kg:"Kyrgyzstan",
  la:"Laos", lv:"Latvia", lb:"Lebanon", ls:"Lesotho", lr:"Liberia", ly:"Libya",
  li:"Liechtenstein", lt:"Lithuania", lu:"Luxembourg", mo:"Macao", mg:"Madagascar",
  mw:"Malawi", my:"Malaysia", mv:"Maldives", ml:"Mali", mt:"Malta",
  mh:"Marshall Islands", mq:"Martinique", mr:"Mauritania", mu:"Mauritius",
  yt:"Mayotte", mx:"Mexico", fm:"Micronesia", md:"Moldova", mc:"Monaco",
  mn:"Mongolia", me:"Montenegro", ms:"Montserrat", ma:"Morocco", mz:"Mozambique",
  mm:"Myanmar (Burma)", na:"Namibia", nr:"Nauru", np:"Nepal", nl:"Netherlands",
  nc:"New Caledonia", nz:"New Zealand", ni:"Nicaragua", ne:"Niger", ng:"Nigeria",
  nu:"Niue", nf:"Norfolk Island", mk:"North Macedonia", mp:"Northern Mariana Islands",
  no:"Norway", om:"Oman", pk:"Pakistan", pw:"Palau", ps:"Palestine",
  pa:"Panama", pg:"Papua New Guinea", py:"Paraguay", pe:"Peru", ph:"Philippines",
  pl:"Poland", pt:"Portugal", pr:"Puerto Rico", qa:"Qatar", re:"Réunion",
  ro:"Romania", ru:"Russia", rw:"Rwanda", bl:"Saint Barthélemy", kn:"Saint Kitts and Nevis",
  lc:"Saint Lucia", mf:"Saint Martin", vc:"Saint Vincent and the Grenadines",
  ws:"Samoa", sm:"San Marino", st:"São Tomé and Príncipe", sa:"Saudi Arabia",
  sn:"Senegal", rs:"Serbia", sc:"Seychelles", sl:"Sierra Leone", sg:"Singapore",
  sk:"Slovakia", si:"Slovenia", sb:"Solomon Islands", so:"Somalia", za:"South Africa",
  ss:"South Sudan", es:"Spain", lk:"Sri Lanka", sd:"Sudan", sr:"Suriname",
  sj:"Svalbard and Jan Mayen", se:"Sweden", ch:"Switzerland", sy:"Syria",
  tw:"Taiwan", tj:"Tajikistan", tz:"Tanzania", th:"Thailand", tl:"Timor-Leste",
  tg:"Togo", to:"Tonga", tt:"Trinidad and Tobago", tn:"Tunisia", tr:"Turkey",
  tm:"Turkmenistan", tc:"Turks and Caicos Islands", tv:"Tuvalu", ug:"Uganda",
  ua:"Ukraine", ae:"United Arab Emirates", gb:"United Kingdom", us:"United States",
  uy:"Uruguay", uz:"Uzbekistan", vu:"Vanuatu", ve:"Venezuela", vn:"Vietnam",
  eh:"Western Sahara", ye:"Yemen", zm:"Zambia", zw:"Zimbabwe"
};

// 🇬🇧 Always English name
window.selectedPlace.country =
  ISO2_TO_COUNTRY_EN[window.selectedPlace.country_iso2] ||
  (countryObj?.long_name || "");

// 🌎 Always use ISO2 → Continent
window.selectedPlace.continent = WCL.countryToContinent(null, window.selectedPlace.country_iso2);

  // 🇨🇭 ISO2 (för flaggan)
  window.selectedPlace.country_iso2 = countryObj?.short_name?.toLowerCase() || null;

  // 📞💻 Hämta via din Supabase-funktion
  try {
    const res = await fetch("https://gbxxoeplkzbhsvagnfsr.functions.supabase.co/fetch-place-details", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ place_id: place.place_id }),
    });

    if (res.ok) {
      const details = await res.json();
      window.selectedPlace.phone = details.phone || "";
      window.selectedPlace.website = details.website || "";
    } else {
      console.warn("fetch-place-details failed:", res.status);
    }
  } catch (err) {
    console.warn("fetch-place-details error:", err);
  }

  // 🖼️ Foto
  const refs = await WCL.fetchPhotoRefs(place.place_id);
  if (refs.length) {
    window.selectedPlace.photo_reference = refs[0];
    const url = await WCL.resolveGooglePhotoUrl(refs[0]);
    preview.innerHTML = `<img src="${url}" alt="Preview">`;
  } else {
    const fallback = WCL.fallbackForType("store");
    preview.innerHTML = `<img src="${fallback}" alt="Preview">`;
  }

  // 🧠 Autofyll formulärfält
  if (window.selectedPlace.phone && $("#phone")) $("#phone").value = window.selectedPlace.phone;
  if (window.selectedPlace.website && $("#website")) $("#website").value = window.selectedPlace.website;

  toast("✅ Platsdata hämtad!", "success");
}); // stänger addListener
};  // stänger initAutocomplete

// 💾 Spara till Supabase
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  submitBtn.disabled = true;

  try {
    const type = document.querySelector("input[name='type']:checked")?.value || "store";
    const rating = Number(document.querySelector("input[name='rating']")?.value || 0);
    const added_by = document.querySelector("#added_by")?.value || "anonymous";

    const payload = {
      ...window.selectedPlace,
      type,
      types: [type],
      rating,
      added_by,
      approved: false,
      flagged: false,
      deleted: false,
      phone: window.selectedPlace.phone || null,
      website: window.selectedPlace.website || null,
      continent:
        window.selectedPlace.continent ||
        (window.selectedPlace.country
          ? WCL.countryToContinent(window.selectedPlace.country)
          : null),
      country_iso2: window.selectedPlace.country_iso2 || null,
    };

    console.log("📦 Saving payload →", payload);

    const { data, error } = await supabase.from("stores").insert([payload]);
    if (error) throw error;

    toast("✅ Store added successfully!", "success");
    form.reset();
    preview.innerHTML = "";
    window.selectedPlace = {};
  } catch (err) {
    console.error(err);
    toast("❌ Error saving store", "error");
  } finally {
    submitBtn.disabled = false;
  }
});
});

/* ============================================================
   WCL I18N — CANONICAL RUNTIME
============================================================ */

const DEFAULT_LANGUAGE = "en";

const SUPPORTED_LANGUAGES = [
  "en",
  "es",
  "de",
  "fr",
  "it",
  "pt",
  "zh",
  "ja",
  "ar"
];

/* ============================================================
   STATE
============================================================ */

let CURRENT_LANGUAGE = DEFAULT_LANGUAGE;
let CURRENT_DICT = {};

/* ============================================================
   STORAGE
============================================================ */

export function getLanguage() {

  const local =
    localStorage.getItem("wcl_language");

  if (
    local &&
    SUPPORTED_LANGUAGES.includes(local)
  ) {
    return local;
  }

  return DEFAULT_LANGUAGE;
}

export function setLanguage(lang) {

  if (
    !SUPPORTED_LANGUAGES.includes(lang)
  ) {
    return;
  }

  CURRENT_LANGUAGE = lang;

  localStorage.setItem(
    "wcl_language",
    lang
  );
}

/* ============================================================
   LOAD LOCALE
============================================================ */

async function loadLocale(lang) {

  if (lang === "en") {
    CURRENT_DICT = {};
    return;
  }

  try {

    const mod = await import(
      `../locales/${lang}.js`
    );

    CURRENT_DICT =
      mod.default || {};

  } catch (err) {

    console.error(
      "I18N LOAD ERROR",
      err
    );

    CURRENT_DICT = {};
  }

}

/* ============================================================
   TRANSLATE
============================================================ */
/* ============================================================
   TRANSLATE
============================================================ */

export function t(key, fallback = "") {

  return (
    CURRENT_DICT[key] ??
    fallback ??
    key
  );
}

/* ============================================================
   APPLY TRANSLATIONS
============================================================ */

export function applyTranslations() {

  /* ================= TEXT ================= */

  document
    .querySelectorAll("[data-i18n]")
    .forEach(el => {

      const key =
        el.dataset.i18n;

      const fallback =
        el.dataset.defaultText ||
        el.textContent.trim();

      if (!el.dataset.defaultText) {
        el.dataset.defaultText =
          fallback;
      }

      el.textContent =
        t(key, fallback);

    });

  /* ================= PLACEHOLDERS ================= */

  document
    .querySelectorAll(
      "[data-i18n-placeholder]"
    )
    .forEach(el => {

      const key =
        el.dataset.i18nPlaceholder;

      const fallback =
        el.dataset.defaultPlaceholder ||
        el.getAttribute("placeholder") ||
        "";

      if (!el.dataset.defaultPlaceholder) {
        el.dataset.defaultPlaceholder =
          fallback;
      }

      el.setAttribute(
        "placeholder",
        t(key, fallback)
      );

    });

  /* ================= ARIA ================= */

  document
    .querySelectorAll(
      "[data-i18n-aria]"
    )
    .forEach(el => {

      const key =
        el.dataset.i18nAria;

      const fallback =
        el.dataset.defaultAria ||
        el.getAttribute("aria-label") ||
        "";

      if (!el.dataset.defaultAria) {
        el.dataset.defaultAria =
          fallback;
      }

      el.setAttribute(
        "aria-label",
        t(key, fallback)
      );

    });

}

/* ============================================================
   INIT
============================================================ */

export async function initI18n() {

  CURRENT_LANGUAGE =
    getLanguage();

  await loadLocale(
    CURRENT_LANGUAGE
  );

  applyTranslations();

  document.documentElement.lang =
    CURRENT_LANGUAGE;

  if (CURRENT_LANGUAGE === "ar") {
    document.documentElement.dir = "rtl";
  } else {
    document.documentElement.dir = "ltr";
  }

}

/* ============================================================
   GLOBALS
============================================================ */

window.t = t;
window.setLanguage = setLanguage;
window.applyTranslations =
  applyTranslations;
window.initI18n = initI18n;

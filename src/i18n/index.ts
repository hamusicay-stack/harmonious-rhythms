import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import he from "./locales/he.json";
import en from "./locales/en.json";

export const SUPPORTED_LANGS = ["he", "en"] as const;
export type Lang = (typeof SUPPORTED_LANGS)[number];

// Direction is permanently locked to RTL at the document root.
// Do not switch document.dir based on language.
export const LANG_DIR: Record<Lang, "rtl"> = {
  he: "rtl",
  en: "rtl",
};

if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: {
        he: { translation: he },
        en: { translation: en },
      },
      fallbackLng: "he",
      supportedLngs: SUPPORTED_LANGS as unknown as string[],
      interpolation: { escapeValue: false },
      detection: {
        order: ["localStorage", "navigator"],
        lookupLocalStorage: "lang",
        caches: ["localStorage"],
      },
    });
}

// No-op kept for backwards compatibility with any lingering imports.
// The app is locked to RTL via <html dir="rtl"> in __root.tsx.
export function applyDocumentDir(_lang?: string) {
  if (typeof document === "undefined") return;
  document.documentElement.dir = "rtl";
  document.documentElement.lang = "he";
}

export default i18n;

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import he from "./locales/he.json";
import en from "./locales/en.json";

export const SUPPORTED_LANGS = ["he", "en"] as const;
export type Lang = (typeof SUPPORTED_LANGS)[number];

export const LANG_DIR: Record<Lang, "rtl" | "ltr"> = {
  he: "rtl",
  en: "ltr",
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

export function applyDocumentDir(lang: string) {
  if (typeof document === "undefined") return;
  const l = (SUPPORTED_LANGS as readonly string[]).includes(lang) ? (lang as Lang) : "he";
  const dir = LANG_DIR[l];
  document.documentElement.lang = l;
  document.documentElement.dir = dir;
}

export default i18n;

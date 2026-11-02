import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from '../locales/en.json';
import { DEFAULT_LANGUAGE, LANGUAGES, LANGUAGE_STORAGE_KEY } from './languages.js';

// i18next setup. In a component: const { t } = useTranslation(); outside React (helpers): import i18n and call i18n.t().
// The choice is kept in localStorage. The detector looks only there, not at the browser language,
// so a first visit is always in English.

// English is in the main file of the build: it is the first language of every visitor and the fallback of the others.
// Every other language is a file of its own, downloaded the first time i18n.changeLanguage() needs it (this "backend"),
// so a visitor does not download seven languages to read one. The service worker keeps them all for offline use.
const otherLanguages = import.meta.glob(['../locales/*.json', '!../locales/en.json'], { import: 'default' });
const fileOf = (code) => `../locales/${code}.json`;

export const languageBackend = {
  type: 'backend',
  init() {},
  has: (code) => code === DEFAULT_LANGUAGE || fileOf(code) in otherLanguages,
  read(language, namespace, callback) {
    const load = otherLanguages[fileOf(language)];
    if (!load) return callback(new Error(`No translation for "${language}"`), null);
    load().then(
      (data) => callback(null, data),
      (error) => callback(error, null)
    );
  },
};

i18n
  .use(LanguageDetector)
  .use(languageBackend)
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en } },
    // English comes with the code, the backend loads the others
    partialBundledLanguages: true,
    supportedLngs: LANGUAGES.map((language) => language.code),
    fallbackLng: DEFAULT_LANGUAGE,
    load: 'currentOnly', // 'zh-CN' stays 'zh-CN' and is not looked up as 'zh'
    initAsync: false, // English is bundled, so the first render already has it
    detection: {
      order: ['localStorage'],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      caches: ['localStorage'],
    },
    interpolation: { escapeValue: false }, // React already escapes what it renders
  });

// The language saved on this device, ready to show: main.jsx waits for it before the first render, so a person who chose
// Deutsch never sees the app flash in English while the file of Deutsch is on its way
export function loadSavedLanguage() {
  return i18n.changeLanguage(i18n.language).catch(() => {});
}

// <html lang> follows the language: screen readers, the browser and the CSS font choice (:lang) read it.
function syncHtmlLang(language) {
  document.documentElement.lang = language;
}
syncHtmlLang(i18n.resolvedLanguage ?? DEFAULT_LANGUAGE);
i18n.on('languageChanged', syncHtmlLang);

export default i18n;

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from '../locales/en.json';
import vi from '../locales/vi.json';
import fr from '../locales/fr.json';
import de from '../locales/de.json';
import es from '../locales/es.json';
import zhCN from '../locales/zh-CN.json';
import ja from '../locales/ja.json';
import ko from '../locales/ko.json';
import { DEFAULT_LANGUAGE, LANGUAGES, LANGUAGE_STORAGE_KEY } from './languages.js';

// i18next setup. In a component: const { t } = useTranslation(); outside React (helpers): import i18n and call i18n.t().
// The choice is kept in localStorage. The detector looks only there, not at the browser language,
// so a first visit is always in English.
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      vi: { translation: vi },
      fr: { translation: fr },
      de: { translation: de },
      es: { translation: es },
      'zh-CN': { translation: zhCN },
      ja: { translation: ja },
      ko: { translation: ko },
    },
    supportedLngs: LANGUAGES.map((language) => language.code),
    fallbackLng: DEFAULT_LANGUAGE,
    load: 'currentOnly', // 'zh-CN' stays 'zh-CN' and is not looked up as 'zh'
    initAsync: false, // the texts are bundled, so the first render already has them
    detection: {
      order: ['localStorage'],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      caches: ['localStorage'],
    },
    interpolation: { escapeValue: false }, // React already escapes what it renders
  });

// <html lang> follows the language: screen readers, the browser and the CSS font choice (:lang) read it.
function syncHtmlLang(language) {
  document.documentElement.lang = language;
}
syncHtmlLang(i18n.resolvedLanguage ?? DEFAULT_LANGUAGE);
i18n.on('languageChanged', syncHtmlLang);

export default i18n;

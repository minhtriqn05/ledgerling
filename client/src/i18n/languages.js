// The languages of the app. Each name is written in its own language, because that is how people look for it.
// code: the file name in src/locales and the value of <html lang>. short: what the small picker shows.
// intl: the locale for dates and numbers (Intl).
export const LANGUAGES = [
  { code: 'en', short: 'EN', name: 'English', intl: 'en-GB' },
  { code: 'vi', short: 'VI', name: 'Tiếng Việt', intl: 'vi-VN' },
  { code: 'fr', short: 'FR', name: 'Français', intl: 'fr-FR' },
  { code: 'de', short: 'DE', name: 'Deutsch', intl: 'de-DE' },
  { code: 'es', short: 'ES', name: 'Español', intl: 'es-ES' },
  { code: 'zh-CN', short: 'ZH', name: '中文（简体）', intl: 'zh-CN' },
  { code: 'ja', short: 'JA', name: '日本語', intl: 'ja-JP' },
  { code: 'ko', short: 'KO', name: '한국어', intl: 'ko-KR' },
];

export const DEFAULT_LANGUAGE = 'en';
export const LANGUAGE_STORAGE_KEY = 'ledgerling.language';

// 'de' -> 'de-DE'. An unknown code falls back to the default language.
export function intlLocale(code) {
  const language = LANGUAGES.find((l) => l.code === code) ?? LANGUAGES.find((l) => l.code === DEFAULT_LANGUAGE);
  return language.intl;
}

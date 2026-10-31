import i18n from '../i18n/index.js';
import { intlLocale } from '../i18n/languages.js';

// Number and date formatting shared by all pages. The format follows the language the user chose.
// Amounts are VND integers; dates are shown in Vietnam time.

const TIME_ZONE = 'Asia/Ho_Chi_Minh';

// The locale of the current language, e.g. 'de-DE'
export function currentLocale() {
  return intlLocale(i18n.resolvedLanguage);
}

// Building an Intl formatter is slow, so each one is made once per language.
const formatters = new Map();

function cached(kind, build) {
  const locale = currentLocale();
  const key = `${kind}|${locale}`;
  if (!formatters.has(key)) formatters.set(key, build(locale));
  return formatters.get(key);
}

const vndNumber = () => cached('number', (locale) => new Intl.NumberFormat(locale));
// 'en' and not 'en-GB' here: British English writes "13.6m", and the charts read better with "13.6M"
const compactNumber = () =>
  cached(
    'compact',
    (locale) => new Intl.NumberFormat(locale === 'en-GB' ? 'en' : locale, { notation: 'compact', maximumFractionDigits: 1 })
  );
const percentNumber = () =>
  cached('percent', (locale) => new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 }));
const dayMonth = () =>
  cached('dayMonth', (locale) => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', timeZone: TIME_ZONE }));
const fullDate = () =>
  cached(
    'fullDate',
    (locale) => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: TIME_ZONE })
  );
const dayMonthYear = () =>
  cached(
    'dayMonthYear',
    (locale) => new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: TIME_ZONE })
  );

// 12450000 -> "12,450,000" (English), "12.450.000" (Tiếng Việt, Deutsch)
export function formatNumber(amount) {
  return vndNumber().format(amount);
}

// 12450000 -> "12,450,000 ₫" (non-breaking space, so the unit never wraps alone)
export function formatVnd(amount) {
  return `${vndNumber().format(amount)}\u00a0₫`;
}

// Adds "+" for income and "−" for expense: "+18,500,000 ₫"
export function formatSignedVnd(amount, type) {
  return `${type === 'income' ? '+' : '−'}${formatVnd(amount)}`;
}

// 13600000 -> "13.6M", 650000 -> "650K" (chart axes and small labels)
export function formatCompact(amount) {
  return compactNumber().format(amount);
}

// 86.3 -> "86.3%" (English), "86,3 %" (Deutsch)
export function formatPercent(value) {
  return percentNumber().format(value / 100);
}

// "2026-10-25" -> "25 Oct"
export function formatDayMonth(date) {
  return dayMonth().format(new Date(date));
}

// "2026-10-25" -> "25 Oct 2026"
export function formatDate(date) {
  return fullDate().format(new Date(date));
}

// "2026-10-25" -> "25/10/2026"
export function formatDateDMY(date) {
  return dayMonthYear().format(new Date(date));
}

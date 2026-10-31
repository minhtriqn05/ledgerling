import { navItems } from '../config/navItems.js';
import { settingsLabelKey, settingsPath, visibleSections } from '../config/settingsSections.js';
import { toDateInput } from './vnDate.js';

// The command palette (components/CommandPalette): what it can jump to, and how typing narrows the list.

// Lower case and without accents, so "giao dich" finds "Giao dịch" and "reglages" finds "Réglages"
export function normalizeText(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

// The commands whose label holds every word that was typed; a label that starts with the text comes first.
// Without any text, all of them in their own order.
export function filterCommands(commands, query) {
  const wanted = normalizeText(query).trim();
  if (!wanted) return commands;
  const words = wanted.split(/\s+/);

  const found = commands.filter((command) => {
    const label = normalizeText(command.label);
    return words.every((word) => label.includes(word));
  });
  const startsWith = (command) => (normalizeText(command.label).startsWith(wanted) ? 0 : 1);
  return found.map((command, index) => ({ command, index })).sort((a, b) => startsWith(a.command) - startsWith(b.command) || a.index - b.index).map(({ command }) => command);
}

// Every page this person can open: the menu, then the sections of Settings. t: the translate function.
export function pageCommands(user, t) {
  const pages = navItems
    .filter((item) => !item.adminOnly || user?.role === 'admin')
    .map((item) => ({ id: `page:${item.path}`, group: 'pages', icon: item.icon, label: t(item.labelKey), path: item.path }));
  const sections = visibleSections(user).map((section) => ({
    id: `settings:${section.id}`,
    group: 'pages',
    icon: section.icon,
    label: `${t('nav.settings')} › ${t(settingsLabelKey(section.id))}`,
    path: settingsPath(section.id),
  }));
  return [...pages, ...sections];
}

// The Transactions page, on the day of this transaction and filtered by its note, so it is the row that shows
export function transactionPath(transaction) {
  const day = toDateInput(transaction.date);
  const params = new URLSearchParams({ from: day, to: day });
  if (transaction.note) params.set('q', transaction.note);
  return `/transactions?${params}`;
}

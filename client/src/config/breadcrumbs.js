import { navItems } from './navItems.js';
import { SETTINGS_SECTIONS, settingsLabelKey } from './settingsSections.js';

// The breadcrumb trail of a signed-in page, made from the route configuration: the pages come from navItems.js
// (so a new menu item gets its breadcrumb for free) and only the levels below a page are listed here.
// A trail is a list of { labelKey, to?, home? }: labelKey is a translation key, `to` the address of every item except the
// last (the page the visitor is on). It always starts at Home, the landing page, drawn as an icon. Examples:
//   /                     Home / Dashboard
//   /reports?tab=yearly   Home / Reports / Yearly
//   /settings/profile     Home / Settings / Profile
//   /admin/users          Home / Admin / Users
//   /transactions         Home / Transactions, and Home / Transactions / Transaction details while the drawer is open

const REPORT_TABS = ['monthly', 'yearly', 'calendar'];

// An address without a trailing slash ('/reports/' -> '/reports'); '/' stays '/'
const clean = (pathname) => (pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname);

// A level below a page, read from the address: (location) -> translation key, or null when the address is the page itself.
export const childLevels = {
  // The tab lives in the address (?tab=calendar), Monthly when there is none
  '/reports': ({ search }) => {
    const tab = new URLSearchParams(search).get('tab');
    return `reports.tabs.${REPORT_TABS.includes(tab) ? tab : 'monthly'}`;
  },
  // /settings/security. Plain /settings is the list of sections on a phone (a wide screen is sent on to Profile).
  '/settings': ({ pathname }) => {
    const id = clean(pathname).split('/')[2];
    return SETTINGS_SECTIONS.some((section) => section.id === id) ? settingsLabelKey(id) : null;
  },
  // The list of users has its own page below the numbers of /admin
  '/admin': ({ pathname }) => (clean(pathname) === '/admin/users' ? 'admin.users.title' : null),
};

// location: { pathname, search, hash }. detail: { labelKey, onBack } when a page has something open on top of it
// (the transaction drawer), or null. Returns [] for an address that is not a page of the menu.
export function buildTrail(location, detail = null) {
  const path = clean(location.pathname);
  const page = navItems.find((item) => item.path === path || (childLevels[item.path] && path.startsWith(`${item.path}/`)));
  if (!page) return [];

  const childKey = childLevels[page.path]?.(location);
  const here = `${location.pathname}${location.search}${location.hash}`;

  const trail = [{ labelKey: 'breadcrumb.home', to: '/welcome', home: true }];
  // The page links to itself when something is shown below it; a page with nothing below it is the current one
  trail.push({ labelKey: page.labelKey, to: childKey || detail ? page.path : undefined, onBack: detail?.onBack });
  if (childKey) trail.push({ labelKey: childKey, to: detail ? here : undefined, onBack: detail?.onBack });
  if (detail) trail.push({ labelKey: detail.labelKey });
  return trail;
}

import { navItems } from './navItems.js';

// The breadcrumb trail of a signed-in page, made from the route configuration: the pages come from navItems.js
// (so a new menu item gets its breadcrumb for free) and only the levels below a page are listed here.
// A trail is a list of { labelKey, to? }: labelKey is a translation key, `to` the address of every item except the last
// (the page the visitor is on). Examples:
//   /reports?tab=yearly   Dashboard / Reports / Yearly
//   /settings             Dashboard / Settings / Profile
//   /admin                Dashboard / Admin / Users
//   /transactions         Dashboard / Transactions, and Dashboard / Transactions / Transaction details while the drawer is open

const REPORT_TABS = ['monthly', 'yearly', 'calendar'];

// A level below a page, read from the address: (location) -> translation key. The page links back to itself without it.
export const childLevels = {
  // The tab lives in the address (?tab=calendar), Monthly when there is none
  '/reports': ({ search }) => {
    const tab = new URLSearchParams(search).get('tab');
    return `reports.tabs.${REPORT_TABS.includes(tab) ? tab : 'monthly'}`;
  },
  // Settings is one page of cards: it opens on the Profile card; an address like /settings#notifications names another
  '/settings': ({ hash }) => (hash === '#notifications' ? 'nav.notifications' : 'settings.profile.title'),
  // The Admin page is the list of users with the numbers above it
  '/admin': () => 'admin.users.title',
};

// An address without a trailing slash ('/reports/' -> '/reports'); '/' stays '/'
const clean = (pathname) => (pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname);

// location: { pathname, search, hash }. detail: { labelKey, onBack } when a page has something open on top of it
// (the transaction drawer), or null. Returns [] for an address that is not a page of the menu.
export function buildTrail(location, detail = null) {
  const path = clean(location.pathname);
  const page = navItems.find((item) => item.path === path);
  if (!page) return [];

  const home = navItems.find((item) => item.path === '/');
  const childKey = childLevels[path]?.(location);
  const here = `${location.pathname}${location.search}${location.hash}`;

  const trail = [];
  if (path !== '/') trail.push({ labelKey: home.labelKey, to: '/' });
  // The page links to itself when something is shown below it; a page with nothing below it is the current one
  trail.push({ labelKey: page.labelKey, to: childKey || detail ? path : undefined, onBack: detail?.onBack });
  if (childKey) trail.push({ labelKey: childKey, to: detail ? here : undefined, onBack: detail?.onBack });
  if (detail) trail.push({ labelKey: detail.labelKey });
  return trail;
}

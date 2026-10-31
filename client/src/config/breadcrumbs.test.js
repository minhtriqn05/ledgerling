import { describe, expect, it } from 'vitest';
import i18n from '../i18n/index.js';
import { navItems } from './navItems.js';
import { buildTrail, childLevels } from './breadcrumbs.js';

const where = (pathname, search = '', hash = '') => ({ pathname, search, hash });
const labels = (trail) => trail.map((item) => item.labelKey);
const links = (trail) => trail.map((item) => item.to);

describe('buildTrail', () => {
  it('is only "Dashboard" on the Dashboard', () => {
    const trail = buildTrail(where('/'));
    expect(labels(trail)).toEqual(['nav.dashboard']);
    expect(links(trail)).toEqual([undefined]);
  });

  it('starts every other page at the Dashboard, and the page itself is the last item without a link', () => {
    for (const item of navItems.filter((entry) => entry.path !== '/' && !['/reports', '/settings', '/admin'].includes(entry.path))) {
      const trail = buildTrail(where(item.path));
      expect(labels(trail), item.path).toEqual(['nav.dashboard', item.labelKey]);
      expect(links(trail), item.path).toEqual(['/', undefined]);
    }
  });

  it('adds the tab of Reports: Dashboard / Reports / Monthly (the default), Yearly, Calendar', () => {
    expect(labels(buildTrail(where('/reports')))).toEqual(['nav.dashboard', 'nav.reports', 'reports.tabs.monthly']);
    expect(labels(buildTrail(where('/reports', '?tab=yearly&year=2026')))).toEqual(['nav.dashboard', 'nav.reports', 'reports.tabs.yearly']);
    expect(labels(buildTrail(where('/reports', '?tab=calendar')))[2]).toBe('reports.tabs.calendar');
    // An unknown tab is the default one, like the page itself does
    expect(labels(buildTrail(where('/reports', '?tab=nonsense')))[2]).toBe('reports.tabs.monthly');
    expect(links(buildTrail(where('/reports', '?tab=yearly')))).toEqual(['/', '/reports', undefined]);
  });

  it('adds the card of Settings (Profile) and of Admin (Users)', () => {
    expect(labels(buildTrail(where('/settings')))).toEqual(['nav.dashboard', 'nav.settings', 'settings.profile.title']);
    expect(labels(buildTrail(where('/settings', '', '#notifications')))[2]).toBe('nav.notifications');
    expect(labels(buildTrail(where('/admin')))).toEqual(['nav.dashboard', 'nav.admin', 'admin.users.title']);
  });

  it('adds what a page has open on top of it (the transaction drawer), and the page then links back to itself', () => {
    const onBack = () => {};
    const trail = buildTrail(where('/transactions', '?month=2026-10'), { labelKey: 'breadcrumb.transactionDetails', onBack });

    expect(labels(trail)).toEqual(['nav.dashboard', 'nav.transactions', 'breadcrumb.transactionDetails']);
    expect(links(trail)).toEqual(['/', '/transactions', undefined]);
    expect(trail[1].onBack).toBe(onBack);
    expect(trail[0].onBack).toBeUndefined();
  });

  it('ignores a trailing slash, and gives nothing for an address that is not a page of the menu', () => {
    expect(labels(buildTrail(where('/budgets/')))).toEqual(['nav.dashboard', 'nav.budgets']);
    expect(buildTrail(where('/nowhere'))).toEqual([]);
    expect(buildTrail(where('/welcome'))).toEqual([]);
  });
});

describe('the texts of the trail', () => {
  const keys = new Set(['breadcrumb.label', 'breadcrumb.transactionDetails']);
  for (const item of navItems) keys.add(item.labelKey);
  for (const [path, child] of Object.entries(childLevels)) {
    for (const search of ['', '?tab=monthly', '?tab=yearly', '?tab=calendar']) keys.add(child(where(path, search)));
    keys.add(child(where(path, '', '#notifications')));
  }

  it.each([...keys])('%s exists in every language', (key) => {
    for (const language of Object.keys(i18n.options.resources)) {
      expect(i18n.exists(key, { lng: language, fallbackLng: false }), `${language}: ${key}`).toBe(true);
    }
  });
});

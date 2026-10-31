import { describe, expect, it } from 'vitest';
import i18n from '../i18n/index.js';
import { navItems } from './navItems.js';
import { buildTrail, childLevels } from './breadcrumbs.js';
import { SETTINGS_SECTIONS, settingsPath } from './settingsSections.js';

const HOME = 'breadcrumb.home';
const where = (pathname, search = '', hash = '') => ({ pathname, search, hash });
const labels = (trail) => trail.map((item) => item.labelKey);
const links = (trail) => trail.map((item) => item.to);

describe('buildTrail', () => {
  it('is Home / Dashboard on the Dashboard, and Home goes to the landing page', () => {
    const trail = buildTrail(where('/'));
    expect(labels(trail)).toEqual([HOME, 'nav.dashboard']);
    expect(links(trail)).toEqual(['/welcome', undefined]);
    expect(trail[0].home).toBe(true);
  });

  it('starts every other page at Home, and the page itself is the last item without a link', () => {
    for (const item of navItems.filter((entry) => entry.path !== '/' && !['/reports'].includes(entry.path))) {
      const trail = buildTrail(where(item.path));
      expect(labels(trail), item.path).toEqual([HOME, item.labelKey]);
      expect(links(trail), item.path).toEqual(['/welcome', undefined]);
    }
  });

  it('adds the tab of Reports: Home / Reports / Monthly (the default), Yearly, Calendar', () => {
    expect(labels(buildTrail(where('/reports')))).toEqual([HOME, 'nav.reports', 'reports.tabs.monthly']);
    expect(labels(buildTrail(where('/reports', '?tab=yearly&year=2026')))).toEqual([HOME, 'nav.reports', 'reports.tabs.yearly']);
    expect(labels(buildTrail(where('/reports', '?tab=calendar')))[2]).toBe('reports.tabs.calendar');
    // An unknown tab is the default one, like the page itself does
    expect(labels(buildTrail(where('/reports', '?tab=nonsense')))[2]).toBe('reports.tabs.monthly');
    expect(links(buildTrail(where('/reports', '?tab=yearly')))).toEqual(['/welcome', '/reports', undefined]);
  });

  it('adds the section of Settings and the Users page of Admin, and the parent links up', () => {
    expect(labels(buildTrail(where('/settings/profile')))).toEqual([HOME, 'nav.settings', 'settings.sections.profile.label']);
    expect(links(buildTrail(where('/settings/profile')))).toEqual(['/welcome', '/settings', undefined]);
    expect(labels(buildTrail(where('/settings/danger')))[2]).toBe('settings.sections.danger.label');
    expect(labels(buildTrail(where('/admin/users')))).toEqual([HOME, 'nav.admin', 'admin.users.title']);
    expect(links(buildTrail(where('/admin/users')))).toEqual(['/welcome', '/admin', undefined]);
  });

  it('has no extra level for an unknown section', () => {
    expect(labels(buildTrail(where('/settings/nonsense')))).toEqual([HOME, 'nav.settings']);
  });

  it('adds what a page has open on top of it (the transaction drawer), and the page then links back to itself', () => {
    const onBack = () => {};
    const trail = buildTrail(where('/transactions', '?month=2026-10'), { labelKey: 'breadcrumb.transactionDetails', onBack });

    expect(labels(trail)).toEqual([HOME, 'nav.transactions', 'breadcrumb.transactionDetails']);
    expect(links(trail)).toEqual(['/welcome', '/transactions', undefined]);
    expect(trail[1].onBack).toBe(onBack);
    expect(trail[0].onBack).toBeUndefined();
  });

  it('ignores a trailing slash, and gives nothing for an address that is not a page of the menu', () => {
    expect(labels(buildTrail(where('/budgets/')))).toEqual([HOME, 'nav.budgets']);
    expect(buildTrail(where('/nowhere'))).toEqual([]);
    expect(buildTrail(where('/budgets/nowhere'))).toEqual([]);
    expect(buildTrail(where('/welcome'))).toEqual([]);
  });
});

describe('the texts of the trail', () => {
  const keys = new Set([HOME, 'breadcrumb.label', 'breadcrumb.transactionDetails', 'admin.users.title']);
  for (const item of navItems) keys.add(item.labelKey);
  for (const search of ['', '?tab=monthly', '?tab=yearly', '?tab=calendar']) keys.add(childLevels['/reports'](where('/reports', search)));
  for (const section of SETTINGS_SECTIONS) keys.add(childLevels['/settings'](where(settingsPath(section.id))));

  it.each([...keys])('%s exists in every language', (key) => {
    for (const language of Object.keys(i18n.options.resources)) {
      expect(i18n.exists(key, { lng: language, fallbackLng: false }), `${language}: ${key}`).toBe(true);
    }
  });
});

// The sections of the Settings page, in the order of the menu. Each one has its own address: /settings/<id>.
// The text is in the translations: settings.sections.<id>.label and .description.
// hideForDemo: the shared demo account cannot use it (the API answers 403), so the demo never sees it.
// danger: drawn in red, with some room above it.
export const SETTINGS_SECTIONS = [
  { id: 'profile', icon: 'user', tone: 'sky' },
  { id: 'security', icon: 'lock', tone: 'periwinkle', hideForDemo: true },
  { id: 'appearance', icon: 'sun', tone: 'sun' },
  { id: 'preferences', icon: 'calendar', tone: 'teal' },
  { id: 'notifications', icon: 'bell', tone: 'mint' },
  { id: 'app', icon: 'monitor', tone: 'sky' },
  { id: 'data', icon: 'download', tone: 'periwinkle' },
  { id: 'danger', icon: 'alert', tone: 'coral', hideForDemo: true, danger: true },
];

export const settingsPath = (id) => `/settings/${id}`;
export const settingsLabelKey = (id) => `settings.sections.${id}.label`;

// The sections this person can open
export function visibleSections(user) {
  return SETTINGS_SECTIONS.filter((section) => !section.hideForDemo || !user?.isDemo);
}

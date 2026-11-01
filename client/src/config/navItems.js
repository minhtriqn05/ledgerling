// The main navigation. To add a page to the menu, add one line here (and its <Route> in App.jsx).
// labelKey is the translation key of its text. icon is optional: a name from components/Icon.jsx.
// group: the block of the menu it belongs to, with a small title (nav.groups.<group>).
export const navItems = [
  { labelKey: 'nav.dashboard', path: '/', icon: 'dashboard', group: 'money' },
  { labelKey: 'nav.transactions', path: '/transactions', icon: 'transactions', group: 'money' },
  { labelKey: 'nav.wallets', path: '/wallets', icon: 'wallet', group: 'money' },
  { labelKey: 'nav.reports', path: '/reports', icon: 'reports', group: 'money' },
  { labelKey: 'nav.budgets', path: '/budgets', icon: 'gauge', group: 'planning' },
  { labelKey: 'nav.goals', path: '/goals', icon: 'target', group: 'planning' },
  { labelKey: 'nav.recurring', path: '/recurring', icon: 'repeat', group: 'planning' },
  { labelKey: 'nav.categories', path: '/categories', icon: 'categories', group: 'planning' },
  { labelKey: 'nav.notifications', path: '/notifications', icon: 'bell', group: 'account' },
  { labelKey: 'nav.settings', path: '/settings', icon: 'settings', group: 'account' },
  // adminOnly: AppLayout shows it only to an account with role 'admin' (the route itself is guarded by AdminRoute)
  { labelKey: 'nav.admin', path: '/admin', icon: 'shield', adminOnly: true, group: 'account' },
];

export const navGroups = ['money', 'planning', 'account'];

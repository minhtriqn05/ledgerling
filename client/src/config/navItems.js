// The main navigation. To add a page to the menu, add one line here (and its <Route> in App.jsx).
// labelKey is the translation key of its text. icon is optional: a name from components/Icon.jsx.
export const navItems = [
  { labelKey: 'nav.dashboard', path: '/', icon: 'dashboard' },
  { labelKey: 'nav.transactions', path: '/transactions', icon: 'transactions' },
  { labelKey: 'nav.categories', path: '/categories', icon: 'categories' },
  { labelKey: 'nav.budgets', path: '/budgets', icon: 'wallet' },
  { labelKey: 'nav.recurring', path: '/recurring', icon: 'repeat' },
  { labelKey: 'nav.goals', path: '/goals', icon: 'target' },
  { labelKey: 'nav.reports', path: '/reports', icon: 'reports' },
  { labelKey: 'nav.notifications', path: '/notifications', icon: 'bell' },
  { labelKey: 'nav.settings', path: '/settings', icon: 'settings' },
  // adminOnly: AppLayout shows it only to an account with role 'admin' (the route itself is guarded by AdminRoute)
  { labelKey: 'nav.admin', path: '/admin', icon: 'shield', adminOnly: true },
];

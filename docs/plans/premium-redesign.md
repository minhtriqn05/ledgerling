# Premium redesign – "Noir"

Branch: `feature/bonus` (same working tree as phase 23). Asked by the owner: a completely new template, a high-end feel,
porto-exp.vercel.app as a starting point and better than it. No new API for it; one default changed (see below). Tick the boxes as the work goes, so it can be resumed.

## Decisions
- **Dark first.** Near-black canvas, floating panels with a lit top edge, one aurora hero per page. Default theme for a new
  visitor and a new account: dark (it was system). An older account that has `system` saved keeps following its device.
  "Porcelain" (light theme) stays a full choice; there the sidebar and the hero stay dark on purpose.
- **Aurora in emerald, teal and ice, no violet.** Keeps the owner's sky + mint taste and avoids the "AI" look of the reference.
- **Pearl primary button** (white on dark, ink on light): controls stay monochrome, color belongs to data and the hero.
- **Luminous capsules** for charts (the look the owner liked). The 8 category presets keep their hex values, because
  they are stored on the categories in Atlas.
- **Manrope** for everything, numbers included; **Newsreader** only for the big headlines of the landing page, the login, the static pages and the 404.
- `data-tone="noir"` on an element gives that subtree the dark tokens in both themes (sidebar, hero, wallet cards, landing page, login).
- Same features, same roles and labels: the e2e tests keep working by what a person sees.
- No new library: motion, lucide-react and Recharts were already there.

## Checklist

### Foundation
- [x] `tokens.css` (Noir + Porcelain), `global.css`, fonts in `index.html`, PWA colors, default theme
- [x] Button, IconButton, Card, TextField, Select, Popover, Modal, Drawer, Toast, SegmentedControl, MonthPicker, Skeleton, EmptyState, Alert
- [x] `Aurora` component, `useSpotlight`

### Shell
- [x] `AppLayout`: noir sidebar with groups, top bar (breadcrumb, search, theme toggle, bell)
- [x] `ThemeToggle`, `navItems` groups
- [x] `PageHeader` as an aurora hero with an icon tile, `HeroStat`

### Pages
- [x] Dashboard: hero with the balance, two columns with a right rail, capsule charts, recent transactions
- [x] Transactions: totals in the hero, pill rows
- [x] Categories, Budgets, Recurring, Goals, Reports, Notifications, Settings, Admin
- [x] Welcome, Login / Register, About / Privacy / Terms, 404
- [x] Wallets (phase 23) in the new design

### Finish
- [x] Charts: tokens, capsules, tooltips, palette checked on the Noir surface
- [x] Every text in 8 locale files
- [x] Unit tests for new components, e2e updated only where the behaviour changed on purpose
- [x] Landing page screenshots, OG image, favicon and PWA icons made again
- [x] `docs/ui-style.md` v7, `docs/brand/inspiration.md`
- [x] Looked at 1440px and 390px, dark and light, in English, Tiếng Việt, Deutsch and 日本語
- [x] server `npm test`; client `npm test`, `npm run build`, `npm run test:e2e`, `npm run i18n:check`

## Results
- server `npm test`: 594 passed
- client `npm test`: 759 passed; `npm run build` OK; `npm run i18n:check`: 8 languages, 966 keys each; no `lint` script exists
- client `npm run test:e2e`: 292 passed, 6 skipped on purpose (tests for one screen size only)

## The logo (asked for after the redesign)
The owner wanted a logo that spins like the one of the reference, but symmetric, meaningful, bright, and unlike anybody else's.
The first answer, a clover, looked too much like the flower of the reference. The second one stays: an old Vietnamese coin made of
four glass L (`docs/brand/README.md`). Assumption: "sáng sủa" is about the logo; the Noir pages stay as they are.

- [x] `Logo.jsx`, `Logo.module.css`, `--logo-*` tokens: the art, the slow turn, the hover, the toss
- [x] The large coin in the hero of the Dashboard (`logo` on `PageHeader`)
- [x] `favicon.svg`, PWA icons, OG image and the landing page pictures made again
- [x] `Logo.test.jsx`, `e2e/logo.spec.js`
- [x] `docs/brand/README.md`, `docs/ui-style.md`
- [x] All checks again

## Not done
- The dev-only page `/style-guide` follows the new tokens, but its mocks keep the older layouts.

## Tests that changed, and why
- **The default theme changed on purpose** (`utils/theme.test.js`, `ThemeContext.test.jsx`, `useThemeChoice.test.jsx`, `UserMenu.test.jsx`, `CommandPalette.test.jsx`, `server/tests/settings.test.js`, `e2e/settings.spec.js`): they now start from dark or set their starting theme themselves. Same checks.
- **`server/tests/notifications.test.js`, `e2e/quick-ux.spec.js`:** they failed on the 1st of a month, because "yesterday" and "1 day ago" fall in the month before. They read the right period now. Not caused by this work.
- **`e2e/ux-polish.spec.js` (the thin bar):** its pattern `**/api/goals*` also caught the file `src/api/goals.js` of the dev server, so it held back the file and not the request, and passed by timing. It holds the API request now, which is what its comment said.
- **`server/tests/settings.test.js`:** the lists of what the export and the account hold got Wallet and Transfer.
- **`e2e/a11y.spec.js`:** stronger, every signed-in page in both themes, Wallets and Goals added.

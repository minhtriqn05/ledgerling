# Ledgerling – UI Style Guide

This file records the visual decisions for the Ledgerling client.
All values are implemented once as CSS variables in `client/src/styles/tokens.css`.
Components must use those variables and never hardcode colors, fonts, radii or shadows.

A dev-only page lives at `http://localhost:5173/style-guide` (registered only when `import.meta.env.DEV` is true). Its mocks
were made for the earlier look: they follow the tokens, but their layouts are older than this guide. The real pages are the reference.

## 1. Mood – "Noir"

**A private bank at night: dark, quiet and expensive, with a little light where it matters.** Plan: `docs/plans/premium-redesign.md`.

Principles:

1. **Dark first.** A near-black canvas with floating panels. A new visitor gets Noir, whatever the device says. Porcelain (§3b) is a full choice.
2. **One lit hero per page.** The aurora (emerald, ice, a little warmth) falls from the top edge of `PageHeader`. Everything else stays dark and calm.
3. **Controls are monochrome.** The primary button is pearl on Noir and ink on Porcelain. Color belongs to the data, the hero and the wallets.
4. **Physical surfaces.** Panels have a thin edge, a lit top and a tight shadow; gradients have a fine grain, so they never show bands. A soft light follows the mouse over a card.
5. **Big and light.** The number a page leads with is large and thin (weight 300): it needs no bold to be read first.
6. **Color with meaning:** green = income, coral = expense, category and wallet colors = identity. Amounts always carry `+` / `−`, so color is never the only signal. A list is mostly expenses, so they stay in the text color: no wall of red.
7. **Soft shapes:** 24px cards, 32px hero and sidebar, pill buttons and chips, capsule chart bars, smooth curves, line icons.
8. **Readable:** every text color passes WCAG AA (4.5:1) on every surface it sits on. axe checks each page in both themes.

## 2. References

| Project | What we take from it |
|---|---|
| [porto-exp.vercel.app](https://porto-exp.vercel.app/) | The starting point of v7: dark floating panels, a hero with the key numbers, a right rail, a top bar, pastel capsules. See `docs/brand/inspiration.md`. |
| [asklepios – Health Metrics Chart](https://dribbble.com/shots/24625901-asklepios-AI-Healthcare-Wellness-App-Health-Metrics-Chart) (strangehelix) | Chart style: capsule bars on tracks, smooth lines with fading fills, big numbers next to charts. |
| [Folio – AI Finance Management](https://www.behance.net/gallery/255846073/AI-Finance-Management-Voice-Payments-App-UIUX) | Big balance number, simple charts, pill buttons. |
| [Mera – Smart expense tracking](https://www.behance.net/gallery/256203067/Mera-smart-expense-tracking-from-bank-statements) | "One focal card per screen" and "amount first". |

### Decision log

| Version | Direction | Why it changed |
|---|---|---|
| v1 | Indigo on cool gray | First draft before seeing the references. |
| v2 | Cream + orange (Mera) | Orange felt too loud for daily use and sat close to the expense red. |
| v3 | Sage green on soft paper | Too dark and muted; the ochre category color was disliked; charts looked like library defaults. |
| v4 | Sky & Mint, pastel | Brighter and softer; charts redesigned in the asklepios style. Felt a bit monotonous. |
| v5 | Sky & Mint + accents | Vivid hero, colored icon tiles, tinted cards. All MVP screens designed. |
| v6 | Sky & Mint, refined + motion | New logo, floating sidebar, banner headers, pill rows, motion, line icons, 8 languages. |
| **v7 (current)** | **Noir, with Porcelain** | The owner asked for a completely new template with a high-end feel. Dark first, aurora hero, pearl buttons, Manrope. The sky and mint live on in the aurora; violet stays out. |

## 3. Color palette (Noir)

A part of a page marked `data-tone="noir"` gets these values in both themes: the sidebar, the hero, the wallet cards, the landing page, the login.
The block is inside `@media screen`, so paper always gets the ink colors of Porcelain.

### Controls

| Token | Value | Use |
|---|---|---|
| `--gradient-button` | `#ffffff` → `#dfe7e5` | Primary button and the floating + (ink text 15:1) |
| `--color-primary` / `--color-on-primary` | `#f2f5f4` / `#0a0e10` | Fills: a checked box, the chosen day, the skip link |
| `--color-primary-text` | `#a4dcf7` (ice) | Links, an active icon, the edge of a field with the focus |
| `--color-primary-soft` | `#16282f` | Tags, selected rows |
| `--color-focus-ring` | ice 32% | The 3px ring of the keyboard focus |

### The aurora (the same in both themes)

| Token | Value | Use |
|---|---|---|
| `--aurora-emerald` / `--aurora-ice` / `--aurora-warm` | `#2fc79c` / `#4f9ff0` / `#e0c483` | The three lights of `components/Aurora`: blurred, top left, top right, a little warmth at the bottom. They drift slowly; they stand still with reduced motion. |
| `--color-hero-base` | `#0b1012` | What the lights fall on |
| `--color-hero-text` / `-soft` | white / white 78% | Text on the hero |
| `--color-hero-from` → `-to` | `#1f9e86` → `#1e6fa8` | Only the old mocks of the dev style guide |
| `--logo-gold-*`, `--logo-jade-*` | tip → mid → base, plus `-edge` | The glass coin of the logo: two gold L and two jade L |
| `--logo-light`, `--logo-halo`, `--logo-glow` | white, gold 30%, `#ffd979` | The light on the glass, around the coin and inside its hole |
| `--gradient-progress` | `#6fe3bd` → `#7cc4f5` | The thin bar along the top, the 404 |
| `--texture-grain` | a noise SVG | Over the aurora and the canvas, at 5–9% |

### Surfaces, text and borders

| Token | Value | Contrast on it | Use |
|---|---|---|---|
| `--color-bg` | `#07090b` | text 18.4 | The canvas behind the floating panels, with two soft lights (`--ambient-1`, `--ambient-2`) |
| `--color-surface` | `#0f1316` | text 17.2, muted 6.9 | Cards, sidebar |
| `--color-surface-raised` | `#151a1e` | text 16.1, muted 6.5 | Dialogs, menus, toasts, tooltips |
| `--color-surface-muted` | `#171c20` | text 15.8, muted 6.3 | Rows, tracks |
| `--color-surface-hover` | `#1e252a` | text 14.3, muted 5.7 | A row under the mouse, a chosen tab |
| `--color-input` | `#0b0e11` | – | The inside of a field: a little deeper than the card |
| `--color-text` / `-secondary` / `-muted` | `#f4f6f5` / `#bac3c4` / `#949fa1` | – | Main text and numbers / labels / hints, dates, axis labels |
| `--color-border` / `-strong` | `#20272c` / `#5e6a72` | – | Hairlines / the edge of a field (3:1) |
| `--sheen-card` | white 2.8% → 0 | – | The light that falls on a card from above |

### Income and expense

| Token | Noir | Porcelain | Use |
|---|---|---|---|
| `--color-income` | `#4fd1a1` | `#139a6c` | Chart line, icons, progress bars |
| `--color-income-text` | `#74e0b8` | `#0a7350` | Income amounts as text |
| `--color-income-soft` | `#0f2a21` | `#e2f4ec` | Badge background |
| `--color-expense` | `#ff8a78` | `#e2573f` | Chart line, icons, progress bars |
| `--color-expense-text` | `#ffa494` | `#b5381f` | Expense amounts as text, in the hero |
| `--color-expense-soft` | `#2e1714` | `#fceae6` | Badge background |
| `--color-danger` / `--color-on-danger` | `#c23f2d` / white | the same | Delete buttons (5.2:1) |
| `--color-danger-text` | `#ff9d8c` | `#b5381f` | Validation errors written as text |

### Accents and tones

Six accent colors reuse the category hues: `--accent-sky` (chart-1), `--accent-coral` (chart-2), `--accent-teal` (chart-3), `--accent-sun` (chart-4),
`--accent-periwinkle` (chart-5), `--accent-mint` (chart-6). Tints are mixed in CSS with `color-mix()` and follow the theme by themselves:

| Element | Background | Foreground |
|---|---|---|
| Icon tile, category mark | 15–17% tone on the surface, a 1px inner edge of 20% tone | 70% tone + text color |
| Category chip | 10% tone, edge 22% tone, a 7px dot in the tone | `--color-text` |
| Number card (Reports) | 12% tone fading into the surface | money text color |
| Alert | 12% tone | icon 62% tone + text color |

### Category colors

Eight presets in a **fixed order**: sky `#4a9fe3`, coral `#f07d62`, teal `#22ada3`, apricot `#f19a52`, periwinkle `#7d8ce8`, mint `#3db383`,
cornflower `#5d7fd8`, lime `#94c24f` (`--chart-1` … `--chart-8`, the same in both themes).
**These hex values are stored on the categories, wallets and goals of the users: they do not change with a redesign.**
`validate_palette.js` on the Noir surface `#0f1316`: chroma, color blindness (worst adjacent ΔE 9.5), normal vision (22.1) and contrast (3:1 or more) pass; six
hues sit above its lightness band, which is expected for colors chosen for white, and which is fine here because a category is always shown with its name and its icon.

### Category icons

Every category surface shows `CategoryMark`: a line icon from lucide-react on a tint of the category color, in three sizes (`sm` 22px, `md` 32px, `lg` 42px).
The registry is `client/src/utils/categoryIcons.js` (50 icons in 11 groups; the server keeps the same names). Without a chosen icon the client guesses one
from the name, so a tile never shows a letter. Emoji saved by an earlier picker are shown as the matching line icon; nothing is rewritten in the database.

### Chart helpers

`--chart-bar` `#33424b` (quiet capsules), `--chart-bar-track` `#171d21`, `--chart-highlight-from` → `-to` `#8ff0cd` → `#7cc4f5` (the capsule that is lit),
`--chart-grid` `#1d2428`, `--chart-axis` `#949fa1`. `--pattern-track` (diagonal stripes) is the free part of budget and goal progress bars.

## 3b. Porcelain, the light theme

The person picks **Light**, **Dark** or **System** in Settings > Appearance or the user menu, or with the two small buttons in the top bar. The result is one attribute on
`<html>`: `data-theme="light"` or `data-theme="dark"`. `:root` in `tokens.css` holds Porcelain; Noir replaces only the colors.

- **Somebody who never chose gets Noir.** `DEFAULT_THEME` in `utils/theme.js` and the default of `preferences.theme` on the server are both `dark`. An older account that has `system` saved keeps following its device.
- **In Porcelain the sidebar, the hero and the wallet cards stay dark on purpose.** The look of the app stays the same, on a warm canvas. The landing page and the login are Noir in both themes.
- **Before React loads**, a small script in `client/index.html` reads `localStorage['ledgerling.theme']` and sets `data-theme`, so a page never flashes in the wrong colors.
- The choice is kept in localStorage and saved on the account (`preferences.theme`), so it follows the person to another device (`PreferencesSync`).
- Charts (Recharts) read their colors with `cssVar()` while they render, so each chart component calls `useTheme()` and draws again when the theme changes.

| Token | Porcelain | Note |
|---|---|---|
| `--color-bg` / `--color-surface` / `-muted` / `-hover` | `#f3f3ef` / `#ffffff` / `#f6f6f2` / `#eeeee9` | A warm canvas, white cards |
| `--color-text` / `-secondary` / `-muted` | `#101517` / `#454f4d` / `#5c6664` | 18.4 / 8.5 / 5.9 : 1 on white, muted 5:1 or more everywhere |
| `--color-border` / `-strong` | `#e4e4dd` / `#858f8b` | The edge of a field keeps 3:1 on white |
| `--gradient-button` / `--color-on-primary` | `#2a3235` → `#0e1315` / white | The primary button is ink (13:1 or more) |
| `--color-primary-text` / `-soft` | `#0b6a63` / `#e3f1ee` | Deep teal, 6.4:1 on white |
| `--chart-bar` / `-track` / `-grid` / `-axis` | `#a9c5d6` / `#eeeeea` / `#e7e7e1` / `#5c6664` | |

## 4. Typography

- **Font: [Manrope](https://fonts.google.com/specimen/Manrope)**, variable 300–800, loaded in `client/index.html`, for the whole app, numbers included. Full Vietnamese.
- **Headlines of the landing page, the login, the static pages and the 404: [Newsreader](https://fonts.google.com/specimen/Newsreader)** (`--font-display`), weight 400. Never on a number that matters: the hero figure stays in Manrope.
- Chinese, Japanese and Korean letters come from the system: `:lang(zh-CN)`, `:lang(ja)` and `:lang(ko)` switch both fonts to a stack with the system font of that script; `<html lang>` follows the chosen language.
- Sizes: `--font-size-xs` 12 · `sm` 14 (body) · `md` 16 (card titles) · `lg` 20 · `xl` 26 (stat numbers) · `2xl` 34 (page titles) · `3xl` 44 · `hero` 40–60 (the one number) · `display` 48–96 (the landing page).
- Big numbers: weight 300–500, `--letter-spacing-display` (-0.03em), proportional figures; the `₫` is about half the size and softer.
- Amounts in lists and tables use `font-variant-numeric: tabular-nums`, so they line up.
- `.eyebrow` (global.css): the small capitals above a number (11px, semibold, +0.09em). Chinese, Japanese and Korean get 12px without the spacing.
- Formatting helpers (`client/src/utils/format.js`) use `Intl` with the locale of the chosen language; the unit stays VND and dates stay in Vietnam time.

## 5. Spacing, radius and shadows

- 4px scale: `--space-1` 4 · `2` 8 · `3` 12 · `4` 16 · `5` 24 · `6` 32 · `7` 48 · `8` 80 (px).
- Radius: `--radius-sm` 10 · `md` 14 (inputs, nav items) · `lg` 24 (cards, tiles of the hero) · `xl` 32 (sidebar, hero, dialogs, drawer) · `full` (buttons, pills, chips).
- Rows are 18px pills. `--control-height` 42px for buttons and fields; `Button size="sm"` is 32px, in the header of a card.
- Shadows have a negative spread, so they stay tight under the element; on Noir they also carry a 1px lit top edge (`inset 0 1px 0`): `--shadow-sm` cards · `--shadow-md` hover, FAB · `--shadow-lg` dialogs, drawer, tooltips · `--shadow-primary` / `--shadow-danger` buttons.

## 5b. Motion

Library: `motion` (`motion/react`). One main curve, `--ease-out` `cubic-bezier(0.22, 0.61, 0.36, 1)` (plus `--ease-pop` for small "pop" moments), and three durations:
`--duration-fast` 160ms (hover, press), `--duration-base` 240ms (menu pill, cards), `--duration-slow` 380ms (drawer).

- **Aurora:** the three lights drift over 26–38 seconds, only `transform`, so it costs almost nothing.
- **Spotlight:** a soft light follows the mouse over a card (`hooks/useSpotlight.js` tells the card where the mouse is, once per frame; `[data-spot]`). Not on touch screens.
- **Wallet card:** rises 3px, a shadow in its own color, and a band of light crosses it once.
- **Page change:** the content fades in and rises 10px (`AppLayout`).
- **Lists and cards:** a short stagger (`components/Motion/Reveal.jsx`); `onScroll` waits until it scrolls into view (landing page). The numbers of the hero count up (`CountUp.jsx`).
- **Landing page:** the picture of the app lies back 16° and stands up while the page scrolls (`useScroll` + `useTransform`).
- **Hover and press:** primary buttons rise 1px, cards 2px; pressing scales to 0.98. The + turns 90° on hover.
- **Logo:** the coin turns once in 16s and a band of light crosses it every 6s. On hover or keyboard focus it flips once, tilts, opens into its four L, lights up inside and turns fast; nothing jumps when the mouse arrives or leaves. A press tosses it, and it lands with a ring and small square chips (`docs/brand/README.md`).
- **Menu:** the active pill is measured from the open link and slides between items, so it fits every language. The theme thumb slides too.
- **Charts:** Recharts draws in 500ms; skeletons shimmer.
- **Dialogs, drawer and toasts:** enter and leave with a fade and a small slide or scale, over a blurred page.
- **prefers-reduced-motion:** `MotionConfig reducedMotion="user"` in `main.jsx`, `useReducedMotion()` in the components and a rule in `global.css` stop all of it; things then appear at once.

## 6. Layout

- **App frame:** a floating dark sidebar (264px, `--radius-xl`, `--frame-gap` 14px around it) on the canvas, the top bar and the main area beside it (content up to 1520px).
- **Sidebar** (`data-tone="noir"`): the logo (a link to `/welcome`) with the live dot, the links in three groups with a small title (Money, Planning, Account; `group` in `config/navItems.js`), and at the bottom the language, the fold button and the account card. The links scroll by themselves, so the account always stays on screen; on a low window the group titles give way first.
- **Top bar** (wide screens): stays at the top while the page scrolls, the page shows through it, blurred. The breadcrumb in a pill on the left; the search button (opens the command palette), `ThemeToggle` and the bell on the right.
- **Active page:** a glass pill in emerald and ice with a thin bright edge, semibold text, an ice icon. The link also gets `aria-current="page"`.
- **Folded sidebar:** the fold button or the `[` key shrink it to 72px: only icons, the name of each in a tooltip on hover and keyboard focus. The choice is kept in localStorage. A phone has no sidebar to fold.
- **Narrow screens (<768px):** one floating bar with the logo, the live dot, the bell, the face of the account and a round menu button. The button opens a panel under the bar with the search, the links, the language, the theme and the account. Escape, a click outside or choosing a link closes it.
- **Page header** (`components/PageHeader`): the hero. An icon in a large glass tile, an optional small line above the title, the title and subtitle, the actions on the right, and `stats` under them: panes of glass from `HeroStat`, or a page's own. It also sets the tab title.
- **User menu** (`components/UserMenu/`): Profile, Settings, Theme (three round icon buttons), Keyboard shortcuts, Take the tour and Log out.
- **Command palette** (`components/CommandPalette/`): Ctrl+K / Cmd+K, or the search button. Pages, Commands and Transactions.
- **Guided tour** (`components/Tour/`), **top progress bar**, **skip link**, **session expired** dialog, **language switcher**, **breadcrumb**, **back** button, **collapsible cards** (`components/CollapsibleCard/`): as their components describe.
- **Breakpoints:** ≤1280px the rail of the Dashboard moves under the charts; ≤1100px the numbers of the hero in 2 columns; ≤960px the login in one column; <768px the sidebar turns into the bar + panel; ≤640px the transactions table becomes a list. No horizontal page scroll at any width.

## 7. Screens

- **Dashboard:** the hero with a greeting, the balance as the one big number, "saved X% of income", and income and expense on glass with six small capsules (the last months, this month lit). Below it two columns: Expense by month, Spending by category (ring + rows with bars) and Recent transactions; the rail has Your wallets, Budget alerts, Savings goals and Insights.
- **Transactions:** the hero with the month picker, Import, Export, Add, and the three totals. A card with the search pill, the filters (category, wallet, sort, from, to), rounded rows (category mark + note, category chip, date, tags, signed amount; edit and delete wait for the mouse), the pager. On phones a list of pills. A click opens the details drawer.
- **Wallets:** the hero with the total and a thin bar of how it is split. Each wallet is a dark metal card lit in its own color: a glass chip with the type icon, the name, the balance, where it started, money in and out. Below them the transfers; archived wallets last.
- **Budgets:** the hero with total, spent and left. Cards with the amount, a 10px bar on a striped track, what is left and the percent.
- **Goals:** the hero with saved and target. Cards with a bar, "to go", the deadline and how much per month, Add money and Withdraw.
- **Recurring:** a list of pills: category mark, note, amount, frequency, next run, a switch, edit and delete.
- **Categories:** Expense/Income switch, cards with a soft light in the category color from the corner, the form in a column on the right.
- **Reports:** tabs in a pill. Monthly: number cards, the daily expense as a line with a fading fill, insights, top categories and tags. Yearly: pairs of capsules. Calendar: a heat map.
- **Notifications, Settings, Admin:** the hero, then their lists and forms in cards. Settings keeps one section at a time, each with its own address; Danger zone stands apart, with a red border.
- **Landing page** (`/welcome`, Noir in both themes): a floating glass header; the aurora falling from the top of the page; the headline in Newsreader; Get started (pearl) and Try the demo (glass); the picture of the app in a frame that stands up on scroll; four small facts; a bento grid of six features, each with a small live drawing; the screenshots; three numbered steps; a last invitation on the aurora.
- **Login and Register** (Noir in both themes): the story on the left, edge to edge on the aurora (the headline in Newsreader, two panes of glass); the form on the right. On phones the story is a short band above the form.
- **About, Privacy, Terms:** one card of short text with the title in Newsreader. They follow the theme.

## 8. Components

The real pages use React components in `client/src/components/`: `Button` (primary / secondary / danger, optional left icon, `size="sm"`), `IconButton`, `TextField`, `Alert`, `Card` + `CardHeader`, `CollapsibleCard`, `PageHeader` + `HeroStats` / `HeroStat`, `Aurora`, `ThemeToggle`, `SegmentedControl`, `EmptyState` (soft lights behind an icon), `MonthPicker` and `Modal` (a native `<dialog>` over the blurred page; Escape, the X and a click outside close it; an element with `data-autofocus` gets the focus).

**Form controls – no browser defaults.** Every list, date, file field and checkbox is drawn by Ledgerling, so it looks the same in every browser and follows the chosen language:

- `Popover`: the floating card under a field. It is a browser popover, so it shows in the top layer (above an open dialog, never cut off), opens above the field when there is no room below and closes on a click outside.
- `Select` (`components/Select/`): a combobox button that looks like an input (`field`) or a pill (`pill`), a list with optional group titles, a sliding highlight, a check on the chosen option. Keyboard: arrows, Home / End, Enter / Space, Escape, typing a letter jumps to an option.
- `DatePicker` (`components/DatePicker/`): the field shows the day in the user's language; the calendar has month arrows, weekdays from Monday, today with a dot, the chosen day as a pearl circle, and Today / Clear. Full keyboard support.
- **CSV drop zone** (Import dialog), **checkboxes** (global style in `global.css`: an 18px rounded box that fills with `--color-primary`, a bar for "some selected"), and a search box with its own round ×.

**Toasts** (`components/Toast/` + `context/ToastContext.jsx`): small raised cards in the top-right corner with a tinted icon tile, the message and a close button. Any component calls `const toast = useToast(); toast.success('Transaction added')` or `toast.error(getErrorMessage(err))`. The stack is a popover, so it also shows above an open dialog.

## 9. Charts (Recharts)

Colors are read from the tokens with `cssVar()` because SVG needs real color values. Code: `pages/dashboard/DashboardCharts.jsx`, `pages/reports/ReportCharts.jsx`, `pages/admin/AdminCharts.jsx`.

- **Expense by month:** tall capsules (up to 64px wide, 16px corners) on a track, with a small bright dash near the top (`Capsule`). The chosen month is lit in `--chart-highlight-from` → `-to`, the others are quiet. No axis or grid: the amount stands above each capsule.
- **Spending by category:** a ring (inner radius 74%) of rounded segments with 4° gaps, starting at 12 o'clock; the total in the middle; a ranked list with bars next to it.
- **Daily expense:** a smooth 2px line with a fading fill (28% → 0%), a solid hairline grid, round ticks (0 / 6M / 12M…) from `niceTicks()`.
- **Yearly:** pairs of 12px capsules, income and expense, with a legend in the card header.
- **The small capsules in the hero:** plain HTML, six months, this month lit. Decoration next to the real number.
- **Hover:** a raised tooltip card with colored dots and full amounts; lines show a 5px dot with a ring in the surface color.
- Never two y-axes in one chart; text always uses text colors; gridlines are solid, never dashed.

## 10. Where things live

| File | What it holds |
|---|---|
| `client/src/styles/tokens.css` | Every design value: Porcelain in `:root`, Noir in the block below it |
| `client/src/styles/global.css` | Base page styles, the lights and the grain of the canvas, checkboxes, `.eyebrow` |
| `client/src/components/` | Shared React components used by the real pages (§8) |
| `client/src/components/AppLayout/` | The frame: sidebar, top bar, the phone bar |
| `client/src/components/Aurora/` | The light of the hero |
| `client/src/hooks/useSpotlight.js` | The light that follows the mouse |
| `client/src/utils/format.js` | Money, number and date formatting (follows the language) |
| `client/src/utils/categoryIcons.js` | Category icon registry, emoji mapping and the guess from the name |
| `client/src/components/Motion/` | `Reveal` (stagger, on scroll) and `CountUp` |
| `client/src/components/Select/`, `DatePicker/`, `Popover/` | The form controls that replace the browser's own |
| `client/src/i18n/`, `client/src/locales/` | i18next setup and the 8 translation files |
| `client/src/utils/cssVar.js` | Reads a token in JavaScript (for charts) |
| `client/e2e/screenshots.capture.js` | Takes the pictures of the landing page: `npm run screenshots` after a change in the look |
| `client/scripts/og-image.html` | The picture of a shared link: `npm run og-image` |
| `docs/brand/` | Logo concepts, comparison, decision and inspiration notes |
| `client/src/pages/StyleGuidePage.jsx`, `pages/styleGuide/` | The dev-only page with the older mocks |

# Ledgerling – UI Style Guide

This file records the visual decisions for the Ledgerling client.
All values are implemented once as CSS variables in `client/src/styles/tokens.css`.
Components must use those variables and never hardcode colors, fonts, radii or shadows.

A live preview is available in dev mode at `http://localhost:5173/style-guide`
(route registered only when `import.meta.env.DEV` is true). Tabs show a static mock of every
screen with sample data – Dashboard, Transactions, Categories, Login – plus a Components catalog.
A tab can be opened directly, e.g. `/style-guide#transactions`.

## 1. Mood – "Sky & Mint"

**Bright, airy and calm, with a few lively accents.** Light backgrounds and white cards, sky blue
and mint as the main colors, and small touches of sun, coral, teal and periwinkle so the screens
never feel monotonous.

Principles:

1. **Light first.** A pale sky-grey canvas with white floating panels (sidebar, cards) and a soft
   sky-to-mint banner that holds each page title.
2. **One vivid hero per screen:** the sky-to-teal gradient card holds the number to read first
   (total balance). Everything else stays light.
3. **Accent rhythm:** every card title has a small icon tile in its own accent color
   (sky, sun, mint, periwinkle…), so color repeats in a calm, predictable way.
4. **Color with meaning:** green = income, coral = expense, category colors = identity.
   Amounts always carry `+` / `−`, so color is never the only signal.
5. **Soft shapes:** 20px cards, pill buttons and chips, capsule chart bars, smooth curves, line icons.
6. **Readable:** every text color passes WCAG AA (4.5:1) on its background.
7. Light is the default look; a dark theme is chosen in Settings (section 3b).

## 2. References

| Project | What we take from it |
|---|---|
| [asklepios – Health Metrics Chart](https://dribbble.com/shots/24625901-asklepios-AI-Healthcare-Wellness-App-Health-Metrics-Chart) (strangehelix) | Chart style: capsule bars on light tracks, smooth lines with fading fills, a vivid score card, big numbers next to charts. |
| [Expenses Dashboard UI](https://www.behance.net/gallery/158203629/Expenses-Dashboard-UI) | Dashboard layout: sidebar with icons, stat cards in a row, charts below. |
| [Folio – AI Finance Management](https://www.behance.net/gallery/255846073/AI-Finance-Management-Voice-Payments-App-UIUX) | Big bold balance number, simple charts, pill buttons. |
| [Mera – Smart expense tracking](https://www.behance.net/gallery/256203067/Mera-smart-expense-tracking-from-bank-statements) | "One focal card per screen" and "amount first". |
| [Tasky – Task management](https://www.behance.net/gallery/247037315/Tasky-A-smart-task-management-system) | Pill buttons and tags, soft cards, clean sidebar active state. |

### Decision log

| Version | Direction | Why it changed |
|---|---|---|
| v1 | Indigo on cool gray | First draft before seeing the references. |
| v2 | Cream + orange (Mera) | Orange felt too loud for daily use and sat close to the expense red. |
| v3 | Sage green on soft paper | Too dark and muted; the ochre category color was disliked; charts looked like library defaults. |
| v4 | Sky & Mint, pastel | Brighter and softer; charts redesigned in the asklepios style. Felt a bit monotonous. |
| v5 | Sky & Mint + accents | Vivid sky-to-teal hero, colored icon tiles, savings ring, tinted summary cards, category stripes and bars. All MVP screens designed. |
| **v6 (current)** | **Sky & Mint, refined + motion** | New "Ruled L" logo (`docs/brand/`), floating sidebar on a deeper canvas, banner page headers, pill rows, tight negative-spread shadows, short motion, line icons for categories instead of letters, 8 languages. Ideas from porto-exp, see `docs/brand/inspiration.md`. |

## 3. Color palette

### Brand and hero

| Token | Value | Use |
|---|---|---|
| `--color-primary` | `#2874b5` | Primary buttons, active page number, sparkline (white text on it: 4.9:1) |
| `--color-primary-hover` / `--color-primary-text` | `#1f639f` | Hover; blue text such as links and the active nav item (5.4:1 on primary-soft) |
| `--color-primary-soft` | `#e4f0fb` | Active nav item, selected items |
| `--color-hero-from` → `--color-hero-to` | `#2874b5` → `#1b7f86` | `--gradient-hero` (135°): hero card, logo tile, login panel, the highest chart bar. White text: 4.7:1 or more everywhere. |
| `--color-hero-text-soft` | white 80% | Large text on the hero only (the `₫` unit) |
| `--color-hero-decor` | white 12% | The two soft circles on the hero and the login panel |
| `--gradient-soft` | `#dceefc` → `#e3f6ed` | Pastel sky-to-mint: savings card, empty states |
| `--gradient-banner` | `#d9ebfb` → `#dff3ec` (115°) | The page header banner (`PageHeader`) |
| `--color-logo-accent` | `#a9efcf` | The ruled lines of the logo mark |

### Surfaces, text and borders

| Token | Value | Contrast (white / page bg) | Use |
|---|---|---|---|
| `--color-bg` | `#edf3f8` | – | The canvas behind the floating panels |
| `--color-surface` | `#ffffff` | – | Cards, tables, inputs, sidebar |
| `--color-surface-muted` | `#f1f5f9` | – | Pill rows of the transaction list, hover states |
| `--color-skeleton` | `#e6edf4` | – | Loading placeholders (the shimmer runs over it) |
| `--color-overlay` | navy 45% | – | Behind dialogs |
| `--color-text` | `#172534` | 15.6 / 14.5 | Main text, headings, big numbers |
| `--color-text-secondary` | `#4a5868` | 7.3 / 6.8 | Labels, captions, subtitles on the sky band |
| `--color-text-muted` | `#5b6a7c` | 5.5 / 4.6 | Hints, dates, axis labels – only on white or the canvas |
| `--color-border` / `--color-border-strong` | `#e3eaf1` / `#c9d5e0` | – | Dividers and card borders / input borders |

### Income and expense

| Token | Value | Use |
|---|---|---|
| `--color-income` | `#25a37a` | Chart line, icons, progress bars |
| `--color-income-text` | `#1e7a52` | Income amounts as text (5.3:1 on white, 4.8:1 on a 10% income tint) |
| `--color-income-soft` | `#e2f5eb` | Badge background |
| `--color-expense` | `#ec6559` | Chart line, icons, progress bars |
| `--color-expense-text` | `#bd3f36` | Expense amounts as text (5.4:1 on white, 4.8:1 on a 10% expense tint) |
| `--color-expense-soft` | `#fdecea` | Badge background |
| `--color-danger` | `#bd3f36` | Delete buttons (white text 5.4:1), validation errors |

The income/expense fill pair passes the color-blindness check (deutan ΔE 8.4).

### Accents and tones

Six accent colors reuse the category hues: `--accent-sky` (chart-1), `--accent-coral` (chart-2),
`--accent-teal` (chart-3), `--accent-sun` (chart-4), `--accent-periwinkle` (chart-5),
`--accent-mint` (chart-6). Tints are mixed in CSS with `color-mix()`, so each color is defined once:

| Element | Background | Foreground |
|---|---|---|
| Icon tile | 15% tone on white | 62% tone + ink (icons: 3.8:1 or more) |
| Category mark (line icon) | 16% tone on white | 62% tone + ink (icons: 3.8:1 or more) |
| Category chip | 14% tone on white | `--color-text` |
| Tinted summary card | 10% tone, border 22% tone | money text color |
| Alert | 12% tone | icon 62% tone + ink, text `--color-text` |

Card title tiles rotate through the accents: Cash flow = sky, Spending by category = sun,
This week = mint, Recent transactions = periwinkle, New category = sky.

### Category colors

Eight presets in a **fixed order**: sky `#4a9fe3`, coral `#f07d62`, teal `#22ada3`,
apricot `#f19a52`, periwinkle `#7d8ce8`, mint `#3db383`, cornflower `#5d7fd8`, lime `#94c24f`
(`--chart-1` … `--chart-8`). Checked for color blindness including the donut wrap-around: worst
neighbor pair ΔE 9.5 (color-blind) / 22.1 (normal vision). Most are below 3:1 on white, so a
category color is always shown with its name (chip label, legend row) next to its icon tile.

### Category icons

Every category surface (cards, lists, chips, drawer, forms, budgets, reports) shows `CategoryMark`: a line icon
from lucide-react on a light tint of the category color, in three sizes (`sm` 22px, `md` 32px, `lg` 40px).
The registry is `client/src/utils/categoryIcons.js` (50 icons in 11 groups; the server keeps the same names).
The icon is chosen in the category form (`IconPicker`, with "Auto"). Without a chosen icon the client guesses one
from the name (English and Vietnamese words) and falls back to a tag icon, so a tile never shows a letter.
Emoji saved by the earlier picker are shown as the matching line icon; nothing is rewritten in the database.

### Chart helpers

`--chart-bar` `#8fc2ec` (pastel capsules), `--chart-bar-track` `#eef4fa`, `--chart-highlight`
`#2874b5`, `--chart-grid` `#e3eaf1`, `--chart-axis` `#617082`. `--pattern-track` (pale diagonal stripes)
is the free part of budget and goal progress bars.

## 3b. Dark theme

The person picks **Light**, **Dark** or **System** (follows the device) in Settings > Appearance. The result is one
attribute on `<html>`: `data-theme="light"` or `data-theme="dark"`. The dark values live in `tokens.css` under
`[data-theme='dark']`; only what must change is listed there, the brand blue, the hero gradient, the category/chart hues
(`--chart-1` ... `--chart-8`, they are saved in the database) and every size stay as in `:root`. Components never know
which theme is on: they only use tokens.

- **Before React loads**, a small script in `client/index.html` reads `localStorage['ledgerling.theme']` (and
  `prefers-color-scheme` for System) and sets `data-theme`, so a dark page never flashes white. A matching
  `html[data-theme='dark']` background in the same file covers the moment before `tokens.css` arrives.
- The choice is kept in localStorage and saved on the account (`preferences.theme`), so it follows the person to another
  device: when someone signs in, the account's theme is applied (`PreferencesSync`).
- Charts (Recharts) read their colors with `cssVar()` while they render, so each chart component calls `useTheme()` and
  draws again when the theme changes.

| Token | Light | Dark | Note |
|---|---|---|---|
| `--color-bg` / `--color-surface` / `--color-surface-muted` | `#edf3f8` / `#fff` / `#f1f5f9` | `#0f1923` / `#172431` / `#1e2d3c` | Deep navy canvas, slightly lighter panels |
| `--color-text` / `-secondary` / `-muted` | `#172534` / `#4a5868` / `#5b6a7c` | `#e6edf4` / `#b3c0ce` / `#93a3b5` | 13.3 / 8.5 / 6.1 : 1 on the surface |
| `--color-border` / `--color-border-strong` | `#e3eaf1` / `#c9d5e0` | `#26384a` / `#4b6279` | Input borders keep 3:1 |
| `--color-primary-text` / `-soft` | `#1f639f` / `#e4f0fb` | `#7fbdf0` / `#1d3a56` | Buttons keep `--color-primary` (white text 4.9:1) |
| `--color-income-text` / `-soft` | `#1e7a52` / `#e2f5eb` | `#5fd6ab` / `#163a2f` | `--color-income` fill `#3fc79a` |
| `--color-expense-text` / `-soft` | `#bd3f36` / `#fdecea` | `#ff9d93` / `#3d2124` | `--color-expense` fill `#f2857a` |
| `--color-danger-text` (new) | `#bd3f36` | `#ff8a80` | Red written as text or an icon; the red button keeps `--color-danger` (white text 5.4:1) |
| `--chart-bar` / `--chart-bar-track` / `--chart-grid` / `--chart-axis` | `#8fc2ec` / `#eef4fa` / `#e3eaf1` / `#617082` | `#4a86bb` / `#1e3042` / `#2a3d50` / `#93a3b5` | Axis text 5.9:1 |
| `--gradient-soft` / `--gradient-banner` | pastel sky to mint | deep blue to deep teal | Banner and empty-state washes |

Tints made with `color-mix(... var(--color-surface))` (icon tiles, alerts, category chips) follow the theme by themselves.
The two darkest steps of the Reports calendar are kept a little paler in the dark theme so the day numbers keep 4.5:1.

## 4. Typography

- **Font:** [Be Vietnam Pro](https://fonts.google.com/specimen/Be+Vietnam+Pro) (Google Fonts) 400 / 500 / 600 / 700,
  loaded in `client/index.html`. Full Vietnamese diacritics. One font for the whole product. It has no Chinese,
  Japanese or Korean letters, so `:lang(zh-CN)`, `:lang(ja)` and `:lang(ko)` switch `--font-sans` to a stack that adds
  the system font of that script (`--font-sans-zh` / `-ja` / `-ko`); `<html lang>` follows the chosen language.
- Sizes: `--font-size-xs` 12 · `sm` 14 (body) · `md` 16 (card titles) · `lg` 20 · `xl` 24 (page titles,
  stat numbers) · `2xl` 32 · `3xl` 36 (the hero number).
- Big numbers: bold + `--letter-spacing-tight` (-0.02em); the `₫` unit is 0.55em and secondary.
- Amounts in lists use `font-variant-numeric: tabular-nums`.
- Formatting helpers (`client/src/utils/format.js`) use `Intl` with the locale of the chosen language; the unit stays
  VND and dates stay in Vietnam time: `formatVnd` → `12,450,000 ₫` (English) / `12.450.000 ₫` (Tiếng Việt, Deutsch),
  `formatSignedVnd` → `+18,500,000 ₫`, `formatCompact` → `13.6M`, `formatPercent` → `86.3%` / `86,3 %`,
  `formatDate` → `25 Oct 2026` / `2026年10月25日`, `formatDayMonth` → `25 Oct`.

## 5. Spacing, radius and shadows

- 4px scale: `--space-1` 4 · `2` 8 · `3` 12 · `4` 16 · `5` 24 · `6` 32 · `7` 48 (px).
- Radius: `--radius-sm` 8 (swatches) · `md` 12 (inputs, tiles, avatars, tooltips) · `lg` 20 (cards,
  dialogs) · `xl` 24 (sidebar, page banner, drawer) · `full` (buttons, pills, chips, capsules).
- Shadows use a negative spread, so they stay tight under the element instead of a grey halo:
  `--shadow-sm` cards at rest · `--shadow-md` hero, hovered cards, tooltips · `--shadow-lg` dialogs, drawer, floating
  cards · `--shadow-primary` / `--shadow-danger` primary and danger buttons (a lit top edge plus a shadow in their own color).

## 5b. Motion

Library: `motion` (`motion/react`). One main curve, `--ease-out` `cubic-bezier(0.22, 0.61, 0.36, 1)` (plus `--ease-pop` `cubic-bezier(0.34, 1.56, 0.64, 1)` for small "pop" moments), and three durations:
`--duration-fast` 150ms (hover, press), `--duration-base` 220ms (menu pill, cards), `--duration-slow` 320ms (drawer).
Movements stay within 150–400ms; only the skeleton shimmer repeats while data loads.

- **Page change:** the content fades in and rises 8px (`AppLayout`).
- **Lists and cards:** a short stagger (`components/Motion/Reveal.jsx`); summary numbers count up (`CountUp.jsx`).
- **Hover and press:** cards lift 2px; buttons scale to 0.97 (icon buttons 0.92) while pressed.
- **Menu:** the active pill is measured from the open link and slides between items, so it fits every language.
- **Charts:** Recharts draws bars and lines in 400ms; skeletons shimmer over `--color-skeleton`.
- **Dialogs, drawer and toasts:** enter and leave with a fade and a small slide or scale; the transaction drawer
  slides in from the right (full width on phones).
- **Lists and calendars:** a `Select` list or a `DatePicker` calendar fades and scales in from its field (180ms);
  a soft pill slides behind the highlighted option, the check mark of the chosen one pops in, the month grid slides
  left or right. Checkboxes fill and their check pops in with `--ease-pop` (a small overshoot).
- **prefers-reduced-motion:** `MotionConfig reducedMotion="user"` in `main.jsx`, `useReducedMotion()` in the
  components and a rule in `global.css` stop the movement; things then appear at once. An E2E test covers it.

## 6. Layout

- **App frame:** a floating white sidebar (248px, `--radius-xl`, `--frame-gap` 12px around it) on the `--color-bg`
  canvas + the main area (32px padding).
- **Sidebar:** the logo (`components/Logo/`: the mark + the wordmark drawn as strokes), nav items with line icons,
  active item = primary-soft pill + primary-text; the language switcher; user block (sun-tinted initials) and
  "Log out" at the bottom.
- **Logo:** "Ruled L", see `docs/brand/README.md`. The same mark is the favicon and the PWA icons.
- **Language switcher** (`components/LanguageSwitcher/`): our `Select` (pill variant) with the lucide "languages" icon, each
  language written in its own language; the list opens upward when the sidebar has no room below. In the sidebar, in the phone menu and on Login / Register. English is the default; the choice
  is kept in localStorage.
- **Navigation items:** one array, `navItems` in `client/src/config/navItems.js` (`label`, `path`, optional
  `icon`). Adding a page to the menu is one new line there plus its route in `App.jsx`.
- **Active page:** primary-soft background, primary-text, semibold, plus a 4px primary bar on the left
  edge (so it is not shown by color alone). The link also gets `aria-current="page"` from React Router.
- **Narrow screens (<768px):** the sidebar becomes a sticky **top bar** (`--topbar-height` 56px): logo + name on
  the left, a round menu button on the right (hamburger, turns into an X when open). The button opens a
  **panel** under the bar (white, 20px radius, `--shadow-lg`) with the same items and "Log out" after a divider.
  The panel closes on Escape, on a click outside, or after choosing a link. Implemented in
  `client/src/components/AppLayout/`.
- **Page header:** a soft banner (`--gradient-banner`, `--radius-xl`) with title + subtitle on the left and the month
  picker pill and primary action on the right. It also sets the tab title ("Dashboard · Ledgerling").
- **Breakpoints:** ≤1100px dashboard stats and the transactions summary cards in 2 columns (balance / net
  full width), categories form below the list; ≤960px all rows one column; <768px the sidebar turns into
  the top bar + menu panel; ≤760px summary cards stacked; ≤640px the transactions table becomes a list (a wider
  table cuts the note short with "…", so the edit and delete buttons always fit); ≤560px 16px padding.
  No horizontal page scroll at any width (checked from 320px to 1440px).

## 7. Screens

- **Dashboard:** greeting · hero card (total balance, change pill, white sparkline, two soft circles)
  · income and expense cards (accent tile, number, change, progress bar: % saved / % spent)
  · Cash flow · Spending by category (donut + rows with colored bars) · This week (big total +
  capsule chart) · Recent transactions (category mark, note, category · date, signed amount, "View all").
- **Transactions:** header with month picker · three tinted summary cards (income green, expense
  coral, net sky) · filter bar (search, All/Income/Expense, category select) · rows as rounded pills on
  `--color-surface-muted` (category mark + note, category chip, date, signed amount, edit/delete) · pagination.
  On phones the table becomes a list. A click on a row opens the **details drawer** (`TransactionDrawer`:
  amount, category, date, note, tags, Edit and Delete; Escape or the X closes it).
- **Add / edit transaction dialog:** Expense/Income switch (the active side takes the money color),
  big amount field in the type color, categories as colored chips (one selected, with a check),
  date and note, Cancel / Save.
- **Categories:** Expense/Income switch with counts · cards with a 4px stripe in the category color,
  category mark, edit/delete, transaction count, amount, share bar · "New category" form (name,
  type, icon picker, 8 color swatches in two rows, live chip preview). The count, amount and share bar come with
  Transactions; until then a card shows the avatar, the name and the two icon buttons.
  - **Edit:** the same form card becomes "Edit category" (edit icon tile); the Type switch is locked
    (the other side fades out) with the hint "Type can't be changed after a category is created.";
    Cancel / Save changes side by side.
  - **Delete:** confirmed inside the card: `Delete "Food"?` / `This can't be undone.` + Cancel
    (secondary, gets the focus) / Delete (danger). No browser confirm and no dialog.
  - **States:** a centered, muted "Loading categories…" in the list area; an empty state per type
    ("No expense categories yet" + "New category"); a load error is an error alert + "Try again"; a
    delete or save error is an error toast with the server's message (e.g. "Category still has
    transactions", "Category already exists"); a success is a success toast ("Category added",
    "Category updated", "Category deleted"). Our own checks ("Please enter a name.") stay as an alert in the form.
- **Login (and Register):** gradient panel with headline and two floating mini cards (saved this
  month, this week's bars) · form with icon inputs (email, password + show button), full-width
  button, link to the other page. On phones the panel becomes a short banner. Register adds a
  "Name" field with a `user` icon. The password show button is the `eye` icon and looks selected
  (primary-soft) while the password is visible. Errors, both our own checks and the server's message,
  appear in one error alert between the fields and the button; the browser's built-in messages are
  turned off (`noValidate`) because they follow the browser language. While the stored session is
  checked on start-up, protected pages show a centered, muted "Loading…".

## 8. Components

Buttons (primary, secondary, ghost, danger, disabled, icon buttons) · inputs (with left icon, right
action, error state) · segmented control and money type switch · badges · chips and avatars ·
icon tiles · progress bars · alerts (info, success, error) · table · pagination · dialog on the
overlay · empty state (three soft circles behind an icon + call to action). All of them are shown
in the **Components** tab; their styles live in `client/src/pages/styleGuide/ui.module.css`.

The real pages use React components in `client/src/components/` that copy their styles from that kit:
`Button` (primary / secondary / danger, optional left icon), `IconButton`, `TextField`, `Alert`, `Card` +
`CardHeader`, `PageHeader`, `SegmentedControl` (optional income / expense tone), `EmptyState`, `MonthPicker`
(previous / next arrows around the month name) and `Modal` (a native `<dialog>` over the dimmed page; Escape, the X
button and a click outside close it; an element with `data-autofocus` gets the focus). The Transactions page uses
`Modal` for the add / edit form and for the delete confirmation.

**Form controls – no browser defaults.** Every list, date, file field and checkbox is drawn by Ledgerling, so it
looks the same in every browser and follows the chosen language:

- `Popover`: the floating white card under a field (`--radius-md`, `--shadow-lg`). It is a browser popover, so it
  shows in the top layer (above an open dialog, never cut off), opens above the field when there is no room below,
  follows the field on scroll and closes on a click outside.
- `Select` (`components/Select/`): replaces `<select>`. A combobox button that looks like an input (`field`) or a
  pill (`pill`), a chevron that turns, a list with optional group titles (Transactions: All categories / Expense /
  Income), a sliding highlight, a check on the chosen option. Keyboard: arrows, Home / End, Enter / Space, Escape,
  typing a letter jumps to an option.
- `DatePicker` (`components/DatePicker/`): replaces `<input type="date">`. The field shows the day in the user's
  language ("25 Oct 2026"); the calendar has month arrows, weekdays from Monday, today with a dot, the chosen day as a
  primary circle, days outside `min` / `max` struck through, and Today / Clear (Clear only for optional dates).
  Keyboard: arrows, Home / End, Page Up / Page Down, Enter, Escape (closes the calendar, not the dialog).
- **CSV drop zone** (Import dialog): a dashed card with a cloud icon; it turns sky while a file is dragged over it and
  mint with the file name and size once a good file is read. The real file input stays inside it for the keyboard.
- **Checkboxes** (global style in `global.css`): an 18px rounded box that fills with `--color-primary`; a bar for
  "some selected".
- The search box hides the browser's clear button and shows its own round × while there is text. Scrollbars are
  thin, in `--color-border-strong`.

**Toasts** (`components/Toast/` + `context/ToastContext.jsx`): small white cards in the top-right corner
(full width minus 16px on phones) with a tinted icon tile (income green for success, expense coral for error),
the message and a close button. They hide by themselves after 3 seconds. Any component calls
`const toast = useToast(); toast.success('Transaction added')` or `toast.error(getErrorMessage(err))`.
Used for every add / edit / delete on Categories and Transactions: success messages, and the server's message
on failure. The stack is a popover, so it also shows above an open dialog.

## 9. Charts (Recharts) – approved (v5)

Code: `client/src/pages/styleGuide/PreviewCharts.jsx`. Colors are read from the tokens with `cssVar()`
because SVG needs real color values.

- **Cash flow (area chart):** smooth `monotone` lines (2.5px). Only income gets a fading wash
  (25% → 0%); expense is a line only, so fills never mix into a muddy color. Dashed horizontal grid,
  round ticks (0 / 6M / 12M…) from `niceTicks()`, legend dots in the card header.
- **This week (bar chart):** pastel capsules on a light track (max 16px wide). The highest day uses
  the hero gradient and a small gradient pill with its amount ("650K"). No Y axis; the card shows the
  total above the chart.
- **Spending by category (donut):** thin ring (inner radius 79%), rounded segments with 3° gaps,
  starting at 12 o'clock; total in the middle.
- **Sparkline (hero):** white line with a white fading wash, no axes, edge to edge.
- **Hover:** white tooltip card with colored dots and full amounts; lines show a 5px dot with a white ring.
- Never two y-axes in one chart; text always uses text colors.

## 10. Where things live

| File | What it holds |
|---|---|
| `client/src/styles/tokens.css` | Every design value (colors, gradients, fonts, spacing, radius, shadows) |
| `client/src/styles/global.css` | Base page styles (font, background, heading reset) |
| `client/src/components/` | Shared React components used by the real pages (§8) |
| `client/src/utils/format.js` | Money, number and date formatting (follows the language) |
| `client/src/utils/categoryIcons.js` | Category icon registry, emoji mapping and the guess from the name |
| `client/src/components/Motion/` | `Reveal` (stagger) and `CountUp` |
| `client/src/components/Select/`, `DatePicker/`, `Popover/` | The form controls that replace the browser's own |
| `client/src/i18n/`, `client/src/locales/` | i18next setup and the 8 translation files |
| `docs/brand/` | Logo concepts, comparison, decision and inspiration notes |
| `client/src/utils/cssVar.js` | Reads a token in JavaScript (for charts) |
| `client/src/pages/StyleGuidePage.jsx` | The dev-only page with tabs |
| `client/src/pages/styleGuide/` | Screen mocks, shared kit (`ui.module.css`), app frame, charts, icons, sample data |

When a real page is built, its markup and styles are taken from the matching mock, and the sample
data is replaced by API calls.

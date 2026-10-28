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

1. **Light first.** Cool off-white page, white cards, a light sky band behind each page header.
2. **One vivid hero per screen:** the sky-to-teal gradient card holds the number to read first
   (total balance). Everything else stays light.
3. **Accent rhythm:** every card title has a small icon tile in its own accent color
   (sky, sun, mint, periwinkle…), so color repeats in a calm, predictable way.
4. **Color with meaning:** green = income, coral = expense, category colors = identity.
   Amounts always carry `+` / `−`, so color is never the only signal.
5. **Soft shapes:** 20px cards, pill buttons and chips, capsule chart bars, smooth curves.
6. **Readable:** every text color passes WCAG AA (4.5:1) on its background.
7. Light mode only for the MVP. Dark mode is a possible bonus feature later.

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
| **v5 (current)** | **Sky & Mint + accents** | Vivid sky-to-teal hero, colored icon tiles, savings ring, tinted summary cards, category stripes and bars. All MVP screens designed. |

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
| `--gradient-page-top` | `#e4f0fb` → transparent | Light sky band behind each page header (320px tall) |

### Surfaces, text and borders

| Token | Value | Contrast (white / page bg) | Use |
|---|---|---|---|
| `--color-bg` | `#f4f7fa` | – | Page background |
| `--color-surface` | `#ffffff` | – | Cards, tables, inputs, sidebar |
| `--color-surface-muted` | `#eff4f8` | – | Table header, row hover, progress tracks |
| `--color-overlay` | navy 45% | – | Behind dialogs |
| `--color-text` | `#172534` | 15.6 / 14.5 | Main text, headings, big numbers |
| `--color-text-secondary` | `#4a5868` | 7.3 / 6.8 | Labels, captions, subtitles on the sky band |
| `--color-text-muted` | `#617082` | 5.1 / 4.7 | Hints, dates, axis labels – only on white or the page bg |
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
| Category avatar (letter) | 15% tone on white | 50% tone + ink (text: 4.8:1 or more) |
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
category color is always shown with its name (chip label, avatar letter, legend row).

### Chart helpers

`--chart-bar` `#8fc2ec` (pastel capsules), `--chart-bar-track` `#eef4fa`, `--chart-highlight`
`#2874b5`, `--chart-grid` `#e3eaf1`, `--chart-axis` `#617082`.

## 4. Typography

- **Font:** [Be Vietnam Pro](https://fonts.google.com/specimen/Be+Vietnam+Pro) (Google Fonts) 400 / 500 / 600 / 700,
  loaded in `client/index.html`. Full Vietnamese diacritics. One font for the whole product.
- Sizes: `--font-size-xs` 12 · `sm` 14 (body) · `md` 16 (card titles) · `lg` 20 · `xl` 24 (page titles,
  stat numbers) · `2xl` 32 · `3xl` 36 (the hero number).
- Big numbers: bold + `--letter-spacing-tight` (-0.02em); the `₫` unit is 0.55em and secondary.
- Amounts in lists use `font-variant-numeric: tabular-nums`.
- Formatting helpers (`client/src/utils/format.js`): `formatVnd` → `12.450.000 ₫`,
  `formatSignedVnd` → `+18.500.000 ₫`, `formatCompact` → `13.6M`, `formatDate` → `25 Oct 2026`,
  `formatDayMonth` → `25 Oct` (Vietnam time).

## 5. Spacing, radius and shadows

- 4px scale: `--space-1` 4 · `2` 8 · `3` 12 · `4` 16 · `5` 24 · `6` 32 · `7` 48 (px).
- Radius: `--radius-sm` 8 (swatches) · `md` 12 (inputs, tiles, avatars, tooltips) · `lg` 20 (cards,
  dialogs) · `xl` 28 (app frame) · `full` (buttons, pills, chips, capsules).
- Shadows: `--shadow-sm` cards at rest · `--shadow-md` hero, frame, tooltips · `--shadow-lg` dialogs,
  floating cards.

## 6. Layout

- **App frame:** sidebar (240px, white) + main area (32px padding, sky band at the top).
- **Sidebar:** gradient logo tile, nav items (Dashboard, Transactions, Categories) with line icons,
  active item = primary-soft background + primary-text; a "Saved in October" card (pastel wash +
  mint progress ring); user block (sun-tinted initials) and "Log out" at the bottom.
- **Phones (≤960px):** the sidebar becomes a fixed **bottom tab bar** (`--tabbar-height` 64px) with
  four equal tabs – Dashboard, Transactions, Categories, Log out – each an icon above a 12px label.
  The active tab uses the same primary-soft pill as the sidebar. Page content gets extra bottom
  padding so the bar never covers it. Implemented in `client/src/components/AppLayout/`.
- **Page header:** title + subtitle on the left; month picker pill and primary action on the right.
- **Breakpoints:** ≤1100px dashboard stats in 2 columns (hero full width), categories form below the
  list; ≤960px sidebar hidden, a slim app bar (logo + avatar) appears, all rows one column;
  ≤760px summary cards stacked; ≤640px the transactions table becomes a list; ≤560px 16px padding.
  No horizontal page scroll at any width (checked at 390px).

## 7. Screens

- **Dashboard:** greeting · hero card (total balance, change pill, white sparkline, two soft circles)
  · income and expense cards (accent tile, number, change, progress bar: % saved / % spent)
  · Cash flow · Spending by category (donut + rows with colored bars) · This week (big total +
  capsule chart) · Recent transactions (avatar, note, category · date, signed amount, "View all").
- **Transactions:** header with month picker · three tinted summary cards (income green, expense
  coral, net sky) · filter bar (search, All/Income/Expense, category select) · table (avatar + note,
  category chip, date, signed amount, edit/delete) · pagination. On phones the table becomes a list.
- **Add / edit transaction dialog:** Expense/Income switch (the active side takes the money color),
  big amount field in the type color, categories as colored chips (one selected, with a check),
  date and note, Cancel / Save.
- **Categories:** Expense/Income switch with counts · cards with a 4px stripe in the category color,
  avatar, edit/delete, transaction count, amount, share bar · "New category" form (name,
  type, 8 color swatches in two rows, live chip preview). The count, amount and share bar come with
  Transactions; until then a card shows the avatar, the name and the two icon buttons.
  - **Edit:** the same form card becomes "Edit category" (edit icon tile); the Type switch is locked
    (the other side fades out) with the hint "Type can't be changed after a category is created.";
    Cancel / Save changes side by side.
  - **Delete:** confirmed inside the card: `Delete "Food"?` / `This can't be undone.` + Cancel
    (secondary, gets the focus) / Delete (danger). No browser confirm and no dialog.
  - **States:** a centered, muted "Loading categories…" in the list area; an empty state per type
    ("No expense categories yet" + "New category"); a load error is an error alert + "Try again"; a
    delete error is an error alert above the cards (**Can't delete "Food".** + the server's message,
    e.g. "Category still has transactions"); a save error is an error alert in the form above the
    button (e.g. "Category already exists").
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
| `client/src/utils/format.js` | Money and date formatting |
| `client/src/utils/cssVar.js` | Reads a token in JavaScript (for charts) |
| `client/src/pages/StyleGuidePage.jsx` | The dev-only page with tabs |
| `client/src/pages/styleGuide/` | Screen mocks, shared kit (`ui.module.css`), app frame, charts, icons, sample data |

When a real page is built, its markup and styles are taken from the matching mock, and the sample
data is replaced by API calls.

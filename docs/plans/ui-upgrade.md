# UI upgrade – brand, interface, motion, i18n

Branch: `feature/ui-upgrade`. Goal: a new logo, category line icons, a refined interface with motion,
and 8 languages, with no change to existing features. Tick each box when done so the work can be resumed.

## 1. Inspiration
- [x] Screenshot https://porto-exp.vercel.app at 1440px and 390px (scrolled sections, 1–2 modals/drawers)
- [x] Download its CSS, study transitions, animations, keyframes, shadows, gradients (all CSS is inline in its HTML)
- [x] Write 5–7 takeaways to `docs/brand/inspiration.md`

## 2. Logo
- [x] Draw 3 SVG concepts (mark + mark with wordmark) in `docs/brand/`
- [x] Render at 16/32/64/128px on light and dark, screenshot, compare (`comparison.png`, `comparison-16px.png`)
- [x] Choose one, write the reasons to `docs/brand/README.md` (B, Ruled L)
- [x] Apply to sidebar, Login/Register, favicon, tab title, PWA icons (regenerate PNGs)

## 3. Category icons
- [x] Install lucide-react; icon registry with ~40 grouped icons (50 icons in 11 groups)
- [x] Icon guessed from the category name on display, generic fallback, never a letter, no Atlas writes
- [x] Emoji values stay compatible
- [x] Icon picker in the category form; server validation accepts icon names; default categories get icons
- [x] `CategoryMark` tile (light tint, strong icon) on every category surface

## 4. Interface
- [x] Update `tokens.css` and `docs/ui-style.md`
- [x] Apply to every page

## 5. Motion
- [x] Install motion; shared helpers that respect prefers-reduced-motion
- [x] Page transition, stagger, count-up, hover lift, button press
- [x] Chart animation, skeleton shimmer, sliding sidebar indicator
- [x] Modal and toast enter/exit
- [x] Transaction detail drawer with Edit and Delete

## 6. i18n
- [x] Install i18next, react-i18next, i18next-browser-languagedetector; set up with English as the default
- [x] Move all UI text to keys: components, pages, charts, tab titles, shortcuts, icon groups
- [x] Locale-aware dates and numbers through Intl; amounts stay VND
- [x] Language switcher: sidebar, mobile menu, Login/Register; `html[lang]` follows it
- [x] Translate fr, de, es, zh-CN, ja, ko, vi
- [x] Server `code` field on errors; client translates by code; Swagger and api-plan updated
- [x] `npm run i18n:check` is clean
- [x] Update CLAUDE.md (Stack and Autonomous workflow)

## 7. Verification
- [x] Update tests broken by text/UI/code changes (prefer role or data-testid; none deleted or weakened)
- [x] New Playwright tests: Vietnamese menu survives reload; category cards show icons, not letters
- [x] Server `npm test`
- [x] Client `npm test`, `npm run build`, `npm run test:e2e`, `npm run i18n:check`
- [x] Screenshots of every page at 1440/390 in English; Dashboard, Transactions, Categories in Deutsch and 日本語
- [x] Review the screenshots, fix layout, contrast and untranslated text, repeat
- [x] Final run of every check after the screenshot fixes
- [x] Stop every server that was started

## 8. Report
- [ ] Report in Vietnamese with one Conventional Commits message

## Assumptions and decisions
- A first visit is always in English: the language detector reads only localStorage, never the browser language.
- API `message` stays English; the client translates by `code` (errors) and by `code` + `params` (insights, CSV import rows).
  An unknown code falls back to the English `message`.
- Stored emoji icons are never rewritten in Atlas; the client shows them as the matching line icon.
  A category without an icon gets one guessed from its name on display only.
- `@vite-pwa/assets-generator` (dev only) regenerates the PWA PNGs from `public/favicon.svg` (`npm run generate-pwa-assets`).
- The dev-only style guide page stays in English (it is a design reference, not part of the product).
- Session 2 (resumed): fixed a unit test that used `formatPercent` without importing it; documented the error codes,
  icon names and insight codes in Swagger, `docs/api-plan.md` and `docs/erd.md`; updated `docs/ui-style.md` (v6) and CLAUDE.md.

## Session 2 results
- Server `npm test`: 385/385. Client `npm test`: 360/360. `npm run build`: OK. `npm run i18n:check`: OK (8 languages, 493 keys).
- Playwright `npm run test:e2e`: 68/68 (desktop and mobile).
- Screenshots (`scratchpad/shots3`): 1440 and 390, English, plus Deutsch, 日本語, Tiếng Việt, Français, Español, 中文, 한국어. Layout issues found and fixed: German Y-axis labels clipped (chart Y width fixed at 64px; `width="auto"` measured too narrow); calendar amounts unreadable on phones (hidden below 560px, the cell keeps its accessible name); yearly month labels overlapping on phones (`preserveStartEnd`).
- Remaining automated hits are visually hidden screen-reader labels (for example "Language"), which are expected.

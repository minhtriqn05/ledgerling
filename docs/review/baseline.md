# Final review – baseline (before any fix)

Measured on 1 November 2026 on branch `feature/final-review` (= `main` at `1ca2479`), Windows 11, Node 24.19.0,
npm 11.17.0. Only `@vitest/coverage-v8` 5.0.5 and the `test:coverage` scripts were added before measuring.

## Tests

| Suite | Result | Time |
|-------|--------|------|
| Server – Vitest + Supertest (`npm test`) | 25 files, **594 passed**, 0 failed | 107 s |
| Client – Vitest + RTL (`npm test`) | 89 files, **759 passed**, 0 failed | 43 s |
| Client – Playwright (`npm run test:e2e`, Chromium desktop + Pixel 7, 6 workers) | 298 tests: **282 passed, 10 failed, 6 skipped** | **17.9 min** |
| Client – `npm run i18n:check` | OK: 8 languages, 966 keys each | – |
| Client – `npm run lint` | no `lint` script (no ESLint in the client) | – |
| Server – lint | no ESLint in the server | – |

The 10 e2e failures were all time-outs (30 s) or "context closed" at the end of multi-browser tests: admin (desktop +
mobile), breadcrumbs, budgets, custom controls, bulk actions (desktop + mobile), real-time (2), CSV export/import.
The first batch failed while Vite was still re-optimising its dependencies (the lockfile had just changed); the machine
was also running the server tests at the same time. They are treated as flakiness to fix at the root (P5.2).

## Coverage (`npm run test:coverage`, v8)

| | Statements | Branches | Functions | Lines |
|-|-----------:|---------:|----------:|------:|
| Server (`src/**`) | 94.54 % | 90.21 % | 98.34 % | **95.22 %** |
| Client (`src/**`, tests excluded) | 56.29 % | 58.31 % | 52.34 % | **57.16 %** |
| Client `src/utils` | – | 95.9 % | – | 93.7 % |
| Client `src/hooks` | – | 94.7 % | – | 100 % |

Lowest client folders (lines): `pages/styleGuide` 0 % (dev-only page), `pages/categories` 0 %, `pages/*.jsx` 13 %,
`api` 20.6 %, `pages/goals` 33.3 %.

## Bundle (`npm run build`, Vite 8)

- 58 JavaScript files, **1,789.6 kB** in total (**575.6 kB gzip**), CSS 183.9 kB. PWA precache: 103 entries, 1,932.6 KiB.
- Biggest chunks: `index` **513.62 kB** (gzip 159.69 kB, Vite warns > 500 kB), `Alert` 411.82 kB (gzip 141.28 kB),
  `CartesianChart` (Recharts) 331.37 kB (gzip 97.06 kB), `react` 131.60 kB, `Icon` 66.24 kB, `TransactionsPage` 57.43 kB.
- First page (`index.html`) loads `index`, `Alert`, `react`, `Icon`, `Logo`, `AnimatePresence`, `languages`,
  `AuthContext`, `Button`, `format`, `vnDate`, `Card` ≈ 1.15 MB of JavaScript before any route chunk.

## Accessibility (axe-core 4, tags wcag2a / wcag2aa / wcag21a / wcag21aa)

- `e2e/a11y.spec.js` (serious + critical only): passed on desktop and mobile.
- A one-off sweep of **28 pages × 2 themes** (every public page, every signed-in page incl. 3 report tabs,
  8 Settings sections, 2 admin pages, 404), signed in as the e2e admin: **0 violations** of any impact.

## Lighthouse

Not measured on the baseline (needs the build served by `vite preview` and Playwright's Chromium); measured once, after
the fixes, in `docs/review/final-review.md`.

## npm audit

| Folder | All dependencies | Production only (`--omit=dev`) |
|--------|------------------|-------------------------------|
| Server | 4 moderate (`swagger-jsdoc` → `glob` → `minimatch`; `nodemon` → `minimatch`) | 3 moderate (the `swagger-jsdoc` chain) |
| Client | 10 (2 low, 8 moderate) in build tools (`vite-plugin-pwa` → `workbox-build` → `glob` / `minimatch` / `ejs` / `deepmerge`) | **0** |

No high or critical. Every fix needs `npm audit fix --force` (a major downgrade of `swagger-jsdoc` or `vite-plugin-pwa`), so none is applied.

## Live site (checked before starting)

- Frontend `https://ledgerling-ten.vercel.app` → 200, `/welcome` → 200.
- API `https://ledgerling-api.onrender.com/api/health` → 200 `{ success: true }`, `/api-docs/` → 200,
  `POST /api/auth/demo` → 200.
- CORS: the Vercel origin gets `Access-Control-Allow-Origin`, any other origin gets none.

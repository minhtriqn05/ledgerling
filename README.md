# Ledgerling

[![CI](https://github.com/minhtriqn05/ledgerling/actions/workflows/ci.yml/badge.svg)](https://github.com/minhtriqn05/ledgerling/actions/workflows/ci.yml)
[![Live smoke](https://github.com/minhtriqn05/ledgerling/actions/workflows/live-smoke.yml/badge.svg)](https://github.com/minhtriqn05/ledgerling/actions/workflows/live-smoke.yml)

A personal expense tracker for the web, the phone and offline use.

**The name**: *ledger* (the book where income and expenses are written down) + *-ling* (small, as in *duckling*):
a little ledger that keeps your money in order.

**Course project** of *Phát triển ứng dụng web và cơ sở dữ liệu* (Web application and database development), class
**CSBU109.R11.KHBC**, UIT (University of Information Technology, VNU-HCM). Solo project: the backend and the frontend are
built by one student.

| | |
|---|---|
| **App** | https://ledgerling-ten.vercel.app |
| **API base URL** | https://ledgerling-api.onrender.com/api (health check: [`/api/health`](https://ledgerling-api.onrender.com/api/health)) |
| **API docs** (Swagger) | https://ledgerling-api.onrender.com/api-docs |
| **Try the demo** | open the app and click **Try the demo**: a shared account with three months of sample data, no sign-up |

On Render's free plan the API sleeps after 15 minutes without visitors: the first request can then take up to a minute,
and the app says so while it waits.

![Dashboard](docs/screenshots/dashboard-1440.jpg)

## Features

**Money**
- Income and expense transactions with a category, a wallet, a note, up to 5 tags and a date (months follow Vietnam
  time, UTC+7). Amounts are whole VND.
- Categories with a color and an icon; one with transactions or recurring rules cannot be deleted.
- Wallets (cash, bank, e-wallet) with live balances, transfers between them, archiving.

**Working fast**
- Search, sort, filters (month, date range, type, category, wallet, tag) and pages; the filters stay in the address.
- Quick add that understands text like `coffee 35k #work` or `salary 15tr yesterday`; transaction templates.
- Tick several rows to move them to another category or delete them; Undo after a delete.
- CSV export and import (up to 500 rows; bad rows are listed, good rows are saved).
- Command palette (`Ctrl+K`), keyboard shortcuts (`N` new, `/` search, `?` list), breadcrumbs.

**Planning**
- Budgets per expense category and month, with warnings at 80% and 100%; copy last month's budgets.
- Recurring transactions: weekly or monthly rules that create real transactions when they are due.
- Savings goals with deposits, withdrawals and a history.

**Understanding**
- Dashboard: the month in numbers, charts, budget alerts, nearest goals, rule-based insights.
- Reports: monthly (compared with last month), yearly, and a calendar of spending by day; printable.
- In-app notifications: budgets, goals, recurring transactions, a weekly summary; each kind can be turned off.

**Account and devices**
- Profile with a ready-made avatar or an own photo (cropped in the browser), password change, log out of all devices,
  theme (light, dark, system), first day of the week, language, data export (JSON), account deletion.
- Real-time sync: a change on one device appears on the others without a reload (Socket.IO).
- Installable PWA: the pages and data that were loaded stay readable offline; writing is locked until the network is back.
- 8 languages: English (default), Tiếng Việt, Français, Deutsch, Español, 简体中文, 日本語, 한국어. Dates and numbers follow
  the language; amounts stay in VND.

**Public and admin**
- Landing page at `/welcome` with a one-click demo; SEO tags; accessibility checked with axe on every page.
- Admin page (role `admin`): site statistics, the list of accounts, disable and enable an account.

## Screenshots

Taken by Playwright from the sample data of the demo account (`npm run screenshots:docs` in `client/`).

| | |
|---|---|
| ![Landing page](docs/screenshots/welcome-1440.jpg) Landing page | ![Transactions](docs/screenshots/transactions-1440.jpg) Transactions |
| ![Transaction details](docs/screenshots/transaction-drawer-1440.jpg) Transaction details | ![Categories](docs/screenshots/categories-1440.jpg) Categories |
| ![Budgets](docs/screenshots/budgets-1440.jpg) Budgets | ![Recurring](docs/screenshots/recurring-1440.jpg) Recurring |
| ![Goals](docs/screenshots/goals-1440.jpg) Goals | ![Wallets](docs/screenshots/wallets-1440.jpg) Wallets |
| ![Monthly report](docs/screenshots/reports-monthly-1440.jpg) Monthly report | ![Yearly report](docs/screenshots/reports-yearly-1440.jpg) Yearly report |
| ![Calendar](docs/screenshots/reports-calendar-1440.jpg) Calendar | ![Notifications](docs/screenshots/notifications-1440.jpg) Notifications |
| ![Settings](docs/screenshots/settings-1440.jpg) Settings | ![Admin](docs/screenshots/admin-1440.jpg) Admin |
| ![Command palette](docs/screenshots/command-palette-1440.jpg) Command palette (`Ctrl+K`) | ![Dark theme](docs/screenshots/dashboard-dark-1440.jpg) Dark theme |
| ![Deutsch](docs/screenshots/dashboard-de-1440.jpg) Deutsch | ![日本語](docs/screenshots/dashboard-ja-1440.jpg) 日本語 |

On a phone (390 px):

<p>
  <img src="docs/screenshots/dashboard-390.jpg" alt="Dashboard on a phone" width="180">
  <img src="docs/screenshots/transactions-390.jpg" alt="Transactions on a phone" width="180">
  <img src="docs/screenshots/transaction-drawer-390.jpg" alt="Transaction details on a phone" width="180">
  <img src="docs/screenshots/budgets-390.jpg" alt="Budgets on a phone" width="180">
  <img src="docs/screenshots/reports-calendar-390.jpg" alt="Calendar on a phone" width="180">
</p>

Every page also exists at 390 px in [docs/screenshots](docs/screenshots).

## Stack

| Part | Technology |
|------|------------|
| Frontend | React 19 (Vite), React Router, Axios, Recharts, CSS Modules, i18next, lucide-react, motion, vite-plugin-pwa |
| Backend | Node.js 24, Express 5 (REST), Socket.IO |
| Database | MongoDB Atlas with Mongoose |
| Auth | JWT (Bearer token) + bcryptjs |
| API docs | Swagger (swagger-jsdoc + swagger-ui-express) at `/api-docs` |
| Tests | Vitest, Supertest, mongodb-memory-server, React Testing Library, Playwright, axe-core |
| Hosting | Vercel (app), Render (API), GitHub Actions (CI) |

## Architecture

```mermaid
flowchart LR
    subgraph Browser
        App["React app (PWA)"]
        SW["Service worker<br/>offline copy of the loaded data"]
    end
    Vercel["Vercel<br/>static build, SPA rewrite,<br/>security headers"]
    subgraph Render["Render (Node.js)"]
        API["Express REST API /api<br/>helmet, CORS, rate limits,<br/>JWT auth, input validation"]
        Layers["routes → controllers →<br/>services → models"]
        Socket["Socket.IO<br/>data:changed, notification:new"]
        Docs["Swagger UI /api-docs"]
    end
    Atlas[("MongoDB Atlas")]

    Vercel -->|HTML, JS, CSS| App
    App -->|HTTPS + Bearer JWT| API
    App <-->|WebSocket + JWT| Socket
    App -.- SW
    API --> Layers
    Layers --> Atlas
    Layers -->|after each write| Socket
```

The server keeps one rule per layer: a route declares the path and its validation, a controller reads the request and
writes the answer, a service holds the business logic, a model is the Mongoose schema. The client calls the API only
through `client/src/api`. The endpoints are listed in [docs/api-plan.md](docs/api-plan.md) and the data model in
[docs/erd.md](docs/erd.md) (Mermaid ER diagram and every index).

## Run it on your computer

You need Node.js 24 and a MongoDB database (a free Atlas cluster or a local MongoDB).

```bash
# API on http://localhost:4000 (Swagger on /api-docs)
cd server
npm ci
cp .env.example .env      # fill in MONGODB_URI and JWT_SECRET; CLIENT_URL=http://localhost:5173
npm run dev

# App on http://localhost:5173 (in a second terminal)
cd client
npm ci
cp .env.example .env      # VITE_API_URL=http://localhost:4000/api
npm run dev
```

**The demo account** ("Try the demo") is made once per database by the seed script, never by the API. Until then the
button says the demo is not available (the API answers 503 `DEMO_UNAVAILABLE`). Set `DEMO_PASSWORD` (6 characters or
more) and `MONGODB_URI` in `server/.env`, then run `npm run seed` in `server/`. Running it again moves the sample dates
up to today; it only rebuilds the documents of the demo user. Check: `curl -X POST <api>/api/auth/demo` answers 200.

**An admin**: `npm run make-admin -- you@example.com` in `server/` (no route can create one).

## Tests

| Command | What it runs |
|---------|--------------|
| `cd server && npm test` | 664 API tests (Vitest + Supertest) on an in-memory MongoDB: every route, access rules, validation, Vietnam time, money cross-checks, concurrency, indexes, the docs against the code |
| `cd server && npm run test:coverage` | the same with coverage: 94.8% of lines, 90.8% of branches (the run fails below 80%) |
| `cd client && npm test` | 845 unit and component tests (Vitest + React Testing Library) |
| `cd client && npm run test:coverage` | the same with coverage: 67.5% of lines, `src/utils` 94.0%, `src/hooks` 100% (fails below 60% / 80%) |
| `cd client && npm run test:e2e` | Playwright on the production build: every flow on Chrome (desktop and phone), the main flow of each feature (`@smoke`) also on Firefox and iPhone Safari, axe on every page in light and dark |
| `cd client && npm run test:e2e:live` | the deployed site: health, API docs, the app, its security headers, the demo, the rate limit, and the main flow with one temporary account that is deleted at the end |
| `npm run lint` (both), `npm run i18n:check` (client) | ESLint with zero warnings; every text in all 8 languages |

The end-to-end tests start their own API with an in-memory database (`npm run start:e2e`), so they never touch Atlas.
Install the browsers once with `npx playwright install chromium firefox webkit`.

**CI** ([.github/workflows/ci.yml](.github/workflows/ci.yml)) runs lint, the unit tests with coverage, the i18n check,
the build and the end-to-end tests on every push and pull request. **Live smoke**
([.github/workflows/live-smoke.yml](.github/workflows/live-smoke.yml)) runs after each push to `main`: it waits until
Render serves the new commit (`/api/health` shows it as `version`), checks that Vercel answers, then runs
`npm run test:e2e:live`.

## Security

- Passwords are hashed with bcrypt; a login takes the same time whether the email exists or not.
- JWT with an expiry and a version number: a password change, "log out of all devices" or a disabled account makes
  every older token invalid, and closes the real-time connections.
- Every route validates its input (types, lengths, whole VND amounts, real dates, ids) and drops unknown fields; MongoDB
  operators in a body or a query are refused; bodies are limited (100 kB, 300 kB for an import, 200 kB for a photo).
- Every query is limited to the signed-in user: another user's id answers 404, so ids reveal nothing; bulk actions are
  all or nothing.
- Admin routes need the `admin` role; the shared demo account cannot change its password or photo, log out everywhere
  or delete itself.
- helmet headers, a CORS allow-list, rate limits per visitor (300 requests / 15 min on the API, 20 / 15 min on login,
  register and demo; the visitor's address is read correctly behind Cloudflare and Render), no stack trace or internal
  message in an error answer.
- CSV exports are protected against formula injection; uploaded photos are checked by their real file type and size.
- The app is served with `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options` and `Permissions-Policy`
  ([client/vercel.json](client/vercel.json)).
- Secrets live only in environment variables; `.env` files are never committed.

## Deployment and environment variables

**Render** (API): root directory `server`, build command `npm ci`, start command `npm start`, Node 24 (from `engines`).

| Variable | Required | Example | What it does |
|----------|----------|---------|--------------|
| `MONGODB_URI` | yes | `mongodb+srv://user:password@cluster.mongodb.net/ledgerling` | the database |
| `JWT_SECRET` | yes | a long random string | signs the tokens |
| `CLIENT_URL` | yes | `https://ledgerling-ten.vercel.app` | the app addresses allowed by CORS and Socket.IO, comma-separated |
| `JWT_EXPIRES_IN` | no | `7d` (the default) | how long a token is valid (`12h`, `7d`, ...) |
| `PORT` | no | set by Render; `4000` on your computer | the port of the server |
| `NODE_ENV` | no | `production` | a database validation error then answers a fixed message |
| `DEMO_PASSWORD` | only for `npm run seed` | 6 characters or more | the password of the demo account; the seed runs from your computer |
| `RENDER_GIT_COMMIT` | set by Render | | shown by `/api/health` as `version` |

The server stops at start-up with a clear message when `MONGODB_URI`, `JWT_SECRET` or `CLIENT_URL` is missing, or when
`JWT_EXPIRES_IN` is not a valid duration.

**Vercel** (app): root directory `client`, framework Vite (build `npm run build`, output `dist`).

| Variable | Required | Example | What it does |
|----------|----------|---------|--------------|
| `VITE_API_URL` | yes | `https://ledgerling-api.onrender.com/api` | the API base URL, with `/api` |
| `VITE_SITE_URL` | no | `https://ledgerling-ten.vercel.app` | the public address for the canonical link and the share cards; without it, the production address Vercel gives the build |

Both `.env.example` files list the same variables.

## Folder structure

```
.github/workflows/   ci.yml (checks on every push), live-smoke.yml (after each deploy of main)
client/              React app (Vite)
  e2e/               Playwright tests; e2e/live/ checks the deployed site
  public/            icons and the share image
  scripts/           i18n check, site address, share image
  src/
    api/             every call to the API (Axios)
    components/      shared components (Button, Modal, Drawer, Select, DatePicker, ...)
    config/          navigation, breadcrumbs, Settings sections
    context/         auth, theme, toasts, notifications, real-time socket
    hooks/           React hooks
    i18n/, locales/  i18next set-up; en.json is the source, 7 translations
    pages/           one file or folder per page
    styles/          tokens.css: every color, font and spacing
    utils/           formatting, Vietnam dates, CSV, quick add, ...
  vercel.json        SPA rewrite and security headers
server/
  src/
    config/          environment check, database, CORS origins, Swagger
    routes/          Express routers with their Swagger comments
    middlewares/     auth, validation, rate limits, errors
    controllers/     request and answer
    services/        business logic
    models/          Mongoose schemas
    utils/           shared helpers
    scripts/         make-admin
    app.js, server.js, seed.js, e2e.js (in-memory API for Playwright)
  tests/             Vitest + Supertest
docs/                api-plan.md, erd.md, ui-style.md, plans/, review/, screenshots/, postman/
```

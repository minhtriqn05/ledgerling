<div align="center">

<a href="https://ledgerling-ten.vercel.app">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/assets/logo-wordmark-dark.svg">
    <img src="docs/assets/logo-wordmark-light.svg" alt="Ledgerling logo: a round coin made of two gold and two jade L shapes, next to the name Ledgerling" height="64">
  </picture>
</a>

### A personal expense tracker that works on the web, on your phone and offline.

[![CI](https://github.com/minhtriqn05/ledgerling/actions/workflows/ci.yml/badge.svg)](https://github.com/minhtriqn05/ledgerling/actions/workflows/ci.yml)
[![Live smoke](https://github.com/minhtriqn05/ledgerling/actions/workflows/live-smoke.yml/badge.svg)](https://github.com/minhtriqn05/ledgerling/actions/workflows/live-smoke.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-2fc79c.svg)](LICENSE)
[![Node.js 24](https://img.shields.io/badge/node-24.x-5fa04e?logo=nodedotjs&logoColor=white)](.nvmrc)
[![React 19](https://img.shields.io/badge/react-19-61dafb?logo=react&logoColor=black)](client/package.json)
[![Express 5](https://img.shields.io/badge/express-5-000000?logo=express&logoColor=white)](server/package.json)
[![MongoDB](https://img.shields.io/badge/mongodb-atlas-47a248?logo=mongodb&logoColor=white)](docs/database.md)
[![Languages: 8](https://img.shields.io/badge/languages-8-4f9ff0)](#internationalization)

**[Live demo](https://ledgerling-ten.vercel.app)** ·
**[API docs (Swagger)](https://ledgerling-api.onrender.com/api-docs)** ·
**[API base URL](https://ledgerling-api.onrender.com/api)** ·
**[Tiếng Việt](README.vi.md)**

</div>

<br>

[![The Ledgerling landing page: the headline "Know where your money goes." above a preview of the Dashboard](docs/screenshots/welcome-1440.jpg)](https://ledgerling-ten.vercel.app/welcome)

Ledgerling is my solo final project for the course *Phát triển ứng dụng web và cơ sở dữ liệu* (Web application and
database development) at UIT. The name is *ledger* (the book where income and expenses are written down) plus *-ling*
(small, as in *duckling*): a little ledger that keeps your money in order. I built the REST API, the database design and
the React app myself, and deployed them on Render, MongoDB Atlas and Vercel.

## Contents

- [Try it in 30 seconds](#try-it-in-30-seconds)
- [Highlights](#highlights)
- [Features](#features)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [API overview](#api-overview)
- [Getting started](#getting-started)
- [Testing](#testing)
- [Performance](#performance) · [Accessibility](#accessibility) · [Security](#security) · [Internationalization](#internationalization)
- [Deployment](#deployment) · [CI/CD](#cicd)
- [Project structure](#project-structure)
- [Roadmap](#roadmap)
- [Course](#course) · [Author](#author) · [Acknowledgements](#acknowledgements) · [License](#license)

More detail lives in [docs/](docs/README.md): architecture, database, API, testing and deployment.

## Try it in 30 seconds

1. Open **https://ledgerling-ten.vercel.app**.
2. Click **Try the demo**. No sign-up: you land in a shared account with three months of sample data
   (transactions, budgets, goals, wallets, recurring rules, notifications).
3. Look around: add a transaction with `N`, open the command palette with `Ctrl+K`, switch the theme or the language.

> [!NOTE]
> The API runs on Render's free plan, which sleeps after 15 minutes without visitors. The first request can then take
> about **30–60 seconds** while the server wakes up; the app shows a message while it waits. After that it is fast.

The demo account is shared and reset from time to time, so please do not write anything private in it. To keep your own
data, click **Get started** and make an account (an email and a password, nothing else).

## Highlights

- **Real-time sync.** Change something on your laptop and your phone updates by itself, without a reload
  (Socket.IO, one private room per user; the events carry no data, the client reads the protected API again).
- **Works offline.** Ledgerling is an installable PWA: pages and data you already opened stay readable without a
  network, and writing is locked until the connection is back, so nothing is lost or saved twice.
- **8 languages.** English, Tiếng Việt, Français, Deutsch, Español, 简体中文, 日本語 and 한국어. Dates and numbers follow
  the language through `Intl`; the API sends stable error codes and the app translates them.
- **Budgets and insights.** Monthly budgets per expense category with warnings at 80% and 100%, monthly and yearly
  reports, a spending calendar and tips built from simple rules (no black box).
- **Recurring transactions.** Weekly or monthly rules create real transactions when they are due, and a partial unique
  index makes sure a rule never creates two transactions for the same day, even when two requests race.
- **Wallets and transfers.** Cash, bank and e-wallet balances are worked out from the transactions and transfers on
  every read, so they can never drift from the history.
- **Admin and sessions.** Role-based Admin page, disabling an account, and "log out of all devices" through a token
  version stored in every JWT.
- **Tested end to end.** 1,519 unit and API tests, 344 Playwright tests on Chrome (desktop and phone), the main flows
  again on Firefox and iPhone Safari, axe accessibility checks in both themes, CI on every push and a live smoke test
  after every deploy.

## Features

### Money: transactions, categories and wallets

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/screenshots/transactions-dark-1440.jpg">
  <img src="docs/screenshots/transactions-1440.jpg" alt="Transactions page: month totals for income, expense and net, a search box, filters by category, wallet, sort and date range, and a list of transactions with category chips, tags and amounts">
</picture>

- Income and expense transactions with a category, a wallet, a note, up to 5 tags and a date. A "month" follows
  Vietnam time (UTC+7); amounts are whole VND.
- Search, sort, filters (month, date range, type, category, wallet, tag) and pagination; the filters stay in the URL.
- Categories with a color and an icon. A category that still has transactions or recurring rules cannot be deleted.
- Wallets (cash, bank, e-wallet) with live balances, transfers between them and archiving.
- CSV export and import (up to 500 rows: good rows are saved, bad rows are listed with the reason).

<details>
<summary>More screenshots: transaction details, categories, wallets</summary>

<br>

![Transaction details drawer: amount, category, wallet, date, tags and note of one transaction, with edit and delete buttons](docs/screenshots/transaction-drawer-1440.jpg)

![Categories page: expense and income tabs, one card per category with its icon, and the form for a new category with a color and an icon picker](docs/screenshots/categories-1440.jpg)

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/screenshots/wallets-dark-1440.jpg">
  <img src="docs/screenshots/wallets-1440.jpg" alt="Wallets page: the cash, bank and e-wallet cards with their balances and the transfers between them">
</picture>

</details>

### Planning: budgets, recurring rules and goals

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/screenshots/budgets-dark-1440.jpg">
  <img src="docs/screenshots/budgets-1440.jpg" alt="Budgets page: total budget, spent and left to spend for the month, and one card per category with a progress bar">
</picture>

- Budgets per expense category and month, with a warning at 80% and another at 100%; copy last month's budgets in one click.
- Recurring rules (weekly or monthly) that create real transactions when they are due; turning a rule off or deleting
  it keeps the transactions it already made.
- Savings goals with deposits, withdrawals and a history; the saved amount can never go below zero.

<details>
<summary>More screenshots: recurring rules, goals</summary>

<br>

![Recurring page: the monthly Salary and Rent rules with their amount, next run date and an on/off switch](docs/screenshots/recurring-1440.jpg)

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/screenshots/goals-dark-1440.jpg">
  <img src="docs/screenshots/goals-1440.jpg" alt="Goals page: two savings goals with a progress bar, the saved and target amounts, a deadline and Add money and Withdraw buttons">
</picture>

</details>

### Understanding: dashboard, reports and notifications

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/screenshots/dashboard-dark-1440.jpg">
  <img src="docs/screenshots/dashboard-1440.jpg" alt="Dashboard: the balance of the month, total income and total expense, a capsule bar chart of the last six months, wallets and budget alerts">
</picture>

- Dashboard: the month in numbers, charts, budget alerts, the nearest goals and rule-based insights.
- Reports: a monthly report compared with the month before, a yearly report and a calendar of spending per day; printable.
- In-app notifications for budgets, goals, recurring transactions and a weekly summary; each kind can be turned off.

<details>
<summary>More screenshots: reports, calendar, notifications</summary>

<br>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/screenshots/reports-monthly-dark-1440.jpg">
  <img src="docs/screenshots/reports-monthly-1440.jpg" alt="Monthly report: income, expense and net compared with last month, and the spending of each category">
</picture>

![Yearly report: income and expense of the twelve months of the year](docs/screenshots/reports-yearly-1440.jpg)

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/screenshots/reports-calendar-dark-1440.jpg">
  <img src="docs/screenshots/reports-calendar-1440.jpg" alt="Spending calendar: the days of the month with what was spent on each">
</picture>

![Notifications page: the list of notifications, newest first](docs/screenshots/notifications-1440.jpg)

</details>

### Working fast

- Quick add that understands text like `coffee 35k #work` or `salary 15tr yesterday`, and transaction templates.
- Select several rows to move them to another category or delete them, with **Undo** after a delete.
- Command palette (`Ctrl+K`), keyboard shortcuts (`N` new transaction, `/` search, `?` the list of shortcuts) and breadcrumbs.

<details>
<summary>Screenshot: command palette</summary>

<br>

![Command palette opened with Ctrl+K over the Dashboard: a search field and the list of pages and actions](docs/screenshots/command-palette-1440.jpg)

</details>

### Account, devices and admin

- Profile with a ready-made avatar or your own photo (cropped in the browser), password change, log out of all devices,
  theme (light, dark, system), first day of the week, language, data export (JSON) and account deletion.
- Real-time sync between devices and offline reading as an installed app.
- Public landing page at `/welcome` with a one-click demo, SEO tags and share cards.
- Admin page (role `admin`): site statistics, the list of accounts, disabling and enabling an account.

<details>
<summary>More screenshots: settings, admin, other languages</summary>

<br>

![Settings page: the sections Profile, Appearance, Preferences, Notifications, App and Data, and the profile form with the avatar, name and email](docs/screenshots/settings-1440.jpg)

![Admin page: the number of users, active users and transactions, line charts of new users and transactions over the last 30 days, and a link to manage users](docs/screenshots/admin-1440.jpg)

![The Dashboard in German](docs/screenshots/dashboard-de-1440.jpg)

![The Dashboard in Japanese](docs/screenshots/dashboard-ja-1440.jpg)

</details>

### On a phone

<p>
  <img src="docs/screenshots/dashboard-dark-390.jpg" alt="Dashboard on a phone, dark theme" width="180">
  <img src="docs/screenshots/transactions-dark-390.jpg" alt="Transactions on a phone, dark theme" width="180">
  <img src="docs/screenshots/budgets-390.jpg" alt="Budgets on a phone, light theme" width="180">
  <img src="docs/screenshots/reports-calendar-390.jpg" alt="Spending calendar on a phone, light theme" width="180">
</p>

Every page has a 390 px picture in [docs/screenshots](docs/screenshots/README.md), and the main pages are also there in the dark theme.

## Tech stack

| Part | Technology |
|------|------------|
| **Frontend** | ![React](https://img.shields.io/badge/React_19-20232a?logo=react&logoColor=61dafb) ![Vite](https://img.shields.io/badge/Vite_8-646cff?logo=vite&logoColor=white) ![React Router](https://img.shields.io/badge/React_Router_7-ca4245?logo=reactrouter&logoColor=white) ![Axios](https://img.shields.io/badge/Axios-5a29e4?logo=axios&logoColor=white) ![Recharts](https://img.shields.io/badge/Recharts_3-22b5bf) <br> CSS Modules with design tokens, i18next, lucide-react, motion, vite-plugin-pwa |
| **Backend** | ![Node.js](https://img.shields.io/badge/Node.js_24-5fa04e?logo=nodedotjs&logoColor=white) ![Express](https://img.shields.io/badge/Express_5-000000?logo=express&logoColor=white) ![Swagger](https://img.shields.io/badge/Swagger-85ea2d?logo=swagger&logoColor=black) <br> REST API, JWT + bcryptjs, helmet, express-rate-limit, compression, swagger-jsdoc + swagger-ui-express |
| **Database** | ![MongoDB](https://img.shields.io/badge/MongoDB_Atlas-47a248?logo=mongodb&logoColor=white) ![Mongoose](https://img.shields.io/badge/Mongoose_9-880000?logo=mongoose&logoColor=white) |
| **Realtime** | ![Socket.IO](https://img.shields.io/badge/Socket.IO_4-010101?logo=socketdotio&logoColor=white) on the same server as the API |
| **Testing** | ![Vitest](https://img.shields.io/badge/Vitest_5-6e9f18?logo=vitest&logoColor=white) ![Testing Library](https://img.shields.io/badge/Testing_Library-e33332?logo=testinglibrary&logoColor=white) ![Playwright](https://img.shields.io/badge/Playwright-2ead33?logo=playwright&logoColor=white) <br> Supertest, mongodb-memory-server, axe-core, ESLint |
| **CI/CD** | ![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088ff?logo=githubactions&logoColor=white) `ci.yml` on every push and pull request, `live-smoke.yml` after every deploy of `main` |
| **Hosting** | ![Vercel](https://img.shields.io/badge/Vercel-000000?logo=vercel&logoColor=white) app · ![Render](https://img.shields.io/badge/Render-46e3b7?logo=render&logoColor=black) API · ![MongoDB Atlas](https://img.shields.io/badge/Atlas-47a248?logo=mongodb&logoColor=white) database |

## Architecture

```mermaid
flowchart LR
    subgraph Browser
        App["React app (PWA)<br/>pages, context, src/api"]
        SW["Service worker<br/>offline copy of loaded data"]
    end
    Vercel["Vercel<br/>static build, SPA rewrite,<br/>security headers"]
    subgraph Render["Render (Node.js 24)"]
        MW["Express middlewares<br/>helmet, CORS, rate limit,<br/>JSON limit, operator filter"]
        Layers["routes → validation →<br/>controllers → services → models"]
        Socket["Socket.IO<br/>data:changed, notification:new"]
        Docs["Swagger UI /api-docs"]
    end
    Atlas[("MongoDB Atlas")]

    Vercel -->|HTML, JS, CSS| App
    App -->|"HTTPS + Bearer JWT"| MW
    MW --> Layers
    Layers -->|Mongoose| Atlas
    Layers -->|after each write| Socket
    Socket <-->|"WebSocket + JWT"| App
    App -.- SW
```

The server keeps one job per layer: a **route** declares the path, its Swagger comment and its validation middleware, a
**controller** reads the request and writes the answer, a **service** holds the business logic and a **model** is the
Mongoose schema. The client calls the API only through `client/src/api` (one Axios instance that adds the token and
turns errors into codes). The full walk of a request, the real-time flow, offline mode and i18n are explained in
[docs/architecture.md](docs/architecture.md).

### Data model

Ten collections; every document except a user belongs to one user through `userId`. Fields, indexes and the reasons
behind them: [docs/database.md](docs/database.md).

```mermaid
erDiagram
    USER ||--o{ CATEGORY : owns
    USER ||--o{ TRANSACTION : records
    USER ||--o{ WALLET : holds
    USER ||--o{ TRANSFER : makes
    USER ||--o{ BUDGET : sets
    USER ||--o{ RECURRING_RULE : schedules
    USER ||--o{ GOAL : saves
    USER ||--o{ TRANSACTION_TEMPLATE : keeps
    USER ||--o{ NOTIFICATION : receives
    CATEGORY ||--o{ TRANSACTION : classifies
    CATEGORY ||--o{ BUDGET : limits
    CATEGORY ||--o{ RECURRING_RULE : classifies
    CATEGORY ||--o{ TRANSACTION_TEMPLATE : prefills
    WALLET |o--o{ TRANSACTION : keeps
    WALLET ||--o{ TRANSFER : "sends / receives"
    RECURRING_RULE |o--o{ TRANSACTION : creates
    GOAL ||--o{ CONTRIBUTION : "holds (embedded)"

    USER {
        ObjectId _id PK
        string name
        string email UK
        string passwordHash
        string role "user | admin"
        string status "active | disabled"
        number tokenVersion
        object preferences
        object avatar
    }
    CATEGORY {
        ObjectId userId FK
        string name "unique per user and type"
        string type "income | expense"
        string color
        string icon
    }
    TRANSACTION {
        ObjectId userId FK
        ObjectId categoryId FK
        ObjectId walletId FK
        ObjectId recurringRuleId FK
        string type
        number amount "whole VND"
        string currency
        string note
        string_array tags
        date date
    }
    WALLET {
        ObjectId userId FK
        string name
        string type "cash | bank | ewallet"
        string color
        number initialBalance
        boolean archived
        boolean isDefault
    }
    TRANSFER {
        ObjectId userId FK
        ObjectId fromWalletId FK
        ObjectId toWalletId FK
        number amount
        string note
        date date
    }
    BUDGET {
        ObjectId userId FK
        ObjectId categoryId FK
        string month "YYYY-MM"
        number amount
    }
    RECURRING_RULE {
        ObjectId userId FK
        ObjectId categoryId FK
        number amount
        string note
        string frequency "weekly | monthly"
        date startDate
        date nextRunDate
        date endDate
        boolean active
    }
    GOAL {
        ObjectId userId FK
        string name
        number targetAmount
        number savedAmount
        date deadline
        string color
    }
    CONTRIBUTION {
        number amount "+ deposit, - withdrawal"
        string note
        date date
    }
    TRANSACTION_TEMPLATE {
        ObjectId userId FK
        ObjectId categoryId FK
        string name
        number amount
        string note
    }
    NOTIFICATION {
        ObjectId userId FK
        string type
        string title
        string message
        string link
        object params
        boolean read
        string dedupeKey "unique per user"
    }
```

## API overview

Base URL **[https://ledgerling-api.onrender.com/api](https://ledgerling-api.onrender.com/api)** (open it in a browser: it answers with links to the docs and the health check). Every answer is `{ success: true, data }` or
`{ success: false, message, code }`. **JWT** means the header `Authorization: Bearer <token>`; **Admin** means a JWT of
an account with the `admin` role. Try every route in **[Swagger UI](https://ledgerling-api.onrender.com/api-docs)**;
conventions, error codes, pagination and `curl` examples are in [docs/api.md](docs/api.md), and every request and
answer in [docs/api-plan.md](docs/api-plan.md).

<details>
<summary><b>All 71 endpoints</b> (click to open)</summary>

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | – | Front page of the API: links to the docs, the health check and the code |
| GET | `/health` | – | Is the API up, and which commit answers |
| POST | `/auth/register` | – | Create an account and get a token |
| POST | `/auth/login` | – | Log in and get a token |
| POST | `/auth/demo` | – | Sign in to the shared demo account |
| GET | `/auth/me` | JWT | The current user |
| POST | `/auth/logout-all` | JWT | Log out of all devices (not for the demo) |
| GET | `/categories` | JWT | List my categories (`?type=`) |
| POST | `/categories` | JWT | Create a category |
| GET | `/categories/:id` | JWT | One category |
| PATCH | `/categories/:id` | JWT | Change name, color or icon |
| DELETE | `/categories/:id` | JWT | Delete (409 while transactions or rules use it) |
| GET | `/transactions` | JWT | List with search, filters, sort and pages |
| POST | `/transactions` | JWT | Create a transaction (type comes from the category) |
| GET | `/transactions/export` | JWT | Download as CSV (same filters, no pages) |
| POST | `/transactions/import` | JWT | Import CSV rows (up to 500) |
| POST | `/transactions/bulk-delete` | JWT | Delete 1–200 transactions at once |
| PATCH | `/transactions/bulk-category` | JWT | Move 1–200 transactions to another category |
| GET | `/transactions/:id` | JWT | One transaction |
| PATCH | `/transactions/:id` | JWT | Update a transaction |
| DELETE | `/transactions/:id` | JWT | Delete a transaction |
| GET | `/tags` | JWT | My tags with how many transactions carry each |
| GET | `/wallets` | JWT | My wallets with their balances |
| POST | `/wallets` | JWT | Create a wallet |
| GET | `/wallets/:id` | JWT | One wallet with its balance |
| PATCH | `/wallets/:id` | JWT | Update, archive or bring back a wallet |
| DELETE | `/wallets/:id` | JWT | Delete (409 for the default wallet or one with history) |
| GET | `/transfers` | JWT | My transfers, newest first, one page |
| POST | `/transfers` | JWT | Move money between two of my wallets |
| DELETE | `/transfers/:id` | JWT | Delete a transfer (the money goes back) |
| GET | `/stats/summary` | JWT | Dashboard numbers of a month |
| GET | `/budgets` | JWT | Budgets of a month, with what is spent |
| POST | `/budgets` | JWT | Create a budget for an expense category |
| POST | `/budgets/copy` | JWT | Copy budgets from one month to another |
| PATCH | `/budgets/:id` | JWT | Change the amount |
| DELETE | `/budgets/:id` | JWT | Delete a budget |
| GET | `/recurring` | JWT | List my recurring rules |
| POST | `/recurring` | JWT | Create a rule |
| PUT | `/recurring/:id` | JWT | Replace a rule |
| PATCH | `/recurring/:id/toggle` | JWT | Turn a rule on or off |
| DELETE | `/recurring/:id` | JWT | Delete a rule (its transactions stay) |
| GET | `/goals` | JWT | List my savings goals |
| POST | `/goals` | JWT | Create a goal |
| GET | `/goals/:id` | JWT | One goal with its history |
| PUT | `/goals/:id` | JWT | Replace a goal |
| DELETE | `/goals/:id` | JWT | Delete a goal and its history |
| POST | `/goals/:id/contributions` | JWT | Deposit into or withdraw from a goal |
| DELETE | `/goals/:id/contributions/:contributionId` | JWT | Delete a contribution |
| GET | `/reports/monthly` | JWT | One month compared with the month before |
| GET | `/reports/yearly` | JWT | Income and expense of the 12 months |
| GET | `/insights` | JWT | Up to 6 rule-based tips about a month |
| GET | `/templates` | JWT | List my transaction templates |
| POST | `/templates` | JWT | Create a template |
| GET | `/templates/:id` | JWT | One template |
| PATCH | `/templates/:id` | JWT | Update a template |
| DELETE | `/templates/:id` | JWT | Delete a template |
| GET | `/notifications` | JWT | My notifications, newest first |
| GET | `/notifications/unread-count` | JWT | How many are unread |
| PATCH | `/notifications/read-all` | JWT | Mark all as read |
| PATCH | `/notifications/:id/read` | JWT | Mark one as read |
| DELETE | `/notifications/:id` | JWT | Delete a notification |
| PATCH | `/users/me` | JWT | Change my name |
| DELETE | `/users/me` | JWT | Delete my account and all its data (not for the demo) |
| PATCH | `/users/me/password` | JWT | Change my password (not for the demo) |
| PATCH | `/users/me/avatar` | JWT | Choose a ready-made avatar or upload a photo (not for the demo) |
| DELETE | `/users/me/avatar` | JWT | Remove my avatar (not for the demo) |
| PATCH | `/users/me/preferences` | JWT | Theme, first day of the week, language, notifications |
| GET | `/users/me/export` | JWT | Download all my data as JSON |
| GET | `/admin/stats` | Admin | Numbers for the Admin page |
| GET | `/admin/users` | Admin | List the accounts, newest first |
| PATCH | `/admin/users/:id/status` | Admin | Disable or enable an account |

</details>

## Getting started

### Requirements

- **Node.js 24** (the `engines` field of both packages and [.nvmrc](.nvmrc); with nvm: `nvm use`)
- **MongoDB**: a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster or a MongoDB server on your computer
- Git, and a terminal for each side

### Run it locally

```bash
git clone https://github.com/minhtriqn05/ledgerling.git
cd ledgerling

# 1. API on http://localhost:4000 (Swagger on http://localhost:4000/api-docs)
cd server
npm ci
cp .env.example .env      # then fill in MONGODB_URI, JWT_SECRET and DEMO_PASSWORD
npm run seed              # optional: creates the demo account with sample data
npm run dev

# 2. App on http://localhost:5173 (in a second terminal)
cd client
npm ci
cp .env.example .env      # VITE_API_URL=http://localhost:4000/api
npm run dev
```

- `npm run seed` only touches the documents of the demo user (`demo@example.com`), so it is safe to run again; it moves
  the sample dates up to today. Without it, **Try the demo** answers 503 `DEMO_UNAVAILABLE`.
- An admin is made from the terminal only (no route can do it): `npm run make-admin -- you@example.com` in `server/`.

### Environment variables

**server/.env** (copy of [server/.env.example](server/.env.example))

| Name | Required | Example (fake) | What it does |
|------|----------|----------------|--------------|
| `MONGODB_URI` | yes | `mongodb+srv://user:password@cluster0.example.mongodb.net/ledgerling` | The database connection string |
| `JWT_SECRET` | yes | `change-me-to-a-long-random-string` | Signs the tokens |
| `CLIENT_URL` | yes | `http://localhost:5173` | App addresses allowed by CORS and Socket.IO, comma-separated |
| `JWT_EXPIRES_IN` | no | `7d` (default) | How long a token is valid: `12h`, `7d`, `3600` ... |
| `PORT` | no | `4000` | Port of the API (Render sets its own) |
| `NODE_ENV` | no | `production` | On Render; hides database validation details in errors |
| `DEMO_PASSWORD` | for `npm run seed` | `demo-password-123` | Password of the demo account, at least 6 characters |
| `RATE_LIMIT_OFF` | no | `true` | Turns the rate limits off; only for the end-to-end API |
| `RENDER_GIT_COMMIT` | set by Render | – | Shown by `/api/health` as `version` |

The server refuses to start, with a message naming the variable, when `MONGODB_URI`, `JWT_SECRET` or `CLIENT_URL` is
missing or `JWT_EXPIRES_IN` is not a valid duration.

**client/.env** (copy of [client/.env.example](client/.env.example))

| Name | Required | Example (fake) | What it does |
|------|----------|----------------|--------------|
| `VITE_API_URL` | yes | `http://localhost:4000/api` | The API base URL, ending in `/api` |
| `VITE_SITE_URL` | no | `https://ledgerling.example.com` | Public address for the canonical link and share cards; default: the address Vercel gives the build |

### npm scripts

| Folder | Script | What it does |
|--------|--------|--------------|
| server | `npm run dev` | API with nodemon (restarts on save) |
| server | `npm start` | API with Node (Render uses this) |
| server | `npm run seed` | Create or refresh the demo account |
| server | `npm run make-admin -- <email>` | Give an account the admin role |
| server | `npm run start:e2e` | API on port 4100 with an in-memory MongoDB, for Playwright |
| server | `npm test` / `npm run test:coverage` | Vitest + Supertest, with coverage thresholds |
| server | `npm run lint` | ESLint, zero warnings allowed |
| client | `npm run dev` | Vite dev server on port 5173 |
| client | `npm run build` / `npm run preview` | Production build into `dist/`, and serving it |
| client | `npm test` / `npm run test:coverage` | Vitest + React Testing Library, with coverage thresholds |
| client | `npm run test:e2e` | Playwright: Chrome desktop and phone, then `@smoke` on Firefox and WebKit |
| client | `npm run test:e2e:chromium` / `test:e2e:smoke` | One of the two parts above |
| client | `npm run test:e2e:live` | Checks the deployed site with one temporary account |
| client | `npm run lint` / `npm run i18n:check` | ESLint; every key present in all 8 languages |
| client | `npm run screenshots:docs` | Takes the pictures of `docs/screenshots` again |
| client | `npm run og-image` / `generate-pwa-assets` | Share image and PWA icons |

## Testing

| Kind | Tools | Result (3 November 2026) |
|------|-------|--------------------------|
| API tests | Vitest, Supertest, mongodb-memory-server | **672 tests** in 39 files: every route, ownership (404 for another user's ids), validation, Vietnam time, money cross-checks, concurrency, indexes, and the docs against the code |
| API coverage | @vitest/coverage-v8 | **94.8% lines, 90.8% branches** (the run fails below 80%) |
| Client unit tests | Vitest, React Testing Library, jsdom | **847 tests** in 97 files |
| Client coverage | @vitest/coverage-v8 | **68.4% lines**; `src/utils` 94.0%, `src/hooks` 100% (fails below 60% / 80%) |
| End-to-end | Playwright on the production build | **337 passed, 7 skipped** (phone-only or desktop-only) on Chrome desktop + Pixel 7; **52 passed** `@smoke` tests on Firefox + iPhone 14 Safari |
| Accessibility | axe-core in Playwright | **0 serious or critical issues** on every page, in light and dark, plus dialogs, drawer, tour and command palette |
| Live | Playwright against the deployed site | health, Swagger, the app and its headers, the demo, the rate limit and the main flow with one temporary account that is deleted at the end |
| Static | ESLint, `i18n:check` | 0 warnings on both sides; 8 languages × 967 keys |

The end-to-end tests start their own API with an in-memory database, so they never touch Atlas. How each suite is
organised and how to run one file: [docs/testing.md](docs/testing.md).

## Performance

- Every page is its own chunk (`React.lazy`), and the seven non-English languages are loaded only when chosen: the first
  page needs about **268 kB of gzip JavaScript** (down from 370 kB).
- The API compresses its answers (gzip), and every list and check reads through an index
  (`server/tests/indexes.test.js` checks the main queries with `explain()`).
- Lighthouse, first visit, production build: **98** performance on desktop for both `/welcome` and the Dashboard; on a
  throttled phone **77** (`/welcome`) and **67** (Dashboard), because the pages are drawn by JavaScript. Accessibility,
  Best Practices and SEO are **100** everywhere.

## Accessibility

- axe-core runs on every page in both themes in the end-to-end suite: no serious or critical issue is allowed.
- Every text color passes WCAG AA contrast (4.5:1) on the surface it sits on; color is never the only signal (amounts
  carry `+` / `−`, statuses have icons).
- Full keyboard use: skip link, visible focus, focus returns to the button that opened a dialog, shortcuts.
- All motion follows `prefers-reduced-motion`.

## Security

- Passwords hashed with bcrypt; a login takes the same time whether the email exists or not.
- JWT with an expiry and a token version: a new password, "log out of all devices" or a disabled account makes every
  older token invalid and closes its real-time connections.
- Every route validates its input and drops unknown fields; MongoDB operators in a body or query are refused; body sizes
  are limited (100 kB, 300 kB for an import, 200 kB for a photo).
- Every query is scoped to the signed-in user: another user's id answers 404, so ids reveal nothing.
- helmet headers, a CORS allow-list, rate limits per visitor (300 requests / 15 min on the API, 20 / 15 min on login,
  register and demo), and no stack trace in an error answer.
- CSV exports are protected against formula injection; uploaded photos are checked by their real file type.
- Report a problem privately: [SECURITY.md](SECURITY.md).

## Internationalization

- 8 languages: English (default and source), Tiếng Việt, Français, Deutsch, Español, 简体中文, 日本語, 한국어.
- i18next with language detection; the choice is kept in `localStorage` and in the user's preferences, and `<html lang>`
  follows it. Chinese, Japanese and Korean switch to a system font of that script.
- Dates and numbers go through `Intl` (`client/src/utils/format.js`); amounts stay in VND.
- The API answers in English with a stable `code`, and the app shows its own translation of that code.
- `npm run i18n:check` fails when a key is missing in any language; a server test checks that every API error code has a
  translation.

## Deployment

| Part | Host | Settings |
|------|------|----------|
| API | [Render](https://render.com) web service | root `server`, build `npm ci`, start `npm start`, Node 24 from `engines`, env vars from the table above |
| App | [Vercel](https://vercel.com) | root `client`, framework Vite, build `npm run build`, output `dist`, `VITE_API_URL` |
| Database | [MongoDB Atlas](https://www.mongodb.com/atlas) | free M0 cluster, a database user for the API, network access for Render |

A push to `main` deploys both sides. Step by step, including how to redeploy and roll back:
[docs/deployment.md](docs/deployment.md).

## CI/CD

| Workflow | When | What it does |
|----------|------|--------------|
| [ci.yml](.github/workflows/ci.yml) | every push and pull request | server lint + tests with coverage; client lint, i18n check, tests with coverage and build; Playwright on Chrome (every test) and on Firefox + WebKit (`@smoke`) in parallel jobs |
| [live-smoke.yml](.github/workflows/live-smoke.yml) | after every push to `main`, or by hand | waits until Render serves the new commit (`/api/health` shows it), checks that Vercel answers, then runs `npm run test:e2e:live` |

No secrets are needed: the tests use an in-memory MongoDB and the live test makes its own temporary account.

## Project structure

```text
ledgerling/
├── .github/            CI and live-smoke workflows, issue forms, pull request template
├── client/             React app (Vite)
│   ├── e2e/            Playwright tests (e2e/live/ checks the deployed site)
│   ├── public/         icons, share image, robots.txt
│   ├── scripts/        i18n check, site address, share image
│   └── src/
│       ├── api/        every call to the API (one Axios instance)
│       ├── components/ shared UI: Button, Modal, Drawer, Select, DatePicker, Tour ...
│       ├── config/     navigation, breadcrumbs, settings sections
│       ├── context/    auth, theme, toasts, notifications, real-time socket
│       ├── hooks/      reusable React hooks
│       ├── i18n/       i18next set-up
│       ├── locales/    en.json (source) + 7 translations
│       ├── pages/      one file or folder per page
│       ├── styles/     tokens.css: every color, font and spacing
│       └── utils/      formatting, Vietnam dates, CSV, quick add parser ...
├── server/             Express API
│   ├── src/
│   │   ├── config/     environment check, database, CORS origins, Swagger
│   │   ├── routes/     routers with their Swagger comments
│   │   ├── middlewares/ auth, roles, validation, rate limits, errors
│   │   ├── controllers/ request in, answer out
│   │   ├── services/   business logic, real-time events
│   │   ├── models/     Mongoose schemas
│   │   ├── utils/      shared helpers
│   │   └── scripts/    make-admin
│   └── tests/          Vitest + Supertest
└── docs/               architecture, database, API, testing, deployment, screenshots, assets
```

## Roadmap

- Prerender the landing page so the phone Lighthouse score goes above 90.
- More currencies with exchange rates (today every amount is VND).
- Rate limits shared between server instances (they live in memory now).
- Deleting a category and creating a transaction for it at the same moment on two devices can leave one orphan
  transaction; a MongoDB transaction across the two collections would close that gap.
- Email features: password reset and a weekly summary by email.

## Course

| | |
|---|---|
| **Course** | Phát triển ứng dụng web và cơ sở dữ liệu (Web application and database development) |
| **Class** | CSBU109.R11.KHBC |
| **University** | University of Information Technology (UIT), Vietnam National University Ho Chi Minh City (VNU-HCM) |
| **Student** | Nguyễn Minh Trí (23560042) |
| **Lecturer** | Nguyễn Thanh Bình |
| **Type** | Individual project: the backend, the frontend, the database and the deployment are my own work |

## Author

**Nguyễn Minh Trí**

- GitHub: [@minhtriqn05](https://github.com/minhtriqn05)
- LinkedIn: [nguyenminhtri-uit](https://www.linkedin.com/in/nguyenminhtri-uit)

Questions and ideas are welcome in [Issues](https://github.com/minhtriqn05/ledgerling/issues); see
[CONTRIBUTING.md](CONTRIBUTING.md) first.

## Acknowledgements

- [React](https://react.dev), [Vite](https://vite.dev), [React Router](https://reactrouter.com),
  [Axios](https://axios-http.com), [Recharts](https://recharts.org), [i18next](https://www.i18next.com),
  [motion](https://motion.dev), [vite-plugin-pwa](https://vite-pwa-org.netlify.app) and
  [PapaParse](https://www.papaparse.com) on the client.
- [Express](https://expressjs.com), [Mongoose](https://mongoosejs.com), [Socket.IO](https://socket.io),
  [swagger-jsdoc](https://github.com/Surnet/swagger-jsdoc), [helmet](https://helmetjs.github.io) and
  [bcrypt.js](https://github.com/dcodeIO/bcrypt.js) on the server.
- [Vitest](https://vitest.dev), [Testing Library](https://testing-library.com), [Playwright](https://playwright.dev),
  [axe-core](https://github.com/dequelabs/axe-core) and
  [mongodb-memory-server](https://github.com/typegoose/mongodb-memory-server) for the tests.
- [React Bits](https://reactbits.dev), [GSAP](https://gsap.com) and [Lenis](https://lenis.darkroom.engineering): their
  demos were the inspiration for the motion of the landing page. The app itself animates with `motion` and CSS; none of
  these three is bundled.
- Icons: [Lucide](https://lucide.dev) (ISC license). Fonts: [Manrope](https://fonts.google.com/specimen/Manrope) and
  [Newsreader](https://fonts.google.com/specimen/Newsreader) from Google Fonts (SIL Open Font License).
- Badges by [Shields.io](https://shields.io). The logo is drawn by hand as SVG for this project
  ([docs/brand](docs/brand/README.md)).

## License

[MIT](LICENSE) © 2026 Nguyễn Minh Trí

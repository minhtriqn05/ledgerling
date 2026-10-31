# Ledgerling

A personal expense tracker: income and expenses, budgets, recurring transactions, savings goals, reports, tags, notifications, real-time sync, an admin page and a PWA that works offline.

**Course project** of the course *Phát triển ứng dụng web và cơ sở dữ liệu* (Web application and database development),
class **CSBU109.R11.KHBC**, UIT (University of Information Technology, VNU-HCM). Solo project: backend and frontend by one student.

## Stack

- Frontend: React (Vite), React Router, Axios, Recharts, CSS Modules, i18next (8 languages), PWA. Deployed on Vercel.
- Backend: Node.js + Express (REST), MongoDB Atlas + Mongoose, JWT + bcryptjs, Socket.IO. Deployed on Render.
- API docs: Swagger UI at `/api-docs`. The full endpoint list is in [docs/api-plan.md](docs/api-plan.md), the data model in [docs/erd.md](docs/erd.md).

## Run it on your computer

```
cd server && npm install && npm run dev      # API on http://localhost:4000
cd client && npm install && npm run dev      # app on http://localhost:5173
```

Copy `server/.env.example` to `server/.env` and `client/.env.example` to `client/.env`, then fill in the values
(`MONGODB_URI`, `JWT_SECRET`, ...). Never commit `.env`.

## "Try the demo" needs a one-time seed

The "Try the demo" button on the landing page signs in to the shared account `demo@example.com`. That account is **not** made by the API:
it is made by the seed script, once per database. Until then the button shows "The demo is not available right now" (the API answers 503 `DEMO_UNAVAILABLE`).

1. In `server/.env` set `DEMO_PASSWORD` (at least 6 characters) and `MONGODB_URI` (the database of the server you want to fill: for the live site, the Atlas database that Render uses).
2. Run `cd server && npm run seed`.
3. Run it again whenever you want the sample dates to move up to today. It only deletes and rebuilds the documents of the demo user.

On Render nothing else is needed: `DEMO_PASSWORD` is only used by the seed script, which you run from your own computer.
Check: `curl -X POST <api>/api/auth/demo` must answer `200` with a token.

## Tests

```
cd server && npm test
cd client && npm test && npm run build && npm run test:e2e && npm run i18n:check
```

End-to-end tests start their own API with an in-memory database; they never touch Atlas.

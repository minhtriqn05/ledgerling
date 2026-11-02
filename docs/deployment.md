# Deployment

| Part | Host | Address |
|------|------|---------|
| App (React build) | Vercel | https://ledgerling-ten.vercel.app |
| API + Socket.IO | Render (free web service) | `https://ledgerling-api.onrender.com/api` ([health](https://ledgerling-api.onrender.com/api/health)) |
| Database | MongoDB Atlas (free M0 cluster) | private connection string in Render's environment |

A push (or a merged pull request) to `main` deploys both sides by itself; the
[live smoke workflow](../.github/workflows/live-smoke.yml) then checks the live site.

## 1. MongoDB Atlas

1. Create a free **M0** cluster.
2. **Database Access** → add a database user with a long generated password and the role *Read and write to any
   database* (or only the `ledgerling` database).
3. **Network Access** → allow the addresses Render uses. On the free plan Render has no fixed outgoing address, so the
   simple choice is `0.0.0.0/0`; the database user and its password are then the protection, so keep them secret.
4. **Connect → Drivers** gives the connection string. Add the database name before the `?`:
   `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/ledgerling?retryWrites=true&w=majority`.

Mongoose creates the collections and the indexes the first time the API connects.

## 2. Render (API)

Create a **Web Service** from the GitHub repository:

| Setting | Value |
|---------|-------|
| Root directory | `server` |
| Runtime | Node (version 24 is taken from `engines` in `server/package.json`) |
| Build command | `npm ci` |
| Start command | `npm start` |
| Health check path | `/api/health` |
| Auto-deploy | on, from `main` |

Environment variables (**Environment** tab):

| Name | Value |
|------|-------|
| `MONGODB_URI` | the Atlas connection string |
| `JWT_SECRET` | a long random string, e.g. from `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `CLIENT_URL` | `https://ledgerling-ten.vercel.app` (add more addresses separated by commas, e.g. a preview domain) |
| `JWT_EXPIRES_IN` | `7d` (optional) |
| `NODE_ENV` | `production` |

`PORT` and `RENDER_GIT_COMMIT` are set by Render. The server stops at start-up with a clear message when a required
variable is missing, so a wrong setting shows in the deploy log instead of as errors later.

The free plan sleeps after 15 minutes without requests; the next request wakes it in about 30–60 seconds. The app shows
a "waking up" message while it waits, and the health check is never rate-limited.

## 3. Vercel (app)

Import the repository as a new project:

| Setting | Value |
|---------|-------|
| Root directory | `client` |
| Framework preset | Vite |
| Build command | `npm run build` |
| Output directory | `dist` |
| Node.js version | 24.x (from `engines`) |

Environment variables:

| Name | Value |
|------|-------|
| `VITE_API_URL` | `https://ledgerling-api.onrender.com/api` |
| `VITE_SITE_URL` | optional, only for a custom domain (the canonical link and share cards use it) |

`client/vercel.json` rewrites every path to `index.html` (so a refresh on `/transactions` works) and adds security
headers. A `VITE_*` variable is read at build time: after changing it, redeploy.

## 4. The demo account and an admin

Both are made from your own computer against the production database, never by the API:

```bash
cd server
# server/.env holds the production MONGODB_URI and a DEMO_PASSWORD for this run
npm run seed                               # creates or refreshes demo@example.com
npm run make-admin -- you@example.com      # the account must exist already
```

Running the seed again moves the sample dates up to today and only rebuilds the demo user's documents. Check it with
`curl -X POST https://ledgerling-api.onrender.com/api/auth/demo` (200 with a token).

## 5. Redeploy and roll back

| Need | How |
|------|-----|
| Deploy a change | merge into `main`; Render and Vercel build it by themselves |
| Redeploy without a change | Render: **Manual Deploy → Deploy latest commit**. Vercel: **Deployments → … → Redeploy** |
| After changing an environment variable | Render restarts by itself; Vercel needs a redeploy |
| Roll back | Render: **Events → an older deploy → Rollback**. Vercel: **Deployments → an older one → Promote to Production** |
| See which commit is live | `curl https://ledgerling-api.onrender.com/api/health` shows `data.version` |

## 6. After a deploy

The live smoke workflow does this automatically; by hand it is:

```bash
curl -s https://ledgerling-api.onrender.com/api/health          # 200, version = the new commit
curl -s -o /dev/null -w "%{http_code}\n" https://ledgerling-ten.vercel.app/   # 200
cd client && npm run test:e2e:live                                # the full live check
```

`test:e2e:live` makes one temporary account through the public API and deletes it at the end.

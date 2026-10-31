# Plan: Multi-device, real-time sync and offline use (phase 22)

Branch: `feature/multi-device`.

Done when: a transaction added on one device appears on the other within seconds, the loaded data can still be viewed without a network, and the app can be installed with an "Add transaction" shortcut.

## Decisions
### Server
- `services/realtimeService.js` owns the Socket.IO server: `attachSocket(httpServer)`, `emitDataChanged(userId, resource, { except })`, `emitNotification(userId, notification)`, `disconnectUser(userId)`. Without an attached server (Supertest, seed) these do nothing.
- The handshake uses the same check as `requireAuth` (`authenticateToken` in `middlewares/requireAuth.js`: signature, tokenVersion, status). Refused with the error code as the message: `TOKEN_MISSING`, `TOKEN_INVALID`. Each user joins the room `user:<id>`.
- `data:changed { resource }` comes from one middleware `liveChanges(resource)` on the mounted routers in `routes/index.js`: any non-GET that ended below 400. It cannot be forgotten on a new route. `resource`: `transactions`, `categories`, `budgets`, `recurring`, `goals`, `templates`, `notifications`.
- The events carry only the resource name (and only the id and type of a new notification), so no data travels in them. A client refetches through the normal, protected API.
- The device that made the change sends its socket id in `X-Socket-Id` and is skipped: it already updated itself.
- Changes not caused by a write request: `processDueRules` (runs inside GET requests) emits `transactions` and `recurring` when it created something; `notify` emits `notification:new` and `notifications`.
- `disconnectUser` runs in the controllers after the answer was sent: logout-all, password change, account disabled, account deleted.

### Client
- `SocketProvider` (in `AppLayout`, so only for a signed-in user) connects with the token, and a new token means a new socket. After the server disconnected it, it tries again after 1 second: a device with a stale token gets `TOKEN_INVALID` and is logged out at once; the device that asked already has a new token.
- `useLiveRefresh(resources, refetch)`: debounced (300 ms); also runs after a reconnect because events were missed. Does nothing without a provider. Pages listen to what their data depends on (a category delete also removes budgets, so Budgets listens to `categories`).
- Refetches are silent: no loading state, so an open dialog or form is never lost. `useLoad` gets `refresh()` next to `reload()`.
- Bell: `notification:new` adds 1 at once; `data:changed notifications` asks for the true count; polling stays.
- Status dot in the navigation bar: Live or Reconnecting.

### Offline
- `runtimeCaching`: `NetworkFirst` for GET `/api/*`, `networkTimeoutSeconds: 5`, cache `ledgerling-api`, only status 200, 200 entries, 7 days. Exports are left out.
- `utils/apiCache.js`: deleted on logout and when another account signs in (last user id in localStorage).
- `AuthContext` logs out only on a 401 from `/auth/me`, no longer on a network error.
- `hooks/useOnline.js`, `OfflineBanner` in `AppLayout`, `needsNetwork` prop on `Button` and `IconButton` (disabled, with the note as tooltip), plain buttons use `useOfflineLock()`.
- Manifest: shortcut "Add transaction" -> `/?quickAdd=1`, `AppLayout` opens Quick add. Maskable icon already exists.
- `utils/installPrompt.js` catches `beforeinstallprompt` from the first moment; `InstallSection` in Settings: install button, or Add to Home Screen instructions.
- E2E on the build: a third web server, `vite preview` on port 5175 from `dist-e2e` (VITE_API_URL = port 4100).

## Checklist
### Server
- [x] Install socket.io (server), socket.io-client (server dev, client)
- [x] `authenticateToken`, `config/origins.js`, `realtimeService.js`, attach in `server.js` and `e2e.js`
- [x] `middlewares/liveChanges.js` on the routers; `processDueRules` and `notify` emit
- [x] Disconnect on logout-all, password change, disable, delete
- [x] `docs/api-plan.md`, Swagger description
- [x] `tests/realtime.test.js`
### Client
- [x] `SocketContext`, `useLiveRefresh`, `X-Socket-Id`, `LiveStatus`
- [x] Live refresh on Dashboard, Transactions, Budgets, Goals, Reports, Recurring, Categories, Notifications; `useLoad.refresh`
- [x] Bell on `notification:new`
- [x] Workbox runtime caching, `apiCache`, AuthContext
- [x] `useOnline`, `OfflineBanner`, lock add/edit/delete buttons
- [x] Manifest shortcut, `?quickAdd=1`, install section
- [x] Locale keys in all 8 files
### Tests and checks
- [x] Vitest: useLiveRefresh, SocketContext, useOnline, Button lock, bell, install prompt, apiCache, useLoad.refresh
- [x] Playwright: two browsers sync; offline on the build; manifest
- [x] `cd server && npm test`
- [x] `cd client && npm test`, `npm run build`, `npm run test:e2e`, `npm run i18n:check`
- [x] Stop servers, final report in Vietnamese

## Notes
- Live URLs in CLAUDE.md are still placeholders, so the check in step 2 of the workflow could not be done.

# Phase 23: Bonus – wallets and transfers

Branch: `feature/bonus`. Tick the boxes as the work goes, so the phase can be resumed in a new chat.
The frontend was built together with the Noir redesign (`docs/plans/premium-redesign.md`), which came in during this phase.

## Decisions
- Two new collections: `Wallet` and `Transfer`. A transfer is not a transaction, so stats, budgets, reports and insights
  never see it (they only read `Transaction`).
- Balance = initialBalance + income − expense + transfers in − transfers out, VND transactions only.
- Each user has one default wallet (`isDefault: true`, named Cash). It is created the first time it is needed, so older
  accounts get it too. A partial unique index keeps it to one per user.
- A transaction without `walletId` (saved before wallets) counts in the default wallet through `$ifNull`, and the wallet
  filter matches it with `$in: [id, null]`. No migration: old documents are not changed.
- Every new transaction is stored with a `walletId`. When a request leaves it out, the service uses the default wallet
  instead of answering 400: the rule "every new transaction has a wallet" holds and every older client and test keeps working.
- CSV import and recurring rules put their transactions in the default wallet.
- The default wallet cannot be deleted or archived (409). A wallet with transactions or transfers cannot be deleted (409): archive it.
- An archived wallet takes no new transactions or transfers (409), keeps its balance and still counts in the total.
- A transfer may take a wallet below 0, like an expense can.

## Checklist

### Backend
- [x] `models/Wallet.js`, `models/Transfer.js`, `walletId` + index on `Transaction`
- [x] `services/walletService.js`, `services/transferService.js`
- [x] Controllers, `validateWallet.js`, `routes/walletRoutes.js`, `routes/transferRoutes.js` with Swagger, live changes
- [x] Transactions: `walletId` on create and update, `?walletId=` on list and export, `wallet` in the answer
- [x] Recurring runs, CSV import and the demo seed set a wallet
- [x] Delete account and data export include wallets and transfers
- [x] `tests/wallets.test.js`, `tests/transfers.test.js`
- [x] `docs/api-plan.md`, `docs/erd.md`, Postman folder "Wallets"

### Frontend
- [x] `api/wallets.js`, `utils/wallets.js` + tests
- [x] Wallets page: total, a card per wallet, new / edit / archive / delete, transfer dialog, transfer history
- [x] `navItems`, route, icons
- [x] Wallet picker in the transaction form and Quick add
- [x] Wallet filter on Transactions, wallet in the details drawer
- [x] Total of all wallets on the Dashboard
- [x] Every text in 8 locale files, new error codes too
- [x] Unit tests, `e2e/wallets.spec.js`
- [x] `docs/ui-style.md`

### Checks
- [x] server `npm test`
- [x] client `npm test`, `npm run build`, `npm run test:e2e`, `npm run i18n:check`

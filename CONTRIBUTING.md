# Contributing

Ledgerling is my individual course project (CSBU109.R11.KHBC, UIT), so the code is written and reviewed by one person.
Bug reports and ideas are very welcome as issues. Pull requests from others are read, but they may wait until the course
has ended before they are merged.

By taking part you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).

## Report a bug or suggest a feature

Open an issue with the **Bug report** or **Feature request** form. A security problem never goes into a public issue:
follow [SECURITY.md](SECURITY.md) instead.

## Run the project locally

Follow [Getting started](README.md#getting-started) in the README. In short:

```bash
nvm use                          # Node 24, from .nvmrc
cd server && npm ci && cp .env.example .env && npm run dev
cd client && npm ci && cp .env.example .env && npm run dev
```

Each side has its own `.env.example`. Copy it to `.env`, fill it in, and never commit the `.env` file.

## Branches

- Start from an up-to-date `main` and use one branch per change:
  `feature/<name>` for a feature, `fix/<name>` for a bug fix, `docs/<name>` or `chore/<name>` for the rest.
- Keep a branch small enough to review in one sitting. `main` is never force-pushed.

## Commit messages

[Conventional Commits](https://www.conventionalcommits.org/): `type: short summary in the imperative`, in English.

| Type | For |
|------|-----|
| `feat:` | a new feature |
| `fix:` | a bug fix |
| `docs:` | documentation only |
| `test:` | tests only |
| `refactor:` | code that changes structure, not behaviour |
| `chore:` | tooling, config, dependencies |

Example: `fix: keep the month filter when a transaction is deleted`.

## What a change includes

- An API change comes with its Swagger comment, `docs/api-plan.md` (and `docs/erd.md` when a model changes) and tests:
  success, 400, 401, 404 for another user's data and 409 where it applies.
- Every interface text goes through `t()`, with its key in `client/src/locales/en.json` and a translation in the 7 other
  language files. New API error codes get a translation too.
- Colors, fonts and spacing come from `client/src/styles/tokens.css`, following [docs/ui-style.md](docs/ui-style.md).
- No new library without asking first in an issue.

## Checks before opening a pull request

Run the same commands as CI; every one must pass:

```bash
cd server
npm run lint
npm run test:coverage

cd ../client
npm run lint
npm run i18n:check
npm run test:coverage
npm run build
npm run test:e2e
```

The end-to-end tests start their own API with an in-memory database; install the browsers once with
`npx playwright install chromium firefox webkit`. A test is never deleted or weakened to make a run pass.

Then open the pull request and fill in the template, with screenshots when the interface changes.

# Contributing

Ledgerling is a solo course project (CSBU109.R11.KHBC, UIT): the code is written and reviewed by one student.
Bug reports and ideas are welcome as issues; pull requests from others are read, but may not be merged before the
course ends.

## Report a bug or ask for a feature

Open an issue with the **Bug report** or **Feature request** form. A security problem never goes into a public issue:
see [SECURITY.md](SECURITY.md).

## Set up the project

Follow [Run it on your computer](README.md#run-it-on-your-computer) in the README. Node 24 is needed on both sides.
Each side has its own `.env.example`; copy it to `.env` and never commit the `.env` file.

## How the work is done

- One branch per change, from an up-to-date `main`: `feature/<name>` for a feature, `fix/<name>` for a fix.
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`,
  `test:`, `chore:` ...
- A change of the API comes with its Swagger comment, `docs/api-plan.md` (and `docs/erd.md` when a model changes) and
  tests: success, 400, 401, 404 for another user's data, 409 where it applies.
- Every text of the interface goes through `t()`, with its key in `client/src/locales/en.json` and a translation in
  the 7 other language files.
- Colors, fonts and spacing come from `client/src/styles/tokens.css`, following [docs/ui-style.md](docs/ui-style.md).
- No new library without asking first.

## Checks before a pull request

The same commands run on GitHub Actions for every push and pull request:

```bash
cd server && npm run lint && npm run test:coverage
cd client && npm run lint && npm run i18n:check && npm run test:coverage && npm run build && npm run test:e2e
```

The end-to-end tests start their own API with an in-memory database; install the browsers once with
`npx playwright install chromium firefox webkit`. A test is never deleted or weakened to make a run green.

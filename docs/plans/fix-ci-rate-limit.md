# Plan: CI fixes, the real visitor address on Render, and a complete GitHub repository (after phase 24)

Branch `fix/ci-and-rate-limit`, created by the owner from an up-to-date `main`. Tick each box as soon as it is done, so
the work can be resumed from the first unticked box.

## How to resume

Read this plan, `docs/review/findings.md`, `git status` and `git diff`; check any half-done step again before ticking
it, then go on in order, following the rules below and the project brief. At the end, report in Vietnamese and write
every git command (commit, push, PR, merge) for the owner to run.

## Rules

- **Git**: only `status`, `diff`, `log`, `grep`, `check-ignore`. The owner creates branches, commits, pushes, opens and
  merges pull requests; write the exact commands for them.
- **GitHub CLI** (`gh`, logged in as the owner; in Git Bash call `"/c/Program Files/GitHub CLI/gh.exe"`): read-only
  commands are fine (`run list`, `run view`, `run download`, `pr view`, `api` GET). Anything that changes GitHub
  (release, `repo edit`, rulesets, deleting a branch, re-running a job) only after the owner says yes.
- **No tool attribution anywhere on GitHub**: no `Co-Authored-By` line and no "Generated with ..." in commit messages,
  PR descriptions, release notes, code comments or docs; the only contributor is the owner.
- **Atlas is never written.** Local runs use the in-memory e2e database. On the live site, read-only requests are fine
  (`npm run test:e2e:live -- --grep "rate limit|CF-Connecting-IP"` only sends GET requests). The full
  `npm run test:e2e:live` makes and deletes one temporary account: only with the owner's OK.
- A behaviour bug gets a failing test first; no test is deleted, skipped or weakened; no timeout is raised to hide a
  problem. A test that encodes an assumption the measurements disproved may be changed; the finding says why.
- No new required env variable, no library outside the project brief.

## What was measured (2 November 2026)

- **Live API, 15 requests from one computer, one connection each**: `ratelimit-remaining` 295, 294, 293, 292, 291,
  **299**, 298, **299**, **299**, 290, 289, **298**, 288, 287, 298 while `https://ledgerling-api.onrender.com/cdn-cgi/trace`
  showed the same `ip=` every time: with `trust proxy` 2 the key is still a proxy address.
- A request that sends its own `CF-Connecting-IP` gets **403 `error code: 1000`** from Cloudflare; forged
  `X-Forwarded-For`, `X-Real-IP` and `True-Client-IP` pass (200). So `CF-Connecting-IP` cannot be forged.
- **CI run 41457585803** (`main`): `[webkit] e2e/admin.spec.js` ran out of its 30 s (every click waited 1.5–7.4 s for
  the page to hold still, 19.6 s in all); `[desktop] e2e/ux-polish.spec.js` "Skip closes it" clicked Back where the
  card of step 1 had been (trace: click at 1028, 662).
- Linux reproduction: `mcr.microsoft.com/playwright:v1.64.1-noble` (Docker), limited to 1.5 processors: the admin test
  waited 10.4 s in all at the iPhone's 3 device pixels, 3.0 s at 1 (36 s → 19 s).

## Checklist

### A. Fixes, checked locally

- [x] 0. State: the owner was still on `feature/final-review` (already merged as PR #33, same tree as `main`); the work
      is done in the working tree and the owner moves it to `fix/ci-and-rate-limit` (commands in the report)
- [x] 1. Real visitor address (F-040, F-001 corrected)
  - [x] Failing tests first in `server/tests/security.test.js` (CF-Connecting-IP shared counter; fallback three hops
        back, spoofed chain and a value that is not an address); both red before the fix
  - [x] `server/src/middlewares/rateLimit.js`: `keyGenerator` = `CF-Connecting-IP` when it is an IP address, else
        `req.ip`, through `ipKeyGenerator`; no validation warning from express-rate-limit
  - [x] `server/src/app.js`: `trust proxy` 3 with the measured reason
  - [x] `client/e2e/live/site.live.js`: new check "a visitor cannot send CF-Connecting-IP himself" (green on the live
        site already)
  - [x] Docs: F-001 corrected, F-040, `docs/api-plan.md` (Limits)
- [x] 2. WebKit admin test on the CI (F-041): `deviceScaleFactor: 1` for the WebKit project; 52 / 52 `@smoke` on Linux
      (Docker, 3 processors)
- [x] 3. Tour (F-042): failing unit test `src/components/Tour/Tour.test.jsx`, then the card is placed in a layout effect
- [x] 4. Workflows (F-043): `checkout@v5`, `setup-node@v5`, `upload-artifact@v6`, `runs-on: ubuntu-24.04`
- [x] 5. Checks: server lint, `npm run test:coverage`; client lint, `i18n:check`, `test:coverage`, build,
      `npm run test:e2e`; the tour test 10 times on Linux
- [x] 6. Docs: `docs/review/findings.md`, `docs/review/final-review.md`, README numbers, this plan

### B. A complete GitHub repository

- [x] No mention of the coding tool in any tracked file (`git grep -i` finds nothing); its local rules file is ignored
      through `.git/info/exclude` instead of `.gitignore`
- [x] `LICENSE` (MIT), `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, issue forms
      (`.github/ISSUE_TEMPLATE/`), `.github/pull_request_template.md`, README section and license badge, `license`
      of `server/package.json`
- [x] Report to the owner, with the commands: commit, push, open the PR (not merged yet)

### C. CI on GitHub (after the owner pushes)

- [ ] 7. `gh run list --repo minhtriqn05/ledgerling --branch fix/ci-and-rate-limit`, then `gh run view <id> --log-failed`
      for a failure; fix, give the owner the commit + push commands, repeat until the 4 jobs are green
- [ ] 8. The owner merges only with CI green

### D. After the merge

- [ ] 9. The "Live smoke" run of the merge commit is green (`gh run list --repo minhtriqn05/ledgerling --workflow live-smoke.yml`).
      If the rate-limit check still fails, Render does not pass `CF-Connecting-IP` and `trust proxy` 3 is not the
      visitor either: measure with `npm run test:e2e:live -- --grep "rate limit"` and choose again on a new branch
- [ ] 10. GitHub settings (show each command to the owner and wait for yes):
  - [ ] Ruleset for `main`: pull request + the 4 CI checks required
  - [ ] Release `v1.0.0` from the draft below (numbers from README)
  - [ ] Merged branches: list them, ask the owner which ones to delete, delete only those
  - [ ] By hand: Settings → General → Social preview → upload `client/public/og-image.png`
  - Already done before this plan: topic `i18n`, "Automatically delete head branches", private vulnerability reporting

## Release notes draft (v1.0.0)

Numbers to check against README first.

```markdown
First complete version of **Ledgerling**, a personal expense tracker built for the course
*Phát triển ứng dụng web và cơ sở dữ liệu* (CSBU109.R11.KHBC, UIT).

**Live app:** https://ledgerling-ten.vercel.app · **API docs:** https://ledgerling-api.onrender.com/api-docs

### Features
- Transactions with categories, wallets, tags, search, filters, CSV import/export, bulk actions and undo
- Budgets with 80% / 100% warnings, recurring transactions, savings goals
- Dashboard, monthly / yearly / calendar reports and rule-based insights
- In-app notifications, real-time sync between devices (Socket.IO), installable PWA with offline viewing
- 8 languages, light / dark theme, admin dashboard, one-click demo account

### Quality
- 665 API tests and 847 client tests (coverage 94.8% server, 68.4% client)
- End-to-end tests on Chrome (desktop + phone), main flows also on Firefox and iPhone Safari
- Accessibility checked with axe on every page, ESLint with zero warnings
- CI on every push, live smoke test after every deploy

See the [README](https://github.com/minhtriqn05/ledgerling#readme) for screenshots, setup and architecture.
```

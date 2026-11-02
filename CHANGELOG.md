# Changelog

All notable changes to Ledgerling are written down here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `GET /api`: a public front page of the API with links to Swagger UI, the health check, the app and the code, so
  the base URL no longer answers 404. The bare server address now opens Swagger UI.

### Fixed

- Swagger UI stayed blank: a `$` followed by a backtick in the API description was read as a replacement pattern
  when the docs script was built, which broke it. The text is reworded and a test now compiles the script.

## [1.0.0] - 2026-11-03

The first complete version, submitted as the final project of *Phát triển ứng dụng web và cơ sở dữ liệu*
(CSBU109.R11.KHBC, UIT). Built between 27 October and 3 November 2026.

### Added

**Accounts and security**
- Register, log in and log out with JWT (Bearer token) and bcrypt password hashes.
- Profile: name, a ready-made avatar or an own photo cropped in the browser, password change.
- "Log out of all devices" through a token version stored in every JWT; a new password does the same.
- Settings for theme (light, dark, system), first day of the week, language and each kind of notification.
- Data export as JSON and account deletion that removes every document of the user.
- Admin page with role-based access: site statistics, the account list, disabling and enabling an account
  (`npm run make-admin` is the only way to create an admin).
- helmet headers, a CORS allow-list, rate limits per visitor, body size limits, refusal of MongoDB operators, strict
  validation on every route, 404 for another user's data, formula-safe CSV export.

**Money**
- Categories (income or expense) with a color and an icon; default categories for a new account.
- Transactions with category, wallet, note, up to 5 tags and a date; months follow Vietnam time (UTC+7).
- Search, filters (month, date range, type, category, wallet, tag), sort and pagination, kept in the URL.
- CSV export and import (up to 500 rows, with a list of the rows that could not be saved).
- Wallets (cash, bank, e-wallet) with computed balances, transfers between wallets and archiving.
- Quick add that reads text like `coffee 35k #work`, transaction templates, bulk move and bulk delete, undo after delete.

**Planning and reports**
- Monthly budgets per expense category with warnings at 80% and 100%, and copying last month's budgets.
- Recurring weekly or monthly rules that create real transactions when due, never twice for the same day.
- Savings goals with deposits, withdrawals and a history.
- Dashboard with the month in numbers, charts, budget alerts, goals and rule-based insights.
- Monthly report compared with the previous month, yearly report and a spending calendar; printable.
- In-app notifications (budgets, goals, recurring transactions, weekly summary) with a bell and a notifications page.

**Interface**
- "Noir" dark design with a "Porcelain" light theme, all values as design tokens; hand-made controls (select, date
  picker, checkbox, file input, toasts, icon picker).
- 8 languages: English, Tiếng Việt, Français, Deutsch, Español, 简体中文, 日本語, 한국어; dates and numbers through `Intl`.
- Command palette (`Ctrl+K`), keyboard shortcuts, breadcrumbs, a guided tour, responsive layout for phones, tablets and wide screens.
- Public landing page `/welcome` with a one-click demo account, SEO tags and share images.
- Accessibility: WCAG AA contrast, full keyboard use, focus management, reduced motion respected.

**Devices**
- Real-time sync between devices with Socket.IO.
- Installable PWA with offline reading of the pages and data already loaded; writes are locked while offline.

**API and documentation**
- REST API of 70 endpoints with Swagger UI at `/api-docs`, a Postman collection, the API reference and the ER diagram.
- README in English and Vietnamese, docs on architecture, database, API, testing and deployment, screenshots of every
  page in both themes, logo files and a social preview image.

**Quality**
- 665 API tests (Vitest, Supertest, in-memory MongoDB) with 94.8% line coverage.
- 847 client unit tests (Vitest, React Testing Library) with 68.4% line coverage.
- Playwright end-to-end tests on the production build: Chrome desktop and phone, the main flows also on Firefox and
  iPhone Safari, axe accessibility checks in both themes.
- ESLint with zero warnings, an i18n key check, a test that keeps the docs in line with the code.
- GitHub Actions: CI on every push and pull request, and a live smoke test after every deploy of `main`.

### Fixed

Found during the final review before submission (43 findings, all fixed; see [docs/review](docs/review/final-review.md)):

- Rate limits counted the proxy instead of the real visitor behind Cloudflare and Render.
- Share links (canonical, Open Graph, Twitter) pointed to the wrong address.
- Bulk actions and the category filter accepted ids of another user's data.
- Amounts with decimals or too many digits, and days that do not exist, were accepted.
- Saved items could briefly vanish from a list; the offline banner could stay after the network came back.
- Focus was lost when a dialog closed; calendar days broke "label in name"; pages jumped while data arrived.
- Flaky end-to-end tests, now steady on Chrome, Firefox and WebKit.

[Unreleased]: https://github.com/minhtriqn05/ledgerling/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/minhtriqn05/ledgerling/releases/tag/v1.0.0

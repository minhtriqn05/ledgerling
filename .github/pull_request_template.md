## What and why

<!-- What this pull request changes, and the reason. Link the issue if there is one: "Closes #12". -->

## How to check it

<!-- A Postman request or the steps in the browser -->

## Screenshots

<!-- Only when the interface changes: before / after, light and dark, desktop and phone if the layout changed. -->

## Checklist

- [ ] Branch from an up-to-date `main`; Conventional Commits messages
- [ ] Checks green: `npm run lint` and `npm run test:coverage` on both sides; `npm run i18n:check`, `npm run build`
      and `npm run test:e2e` in `client/`
- [ ] i18n: every new text goes through `t()` and exists in all 8 languages
- [ ] API change: Swagger comment, `docs/api-plan.md` (and `docs/erd.md`), tests for 200 / 400 / 401 / 404 / 409
- [ ] Interface change: colors and fonts from `tokens.css`, screenshots above

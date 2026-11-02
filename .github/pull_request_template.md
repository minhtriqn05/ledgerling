## What and why

<!-- What this pull request changes, and the reason. Link the issue if there is one: "Closes #12". -->

## How to check it

<!-- A Postman request or the steps in the browser -->

## Checklist

- [ ] Branch from an up-to-date `main`, Conventional Commits message
- [ ] API change: Swagger comment, `docs/api-plan.md` (and `docs/erd.md`), tests for 200 / 400 / 401 / 404 / 409
- [ ] Interface change: every text through `t()` in all 8 languages, colors and fonts from `tokens.css`
- [ ] `npm run lint` and `npm run test:coverage` pass on both sides; `npm run i18n:check`, `npm run build` and
      `npm run test:e2e` pass in `client/`

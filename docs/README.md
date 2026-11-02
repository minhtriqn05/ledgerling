# Ledgerling documentation

The [README](../README.md) is the short tour. The files below go deeper; they are written for someone who wants to
read, run or change the code.

| File | What is in it |
|------|---------------|
| [architecture.md](architecture.md) | The layers, the walk of one request from React to MongoDB, real-time sync, offline mode, i18n |
| [database.md](database.md) | Every model, field and index, the relations and the reasons behind the design |
| [api.md](api.md) | Conventions, auth, error codes, pagination, rate limits and `curl` examples |
| [api-plan.md](api-plan.md) | The full reference: every endpoint with its query, body, answers and errors |
| [erd.md](erd.md) | The complete ER diagram with every field (checked against the schemas by a test) |
| [testing.md](testing.md) | The test suites, how to run them, what they cover and the latest numbers |
| [deployment.md](deployment.md) | Render, Vercel and MongoDB Atlas: settings, environment variables, redeploy and rollback |
| [ui-style.md](ui-style.md) | The visual design: palette, fonts, spacing, motion and the decisions behind them |
| [brand/](brand/README.md) | The logo, what it means and how it moves |
| [review/](review/final-review.md) | The final review before submission: findings, fixes and measurements |
| [screenshots/](screenshots/README.md) | Every page at 1440 px and 390 px, in the light and the dark theme |
| [assets/](assets/README.md) | Logo files and the social preview image of the repository |
| [postman/](postman/ledgerling.postman_collection.json) | A Postman collection of the API |

`api-plan.md` and `erd.md` are read by `server/tests/apiDocs.test.js`: when a route, an error code or a schema field
changes without the docs, a test fails.

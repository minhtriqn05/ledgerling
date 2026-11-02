# Security Policy

## Supported versions

Ledgerling is a student course project. Only the latest version on the `main` branch is supported. Security fixes go to
`main` and are deployed to the live site.

## Reporting a vulnerability

Please do not open a public issue for a security problem. Report it privately instead:

1. Open the **Security** tab of this repository.
2. Click **Report a vulnerability**.
3. Describe the problem, the steps to reproduce it and the impact you expect.

One maintainer reads the reports. Replies can take a few days.

## Scope

In scope: the web app (https://ledgerling-ten.vercel.app), the API (https://ledgerling-api.onrender.com/api) and the code
in this repository.

Out of scope:
- Denial-of-service attacks or floods of traffic.
- Social engineering of the maintainer or of other users.
- Reports from automated scanners that do not include a working proof of the problem.
- Attempts to read other people's data. Test only with your own accounts.

The shared demo account (`demo@example.com`) is open to everyone, and its data can be reset at any time.

## How secrets and passwords are handled

- Passwords are stored only as bcrypt hashes.
- Tokens are JWTs with an expiry; logging out of all devices invalidates them.
- Secrets live only in environment variables. `.env` files are never committed.

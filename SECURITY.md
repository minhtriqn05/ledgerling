# Security Policy

## Supported versions

Ledgerling is a student course project with one live deployment. Only the latest release, built from `main`, gets
security fixes.

| Version | Supported |
|---------|-----------|
| 1.0.x (`main`, the live site) | yes |
| older commits | no |

## Reporting a vulnerability

Please do not open a public issue for a security problem. Report it privately:

1. Open the **Security** tab of this repository.
2. Click **Report a vulnerability** (or go straight to
   <https://github.com/minhtriqn05/ledgerling/security/advisories/new>).
3. Describe the problem, the steps to reproduce it and the impact you expect.

If you cannot use GitHub's private reporting, write to the e-mail address on my
[GitHub profile](https://github.com/minhtriqn05).

I am the only maintainer. I try to answer within 7 days, and to fix a confirmed problem on the live site as soon as I
can. I will credit you in the release notes if you want.

## Scope

In scope: the web app (https://ledgerling-ten.vercel.app), the API (<https://ledgerling-api.onrender.com/api>) and the code
in this repository.

Out of scope:

- Denial-of-service attacks or floods of traffic.
- Social engineering of the maintainer or of other users.
- Reports from automated scanners without a working proof of the problem.
- Reading or changing other people's data. Test only with accounts you created yourself.

The shared demo account (`demo@example.com`) is open to everyone and its data can be reset at any time.

## How secrets and passwords are handled

- Passwords are stored only as bcrypt hashes.
- Tokens are JWTs with an expiry and a token version; a new password or "log out of all devices" invalidates them.
- Secrets live only in environment variables on Render and Vercel. `.env` files are never committed.

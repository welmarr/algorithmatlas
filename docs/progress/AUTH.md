# Lot B — Optional verified accounts

Implemented registration/confirmation, optional display name, verification/resend, login/logout, generic forgotten-password, one-use reset and global session revocation. Anonymous learning stays available; verified ownership gates saves. Local drafts survive account navigation.

Verified on 2026-10-02:

- Migration 003 applied to disposable PostgreSQL.
- Password/token/session integration: 3 tests passed (real DB), including concurrent one-use redemption and stale-login rejection.
- Account save/restore browser journey passed using actual Mailpit email.
- Extended browser security journey passed: invalid/duplicate/weak credentials, CSRF, unverified denial, private ownership, generic reset, old password rejection, session revocation, token reuse and resend limits.
- Fast verification passed: format, lint, both typechecks, 124 unit tests, 13 opt-in skips, production build (42 generated pages).
- Production dependency audit: no known advisories.

During verification a DELETE input API was missing; implemented with owner-scoped access, then the cross-user browser check passed. StrictMode token loading and per-tab draft hydration were also checked through browser interaction.

SMTP remains local Mailpit, loopback ports 11025/18025. Test database/container and mail capture remain in use for Lot C/final gates. Combined full suite, fresh clone and final release remain pending; current implementation is not a public production auth deployment claim.

## Completed checkpoint reference

Branch: feature/vnext-visual-auth-python. Starting SHA: 6fb3573131642cdff4017c5e3e31e093489bb5b2. Ending implementation SHA: 4cfa0d67af106a6d2665de0af7a76eda839f7473. Changed subsystems: persistence/password/session/token code, migration 003, web account/email APIs and forms, private save APIs, tests and ADR-015.

The pending statements above describe this lot's original checkpoint. The combined full/fresh-clone gates now pass; final counts, failures/fixes, cleanup, security limits and release references are recorded in [VNEXT-FINAL](VNEXT-FINAL.md) and the new final audit. Historic audit directories are unchanged.

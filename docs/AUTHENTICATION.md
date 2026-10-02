# Optional verified accounts

Anonymous visitors can use the catalog, simulations, Lab, comparison and the configured local Python player. Accounts enable durable saves. Browser drafts use sessionStorage in the current tab; they are not cloud saves and contain no provider credentials.

## Flow and contract

Registration accepts email, a 12–128 character password, matching confirmation and optional display name. Email is normalized. New accounts receive an unverified session and must verify before any progress API or dashboard access. Verification is explicit POST; reading a link has no side effects. Existing pre-migration accounts must verify too.

New hashes use scrypt N=131072, r=8, p=1 with independent 16-byte salts and constant-time verification. Legacy scrypt hashes remain readable. At most two derivations run per web process; overload returns AUTH_RATE_LIMITED. Unknown login identities still perform a password derivation. Parameter choice follows [OWASP password storage guidance](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).

Session cookies are HttpOnly, SameSite=Lax, path=/, 30 days and Secure in production. Session and link tokens are random 32-byte values, stored only as SHA-256 hashes. Every mutation requires matching Origin/Host/protocol. Deploy only behind a trusted proxy that replaces forwarded headers; do not expose the development server publicly.

Verification links expire after 24 hours; reset links after 30 minutes. Issuing a replacement consumes older links for that purpose. Transactions lock the user row so concurrent redemption succeeds once. Reset changes the password and deletes all sessions atomically. Session creation locks and checks the password hash observed at login, closing the stale-login/reset race.

Forgot-password responds identically for existing and unknown emails, with a 750 ms minimum. SMTP delivery runs after the response through [Next after](https://nextjs.org/docs/app/api-reference/functions/after), avoiding SMTP-dependent response timing. It is an in-process delivery task: process loss can lose an email; request a fresh link. A durable outbox is a production gate.

## Abuse controls and privacy

PostgreSQL fixed-window quotas apply per action and hashed email/token plus a global action cap. Registration/resend/forgot: 3/hour; login/reset: 5/15 minutes; global action cap: 100/hour. They are intentionally conservative for local deployment. Rate buckets contain hashes, not emails. Security logs contain action/outcome/time/random request ID, never credentials, tokens or mail text.

Links carry tokens in URL fragments, which do not reach HTTP logs or referrers. The form removes the fragment after loading. Refreshing that page requires reopening the email link. Error responses use AUTH_* codes with fixed safe messages. Return paths are allowlisted local learning/workspace routes.

## Data and tests

Apply migrations with pnpm db:migrate. Migration 003 adds email verification and one-use account tokens. pnpm db:prune removes expired sessions, old tokens and rate buckets. Saves query by both owner and ID; another account receives 404. The API never accepts a user ID from the client.

tests/auth-db.test.ts tests hashing, legacy verification, link expiry/replacement/concurrent consumption, reset revocation and stale login. tests/e2e/account.spec.ts and auth-security.spec.ts use real PostgreSQL, Mailpit and browser forms, including cross-user access, CSRF, invalid passwords, generic reset, reused links, resend limits and anonymous draft continuity.

Public deployment still requires TLS, trusted proxy configuration, durable email delivery, operational abuse monitoring and backups. No third-party SMTP account is required for local use.

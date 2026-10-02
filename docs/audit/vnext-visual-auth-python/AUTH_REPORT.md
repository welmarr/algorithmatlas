# Authentication report

Anonymous learning and configured local execution remain available. Accounts provide persistence. Registration supports an optional display name and confirmation; unverified users can sign in but cannot write private saved work. A clear verification/resend path leads back to the workspace. Tab-local bounded drafts preserve source/input during account navigation.

Migrations 001–004 build a new PostgreSQL database, including hashed email tokens and owner-scoped Python workspaces. Real Mailpit captures SMTP verification and reset links. Browser journeys cover signup, verify, save, logout/login, restore, forgot/reset, old-password failure, revoked sessions and token reuse. Integration tests exercise one-use races, expiry and reset/login locking. Another user's saved records remain inaccessible.

Email is deliberately local for this milestone. Mailpit is a test/development inbox, not an external email service. Production SMTP delivery and a durable outbox are unproven. Refer to [AUTHENTICATION](../../AUTHENTICATION.md), [EMAIL](../../EMAIL.md) and [SECURITY_REPORT](SECURITY_REPORT.md) for configuration and controls.

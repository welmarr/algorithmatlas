# Security report

## Accounts and persistence

Passwords use salted scrypt-v2 (N=131072, r=8, p=1), bounded length and concurrent derivations; no plaintext password storage. Session tokens and email tokens are random and stored only as hashes. Production cookies are HttpOnly, SameSite=Lax and Secure. Same-origin mutation checks, bounded bodies and database-backed quotas guard account APIs. Verification expires after 24 hours and reset after 30 minutes; replacement/consumption and session revocation use transactions and locks. Stale password login cannot issue a session after a concurrent reset.

Verification/reset tokens are URL fragments, removed by the client and consumed by explicit POST. Generic forgot-password responses have a minimum delay and deferred mail dispatch. Mail failures log bounded metadata. Delivery uses process-local background work, so a durable production outbox remains open. Private reads/deletes and verified saves are owner-scoped. Real DB and browser tests cover reuse, expiry, races, CSRF, quotas and cross-user access.

## Execution boundary

Next never executes submitted Python and receives no Docker socket. A separate trusted loopback Node service authenticates with a server-only random key and controls a fixed runner image through fixed argv. Public job access uses random capability tokens. Guests receive no host mounts, orchestrator keys, environment secrets or network. Containers use UID/GID 65534, read-only root, capability drop ALL, no-new-privileges, PID 32, memory 128 MiB without swap, CPU quota and process limits, bounded noexec/nosuid tmpfs, trace/stdout/request bounds and a wall deadline.

AST/import/builtin restrictions reduce the supported surface but are not treated as the sole sandbox. Queue admission, concurrency (maximum 2), queue deadline, retention and output limits constrain aggregate local use. Cleanup is awaited before the execution slot is reusable. Actual Docker settings and adversarial payload outcomes are tested.

## Evidence and remaining limits

Both production and full dependency audits report no known advisories at verification time. The Python adapter uses the standard library and a fixed Python base image; this is not an independent OS-image CVE attestation. Repository checks found no committed local environment secrets or generated mail/account data. Public deployment, hostile multi-tenant containment, external SMTP deliverability, durable delivery, TLS/proxy configuration, backups and incident operations require separate review. Host-header checks alone are not an Internet security boundary; local loopback binding and disabled-by-default execution are essential.

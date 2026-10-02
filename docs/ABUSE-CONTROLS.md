# Abuse controls

All execution quotas are server-side PostgreSQL counters. A signed HttpOnly SameSite cookie provides a non-invasive guest identity; authenticated users use their account. IP addresses are HMAC-hashed with ABUSE_HASH_KEY and never logged. Changing cookies or accounts does not bypass the IP/global budget.

| Limit                    | Guest | Verified |               Shared |
| ------------------------ | ----: | -------: | -------------------: |
| Jobs/minute              |     6 |       12 |     IP 30; global 60 |
| Jobs/hour                |    60 |      120 |               IP 300 |
| Jobs/day                 |   200 |      600 | IP 1200; global 5000 |
| Active/queued per client |     2 |        4 |   Queue 8; running 2 |
| Poll/minute              |   240 |      240 |        Same IP bound |
| Cancel/minute            |    30 |       30 |        Same IP bound |

Environment names are PYTHON_GUEST_PER_MINUTE/HOUR/DAY, PYTHON_VERIFIED_PER_MINUTE/HOUR/DAY, PYTHON_IP_PER_MINUTE/HOUR/DAY, PYTHON_GLOBAL_PER_MINUTE/DAY, PYTHON_GUEST_QUEUED, PYTHON_VERIFIED_QUEUED, PYTHON_QUEUE_SIZE, PYTHON_CONCURRENCY, PYTHON_POLL_PER_MINUTE and PYTHON_CANCEL_PER_MINUTE. Strict upper/lower bounds reject invalid configuration. Limits apply to all Web replicas sharing the database. Admission errors are structured 429 with Retry-After.

Queue wait defaults to 15 seconds (maximum 30); terminal retention defaults to 5 minutes (maximum 15). A queued cancellation releases queue capacity. Running cancellation waits for container cleanup before freeing the worker slot. Idempotent retries do not consume a second execution quota.

In direct local development, IP controls use one shared loopback identity and ignore forwarded headers. Public requests require the explicitly trusted proxy path: fixed APP_URL host/origin, authenticated proxy header and exactly one valid x-real-ip. The edge must overwrite those headers and prevent direct backend access. Never enable trust of arbitrary client X-Forwarded-* headers.

Account signup/login/resend/forgot/reset have separate database-backed limits; verified save mutations are bounded per account. The production email/operations lot adds the shared ingress policy and incident controls. Public execution remains off by default; independent guest/verified/global and worker switches preserve learning and saved-work access.

## Account operations update

Signup/resend/forgot limits are three per identity per hour; login/reset five per fifteen minutes. Each action also has an IP ceiling (login 50/hour, others 30/hour) and global 100/hour. Save mutations allow 120/account/minute and 240/IP/minute. Rejections return a bounded error and Retry-After. Account deletion requires password plus exact confirmation, limited to three/account/15min with IP/global ceilings. Database signup_disabled and email_paused incident switches persist across restarts. See EMAIL.md and RETENTION.md.

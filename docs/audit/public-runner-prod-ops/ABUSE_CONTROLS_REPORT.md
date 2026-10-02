# Abuse controls

| Budget                   | Anonymous guest | Verified account | Shared ceiling       |
| ------------------------ | --------------: | ---------------: | -------------------- |
| submissions/minute       |               6 |               12 | IP 30, global 60     |
| submissions/hour         |              60 |              120 | IP 300               |
| submissions/day          |             200 |              600 | IP 1200, global 5000 |
| active/queued per client |               2 |                4 | queue 8, running 2   |
| polling/minute           |             240 |              240 | IP 240               |
| cancellation/minute      |              30 |               30 | IP 30                |

Values are configurable within strict bounds. A signed HttpOnly guest identity avoids invasive fingerprinting. IP quota identities are HMAC-hashed. All replicas use PostgreSQL counters; changing account or cookie does not bypass IP/global bounds. Idempotent retries do not consume another execution budget. Rate-limit/queue errors return structured 429 and Retry-After.

Account signup/resend/forgot: three per identity/hour. Login/reset: five per identity/15 minutes. IP ceilings: login 50/hour, others 30/hour; global 100/hour per action. Saves: 120/account/minute and 240/IP/minute. Account deletion: password and exact DELETE confirmation with three/account/15 minutes plus ingress limits.

Tests cover simultaneous admission, queue saturation, guest/verified differences, global/IP limits despite changed identities, polling/cancellation limits, duplicate retries, queue deadline, retained capability expiry, role switches and cleanup barriers. Browser tests cover auth/reset throttling and actual queue/rate/disabled UI states. Real bounded mixed execution is described in RUNNER_SECURITY_REPORT.md.

PUBLIC_PYTHON_EXECUTION_ENABLED is false by default. Independent guest and verified flags, RUNNER_EXECUTION_ENABLED and durable controls allow incident response. python_disabled closes admission and cancels active work. runner_paused pauses claims/cancels active work while the waiting queue remains bounded and may accept requests. Learning and saved work remain available.

Public proxy trust requires canonical HTTPS APP_URL, explicit TRUST_PROXY and an independent secret header. The edge must overwrite forwarded host/proto/IP and prevent direct backend access. Spoofed/missing headers and mismatched host/origin fail policy tests. Local development ignores forwarded headers and shares a loopback IP quota. Network-level enforcement is an operator gate.

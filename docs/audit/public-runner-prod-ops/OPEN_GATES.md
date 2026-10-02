# Remaining gates before public exposure

The implementation can be released as a controlled deployment candidate. Public Python is **disabled by default**. These deployment/review gates remain:

1. Independent security review of hostile-code hosting, Python restrictions, kernel boundary, secrets and incident recovery. Status: NOT STARTED.
2. Target Linux host: dedicated service identity, rootless Docker, cgroups v2, seccomp, immutable image and production-profile preflight. Current Windows test evidence and Linux CI test profile do not substitute.
3. Real canonical HTTPS ingress: trusted-header overwrite, restricted backend access, tunnel/firewall, HSTS and deployment secret management. Policy tests pass; deployed topology is untested.
4. Production SMTP credentials/domain setup, TLS delivery, SPF/DKIM/DMARC/bounce handling and alerting. Mailpit is the automated acceptance transport.
5. Encrypted backup storage/key recovery, retention/supervision schedules, production data-volume restore exercise, least-privilege runtime grants and monitoring alerts.
6. External visual/pedagogical review of the actual screenshot package. Automated capture and selected visual inspection are not independent visual certification.

Documented limitations: container runtime shares the kernel; SMTP has at-least-once crash semantics; local direct requests share an IP quota; one worker leader permits at most two concurrent jobs; general Python semantic inference remains deliberately partial; strict nonce-based CSP, C++ and Java are outside this split.

No paid AI credential is required for the core platform or release acceptance. The four live-provider AI tests remain intentionally skipped.

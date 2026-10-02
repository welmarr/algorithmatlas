# Open gates and classification rationale

1. **Public code execution:** Python is a local Docker CLI only. A public runner needs independent isolation/daemon/host review, edge abuse controls, capacity planning, safe queueing, operational monitoring, and incident response. C++ and Java have no implementation.
2. **Editable code coverage:** Only Increasing Array has a browser JavaScript-subset editor. The local Python path is not wired to the browser player. Most curated pages show reference source rather than executed user source.
3. **Accessibility:** Automated keyboard/mobile/reduced-motion/text-cue checks pass. Manual screen-reader and full contrast/zoom audits across every renderer are outstanding; no WCAG conformance claim is made.
4. **Performance:** Node synthetic 100k-event snapshot creation took 9.33 seconds in one sample; the browser was measured only at the largest accepted array input, 383 events. Large browser traces require virtualized logs and further rendering tests before input limits change.
5. **AI:** The built-in connector and schemas pass. No live self-hosted or external provider was configured for this audit, so live transport, CORS, and provider behavior are unverified.
6. **Production operations:** The current preview is stateless and database-free. Optional PostgreSQL account storage needs deployment-specific TLS/proxy/host validation, backups, restore exercise, retention, monitoring, and an operator-managed secret. Remote CI has not run because no remote exists.
7. **Community code:** Pack manifests are data-validated, and reviewed local code may be registered. Untrusted on-demand installation and distribution are not implemented.

These gates prevent a **PRODUCTION-READY CORE** or **PRODUCTION-READY PLATFORM** classification. The bounded curated learning application is beyond the original five-problem prototype, so **MVP** is the evidence-based current classification.

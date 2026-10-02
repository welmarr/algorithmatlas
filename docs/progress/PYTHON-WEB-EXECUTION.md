# Lot C — Python Own Code

Implemented the browser editor/input → local authenticated orchestrator → bounded queue → isolated Python container → raw trace → semantic interpretation → teaching steps → choreography → interactive player path. Anonymous execution works; verified users can save/restore/delete source/input workspaces. Source highlighting uses executed Python.

Local-only gate is explicit and off by default. Public arbitrary-code execution remains unsupported. Concurrency, queue deadline, rate, retention, source/input/output/trace, CPU/memory/PID/filesystem limits are enforced. Poll/cancel uses a random job capability; timeout/cancel cleanup completes before the slot is reused.

Verified during implementation on 2026-10-02:

- Existing runner/semantic tests: 12 passed with Docker.
- New scheduler/security tests: 5 passed, including actual docker inspect assertions for nonroot, read-only, network, memory, PIDs, capabilities, security options and tmpfs.
- Browser anonymous A–Z passed: curated input result 17, Lab, Compare, Python result 17, edited result 27, graph result [0,4,6], scalar/raw fallback, playback, all four viewport widths and reduced motion.
- Browser error/cancel/capability test passed.
- Verified-account Python save/logout/login/restore/rerun passed.
- Typecheck and lint passed after test selectors/labels were corrected. Full combined gates and fresh clone still pending.
- Fast gate passed: 127 tests, 15 opt-in skips, production build. The first combined production gate passed 138 tests (4 optional skips) and both dependency audits, then exposed three browser-test assumptions. Playwright's Secure-cookie localhost exception required a localhost test origin; an older accessibility selector expected one active entity instead of comparison plus changed value. Both were corrected without weakening cookies or visuals; the four affected production browser tests then passed. A complete rerun remains required.

The browser verification exposed ambiguous implicit select labels; explicit accessible names were added. Tests were corrected to target actual array/graph renderer markup. No trace or algorithm result was hard-coded to pass them. A generated full-page screenshot was inspected; screenshots remain ignored temporary artifacts.

Reproducibility tooling now includes pnpm verify:isolated (fresh temporary DB/mail with exact cleanup), production browser mode and updated CI. Documentation includes the threat model, runbook, service limits, privacy and future public deployment gates.

## Completed checkpoint reference

Branch: feature/vnext-visual-auth-python. Starting SHA: 4cfa0d67af106a6d2665de0af7a76eda839f7473. Ending implementation SHA: 00089c3b0b9727e30d8a0b043a5e397e22f159e8. Changed subsystems: isolated-runner/jobs, execution service, Python trace, Own Code/API/player, migration 004/workspaces, verification scripts, tests and ADR-016.

The pending statements above describe this lot's original checkpoint. The combined full/fresh-clone gates now pass; final counts, failures/fixes, cleanup, security limits and release references are recorded in [VNEXT-FINAL](VNEXT-FINAL.md) and the new final audit. Historic audit directories are unchanged.

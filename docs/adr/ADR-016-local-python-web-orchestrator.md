# ADR 016 — Local Python web execution

Status: accepted; public execution remains gated.

Reuse the existing isolated Python runner and deterministic interpreter. Add an authenticated loopback HTTP orchestrator outside the Next process, with bounded in-memory jobs, queue deadlines and random job capabilities. The trusted process alone controls Docker. Untrusted programs receive no mounts, socket, network or service credentials.

Create containers before attaching execution so cancellation cannot race an unfinished normal creation. Await explicit removal before releasing a concurrency slot. Add CPU, address-space, language-policy and protocol limits to the existing container controls. Keep error messages fixed and logs metadata-only.

Keep the browser pipeline identical in shape to curated runs: raw records → semantic events → teaching steps → choreography → canonical timeline → player. Limited interpretation is presented honestly, with raw trace always available. AI and accounts are optional. Only verified users can persist source/input.

A single local process is sufficient for this bounded milestone. Distributed queues, dedicated execution VMs, crash reconciliation and independent public sandbox review are required before an internet-facing deployment.

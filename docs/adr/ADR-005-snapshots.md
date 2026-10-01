# ADR-005: Configurable snapshots

Status: Accepted.

Context: Seeking from zero becomes costly on long traces. Decision: Snapshot every 100 events by default, configurable per timeline, and replay only from the nearest prior snapshot. Alternatives: Full replay or snapshot every step. Consequences: Faster seeks at memory cost; benchmark intervals before scaling to million-event traces.

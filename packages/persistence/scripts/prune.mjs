// Compatibility entry point. The bounded retention implementation is shared.
process.argv[2] = "prune";
await import("../../../scripts/operations.mjs");

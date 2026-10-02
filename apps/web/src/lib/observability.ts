import { randomUUID } from "node:crypto";

type SecurityAction = "login" | "register" | "password-reset-email";
type SecurityOutcome = "accepted" | "rejected" | "rate_limited";

export function logSecurityEvent(
  action: SecurityAction,
  outcome: SecurityOutcome,
): void {
  console.info(
    JSON.stringify({
      time: new Date().toISOString(),
      category: "security",
      action,
      outcome,
      requestId: randomUUID(),
    }),
  );
}

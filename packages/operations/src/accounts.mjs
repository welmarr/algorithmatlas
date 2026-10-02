import { operationsPool, transaction } from "./db.mjs";
export async function inspectAccount(userId, pool = operationsPool()) {
  const user = await pool.query(
    "SELECT email,display_name,email_verified_at,created_at FROM users WHERE id=$1",
    [userId],
  );
  if (!user.rowCount) return null;
  const counts = {};
  for (const table of [
    "saved_inputs",
    "simulation_runs",
    "python_workspaces",
    "problem_progress",
    "learning_progress",
    "user_submissions",
    "provider_configurations",
    "sessions",
  ]) {
    counts[table] = Number(
      (
        await pool.query(
          "SELECT count(*) FROM " + table + " WHERE user_id=$1",
          [userId],
        )
      ).rows[0].count,
    );
  }
  return { user: user.rows[0], counts };
}
export async function deleteAccount(
  userId,
  expectedPasswordHash,
  pool = operationsPool(),
) {
  return transaction(pool, async (client) => {
    const locked = await client.query(
      "SELECT password_hash FROM users WHERE id=$1 FOR UPDATE",
      [userId],
    );
    if (
      !locked.rowCount ||
      locked.rows[0].password_hash !== expectedPasswordHash
    )
      return false;
    // Preserve running job IDs for container cleanup; detach and redact them before cascading user data.
    await client.query(
      "UPDATE execution_jobs SET owner_user_id=NULL,client_hash=repeat('0',64),source=NULL,input=NULL,result=NULL,status='cancelling',cancel_requested_at=now() WHERE owner_user_id=$1 AND status IN ('running','cancelling')",
      [userId],
    );
    await client.query("DELETE FROM users WHERE id=$1", [userId]);
    return true;
  });
}

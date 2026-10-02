import pg from "pg";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const sessions = await client.query(
    "DELETE FROM sessions WHERE expires_at < now()",
  );
  const quotas = await client.query(
    "DELETE FROM rate_limits WHERE window_end < now() - interval '1 day'",
  );
  const tokens = await client.query(
    "DELETE FROM account_tokens WHERE expires_at < now() OR consumed_at < now() - interval '1 day'",
  );
  process.stdout.write(
    `Removed ${sessions.rowCount ?? 0} expired sessions, ${tokens.rowCount ?? 0} old account tokens and ${quotas.rowCount ?? 0} old rate buckets\n`,
  );
} finally {
  await client.end();
}

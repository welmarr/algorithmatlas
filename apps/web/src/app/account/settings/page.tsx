import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "../../../lib/auth";
import { databaseReady } from "@sim/persistence";
import { inspectAccount } from "@sim/operations";
import { authMessages, type AuthCode } from "../../../lib/account-service";
import "../../account.css";
export const dynamic = "force-dynamic";
export default async function Settings({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (!(await databaseReady())) redirect("/account");
  const user = await currentUser();
  if (!user) redirect("/account");
  const details = await inspectAccount(user.id);
  const { error } = await searchParams;
  return (
    <main className="account-page">
      <div className="eyebrow">YOUR ACCOUNT</div>
      <h1>Account &amp; data</h1>
      <p>Review your saved information and manage your account.</p>
      {error && (
        <p className="account-error" role="alert">
          {authMessages[error as AuthCode] ??
            "The account could not be deleted. Check your password and confirmation."}
        </p>
      )}
      <div className="account-grid">
        <section className="panel account-card">
          <h2>Your information</h2>
          <dl>
            <dt>Display name</dt>
            <dd>{user.displayName}</dd>
            <dt>Email</dt>
            <dd>{user.email}</dd>
            <dt>Email status</dt>
            <dd>{user.emailVerified ? "Verified" : "Verification needed"}</dd>
          </dl>
          <h3>Stored work</h3>
          <ul>
            {Object.entries(details?.counts ?? {}).map(([name, count]) => (
              <li key={name}>
                <span>{name.replaceAll("_", " ")}</span>
                <strong>{count}</strong>
              </li>
            ))}
          </ul>
          <p>
            Execution results expire automatically. Saved work stays until you
            delete it or your account.
          </p>
          <Link href="/dashboard">Review saved work</Link>
        </section>
        <section className="panel account-card">
          <h2>Delete account</h2>
          <p>
            This permanently removes your account, sessions, saved inputs, runs,
            Python workspaces and learning progress. Active executions are
            cancelled. Backup copies expire according to the operator’s
            retention policy.
          </p>
          <p>You can keep using the learning tools anonymously.</p>
          <form method="post" action="/api/account/delete">
            <label>
              Current password
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                required
                maxLength={128}
              />
            </label>
            <label>
              Type DELETE to confirm
              <input
                name="confirmation"
                required
                pattern="DELETE"
                autoComplete="off"
              />
            </label>
            <button type="submit">Permanently delete my account</button>
          </form>
        </section>
      </div>
      <Link href="/account">Back to account</Link>
    </main>
  );
}

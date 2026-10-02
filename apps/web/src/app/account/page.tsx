import Link from "next/link";
import { databaseReady } from "@sim/persistence";
import { currentUser } from "../../lib/auth";
import "../account.css";

export const dynamic = "force-dynamic";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const ready = await databaseReady();
  const user = ready ? await currentUser() : null;
  const error = (await searchParams).error;
  const message =
    error === "credentials"
      ? "Email or password was not accepted."
      : error === "account-exists"
        ? "An account already uses that email."
        : error
          ? "Check your details and try again."
          : "";
  return (
    <main className="account-page">
      <div className="eyebrow">YOUR LEARNING SPACE</div>
      <h1>Keep your progress</h1>
      <p>
        Save runs and inputs for your own account. Exploring problems remains
        available without signing in.
      </p>
      {!ready ? (
        <section className="panel account-card" role="status">
          <h2>Account storage is unavailable</h2>
          <p>
            Configure PostgreSQL and run the migrations to enable accounts and
            saved progress.
          </p>
          <Link href="/">Continue exploring</Link>
        </section>
      ) : user ? (
        <section className="panel account-card">
          <h2>Welcome back, {user.displayName}</h2>
          <Link className="primary-link" href="/dashboard">
            Open dashboard
          </Link>
        </section>
      ) : (
        <>
          {message && (
            <p className="account-error" role="alert">
              {message}
            </p>
          )}
          <div className="account-grid">
            <section className="panel account-card">
              <h2>Sign in</h2>
              <form method="post" action="/api/auth/login">
                <label>
                  Email
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                  />
                </label>
                <label>
                  Password
                  <input
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                  />
                </label>
                <button type="submit">Sign in</button>
              </form>
            </section>
            <section className="panel account-card">
              <h2>Create account</h2>
              <form method="post" action="/api/auth/register">
                <label>
                  Display name
                  <input
                    name="name"
                    maxLength={64}
                    autoComplete="name"
                    required
                  />
                </label>
                <label>
                  Email
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                  />
                </label>
                <label>
                  Password
                  <input
                    name="password"
                    type="password"
                    minLength={12}
                    maxLength={128}
                    autoComplete="new-password"
                    required
                  />
                </label>
                <p>Use at least 12 characters.</p>
                <button type="submit">Create account</button>
              </form>
            </section>
          </div>
        </>
      )}
    </main>
  );
}

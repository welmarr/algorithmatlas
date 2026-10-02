import Link from "next/link";
import { databaseReady } from "@sim/persistence";
import { currentUser } from "../../lib/auth";
import {
  authMessages,
  safeReturn,
  type AuthCode,
} from "../../lib/account-service";
import "../account.css";

export const dynamic = "force-dynamic";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string; returnTo?: string }>;
}) {
  const ready = await databaseReady();
  const user = ready ? await currentUser() : null;
  const params = await searchParams;
  const error = params.error;
  const returnTo = safeReturn(params.returnTo);
  const message =
    authMessages[error as AuthCode] ??
    (error === "credentials"
      ? "Email or password was not accepted."
      : error === "account-exists"
        ? "An account already uses that email."
        : error
          ? "Check your details and try again."
          : "");
  return (
    <main className="account-page">
      <div className="eyebrow">YOUR LEARNING SPACE</div>
      <h1>Keep your progress</h1>
      <p>
        No account required to learn and simulate. Create an account to save
        your work.
      </p>
      {message && (
        <p className="account-error" role="alert">
          {message}
        </p>
      )}
      {params.notice && (
        <p className="save-status" role="status">
          {params.notice === "deleted"
            ? "Your account and saved work have been deleted. You can continue learning anonymously."
            : params.notice === "verified"
              ? "Email verified. You can now save your work."
              : params.notice === "password-reset"
                ? "Password reset. Sign in with your new password."
                : "Check your inbox for a verification link. If verification is needed, a link has been sent."}
        </p>
      )}
      {!ready ? (
        <section className="panel account-card" role="status">
          <h2>Account storage is unavailable</h2>
          <p>
            Accounts are temporarily unavailable. All learning and simulations
            remain available.
          </p>
          <Link href="/">Continue exploring</Link>
        </section>
      ) : user ? (
        <section className="panel account-card">
          <h2>Welcome back, {user.displayName}</h2>
          {!user.emailVerified && (
            <p>
              Verify your email before saving. You can keep learning while you
              wait.
            </p>
          )}
          {returnTo !== "/dashboard" && (
            <Link className="primary-link" href={returnTo}>
              Return to your workspace
            </Link>
          )}
          <Link className="primary-link" href="/dashboard">
            Open dashboard
          </Link>
          <form method="post" action="/api/auth/logout">
            <button type="submit">Sign out</button>
          </form>
          <Link href="/account/settings">Account &amp; data</Link>
        </section>
      ) : (
        <>
          <div className="account-grid">
            <section className="panel account-card">
              <h2>Sign in</h2>
              <form method="post" action="/api/auth/login">
                <input type="hidden" name="returnTo" value={returnTo} />
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
              <Link href="/account/forgot">Forgot password?</Link>
            </section>
            <section className="panel account-card">
              <h2>Create account</h2>
              <form method="post" action="/api/auth/register">
                <input type="hidden" name="returnTo" value={returnTo} />
                <label>
                  Display name
                  <input name="name" maxLength={64} autoComplete="name" />
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
                <label>
                  Confirm password
                  <input
                    name="confirmPassword"
                    type="password"
                    minLength={12}
                    maxLength={128}
                    autoComplete="new-password"
                    required
                  />
                </label>
                <button type="submit">Create account</button>
              </form>
            </section>
          </div>
        </>
      )}
      {ready && !user?.emailVerified && (
        <section className="panel account-card">
          <h2>Need another verification email?</h2>
          <form method="post" action="/api/auth/resend">
            <label>
              Email
              <input
                name="email"
                type="email"
                autoComplete="email"
                defaultValue={user?.email}
                required
              />
            </label>
            <button type="submit">Resend verification</button>
          </form>
        </section>
      )}
      <Link href={returnTo === "/dashboard" ? "/" : returnTo}>
        Continue learning
      </Link>
    </main>
  );
}

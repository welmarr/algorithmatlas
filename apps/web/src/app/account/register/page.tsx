import Link from "next/link";
import {
  authMessages,
  safeReturn,
  type AuthCode,
} from "../../../lib/account-service";
import "../../account.css";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; returnTo?: string }>;
}) {
  const params = await searchParams;
  const returnTo = safeReturn(params.returnTo);
  const suffix = params.returnTo
    ? "?returnTo=" + encodeURIComponent(returnTo)
    : "";
  return (
    <main className="account-page account-focused">
      <div className="eyebrow">SAVE YOUR LEARNING</div>
      <h1>Create account</h1>
      <p>
        Create an account to save progress and workspaces. Learning and
        simulation remain available without an account.
      </p>
      {params.error && (
        <p className="account-error" role="alert">
          {authMessages[params.error as AuthCode] ??
            "Check your details and try again."}
        </p>
      )}
      <section className="panel account-card">
        <form method="post" action="/api/auth/register">
          <input type="hidden" name="returnTo" value={returnTo} />
          <label>
            Display name <span className="field-optional">optional</span>
            <input name="name" maxLength={64} autoComplete="name" />
          </label>
          <label>
            Email
            <input name="email" type="email" autoComplete="email" required />
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
          <p>Use at least 12 characters.</p>
          <button type="submit">Create account</button>
        </form>
        <div className="account-links">
          <Link href={"/account/login" + suffix}>
            Already have an account? Sign in →
          </Link>
        </div>
      </section>
      <Link href="/problems">Continue learning anonymously</Link>
    </main>
  );
}

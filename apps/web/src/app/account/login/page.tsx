import Link from "next/link";
import {
  authMessages,
  safeReturn,
  type AuthCode,
} from "../../../lib/account-service";
import "../../account.css";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string; returnTo?: string }>;
}) {
  const params = await searchParams;
  const returnTo = safeReturn(params.returnTo);
  const suffix = params.returnTo
    ? "?returnTo=" + encodeURIComponent(returnTo)
    : "";
  return (
    <main className="account-page account-focused">
      <div className="eyebrow">YOUR LEARNING SPACE</div>
      <h1>Sign in</h1>
      <p>
        No account required to learn or simulate. Sign in only to sync and save
        your work.
      </p>
      {params.error && (
        <p className="account-error" role="alert">
          {authMessages[params.error as AuthCode] ??
            "Check your details and try again."}
        </p>
      )}
      {params.notice && (
        <p className="save-status" role="status">
          {params.notice === "verified"
            ? "Email verified. You can now save your work."
            : params.notice === "password-reset"
              ? "Password reset. Sign in with your new password."
              : params.notice === "deleted"
                ? "Your account and saved work have been deleted. You can continue learning anonymously."
                : "Check your inbox for a verification link."}
        </p>
      )}
      <section className="panel account-card">
        <form method="post" action="/api/auth/login">
          <input type="hidden" name="returnTo" value={returnTo} />
          <label>
            Email
            <input name="email" type="email" autoComplete="email" required />
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
        <div className="account-links">
          <Link href="/account/forgot-password">Forgot password?</Link>
          <Link href={"/account/register" + suffix}>
            Don&apos;t have an account? Create one →
          </Link>
        </div>
      </section>
      <Link
        href={
          params.returnTo && returnTo !== "/dashboard" ? returnTo : "/problems"
        }
      >
        Continue learning anonymously
      </Link>
    </main>
  );
}

import Link from "next/link";
import { authMessages, type AuthCode } from "../../../lib/account-service";
import "../../account.css";
export default async function ForgotPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const params = await searchParams;
  return (
    <main className="account-page">
      <h1>Reset your password</h1>
      <p>Enter your email to request a reset link.</p>
      {params.error && (
        <p role="alert">
          {authMessages[params.error as AuthCode] ?? "Please try again."}
        </p>
      )}
      {params.notice && (
        <p role="status">
          If an account matches that email, a password reset link has been sent.
        </p>
      )}
      <section className="panel account-card">
        <form method="post" action="/api/auth/forgot">
          <label>
            Email
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <button type="submit">Send reset link</button>
        </form>
      </section>
      <Link href="/account/login">Back to sign in</Link>
    </main>
  );
}

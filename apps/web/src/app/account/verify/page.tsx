import Link from "next/link";
import { AccountTokenForm } from "../../../components/AccountTokenForm";
import { authMessages, type AuthCode } from "../../../lib/account-service";
import "../../account.css";
export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const params = await searchParams;
  return (
    <main className="account-page account-focused">
      <div className="eyebrow">SAVE YOUR WORK</div>
      <h1>Verify your email</h1>
      <p>
        Confirm your email to save your work. Learning always remains available
        without an account.
      </p>
      {params.error && (
        <p className="account-error" role="alert">
          {authMessages[params.error as AuthCode] ??
            "The link could not be verified."}
        </p>
      )}
      {params.notice && (
        <p className="save-status" role="status">
          If verification is needed, a new link has been sent. Check your inbox.
        </p>
      )}
      <section className="panel account-card">
        <AccountTokenForm purpose="verify" />
      </section>
      <details className="account-resend">
        <summary>Need another verification email?</summary>
        <form method="post" action="/api/auth/resend">
          <label>
            Email
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <button type="submit">Resend verification</button>
        </form>
      </details>
      <Link href="/account/login">Back to sign in</Link>
    </main>
  );
}

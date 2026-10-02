import Link from "next/link";
import { AccountTokenForm } from "../../../components/AccountTokenForm";
import "../../account.css";
export default function VerifyPage() {
  return (
    <main className="account-page">
      <h1>Verify your email</h1>
      <p>
        Confirm your email to save your work. Learning always remains available
        without an account.
      </p>
      <section className="panel account-card">
        <AccountTokenForm purpose="verify" />
      </section>
      <Link href="/account">Request a new verification email</Link>
    </main>
  );
}

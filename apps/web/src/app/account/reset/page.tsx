import Link from "next/link";
import { AccountTokenForm } from "../../../components/AccountTokenForm";
import "../../account.css";
export default function ResetPage() {
  return (
    <main className="account-page">
      <h1>Choose a new password</h1>
      <section className="panel account-card">
        <AccountTokenForm purpose="reset" />
      </section>
      <Link href="/account/forgot">Request a new reset link</Link>
    </main>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { databaseReady } from "@sim/persistence";
import { currentUser } from "../../lib/auth";
import { safeReturn } from "../../lib/account-service";
import "../account.css";

export const dynamic = "force-dynamic";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string; error?: string; notice?: string }>;
}) {
  const params = await searchParams;
  const ready = await databaseReady();
  const user = ready ? await currentUser() : null;
  if (!user) {
    const query = new URLSearchParams();
    if (params.returnTo) query.set("returnTo", safeReturn(params.returnTo));
    if (params.error) query.set("error", params.error);
    if (params.notice) query.set("notice", params.notice);
    redirect("/account/login" + (query.size ? "?" + query : ""));
  }
  return (
    <main className="account-page account-focused">
      <div className="eyebrow">YOUR LEARNING SPACE</div>
      <h1>Welcome back, {user.displayName}</h1>
      <p>Your account keeps your progress, inputs, and workspaces together.</p>
      {params.notice === "verified" && (
        <p className="save-status" role="status">
          Email verified. You can now save your work.
        </p>
      )}
      {!user.emailVerified && (
        <p className="account-error" role="status">
          Verify your email before saving your work.{" "}
          <Link href="/account/verify-email">Open verification</Link>
        </p>
      )}
      <section className="panel account-card account-actions">
        {user.emailVerified && (
          <Link className="primary-link" href="/dashboard">
            Open dashboard
          </Link>
        )}
        <Link href="/account/settings">Account and data settings</Link>
        <Link href={safeReturn(params.returnTo)}>Return to your workspace</Link>
        <form method="post" action="/api/auth/logout">
          <button type="submit" className="text-button">
            Sign out
          </button>
        </form>
      </section>
      <Link href="/problems">Continue learning</Link>
    </main>
  );
}

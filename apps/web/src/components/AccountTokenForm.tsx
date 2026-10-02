"use client";
import { useEffect, useRef, useState } from "react";
export function AccountTokenForm({ purpose }: { purpose: "verify" | "reset" }) {
  const [token, setToken] = useState("");
  const loaded = useRef(false);
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    const value =
      new URLSearchParams(location.hash.slice(1)).get("token") ?? "";
    setToken(/^[A-Za-z0-9_-]{43}$/.test(value) ? value : "");
    // Fragments never reach the server or access log. Keep the token only in this form.
    if (location.hash) history.replaceState(null, "", location.pathname);
  }, []);
  return (
    <form method="post" action={`/api/auth/${purpose}`}>
      <input name="token" type="hidden" value={token} />
      {purpose === "reset" && (
        <>
          <label>
            New password
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              required
            />
          </label>
          <label>
            Confirm password
            <input
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              required
            />
          </label>
          <p>
            Use 12–128 characters. Your existing sessions will be signed out.
          </p>
        </>
      )}
      <button type="submit" disabled={!token}>
        {purpose === "verify" ? "Verify email" : "Set new password"}
      </button>
      {!token && (
        <p role="status">
          Open a valid link from your email. Links expire and can only be used
          once.
        </p>
      )}
    </form>
  );
}

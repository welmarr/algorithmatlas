"use client";

import { useEffect } from "react";
import "./account.css";

export default function ErrorView({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("View failed", { digest: error.digest });
  }, [error]);
  return (
    <main className="account-page" role="alert">
      <div className="eyebrow">TEMPORARY ERROR</div>
      <h1>This view could not load</h1>
      <p>Try loading this view again.</p>
      <button className="run-button" onClick={reset}>
        Try again
      </button>
    </main>
  );
}

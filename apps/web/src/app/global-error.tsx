"use client";

export default function GlobalError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <main
          role="alert"
          style={{
            maxWidth: 640,
            margin: "12vh auto",
            padding: 24,
            fontFamily: "sans-serif",
          }}
        >
          <h1>The page could not load</h1>
          <p>Please try again. If the problem persists, return later.</p>
          <button onClick={reset}>Try again</button>
        </main>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import "./teacher.css";
import "./animation.css";

export const metadata: Metadata = {
  title: "Algorithm Atlas",
  description:
    "Learn algorithms through deterministic, interactive simulations.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <Link className="brand" href="/">
            ◈ <span>Algorithm Atlas</span>
          </Link>
          <nav aria-label="Main navigation">
            <Link href="/">Problems</Link>
            <Link href="/lab">Algorithm Lab</Link>
          </nav>
          <span className="offline-badge">Deterministic core</span>
        </header>
        {children}
        <footer className="site-footer">
          Algorithm Atlas · Event protocol v0.1 · Runs locally without AI
        </footer>
      </body>
    </html>
  );
}

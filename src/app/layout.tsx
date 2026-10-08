import type { Metadata, Viewport } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import "@/styles/tokens.css";
import "@/styles/base.css";
import "@/styles/site.css";
import "@/styles/forms.css";
import "@/styles/panel-mock.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? "https://extynt.com"),
  title: { default: "extynt — an After Effects copilot", template: "%s — extynt" },
  description:
    "extynt reads your whole After Effects project fast, proposes a plan, applies it as one undoable step with before/after frames and a receipt, and can undo its own work. Closed beta.",
  openGraph: {
    title: "extynt",
    description: "An After Effects copilot. Closed beta.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#16171b" },
    { media: "(prefers-color-scheme: light)", color: "#f5f6f8" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip" href="#main">
          Skip to content
        </a>
        <header className="site-header">
          <div className="wrap">
            <Link className="wordmark" href="/">
              extynt
            </Link>
            <nav className="nav" aria-label="Main">
              <Link href="/login">Sign in</Link>
              <Link className="btn btn-primary btn-sm" href="/apply">
                Apply for the beta
              </Link>
            </nav>
          </div>
        </header>
        <main id="main">{children}</main>
        <footer className="site-footer">
          <div className="wrap">
            <p>extynt. Closed beta.</p>
            <nav aria-label="Footer">
              <Link href="/privacy">Privacy</Link>
              <Link href="/apply">Apply</Link>
              <Link href="/login">Sign in</Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}

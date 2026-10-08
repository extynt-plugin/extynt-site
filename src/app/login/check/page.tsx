import type { Metadata } from "next";

export const metadata: Metadata = { title: "Check your email" };

export default function CheckPage() {
  return (
    <div className="wrap page">
      <div className="page-narrow">
        <h1>Check your email</h1>
        <p className="lead">
          If that address has beta access, a sign-in link is on its way. The link works once and
          expires soon.
        </p>
      </div>
    </div>
  );
}

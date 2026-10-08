import type { Metadata } from "next";
import Link from "next/link";
import { ApplyForm } from "./ApplyForm";

export const metadata: Metadata = { title: "Apply for the beta" };

export default function ApplyPage() {
  return (
    <div className="wrap page">
      <div className="page-narrow">
        <p className="eyebrow">closed beta</p>
        <h1>Apply for the beta</h1>
        <p className="lead">
          extynt is in closed beta for macOS and Windows with After Effects 25 and 26. Applications
          are reviewed by hand. See what we store in the <Link href="/privacy">privacy note</Link>.
        </p>
        <ApplyForm />
      </div>
    </div>
  );
}

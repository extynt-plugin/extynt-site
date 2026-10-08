import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import { evaluateAccess } from "@/lib/access";
import { getEnv } from "@/lib/env";
import { getStore } from "@/lib/store";
import { getViewer } from "@/lib/viewer";
import { isAdminEmail } from "@/lib/admin";
import Link from "next/link";

export const metadata: Metadata = { title: "Account" };
export const dynamic = "force-dynamic";

const fmt = (d: Date | null) =>
  d ? d.toLocaleDateString("en", { year: "numeric", month: "long", day: "numeric" }) : "-";

export default async function AccountPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  const env = getEnv();
  const store = getStore();
  const now = new Date();
  const tester = await store.testers.byEmail(viewer.email);
  const access = evaluateAccess(tester, now, env.betaEndsAt);
  const devices = await store.devices.listForUser(viewer.id);
  const admin = isAdminEmail(viewer.email, env.adminEmails);

  return (
    <div className="wrap page">
      <div className="page-narrow">
        <p className="eyebrow">account</p>
        <h1>{viewer.email}</h1>
        {access.ok ? (
          <p className="alert alert-ok">
            Beta access is active until{" "}
            {fmt(
              tester?.accessUntil && tester.accessUntil < env.betaEndsAt
                ? tester.accessUntil
                : env.betaEndsAt
            )}
            .
          </p>
        ) : (
          <p className="alert alert-bad">
            You do not currently have beta access
            {access.reason === "no_tester" ? "" : ` (${access.reason.replace("_", " ")})`}.
          </p>
        )}
        <h2>Devices</h2>
        {devices.length === 0 ? (
          <p className="hint">No devices yet. Sign in from the extynt app to add one.</p>
        ) : (
          <ul>
            {devices.map((d) => (
              <li key={d.id}>
                {d.name}
                {d.platform ? ` · ${d.platform}` : ""} · last seen {fmt(d.lastSeenAt)}
                {d.revokedAt ? " · revoked" : ""}
              </li>
            ))}
          </ul>
        )}
        <div className="hero-actions">
          {access.ok && (
            <Link className="btn" href="/activate">
              Activate a device
            </Link>
          )}
          {admin && (
            <Link className="btn" href="/admin">
              Admin
            </Link>
          )}
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button className="btn" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

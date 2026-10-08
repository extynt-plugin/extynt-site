import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { isAdminEmail } from "@/lib/admin";
import { getEnv } from "@/lib/env";
import { loadAdminData } from "@/lib/services/admin";
import { getStore } from "@/lib/store";
import { getViewer } from "@/lib/viewer";
import { ApplicationsTable, DevicesTable, TestersTable } from "./tables";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  const env = getEnv();
  if (!isAdminEmail(viewer.email, env.adminEmails)) notFound();
  const ctx = { actorEmail: viewer.email, adminEmails: env.adminEmails, now: new Date() };
  const data = await loadAdminData(getStore(), ctx);

  return (
    <div className="wrap page admin-stack">
      <h1>Admin</h1>
      <section aria-labelledby="apps">
        <h2 id="apps">Applications</h2>
        <ApplicationsTable rows={data.applications} />
      </section>
      <section aria-labelledby="testers">
        <h2 id="testers">Testers</h2>
        <TestersTable rows={data.testers} />
      </section>
      <section aria-labelledby="devices">
        <h2 id="devices">Devices</h2>
        <DevicesTable rows={data.devices} />
      </section>
    </div>
  );
}

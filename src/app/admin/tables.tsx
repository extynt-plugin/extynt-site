import type { ApplicationRow, DeviceRow, TesterRow } from "@/lib/store/types";
import {
  approveAction,
  extendTesterAction,
  rejectAction,
  restoreTesterAction,
  revokeDeviceAction,
  revokeTesterAction,
} from "./actions";

const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "-");

function IdForm({
  id,
  action,
  label,
  danger,
}: {
  id: string;
  action: (f: FormData) => Promise<void>;
  label: string;
  danger?: boolean;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <button className={`btn btn-sm${danger ? " btn-danger" : ""}`} type="submit">
        {label}
      </button>
    </form>
  );
}

function EmailForm({
  email,
  action,
  label,
  danger,
}: {
  email: string;
  action: (f: FormData) => Promise<void>;
  label: string;
  danger?: boolean;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="email" value={email} />
      <button className={`btn btn-sm${danger ? " btn-danger" : ""}`} type="submit">
        {label}
      </button>
    </form>
  );
}

export function ApplicationsTable({ rows }: { rows: ApplicationRow[] }) {
  if (rows.length === 0) return <p className="hint">No applications yet.</p>;
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Applicant</th>
            <th>Setup</th>
            <th>Work</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => (
            <tr key={a.id}>
              <td>
                {a.name}
                <br />
                {a.email}
                <br />
                <span className="hint">{day(a.createdAt)}</span>
              </td>
              <td>
                {a.os}
                <br />
                {a.aeVersions.join(", ")}
              </td>
              <td>
                {a.work}
                {a.portfolioUrl && (
                  <>
                    <br />
                    <a href={a.portfolioUrl} rel="noopener noreferrer nofollow" target="_blank">
                      portfolio
                    </a>
                  </>
                )}
              </td>
              <td>
                <span
                  className={`badge${a.status === "approved" ? " badge-ok" : a.status === "rejected" ? " badge-bad" : ""}`}
                >
                  {a.status}
                </span>
              </td>
              <td>
                <div className="row-actions">
                  {a.status !== "approved" && (
                    <IdForm id={a.id} action={approveAction} label="Approve" />
                  )}
                  {a.status === "pending" && (
                    <IdForm id={a.id} action={rejectAction} label="Reject" danger />
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TestersTable({ rows }: { rows: TesterRow[] }) {
  if (rows.length === 0) return <p className="hint">No testers yet.</p>;
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Email</th>
            <th>Status</th>
            <th>Access until</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.id}>
              <td>{t.email}</td>
              <td>
                <span className={`badge ${t.status === "active" ? "badge-ok" : "badge-bad"}`}>
                  {t.status}
                </span>
              </td>
              <td>{t.accessUntil ? day(t.accessUntil) : "beta end"}</td>
              <td>
                <div className="row-actions">
                  <form action={extendTesterAction}>
                    <input type="hidden" name="email" value={t.email} />
                    <label className="sr-only" htmlFor={`until-${t.id}`}>
                      Access until for {t.email}
                    </label>
                    <input
                      className="input"
                      style={{ minHeight: 34, width: "9.5rem" }}
                      id={`until-${t.id}`}
                      name="until"
                      type="date"
                      required
                    />
                    <button className="btn btn-sm" type="submit">
                      Extend
                    </button>
                  </form>
                  {t.status === "active" ? (
                    <EmailForm email={t.email} action={revokeTesterAction} label="Revoke" danger />
                  ) : (
                    <EmailForm email={t.email} action={restoreTesterAction} label="Restore" />
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DevicesTable({ rows }: { rows: Array<DeviceRow & { email: string | null }> }) {
  if (rows.length === 0) return <p className="hint">No devices yet.</p>;
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Device</th>
            <th>Owner</th>
            <th>Last seen</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((d) => (
            <tr key={d.id}>
              <td>
                {d.name}
                <br />
                <span className="hint">
                  {d.platform ?? "?"} · {d.appVersion ?? "?"}
                </span>
              </td>
              <td>{d.email ?? d.userId}</td>
              <td>{day(d.lastSeenAt)}</td>
              <td>
                {d.revokedAt ? (
                  <span className="badge badge-bad">revoked</span>
                ) : (
                  <IdForm id={d.id} action={revokeDeviceAction} label="Revoke device" danger />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { formatUserCode, normalizeUserCode } from "@/lib/crypto";
import { getEnv } from "@/lib/env";
import { allow, LIMITS } from "@/lib/ratelimit";
import { lookupUserCode, type Viewer } from "@/lib/services/device";
import { getStore } from "@/lib/store";
import { getViewer } from "@/lib/viewer";
import { decideAction } from "./actions";

export const metadata: Metadata = { title: "Activate a device" };
export const dynamic = "force-dynamic";

const MESSAGES: Record<string, string> = {
  invalid_code: "That code was not recognised. Check it and try again.",
  expired: "That code has expired. Start sign-in again in the app.",
  already_used: "That code has already been used.",
  no_access: "Your account does not currently have beta access.",
  rate_limited: "Too many attempts. Wait a few minutes and try again.",
};

interface Props {
  searchParams: Promise<{ code?: string; error?: string; done?: string }>;
}

function Notice({ error, done }: { error?: string; done?: string }) {
  if (done) {
    return (
      <p className="alert alert-ok" role="status">
        {done === "approved"
          ? "Device approved. Return to the extynt app; it will finish signing in."
          : "Device denied."}
      </p>
    );
  }
  return error ? (
    <p className="alert alert-bad" role="alert">
      {MESSAGES[error] ?? "Something went wrong."}
    </p>
  ) : null;
}

async function resolveLookup(args: {
  viewer: Viewer;
  code?: string;
  error?: string;
  done?: string;
  now: Date;
}) {
  const { viewer, code, error, done, now } = args;
  const env = getEnv();
  const store = getStore();
  if (!code || done) return { pending: null, lookupError: error };
  if (!(await allow(store, LIMITS.activate, viewer.id, now, env.authSecret))) {
    return { pending: null, lookupError: "rate_limited" };
  }
  const found = await lookupUserCode(store, viewer, code, env, now);
  return found.ok
    ? { pending: found.code, lookupError: error }
    : { pending: null, lookupError: found.error };
}

export default async function ActivatePage({ searchParams }: Props) {
  const { code, error, done } = await searchParams;
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  const now = new Date();
  const { pending, lookupError } = await resolveLookup({ viewer, code, error, done, now });
  return (
    <div className="wrap page">
      <div className="page-narrow">
        <p className="eyebrow">device sign-in</p>
        <h1>Activate a device</h1>
        <Notice error={lookupError} done={done} />
        {pending && code ? (
          <form className="form" action={decideAction}>
            <p className="lead">Is this the device you are signing in?</p>
            <p className="code">{formatUserCode(normalizeUserCode(code))}</p>
            <p>
              {pending.deviceName ?? "Unnamed device"}
              {pending.platform ? ` · ${pending.platform}` : ""}
              {pending.appVersion ? ` · extynt ${pending.appVersion}` : ""}
            </p>
            <input type="hidden" name="code" value={code} />
            <div className="hero-actions">
              <button className="btn btn-primary" name="decision" value="approve" type="submit">
                Approve this device
              </button>
              <button className="btn" name="decision" value="deny" type="submit">
                Deny
              </button>
            </div>
          </form>
        ) : (
          !done && (
            <form className="form" method="get" action="/activate">
              <p className="lead">Enter the code shown in the extynt app.</p>
              <div className="field">
                <label htmlFor="code">Code</label>
                <input
                  className="input"
                  id="code"
                  name="code"
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  maxLength={12}
                  required
                />
              </div>
              <div>
                <button className="btn btn-primary" type="submit">
                  Continue
                </button>
              </div>
            </form>
          )
        )}
      </div>
    </div>
  );
}

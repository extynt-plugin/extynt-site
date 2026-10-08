"use client";

import { useActionState } from "react";
import { AE_VERSIONS, OPERATING_SYSTEMS } from "@/lib/validation";
import { applyAction, type ApplyState } from "./actions";

const msg = (e: Record<string, string>, key: string, text: string) => (key in e ? text : undefined);

const initial: ApplyState = { status: "idle", fields: {} };

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p className="error" id={id}>
      {message}
    </p>
  ) : null;
}

function ChoiceFields({ e }: { e: Record<string, string> }) {
  return (
    <>
      <fieldset className="field" aria-describedby="ae-err">
        <legend>After Effects version(s)</legend>
        <div className="choices">
          {AE_VERSIONS.map((v) => (
            <label className="choice" key={v}>
              <input type="checkbox" name="aeVersions" value={v} /> {v}
            </label>
          ))}
        </div>
        <FieldError id="ae-err" message={msg(e, "aeVersions", "Choose at least one.")} />
      </fieldset>
      <fieldset className="field" aria-describedby="os-err">
        <legend>Operating system</legend>
        <div className="choices">
          {OPERATING_SYSTEMS.map((v) => (
            <label className="choice" key={v}>
              <input type="radio" name="os" value={v} /> {v}
            </label>
          ))}
        </div>
        <FieldError id="os-err" message={msg(e, "os", "Choose one.")} />
      </fieldset>
    </>
  );
}

function ApplyFields({ e }: { e: Record<string, string> }) {
  return (
    <>
      <div className="field">
        <label htmlFor="name">Name</label>
        <input
          className="input"
          id="name"
          name="name"
          autoComplete="name"
          required
          maxLength={120}
          aria-describedby="name-err"
        />
        <FieldError id="name-err" message={msg(e, "name", "Enter your name.")} />
      </div>
      <div className="field">
        <label htmlFor="email">Email</label>
        <input
          className="input"
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          aria-describedby="email-err"
        />
        <FieldError id="email-err" message={msg(e, "email", "Enter a valid email address.")} />
      </div>
      <ChoiceFields e={e} />
      <div className="field">
        <label htmlFor="work">What do you make in After Effects?</label>
        <textarea
          className="textarea"
          id="work"
          name="work"
          required
          maxLength={1000}
          aria-describedby="work-err"
        />
        <FieldError
          id="work-err"
          message={msg(e, "work", "Tell us briefly (up to 1000 characters).")}
        />
      </div>
      <div className="field">
        <label htmlFor="portfolioUrl">Portfolio link (optional)</label>
        <input
          className="input"
          id="portfolioUrl"
          name="portfolioUrl"
          type="url"
          inputMode="url"
          maxLength={300}
          aria-describedby="url-err"
        />
        <FieldError
          id="url-err"
          message={msg(e, "portfolioUrl", "Use a full link starting with https://")}
        />
      </div>
      <div className="trap" aria-hidden="true">
        <label htmlFor="website">Leave this field empty</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="field">
        <label className="choice">
          <input type="checkbox" name="consent" aria-describedby="consent-err" /> I agree that
          extynt stores this application to decide on beta access, as described in the privacy note.
        </label>
        <FieldError id="consent-err" message={msg(e, "consent", "Consent is needed to apply.")} />
      </div>
    </>
  );
}

export function ApplyForm() {
  const [state, action, pending] = useActionState(applyAction, initial);
  if (state.status === "done") {
    return (
      <div className="alert alert-ok" role="status">
        <strong>Application received.</strong> We review applications by hand. If you are accepted
        you will get an email with a sign-in link.
      </div>
    );
  }

  return (
    <form className="form" action={action} noValidate>
      {state.status === "rate_limited" && (
        <p className="alert alert-bad" role="alert">
          Too many attempts from your network. Please try again later.
        </p>
      )}
      {state.status === "error" && (
        <p className="alert alert-bad" role="alert">
          Something went wrong on our side. Please try again.
        </p>
      )}
      <ApplyFields e={state.fields} />
      <div>
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? "Sending…" : "Send application"}
        </button>
      </div>
    </form>
  );
}

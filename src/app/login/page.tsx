import type { Metadata } from "next";
import Link from "next/link";
import { requestLink } from "./actions";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ invalid?: string }>;
}) {
  const { invalid } = await searchParams;
  return (
    <div className="wrap page">
      <div className="page-narrow">
        <p className="eyebrow">beta accounts</p>
        <h1>Sign in</h1>
        <p className="lead">
          Enter the email your beta invitation went to and we will send a sign-in link. There are no
          passwords. No access yet? <Link href="/apply">Apply for the beta</Link>.
        </p>
        {invalid && (
          <p className="alert alert-bad" role="alert">
            Enter a valid email address.
          </p>
        )}
        <form className="form" action={requestLink}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              className="input"
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          </div>
          <div>
            <button className="btn btn-primary" type="submit">
              Email me a sign-in link
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <div className="wrap page">
      <div className="page-narrow prose">
        <p className="eyebrow">privacy</p>
        <h1>What extynt stores</h1>
        <p className="lead">
          This note covers the website, the beta application and beta accounts. It lists everything
          those store.
        </p>

        <h2>The application form</h2>
        <p>When you apply we store what you type, plus the time you agreed:</p>
        <ul>
          <li>name, email, After Effects version(s), operating system;</li>
          <li>what you make in After Effects, and an optional portfolio link;</li>
          <li>
            the time of your consent, the status of your application and when it was reviewed.
          </li>
        </ul>
        <p>
          It is used only to decide on beta access and to email you about it. Rate limiting keeps a
          one-way hash of your IP address and a counter, not the address itself.
        </p>

        <h2>Accounts</h2>
        <ul>
          <li>Sign-in is by emailed link only. There are no passwords.</li>
          <li>We store your email, your sign-in sessions and one-time link tokens.</li>
          <li>
            A tester record holds your email, whether access is active or revoked, and when your
            access ends.
          </li>
          <li>
            When you sign in the desktop app, a device record holds the device name, platform and
            app version the app reports, a hash of a machine identifier (never the identifier
            itself), when the device was added and when it last checked in.
          </li>
        </ul>

        <h2>Email</h2>
        <p>
          Sign-in and invitation emails are sent through Resend. The site is hosted on Vercel and
          its data is held in a Neon Postgres database.
        </p>

        <h2>Your prompts and projects</h2>
        <p>
          extynt is bring-your-own-model and does not run or bill AI usage. The extynt sidecar runs
          on your computer and, in the current build, sends model requests straight to the provider
          you configured. Those requests do not pass through extynt&apos;s servers, and we do not
          receive your prompts, project contents or API keys. What your chosen provider does with
          them is governed by that provider&apos;s terms.
        </p>

        <h2>Cookies and analytics</h2>
        <p>
          The only cookie is the session cookie set when you sign in. The site has no analytics or
          advertising trackers.
        </p>

        <h2>Deletion</h2>
        <p>
          To have your application or account removed, reply to any email we sent you and we will
          delete the records listed above.
        </p>
      </div>
    </div>
  );
}

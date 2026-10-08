export interface Mail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface MailConfig {
  apiKey: string;
  from: string;
}

export async function sendMail(mail: Mail, cfg: MailConfig): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: cfg.from, ...mail }),
  });
  if (!res.ok) throw new Error(`Email send failed with status ${res.status}`);
}

const escape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function signInMail(to: string, url: string): Mail {
  const text = `Sign in to extynt:\n\n${url}\n\nThe link works once and expires soon. If you did not ask for it, ignore this email.`;
  const html = `<p>Sign in to extynt:</p><p><a href="${escape(url)}">Sign in</a></p><p>The link works once and expires soon. If you did not ask for it, ignore this email.</p>`;
  return { to, subject: "Sign in to extynt", text, html };
}

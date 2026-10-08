const items = [
  {
    q: "Which platforms and versions?",
    a: "The beta targets macOS and Windows with After Effects 25 and 26.",
  },
  {
    q: "Does extynt run or bill AI usage?",
    a: "No. extynt is bring-your-own-model. You connect your own provider and key, or let Claude or Codex drive After Effects through extynt's MCP server. Model usage is between you and your provider.",
  },
  {
    q: "Where do my prompts go?",
    a: "extynt's local sidecar runs on your computer and sends model requests straight to the provider you configured. They do not pass through extynt's servers. See the privacy note for exactly what the website and your account store.",
  },
  {
    q: "Can it break my project?",
    a: "Changes are bounded, checked against the live project, applied as one undo step, and recorded in a receipt. extynt can undo its own work. It is beta software, so keep your usual backups.",
  },
  {
    q: "How does access work?",
    a: "Apply on this site. If you are accepted you receive an email with a sign-in link. Beta access has an end date.",
  },
];

export function Faq() {
  return (
    <div className="faq">
      {items.map((item) => (
        <details key={item.q}>
          <summary>{item.q}</summary>
          <p>{item.a}</p>
        </details>
      ))}
    </div>
  );
}

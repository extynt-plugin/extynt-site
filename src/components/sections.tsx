const steps = [
  {
    n: "01",
    title: "Read",
    body: "extynt reads the whole project natively, with per-layer hashes so it knows what changed.",
  },
  {
    n: "02",
    title: "Plan",
    body: "You describe a change. extynt resolves the exact targets and shows a plan before anything runs.",
  },
  {
    n: "03",
    title: "Apply",
    body: "The plan runs as one undoable step, is verified against the live project, and leaves a receipt with before and after frames.",
  },
  { n: "04", title: "Undo", body: "extynt can undo its own work, one step at a time." },
];

const facts = [
  { value: "121 ms", label: "whole-project read, round trip" },
  { value: "30 ms", label: "apply one edit and verify natively" },
  { value: "37 ms", label: "undo one step, round trip" },
];

export function HowItWorks() {
  return (
    <>
      <section className="section" aria-labelledby="how">
        <p className="eyebrow">how it works</p>
        <h2 id="how">Precise, then reversible.</h2>
        <p className="lead">
          A model proposes intent. Deterministic software controls what actually runs in your
          project.
        </p>
        <div className="grid cols-4">
          {steps.map((s) => (
            <article className="card" key={s.n}>
              <span className="step-n">{s.n}</span>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

export function Speed() {
  return (
    <>
      <section className="section" aria-labelledby="speed">
        <p className="eyebrow">speed</p>
        <h2 id="speed">Native, not scripted.</h2>
        <p className="lead">
          A native After Effects plugin does the reading and verifying, so checking is cheap enough
          to do every time.
        </p>
        <dl className="facts">
          {facts.map((f) => (
            <div className="fact" key={f.label}>
              <dt className="sr-only">{f.label}</dt>
              <dd style={{ margin: 0 }}>
                <b>{f.value}</b>
                <span>{f.label}</span>
              </dd>
            </div>
          ))}
        </dl>
        <p className="note">
          Measured in development on one Mac (Apple M4 Pro, After Effects 26.2.1). Your numbers will
          depend on your machine and project. Windows has not been measured yet.
        </p>
      </section>
    </>
  );
}

export function BringYourOwnModel() {
  return (
    <>
      <section className="section" aria-labelledby="byom">
        <p className="eyebrow">bring your own model</p>
        <h2 id="byom">You choose the model. extynt never runs or bills it.</h2>
        <div className="grid cols-2">
          <article className="card">
            <h3>Your provider, your key</h3>
            <p>
              Connect a model service you already use, such as OpenAI, Anthropic, xAI, DeepSeek or
              OpenRouter, or a local Ollama or other OpenAI-compatible endpoint.
            </p>
          </article>
          <article className="card">
            <h3>Or drive it from Claude or Codex</h3>
            <p>
              extynt includes an MCP server, so Claude or Codex can read and change your project
              through the same bounded, undoable tools.
            </p>
          </article>
        </div>
      </section>
    </>
  );
}

import Link from "next/link";
import { PanelMock } from "@/components/PanelMock";
import { Faq } from "@/components/Faq";
import { BringYourOwnModel, HowItWorks, Speed } from "@/components/sections";

export default function Home() {
  return (
    <div className="wrap">
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <span className="pill">Closed beta coming</span>
          <h1 id="hero-title">An After Effects copilot that shows its work.</h1>
          <p className="lead">
            extynt lives in a docked panel inside After Effects. It reads your project, proposes a
            plan, applies it in one undoable step, and keeps a receipt. It can undo its own work.
          </p>
          <div className="hero-actions">
            <Link className="btn btn-primary" href="/apply">
              Apply for the beta
            </Link>
            <span className="hint">macOS and Windows · After Effects 25 and 26</span>
          </div>
        </div>
        <PanelMock />
      </section>

      <HowItWorks />
      <Speed />
      <BringYourOwnModel />
      <section className="section" aria-labelledby="faq">
        <p className="eyebrow">questions</p>
        <h2 id="faq">Before you apply</h2>
        <Faq />
      </section>

      <section className="section">
        <div className="cta">
          <h2>Join the closed beta</h2>
          <p className="lead" style={{ marginInline: "auto" }}>
            Tell us what you make in After Effects. Applications are reviewed by hand and access is
            granted in waves.
          </p>
          <Link className="btn btn-primary" href="/apply">
            Apply for the beta
          </Link>
        </div>
      </section>
    </div>
  );
}

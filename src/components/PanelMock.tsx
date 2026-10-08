// Illustrative HTML/CSS recreation of the panel for the hero. OWNER: replace with a real
// screenshot (public/panel-hero.png) once one exists; the caption below says it is illustrative.
export function PanelMock() {
  return (
    <figure
      className="mock-wrap"
      aria-label="Illustration of the extynt panel inside After Effects"
    >
      <span className="mock-label">illustrative recreation</span>
      <div className="mock" aria-hidden="true">
        <div className="mock-head">
          <span className="mock-dot" />
          <span className="mock-title">extynt</span>
          <span className="mock-sub">Main comp · 3 selected</span>
        </div>
        <div className="mock-body">
          <div className="mock-user">Stagger the selected layers by 3 frames</div>
          <p className="mock-reply">Here is the change I would make to the 3 selected layers.</p>
          <div className="mock-card">
            <div className="mock-card-head">
              <span>Stagger 3 layers</span>
              <span className="mock-status">Applied and checked</span>
            </div>
            <ul className="mock-ops">
              <li>
                <b>Layer 1</b> start 0f
              </li>
              <li>
                <b>Layer 2</b> start 3f
              </li>
              <li>
                <b>Layer 3</b> start 6f
              </li>
            </ul>
            <div className="mock-frames">
              <div className="mock-frame" data-label="Before" />
              <div className="mock-frame after" data-label="After" />
            </div>
            <div className="mock-actions">
              <span className="mock-undo">Undo</span>
              <span>Receipt</span>
            </div>
          </div>
        </div>
        <div className="mock-composer">
          <span className="mock-context">Main comp · 3 layers selected</span>
          <span className="mock-input">Ask or describe a change</span>
        </div>
      </div>
    </figure>
  );
}

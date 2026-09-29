export default function ProofStrip() {
  return (
    <>
      <section className="proof reveal" id="proof">
        <div className="container">
          <div className="proof-cards">
            <div className="proof-card reveal">
              <div className="proof-num">~300</div>
              <p className="proof-desc">tokens to answer &quot;do we have JWT auth?&quot;</p>
            </div>
            <div className="proof-card reveal" data-delay="1">
              <div className="proof-num">0</div>
              <p className="proof-desc">lines generated when a piece already exists</p>
            </div>
            <div className="proof-card reveal" data-delay="2">
              <div className="proof-num">1</div>
              <p className="proof-desc">command to reuse it</p>
            </div>
          </div>
          <div className="sage-bar reveal">
            Launching soon — the binary ships with Phase A.
            <a href="#launch" className="btn-text">Join the waitlist →</a>
          </div>
        </div>
      </section>
    </>
  );
}

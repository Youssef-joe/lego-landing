export default function Inside() {
  return (
    <>
      <section id="inside" className="section-gap has-bricks">
        <div className="bg-bricks" aria-hidden="true">
          <span className="bg-brick" style={{ left: "8.6%", top: "42.4%", "--w": "2", "--r": "16.3deg", "--z": "0.92", "--bc": "var(--terracotta)", "--d": "22.2s", "--dl": "-0.2s", "--fx": "-11px", "--fy": "-12px", "--rw": "1.7deg" } as React.CSSProperties}></span>
          <span className="bg-brick" style={{ left: "41.7%", top: "93.3%", "--w": "2", "--r": "-5.7deg", "--z": "0.93", "--bc": "var(--terracotta)", "--d": "25.2s", "--dl": "-20.2s", "--fx": "-0px", "--fy": "-12px", "--rw": "-0.3deg" } as React.CSSProperties}></span>
          <span className="bg-brick" style={{ left: "57.2%", top: "92.0%", "--w": "4", "--r": "4.2deg", "--z": "0.77", "--bc": "var(--terracotta)", "--d": "19.0s", "--dl": "-17.1s", "--fx": "10px", "--fy": "-17px", "--rw": "1.3deg" } as React.CSSProperties}></span>
          <span className="bg-brick" style={{ left: "14.7%", top: "8.2%", "--w": "4", "--r": "23.8deg", "--z": "1.10", "--bc": "var(--ochre)", "--d": "16.0s", "--dl": "-16.1s", "--fx": "-1px", "--fy": "-12px", "--rw": "-4.5deg" } as React.CSSProperties}></span>
          <span className="bg-brick" style={{ left: "3.3%", top: "2.6%", "--w": "3", "--r": "-0.5deg", "--z": "1.22", "--bc": "var(--terracotta)", "--d": "24.4s", "--dl": "-8.1s", "--fx": "3px", "--fy": "-10px", "--rw": "1.4deg" } as React.CSSProperties}></span>
          <span className="bg-brick" style={{ left: "92.1%", top: "79.0%", "--w": "4", "--r": "-17.9deg", "--z": "1.16", "--bc": "var(--sage)", "--d": "24.9s", "--dl": "-5.5s", "--fx": "-1px", "--fy": "-14px", "--rw": "3.3deg" } as React.CSSProperties}></span>
          <span className="bg-brick" style={{ left: "2.7%", top: "33.7%", "--w": "3", "--r": "17.1deg", "--z": "0.81", "--bc": "var(--terracotta)", "--d": "18.2s", "--dl": "-13.1s", "--fx": "11px", "--fy": "-14px", "--rw": "-4.4deg" } as React.CSSProperties}></span>
          <span className="bg-brick" style={{ left: "89.4%", top: "62.5%", "--w": "4", "--r": "10.2deg", "--z": "0.80", "--bc": "var(--terracotta)", "--d": "20.2s", "--dl": "-6.8s", "--fx": "-3px", "--fy": "-19px", "--rw": "-6.4deg" } as React.CSSProperties}></span>
        </div>
        <div className="container">
          <div className="reveal">
            <p className="section-eyebrow">Architecture</p>
            <h2 style={{ textAlign: "center", maxWidth: "24ch", margin: "0 auto" } as React.CSSProperties}>Boring on purpose: files in git, one SQLite index, one binary.</h2>
          </div>

          <div className="reveal inside-grid">
            <div className="card">
              <span style={{ fontSize: "14px", fontWeight: "500", color: "var(--terracotta-d)", marginBottom: "12px", display: "block" } as React.CSSProperties}>Truth</span>
              <h3>The Vault is a git directory</h3>
              <p style={{ marginTop: "12px", fontSize: "16px" } as React.CSSProperties}>Plain files you can read, diff, review and revert. History is git history.</p>
            </div>
            <div className="card">
              <span style={{ fontSize: "14px", fontWeight: "500", color: "var(--terracotta-d)", marginBottom: "12px", display: "block" } as React.CSSProperties}>Index</span>
              <h3>One index.db</h3>
              <p style={{ marginTop: "12px", fontSize: "16px" } as React.CSSProperties}>sqlite-vec plus FTS5, zero runtime dependencies. Delete it and it rebuilds.</p>
            </div>

          </div>
          
          <p className="reveal" style={{ textAlign: "center", marginTop: "48px", fontSize: "18px", color: "var(--body)" } as React.CSSProperties}>Embedding generation is the only step that touches a network, and it is always skippable.</p>
        </div>
      </section>
    </>
  );
}

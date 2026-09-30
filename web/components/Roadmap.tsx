export default function Roadmap() {
  return (
    <>
      <section className="section-gap has-bricks">
        <div className="bg-bricks" aria-hidden="true">
          <span className="bg-brick" style={{ left: "35.1%", top: "91.6%", "--w": "2", "--r": "-23.4deg", "--z": "0.93", "--bc": "var(--terracotta)", "--d": "23.9s", "--dl": "-9.8s", "--fx": "10px", "--fy": "-14px", "--rw": "1.3deg" } as React.CSSProperties}></span>
          <span className="bg-brick" style={{ left: "11.1%", top: "69.9%", "--w": "2", "--r": "18.6deg", "--z": "0.90", "--bc": "var(--sage)", "--d": "22.3s", "--dl": "-18.1s", "--fx": "8px", "--fy": "-15px", "--rw": "2.0deg" } as React.CSSProperties}></span>
          <span className="bg-brick" style={{ left: "92.7%", top: "55.9%", "--w": "3", "--r": "-4.2deg", "--z": "1.01", "--bc": "var(--sage)", "--d": "27.2s", "--dl": "-16.0s", "--fx": "3px", "--fy": "-19px", "--rw": "3.5deg" } as React.CSSProperties}></span>
          <span className="bg-brick" style={{ left: "68.4%", top: "8.1%", "--w": "4", "--r": "-5.6deg", "--z": "0.85", "--bc": "var(--sage)", "--d": "23.1s", "--dl": "-19.7s", "--fx": "6px", "--fy": "-17px", "--rw": "5.6deg" } as React.CSSProperties}></span>
          <span className="bg-brick" style={{ left: "72.6%", top: "4.0%", "--w": "4", "--r": "-15.3deg", "--z": "0.88", "--bc": "var(--ochre)", "--d": "16.7s", "--dl": "-5.7s", "--fx": "7px", "--fy": "-16px", "--rw": "6.6deg" } as React.CSSProperties}></span>
          <span className="bg-brick" style={{ left: "34.4%", top: "91.6%", "--w": "3", "--r": "14.0deg", "--z": "1.07", "--bc": "var(--terracotta)", "--d": "17.3s", "--dl": "-16.6s", "--fx": "-9px", "--fy": "-11px", "--rw": "-0.2deg" } as React.CSSProperties}></span>
          <span className="bg-brick" style={{ left: "6.7%", top: "90.0%", "--w": "4", "--r": "-14.6deg", "--z": "0.83", "--bc": "var(--sage)", "--d": "22.6s", "--dl": "-11.1s", "--fx": "10px", "--fy": "-15px", "--rw": "1.2deg" } as React.CSSProperties}></span>
          <span className="bg-brick" style={{ left: "13.5%", top: "87.0%", "--w": "4", "--r": "2.1deg", "--z": "1.03", "--bc": "var(--ochre)", "--d": "21.5s", "--dl": "-18.1s", "--fx": "0px", "--fy": "-18px", "--rw": "-5.7deg" } as React.CSSProperties}></span>
        </div>
        <div className="container">
          <div className="reveal">
            <p className="section-eyebrow">Roadmap</p>
            <h2 style={{ textAlign: "center", maxWidth: "22ch", margin: "0 auto", marginBottom: "64px" } as React.CSSProperties}>Four phases, in this order.</h2>
          </div>

          <div className="reveal roadmap-grid">
            <div className="card" style={{ background: "var(--wash-ochre)" } as React.CSSProperties}>
              <span className="chip chip-sage" style={{ marginBottom: "16px" } as React.CSSProperties}>A · Now</span>
              <h3>Knowledge layer</h3>
              <p style={{ marginTop: "12px", fontSize: "16px" } as React.CSSProperties}>Summaries at capture · meaning-based search · the MCP server.</p>
            </div>
            <div className="card">
              <span className="chip" style={{ marginBottom: "16px" } as React.CSSProperties}>B</span>
              <h3>AI piece kinds</h3>
              <p style={{ marginTop: "12px", fontSize: "16px" } as React.CSSProperties}>Prompts and agent skills captured and versioned like code.</p>
            </div>
            <div className="card">
              <span className="chip" style={{ marginBottom: "16px" } as React.CSSProperties}>C</span>
              <h3>Accounting & graph</h3>
              <p style={{ marginTop: "12px", fontSize: "16px" } as React.CSSProperties}>What was reused where, and what depends on what.</p>
            </div>
            <div className="card">
              <span className="chip" style={{ marginBottom: "16px" } as React.CSSProperties}>D</span>
              <h3>Team scale</h3>
              <p style={{ marginTop: "12px", fontSize: "16px" } as React.CSSProperties}>Shared Vaults, review flow, an optional hosted tier.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default function Problem() {
  return (
    <>
      <section id="problem" className="section-gap has-bricks">
        <div className="bg-bricks" aria-hidden="true">
          <span className="bg-brick" style={{ left: "91.6%", top: "44.3%", "--w": "4", "--r": "1.3deg", "--z": "1.06", "--bc": "var(--terracotta)", "--d": "18.2s", "--dl": "-6.7s", "--fx": "-7px", "--fy": "-9px", "--rw": "1.3deg" } as React.CSSProperties}></span>
          <span className="bg-brick" style={{ left: "56.1%", top: "95.4%", "--w": "2", "--r": "23.9deg", "--z": "1.23", "--bc": "var(--ochre)", "--d": "15.7s", "--dl": "-18.9s", "--fx": "-3px", "--fy": "-11px", "--rw": "-7.0deg" } as React.CSSProperties}></span>
          <span className="bg-brick" style={{ left: "77.0%", top: "21.7%", "--w": "2", "--r": "-6.2deg", "--z": "0.86", "--bc": "var(--sage)", "--d": "22.3s", "--dl": "-20.3s", "--fx": "7px", "--fy": "-17px", "--rw": "-1.2deg" } as React.CSSProperties}></span>
          <span className="bg-brick" style={{ left: "77.4%", top: "26.6%", "--w": "3", "--r": "-16.2deg", "--z": "0.92", "--bc": "var(--ochre)", "--d": "23.7s", "--dl": "-20.3s", "--fx": "-2px", "--fy": "-10px", "--rw": "2.0deg" } as React.CSSProperties}></span>
          <span className="bg-brick" style={{ left: "31.7%", top: "4.4%", "--w": "2", "--r": "13.5deg", "--z": "1.05", "--bc": "var(--ochre)", "--d": "24.2s", "--dl": "-15.9s", "--fx": "6px", "--fy": "-10px", "--rw": "5.2deg" } as React.CSSProperties}></span>
          <span className="bg-brick" style={{ left: "48.1%", top: "2.6%", "--w": "2", "--r": "-2.4deg", "--z": "1.19", "--bc": "var(--ochre)", "--d": "26.1s", "--dl": "-18.9s", "--fx": "0px", "--fy": "-17px", "--rw": "-3.3deg" } as React.CSSProperties}></span>
          <span className="bg-brick" style={{ left: "-2.2%", top: "28.6%", "--w": "2", "--r": "3.0deg", "--z": "1.00", "--bc": "var(--sage)", "--d": "25.6s", "--dl": "-3.5s", "--fx": "-10px", "--fy": "-14px", "--rw": "0.8deg" } as React.CSSProperties}></span>
          <span className="bg-brick" style={{ left: "96.9%", top: "78.5%", "--w": "3", "--r": "-0.2deg", "--z": "1.03", "--bc": "var(--terracotta)", "--d": "23.1s", "--dl": "-13.7s", "--fx": "-8px", "--fy": "-17px", "--rw": "-0.3deg" } as React.CSSProperties}></span>
        </div>
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: "48px" } as React.CSSProperties} className="reveal">
            <span className="chip">For engineering leaders</span>
          </div>
          <h2 className="reveal" style={{ textAlign: "center", maxWidth: "22ch", margin: "0 auto" } as React.CSSProperties}>Every team rebuilds the same things. Then their AI rebuilds them again.</h2>
          <p className="reveal" style={{ textAlign: "center", margin: "24px auto 0", fontSize: "20px", lineHeight: "1.5", maxWidth: "60ch", color: "var(--body)" } as React.CSSProperties}>The auth module your team perfected two projects ago still exists — buried in that repo, tangled with its dependencies, invisible to search. So the next project writes a new one, and an assistant asked the same question writes a third.</p>

          {/* 3 wash cards */}
          <div className="reveal problem-grid">
            <div className="card" style={{ background: "var(--wash-ochre)" } as React.CSSProperties}>
              <h3>Knowledge nobody can find</h3>
              <p style={{ marginTop: "12px" } as React.CSSProperties}>It is in a repo, in a head, or in a pull request from 2023 — never in one searchable place.</p>
            </div>
            <div className="card" style={{ background: "var(--wash-sage)" } as React.CSSProperties}>
              <h3>AI that regenerates</h3>
              <p style={{ marginTop: "12px" } as React.CSSProperties}>An assistant with no memory of what you own writes a fresh version every time it is asked.</p>
            </div>
            <div className="card" style={{ background: "var(--wash-terracotta)" } as React.CSSProperties}>
              <h3>Why it matters now</h3>
              <p style={{ marginTop: "12px" } as React.CSSProperties}>Generation is cheap; review is not. Every regenerated module is another one to maintain.</p>
            </div>
          </div>



          {/* Closing line */}
          <h2 className="h2-sm reveal" style={{ textAlign: "center", marginTop: "80px", maxWidth: "24ch", marginLeft: "auto", marginRight: "auto" } as React.CSSProperties}>The knowledge was never lost. It was never findable.</h2>
        </div>
      </section>
    </>
  );
}

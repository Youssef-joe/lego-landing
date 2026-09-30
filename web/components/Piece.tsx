'use client';

import { useRef } from 'react';
import { useTabs } from '@/lib/useTabs';

const levelPanel = (value: string) => 'level-' + value;

export default function Piece() {
  const tabsRef = useRef<HTMLDivElement>(null);
  useTabs(tabsRef, 'level', levelPanel);

  return (
    <>
      <section id="piece" className="section-gap has-bricks">
        <div className="bg-bricks" aria-hidden="true">
          <span className="bg-brick" style={{ left: "79.3%", top: "36.1%", "--w": "4", "--r": "10.6deg", "--z": "0.82", "--bc": "var(--terracotta)", "--d": "22.5s", "--dl": "-6.1s", "--fx": "-8px", "--fy": "-17px", "--rw": "2.4deg" } as React.CSSProperties}></span>
          <span className="bg-brick" style={{ left: "91.5%", top: "93.4%", "--w": "4", "--r": "-15.8deg", "--z": "0.75", "--bc": "var(--ochre)", "--d": "15.7s", "--dl": "-1.6s", "--fx": "-6px", "--fy": "-9px", "--rw": "-0.9deg" } as React.CSSProperties}></span>
          <span className="bg-brick" style={{ left: "87.5%", top: "36.1%", "--w": "3", "--r": "13.9deg", "--z": "1.20", "--bc": "var(--sage)", "--d": "22.1s", "--dl": "-9.1s", "--fx": "7px", "--fy": "-10px", "--rw": "-1.3deg" } as React.CSSProperties}></span>
          <span className="bg-brick" style={{ left: "77.5%", top: "39.3%", "--w": "2", "--r": "0.4deg", "--z": "1.16", "--bc": "var(--terracotta)", "--d": "21.2s", "--dl": "-5.0s", "--fx": "-7px", "--fy": "-11px", "--rw": "6.1deg" } as React.CSSProperties}></span>
          <span className="bg-brick" style={{ left: "88.2%", top: "6.5%", "--w": "3", "--r": "12.8deg", "--z": "1.21", "--bc": "var(--sage)", "--d": "26.0s", "--dl": "-9.7s", "--fx": "-8px", "--fy": "-13px", "--rw": "4.8deg" } as React.CSSProperties}></span>
          <span className="bg-brick" style={{ left: "76.2%", top: "35.9%", "--w": "2", "--r": "15.3deg", "--z": "1.04", "--bc": "var(--ochre)", "--d": "23.9s", "--dl": "-5.9s", "--fx": "6px", "--fy": "-18px", "--rw": "-0.4deg" } as React.CSSProperties}></span>
          <span className="bg-brick" style={{ left: "32.7%", top: "8.4%", "--w": "4", "--r": "10.8deg", "--z": "0.81", "--bc": "var(--ochre)", "--d": "21.9s", "--dl": "-10.4s", "--fx": "11px", "--fy": "-14px", "--rw": "1.5deg" } as React.CSSProperties}></span>
          <span className="bg-brick" style={{ left: "97.4%", top: "18.9%", "--w": "4", "--r": "12.4deg", "--z": "0.98", "--bc": "var(--ochre)", "--d": "18.2s", "--dl": "-11.9s", "--fx": "-7px", "--fy": "-12px", "--rw": "1.1deg" } as React.CSSProperties}></span>
        </div>
        <div className="container">
          <div className="reveal">
            <p className="section-eyebrow">Layers</p>
            <h2 style={{ textAlign: "center", maxWidth: "24ch", margin: "0 auto" } as React.CSSProperties}>Code, plus everything you'd otherwise have to ask a colleague about.</h2>
          </div>

          <div className="reveal inside-grid">
            {/* File tree */}
            <div className="card" style={{ background: "var(--wash-sage)" } as React.CSSProperties}>
              <span style={{ fontSize: "14px", fontWeight: "500", color: "var(--terracotta-d)", marginBottom: "16px", display: "block" } as React.CSSProperties}>On disk</span>
              <div className="card-inset" style={{ fontFamily: "var(--ff-mono)", fontSize: "14px", lineHeight: "2", color: "var(--ink)" } as React.CSSProperties}>
                vault/pieces/auth/0.2.0/<br />
                ├── card.md&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;~50 tokens<br />
                ├── surface.md&nbsp;&nbsp;&nbsp;~200–400<br />
                ├── summary.md&nbsp;&nbsp;&nbsp;~500<br />
                ├── piece.toml<br />
                └── src/<br />
                &nbsp;&nbsp;&nbsp;&nbsp;├── auth.module.ts<br />
                &nbsp;&nbsp;&nbsp;&nbsp;├── jwt.strategy.ts<br />
                &nbsp;&nbsp;&nbsp;&nbsp;└── …4 more
              </div>
            </div>

            {/* Level selector */}
            <div className="card">
              <div role="tablist" aria-label="Detail level" style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "24px" } as React.CSSProperties} id="level-tabs" ref={tabsRef}>
                <button role="tab" aria-selected="true" className="chip" style={{ cursor: "pointer", background: "var(--terracotta)", color: "var(--on-dark)", borderColor: "var(--terracotta)" } as React.CSSProperties} data-level="card">Card ~50</button>
                <button role="tab" aria-selected="false" className="chip" style={{ cursor: "pointer" } as React.CSSProperties} data-level="surface">Surface ~200–400</button>
                <button role="tab" aria-selected="false" className="chip" style={{ cursor: "pointer" } as React.CSSProperties} data-level="summary">Summary ~500</button>
                <button role="tab" aria-selected="false" className="chip" style={{ cursor: "pointer" } as React.CSSProperties} data-level="source">Source</button>
              </div>

              <div id="level-card" className="level-panel">
                <p style={{ fontFamily: "var(--ff-head)", fontSize: "28px", fontWeight: "500", color: "var(--ink)", lineHeight: "1.2", marginBottom: "20px" } as React.CSSProperties}>"Do we have something for X?"</p>
                <div className="card-inset" style={{ fontFamily: "var(--ff-mono)", fontSize: "14px", lineHeight: "1.7", color: "var(--ink)" } as React.CSSProperties}>
                  auth@0.2.0<br />
                  JWT + refresh tokens for NestJS services.<br />
                  kind: code · nest, jwt, passport<br />
                  proven in 3 projects
                </div>
              </div>
              <div id="level-surface" className="level-panel" style={{ display: "none" } as React.CSSProperties}>
                <p style={{ fontFamily: "var(--ff-head)", fontSize: "28px", fontWeight: "500", color: "var(--ink)", lineHeight: "1.2", marginBottom: "20px" } as React.CSSProperties}>"How do I call it?"</p>
                <div className="card-inset" style={{ fontFamily: "var(--ff-mono)", fontSize: "14px", lineHeight: "1.7", color: "var(--ink)" } as React.CSSProperties}>The API signature, exported types, and wiring instructions.</div>
              </div>
              <div id="level-summary" className="level-panel" style={{ display: "none" } as React.CSSProperties}>
                <p style={{ fontFamily: "var(--ff-head)", fontSize: "28px", fontWeight: "500", color: "var(--ink)", lineHeight: "1.2", marginBottom: "20px" } as React.CSSProperties}>"Why was it built this way?"</p>
                <div className="card-inset" style={{ fontFamily: "var(--ff-mono)", fontSize: "14px", lineHeight: "1.7", color: "var(--ink)" } as React.CSSProperties}>The human-written or AI-generated explanation of architectural choices.</div>
              </div>
              <div id="level-source" className="level-panel" style={{ display: "none" } as React.CSSProperties}>
                <p style={{ fontFamily: "var(--ff-head)", fontSize: "28px", fontWeight: "500", color: "var(--ink)", lineHeight: "1.2", marginBottom: "20px" } as React.CSSProperties}>"I need to change it."</p>
                <div className="card-inset" style={{ fontFamily: "var(--ff-mono)", fontSize: "14px", lineHeight: "1.7", color: "var(--ink)" } as React.CSSProperties}>The actual code files. Read only when a modification is necessary.</div>
              </div>
            </div>
          </div>

          {/* Level questions */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "24px", marginTop: "32px", maxWidth: "640px", marginLeft: "auto", marginRight: "auto" } as React.CSSProperties} className="reveal">
            <div style={{ textAlign: "center" } as React.CSSProperties}>
              <span style={{ fontFamily: "var(--ff-head)", fontWeight: "500", color: "var(--ink)" } as React.CSSProperties}>Surface</span>
              <p style={{ fontSize: "15px", marginTop: "4px" } as React.CSSProperties}>"How do I call it?"</p>
            </div>
            <div style={{ textAlign: "center" } as React.CSSProperties}>
              <span style={{ fontFamily: "var(--ff-head)", fontWeight: "500", color: "var(--ink)" } as React.CSSProperties}>Summary</span>
              <p style={{ fontSize: "15px", marginTop: "4px" } as React.CSSProperties}>"Why was it built this way?"</p>
            </div>

          </div>

          <p className="reveal" style={{ textAlign: "center", marginTop: "48px", fontSize: "18px", color: "var(--body)" } as React.CSSProperties}>Whoever is asking — human or AI — climbs only as high as the task needs.</p>
        </div>
      </section>
    </>
  );
}

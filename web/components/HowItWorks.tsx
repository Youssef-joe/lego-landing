'use client';

import { useRef } from 'react';
import { useTabs } from '@/lib/useTabs';
import Capture from './Capture';

// Module-level so the effect does not re-bind on every render.
const findPanel = (value: string) => value;

export default function HowItWorks() {
  const tabsRef = useRef<HTMLDivElement>(null);
  useTabs(tabsRef, 'tab', findPanel);

  return (
    <>
      <section id="how" className="section-gap has-bricks" style={{ background: "var(--wash-sage)" } as React.CSSProperties}>
        <div className="bg-bricks" aria-hidden="true">
          <span className="bg-brick" style={{ left: "31.9%", top: "89.2%", "--w": "4", "--r": "-2.3deg", "--z": "0.94", "--bc": "var(--terracotta)", "--d": "28.6s", "--dl": "-20.6s", "--fx": "-10px", "--fy": "-17px", "--rw": "3.1deg" } as React.CSSProperties}></span>
          <span className="bg-brick" style={{ left: "52.8%", top: "91.7%", "--w": "4", "--r": "-4.8deg", "--z": "1.11", "--bc": "var(--ochre)", "--d": "26.6s", "--dl": "-12.0s", "--fx": "3px", "--fy": "-15px", "--rw": "-5.1deg" } as React.CSSProperties}></span>
          <span className="bg-brick" style={{ left: "87.8%", top: "80.2%", "--w": "2", "--r": "8.6deg", "--z": "0.96", "--bc": "var(--terracotta)", "--d": "20.7s", "--dl": "-15.6s", "--fx": "3px", "--fy": "-11px", "--rw": "-4.6deg" } as React.CSSProperties}></span>
          <span className="bg-brick" style={{ left: "92.1%", top: "63.7%", "--w": "2", "--r": "11.8deg", "--z": "1.08", "--bc": "var(--sage)", "--d": "24.3s", "--dl": "-19.9s", "--fx": "8px", "--fy": "-17px", "--rw": "4.3deg" } as React.CSSProperties}></span>
          <span className="bg-brick" style={{ left: "83.7%", top: "11.1%", "--w": "4", "--r": "3.4deg", "--z": "0.80", "--bc": "var(--ochre)", "--d": "17.2s", "--dl": "-3.0s", "--fx": "3px", "--fy": "-12px", "--rw": "1.2deg" } as React.CSSProperties}></span>
          <span className="bg-brick" style={{ left: "85.8%", top: "35.0%", "--w": "3", "--r": "-20.7deg", "--z": "0.86", "--bc": "var(--ochre)", "--d": "19.3s", "--dl": "-16.3s", "--fx": "-10px", "--fy": "-14px", "--rw": "1.0deg" } as React.CSSProperties}></span>
          <span className="bg-brick" style={{ left: "76.0%", top: "76.4%", "--w": "3", "--r": "-22.1deg", "--z": "0.89", "--bc": "var(--sage)", "--d": "21.0s", "--dl": "-3.2s", "--fx": "3px", "--fy": "-20px", "--rw": "-4.9deg" } as React.CSSProperties}></span>
          <span className="bg-brick" style={{ left: "6.5%", top: "66.0%", "--w": "4", "--r": "-9.5deg", "--z": "1.17", "--bc": "var(--ochre)", "--d": "17.6s", "--dl": "-4.7s", "--fx": "9px", "--fy": "-19px", "--rw": "2.6deg" } as React.CSSProperties}></span>
        </div>
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: "48px" } as React.CSSProperties} className="reveal">
            <span className="chip">For engineers</span>
          </div>
          <h2 className="reveal" style={{ textAlign: "center", maxWidth: "22ch", margin: "0 auto" } as React.CSSProperties}>Capture once. Find it anywhere. Add it in one command.</h2>
          <p className="reveal" style={{ textAlign: "center", margin: "24px auto 0", fontSize: "20px", lineHeight: "1.5", maxWidth: "60ch", color: "var(--body)" } as React.CSSProperties}>Three verbs, one binary. Everything lives in a git folder on your machine called the Vault — no server, no account.</p>

          {/* Step 1: Capture */}
          <div className="card reveal" style={{ marginTop: "64px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px", alignItems: "start" } as React.CSSProperties}>
            <div>
              <h3>Capture</h3>
              <p style={{ marginTop: "12px" } as React.CSSProperties}>Point BWX at a folder that works. It reads the code, writes the summaries, and versions the result into the Vault as a piece.</p>
              <p style={{ marginTop: "16px", fontFamily: "var(--ff-mono)", fontSize: "14px", color: "var(--terracotta-d)" } as React.CSSProperties}>vault/pieces/auth/0.1.0/</p>
            </div>
            <Capture />
          </div>

          {/* Step 2: Find */}
          <div className="card reveal" style={{ marginTop: "24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px", alignItems: "start" } as React.CSSProperties}>
            <div>
              <h3>Find</h3>
              <p style={{ marginTop: "12px" } as React.CSSProperties}>Search by meaning, not by filename. The same index answers a human at the terminal and an assistant over MCP.</p>
              <div role="tablist" aria-label="Find mode" style={{ display: "flex", gap: "8px", marginTop: "20px" } as React.CSSProperties} id="find-tabs" ref={tabsRef}>
                <button role="tab" aria-selected="true" className="chip" style={{ cursor: "pointer", background: "var(--terracotta)", color: "var(--on-dark)", borderColor: "var(--terracotta)" } as React.CSSProperties} data-tab="find-human">Human</button>
                <button role="tab" aria-selected="false" className="chip" style={{ cursor: "pointer" } as React.CSSProperties} data-tab="find-ai">AI assistant</button>
              </div>
            </div>
            <div>
              <div className="term" id="find-human">
                <div className="term-bar"><div className="term-dot"></div><div className="term-dot"></div><div className="term-dot"></div></div>
                <div className="term-body">
                  <div className="prompt">$ brico search "token auth for nest"</div>
                  <div>  auth@0.2.0   jwt, passport, nest</div>
                  <div>    proven in 3 projects · updated 4 mo ago</div>
                  <div>  session@0.3.1 redis-backed sessions</div>
                </div>
              </div>
              <div className="term" id="find-ai" style={{ display: "none" } as React.CSSProperties}>
                <div className="term-bar"><div className="term-dot"></div><div className="term-dot"></div><div className="term-dot"></div></div>
                <div className="term-body">
                  <div className="prompt">search_pieces("token auth for nest")</div>
                  <div>  → auth@0.2.0   jwt, passport, nest</div>
                  <div>    proven in 3 projects · updated 4 mo ago</div>
                  <div>  → session@0.3.1 redis-backed sessions</div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3: Add */}
          <div className="card reveal" style={{ marginTop: "24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px", alignItems: "start" } as React.CSSProperties}>
            <div>
              <h3>Add</h3>
              <p style={{ marginTop: "12px" } as React.CSSProperties}>One command copies the piece into the project, wires what it can, and prints the steps only you can decide.</p>
              <p style={{ marginTop: "12px", fontSize: "15px", color: "var(--body)", fontStyle: "italic" } as React.CSSProperties}>No install step. No registry.</p>
            </div>
            <div className="term">
              <div className="term-bar"><div className="term-dot"></div><div className="term-dot"></div><div className="term-dot"></div></div>
              <div className="term-body">
                <div className="prompt">$ brico add auth</div>
                <div>  copied 6 files → src/auth/</div>
                <div>  wired .env.example</div>
                <div className="ok">  next: add AuthModule to AppModule imports</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

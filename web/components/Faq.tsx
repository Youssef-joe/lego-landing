'use client';

import { useState } from 'react';

export default function Faq() {
  const [open, setOpen] = useState<number | null>(null);

  const toggle = (i: number) => setOpen(open === i ? null : i);

  return (
    <>
      <section className="section-gap has-bricks">
        <div className="bg-bricks" aria-hidden="true">
          <span className="bg-brick" style={{ left: "42.8%", top: "0.1%", "--w": "4", "--r": "-12.6deg", "--z": "0.80", "--bc": "var(--ochre)", "--d": "22.1s", "--dl": "-12.8s", "--fx": "-11px", "--fy": "-20px", "--rw": "-5.2deg" } as React.CSSProperties}></span>
          <span className="bg-brick" style={{ left: "1.4%", top: "36.3%", "--w": "4", "--r": "-17.0deg", "--z": "1.20", "--bc": "var(--sage)", "--d": "16.8s", "--dl": "-11.8s", "--fx": "9px", "--fy": "-17px", "--rw": "-2.4deg" } as React.CSSProperties}></span>
          <span className="bg-brick" style={{ left: "74.6%", top: "6.2%", "--w": "2", "--r": "13.1deg", "--z": "0.97", "--bc": "var(--sage)", "--d": "19.4s", "--dl": "-14.7s", "--fx": "5px", "--fy": "-14px", "--rw": "-1.8deg" } as React.CSSProperties}></span>
          <span className="bg-brick" style={{ left: "9.8%", top: "31.6%", "--w": "2", "--r": "19.6deg", "--z": "1.13", "--bc": "var(--terracotta)", "--d": "17.8s", "--dl": "-16.9s", "--fx": "2px", "--fy": "-10px", "--rw": "0.3deg" } as React.CSSProperties}></span>
          <span className="bg-brick" style={{ left: "88.1%", top: "80.3%", "--w": "4", "--r": "-9.4deg", "--z": "0.85", "--bc": "var(--ochre)", "--d": "25.1s", "--dl": "-3.7s", "--fx": "2px", "--fy": "-13px", "--rw": "-1.6deg" } as React.CSSProperties}></span>
          <span className="bg-brick" style={{ left: "96.8%", top: "35.7%", "--w": "3", "--r": "-20.5deg", "--z": "1.16", "--bc": "var(--ochre)", "--d": "17.1s", "--dl": "-1.7s", "--fx": "-4px", "--fy": "-18px", "--rw": "2.7deg" } as React.CSSProperties}></span>
          <span className="bg-brick" style={{ left: "10.8%", top: "14.4%", "--w": "4", "--r": "2.4deg", "--z": "1.07", "--bc": "var(--ochre)", "--d": "17.7s", "--dl": "-14.3s", "--fx": "-8px", "--fy": "-18px", "--rw": "4.7deg" } as React.CSSProperties}></span>
          <span className="bg-brick" style={{ left: "92.4%", top: "44.8%", "--w": "2", "--r": "-13.1deg", "--z": "1.00", "--bc": "var(--terracotta)", "--d": "19.7s", "--dl": "-5.3s", "--fx": "-3px", "--fy": "-19px", "--rw": "1.8deg" } as React.CSSProperties}></span>
        </div>
        <div className="container">
          <div className="reveal">
            <p className="section-eyebrow">FAQ</p>
            <h2 style={{ textAlign: "center", marginBottom: "64px" } as React.CSSProperties}>Questions worth asking.</h2>
          </div>
          <div className="faq-list reveal">
            
            <div className="faq-item">
              <button className="faq-btn" aria-expanded={open === 0} onClick={() => toggle(0)}>So what is BricoWerx, in one breath?</button>
              <div className={`faq-answer-wrap ${open === 0 ? 'open' : ''}`}><div className="faq-answer">
                <p><strong>A command-line tool that keeps your team's proven code as versioned, searchable pieces — so engineers and AI assistants reuse them instead of rebuilding them.</strong></p>
              </div></div>
            </div>

            <div className="faq-item">
              <button className="faq-btn" aria-expanded={open === 1} onClick={() => toggle(1)}>Is it a code generator?</button>
              <div className={`faq-answer-wrap ${open === 1 ? 'open' : ''}`}><div className="faq-answer">
                <p>No. BricoWerx does not generate code. It indexes, searches, and manages code your team has already written and validated, allowing you to reuse what works instead of generating a new, unproven version.</p>
              </div></div>
            </div>

            <div className="faq-item">
              <button className="faq-btn" aria-expanded={open === 2} onClick={() => toggle(2)}>Is it a package registry like npm?</button>
              <div className={`faq-answer-wrap ${open === 2 ? 'open' : ''}`}><div className="faq-answer">
                <p>No. It operates within your own repository (or a shared local Vault) directly on source files. There is no external registry, no publishing step, and no hidden node_modules folder. Pieces are copied directly into your project where you can see and modify them.</p>
              </div></div>
            </div>

            <div className="faq-item">
              <button className="faq-btn" aria-expanded={open === 3} onClick={() => toggle(3)}>Do I need a server, an account, or a database?</button>
              <div className={`faq-answer-wrap ${open === 3 ? 'open' : ''}`}><div className="faq-answer">
                <p>None of the above. The Vault is a plain git directory on your local machine. The search index is a local SQLite database that the binary manages for you. It works completely offline.</p>
              </div></div>
            </div>

            <div className="faq-item">
              <button className="faq-btn" aria-expanded={open === 4} onClick={() => toggle(4)}>Which stacks does it support today?</button>
              <div className={`faq-answer-wrap ${open === 4 ? 'open' : ''}`}><div className="faq-answer">
                <p>Because pieces are just files, BricoWerx supports any stack. However, the automated wiring (like updating imports) currently works best for TypeScript/JavaScript ecosystems.</p>
              </div></div>
            </div>

            <div style={{ textAlign: "center", marginTop: "32px", fontSize: "16px", color: "var(--body)" }}>
              Still have a question? <a href="#" style={{ textDecoration: "underline" }}>Email us</a> / <a href="#" style={{ textDecoration: "underline" }}>GitHub Discussions</a>
            </div>

          </div>
        </div>
      </section>
    </>
  );
}

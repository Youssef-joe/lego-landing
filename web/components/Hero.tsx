'use client';

import { useState } from 'react';
import BrickText from '@/components/BrickText';

export default function Hero() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'success'>('idle');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) setStatus('success');
  };

  const pieces = [
    { name: 'auth', v: '0.2.0', proj: 5 },
    { name: 'payments', v: '1.1.0', proj: 3 },
    { name: 'mailer', v: '0.9.1', proj: 8 },
    { name: 'logger', v: '2.0.0', proj: 12 },
    { name: 'rate-limit', v: '0.4.0', proj: 2 },
    { name: 's3-upload', v: '1.0.1', proj: 4 },
    { name: 'webhooks', v: '0.8.0', proj: 3 },
    { name: 'feature-flags', v: '1.2.0', proj: 6 },
    { name: 'audit-log', v: '0.1.5', proj: 1 },
  ];

  return (
    <>
      <section id="hero" style={{ paddingBottom: '64px' }}>
        {/* decorative triangles, logo palette */}
        <div className="tri-layer" aria-hidden="true">
          <span className="tri" style={{ left: '5%', top: '12%', '--t-w': '52px', '--t-r': '-8deg', '--t-c': 'var(--terracotta)', '--t-o': '0.18', '--t-d': '18.0s', '--t-dl': '-0.0s', '--t-fx': '-9px', '--t-fy': '-10px' } as React.CSSProperties} />
          <span className="tri" style={{ left: '89%', top: '8%', '--t-w': '40px', '--t-r': '14deg', '--t-c': 'var(--sage)', '--t-o': '0.16', '--t-d': '19.7s', '--t-dl': '-2.3s', '--t-fx': '8px', '--t-fy': '-11px' } as React.CSSProperties} />
          <span className="tri" style={{ left: '12%', top: '47%', '--t-w': '34px', '--t-r': '22deg', '--t-c': 'var(--ochre)', '--t-o': '0.15', '--t-d': '21.4s', '--t-dl': '-4.6s', '--t-fx': '-9px', '--t-fy': '-12px' } as React.CSSProperties} />
          <span className="tri" style={{ left: '93%', top: '38%', '--t-w': '58px', '--t-r': '-12deg', '--t-c': 'var(--terracotta)', '--t-o': '0.14', '--t-d': '23.1s', '--t-dl': '-6.9s', '--t-fx': '8px', '--t-fy': '-13px' } as React.CSSProperties} />
          <span className="tri" style={{ left: '3%', top: '74%', '--t-w': '44px', '--t-r': '9deg', '--t-c': 'var(--sage)', '--t-o': '0.17', '--t-d': '24.8s', '--t-dl': '-9.2s', '--t-fx': '-9px', '--t-fy': '-14px' } as React.CSSProperties} />
          <span className="tri" style={{ left: '86%', top: '68%', '--t-w': '38px', '--t-r': '-18deg', '--t-c': 'var(--ochre)', '--t-o': '0.16', '--t-d': '26.5s', '--t-dl': '-11.5s', '--t-fx': '8px', '--t-fy': '-15px' } as React.CSSProperties} />
          <span className="tri" style={{ left: '19%', top: '88%', '--t-w': '50px', '--t-r': '15deg', '--t-c': 'var(--terracotta)', '--t-o': '0.13', '--t-d': '28.2s', '--t-dl': '-13.8s', '--t-fx': '-9px', '--t-fy': '-16px' } as React.CSSProperties} />
          <span className="tri" style={{ left: '77%', top: '90%', '--t-w': '36px', '--t-r': '-6deg', '--t-c': 'var(--sage)', '--t-o': '0.15', '--t-d': '29.9s', '--t-dl': '-16.1s', '--t-fx': '8px', '--t-fy': '-17px' } as React.CSSProperties} />
          <span className="tri" style={{ left: '96%', top: '56%', '--t-w': '30px', '--t-r': '25deg', '--t-c': 'var(--ochre)', '--t-o': '0.14', '--t-d': '31.6s', '--t-dl': '-18.4s', '--t-fx': '-9px', '--t-fy': '-18px' } as React.CSSProperties} />
        </div>
        <div className="container">
          <div className="hero-text" style={{ paddingBottom: '48px' }}>
            <span className="chip chip-launch">Launching soon · Join the Waitlist</span>
            <BrickText text="Developers don't have to start from scratch." />
            <p className="hero-sub reveal" data-delay="1">Build from your team's existing knowledge, code, and decisions — instead of rebuilding them every time.</p>
            
            <div className="reveal" data-delay="2" style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', width: '100%', maxWidth: '480px' }}>
              {status === 'success' ? (
                <div className="pop-in" style={{ padding: '16px 24px', background: 'var(--wash-sage)', color: 'var(--sage)', borderRadius: '999px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  You're on the list
                </div>
              ) : (
                <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '12px', width: '100%', flexWrap: 'wrap' }}>
                  <input 
                    type="email" 
                    placeholder="Work email" 
                    required 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ flex: '1 1 200px', padding: '12px 20px', borderRadius: '999px', border: '1px solid var(--hairline)', fontSize: '16px', fontFamily: 'var(--ff-body)', background: 'var(--page)' }}
                  />
                  <button type="submit" className="btn-fill" style={{ flex: '0 0 auto' }}>Join the waitlist</button>
                </form>
              )}
              
            </div>
          </div>
        </div>

        {/* Static Library Graphic */}
        <div style={{ position: 'relative', width: '100%', maxWidth: '1200px', margin: '0 auto', height: '400px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          
          <div className="library reveal" data-delay="3" style={{ position: 'relative', left: 'auto', top: 'auto', transform: 'none', zIndex: 10, width: '400px' }}>
            <div className="library-head">
              <span>Your library</span>
              <code>vault/pieces</code>
            </div>
            <div className="stagger-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
              {pieces.map((p, i) => (
                <div key={i} style={{ padding: '12px 10px', background: 'rgba(255,255,255,0.06)', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <code style={{ fontSize: '12px', color: 'var(--code-accent)' }}>{p.name}</code>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '10px', color: 'var(--on-dark-3)', fontFamily: 'var(--ff-mono)' }}>{p.v}</span>
                    <span style={{ fontSize: '9px', color: 'var(--sage)', padding: '2px 6px', background: 'var(--wash-sage)', borderRadius: '4px' }}>proven</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <style dangerouslySetInnerHTML={{__html: `
            .static-chips-layer { position: absolute; inset: 0; pointer-events: none; z-index: 5; }
            @media (max-width: 1200px) { .static-chips-layer { display: none; } }
          `}} />

          <div className="static-chips-layer reveal" data-delay="3">
            {/* 6 fragments */}
            <div className="fragment frag-code" style={{ top: "30px", left: "10%", "--dx": "0", "--dy": "0", "--rot": "-7" } as React.CSSProperties}>
              <code>export class</code>
              <code>AuthModule {'{'}{'}'}</code>
            </div>
            <div className="fragment frag-component" style={{ top: "60px", right: "12%", "--dx": "0", "--dy": "0", "--rot": "6" } as React.CSSProperties}>
              <span style={{ fontSize: "13px", color: "var(--body)" } as React.CSSProperties}>Button / primary</span>
              <div className="mini-btn">Continue</div>
            </div>
            <div className="fragment frag-list" style={{ top: "240px", left: "6%", "--dx": "0", "--dy": "0", "--rot": "-5" } as React.CSSProperties}>
              <div><span className="avatar"></span><span style={{ fontSize: "13px" } as React.CSSProperties}>Avatar + name row</span></div>
              <div className="frag-meta">used in 4 projects</div>
            </div>
            <div className="fragment frag-tokens" style={{ top: "220px", right: "8%", "--dx": "0", "--dy": "0", "--rot": "8" } as React.CSSProperties}>
              <span style={{ fontSize: "13px", color: "var(--body)" } as React.CSSProperties}>Tokens</span>
              <div className="swatches">
                <div className="sw" style={{ background: "var(--terracotta)" } as React.CSSProperties}></div>
                <div className="sw" style={{ background: "var(--sage)" } as React.CSSProperties}></div>
                <div className="sw" style={{ background: "var(--ochre)" } as React.CSSProperties}></div>
                <div className="sw" style={{ background: "var(--page)", border: "1px solid var(--hairline)" } as React.CSSProperties}></div>
              </div>
            </div>
            <div className="fragment frag-input" style={{ bottom: "20px", left: "14%", "--dx": "0", "--dy": "0", "--rot": "-6" } as React.CSSProperties}>
              <span style={{ fontSize: "13px", color: "var(--body)" } as React.CSSProperties}>Input / email</span>
              <div className="fake-input"></div>
            </div>
            <div className="fragment frag-file" style={{ bottom: "40px", right: "16%", "--dx": "0", "--dy": "0", "--rot": "5" } as React.CSSProperties}>
              <code>jwt.strategy.ts</code>
              <div className="frag-meta">proven · 3 projects</div>
            </div>
          </div>
        </div>

      </section>
    </>
  );
}

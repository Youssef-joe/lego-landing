'use client';

import { useState, useEffect, useRef } from 'react';

export default function Capture() {
  const [playing, setPlaying] = useState(false);
  const [p, setP] = useState(0);
  const reqRef = useRef<number | undefined>(undefined);
  const startRef = useRef<number | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasPlayed = useRef(false);

  const duration = 2500; // ms

  const animate = (time: number) => {
    if (!startRef.current) startRef.current = time;
    const elapsed = time - startRef.current;
    const progress = Math.min(elapsed / duration, 1);
    setP(progress);

    if (progress < 1) {
      reqRef.current = requestAnimationFrame(animate);
    } else {
      setPlaying(false);
    }
  };

  const play = () => {
    if (playing) return;
    setPlaying(true);
    setP(0);
    startRef.current = undefined;
    reqRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasPlayed.current) {
          hasPlayed.current = true;
          // small delay for better effect
          setTimeout(() => play(), 300);
        }
      },
      { threshold: 0.5 }
    );
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, []);

  const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
  const s1 = clamp01((p - 0.1) / 0.4);
  const s2 = clamp01((p - 0.2) / 0.4);
  const s3 = clamp01((p - 0.3) / 0.4);
  const s4 = clamp01((p - 0.4) / 0.4);

  const label = p >= 0.85 ? 'done' : p > 0.05 ? 'capturing' : 'idle';
  const active = p < 0.1 ? 0 : p < 0.8 ? 1 : 2;

  return (
    <div className="capture-demo-container" ref={containerRef} style={{ position: 'relative', width: '100%', height: '320px', background: 'var(--espresso)', borderRadius: '20px', overflow: 'hidden' }}>
      
      {/* 1. the page */}
      <div style={{ position: 'absolute', left: '16px', top: '16px', right: '16px', bottom: '80px', borderRadius: '12px', background: 'var(--ink)', overflow: 'hidden', opacity: 1 - p * 0.5, transform: `scale(${1 - p * 0.05})` }}>
        <div style={{ display: 'flex', gap: '6px', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <i style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(255,255,255,0.16)' }}></i>
          <i style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(255,255,255,0.16)' }}></i>
          <i style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(255,255,255,0.16)' }}></i>
          <code style={{ marginLeft: '8px', fontFamily: 'var(--ff-mono)', fontSize: '11px', color: 'var(--on-dark-3)' }}>~/checkout-api/src/auth</code>
        </div>
        <div style={{ padding: '16px', fontFamily: 'var(--ff-mono)', fontSize: '11px', lineHeight: '1.8', color: 'var(--on-dark-3)' }}>
          <div><span style={{ color: 'rgba(255,255,255,0.28)' }}>// battle-tested for 14 months</span></div>
          <div><span style={{ color: 'var(--code-accent)' }}>@Injectable</span>()</div>
          <div><span style={{ color: 'var(--code-accent)' }}>export class</span> AuthService {'{'}</div>
          <div>&nbsp;&nbsp;<span style={{ color: 'var(--code-accent)' }}>async</span> sign(user: User) {'{'}</div>
          <div>&nbsp;&nbsp;&nbsp;&nbsp;<span style={{ color: 'var(--code-accent)' }}>return this</span>.jwt.signAsync({'{'} sub: user.id {'}'})</div>
          <div>&nbsp;&nbsp;{'}'}</div>
          <div>{'}'}</div>
        </div>
      </div>

      {/* 2. the command */}
      <div style={{ position: 'absolute', left: '16px', right: '16px', bottom: '16px', padding: '10px 16px', borderRadius: '9999px', background: 'var(--card)', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--ff-mono)', fontSize: '12px', color: 'var(--ink)', zIndex: 10 }}>
        <span style={{ color: 'var(--terracotta)' }}>$</span> brico capture auth
        <button onClick={play} disabled={playing} style={{ marginLeft: 'auto', background: playing ? 'var(--terracotta)' : 'var(--inset)', color: playing ? '#fff' : 'var(--body)', padding: '4px 12px', borderRadius: '9999px', fontSize: '10px', border: 'none', cursor: playing ? 'default' : 'pointer', transition: 'background 0.3s, color 0.3s', display: 'flex', alignItems: 'center', gap: '4px' }}>
          {!playing && p === 0 && <span>▶ Run</span>}
          {!playing && p > 0 && <span>▶ Replay</span>}
          {playing && <span>{label}</span>}
        </button>
      </div>

      {/* files in flight */}
      <div className="cap-card" style={{ '--pp': s1, left: '40px', top: '60px', '--dx': '150', '--dy': '60', '--c': 'var(--terracotta)' } as any}><span className="ico"></span>auth.service.ts</div>
      <div className="cap-card" style={{ '--pp': s2, left: '60px', top: '90px', '--dx': '130', '--dy': '30', '--c': 'var(--sage)' } as any}><span className="ico"></span>auth.guard.ts</div>
      <div className="cap-card" style={{ '--pp': s3, left: '30px', top: '120px', '--dx': '160', '--dy': '0', '--c': 'var(--ochre)' } as any}><span className="ico"></span>jwt.strategy.ts</div>
      <div className="cap-card" style={{ '--pp': s4, left: '70px', top: '150px', '--dx': '120', '--dy': '-30', '--c': 'var(--terracotta)' } as any}><span className="ico"></span>auth.module.ts</div>

      {/* the folder */}
      <div style={{ position: 'absolute', right: '16px', top: '40px', width: '160px', opacity: p > 0.1 ? Math.min((p - 0.1) * 3, 1) : 0, transition: 'opacity 0.2s', zIndex: 5 }}>
        <div style={{ background: 'var(--wash-warm)', borderRadius: '12px', padding: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <strong style={{ fontFamily: 'var(--ff-head)', fontSize: '12px', color: 'var(--ink)' }}>Vault</strong>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
            <div className={`cap-slot ${s1 > 0.9 ? 'lit' : ''}`} style={{ height: '24px', borderRadius: '4px' }}></div>
            <div className={`cap-slot ${s2 > 0.9 ? 'lit' : ''}`} style={{ height: '24px', borderRadius: '4px' }}></div>
            <div className={`cap-slot ${s3 > 0.9 ? 'lit' : ''}`} style={{ height: '24px', borderRadius: '4px' }}></div>
            <div className={`cap-slot ${s4 > 0.9 ? 'lit' : ''}`} style={{ height: '24px', borderRadius: '4px' }}></div>
          </div>
          <div style={{ marginTop: '12px', fontSize: '10px', fontFamily: 'var(--ff-mono)', color: 'var(--sage)', opacity: label === 'done' ? 1 : 0, transform: label === 'done' ? 'none' : 'translateY(4px)', transition: 'all 0.3s' }}>
            ✓ saved
          </div>
        </div>
      </div>
      
      {/* steps indicator overlay */}
      <div style={{ position: 'absolute', top: '16px', right: '16px', display: 'flex', flexDirection: 'column', gap: '4px', zIndex: 6 }}>
        <div style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '999px', background: active === 0 ? 'var(--espresso)' : 'rgba(0,0,0,0.4)', color: active === 0 ? '#fff' : 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)', transition: 'all 0.3s' }}>01 Build</div>
        <div style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '999px', background: active === 1 ? 'var(--espresso)' : 'rgba(0,0,0,0.4)', color: active === 1 ? '#fff' : 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)', transition: 'all 0.3s' }}>02 Capture</div>
        <div style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '999px', background: active === 2 ? 'var(--espresso)' : 'rgba(0,0,0,0.4)', color: active === 2 ? '#fff' : 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)', transition: 'all 0.3s' }}>03 Piece</div>
      </div>
    </div>
  );
}

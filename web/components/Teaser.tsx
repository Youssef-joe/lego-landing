'use client';

import { useRef, useState } from 'react';

export default function Teaser() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [missing, setMissing] = useState(false);

  const play = () => {
    videoRef.current
      ?.play()
      .then(() => { setPlaying(true); setMissing(false); })
      .catch(() => { setMissing(true); });   // no file dropped in yet
  };

  return (
    <>
      <section id="teaser-section" className="section-gap has-bricks">
        <div className="bg-bricks" aria-hidden="true">
          <span className="bg-brick" style={{ left: "8.5%", top: "14.3%", "--w": "4", "--r": "-12.4deg", "--z": "0.78", "--bc": "var(--sage)", "--d": "27.2s", "--dl": "-14.9s", "--fx": "-1px", "--fy": "-11px", "--rw": "6.6deg" } as React.CSSProperties}></span>
          <span className="bg-brick" style={{ left: "46.1%", top: "92.4%", "--w": "3", "--r": "4.5deg", "--z": "0.98", "--bc": "var(--ochre)", "--d": "21.0s", "--dl": "-13.7s", "--fx": "-7px", "--fy": "-17px", "--rw": "1.7deg" } as React.CSSProperties}></span>
          <span className="bg-brick" style={{ left: "2.2%", top: "48.7%", "--w": "2", "--r": "14.2deg", "--z": "1.00", "--bc": "var(--terracotta)", "--d": "21.5s", "--dl": "-1.5s", "--fx": "9px", "--fy": "-16px", "--rw": "-6.8deg" } as React.CSSProperties}></span>
          <span className="bg-brick" style={{ left: "2.6%", top: "75.9%", "--w": "4", "--r": "-16.5deg", "--z": "0.84", "--bc": "var(--sage)", "--d": "26.1s", "--dl": "-13.5s", "--fx": "-4px", "--fy": "-11px", "--rw": "1.6deg" } as React.CSSProperties}></span>
          <span className="bg-brick" style={{ left: "34.5%", top: "86.1%", "--w": "3", "--r": "3.8deg", "--z": "0.82", "--bc": "var(--ochre)", "--d": "26.1s", "--dl": "-21.0s", "--fx": "-1px", "--fy": "-12px", "--rw": "4.8deg" } as React.CSSProperties}></span>
          <span className="bg-brick" style={{ left: "83.5%", top: "57.4%", "--w": "3", "--r": "8.2deg", "--z": "1.10", "--bc": "var(--sage)", "--d": "17.2s", "--dl": "-21.6s", "--fx": "9px", "--fy": "-11px", "--rw": "5.9deg" } as React.CSSProperties}></span>
          <span className="bg-brick" style={{ left: "10.8%", top: "0.0%", "--w": "2", "--r": "-19.0deg", "--z": "0.77", "--bc": "var(--terracotta)", "--d": "24.7s", "--dl": "-16.4s", "--fx": "-6px", "--fy": "-18px", "--rw": "6.4deg" } as React.CSSProperties}></span>
          <span className="bg-brick" style={{ left: "69.3%", top: "91.7%", "--w": "4", "--r": "-20.2deg", "--z": "0.95", "--bc": "var(--ochre)", "--d": "15.1s", "--dl": "-15.8s", "--fx": "-8px", "--fy": "-18px", "--rw": "-0.4deg" } as React.CSSProperties}></span>
        </div>
        <div className="container" style={{ maxWidth: "900px" } as React.CSSProperties}>
          <figure className="teaser reveal">
            <div className={playing ? "teaser-frame playing" : "teaser-frame"} id="teaserFrame">
              <video id="teaser" ref={videoRef} preload="none" poster="/media/teaser-poster.jpg" playsInline={true} aria-label="BricoWerx teaser" onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)}>
                <source src="/media/teaser.mp4" type="video/mp4" />
              </video>
              <button className="teaser-play" id="teaserPlay" aria-label="Play the teaser" onClick={play}>
                <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                <span>Play the teaser</span>
              </button>
              <div className="teaser-missing" id="teaserMissing" style={{ display: missing ? "block" : "none" } as React.CSSProperties}>
                <b>Teaser goes here.</b> Drop <code>teaser.mp4</code> into the <code>media/</code> folder and reload.
              </div>
            </div>
            <figcaption style={{ display: "flex", justifyContent: "space-between", gap: "16px", marginTop: "16px", fontSize: "15px", color: "var(--body)" } as React.CSSProperties}>
              <span style={{ fontFamily: "var(--ff-mono)", fontSize: "13px", letterSpacing: "0.05em", color: "var(--ink)" } as React.CSSProperties}>TEASER &middot; 00:45</span>
              <span>What a Vault looks like when three teams share one.</span>
            </figcaption>
          </figure>
        </div>
      </section>
    </>
  );
}

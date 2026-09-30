export default function BrandMark() {
  return (
    <>
      {/* Brand mark: defined once, referenced by <use> in the nav and footer */}
      <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: "absolute" } as React.CSSProperties}>
        <symbol id="bwx-mark" viewBox="4 4 85 85">
          <defs>
            <linearGradient id="bwx-t" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#D3663B" /><stop offset="1" stopColor="#B04A24" /></linearGradient>
            <linearGradient id="bwx-o" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#C99A4C" /><stop offset="1" stopColor="#A67830" /></linearGradient>
            <linearGradient id="bwx-s" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#6C8A68" /><stop offset="1" stopColor="#4F6B4C" /></linearGradient>
          </defs>
          <g>
            <rect x="14" y="40" width="38" height="38" rx="8" transform="rotate(45 33 59)" fill="url(#bwx-t)" />
            <rect x="14" y="40" width="38" height="38" rx="8" transform="rotate(45 33 59)" fill="none" stroke="rgba(255,255,255,.22)" strokeWidth="1" />
            <path transform="translate(33 59) scale(2.3)" d="M-3.4,-5 V5 H1 A2.6,2.6 0 0 0 1,-0.2 H-3.4 M-3.4,-0.2 H0.6 A2.4,2.4 0 0 0 0.6,-5 H-3.4" fill="none" stroke="#FBF7F0" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" />
          </g>
          <g>
            <rect x="52" y="12" width="27" height="27" rx="6" transform="rotate(45 65.5 25.5)" fill="url(#bwx-o)" />
            <rect x="52" y="12" width="27" height="27" rx="6" transform="rotate(45 65.5 25.5)" fill="none" stroke="rgba(255,255,255,.22)" strokeWidth="1" />
            <path transform="translate(65.5 25.5) scale(1.7)" d="M-4.4,-5 L-2.2,5 L0,-1.6 L2.2,5 L4.4,-5" fill="none" stroke="#FBF7F0" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </g>
          <g>
            <rect x="60" y="56" width="22" height="22" rx="5" transform="rotate(45 71 67)" fill="url(#bwx-s)" />
            <rect x="60" y="56" width="22" height="22" rx="5" transform="rotate(45 71 67)" fill="none" stroke="rgba(255,255,255,.22)" strokeWidth="1" />
            <path transform="translate(71 67) scale(1.45)" d="M-4,-5 L4,5 M4,-5 L-4,5" fill="none" stroke="#FBF7F0" strokeWidth="1.7" strokeLinecap="round" />
          </g>
        </symbol>
      </svg>
    </>
  );
}

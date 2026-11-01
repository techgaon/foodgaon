import React from 'react';

/* Animated "FREE delivery on all orders" strip — scooter rides along a road */
export default function FreeDelivery({ compact }) {
  return (
    <div className={'fd-hero' + (compact ? ' compact' : '')} role="note" aria-label="Free delivery on all orders">
      <div className="fd-txt">
        <b>FREE <span>delivery</span></b>
        <small>on all orders</small>
      </div>
      <div className="fd-scene" aria-hidden="true">
        <svg className="fd-village" viewBox="0 0 160 80"><circle cx="125" cy="15" r="10" fill="#ffe066" /><path d="M4 65V39L22 23 40 39V65M50 65V29L75 10 100 29V65M111 65V43L131 28 151 43V65" fill="#fff" fillOpacity=".15" stroke="#fff" strokeOpacity=".25" strokeWidth="2" /><path d="M17 65V48H28V65M67 65V43H82V65M124 65V51H136V65" fill="#0b5a32" fillOpacity=".3" /></svg>
        <div className="fd-road"><i /><i /><i /><i /><i /><i /></div>
        <svg className="fd-scooter" viewBox="0 0 140 100" width="112" height="80">
          <g className="fd-bounce">
            {/* delivery box on the rear rack */}
            <rect x="6" y="30" width="34" height="28" rx="5" fill="#e8461a" stroke="#2b1d12" strokeWidth="2.5" />
            <rect x="6" y="30" width="34" height="8" rx="4" fill="#ff7a45" stroke="#2b1d12" strokeWidth="2.5" />
            <text x="23" y="53" textAnchor="middle" fontSize="11" fontWeight="900" fill="#fff" fontFamily="system-ui, sans-serif">FG</text>
            {/* rider: leg, body, arm, head with helmet */}
            <path d="M58 60 L72 60 L76 76 L70 77 L66 66 L58 66 Z" fill="#1f6fb2" stroke="#2b1d12" strokeWidth="2" strokeLinejoin="round" />
            <path d="M50 34 Q52 26 62 26 L70 28 Q74 40 72 60 L52 62 Q46 48 50 34 Z" fill="#1e9e55" stroke="#2b1d12" strokeWidth="2.5" strokeLinejoin="round" />
            <path d="M66 36 Q82 42 96 40" fill="none" stroke="#2b1d12" strokeWidth="6" strokeLinecap="round" />
            <path d="M66 36 Q82 42 96 40" fill="none" stroke="#1e9e55" strokeWidth="3" strokeLinecap="round" />
            <circle cx="63" cy="16" r="10" fill="#ffd9b0" stroke="#2b1d12" strokeWidth="2.5" />
            <path d="M52 16 A11 11 0 0 1 74 14 L74 18 L52 18 Z" fill="#e8461a" stroke="#2b1d12" strokeWidth="2.5" strokeLinejoin="round" />
            <path d="M70 14 L78 15" stroke="#2b1d12" strokeWidth="2.5" strokeLinecap="round" />
            {/* scooter body */}
            <path d="M14 62 Q14 56 22 56 L58 56 Q62 56 64 62 L66 70 L98 70 L108 40 L114 40 L112 48 L104 74 Q102 80 94 80 L30 80 Q14 80 14 70 Z" fill="#ffd34d" stroke="#2b1d12" strokeWidth="2.5" strokeLinejoin="round" />
            <path d="M42 56 L64 56" stroke="#2b1d12" strokeWidth="5" strokeLinecap="round" />
            <path d="M108 40 L100 30 M96 30 L106 30" stroke="#2b1d12" strokeWidth="4" strokeLinecap="round" />
            <circle cx="113" cy="52" r="3.5" fill="#fff8c4" stroke="#2b1d12" strokeWidth="1.5" className="fd-light" />
          </g>
          {/* wheels (spin) */}
          <g className="fd-wheel" style={{ transformOrigin: '32px 84px' }}><circle cx="32" cy="84" r="13" fill="#2b1d12" /><circle cx="32" cy="84" r="6" fill="#d9d9d9" /><path d="M32 72 V96 M20 84 H44" stroke="#777" strokeWidth="2" /></g>
          <g className="fd-wheel" style={{ transformOrigin: '106px 84px' }}><circle cx="106" cy="84" r="13" fill="#2b1d12" /><circle cx="106" cy="84" r="6" fill="#d9d9d9" /><path d="M106 72 V96 M94 84 H118" stroke="#777" strokeWidth="2" /></g>
          {/* speed lines + exhaust puffs */}
          <g className="fd-speed" stroke="#ffffffcc" strokeWidth="3" strokeLinecap="round"><path d="M0 44 H10" /><path d="M2 54 H12" /><path d="M0 64 H8" /></g>
          <g className="fd-puff" fill="#ffffff99"><circle cx="8" cy="80" r="4" /><circle cx="2" cy="76" r="3" /></g>
        </svg>
      </div>
    </div>
  );
}

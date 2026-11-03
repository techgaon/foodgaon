import React, { useEffect, useRef, useState } from 'react';
import { tr } from '../i18n/index.js';

/* ---- little hand-drawn ingredients that drift around (pure SVG, no files) ---- */
const SHAPES = {
  chilli: (
    <svg viewBox="0 0 40 40"><path d="M8 30c10 2 22-6 24-18 1-3-3-4-4-1-3 9-10 14-19 14-3 0-4 4-1 5z" fill="#e8301a" /><path d="M30 12c1-4 4-6 6-6" stroke="#2e9e4f" strokeWidth="3" fill="none" strokeLinecap="round" /></svg>
  ),
  leaf: (
    <svg viewBox="0 0 40 40"><path d="M6 34C6 18 16 8 34 6c-2 18-12 28-28 28z" fill="#34b26a" /><path d="M6 34L26 14" stroke="#1e7a44" strokeWidth="2" /></svg>
  ),
  tomato: (
    <svg viewBox="0 0 40 40"><circle cx="20" cy="22" r="14" fill="#f0442b" /><circle cx="20" cy="22" r="9" fill="#ff7a5c" /><path d="M14 9l6 4 6-4-3 6h-6z" fill="#2e9e4f" /></svg>
  ),
  onion: (
    <svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="14" fill="none" stroke="#c77dd6" strokeWidth="4" /><circle cx="20" cy="20" r="7" fill="none" stroke="#e3a9ee" strokeWidth="3" /></svg>
  ),
  star: (
    <svg viewBox="0 0 40 40"><path d="M20 4l4 11 12 1-9 8 3 12-10-6-10 6 3-12-9-8 12-1z" fill="#8a4b20" /><circle cx="20" cy="20" r="3" fill="#c98a4a" /></svg>
  ),
  pea: (
    <svg viewBox="0 0 40 40"><ellipse cx="20" cy="20" rx="16" ry="8" fill="#5cc26e" transform="rotate(-25 20 20)" /><circle cx="14" cy="23" r="3.5" fill="#9be08f" /><circle cx="20" cy="20" r="3.5" fill="#9be08f" /><circle cx="26" cy="17" r="3.5" fill="#9be08f" /></svg>
  ),
  lemon: (
    <svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="14" fill="#ffd34d" /><circle cx="20" cy="20" r="10" fill="#fff3b0" /><path d="M20 10v20M10 20h20M13 13l14 14M27 13L13 27" stroke="#ffd34d" strokeWidth="1.6" /></svg>
  ),
};
const NAMES = Object.keys(SHAPES);

export function FloatingVeggies({ count = 9, seed = 1, className = '' }) {
  const items = Array.from({ length: count }).map((_, i) => {
    const r = (n) => ((Math.sin((i + 1) * 9301 * seed + n * 49297) + 1) / 2);
    return { k: NAMES[(i + seed) % NAMES.length], left: r(1) * 92, top: r(2) * 85, size: 18 + r(3) * 22, dur: 7 + r(4) * 8, delay: -r(5) * 10, rot: r(6) * 360 };
  });
  return (
    <div className={'veggies ' + className} aria-hidden="true">
      {items.map((v, i) => (
        <span key={i} className="veggie" style={{ left: v.left + '%', top: v.top + '%', width: v.size, height: v.size, animationDuration: v.dur + 's', animationDelay: v.delay + 's', '--r': v.rot + 'deg' }}>
          {SHAPES[v.k]}
        </span>
      ))}
    </div>
  );
}

/* ---- dish photos orbiting around the logo ---- */
export function FoodOrbit({ photos = [], size = 240, itemSize = 48, children }) {
  const list = photos.slice(0, 7);
  return (
    <div className="orbit" style={{ width: size, height: size }}>
      <div className="orbit-ring r1" />
      <div className="orbit-ring r2" />
      <div className="orbit-spin">
        {list.map((p, i) => {
          const a = (i / list.length) * Math.PI * 2;
          const R = size / 2 - itemSize / 2 - 2;
          return (
            <span key={i} className="orbit-item" style={{ width: itemSize, height: itemSize, left: size / 2 + Math.cos(a) * R - itemSize / 2, top: size / 2 + Math.sin(a) * R - itemSize / 2, animationDelay: i * 90 + 'ms' }}>
              <img src={p} alt="" />
            </span>
          );
        })}
      </div>
      <div className="orbit-core">{children}</div>
    </div>
  );
}

/* ---- rotating placeholder text: Search "paneer"… ---- */
export function Typewriter({ words, prefix = '' }) {
  const [i, setI] = useState(0);
  const [n, setN] = useState(0);
  const [del, setDel] = useState(false);
  useEffect(() => {
    const w = tr(words[i % words.length]);
    const x = setTimeout(() => {
      if (!del && n < w.length) setN(n + 1);
      else if (!del && n === w.length) setDel(true);
      else if (del && n > 0) setN(n - 1);
      else { setDel(false); setI(i + 1); }
    }, !del && n === w.length ? 1400 : del ? 35 : 75);
    return () => clearTimeout(x);
  }, [n, del, i, words]);
  const w = tr(words[i % words.length]);
  return <span data-notr="">{tr(prefix)} "{w.slice(0, n)}<i className="caret" />"</span>;
}

/* ---- fade/slide sections in as they scroll into view ---- */
export function Reveal({ children, className = '', as: Tag = 'div', delay = 0 }) {
  const ref = useRef(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    if (!('IntersectionObserver' in window)) { setOn(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOn(true); io.disconnect(); } }, { threshold: 0.12 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <Tag ref={ref} className={'reveal ' + (on ? 'in ' : '') + className} style={{ transitionDelay: delay + 'ms' }}>{children}</Tag>;
}

/* ---- calorie ring (fills up) ---- */
export function KcalRing({ kcal, size = 92 }) {
  const pct = Math.min(1, kcal / 2000);
  const r = size / 2 - 8; const c = 2 * Math.PI * r;
  return (
    <div className="kring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#ffe7c2" strokeWidth="8" fill="none" />
        <circle className="kring-bar" cx={size / 2} cy={size / 2} r={r} stroke="url(#kg)" strokeWidth="8" fill="none" strokeLinecap="round"
          style={{ strokeDasharray: c, '--off': c * (1 - pct), strokeDashoffset: c }} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
        <defs><linearGradient id="kg"><stop offset="0" stopColor="#ffb627" /><stop offset="1" stopColor="#e8461a" /></linearGradient></defs>
      </svg>
      <div className="kring-txt"><b>{kcal}</b><small>kcal</small></div>
    </div>
  );
}

/* ---- fly-to-cart: clones an image and flies it to the cart bar ---- */
export function flyToCart(fromEl) {
  try {
    if (!fromEl || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const r = fromEl.getBoundingClientRect();
    const clone = fromEl.cloneNode(true);
    Object.assign(clone.style, { position: 'fixed', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px', zIndex: 200, borderRadius: '18px', objectFit: 'cover', transition: 'all .75s cubic-bezier(.5,-0.3,.7,1)', pointerEvents: 'none', boxShadow: '0 10px 30px rgba(0,0,0,.3)' });
    document.body.appendChild(clone);
    const tx = window.innerWidth / 2 - 30; const ty = window.innerHeight - 90;
    requestAnimationFrame(() => Object.assign(clone.style, { left: tx + 'px', top: ty + 'px', width: '60px', height: '60px', opacity: '0.4', borderRadius: '50%', transform: 'rotate(25deg)' }));
    setTimeout(() => clone.remove(), 800);
  } catch { /* ignore */ }
}

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon, VegMark, Stepper, Img, useToast } from '../ui.jsx';
import { useCart, cartStore, cartTotals } from '../lib/data.js';
import { priceText, lineText, rupee } from '../lib/utils.js';
import { FloatingVeggies, KcalRing, flyToCart } from './Motion.jsx';
import { t } from '../i18n/index.js';
import { FavBtn } from '../customer/RestaurantPage.jsx';

const SLIDE_MS = 3400;
const TAGS = {
  sweets: ['मीठा', 'शुद्ध दूध-खोया', 'ताज़ा बना'], lassi: ['ठंडा-ठंडा', 'ताज़ा बना'], chinese: ['चटपटा', 'गरमा-गरम'],
  fastfood: ['गरमा-गरम', 'बच्चों की पसंद'], northindian: ['गरमा-गरम', 'घर जैसा स्वाद'], chaat: ['चटपटा', 'करारा'],
  thali: ['पूरा भोजन', 'गरमा-गरम'], southindian: ['हल्का', 'गरमा-गरम'], icecream: ['ठंडा', 'मीठा'],
};

export default function DishView({ it, rest, showKcal = true, onClose }) {
  const toast = useToast();
  const cart = useCart();
  const qty = cart.items[it.id]?.qty || 0;
  const pics = (it.gallery && it.gallery.length ? it.gallery : [it.img]).filter(Boolean);
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [full, setFull] = useState(false);
  const [hint, setHint] = useState(true);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const track = useRef(null);
  const progScroll = useRef(0); // time of our own (button / auto) scroll — ignore scroll events from it
  const imgRefs = useRef([]);

  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    document.body.classList.add('noscroll');
    return () => { window.removeEventListener('keydown', k); document.body.classList.remove('noscroll'); };
  }, [onClose]);
  useEffect(() => {
    if (paused || pics.length < 2) return;
    const x = setTimeout(() => setI((v) => (v + 1) % pics.length), SLIDE_MS);
    return () => clearTimeout(x);
  }, [i, paused, pics.length]);
  useEffect(() => { const el = track.current; if (el && Math.abs(el.scrollLeft - i * el.clientWidth) > 4) { progScroll.current = Date.now(); el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' }); } }, [i]);

  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const p = e.touches ? e.touches[0] : e;
    setTilt({ x: ((p.clientY - r.top) / r.height - 0.5) * -8, y: ((p.clientX - r.left) / r.width - 0.5) * 10 });
  };
  const add = () => {
    if (rest && rest.open === false) { toast(t('Restaurant is closed right now'), 'err'); return; }
    if (it.available === false) return;
    const ok = cartStore.add(it);
    if (!ok) { if (confirm(t('Your cart has items from another restaurant. Start a new cart?'))) cartStore.replaceWith(it); else return; }
    flyToCart(imgRefs.current[i]);
  };

  return createPortal(
    <div className="sheet-wrap dish-wrap" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dish-view" role="dialog" aria-modal="true" aria-label={it.name}>
        <div className="dv-stage" onPointerMove={onMove} onPointerLeave={() => setTilt({ x: 0, y: 0 })}
          onTouchStart={() => setPaused(true)} onTouchEnd={() => setPaused(false)}>
          <div className="dv-bars">{pics.map((p, k) => <i key={p + k} className={k < i ? 'done' : k === i ? 'cur' : ''} style={{ '--d': (paused ? 0 : SLIDE_MS) + 'ms' }}><b key={k === i ? 'a' + i : 'b'} /></i>)}</div>
          <button className="icon-btn round dv-close" onClick={onClose} aria-label="Close"><Icon name="x" stroke={2.6} /></button>
          <div className="dv-track" ref={track} style={{ transform: `perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }}
            onScroll={(e) => { if (Date.now() - progScroll.current < 700) return; const w = e.currentTarget.clientWidth; const k = Math.round(e.currentTarget.scrollLeft / w); if (k !== i && Math.abs(e.currentTarget.scrollLeft - k * w) < 4) { setI(k); setHint(false); } }}>
            {pics.map((p, k) => (
              <div key={p + k} className={'dv-slide' + (k === i ? ' on' : '')}>
                <img ref={(el) => { imgRefs.current[k] = el; }} src={p} alt="" className={'kb' + (k % 3)} onClick={() => { setFull(true); setPaused(true); }} />
              </div>
            ))}
          </div>
          <div className="dv-shade" />
          {pics.length > 1 && <span className="dv-count">{`${i + 1}/${pics.length}`}</span>}
          {pics.length > 1 && hint && <span className="dv-swipe" onAnimationEnd={() => setHint(false)}>👆 {t('Swipe for more photos')}</span>}
          <div className="steam-wisps" aria-hidden="true"><span /><span /><span /><span /></div>
          <FloatingVeggies count={6} seed={(it.name || '').length} className="dv-veg" />
          {pics.length > 1 && <button className="dv-nav l" onClick={() => { setI((i - 1 + pics.length) % pics.length); setHint(false); }} aria-label="Previous photo"><Icon name="back" size={20} /></button>}
          {pics.length > 1 && <button className="dv-nav r" onClick={() => { setI((i + 1) % pics.length); setHint(false); }} aria-label="Next photo"><Icon name="right" size={20} /></button>}
          <div className="dv-title">
            <div className="row gap"><VegMark size={15} />{it.bestseller && <span className="best-pill"><Icon name="star" size={11} fill="currentColor" stroke={0} /> Bestseller</span>}</div>
            <div className="row gap"><h2 className="grow">{it.name}</h2><FavBtn id={it.id} big /></div>
            {rest && <small data-notr="">{rest.name}</small>}
          </div>
        </div>

        {full && <PhotoViewer pics={pics} start={i} title={it.name} onClose={(k) => { setFull(false); setPaused(false); setI(k); }} />}
        {pics.length > 1 && (
          <div className="dv-thumbs">
            {pics.map((p, k) => <button key={p + k} className={k === i ? 'on' : ''} onClick={() => setI(k)}><Img src={p} alt="" /></button>)}
          </div>
        )}

        <div className="dv-body">
          <div className="dv-row">
            <div>
              <div className="dv-price"><b key={it.price}>{priceText(it)}</b><span className="muted">· {it.qty}</span></div>
              <p className="muted small">{it.desc}</p>
            </div>
            {showKcal && it.kcal > 0 && <KcalRing kcal={it.kcal} />}
          </div>
          {it.story && (
            <blockquote className="dv-story" data-notr="" lang="hi">
              <span className="dvs-q">“</span>{it.story}
            </blockquote>
          )}
          <div className="dv-tags" data-notr="" lang="hi">
            {(TAGS[it.cat] || ['ताज़ा बना']).map((x) => <span key={x}>{x}</span>)}
            <span>{`मात्रा: ${it.qty}`}</span>
          </div>
          {showKcal && it.kcal > 0 && (
            <div className="dv-kcal-note"><Icon name="fire" size={14} /> {`About ${Math.round((it.kcal / 2000) * 100)}% of a 2,000 kcal day`}</div>
          )}
          <div className="dv-facts">
            <span><Icon name="leaf" size={16} /> Pure veg</span>
            {rest && <span><Icon name="clock" size={16} /> {`${(rest.prepMins || 20) + 10}-${(rest.prepMins || 20) + 20} mins`}</span>}
            <span><Icon name="bike" size={16} /> FREE delivery</span>
          </div>
          {it.available === false
            ? <div className="alert alert-red">Sold out for now</div>
            : (
              <div className="dv-cta">
                {qty ? <Stepper qty={qty} onAdd={add} onSub={() => cartStore.sub(it.id)} /> : null}
                <button className="btn primary lg grow" onClick={add}>{qty ? `Add one more · ${priceText(it)}` : `Add to cart · ${priceText(it)}`}</button>
              </div>
            )}
          {cartTotals(cart).count > 0 && (
            <button className="cart-bar dv-cart" onClick={() => { onClose(); window.dispatchEvent(new Event('fg-open-cart')); }}>
              <span className="cart-bag" aria-hidden="true"><Icon name="bag" size={22} /><i>✓</i></span>
              <span className="cb-left"><b>{`${cartTotals(cart).count} item${cartTotals(cart).count > 1 ? 's' : ''} added`}</b><small>{`₹${cartTotals(cart).total} · FREE delivery`}</small></span>
              <span className="cb-right">View cart <Icon name="right" size={18} stroke={3} /></span>
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* Full-screen photo viewer: swipe left/right, pinch/double-tap zoom, dots */
function PhotoViewer({ pics, start, title, onClose }) {
  const [k, setK] = useState(start);
  const [zoom, setZoom] = useState(false);
  const ref = useRef(null);
  const prog = useRef(0);
  useEffect(() => { const el = ref.current; prog.current = Date.now(); if (el) el.scrollTo({ left: start * el.clientWidth }); }, []); // eslint-disable-line
  const go = (n) => { const el = ref.current; const m = (n + pics.length) % pics.length; prog.current = Date.now(); if (el) el.scrollTo({ left: m * el.clientWidth, behavior: 'smooth' }); setK(m); setZoom(false); };
  return (
    <div className="pv-wrap" role="dialog" aria-label={title}>
      <div className="pv-top"><b>{title}</b><span>{`${k + 1} / ${pics.length}`}</span><button className="icon-btn round" onClick={() => onClose(k)} aria-label="Close"><Icon name="x" stroke={2.6} /></button></div>
      <div className="pv-track" ref={ref} onScroll={(e) => { if (Date.now() - prog.current < 700) return; const w = e.currentTarget.clientWidth; const n = Math.round(e.currentTarget.scrollLeft / w); if (n !== k && Math.abs(e.currentTarget.scrollLeft - n * w) < 4) { setK(n); setZoom(false); } }}>
        {pics.map((p, n) => (
          <div key={p + n} className="pv-slide">
            <img src={p} alt="" className={zoom && n === k ? 'zoom' : ''} onDoubleClick={() => setZoom((z) => !z)} onClick={() => setZoom((z) => !z)} />
          </div>
        ))}
      </div>
      {pics.length > 1 && <button className="pv-nav l" onClick={() => go(k - 1)} aria-label="Previous"><Icon name="back" size={26} /></button>}
      {pics.length > 1 && <button className="pv-nav r" onClick={() => go(k + 1)} aria-label="Next"><Icon name="right" size={26} /></button>}
      <div className="pv-dots">{pics.map((p, n) => <i key={p + n} className={n === k ? 'on' : ''} onClick={() => go(n)} />)}</div>
    </div>
  );
}

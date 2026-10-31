import React, { useEffect, useRef, useState } from 'react';
import PromiseStrip from '../components/Promise.jsx';
import { JoinCta, ShareCta } from '../components/Grow.jsx';
import { Icon, Img, VegMark, Wordmark, Logo, Stepper, useToast } from '../ui.jsx';
import { useApp } from '../App.jsx';
import { useRestaurants, useItems, useBanners, useCart, cartStore, useFavs } from '../lib/data.js';
import { CATEGORIES } from '../data/menu.js';
import { priceText, lineText, rupee, LS } from '../lib/utils.js';
import { t } from '../i18n/index.js';
import { FloatingVeggies, Typewriter, Reveal } from '../components/Motion.jsx';
import DishView from '../components/DishView.jsx';
import FreeDelivery from '../components/FreeDelivery.jsx';
import { useOffers, isLive, offerLabel, offerTerms } from '../lib/offers.js';


export default function Home({ nav }) {
  const { user, config, roles } = useApp();
  const toast = useToast();
  const rests = useRestaurants();
  const items = useItems();
  const banners = useBanners();
  const addr = LS.get('pp_addr_label');
  const name = (user?.displayName || '').split(' ')[0];
  const [view, setView] = useState(null);
  const offers = (useOffers() || []).filter(isLive);
  const favs = useFavs();
  const favItems = favs.map((id) => (items || []).find((i) => i.id === id)).filter(Boolean).slice(0, 12);
  const best = (items || []).filter((i) => i.bestseller && i.available !== false && (rests || []).find((r) => r.id === i.restaurantId)?.open !== false).slice(0, 10);

  return (
    <div className="home">
      <header className="home-hero">
        <div className="blob b1" /><div className="blob b2" />
        <FloatingVeggies count={10} seed={3} className="hero-veg" />
        <div className="hero-top">
          <button className="addr-btn" onClick={() => nav.go({ name: 'address' })} aria-label="Delivery address">
            <Icon name="pin" size={20} />
            <span><b>{addr || 'Haidergarh'}</b><small data-notr="">{config.serviceArea}</small></span>
          </button>
          <Logo size={38} />
        </div>
        <div className="pranam" data-notr="" lang="hi">
          <span className="pr-badge" aria-hidden="true"><i className="pr-rays" /><b>🙏</b></span>
          <span className="pr-txt"><b className="pr-word">प्रणाम{name ? ',' : ''}</b>{name && <span className="pr-name">{`${name} जी`}</span>}</span>
        </div>
        <h1 className="hero-title"><em className="ht-2">What would you like to eat?</em></h1>
        <button className="search-bar" onClick={() => nav.go({ name: 'search' })}>
          <Icon name="search" size={20} /><Typewriter prefix="Search" words={['Paneer Butter Masala', 'Sweet Lassi', 'Veg Steamed Momos', 'Gajar ka Halwa', 'Masala Dosa', 'Chocolate Shake', 'Hot Jalebi']} />
        </button>
        <div className="veg-ribbon"><VegMark size={14} /> Pure veg · FREE delivery within 5 km</div>
      </header>

      <FreeDelivery km={config.radiusKm || 5} />
      <PromiseStrip />
      <Banners list={(banners || []).filter((b) => b.active !== false && (!b.code || offers.some((o) => o.code === b.code)))} nav={nav} />

      {offers.length > 0 && (
        <Reveal as="section" className="sec">
          <h2 className="sec-title"><Icon name="star" size={20} className="t-orange" /> Offers for you</h2>
          <div className="offer-row">
            {offers.map((o, i) => (
              <button key={o.id} className="offer-card" style={{ '--c': o.color || '#e8461a', animationDelay: i * 80 + 'ms' }}
                onClick={() => { try { navigator.clipboard.writeText(o.code); } catch { /* ignore */ } toast(t('Code {} copied — apply it in the cart').replace('{}', o.code)); if (o.restaurantId) nav.openRest(o.restaurantId); }}>
                <span className="oc-shine" />
                <b className="oc-big">{offerLabel(o)}</b>
                <span className="oc-title">{o.title}</span>
                <span className="oc-code" data-notr="">{o.code}</span>
                {offerTerms(o) && <small>{offerTerms(o)}</small>}
              </button>
            ))}
          </div>
        </Reveal>
      )}

      <Reveal as="section" className="sec">
        <h2 className="sec-title">What's on your mind?</h2>
        <div className="cat-row">
          {CATEGORIES.map((c, i) => (
            <button key={c.id} className="cat" style={{ animationDelay: i * 50 + 'ms' }} onClick={() => nav.go({ name: 'search', cat: c.id })}>
              <span className="cat-img"><Img src={c.img} alt="" /></span>
              <b>{c.name}</b>
            </button>
          ))}
        </div>
      </Reveal>

      {favItems.length > 0 && (
        <Reveal as="section" className="sec">
          <h2 className="sec-title"><Icon name="heart" size={20} fill="#e8461a" stroke={0} /> Your favourites <button className="link small see-all" onClick={() => nav.go({ name: 'favs' })}>{`See all (${favs.length})`}</button></h2>
          <div className="best-row">
            {favItems.map((it) => <BestCard key={it.id} it={it} rest={(rests || []).find((r) => r.id === it.restaurantId)} onView={() => setView(it)} showKcal={config.showCalories} />)}
          </div>
        </Reveal>
      )}

      {best.length > 0 && (
        <Reveal as="section" className="sec">
          <h2 className="sec-title"><Icon name="fire" size={20} className="t-orange" /> Bestsellers in town</h2>
          <div className="best-row">
            {best.map((it) => <BestCard key={it.id} it={it} rest={rests.find((r) => r.id === it.restaurantId)} onView={() => setView(it)} showKcal={config.showCalories} />)}
          </div>
        </Reveal>
      )}

      <section className="sec">
        <h2 className="sec-title">{rests ? `${rests.length} restaurants to explore` : 'Restaurants'}</h2>
        {!rests && [1, 2, 3].map((i) => <div key={i} className="rest-card skeleton" />)}
        {rests && rests.map((r, i) => <Reveal key={r.id}><RestCard r={r} i={0} onOpen={() => nav.openRest(r.id)} /></Reveal>)}
      </section>

      <section className="sec pad-x home-ctas">
        <ShareCta />
        {!(roles || []).includes('restaurant') && <JoinCta nav={nav} />}
      </section>

      <footer className="home-foot">
        <b>Apna gaon,<br />apna swaad!</b>
        <span>Crafted with <Icon name="heart" size={14} fill="#e8461a" stroke={0} /> in Haidergarh</span>
        <small data-notr="">TechGaon AI Services</small>
      </footer>
      {view && <DishView it={view} rest={(rests || []).find((r) => r.id === view.restaurantId)} showKcal={config.showCalories} onClose={() => setView(null)} />}
      <OfferPopup popup={config.popup} />
    </div>
  );
}

function Banners({ list, nav }) {
  const ref = useRef(null);
  const [i, setI] = useState(0);
  const n = list?.length || 0;
  useEffect(() => {
    if (n < 2) return;
    const x = setInterval(() => setI((v) => (v + 1) % n), 3800);
    return () => clearInterval(x);
  }, [n]);
  useEffect(() => { const el = ref.current; if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' }); }, [i]);
  if (!n) return <div className="banners"><div className="banner skeleton" /></div>;
  return (
    <div className="banners">
      <div className="banner-track" ref={ref} onScroll={(e) => { const w = e.currentTarget.clientWidth; const k = Math.round(e.currentTarget.scrollLeft / w); if (k !== i) setI(k); }}>
        {list.map((b) => (
          <div key={b.id} className={'banner' + (b.link ? ' clickable' : '')} onClick={() => b.link && nav.openRest(b.link)}>
            <Img src={b.img} alt="" className="banner-img kenburns" />
            <div className="banner-txt"><b>{b.title}</b><span>{b.sub}</span>{b.code && <em className="code-pill" data-notr="">{b.code}</em>}</div>
          </div>
        ))}
      </div>
      <div className="dots">{list.map((b, k) => <i key={b.id} className={k === i ? 'on' : ''} />)}</div>
    </div>
  );
}

export function RestCard({ r, i = 0, onOpen }) {
  return (
    <button className={'rest-card' + (r.open === false ? ' closed' : '')} style={{ animationDelay: i * 60 + 'ms' }} onClick={onOpen}>
      <div className="rc-img">
        <Img src={r.cover} alt="" />
        <span className="rc-free">FREE DELIVERY</span>
        {r.open === false && <span className="rc-closed">Closed now</span>}
      </div>
      <div className="rc-body">
        <div className="rc-row"><b className="rc-name" data-notr="">{r.name}</b><span className="rating"><Icon name="star" size={12} fill="#fff" stroke={0} />{Number(r.rating || 4.2).toFixed(1)}</span></div>
        <div className="rc-meta"><Icon name="clock" size={14} /> {`${(r.prepMins || 20) + 10}-${(r.prepMins || 20) + 20} mins`} · <VegMark size={12} /> Pure veg</div>
        <div className="rc-tag">{r.tagline}</div>
      </div>
    </button>
  );
}

function BestCard({ it, rest, onView, showKcal }) {
  const cart = useCart();
  const toast = useToast();
  const qty = cart.items[it.id]?.qty || 0;
  const add = () => {
    if (!cartStore.add(it)) {
      if (confirm(t('Your cart has items from another restaurant. Start a new cart?'))) cartStore.replaceWith(it);
    } else if (!qty) toast(t('Added to cart'));
  };
  return (
    <div className="best-card">
      <button className="bc-img" onClick={onView}><Img src={it.img} alt="" /><span className="bc-shade" /><b>{it.name}</b></button>
      <div className="bc-body">
        <small className="muted" data-notr="">{rest?.name}</small>
        <div className="bc-row"><b>{priceText(it)}</b>{showKcal && it.kcal > 0 && <span className="kcal">{`~${it.kcal} kcal`}</span>}</div>
        <Stepper small qty={qty} onAdd={add} onSub={() => cartStore.sub(it.id)} />
      </div>
    </div>
  );
}

function OfferPopup({ popup }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!popup?.active || !popup.title) return;
    const seen = LS.get('pp_popup_seen');
    if (seen === popup.v) return;
    const x = setTimeout(() => setOpen(true), 1800);
    return () => clearTimeout(x);
  }, [popup?.v, popup?.active]); // eslint-disable-line
  if (!open) return null;
  const close = () => { LS.set('pp_popup_seen', popup.v); setOpen(false); };
  return (
    <div className="sheet-wrap popup-wrap" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div className="offer-popup">
        <button className="icon-btn round pop-x" onClick={close} aria-label="Close"><Icon name="x" /></button>
        {popup.img && <div className="pop-img"><img src={popup.img} alt="" className="kenburns" /></div>}
        <div className="pop-body">
          <span className="pop-badge">Today's offer</span>
          <b>{popup.title}</b>
          {popup.text && <p>{popup.text}</p>}
          {popup.code && <span className="code-pill big" data-notr="">{popup.code}</span>}
          <button className="btn primary block lg" onClick={() => { try { navigator.clipboard.writeText(popup.code || ''); } catch { /* ignore */ } close(); }}>{popup.code ? 'Copy code & order' : 'Order now'}</button>
        </div>
      </div>
    </div>
  );
}

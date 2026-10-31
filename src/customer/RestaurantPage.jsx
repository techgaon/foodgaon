import React, { useMemo, useState } from 'react';
import { Icon, Img, VegMark, Stepper, useToast, Sheet } from '../ui.jsx';
import { useApp } from '../App.jsx';
import { useRestaurants, useItems, useCart, cartStore, useFavs, favStore } from '../lib/data.js';
import { CATEGORIES } from '../data/menu.js';
import { priceText, lineText, rupee } from '../lib/utils.js';
import { t } from '../i18n/index.js';
import DishView from '../components/DishView.jsx';
import { useReviews, ratingOf, ReviewList } from '../components/Reviews.jsx';
import { useOffers, forRestaurant, offerLabel, offerTerms } from '../lib/offers.js';

export default function RestaurantPage({ id, nav }) {
  const { config } = useApp();
  const rest = (useRestaurants() || []).find((r) => r.id === id);
  const all = useItems() || [];
  const [q, setQ] = useState('');
  const [view, setView] = useState(null);
  const items = all.filter((i) => i.restaurantId === id);
  const offers = forRestaurant(useOffers(), id);
  const reviews = useReviews(id);
  const [showRev, setShowRev] = useState(false);
  const groups = useMemo(() => {
    const list = items.filter((i) => !q || i.name.toLowerCase().includes(q.toLowerCase()));
    const best = list.filter((i) => i.bestseller);
    const g = [];
    if (best.length && !q) g.push({ id: 'best', name: 'Bestsellers', items: best });
    CATEGORIES.forEach((c) => { const x = list.filter((i) => i.cat === c.id); if (x.length) g.push({ id: c.id, name: c.name, items: x }); });
    const other = list.filter((i) => !CATEGORIES.some((c) => c.id === i.cat));
    if (other.length) g.push({ id: 'other', name: 'More', items: other });
    return g;
  }, [items, q]);

  if (!rest) return <div className="page"><TopBar onBack={nav.back} /><div className="skeleton" style={{ height: 200, margin: 16 }} /></div>;

  return (
    <div className="rest-page">
      <div className="rp-hero">
        <Img src={rest.cover} alt="" className="kenburns" />
        <div className="rp-shade" />
        <TopBar onBack={nav.back} light />
      </div>
      <div className="rp-card">
        <h1 data-notr="">{rest.name}</h1>
        <p className="muted">{rest.tagline}</p>
        <div className="rp-stats">
          <button className="rating big" onClick={() => setShowRev(true)}><Icon name="star" size={14} fill="#fff" stroke={0} />{ratingOf(reviews, rest.rating).avg.toFixed(1)}{ratingOf(reviews).n > 0 && <small>{` (${ratingOf(reviews).n})`}</small>}</button>
          <span><Icon name="clock" size={16} /> {`${(rest.prepMins || 20) + 10}-${(rest.prepMins || 20) + 20} mins`}</span>
          <span><VegMark size={13} /> Pure veg</span>
        </div>
        <div className="rp-addr"><Icon name="pin" size={15} /> <span data-notr="">{rest.address}</span></div>
        <div className="rp-offer"><Icon name="bike" size={18} /> <b>FREE delivery</b> on every order</div>
        {!rest.demo && <div className="rp-promise"><Icon name="shield" size={16} /> <span><b>Same price as the shop</b> · {rest.verified ? 'FoodGaon verified partner' : 'No platform fee'}</span></div>}
        {offers.length > 0 && (
          <div className="rp-offers">
            {offers.map((o) => (
              <div key={o.id} className="rp-coupon" style={{ '--c': o.color || '#e8461a' }}>
                <span className="rpc-ic"><Icon name="star" size={16} fill="#fff" stroke={0} /></span>
                <div><b>{offerLabel(o)}</b><small><span data-notr="">{o.code}</span>{offerTerms(o) ? ` · ${t(offerTerms(o))}` : ''}</small></div>
              </div>
            ))}
          </div>
        )}
        {rest.open === false && <div className="alert alert-red">This restaurant is closed right now. You can see the menu, ordering opens when it is back.</div>}
      </div>

      <div className="rp-search">
        <Icon name="search" size={18} />
        <input placeholder="Search in menu" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {groups.map((g) => (
        <section key={g.id} className="menu-sec">
          <h3>{g.name} <small>{g.items.length}</small></h3>
          {g.items.map((it) => <MenuItem key={g.id + it.id} it={it} rest={rest} showKcal={config.showCalories} onView={() => setView(it)} />)}
        </section>
      ))}
      {!groups.length && <p className="muted center pad">No dishes found</p>}
      {(reviews || []).some((r) => r.rating) && (
        <section className="menu-sec">
          <h3>What people say <small>{(reviews || []).filter((r) => r.rating).length}</small></h3>
          <ReviewList list={reviews} max={showRev ? 50 : 3} showItems={false} />
          {!showRev && (reviews || []).filter((r) => r.rating).length > 3 && <button className="link" onClick={() => setShowRev(true)}>See all reviews</button>}
        </section>
      )}
      <p className="kcal-note"><Icon name="info" size={14} /> Calories are approximate, per serving shown. Eat mindfully.</p>

      {view && <DishView it={view} rest={rest} showKcal={config.showCalories} onClose={() => setView(null)} />}
    </div>
  );
}

export function TopBar({ onBack, title, light, right }) {
  return (
    <div className={'topbar' + (light ? ' light' : '')}>
      <button className="icon-btn round" onClick={onBack} aria-label="Back"><Icon name="back" stroke={2.6} /></button>
      {title && <h2>{title}</h2>}
      <span className="grow" />
      {right}
    </div>
  );
}

function useAdd(it, rest) {
  const toast = useToast();
  return () => {
    if (rest && rest.open === false) { toast(t('Restaurant is closed right now'), 'err'); return; }
    if (it.available === false) return;
    if (!cartStore.add(it)) {
      if (confirm(t('Your cart has items from another restaurant. Start a new cart?'))) cartStore.replaceWith(it);
    }
  };
}
function ItemAdd({ it, rest }) {
  const cart = useCart(); const add = useAdd(it, rest);
  return <div className="iv-add"><Stepper qty={cart.items[it.id]?.qty || 0} onAdd={add} onSub={() => cartStore.sub(it.id)} /></div>;
}

export function MenuItem({ it, rest, showKcal, onView }) {
  const cart = useCart();
  const qty = cart.items[it.id]?.qty || 0;
  const add = useAdd(it, rest);
  const off = it.available === false;
  return (
    <div className={'menu-item' + (off ? ' off' : '')}>
      <div className="mi-info" onClick={onView}>
        <div className="mi-tags"><VegMark size={13} />{it.bestseller && <span className="best-tag"><Icon name="star" size={11} fill="currentColor" stroke={0} /> Bestseller</span>}</div>
        <b className="mi-name">{it.name}</b>
        <div className="mi-price">{priceText(it)} <small className="muted">· {it.qty}</small></div>
        {showKcal && it.kcal > 0 && <span className="kcal"><Icon name="fire" size={12} /> {`~${it.kcal} kcal`}</span>}
        {it.story ? <p className="mi-desc mi-story" data-notr="" lang="hi">{it.story}</p> : <p className="mi-desc">{it.desc}</p>}
      </div>
      <div className="mi-side">
        <button className="mi-img" onClick={onView}><Img src={it.img} alt="" /></button>
        <FavBtn id={it.id} />
        {off ? <span className="soldout">Sold out</span> : <Stepper qty={qty} onAdd={add} onSub={() => cartStore.sub(it.id)} />}
      </div>
    </div>
  );
}

export function FavBtn({ id, big }) {
  const favs = useFavs();
  const on = favs.includes(id);
  const [pop, setPop] = React.useState(0);
  const toast = useToast();
  return (
    <button className={'fav-btn' + (on ? ' on' : '') + (big ? ' big' : '')} aria-label={on ? 'Remove from favourites' : 'Add to favourites'}
      onClick={(e) => { e.stopPropagation(); const now = favStore.toggle(id); setPop(Date.now()); toast(now ? t('❤️ Saved! See it in Account → My favourites and on Home') : t('Removed from favourites')); }}>
      <Icon key={pop} name="heart" size={big ? 22 : 16} fill={on ? '#e8461a' : 'none'} stroke={on ? 0 : 2} />
    </button>
  );
}

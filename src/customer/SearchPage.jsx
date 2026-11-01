import { useAddresses } from './Address.jsx';
import { servesAddress } from '../lib/delivery.js';
import React, { useState } from 'react';
import { Icon } from '../ui.jsx';
import { useApp } from '../App.jsx';
import { useRestaurants, useItems } from '../lib/data.js';
import { CATEGORIES } from '../data/menu.js';
import { MenuItem, TopBar } from './RestaurantPage.jsx';
import { RestCard } from './Home.jsx';
import { tr } from '../i18n/index.js';
import DishView from '../components/DishView.jsx';

export default function SearchPage({ nav, cat: cat0, stacked }) {
  const { config } = useApp();
  const addresses = useAddresses();
  const address = addresses.list.find(a => a.id === addresses.sel) || addresses.list[0];
  const rests = (useRestaurants() || []).filter(r => servesAddress(r, address, config));
  const items = useItems() || [];
  const [q, setQ] = useState('');
  const [cat, setCat] = useState(cat0 || '');
  const [view, setView] = useState(null);
  const ql = q.trim().toLowerCase();
  const match = (s) => String(s || '').toLowerCase().includes(ql) || tr(String(s || '')).toLowerCase().includes(ql);
  const res = items.filter((i) => rests.some(r => r.id === i.restaurantId) && (!cat || i.cat === cat) && (!ql || match(i.name) || match(i.desc)));
  const rres = ql ? rests.filter((r) => match(r.name) || match(r.tagline)) : [];
  return (
    <div className="page search-page">
      {stacked ? <TopBar onBack={nav.back} title="Search" /> : <div className="page-head"><h2>Search</h2></div>}
      <div className="rp-search sticky">
        <Icon name="search" size={18} />
        <input autoFocus placeholder="Dish or restaurant name" value={q} onChange={(e) => setQ(e.target.value)} />
        {q && <button className="icon-btn" onClick={() => setQ('')} aria-label="Clear"><Icon name="x" size={18} /></button>}
      </div>
      <div className="chip-row">
        <button className={'fchip' + (!cat ? ' on' : '')} onClick={() => setCat('')}>All</button>
        {CATEGORIES.map((c) => <button key={c.id} className={'fchip' + (cat === c.id ? ' on' : '')} onClick={() => setCat(cat === c.id ? '' : c.id)}>{c.name}</button>)}
      </div>
      {rres.map((r) => <div key={r.id} className="pad-x"><RestCard r={r} onOpen={() => nav.openRest(r.id)} /></div>)}
      <div className="pad-x">
        {res.map((it) => {
          const r = rests.find((x) => x.id === it.restaurantId);
          return (
            <div key={it.id} className="search-hit">
              <button className="sh-rest" onClick={() => nav.openRest(it.restaurantId)}><span data-notr="">{r?.name}</span> <Icon name="right" size={14} /></button>
              <MenuItem it={it} rest={r} showKcal={config.showCalories} onView={() => setView(it)} />
            </div>
          );
        })}
        {!res.length && !rres.length && <p className="muted center pad">Nothing found. Try another word.</p>}
      </div>
      {view && <DishView it={view} rest={rests.find((r) => r.id === view.restaurantId)} showKcal={config.showCalories} onClose={() => setView(null)} />}
    </div>
  );
}

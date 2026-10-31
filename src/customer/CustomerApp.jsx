import React, { useEffect, useState } from 'react';
import { BottomNav, Icon } from '../ui.jsx';
import { useApp } from '../App.jsx';
import { useCart, cartTotals, useList, ACTIVE, bindFavs , isRealOrder } from '../lib/data.js';
import { rupee } from '../lib/utils.js';
import Home from './Home.jsx';
import SearchPage from './SearchPage.jsx';
import RestaurantPage from './RestaurantPage.jsx';
import CartPage from './CartPage.jsx';
import { OrdersList, TrackOrder } from './Orders.jsx';
import Account from './Account.jsx';
import { AddressPage } from './Address.jsx';
import FavsPage from './FavsPage.jsx';
import JoinRestaurant from './JoinRestaurant.jsx';

export default function CustomerApp() {
  const { user } = useApp();
  const [tab, setTab] = useState('home');
  const [hisabKey, setHisabKey] = useState(0);
  const [stack, setStack] = useState([]);
  const cart = useCart();
  const { count, total } = cartTotals(cart);
  const myOrders0 = useList('orders', user ? [['customerUid', '==', user.uid]] : null, [user?.uid]);
  const myOrders = myOrders0 && myOrders0.filter(isRealOrder);
  useEffect(() => { bindFavs(user?.uid || null); }, [user?.uid]);
  const active = (myOrders || []).filter((o) => ACTIVE.includes(o.status)).sort((a, b) => b.createdMs - a.createdMs);

  const top = stack[stack.length - 1];
  const go = (s) => { setStack((x) => [...x, s]); window.scrollTo(0, 0); };
  const back = () => { setStack((x) => x.slice(0, -1)); };
  useEffect(() => {
    window.__ppBack = () => { if (stack.length) { back(); return true; } if (tab !== 'home') { setTab('home'); return true; } return false; };
    return () => { window.__ppBack = null; };
  });

  const nav = { go, back, openRest: (id) => go({ name: 'rest', id }), openCart: () => go({ name: 'cart' }), track: (id) => go({ name: 'track', id }) };

  let page;
  if (top?.name === 'rest') page = <RestaurantPage id={top.id} nav={nav} />;
  else if (top?.name === 'cart') page = <CartPage nav={nav} onPlaced={(id) => { setStack([{ name: 'track', id, fresh: true }]); window.scrollTo(0, 0); }} />;
  else if (top?.name === 'search') page = <SearchPage nav={nav} cat={top.cat} stacked />;
  else if (top?.name === 'favs') page = <FavsPage nav={nav} />;
  else if (top?.name === 'address') page = <AddressPage nav={nav} />;
  else if (top?.name === 'join') page = <JoinRestaurant nav={nav} />;
  else if (top?.name === 'track') page = <TrackOrder id={top.id} fresh={top.fresh} nav={nav} />;
  else if (tab === 'search') page = <SearchPage nav={nav} />;
  else if (tab === 'orders') page = <OrdersList key={hisabKey} openHisab={hisabKey > 0} orders={myOrders} nav={nav} />;
  else if (tab === 'account') page = <Account nav={nav} favCount={0} openHisab={() => { setHisabKey(Date.now()); setTab('orders'); window.scrollTo(0, 0); }} />;
  else page = <Home nav={nav} />;

  const showCartBar = count > 0 && top?.name !== 'cart' && top?.name !== 'track';
  const showLive = !showCartBar && active.length > 0 && top?.name !== 'track';

  return (
    <div className={'cust' + (stack.length ? ' has-stack' : '')}>
      <div className="page-anim" key={(top?.name || tab) + (top?.id || '')}>{page}</div>
      {showCartBar && (
        <button className="cart-bar" onClick={nav.openCart}>
          <span className="cb-left"><b key={count} className="bump">{`${count} item${count > 1 ? 's' : ''} added`}</b><small>{rupee(total)} · FREE delivery</small></span>
          <span className="cb-right">View cart <Icon name="right" size={18} stroke={3} /></span>
        </button>
      )}
      {showLive && (
        <button className="live-bar" onClick={() => nav.track(active[0].id)}>
          <span className="live-dot" />
          <span className="grow"><b>{active[0].restaurantName}</b><small>{liveText(active[0].status)}</small></span>
          <span className="cb-right">Track <Icon name="right" size={18} stroke={3} /></span>
        </button>
      )}
      {!stack.length && (
        <BottomNav value={tab} onChange={(x) => { if (x === 'orders') setHisabKey(0); setTab(x); window.scrollTo(0, 0); }} tabs={[
          { id: 'home', icon: 'home', label: 'Home' },
          { id: 'search', icon: 'search', label: 'Search' },
          { id: 'orders', icon: 'receipt', label: 'Orders', badge: active.length },
          { id: 'account', icon: 'user', label: 'Account' },
        ]} />
      )}
    </div>
  );
}
const liveText = (s) => ({ placed: 'Waiting for restaurant to accept', accepted: 'Order accepted', preparing: 'Food is being prepared', ready: 'Ready, rider picking up soon', picked: 'Rider is on the way' }[s] || s);

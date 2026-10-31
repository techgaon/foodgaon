import React, { useState } from 'react';
import { Icon, LangSwitch, Sheet, Logo, Wordmark, useToast } from '../ui.jsx';
import { auth, updateProfile, put, phoneOf } from '../lib/fb.js';
import { t } from '../i18n/index.js';
import { useApp, ROLE_INFO } from '../App.jsx';
import { tel, plain } from '../lib/utils.js';
import { PHOTOS } from '../data/photos.js';
import { useFavs } from '../lib/data.js';
import { JoinCta, ShareCta } from '../components/Grow.jsx';

export default function Account({ nav, openHisab }) {
  const favs = useFavs();
  const { user, config, roles, setRole, logout, askLogin } = useApp();
  const [credits, setCredits] = useState(false);
  const [more, setMore] = useState({});
  React.useEffect(() => { if (credits) import('../data/paragMenu.js').then((m) => setMore(m.PHOTO_CREDITS || {})).catch(() => {}); }, [credits]);
  const [about, setAbout] = useState(false);
  const [nameOpen, setNameOpen] = useState(false);
  const [name, setName] = useState('');
  const toast = useToast();
  const saveName = async () => {
    const n = name.trim(); if (n.length < 2) return;
    try { await updateProfile(auth.currentUser, { displayName: n }); await put('customers', user.uid, { name: n, phone: phoneOf(user) }); location.reload(); } catch { toast(t('Could not save'), 'err'); }
  };
  return (
    <div className="page account">
      <div className="acc-head">
        <span className="acc-av">{(user?.displayName || '?').slice(0, 1).toUpperCase()}</span>
        <div className="grow">
          {user ? <><b data-notr="">{user.displayName || 'Hello!'}</b><small>{plain(phoneOf(user)) || user.email}</small></> : <><b>Welcome!</b><small>Log in to order and track food</small></>}
        </div>
        {!user && <button className="btn light small" onClick={askLogin}>Log in</button>}
        {user && <button className="icon-btn light" onClick={() => { setName(user.displayName || ''); setNameOpen(true); }} aria-label="Edit name"><Icon name="edit" size={20} /></button>}
      </div>
      <div className="pad-x">
        <div className="card">
          <h4><Icon name="lang" size={18} /> Language</h4>
          <LangSwitch />
        </div>
        {roles.length > 1 && (
          <div className="card">
            <h4>Switch to</h4>
            {roles.filter((r) => r !== 'customer').map((r) => (
              <button key={r} className="menu-row" onClick={() => setRole(r)}><Icon name={ROLE_INFO[r].icon} size={20} /><span className="grow">{ROLE_INFO[r].label}</span><Icon name="right" size={18} /></button>
            ))}
          </div>
        )}
        <div className="card">
          <button className="menu-row" onClick={() => nav.go({ name: 'favs' })}><Icon name="heart" size={20} fill="#e8461a" stroke={0} /><span className="grow">My favourites</span><span className="pill">{favs.length}</span><Icon name="right" size={18} /></button>
          {user && <button className="menu-row" onClick={openHisab}><Icon name="wallet" size={20} /><span className="grow">My order hisab</span><small className="muted">Year · month · dates · PDF</small><Icon name="right" size={18} /></button>}
        </div>
        <ShareCta />
        {!roles.includes('restaurant') && <JoinCta nav={nav} />}
        <div className="card">
          <a className="menu-row" href={tel(config.supportPhone)}><Icon name="help" size={20} /><span className="grow">Help & support</span><small className="muted">{config.supportPhone}</small></a>
          <button className="menu-row" onClick={() => setAbout(true)}><Icon name="info" size={20} /><span className="grow">About FoodGaon</span><Icon name="right" size={18} /></button>
          <button className="menu-row" onClick={() => setCredits(true)}><Icon name="image" size={20} /><span className="grow">Photo credits</span><Icon name="right" size={18} /></button>
          {user && <button className="menu-row danger-text" onClick={logout}><Icon name="logout" size={20} /><span className="grow">Log out</span></button>}
        </div>
        <p className="center tiny muted">FoodGaon v1.0 · <span data-notr="">TechGaon AI Services</span></p>
      </div>

      <Sheet open={nameOpen} onClose={() => setNameOpen(false)} title="Your name">
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoFocus />
        <button className="btn primary block" onClick={saveName}>Save</button>
      </Sheet>
      <Sheet open={about} onClose={() => setAbout(false)} title="About FoodGaon">
        <div className="center"><Logo size={64} /><br /><Wordmark size={30} /></div>
        <p>FoodGaon brings hot, fresh, 100% vegetarian food from your town's favourite kitchens to your door — with free delivery.</p>
        <p>Our promise: the same price, portion and quality as at the restaurant counter — with no platform fee, no packing charge and free delivery. We charge restaurants only a very small fee, so local food stays affordable for everyone.</p>
        <p className="muted small">A product of <b data-notr="">TechGaon AI Services</b>.</p>
      </Sheet>
      <Sheet open={credits} onClose={() => setCredits(false)} title="Photo credits">
        <p className="small muted">Dish photos are from Wikimedia Commons, used under their free licences. Restaurants may replace them with their own photos.</p>
        <ul className="credits" data-notr="">
          {Object.values(PHOTOS).map((p) => <li key={p.key}><a href={p.page} target="_blank" rel="noreferrer">{decodeURIComponent(p.page.split('File:')[1]).replace(/_/g, ' ')}</a> — {p.author}, {p.license}</li>)}
          {Object.entries(more).map(([path, [lic, author]]) => { const f = path.split('/').pop(); return <li key={path}><a href={`https://commons.wikimedia.org/wiki/File:${f}`} target="_blank" rel="noreferrer">{decodeURIComponent(f).replace(/_/g, ' ')}</a> — {author || 'Wikimedia Commons'}, {lic}</li>; })}
        </ul>
      </Sheet>
    </div>
  );
}

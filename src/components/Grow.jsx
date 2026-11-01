import React, { useEffect, useState } from 'react';
import { watchDoc } from '../lib/fb.js';
import { Icon, Sheet, useToast } from '../ui.jsx';
import { useApp } from '../App.jsx';
import { feeTerms } from '../lib/partner.js';
import { isNative } from '../lib/native.js';
import { t } from '../i18n/index.js';

const inr = (n) => '₹' + Math.round(n).toLocaleString('en-IN');

/* ------------------------------------------------------------------ */
/*  "Own a restaurant? Join us 💓" — tap opens the full join flow     */
/* ------------------------------------------------------------------ */
const APP_LINE = {
  draft: ['📝', 'Finish your application'],
  submitted: ['🔍', 'Application under review'],
  returned: ['⚠️', 'Changes needed — view'],
  approved: ['🎉', 'Approved — you are live'],
  rejected: ['❌', 'Application not approved'],
  removed: ['❌', 'Removed from FoodGaon'],
};
export function JoinCta({ nav }) {
  const { user } = useApp();
  const [app, setApp] = useState(null);
  useEffect(() => (user ? watchDoc('partnerApps', user.uid, setApp) : undefined), [user?.uid]); // eslint-disable-line
  const go = () => nav.go({ name: 'join' });
  const line = app && APP_LINE[app.status];
  return (
    <div className="card join-cta" role="button" tabIndex={0} onClick={go} onKeyDown={(e) => e.key === 'Enter' && go()}>
      <span className="jc-ic"><Icon name="store" size={24} /></span>
      <span className="grow">
        <b>{line ? 'My restaurant application' : 'Own a restaurant?'}</b>
        {line ? <span className={'jc-status st-' + app.status}>{line[0]} {line[1]}</span> : <span className="jc-hi">Join us <span className="beat" aria-hidden="true">💓</span></span>}
        <small>{line ? 'Tap to check status' : 'Low fees · Direct payments · Free to join'}</small>
      </span>
      <span className="jc-go"><Icon name="right" size={20} /></span>
    </div>
  );
}

/** how the business grows + how easy joining is (Hindi, with graphics) — shown on the join page */
export function GrowStory({ onJoin, joinLabel = 'Join now' }) {
  const { config } = useApp();
  const f = feeTerms(config);
  const gst = 100 * 5 / 105;
  const keep = 100 - gst - f.onHundred;
  const [perDay, setPerDay] = useState(10);
  const [avg, setAvg] = useState(200);
  const extraSale = perDay * avg * 30;
  const extraKeep = extraSale * keep / 100;
  const counter = 40 * avg * 30; // example counter sale, same avg bill
  const maxBar = counter + extraSale;
  const mult = (40 + perDay) / 40;

  return (
      <div className="grow-info">
        <h4 className="gi-h first">How can your business grow?</h4>
        <div className="gi-hero">
          <svg viewBox="0 0 320 120" className="gi-town" aria-hidden="true">
            <defs>
              <linearGradient id="giSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff3e6" /><stop offset="1" stopColor="#ffe2c4" /></linearGradient>
            </defs>
            <rect width="320" height="120" rx="16" fill="url(#giSky)" />
            {/* the shop in the middle */}
            <g transform="translate(130 40)">
              <rect x="0" y="22" width="60" height="44" rx="4" fill="#fff" stroke="#5a3a26" strokeWidth="2" />
              <path d="M-6 22 L6 4 H54 L66 22 Z" fill="#e8461a" />
              <path d="M6 4 L-6 22 M18 4 L12 22 M30 4 V22 M42 4 L48 22 M54 4 L66 22" stroke="#fff" strokeWidth="2" opacity=".7" />
              <rect x="22" y="40" width="16" height="26" rx="2" fill="#ffb37a" />
              <rect x="2" y="-16" width="56" height="15" rx="4" fill="#2b1d16" /><text x="30" y="-5" textAnchor="middle" fontSize="9" fontWeight="800" fill="#ffd36b">Your shop</text>
            </g>
            {/* phones / homes reached */}
            {[[30, 30], [62, 76], [262, 28], [282, 78], [36, 96], [250, 100]].map(([x, y], i) => (
              <g key={i} className="gi-ph" style={{ animationDelay: i * 0.25 + 's' }}>
                <path d={`M160 70 Q ${(160 + x) / 2} ${Math.min(y, 70) - 26} ${x} ${y}`} fill="none" stroke="#e8461a" strokeWidth="1.6" strokeDasharray="4 4" className="gi-line" />
                <rect x={x - 7} y={y - 11} width="14" height="22" rx="3" fill="#2b1d16" />
                <rect x={x - 5} y={y - 8} width="10" height="14" rx="1.5" fill="#3ee08a" />
              </g>
            ))}
          </svg>
          <p>Customers visit your shop today. With FoodGaon, <b>your shop reaches phones across your town.</b></p>
        </div>

        <h4 className="gi-h">Do these problems sound familiar?</h4>
        <PainToCalm />
        <div className="pc-rows">
          {[
            ['📞', 'Repeated calls while cooking', '✅', 'Orders on screen, with an alert'],
            ['💬', 'Scattered chats and missed orders', '📋', 'Every order organised by status'],
            ['📍', 'Confusing directions and wrong addresses', '🗺️', 'Address and map on the rider phone'],
            ['📒', 'Handwritten accounts and forgotten payments', '📊', 'Daily accounts and PDF reports'],
            ['🤔', 'Repeated menu and price questions', '🍽️', 'Customers browse photos and prices'],
          ].map(([a, x, b, y], i) => (
            <div key={x} className="pc-row" style={{ animationDelay: i * 90 + 'ms' }}>
              <div className="pc-bad"><span>{a}</span><small>{x}</small></div>
              <span className="pc-arrow" aria-hidden="true"><svg viewBox="0 0 40 20"><path d="M2 10 H32 M24 3 L33 10 L24 17" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
              <div className="pc-good"><span>{b}</span><small>{y}</small></div>
            </div>
          ))}
        </div>

        <h4 className="gi-h">Five ways to grow</h4>
        <div className="gi-ways">
          {[
            ['👨‍👩‍👧', 'New customers', 'Reach people who cannot visit your shop, from office workers to distant neighbourhoods.'],
            ['🌧️', 'Orders in every season', 'Customers can order from home in rain, heat, cold or late evenings.'],
            ['💰', 'Keep more of your sales', `Large apps may charge ₹25–30 per ₹100. Here the fee is ₹${f.onHundred}.`],
            ['⭐', 'Build trust', 'The same counter prices and portions help build trust through reviews.'],
            ['📒', 'Your accounts on your phone', 'Every order, payment and daily report in one place.'],
          ].map(([e, h, p], i) => (
            <div key={h} className="gi-way" style={{ animationDelay: i * 70 + 'ms' }}>
              <span className="gi-emo">{e}</span><div><b>{h}</b><small>{p}</small></div>
            </div>
          ))}
        </div>

        <h4 className="gi-h">Where does a ₹100 order go?</h4>
        <div className="gi-split">
          <div className="gi-bar">
            <span className="gb-keep" style={{ width: keep + '%' }}>{inr(keep)} yours</span>
            <span className="gb-gst" style={{ width: gst + '%' }} />
            <span className="gb-fee" style={{ width: f.onHundred + '%' }} />
          </div>
          <div className="gi-legend">
            <span><i className="k" />To your account {`₹${Math.round(keep * 100) / 100}`}</span>
            <span><i className="g" />5% GST (paid to the government by FoodGaon) ₹{Math.round(gst * 100) / 100}</span>
            <span><i className="f" />FoodGaon fee ₹{f.onHundred}</span>
          </div>
          <p className="tiny muted">No separate platform or packing fees for customers.</p>
        </div>

        <h4 className="gi-h">Explore potential growth 🚀</h4>
        <div className="gi-double">
          <svg viewBox="0 0 320 150" role="img" aria-label="Example: 40 counter orders plus 40 app orders makes 80 orders">
            <defs><marker id="dblHead" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="#e8461a" /></marker></defs>
            {/* today: one stack */}
            <text x="62" y="16" textAnchor="middle" fontSize="10" fontWeight="800" fill="#5a3a26">Today (counter only)</text>
            {[0, 1, 2, 3].map((i) => <ellipse key={i} cx="62" cy={112 - i * 12} rx="26" ry="8" fill="#f5c04a" stroke="#b8860b" className="dbl-coin" style={{ animationDelay: i * 0.12 + 's' }} />)}
            <text x="62" y="140" textAnchor="middle" fontSize="10" fill="#5a3a26">40 daily orders · 1×</text>
            {/* arrow */}
            <path d="M104 78 H140" stroke="#e8461a" strokeWidth="5" strokeLinecap="round" markerEnd="url(#dblHead)" className="pc-big" />
            <text x="122" y="60" textAnchor="middle" fontSize="10" fontWeight="800" fill="#e8461a">+ app</text>
            {/* with FoodGaon: two stacks */}
            <text x="232" y="16" textAnchor="middle" fontSize="10" fontWeight="800" fill="#1f7a45">Counter + FoodGaon</text>
            {[0, 1, 2, 3].map((i) => <ellipse key={'a' + i} cx="200" cy={112 - i * 12} rx="26" ry="8" fill="#f5c04a" stroke="#b8860b" />)}
            {[0, 1, 2, 3].map((i) => <ellipse key={'b' + i} cx="262" cy={112 - i * 12} rx="26" ry="8" fill="#ffd36b" stroke="#e8461a" className="dbl-coin" style={{ animationDelay: 0.5 + i * 0.15 + 's' }} />)}
            <text x="262" y="60" textAnchor="middle" fontSize="9" fontWeight="800" fill="#e8461a">From app</text>
            <text x="232" y="140" textAnchor="middle" fontSize="10" fill="#1f7a45">40 + 40 = 80 daily orders</text>
            <g className="dbl-badge"><circle cx="300" cy="34" r="17" fill="#1f9d55" /><text x="300" y="39" textAnchor="middle" fontSize="13" fontWeight="900" fill="#fff">2×</text></g>
          </svg>
          <p>If app orders match your counter orders, your <b>sales could potentially double</b> without opening another shop.</p>
          <button className="btn light block" onClick={() => setPerDay(40)}>Explore the 2× example below 👇</button>
          <p className="tiny muted">This is an illustration, not a guarantee. Results depend on food, prices, service and local demand.</p>
        </div>

        <h4 className="gi-h">Try your own estimate</h4>
        <div className="gi-calc">
          <label>New daily app orders? <b>{perDay}</b>
            <input type="range" min="2" max="60" value={perDay} onChange={(e) => setPerDay(+e.target.value)} />
          </label>
          <label>Average order value? <b>₹{avg}</b>
            <input type="range" min="80" max="600" step="10" value={avg} onChange={(e) => setAvg(+e.target.value)} />
          </label>
          <div className="gi-bars">
            <div className="gbx"><span className="lbl">Counter only<br /><small>(example: 40 daily customers)</small></span>
              <div className="trk"><span className="c" style={{ width: (counter / maxBar) * 100 + '%' }}>{inr(counter)}</span></div></div>
            <div className="gbx"><span className="lbl">Counter + FoodGaon</span>
              <div className="trk"><span className="c" style={{ width: (counter / maxBar) * 100 + '%' }} /><span className="a" style={{ width: (extraSale / maxBar) * 100 + '%' }}>+{inr(extraSale)}</span></div></div>
          </div>
          <div className={'gi-mult' + (mult >= 2 ? ' two' : '')}>Total sales <b>{mult.toFixed(2).replace(/\.?0+$/, '')}×</b>{mult >= 2 ? ' — doubled! 🎉' : ''}</div>
          <div className="gi-result">
            <span>Additional monthly sales</span><b>{inr(extraSale)}</b>
            <span>After GST and FoodGaon fees</span><b className="ok">{inr(extraKeep)}</b>
          </div>
          <p className="tiny muted">Illustration only. Actual sales depend on food, prices and service.</p>
        </div>

        <h4 className="gi-h">Join in about 10 minutes</h4>
        <ol className="gi-steps">
          {[
            ['📱', 'Log in with your mobile', '1 min'],
            ['🏪', 'Shop name and address', '3 min'],
            ['🏦', 'Bank account and documents (Aadhaar, FSSAI, PAN, passbook)', '4 min'],
            ['✍️', 'Read and accept the agreement', '2 min'],
            ['✅', 'Go live after our review', ''],
          ].map(([e, h, m], i) => (
            <li key={h} style={{ animationDelay: i * 90 + 'ms' }}><span className="gs-n">{e}</span><span className="grow">{h}</span>{m && <em>{m}</em>}</li>
          ))}
        </ol>
        <div className="gi-free">
          <span>✔ Free to join</span><span>✔ No monthly rental</span><span>✔ Save and continue later</span>
        </div>
        {onJoin && <button className="btn primary block lg" onClick={onJoin}>{joinLabel} <span className="beat" aria-hidden="true">💓</span></button>}
      </div>
  );
}

/** before (calls, chats, notebook chaos) ➜ after (one tidy FoodGaon screen) */
function PainToCalm() {
  return (
    <div className="pc-art">
      <svg viewBox="0 0 340 210" role="img" aria-label="Before: scattered calls, chats and notebooks. With FoodGaon: orders on one screen.">
        <defs>
          <marker id="pcHead" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="#e8461a" /></marker>
        </defs>
        {/* left panel: chaos */}
        <rect x="4" y="4" width="146" height="202" rx="16" fill="#fff1ee" stroke="#f5b5a6" />
        <text x="77" y="24" textAnchor="middle" fontSize="11" fontWeight="800" fill="#b3261e">Before 😓</text>
        {/* ringing phone */}
        <g className="pc-ring" transform="translate(22 36)">
          <rect x="0" y="0" width="30" height="50" rx="6" fill="#2b1d16" />
          <rect x="3" y="6" width="24" height="34" rx="2" fill="#ff8a65" />
          <text x="15" y="28" textAnchor="middle" fontSize="14">📞</text>
          <path d="M-6 8 q-6 10 0 20 M-11 4 q-9 14 0 28" fill="none" stroke="#e8461a" strokeWidth="2" strokeLinecap="round" />
          <path d="M36 8 q6 10 0 20 M41 4 q9 14 0 28" fill="none" stroke="#e8461a" strokeWidth="2" strokeLinecap="round" />
        </g>
        <g transform="translate(22 92)"><rect width="38" height="14" rx="7" fill="#b3261e" /><text x="19" y="10.5" textAnchor="middle" fontSize="8" fontWeight="800" fill="#fff">3 missed calls</text></g>
        {/* chat bubbles */}
        {[[78, 40, 'Send 1 thali'], [86, 62, 'Address? 🤔'], [74, 84, 'Hurry!! 😠']].map(([x, y, tx], i) => (
          <g key={i} className="pc-bub" style={{ animationDelay: i * 0.5 + 's' }}>
            <rect x={x} y={y} width="66" height="17" rx="8" fill="#dcf8c6" stroke="#9ed38a" />
            <text x={x + 33} y={y + 12} textAnchor="middle" fontSize="8.5" fill="#1d3b12">{tx}</text>
          </g>
        ))}
        {/* messy notebook */}
        <g transform="translate(20 118) rotate(-6)">
          <rect width="64" height="70" rx="4" fill="#fffbe6" stroke="#d9c27a" />
          {[14, 26, 38, 50].map((y) => <line key={y} x1="6" y1={y} x2="58" y2={y} stroke="#e6d9a8" />)}
          <path d="M8 12 q8 -6 16 0 t16 0 M8 24 q10 6 20 -2 M10 36 l20 4 M8 48 q14 -8 30 2" fill="none" stroke="#5a3a26" strokeWidth="1.4" />
          <text x="44" y="64" fontSize="13">❓</text>
        </g>
        {/* tangled lines */}
        <path className="pc-tangle" d="M96 120 C 130 110, 70 150, 120 150 S 90 190, 136 180" fill="none" stroke="#b3261e" strokeWidth="1.6" strokeDasharray="3 3" />
        <text x="112" y="200" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#b3261e">Wrong address · Missed order</text>

        {/* big arrow */}
        <path d="M152 105 H182" stroke="#e8461a" strokeWidth="6" strokeLinecap="round" markerEnd="url(#pcHead)" className="pc-big" />

        {/* right panel: calm */}
        <rect x="190" y="4" width="146" height="202" rx="16" fill="#eef8f1" stroke="#9fd8b3" />
        <text x="263" y="24" textAnchor="middle" fontSize="11" fontWeight="800" fill="#1f7a45">With FoodGaon 😊</text>
        <g transform="translate(212 34)">
          <rect width="102" height="164" rx="12" fill="#2b1d16" />
          <rect x="5" y="10" width="92" height="146" rx="6" fill="#fff" />
          <rect x="5" y="10" width="92" height="18" rx="6" fill="#e8461a" />
          <text x="51" y="23" textAnchor="middle" fontSize="8.5" fontWeight="800" fill="#fff">Today’s orders 🔔</text>
          {[['New', '#e8461a', '1 thali ₹120'], ['Cooking', '#f5a524', '2 dosa ₹180'], ['Out', '#1f9d55', 'Paneer ₹210']].map(([st, col, tx], i) => (
            <g key={st} transform={`translate(10 ${34 + i * 30})`} className="pc-order" style={{ animationDelay: 0.4 + i * 0.3 + 's' }}>
              <rect width="82" height="24" rx="5" fill="#fafafa" stroke="#eee" />
              <rect x="4" y="5" width="26" height="14" rx="7" fill={col} />
              <text x="17" y="15" textAnchor="middle" fontSize="6.5" fontWeight="800" fill="#fff">{st}</text>
              <text x="34" y="15" fontSize="7.5" fill="#2b1d16">{tx}</text>
            </g>
          ))}
          <g transform="translate(10 128)">
            <rect width="82" height="22" rx="5" fill="#eef8f1" />
            <text x="41" y="14.5" textAnchor="middle" fontSize="7.5" fontWeight="800" fill="#1f7a45">📍 Address + 📊 Accounts ready</text>
          </g>
        </g>
        {/* sparkles */}
        {[[200, 50], [326, 60], [204, 180], [328, 170]].map(([x, y], i) => <text key={i} x={x} y={y} fontSize="11" className="pc-spark" style={{ animationDelay: i * 0.4 + 's' }}>✨</text>)}
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Share the app  +  ⓘ  (a heartfelt appeal; no rewards, no coupons) */
/* ------------------------------------------------------------------ */
export const appLinkOf = (config) => config?.appLink || 'https://techgaon.in/foodgaon';
export const shareText = (config) =>
  `FoodGaon — Your town’s pure vegetarian food app 🍲\nSame restaurant prices, free delivery and no platform fee.\nGet the app: ${appLinkOf(config)}`;

export async function shareApp(config, toast) {
  const text = shareText(config);
  try {
    if (isNative) { const { Share } = await import('@capacitor/share'); await Share.share({ title: 'FoodGaon', text, dialogTitle: 'Share FoodGaon' }); return; }
    if (navigator.share) { await navigator.share({ title: 'FoodGaon', text }); return; }
    await navigator.clipboard.writeText(text); toast?.(t('Copied'));
  } catch { /* user closed the share sheet */ }
}

export function ShareCta() {
  const { config } = useApp();
  const toast = useToast();
  const [info, setInfo] = useState(false);
  const [note, setNote] = useState(false);
  const wa = 'https://wa.me/?text=' + encodeURIComponent(shareText(config));
  return (
    <>
      <div className="card share-cta">
        <div className="row gap">
          <span className="sc-ic">🤝</span>
          <div className="grow"><b>Share FoodGaon</b><small>One share can support a local livelihood</small></div>
          <button className={'jc-info dark' + (note ? ' on' : '')} onClick={() => setNote((v) => !v)} aria-label="A short note" aria-expanded={note}><Icon name="info" size={22} /></button>
        </div>
        {note && (
          <div className="sc-note" role="note">
            Sharing has no rewards, coins or coupons. It simply helps local restaurants and delivery partners. 🙏
          </div>
        )}
        <button className="sc-why" onClick={() => setInfo(true)}>
          <span className="q">?</span> Why share? <small>Read</small> <Icon name="right" size={16} />
        </button>
        <div className="sc-btns">
          <a className="btn wa" href={wa} target="_blank" rel="noreferrer"><Icon name="chat" size={18} /> WhatsApp</a>
          <button className="btn light" onClick={() => shareApp(config, toast)}><Icon name="swap" size={18} /> Share elsewhere</button>
        </div>
      </div>
      <Sheet open={info} onClose={() => setInfo(false)} title="A small request 🙏">
        <div className="share-info">
          <svg viewBox="0 0 320 110" className="si-art" aria-hidden="true">
            <rect width="320" height="110" rx="16" fill="#fff6ec" />
            <g className="si-chain">
              {[['📱', 40, 'You'], ['👨‍👩‍👧', 120, 'Family and friends'], ['🏪', 200, 'Local restaurant'], ['🛵', 280, 'Delivery partner']].map(([e, x, l], i) => (
                <g key={l} style={{ animationDelay: i * 0.35 + 's' }} className="si-node">
                  <circle cx={x} cy="46" r="24" fill="#fff" stroke="#e8461a" strokeWidth="2" />
                  <text x={x} y="54" textAnchor="middle" fontSize="22">{e}</text>
                  <text x={x} y="92" textAnchor="middle" fontSize="10" fontWeight="700" fill="#5a3a26">{l}</text>
                  {i < 3 && <path d={`M${x + 27} 46 H${x + 53}`} stroke="#e8461a" strokeWidth="2" strokeDasharray="3 3" className="gi-line" />}
                </g>
              ))}
            </g>
          </svg>
          <p className="si-lead">Local restaurants work hard to serve good food. High platform fees can make it difficult for them to compete.</p>
          <p>When you share FoodGaon with family, friends and neighbours:</p>
          <ul className="si-list">
            <li><span>🍲</span><div>A local restaurant reaches <b>New customers</b> and grows its business.</div></li>
            <li><span>🛵</span><div>Local young people find <b>delivery work</b>.</div></li>
            <li><span>🧑‍🍳</span><div>Kitchen workers gain stronger <b>livelihoods</b>.</div></li>
            <li><span>🏡</span><div>Money circulates <b>within our own town</b>.</div></li>
          </ul>
          <div className="si-note">
            <b>One share is a kind gesture.</b> It can help support a local household.
          </div>
          <div className="si-honest">
            <Icon name="shield" size={18} />
            <span><b>To be clear:</b> Sharing comes with <b>no rewards</b>. Share if you want to support local businesses.</span>
          </div>
          <div className="sc-btns">
            <a className="btn wa" href={wa} target="_blank" rel="noreferrer"><Icon name="chat" size={18} /> Share on WhatsApp</a>
            <button className="btn light" onClick={() => shareApp(config, toast)}><Icon name="swap" size={18} /> Elsewhere</button>
          </div>
          <p className="center tiny muted">Thank you 🙏 — Team FoodGaon</p>
        </div>
      </Sheet>
    </>
  );
}

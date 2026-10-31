import React, { useEffect, useState } from 'react';
import { Icon, useToast } from '../ui.jsx';
import { put, patch } from '../lib/fb.js';
import { useList } from '../lib/data.js';
import { fmtDateTime } from '../lib/utils.js';
import PhotoPick from './PhotoPick.jsx';
import { t } from '../i18n/index.js';

export const REVIEW_LINES = ['वाह, क्या स्वाद था — दिल को छू गया!', 'मज़ा आ गया, एकदम घर जैसा खाना', 'गरमा-गरम पहुँचा, पैकिंग भी बढ़िया', 'हर बार यहीं से मँगाऊँगा', 'पैसा वसूल, मात्रा भी भरपूर'];
export const REVIEW_TAGS = ['😋 स्वाद लाजवाब', '📦 अच्छी पैकेजिंग', '⏱️ समय पर डिलीवरी', '🔥 गरमा-गरम खाना', '🍽️ मात्रा भरपूर', '🏆 बेस्ट रेस्टोरेंट', '🙏 डिलीवरी भैया का अच्छा व्यवहार', '💰 पैसा वसूल'];
export const QC = [['taste', 'स्वाद दुकान जैसा था?'], ['portion', 'मात्रा पूरी थी?'], ['fresh', 'खाना ताज़ा और गरम था?']];
const FACES = ['', 'बुरा लगा 😞', 'ठीक-ठाक 😐', 'अच्छा 🙂', 'बहुत बढ़िया 😃', 'लाजवाब! 🤩'];

function Stars({ value, onChange, size = 34 }) {
  return (
    <div className="stars">
      {[1, 2, 3, 4, 5].map((n) => (
        <button type="button" key={n} className={n <= value ? 'on' : ''} onClick={() => onChange(n)} aria-label={`${n} stars`}>
          <Icon name="star" size={size} fill={n <= value ? '#ffb627' : '#eee2d6'} stroke={0} />
        </button>
      ))}
    </div>
  );
}

/** after delivery: food stars + delivery stars + Hindi review with ready-made lines and tap-tags */
export function ReviewBox({ o, user }) {
  const toast = useToast();
  const [food, setFood] = useState(0);
  const [rider, setRider] = useState(0);
  const [text, setText] = useState('');
  const [tags, setTags] = useState([]);
  const [ph, setPh] = useState('');
  const [busy, setBusy] = useState(false);
  const [qc, setQc] = useState({});
  const [cPhoto, setCPhoto] = useState('');
  const issue = Object.values(qc).includes(false);
  useEffect(() => {
    if (text) return undefined;
    let i = 0; let c = 0; let back = false; let tm;
    const tick = () => {
      const w = REVIEW_LINES[i % REVIEW_LINES.length];
      if (!back) { c++; setPh(w.slice(0, c)); if (c >= w.length) { back = true; tm = setTimeout(tick, 1500); return; } } else { c--; setPh(w.slice(0, c)); if (c <= 0) { back = false; i++; } }
      tm = setTimeout(tick, back ? 25 : 70);
    };
    tm = setTimeout(tick, 500);
    return () => clearTimeout(tm);
  }, [text]);
  const toggle = (x) => setTags(tags.includes(x) ? tags.filter((y) => y !== x) : [...tags, x]);
  const submit = async () => {
    if (!food) { toast(t('Please give stars for the food'), 'err'); return; }
    setBusy(true);
    const review = { rating: food, riderRating: rider || 0, review: text.trim().slice(0, 300), reviewTags: tags, reviewMs: Date.now(), qc, issue: issue || food <= 2 };
    try {
      await patch('orders', o.id, review);
      if (cPhoto) await put('complaints', o.id, { customerUid: user.uid, restaurantId: o.restaurantId, img: cPhoto, ms: Date.now() }).catch(() => {});
      await put('reviews', o.id, {
        ...review, orderId: o.id, customerUid: user.uid, name: (user.displayName || o.customerName || 'Customer').split(' ')[0],
        restaurantId: o.restaurantId, restaurantName: o.restaurantName, riderPhone: o.riderPhone || '', items: o.items.map((x) => x.name).slice(0, 5), createdMs: Date.now(),
      });
      toast(t('Thank you! Your review helps the restaurant.'));
    } catch (e) { console.warn(e); toast(t('Could not save'), 'err'); }
    setBusy(false);
  };
  return (
    <div className="card review-box" data-notr="" lang="hi">
      <b className="rb-q">खाना कैसा लगा?</b>
      <Stars value={food} onChange={setFood} />
      {food > 0 && <div className="rb-face">{FACES[food]}</div>}
      {o.riderPhone && (
        <>
          <b className="rb-q small">डिलीवरी कैसी रही?</b>
          <Stars value={rider} onChange={setRider} size={26} />
        </>
      )}
      <div className="qc-box">
        {QC.map(([k, q]) => (
          <div key={k} className="qc-row">
            <span>{q}</span>
            <button type="button" className={'qc-b yes' + (qc[k] === true ? ' on' : '')} onClick={() => setQc({ ...qc, [k]: true })}>हाँ 👍</button>
            <button type="button" className={'qc-b no' + (qc[k] === false ? ' on' : '')} onClick={() => setQc({ ...qc, [k]: false })}>नहीं 👎</button>
          </div>
        ))}
        {issue && (
          <div className="qc-issue">
            <small>माफ़ कीजिए! एक फ़ोटो भेज दें तो FoodGaon रेस्टोरेंट से बात करेगा।</small>
            {cPhoto ? <img src={cPhoto} alt="" className="qc-ph" /> : <PhotoPick onPick={setCPhoto} maxSide={1000} maxLen={250000} />}
          </div>
        )}
      </div>
      <div className="nb-chips wrap">
        {REVIEW_TAGS.map((x) => <button type="button" key={x} className={'nb-chip' + (tags.includes(x) ? ' on' : '')} onClick={() => toggle(x)}>{x}</button>)}
      </div>
      <textarea className="input" rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder={`जैसे: ${ph}|`} />
      <div className="nb-chips">
        {REVIEW_LINES.map((x) => <button type="button" key={x} className="nb-chip" onClick={() => setText(text ? `${text} ${x}` : x)}>+ {x}</button>)}
      </div>
      <button className="btn primary block lg" disabled={busy || !food} onClick={submit}>समीक्षा भेजें</button>
    </div>
  );
}

/** stars + review cards (restaurant page, restaurant panel) */
export function useReviews(restId) {
  return useList('reviews', restId ? [['restaurantId', '==', restId]] : null, [restId]);
}
export function ratingOf(list, fallback) {
  const r = (list || []).filter((x) => x.rating > 0);
  return r.length ? { avg: r.reduce((a, x) => a + x.rating, 0) / r.length, n: r.length } : { avg: Number(fallback || 4.2), n: 0 };
}
export function ReviewList({ list, max = 20, showItems = true }) {
  const l = [...(list || [])].filter((x) => x.rating).sort((a, b) => b.createdMs - a.createdMs).slice(0, max);
  if (!l.length) return <p className="muted small center">No reviews yet</p>;
  const tagCount = Object.entries(l.flatMap((x) => x.reviewTags || []).reduce((m, x) => { m[x] = (m[x] || 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 5);
  return (
    <div className="rev-list" data-notr="" lang="hi">
      {tagCount.length > 0 && <div className="rev-tags">{tagCount.map(([x, n]) => <span key={x}>{x} <b>{n}</b></span>)}</div>}
      {l.map((x) => (
        <div key={x.id} className="rev-card">
          <div className="row between"><b>{x.name}</b><span className="rev-stars">{'★'.repeat(x.rating)}<i>{'★'.repeat(5 - x.rating)}</i></span></div>
          {x.review && <p>{x.review}</p>}
          {(x.reviewTags || []).length > 0 && <div className="rev-mini">{x.reviewTags.map((tg) => <span key={tg}>{tg}</span>)}</div>}
          <small className="muted">{fmtDateTime(x.createdMs)}{showItems && x.items?.length ? ` · ${x.items.join(', ')}` : ''}</small>
        </div>
      ))}
    </div>
  );
}

/** quality check summary of a list of reviews (since `sinceMs`) */
export function qualityOf(list, sinceMs = 0) {
  const l = (list || []).filter((x) => (x.createdMs || 0) >= sinceMs);
  const no = (k) => l.filter((x) => x.qc && x.qc[k] === false).length;
  const asked = (k) => l.filter((x) => x.qc && typeof x.qc[k] === 'boolean').length;
  return { n: l.length, issues: l.filter((x) => x.issue).length, taste: [no('taste'), asked('taste')], portion: [no('portion'), asked('portion')], fresh: [no('fresh'), asked('fresh')], list: l };
}
export function QualityCard({ reviews, title = 'Quality (last 30 days)' }) {
  const q = qualityOf(reviews, Date.now() - 30 * 86400000);
  const pct = ([no, n]) => (n ? Math.round(((n - no) / n) * 100) : null);
  const bar = (label, v) => (
    <div className="q-bar"><span>{label}</span><div className="qb-track"><i style={{ width: (v ?? 0) + '%', background: v == null ? '#ddd' : v >= 90 ? 'var(--veg)' : v >= 75 ? 'var(--turmeric)' : 'var(--red)' }} /></div><b>{v == null ? '—' : v + '%'}</b></div>
  );
  return (
    <div className="card">
      <h4><Icon name="star" size={18} /> {title}</h4>
      {bar('Same taste', pct(q.taste))}{bar('Full portion', pct(q.portion))}{bar('Fresh & hot', pct(q.fresh))}
      <p className="tiny muted">{q.issues ? `${q.issues} complaint(s) in 30 days. Customers compare with your counter — keep it the same.` : 'No complaints. Keep it up!'}</p>
    </div>
  );
}

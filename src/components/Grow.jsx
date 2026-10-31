import React, { useState } from 'react';
import { Icon, Sheet, useToast } from '../ui.jsx';
import { useApp } from '../App.jsx';
import { feeTerms } from '../lib/partner.js';
import { isNative } from '../lib/native.js';
import { t } from '../i18n/index.js';

const inr = (n) => '₹' + Math.round(n).toLocaleString('en-IN');

/* ------------------------------------------------------------------ */
/*  "Own a restaurant? हमसे जुड़ें 💓" — tap opens the full join flow     */
/* ------------------------------------------------------------------ */
export function JoinCta({ nav }) {
  const go = () => nav.go({ name: 'join' });
  return (
    <div className="card join-cta" role="button" tabIndex={0} onClick={go} onKeyDown={(e) => e.key === 'Enter' && go()}>
      <span className="jc-ic"><Icon name="store" size={24} /></span>
      <span className="grow" data-notr="">
        <b>Own a restaurant?</b>
        <span className="jc-hi">हमसे जुड़ें <span className="beat" aria-hidden="true">💓</span></span>
        <small>कम फ़ीस · पैसा सीधे आपके खाते में · जुड़ना मुफ़्त</small>
      </span>
      <span className="jc-go"><Icon name="right" size={20} /></span>
    </div>
  );
}

/** how the business grows + how easy joining is (Hindi, with graphics) — shown on the join page */
export function GrowStory({ onJoin, joinLabel = 'अभी जुड़ें' }) {
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
      <div className="grow-info" data-notr="">
        <h4 className="gi-h first">आपका व्यापार कैसे बढ़ेगा?</h4>
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
              <rect x="2" y="-16" width="56" height="15" rx="4" fill="#2b1d16" /><text x="30" y="-5" textAnchor="middle" fontSize="9" fontWeight="800" fill="#ffd36b">आपकी दुकान</text>
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
          <p>आज ग्राहक आपकी दुकान तक आते हैं। FoodGaon पर आते ही <b>आपकी दुकान पूरे कस्बे के हर फ़ोन तक पहुँचती है।</b></p>
        </div>

        <h4 className="gi-h">क्या आप भी इनसे परेशान हैं?</h4>
        <PainToCalm />
        <div className="pc-rows">
          {[
            ['📞', 'बार-बार फ़ोन — खाना बनाते समय भी', '✅', 'ऑर्डर सीधे स्क्रीन पर, घंटी के साथ'],
            ['💬', 'WhatsApp पर बिखरे मैसेज, ऑर्डर छूट जाना', '📋', 'हर ऑर्डर एक लाइन में — नया, बन रहा, निकल गया'],
            ['📍', 'पता समझाने में 5 मिनट, ग़लत घर', '🗺️', 'पूरा पता + नक्शा, डिलीवरी भैया के फ़ोन पर'],
            ['📒', 'कॉपी में हिसाब, किसने कितना दिया याद नहीं', '📊', 'रोज़ का हिसाब अपने-आप, PDF एक टैप में'],
            ['🤔', '"मेनू में क्या है? दाम क्या है?" — हर बार', '🍽️', 'फ़ोटो सहित मेनू और दाम ग्राहक ख़ुद देखता है'],
          ].map(([a, x, b, y], i) => (
            <div key={x} className="pc-row" style={{ animationDelay: i * 90 + 'ms' }}>
              <div className="pc-bad"><span>{a}</span><small>{x}</small></div>
              <span className="pc-arrow" aria-hidden="true"><svg viewBox="0 0 40 20"><path d="M2 10 H32 M24 3 L33 10 L24 17" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
              <div className="pc-good"><span>{b}</span><small>{y}</small></div>
            </div>
          ))}
        </div>

        <h4 className="gi-h">व्यापार बढ़ने के 5 रास्ते</h4>
        <div className="gi-ways">
          {[
            ['👨‍👩‍👧', 'नए ग्राहक', 'जो लोग दुकान तक नहीं आ पाते — बुज़ुर्ग, ऑफिस वाले, दूर के मोहल्ले — वे भी घर बैठे ऑर्डर करेंगे।'],
            ['🌧️', 'हर मौसम में बिक्री', 'बारिश, धूप, ठंड या देर शाम — जब लोग बाहर नहीं निकलते, तब भी ऑर्डर आते रहेंगे।'],
            ['💰', 'ज़्यादा कमाई आपकी', `बड़े ऐप ₹100 पर ₹25–30 तक ले लेते हैं। यहाँ फ़ीस सिर्फ़ ₹${f.onHundred}।`],
            ['⭐', 'भरोसा और नाम', 'काउंटर जैसा ही दाम और मात्रा — अच्छे रिव्यू से नए ग्राहक भरोसा करके जुड़ते हैं।'],
            ['📒', 'पूरा हिसाब फ़ोन में', 'हर ऑर्डर, हर रुपया, रोज़ की रिपोर्ट और PDF — कॉपी-रजिस्टर की झंझट ख़त्म।'],
          ].map(([e, h, p], i) => (
            <div key={h} className="gi-way" style={{ animationDelay: i * 70 + 'ms' }}>
              <span className="gi-emo">{e}</span><div><b>{h}</b><small>{p}</small></div>
            </div>
          ))}
        </div>

        <h4 className="gi-h">₹100 के ऑर्डर पर पैसा कहाँ जाता है</h4>
        <div className="gi-split">
          <div className="gi-bar">
            <span className="gb-keep" style={{ width: keep + '%' }}>{inr(keep)} आपके</span>
            <span className="gb-gst" style={{ width: gst + '%' }} />
            <span className="gb-fee" style={{ width: f.onHundred + '%' }} />
          </div>
          <div className="gi-legend">
            <span><i className="k" />आपके खाते में {`₹${Math.round(keep * 100) / 100}`}</span>
            <span><i className="g" />5% GST (सरकार को, FoodGaon जमा करेगा) ₹{Math.round(gst * 100) / 100}</span>
            <span><i className="f" />FoodGaon फ़ीस ₹{f.onHundred}</span>
          </div>
          <p className="tiny muted">ग्राहक से कोई अलग प्लेटफ़ॉर्म फ़ीस या पैकिंग चार्ज नहीं — इसलिए ग्राहक बार-बार ऑर्डर करता है।</p>
        </div>

        <h4 className="gi-h">अनुमानित कमाई — दोगुनी तक 🚀</h4>
        <div className="gi-double">
          <svg viewBox="0 0 320 150" role="img" aria-label="आज काउंटर पर रोज़ 40 ऑर्डर; FoodGaon से 40 और जुड़ें तो 80 — बिक्री दोगुनी">
            <defs><marker id="dblHead" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="#e8461a" /></marker></defs>
            {/* today: one stack */}
            <text x="62" y="16" textAnchor="middle" fontSize="10" fontWeight="800" fill="#5a3a26">आज (सिर्फ़ काउंटर)</text>
            {[0, 1, 2, 3].map((i) => <ellipse key={i} cx="62" cy={112 - i * 12} rx="26" ry="8" fill="#f5c04a" stroke="#b8860b" className="dbl-coin" style={{ animationDelay: i * 0.12 + 's' }} />)}
            <text x="62" y="140" textAnchor="middle" fontSize="10" fill="#5a3a26">रोज़ 40 ऑर्डर · 1×</text>
            {/* arrow */}
            <path d="M104 78 H140" stroke="#e8461a" strokeWidth="5" strokeLinecap="round" markerEnd="url(#dblHead)" className="pc-big" />
            <text x="122" y="60" textAnchor="middle" fontSize="10" fontWeight="800" fill="#e8461a">+ ऐप</text>
            {/* with FoodGaon: two stacks */}
            <text x="232" y="16" textAnchor="middle" fontSize="10" fontWeight="800" fill="#1f7a45">काउंटर + FoodGaon</text>
            {[0, 1, 2, 3].map((i) => <ellipse key={'a' + i} cx="200" cy={112 - i * 12} rx="26" ry="8" fill="#f5c04a" stroke="#b8860b" />)}
            {[0, 1, 2, 3].map((i) => <ellipse key={'b' + i} cx="262" cy={112 - i * 12} rx="26" ry="8" fill="#ffd36b" stroke="#e8461a" className="dbl-coin" style={{ animationDelay: 0.5 + i * 0.15 + 's' }} />)}
            <text x="262" y="60" textAnchor="middle" fontSize="9" fontWeight="800" fill="#e8461a">ऐप से</text>
            <text x="232" y="140" textAnchor="middle" fontSize="10" fill="#1f7a45">रोज़ 40 + 40 = 80 ऑर्डर</text>
            <g className="dbl-badge"><circle cx="300" cy="34" r="17" fill="#1f9d55" /><text x="300" y="39" textAnchor="middle" fontSize="13" fontWeight="900" fill="#fff">2×</text></g>
          </svg>
          <p>जितने ग्राहक आज काउंटर पर आते हैं, उतने ही अगर फ़ोन से भी जुड़ जाएँ, तो आपकी <b>बिक्री और कमाई दोगुनी तक</b> हो सकती है — बिना नई दुकान, बिना नए किराए के।</p>
          <button className="btn light block" onClick={() => setPerDay(40)}>नीचे 2× वाला हिसाब देखें 👇</button>
          <p className="tiny muted">यह अनुमान है, गारंटी नहीं — असली बढ़त आपके खाने, दाम, सेवा और इलाक़े के ग्राहकों पर निर्भर करेगी।</p>
        </div>

        <h4 className="gi-h">अपना हिसाब ख़ुद लगाकर देखें</h4>
        <div className="gi-calc">
          <label>ऐप से रोज़ कितने नए ऑर्डर? <b>{perDay}</b>
            <input type="range" min="2" max="60" value={perDay} onChange={(e) => setPerDay(+e.target.value)} />
          </label>
          <label>एक ऑर्डर औसत कितने का? <b>₹{avg}</b>
            <input type="range" min="80" max="600" step="10" value={avg} onChange={(e) => setAvg(+e.target.value)} />
          </label>
          <div className="gi-bars">
            <div className="gbx"><span className="lbl">सिर्फ़ काउंटर<br /><small>(उदाहरण: रोज़ 40 ग्राहक)</small></span>
              <div className="trk"><span className="c" style={{ width: (counter / maxBar) * 100 + '%' }}>{inr(counter)}</span></div></div>
            <div className="gbx"><span className="lbl">काउंटर + FoodGaon</span>
              <div className="trk"><span className="c" style={{ width: (counter / maxBar) * 100 + '%' }} /><span className="a" style={{ width: (extraSale / maxBar) * 100 + '%' }}>+{inr(extraSale)}</span></div></div>
          </div>
          <div className={'gi-mult' + (mult >= 2 ? ' two' : '')}>कुल बिक्री <b>{mult.toFixed(2).replace(/\.?0+$/, '')}×</b>{mult >= 2 ? ' — दोगुनी! 🎉' : ''}</div>
          <div className="gi-result">
            <span>हर महीने अतिरिक्त बिक्री</span><b>{inr(extraSale)}</b>
            <span>GST और फ़ीस के बाद आपके खाते में</span><b className="ok">{inr(extraKeep)}</b>
          </div>
          <p className="tiny muted">यह सिर्फ़ समझाने के लिए उदाहरण है, कोई वादा नहीं। असली बिक्री आपके खाने, दाम और सेवा पर निर्भर करेगी।</p>
        </div>

        <h4 className="gi-h">जुड़ना बहुत आसान — लगभग 10 मिनट</h4>
        <ol className="gi-steps">
          {[
            ['📱', 'मोबाइल नंबर से लॉग इन', '1 मिनट'],
            ['🏪', 'दुकान का नाम, पता, खुलने का समय', '3 मिनट'],
            ['🏦', 'बैंक खाता और कागज़ों की फ़ोटो (FSSAI, PAN, पासबुक)', '4 मिनट'],
            ['✍️', 'अनुबंध पढ़ें और स्वीकार करें', '2 मिनट'],
            ['✅', 'हमारी जाँच के बाद आपकी दुकान ऐप पर लाइव', ''],
          ].map(([e, h, m], i) => (
            <li key={h} style={{ animationDelay: i * 90 + 'ms' }}><span className="gs-n">{e}</span><span className="grow">{h}</span>{m && <em>{m}</em>}</li>
          ))}
        </ol>
        <div className="gi-free">
          <span>✔ जुड़ने का कोई शुल्क नहीं</span><span>✔ कोई मासिक किराया नहीं</span><span>✔ फ़ॉर्म बीच में छोड़ें, बाद में पूरा करें</span>
        </div>
        {onJoin && <button className="btn primary block lg" onClick={onJoin}>{joinLabel} <span className="beat" aria-hidden="true">💓</span></button>}
      </div>
  );
}

/** before (calls, chats, notebook chaos) ➜ after (one tidy FoodGaon screen) */
function PainToCalm() {
  return (
    <div className="pc-art">
      <svg viewBox="0 0 340 210" role="img" aria-label="पहले: फ़ोन, WhatsApp और कॉपी की उलझन। FoodGaon के साथ: सब ऑर्डर एक साफ़ स्क्रीन पर।">
        <defs>
          <marker id="pcHead" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="#e8461a" /></marker>
        </defs>
        {/* left panel: chaos */}
        <rect x="4" y="4" width="146" height="202" rx="16" fill="#fff1ee" stroke="#f5b5a6" />
        <text x="77" y="24" textAnchor="middle" fontSize="11" fontWeight="800" fill="#b3261e">पहले 😓</text>
        {/* ringing phone */}
        <g className="pc-ring" transform="translate(22 36)">
          <rect x="0" y="0" width="30" height="50" rx="6" fill="#2b1d16" />
          <rect x="3" y="6" width="24" height="34" rx="2" fill="#ff8a65" />
          <text x="15" y="28" textAnchor="middle" fontSize="14">📞</text>
          <path d="M-6 8 q-6 10 0 20 M-11 4 q-9 14 0 28" fill="none" stroke="#e8461a" strokeWidth="2" strokeLinecap="round" />
          <path d="M36 8 q6 10 0 20 M41 4 q9 14 0 28" fill="none" stroke="#e8461a" strokeWidth="2" strokeLinecap="round" />
        </g>
        <g transform="translate(22 92)"><rect width="38" height="14" rx="7" fill="#b3261e" /><text x="19" y="10.5" textAnchor="middle" fontSize="8" fontWeight="800" fill="#fff">3 मिस्ड कॉल</text></g>
        {/* chat bubbles */}
        {[[78, 40, '1 थाली भेजो'], [86, 62, 'पता? 🤔'], [74, 84, 'जल्दी!! 😠']].map(([x, y, tx], i) => (
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
        <text x="112" y="200" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#b3261e">ग़लत पता · छूटा ऑर्डर</text>

        {/* big arrow */}
        <path d="M152 105 H182" stroke="#e8461a" strokeWidth="6" strokeLinecap="round" markerEnd="url(#pcHead)" className="pc-big" />

        {/* right panel: calm */}
        <rect x="190" y="4" width="146" height="202" rx="16" fill="#eef8f1" stroke="#9fd8b3" />
        <text x="263" y="24" textAnchor="middle" fontSize="11" fontWeight="800" fill="#1f7a45">FoodGaon के साथ 😊</text>
        <g transform="translate(212 34)">
          <rect width="102" height="164" rx="12" fill="#2b1d16" />
          <rect x="5" y="10" width="92" height="146" rx="6" fill="#fff" />
          <rect x="5" y="10" width="92" height="18" rx="6" fill="#e8461a" />
          <text x="51" y="23" textAnchor="middle" fontSize="8.5" fontWeight="800" fill="#fff">आज के ऑर्डर 🔔</text>
          {[['नया', '#e8461a', '1 थाली ₹120'], ['बन रहा', '#f5a524', '2 डोसा ₹180'], ['निकला', '#1f9d55', 'पनीर ₹210']].map(([st, col, tx], i) => (
            <g key={st} transform={`translate(10 ${34 + i * 30})`} className="pc-order" style={{ animationDelay: 0.4 + i * 0.3 + 's' }}>
              <rect width="82" height="24" rx="5" fill="#fafafa" stroke="#eee" />
              <rect x="4" y="5" width="26" height="14" rx="7" fill={col} />
              <text x="17" y="15" textAnchor="middle" fontSize="6.5" fontWeight="800" fill="#fff">{st}</text>
              <text x="34" y="15" fontSize="7.5" fill="#2b1d16">{tx}</text>
            </g>
          ))}
          <g transform="translate(10 128)">
            <rect width="82" height="22" rx="5" fill="#eef8f1" />
            <text x="41" y="14.5" textAnchor="middle" fontSize="7.5" fontWeight="800" fill="#1f7a45">📍 पता + 📊 हिसाब तैयार</text>
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
  `FoodGaon — हमारे अपने कस्बे का शुद्ध शाकाहारी फ़ूड ऐप 🍲\nरेस्टोरेंट जैसा ही दाम, मुफ़्त डिलीवरी, कोई प्लेटफ़ॉर्म फ़ीस नहीं।\nऐप यहाँ से लें: ${appLinkOf(config)}`;

export async function shareApp(config, toast) {
  const text = shareText(config);
  try {
    if (isNative) { const { Share } = await import('@capacitor/share'); await Share.share({ title: 'FoodGaon', text, dialogTitle: 'FoodGaon शेयर करें' }); return; }
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
      <div className="card share-cta" data-notr="">
        <div className="row gap">
          <span className="sc-ic">🤝</span>
          <div className="grow"><b>FoodGaon शेयर करें</b><small>आपका एक शेयर — किसी की रोज़ी-रोटी</small></div>
          <button className={'jc-info dark' + (note ? ' on' : '')} onClick={() => setNote((v) => !v)} aria-label="छोटा नोट" aria-expanded={note}><Icon name="info" size={22} /></button>
        </div>
        {note && (
          <div className="sc-note" role="note">
            शेयर करने पर कोई इनाम, कॉइन या कूपन नहीं मिलता — यह बस एक नेक काम है, जिससे हमारे कस्बे के छोटे रेस्टोरेंट और डिलीवरी भाइयों का काम बढ़ता है। 🙏
          </div>
        )}
        <button className="sc-why" onClick={() => setInfo(true)}>
          <span className="q">?</span> क्यों शेयर करें? <small>पढ़ें</small> <Icon name="right" size={16} />
        </button>
        <div className="sc-btns">
          <a className="btn wa" href={wa} target="_blank" rel="noreferrer"><Icon name="chat" size={18} /> WhatsApp</a>
          <button className="btn light" onClick={() => shareApp(config, toast)}><Icon name="swap" size={18} /> और जगह शेयर</button>
        </div>
      </div>
      <Sheet open={info} onClose={() => setInfo(false)} title="एक छोटी-सी विनती 🙏">
        <div className="share-info" data-notr="">
          <svg viewBox="0 0 320 110" className="si-art" aria-hidden="true">
            <rect width="320" height="110" rx="16" fill="#fff6ec" />
            <g className="si-chain">
              {[['📱', 40, 'आप'], ['👨‍👩‍👧', 120, 'परिवार-दोस्त'], ['🏪', 200, 'छोटा रेस्टोरेंट'], ['🛵', 280, 'डिलीवरी भैया']].map(([e, x, l], i) => (
                <g key={l} style={{ animationDelay: i * 0.35 + 's' }} className="si-node">
                  <circle cx={x} cy="46" r="24" fill="#fff" stroke="#e8461a" strokeWidth="2" />
                  <text x={x} y="54" textAnchor="middle" fontSize="22">{e}</text>
                  <text x={x} y="92" textAnchor="middle" fontSize="10" fontWeight="700" fill="#5a3a26">{l}</text>
                  {i < 3 && <path d={`M${x + 27} 46 H${x + 53}`} stroke="#e8461a" strokeWidth="2" strokeDasharray="3 3" className="gi-line" />}
                </g>
              ))}
            </g>
          </svg>
          <p className="si-lead">हमारे कस्बे के छोटे ढाबे और रेस्टोरेंट बहुत मेहनत से अच्छा खाना बनाते हैं, पर बड़े ऐप की भारी फ़ीस के आगे वे पीछे रह जाते हैं।</p>
          <p>जब आप FoodGaon अपने परिवार, दोस्तों और मोहल्ले के ग्रुप में शेयर करते हैं, तो:</p>
          <ul className="si-list">
            <li><span>🍲</span><div>किसी छोटे रेस्टोरेंट को <b>नए ग्राहक</b> मिलते हैं — उसका व्यापार बढ़ता है।</div></li>
            <li><span>🛵</span><div>गाँव-कस्बे के नौजवानों को <b>डिलीवरी का रोज़गार</b> मिलता है।</div></li>
            <li><span>🧑‍🍳</span><div>रसोई में काम करने वालों की <b>रोज़ी-रोटी</b> मज़बूत होती है।</div></li>
            <li><span>🏡</span><div>पैसा <b>हमारे अपने कस्बे में</b> ही घूमता है, बाहर नहीं जाता।</div></li>
          </ul>
          <div className="si-note">
            <b>आपका एक शेयर, एक नेक काम है।</b> यह किसी के घर का चूल्हा जलाने में मदद है।
          </div>
          <div className="si-honest">
            <Icon name="shield" size={18} />
            <span><b>साफ़ बात:</b> शेयर करने पर हम कोई इनाम, कॉइन, कैशबैक या कूपन <b>नहीं</b> देते। हम चाहते हैं कि आप शेयर दिल से करें — क्योंकि यह अच्छा काम है, लालच से नहीं।</span>
          </div>
          <div className="sc-btns">
            <a className="btn wa" href={wa} target="_blank" rel="noreferrer"><Icon name="chat" size={18} /> WhatsApp पर शेयर</a>
            <button className="btn light" onClick={() => shareApp(config, toast)}><Icon name="swap" size={18} /> और जगह</button>
          </div>
          <p className="center tiny muted">धन्यवाद 🙏 — टीम FoodGaon</p>
        </div>
      </Sheet>
    </>
  );
}

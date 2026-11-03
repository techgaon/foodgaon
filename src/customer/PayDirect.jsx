import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { patch } from '../lib/fb.js';
import { upiPay, isNative } from '../lib/native.js';
import { directUpiLink, upiClaim } from '../lib/directUpi.js';
import { rupee } from '../lib/utils.js';

export default function PayDirect({ order, merchant, onDone, onClose, autoOpen = false }) {
  const [state, setState] = useState('ready');
  const [message, setMessage] = useState('');
  const saving = useRef(false);
  const launched = useRef(false);
  const hidden = useRef(false);
  const autoStarted = useRef(false);
  useEffect(() => { if (autoOpen && isNative && !autoStarted.current) { autoStarted.current = true; pay(); } }, []);
  const result = useRef({ status: 'CUSTOMER_CONFIRMED' });
  const [utr, setUtr] = useState('');
  const link = directUpiLink(merchant, order.amount, order.id);
  useEffect(() => {
    const returned = () => {
      if (document.hidden) { if (launched.current) hidden.current = true; return; }
      if (!isNative && launched.current && hidden.current) setState('confirm');
    };
    document.addEventListener('visibilitychange', returned);
    return () => document.removeEventListener('visibilitychange', returned);
  }, []);
  const submit = async (reply) => {
    if (saving.current) return;
    saving.current = true; setState('saving');
    try {
      // This is a customer claim only. The restaurant is the only client allowed to mark paid.
      await patch('orders', order.id, { status: 'placed', 'timeline.placed': Date.now(), claimMs: Date.now(), ...upiClaim(reply) });
      setState('sent');
    } catch { saving.current = false; setState('confirm'); setMessage('ऑर्डर भेजा नहीं गया। इंटरनेट जाँचकर दोबारा पुष्टि करें।'); }
  };
  const pay = async () => {
    launched.current = true; hidden.current = false; setState('waiting'); setMessage('');
    const reply = await upiPay(link, ''); // Always use the phone's generic UPI chooser.
    result.current = reply;
    if (reply.status === 'SUCCESS') { await submit(reply); return; }
    if (reply.status === 'WEB') { result.current = { status: 'CUSTOMER_CONFIRMED' }; setState('confirm'); return; }
    setState('confirm');
    setMessage(reply.status === 'NOAPP' ? 'UPI ऐप नहीं खुला। फ़ोन में UPI ऐप उपलब्ध होना चाहिए।' : `UPI स्थिति: ${reply.status}। पहले अपने UPI ऐप में रकम कटने की स्थिति जाँचें।`);
  };
  const cancel = async () => { if (saving.current) return; try { await patch('orders', order.id, { status: 'payment_failed' }); onClose(); } catch { setMessage('इंटरनेट जाँचें। ऑर्डर बंद नहीं हुआ।'); } };
  return createPortal(<div className="paywait direct-pay" data-notr=""><div className="pw-card" role="dialog" aria-label="Direct Merchant UPI">
    <h3>Pay via UPI Live</h3><p className="pw-amt">{rupee(order.amount)}</p>
    <p>{merchant.name}</p><p className="tiny muted">{merchant.vpa}</p>
    {['waiting', 'saving'].includes(state) && <><div className="pw-spin"><span className="pw-ring" /><span className="pw-ring r2" /><b>₹</b></div><h4>{state === 'saving' ? 'Processing…' : 'UPI ऐप में भुगतान पूरा करें'}</h4></>}
    {message && <p role="status" className="small">{message}</p>}
    {state === 'sent' ? <><div className="pw-icon" style={{ color: '#168447', background: '#e7f8ec' }}>✓</div><h3>ऑर्डर भेज दिया गया</h3><p>भुगतान मिलने की पुष्टि रेस्टोरेंट करेगा।</p><button className="btn green block" onClick={() => onDone(order.id)}>ऑर्डर देखें</button></> : <>
      <p className="small muted">रकम सीधे रेस्टोरेंट को जाएगी। बैंक/बिजनेस ऐप से मिलान के बाद भुगतान की पुष्टि होगी।</p>
      {state === 'ready' && <button className="btn primary block lg" onClick={pay}>UPI ऐप चुनें और भुगतान करें</button>}
      {state === 'waiting' && !isNative && <button className="btn ghost block" onClick={() => setState('confirm')}>UPI ऐप से वापस आ गए</button>}
      {state === 'confirm' && <><input className="input" aria-label="UTR" placeholder="UTR / Approval Ref (यदि उपलब्ध हो)" value={utr} maxLength={100} onChange={e => setUtr(e.target.value)} /><button className="btn green block lg" onClick={() => submit({ ...result.current, status: 'CUSTOMER_CONFIRMED', approvalRef: utr.trim() || result.current.approvalRef || '' })}>मैंने भुगतान किया — ऑर्डर भेजें</button><p className="tiny muted">रकम कट गई हो तो दोबारा भुगतान न करें।</p><button className="btn ghost block" onClick={pay}>भुगतान ऐप फिर खोलें</button></>}
      {state !== 'saving' && <button className="btn ghost block" onClick={cancel}>अभी ऑर्डर न भेजें</button>}
    </>}
  </div></div>, document.body);
}

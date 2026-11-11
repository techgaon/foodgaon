import React, { useState } from 'react';
import { Icon, Sheet, useToast } from '../ui.jsx';
import { useList } from '../lib/data.js';
import { patch } from '../lib/fb.js';
import { fmtDateTime } from '../lib/utils.js';
import { MsgFile } from '../admin/RestTools.jsx';
import { t } from '../i18n/index.js';

/* Messages and written notices from FoodGaon admin — strip on top of the restaurant panel */
export default function RestInbox({ rest }) {
  const list = useList('restMsgs', [['restaurantId', '==', rest.id]], [rest.id]);
  const [open, setOpen] = useState(false);
  const [cur, setCur] = useState(null);
  const all = (list || []).slice().sort((a, b) => b.createdMs - a.createdMs);
  const unread = all.filter((m) => !m.readMs);
  const notices = unread.filter((m) => m.kind === 'notice').length;
  if (!all.length) return null;
  return (
    <>
      <button className={'inbox-strip' + (notices ? ' red' : unread.length ? ' on' : '')} onClick={() => setOpen(true)}>
        <Icon name={notices ? 'bell' : 'chat'} size={18} />
        <span className="grow">{unread.length ? `${unread.length} ${t('new from FoodGaon')}${notices ? ` · ${notices} ${t('notice')}` : ''}` : t('Messages & notices from FoodGaon')}</span>
        <Icon name="right" size={16} />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="From FoodGaon">
        {all.map((m) => (
          <button key={m.id} className={'rt-sent' + (m.readMs ? '' : ' unread')} onClick={() => setCur(m)}>
            <span className={'chip ' + (m.kind === 'notice' ? 'chip-red' : 'chip-green')}>{t(m.kind === 'notice' ? 'Notice' : 'Message')}</span>
            <span className="grow"><b data-notr="">{m.title}</b><small className="muted">{fmtDateTime(m.createdMs)}{m.readMs ? '' : ` · ${t('new')}`}</small></span>
            <Icon name="right" size={16} />
          </button>
        ))}
      </Sheet>
      <MsgView m={cur} onClose={() => setCur(null)} />
    </>
  );
}

function MsgView({ m, onClose }) {
  const toast = useToast();
  const [reply, setReply] = useState('');
  if (!m) return null;
  const ack = async () => {
    try { await patch('restMsgs', m.id, { readMs: Date.now(), ...(reply.trim() ? { reply: reply.trim().slice(0, 500), replyMs: Date.now() } : {}) }); toast(t('Thank you — FoodGaon will see that you read it')); onClose(); }
    catch { toast(t('Could not save'), 'err'); }
  };
  return (
    <Sheet open={!!m} onClose={onClose} title={m.title}>
      {m.kind === 'notice' && <div className="alert alert-red">{t('Written notice from FoodGaon')}{m.noticeNo ? <span data-notr="">{` · ${m.noticeNo}`}</span> : null}</div>}
      <p className="tiny muted">{fmtDateTime(m.createdMs)}</p>
      {m.text && <p className="pre" data-notr="">{m.text}</p>}
      {m.fileId && <MsgFile m={m} />}
      {m.readMs ? (
        <p className="t-green small">{`✓ ${t('You marked this as read')} · ${fmtDateTime(m.readMs)}`}{m.reply ? <><br /><span className="muted" data-notr="">{m.reply}</span></> : null}</p>
      ) : (
        <>
          <textarea className="input" rows={2} maxLength={500} value={reply} onChange={(e) => setReply(e.target.value)} placeholder={t('Reply to FoodGaon (optional)')} />
          <button className="btn primary block lg" onClick={ack}>{t(m.kind === 'notice' ? 'I have read this notice' : 'Read — OK')}</button>
        </>
      )}
    </Sheet>
  );
}

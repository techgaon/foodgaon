import React, { useState } from 'react';
import { Icon, Sheet, useToast } from '../ui.jsx';
import { t } from '../i18n/index.js';
import { phoneOf } from '../lib/fb.js';
import { deletionRequest, DELETION_EMAIL, DELETION_POLICY_URL } from '../lib/accountDeletion.js';

export default function AccountDeletion({ user }) {
  const [open, setOpen] = useState(false);
  const toast = useToast();
  const request = deletionRequest({ phone: phoneOf(user), email: user?.email }, t);
  const copy = async () => {
    try { await navigator.clipboard.writeText(request.text); toast(t('Deletion request copied. Send it to our support team.')); }
    catch { toast(t('Could not copy. Open the request text below and copy it.'), 'err'); }
  };
  return <>
    <button className="menu-row danger-text" onClick={() => setOpen(true)}><Icon name="trash" size={20} /><span className="grow">Delete account & data</span><Icon name="right" size={18} /></button>
    <Sheet open={open} onClose={() => setOpen(false)} title={t('Delete account & data')}>
      <p>Request deletion of your FoodGaon account and associated personal data.</p>
      {(request.mobile || request.email) && <div className="card"><b>Account to delete</b><p className="small" data-notr="">{request.mobile || request.email}{request.mobile && request.email ? <><br />{request.email}</> : null}</p></div>}
      <p className="small">This includes your profile, saved addresses, favourites, family dates and photos. Records needed for billing, legal duties or disputes may be retained as explained in our policy.</p>
      <p className="small">We verify account ownership before processing. We aim to complete eligible verified requests within 30 days.</p>
      <a className="btn primary block" href={request.emailHref}>Request deletion by email</a>
      <a className="btn ghost block" style={{ marginTop: 12 }} href={request.whatsappHref} target="_blank" rel="noopener noreferrer">Request deletion on WhatsApp</a>
      <p className="small muted">Send the prepared message in your email or WhatsApp app. Opening a draft does not submit the request or delete your account.</p>
      {!request.mobile && !request.email && <p className="small">Add your registered mobile number or Google email to the message.</p>}
      <p className="small"><b>Never send an OTP, login PIN or identity document with this request.</b></p>
      <button className="btn ghost block" onClick={copy}>Copy deletion request</button>
      <details style={{ marginTop: 16 }}><summary>View request text</summary><textarea className="input" readOnly rows={7} aria-label={t('Deletion request text')} value={request.text} /></details>
      <p className="small" data-notr="">{DELETION_EMAIL}</p>
      <a className="link" href={DELETION_POLICY_URL} target="_blank" rel="noopener noreferrer">Read account deletion policy</a>
    </Sheet>
  </>;
}

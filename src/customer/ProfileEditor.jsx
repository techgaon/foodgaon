import React, { useState } from 'react';
import { auth, put, updateProfile, phoneOf } from '../lib/fb.js';
import { compressImage } from '../lib/utils.js';
import { RELATIONS, localDate, validPastDate } from '../lib/celebrations.js';
import { Field, useToast } from '../ui.jsx';
import { t } from '../i18n/index.js';

export default function ProfileEditor({ user, profile, onSaved }) {
  const [form, setForm] = useState(() => ({ name: profile?.name || user.displayName || '', gender: profile?.gender || 'male', birthday: profile?.birthday || '', anniversary: profile?.anniversary || '', photo: profile?.photo || '', family: Array.isArray(profile?.family) ? profile.family : [], celebrationsEnabled: profile?.celebrationsEnabled !== false }));
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const toast = useToast();
  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));
  const member = (index, key, value) => setForm(f => ({ ...f, family: f.family.map((m, i) => i === index ? { ...m, [key]: value } : m) }));
  const photo = async e => {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 12 * 1024 * 1024) { toast(t('Choose a photo smaller than 12 MB.'), 'err'); return; }
    setPhotoBusy(true);
    try { set('photo', await compressImage(file, 480, 80000)); }
    catch { toast(t('Could not read the photo. Please choose another image.'), 'err'); }
    finally { setPhotoBusy(false); }
  };
  const save = async e => {
    e.preventDefault(); if (busy || photoBusy) return;
    const name = form.name.trim();
    if (name.length < 2 || form.family.some(m => !m.name.trim())) { toast(t('Please enter a name for each person.'), 'err'); return; }
    if ([form, ...form.family].some(m => !validPastDate(m.birthday) || !validPastDate(m.anniversary))) { toast(t('Choose valid dates that are not in the future.'), 'err'); return; }
    setBusy(true);
    try {
      await put('customers', user.uid, { ...form, name, phone: phoneOf(user) || profile?.phone || '', family: form.family.map(m => ({ name: m.name.trim().slice(0, 40), relation: m.relation || 'other', birthday: m.birthday || '', anniversary: m.anniversary || '' })) });
      await updateProfile(auth.currentUser, { displayName: name });
      toast(t('Profile saved')); onSaved();
    } catch { toast(t('Could not save. Your changes are still here; please try again.'), 'err'); }
    finally { setBusy(false); }
  };
  const date = (value, onChange, label) => <Field label={label}><input className="input" type="date" min="1900-01-01" max={localDate()} value={value} onChange={e => onChange(e.target.value)} /></Field>;
  return <form onSubmit={save} className="profile-editor">
    <fieldset disabled={busy || photoBusy}>
      <div className="profile-photo">{form.photo ? <img src={form.photo} alt="Your profile photo" /> : <span aria-hidden="true">{form.name.slice(0, 1) || '☺'}</span>}</div>
      <div className="row gap wrap">
        <label className="btn small ghost">Camera / selfie<input hidden type="file" accept="image/*" capture="user" onChange={photo} /></label>
        <label className="btn small ghost">Gallery<input hidden type="file" accept="image/*" onChange={photo} /></label>
        {form.photo && <button type="button" className="link" onClick={() => set('photo', '')}>Remove photo</button>}
      </div>
      {photoBusy && <p role="status">Preparing photo…</p>}
      <Field label="Your name"><input className="input" maxLength={40} value={form.name} onChange={e => set('name', e.target.value)} required /></Field>
      <Field label="Gender"><select className="input" value={form.gender} onChange={e => set('gender', e.target.value)}><option value="male">Male</option><option value="female">Female</option><option value="transgender">Transgender</option></select></Field>
      {date(form.birthday, v => set('birthday', v), 'Birthday')}
      {date(form.anniversary, v => set('anniversary', v), 'Wedding anniversary')}
      <h4>Family members</h4><p className="small muted">Dates are optional. Add only the family details you want to save.</p>
      {form.family.map((m, i) => <div className="card family-member" key={i}>
        <Field label="Name"><input className="input" maxLength={40} required value={m.name} onChange={e => member(i, 'name', e.target.value)} /></Field>
        <Field label="Relationship"><select className="input" value={m.relation} onChange={e => member(i, 'relation', e.target.value)}>{RELATIONS.map(([id, label]) => <option value={id} key={id}>{label}</option>)}</select></Field>
        {date(m.birthday, v => member(i, 'birthday', v), 'Birthday')}
        {date(m.anniversary, v => member(i, 'anniversary', v), 'Wedding anniversary')}
        <button type="button" className="link danger-text" onClick={() => set('family', form.family.filter((_, n) => n !== i))}>Remove member</button>
      </div>)}
      {form.family.length < 12 && <button type="button" className="btn ghost block" onClick={() => set('family', [...form.family, { name: '', relation: 'child', birthday: '', anniversary: '' }])}>Add family member</button>}
      <label className="check-row"><input type="checkbox" checked={form.celebrationsEnabled} onChange={e => set('celebrationsEnabled', e.target.checked)} /> Show birthday and anniversary wishes in the app</label>
      <p className="small muted">Your family details and photo stay in your private profile. Wishes appear here when you open the app; no SMS is sent.</p>
      <button className="btn primary block" type="submit">{busy ? 'Saving…' : 'Save profile'}</button>
    </fieldset>
  </form>;
}

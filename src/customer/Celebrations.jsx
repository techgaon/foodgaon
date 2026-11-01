import React, { useEffect, useState } from 'react';
import { celebrationMessages, localDate } from '../lib/celebrations.js';
import { useApp } from '../App.jsx';

export default function Celebrations() {
  const { user, profile } = useApp();
  const [today, setToday] = useState(localDate);
  const [hidden, setHidden] = useState('');
  useEffect(() => {
    const update = () => setToday(localDate());
    document.addEventListener('visibilitychange', update);
    const timer = setInterval(update, 60000);
    return () => { document.removeEventListener('visibilitychange', update); clearInterval(timer); };
  }, []);
  const messages = celebrationMessages(profile, today);
  if (!user || !messages.length || hidden === `${user.uid}-${today}`) return null;
  return <aside className="celebration-card" lang="hi" data-notr="" aria-label="आज की शुभकामनाएँ">
    <button className="icon-btn celebration-close" aria-label="शुभकामनाएँ बंद करें" onClick={() => setHidden(`${user.uid}-${today}`)}>×</button>
    <span className="celebration-symbol" aria-hidden="true">🎉 🎂 ✨</span>
    <h3>आपके परिवार की खुशी, FoodGaon के साथ</h3>
    {messages.map(m => <p key={m.id}>{m.text}</p>)}
    <small>FoodGaon परिवार की ओर से ढेर सारा प्यार 💚</small>
  </aside>;
}

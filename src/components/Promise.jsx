import React, { useState } from 'react';
import { Icon, Sheet } from '../ui.jsx';
import { useApp } from '../App.jsx';
import { tel } from '../lib/utils.js';

const TILES = [
  ['store', 'Same price as the shop', 'No app markup'],
  ['heart', 'Same taste, full portion', 'Checked after every order'],
  ['cash', '₹0 platform fee', 'No packing or hidden charge'],
  ['bike', 'FREE delivery', 'By the restaurant itself'],
];

/** FoodGaon's promise to customers — the opposite of big-app markups and fees */
export default function PromiseStrip() {
  const { config } = useApp();
  const [open, setOpen] = useState(false);
  return (
    <section className="sec promise-sec">
      <button className="promise-card" onClick={() => setOpen(true)}>
        <div className="pc-head"><span className="pc-seal"><Icon name="shield" size={20} /></span><b>The FoodGaon promise</b><small>Know more <Icon name="right" size={14} /></small></div>
        <div className="pc-grid">
          {TILES.map(([ic, h, s], i) => (
            <div key={h} className="pc-tile" style={{ animationDelay: i * 90 + 'ms' }}><span><Icon name={ic} size={20} /></span><b>{h}</b><small>{s}</small></div>
          ))}
        </div>
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="The FoodGaon promise">
        <p>On many big food apps, the same dish costs more than at the shop, and platform, packing and delivery fees are added on top.</p>
        <p><b>FoodGaon is different.</b> Every restaurant signs an agreement with us:</p>
        <ul className="ready-list">
          <li>Prices on FoodGaon are the same as the counter price.</li>
          <li>Same portion, same recipe, same quality — freshly made.</li>
          <li>No platform fee, no packing charge, free delivery.</li>
          <li>After every order we ask you about taste, portion and freshness. Restaurants with repeated complaints are warned and can be removed.</li>
        </ul>
        <p className="small muted">Something not right? Tell us — we will talk to the restaurant.</p>
        <a className="btn primary block" href={tel(config.supportPhone)}><Icon name="phone" size={18} /> Call FoodGaon</a>
      </Sheet>
    </section>
  );
}

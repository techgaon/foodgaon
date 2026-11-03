import React from 'react';
import rider from '../assets/delivery-rider-fg.png';

export default function RasterDeliveryScooter() {
  return <div className="fd-raster-scooter">
    <img src={rider} width="1536" height="1024" alt="" />
    {[28, 75.2].map(left => <svg key={left} className="fd-raster-wheel" style={{ left: `${left}%` }} viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v16M4 12h16M6.3 6.3l11.4 11.4M6.3 17.7 17.7 6.3" fill="none" stroke="#9c8d72" strokeWidth="1.2" /><circle cx="12" cy="12" r="2.3" fill="#62584c" /></svg>)}
  </div>;
}

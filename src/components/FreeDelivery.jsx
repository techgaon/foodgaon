import React from 'react';
import DeliveryScooter from './DeliveryScooter.jsx';

/* Animated "FREE delivery on all orders" strip — scooter rides along a road */
export default function FreeDelivery({ compact }) {
  return (
    <div className={'fd-hero' + (compact ? ' compact' : '')} role="note" aria-label="Free delivery on all orders">
      <div className="fd-txt">
        <b>FREE <span>delivery</span></b>
        <small>on all orders</small>
      </div>
      <div className="fd-scene" aria-hidden="true">
        <svg className="fd-village" viewBox="0 0 160 80"><circle cx="125" cy="15" r="10" fill="#ffe066" /><path d="M4 65V39L22 23 40 39V65M50 65V29L75 10 100 29V65M111 65V43L131 28 151 43V65" fill="#fff" fillOpacity=".15" stroke="#fff" strokeOpacity=".25" strokeWidth="2" /><path d="M17 65V48H28V65M67 65V43H82V65M124 65V51H136V65" fill="#0b5a32" fillOpacity=".3" /></svg>
        <div className="fd-road"><i /><i /><i /><i /><i /><i /></div>
        <DeliveryScooter />
      </div>
    </div>
  );
}

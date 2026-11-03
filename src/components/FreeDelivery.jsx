import React from 'react';
import DeliveryScooter from './RasterDeliveryScooter.jsx';
import VillageRoad from './VillageRoad.jsx';

/* Animated "FREE delivery on all orders" strip — scooter rides along a road */
export default function FreeDelivery({ compact }) {
  return (
    <div className={'fd-hero fd-rural' + (compact ? ' compact' : '')} role="note" aria-label="Free delivery on all orders">
      <div className="fd-txt">
        <b>FREE <span>delivery</span></b>
        <small>on all orders</small>
      </div>
      <div className="fd-scene" aria-hidden="true">
        <VillageRoad />
        <div className="fd-road"><i /><i /><i /><i /><i /><i /></div>
        <DeliveryScooter />
      </div>
    </div>
  );
}

import React from 'react';
import { Logo } from '../ui.jsx';
import { FoodOrbit, FloatingVeggies } from './Motion.jsx';
import { photo } from '../data/photos.js';
import riderArtwork from '../assets/splash-rider-fg.png';

export default function SplashScreen() {
  return (
    <div className="splash splash-delivery" role="status" aria-label="FoodGaon is opening">
      <div className="splash-glow" />
      <FloatingVeggies count={12} seed={5} />
      <img className="splash-rider-art" src={riderArtwork} width="1529" height="1028" alt="FoodGaon delivery rider with an FG bag" fetchPriority="high" />
      <div className="splash-original-art"><FoodOrbit photos={['jalebi', 'chole_bhature', 'mango_lassi', 'idli', 'chowmein', 'rasmalai', 'pizza'].map(photo)} size={240} itemSize={58}><Logo size={96} animate /></FoodOrbit></div>
      <p>Pure veg · Pure pyaar</p>
      <div className="splash-dots" aria-hidden="true"><i /><i /><i /></div>
    </div>
  );
}



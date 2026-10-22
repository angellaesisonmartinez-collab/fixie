import React from 'react';
import ringsGraphic from '../assets/header-rings-perfect.png';

export default function HeaderRings({ className = '' }) {
  return (
    <div className={`hero-banner-rings header-card-rings ${className}`} aria-hidden="true">
      <img src={ringsGraphic} alt="" className="hero-banner-rings-img" width="139" height="142" />
    </div>
  );
}


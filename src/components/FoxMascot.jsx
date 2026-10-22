import React from 'react';
import fixieMascotImg from '../assets/fixie-mascot.png';

export default function FoxMascot({ className = '', width = 210, height = 230 }) {
  return (
    <img
      src={fixieMascotImg}
      alt="Fixie Fox Mascot wearing a safety helmet"
      className={`hero-mascot-img ${className}`}
      style={{ width: `${width}px`, height: `${height}px`, objectFit: 'contain' }}
    />
  );
}

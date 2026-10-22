import React from 'react';
import fixieLogo from '../assets/fixie-logo.png';

export default function FixieLogo() {
  return (
    <div className="fixie-logo-container">
      <img 
        src={fixieLogo} 
        alt="Fixie Logo" 
        className="fixie-brand-logo-img" 
      />
    </div>
  );
}

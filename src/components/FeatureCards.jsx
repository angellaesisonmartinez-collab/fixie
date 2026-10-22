import React from 'react';
import { Wrench, CornerUpRight, GitFork, ShieldCheck } from 'lucide-react';

export default function FeatureCards() {
  const features = [
    {
      id: 1,
      icon: <Wrench className="feature-icon text-red" size={20} />,
      iconBg: 'bg-light-red',
      text: 'Report broken hardware (PCs, displays, keyboards, mice)'
    },
    {
      id: 2,
      icon: <CornerUpRight className="feature-icon text-gray" size={20} />,
      iconBg: 'bg-light-gray',
      text: 'Flag network, patch cable, or LAN packet drops instantly'
    },
    {
      id: 3,
      icon: <GitFork className="feature-icon text-indigo" size={20} />,
      iconBg: 'bg-light-indigo',
      text: 'Track real-time status of your submitted incident reports'
    },
    {
      id: 4,
      icon: <ShieldCheck className="feature-icon text-green" size={20} />,
      iconBg: 'bg-light-green',
      text: 'Verify laboratory workstation readiness before class session'
    }
  ];

  return (
    <div className="feature-cards-grid">
      {features.map((feature) => (
        <div key={feature.id} className="feature-card">
          <div className={`feature-icon-wrapper ${feature.iconBg}`}>
            {feature.icon}
          </div>
          <p className="feature-card-text">{feature.text}</p>
        </div>
      ))}
    </div>
  );
}

import React from 'react';
import fixieMascot from '../assets/fixie-mascot.png';
import fixieWordmark from '../assets/fixie-wordmark.png';

/**
 * Standardized Fixie Sidebar Logo Lockup
 * Recreates the exact structure, sizing, alignment, spacing, and styling of the reference logo:
 * - Left: Fixie mascot with yellow hard hat & green scarf
 * - Right:
 *     - Top: "Fixie" wordmark with orange wrench icon
 *     - Bottom: Two-line uppercase monospace tagline:
 *         "LABORATORY READINESS &"
 *         "MAINTENANCE MONITORING"
 * - Horizontally centered within the sidebar header container
 */
export default function SidebarLogo({ className = '' }) {
  return (
    <div
      className={`sidebar-brand-lockup ${className}`}
      role="img"
      aria-label="Fixie - Laboratory Readiness & Maintenance Monitoring"
    >
      <img
        src={fixieMascot}
        alt="Fixie Mascot"
        className="sidebar-brand-mascot"
      />
      <div className="sidebar-brand-text-col">
        <img
          src={fixieWordmark}
          alt="Fixie"
          className="sidebar-brand-wordmark"
        />
        <div className="sidebar-brand-tagline" aria-hidden="true">
          <span className="sidebar-brand-tagline-line">LABORATORY READINESS &amp;</span>
          <span className="sidebar-brand-tagline-line">MAINTENANCE MONITORING</span>
        </div>
      </div>
    </div>
  );
}

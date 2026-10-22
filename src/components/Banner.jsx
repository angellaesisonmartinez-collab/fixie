import React from 'react';
import ringsGraphic from '../assets/banner-rings-from-ref.png';

/**
 * Banner Component (Matching Technical Personnel Hero Card)
 * - White card with 10px border radius and subtle border
 * - Title: Bold dark forest green (#0A2916) in Barlow Semi Condensed / Cambria
 * - Subtitle: Neutral dark text (#333333)
 * - Optional showRings: Interlocking green circular rings (defaults to true; false removes rings)
 * - Optional children: Actions (e.g., Report a problem button) placed on the right
 */
export default function Banner({
  title = 'Your Laboratory Overview',
  subtitle = 'Monitor laboratory readiness, review equipment reports, and keep maintenance activities on track.',
  className = '',
  ariaLabel = 'Laboratory Overview Header',
  showRings = true,
  children,
}) {
  return (
    <section className={`dashboard-hero-card ${className} ${!showRings ? 'no-rings' : ''}`} aria-label={ariaLabel}>
      <div className="hero-card-left">
        <h1 className="hero-card-title">{title}</h1>
        <p className="hero-card-subtitle">{subtitle}</p>
      </div>

      {children && (
        <div className={`hero-card-actions ${!showRings ? 'no-rings-actions' : ''}`}>
          {children}
        </div>
      )}

      {/* Circle ring design */}
      {showRings && (
        <div className="hero-card-rings-wrapper" aria-hidden="true">
          <img
            src={ringsGraphic}
            alt=""
            className="hero-card-rings-img"
            width="174"
            height="139"
          />
        </div>
      )}
    </section>
  );
}

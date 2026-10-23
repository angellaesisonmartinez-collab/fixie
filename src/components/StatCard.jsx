import React from 'react';
import GuideMetricNumber from './GuideMetricNumber';

/**
 * Reusable StatCard Component (Image 4 Reference)
 * Reused for all 4 dashboard metric cards:
 * - Card 1: TOTAL STUDENTS (User icon)
 * - Card 2: TOTAL REPORTS (FileText icon)
 * - Card 3: TOTAL GUIDES (BookOpen icon)
 * - Card 4: RESOLVED (FileCheck icon with #116B31 green border)
 *
 * Features:
 * - Card size, border radius (10px), subtle shadow, padding
 * - Serif font for title and large number (Playfair Display)
 * - Icon badge: 38x38px, background #B5D1BF, dark green icon (#083908)
 * - Divider line between number and caption text
 * - Caption footer with green highlight support
 */
export default function StatCard({
  title,
  value,
  icon: IconComponent,
  caption,
  highlight,
  isResolved = false,
  isOnHold = false,
  onClick,
  loading = false,
}) {
  const isLoading = loading || value === null || value === undefined;

  return (
    <div
      className={`dashboard-stat-card ${isResolved ? 'stat-card-resolved-border' : ''} ${isOnHold ? 'stat-card-on-hold' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      {/* Top Header: Serif Title and Icon Badge */}
      <div className="stat-card-header">
        <span className="stat-card-title-serif">{title}</span>
        <div className={`stat-card-icon-badge ${isOnHold ? 'badge-on-hold' : ''}`} aria-hidden="true">
          {IconComponent && <IconComponent size={18} strokeWidth={2.2} className={`stat-badge-svg ${isOnHold ? 'icon-on-hold' : ''}`} />}
        </div>
      </div>

      {/* Large Metric Number */}
      <div className="stat-card-value-display">
        <GuideMetricNumber value={value} loading={isLoading} className="stat-number-serif" />
      </div>

      {/* Divider Line between number and caption */}
      <div className="stat-card-divider-line" aria-hidden="true" />

      {/* Footer Caption */}
      <p className="stat-card-caption">
        {highlight && caption.includes(highlight) ? (
          <>
            {caption.substring(0, caption.indexOf(highlight))}
            <strong className="stat-month-highlight">{highlight}</strong>
            {caption.substring(caption.indexOf(highlight) + highlight.length)}
          </>
        ) : (
          caption
        )}
      </p>
    </div>
  );
}

import React from 'react';
import dashboardPng from '../assets/nav-icons/dashboard.png';
import studentsPng from '../assets/nav-icons/students.png';
import reportsPng from '../assets/nav-icons/reports.png';
import guidesPng from '../assets/nav-icons/guides.png';

/**
 * Custom Technical Personnel Side Navigation Tab Icons
 * Exact pixel replica of the user-provided tab icons:
 * - Dashboard: Bento / Asymmetric grid icon
 * - Students: User avatar silhouette icon
 * - Reports: Document report with cut-out detail stripes
 * - Laboratory Guides: Megaphone with sound wave
 *
 * Uses CSS mask-image with background-color: currentColor to dynamically
 * inherit active (#FFFFFF) and inactive/hover (#072617) state colors with
 * 100% exact pixel fidelity.
 */

export function DashboardTabIcon({ size = 19, className = '', strokeWidth, ...props }) {
  return (
    <span
      className={`sidebar-nav-custom-icon ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        WebkitMaskImage: `url("${dashboardPng}")`,
        maskImage: `url("${dashboardPng}")`,
      }}
      aria-hidden="true"
      {...props}
    />
  );
}

export function StudentsTabIcon({ size = 19, className = '', strokeWidth, ...props }) {
  return (
    <span
      className={`sidebar-nav-custom-icon ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        WebkitMaskImage: `url("${studentsPng}")`,
        maskImage: `url("${studentsPng}")`,
      }}
      aria-hidden="true"
      {...props}
    />
  );
}

export function ReportsTabIcon({ size = 19, className = '', strokeWidth, ...props }) {
  return (
    <span
      className={`sidebar-nav-custom-icon ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        WebkitMaskImage: `url("${reportsPng}")`,
        maskImage: `url("${reportsPng}")`,
      }}
      aria-hidden="true"
      {...props}
    />
  );
}

export function GuidesTabIcon({ size = 19, className = '', strokeWidth, ...props }) {
  return (
    <span
      className={`sidebar-nav-custom-icon ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        WebkitMaskImage: `url("${guidesPng}")`,
        maskImage: `url("${guidesPng}")`,
      }}
      aria-hidden="true"
      {...props}
    />
  );
}

export default {
  DashboardTabIcon,
  StudentsTabIcon,
  ReportsTabIcon,
  GuidesTabIcon,
};

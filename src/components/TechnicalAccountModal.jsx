import React, { useEffect } from 'react';
import { Lock } from 'lucide-react';
import './StudentProfileModal.css';

/**
 * Mask an email address without altering the real email in storage.
 * e.g., ict-admin@fixie.internal -> ict-**************@fixie.internal
 * e.g., angellaemrtnz@gmail.com -> ang**************@gmail.com
 */
export function maskEmail(email) {
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return 'ict-**************@gmail.com';
  }
  const [localPart, domain] = email.split('@');
  if (localPart.toLowerCase().startsWith('ict-')) {
    return `ict-**************@${domain}`;
  }
  const visible = localPart.slice(0, Math.min(3, localPart.length));
  return `${visible}**************@${domain}`;
}

/**
 * Technical Personnel Profile Modal (View Only)
 * Exact replica of the reference design screenshot:
 * - Header: Deep Forest Green (#072617), Title "Technical Personnel Profile",
 *   Subtitle "Shared laboratory management account.", and "View only" badge
 * - Row 1: Username ("ict-admin") & Role ("Technical Personnel") with lock icons
 * - Row 2: Account Type ("Shared Account") full width (without lock icon)
 * - Row 3: Email (Masked email address, e.g. "ict-**************@gmail.com") with lock icon
 * - Advisory Notice Box: "This account is shared by technical personnel responsible for
 *   laboratory management. To change the any of the information, contact the developer."
 * - Footer: Matching dark green background (#072617) with white "Close" button
 */
export default function TechnicalAccountModal({
  isOpen,
  onClose,
  techData,
}) {
  // Keyboard Escape listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const username = techData?.username || 'ict-admin';
  const role = 'Technical Personnel';
  const accountType = 'Shared Account';
  const maskedEmail = maskEmail(techData?.email || 'ict-admin@gmail.com');

  return (
    <div
      className="student-profile-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tech-profile-title"
    >
      <div
        className="student-profile-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Dark Forest Green Header */}
        <div className="student-profile-modal-header">
          <div className="student-profile-header-text">
            <h2 id="tech-profile-title" className="student-profile-heading">
              Technical Personnel Profile
            </h2>
            <p className="student-profile-subheading">
              Shared laboratory management account.
            </p>
          </div>

          <span className="student-profile-view-only-badge">View only</span>
        </div>

        {/* White Modal Body */}
        <div className="student-profile-modal-body">
          {/* Row 1: Username & Role */}
          <div className="profile-row-two-cols">
            <div className="profile-form-group">
              <label className="profile-field-label">Username</label>
              <div className="profile-readonly-box">
                <span className="profile-field-value">{username}</span>
                <Lock size={15} className="profile-lock-icon" strokeWidth={2.2} />
              </div>
            </div>

            <div className="profile-form-group">
              <label className="profile-field-label">Role</label>
              <div className="profile-readonly-box">
                <span className="profile-field-value">{role}</span>
                <Lock size={15} className="profile-lock-icon" strokeWidth={2.2} />
              </div>
            </div>
          </div>

          {/* Row 2: Account Type (Full width, view-only, no lock icon) */}
          <div className="profile-form-group profile-row-full">
            <label className="profile-field-label">Account Type</label>
            <div className="profile-readonly-box">
              <span className="profile-field-value">{accountType}</span>
            </div>
          </div>

          {/* Row 3: Email (Full width, view-only, with lock icon) */}
          <div className="profile-form-group profile-row-full">
            <label className="profile-field-label">Email</label>
            <div className="profile-readonly-box">
              <span className="profile-field-value" style={{ wordBreak: 'break-all' }}>
                {maskedEmail}
              </span>
              <Lock size={15} className="profile-lock-icon" strokeWidth={2.2} />
            </div>
          </div>

          {/* Sage Green Advisory Notice Box */}
          <div className="profile-notice-box" role="note">
            <div className="profile-notice-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="#072617">
                <circle cx="10" cy="10" r="10" fill="#072617" />
                <path
                  d="M10 5.5v5M10 13.5v1.2"
                  stroke="#B8D4C1"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <p className="profile-notice-text">
              This account is shared by technical personnel responsible for laboratory management. To change the any of the information, contact the developer.
            </p>
          </div>
        </div>

        {/* Modal Footer with Dark Forest Background and White Close Button */}
        <div className="tech-profile-modal-footer">
          <button
            type="button"
            className="btn-tech-profile-close"
            onClick={onClose}
            autoFocus
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

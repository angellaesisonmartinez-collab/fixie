import React, { useEffect, useRef } from 'react';
import { Loader2, Send, X, FileText, Image as ImageIcon, MapPin, Monitor, Calendar, User } from 'lucide-react';
import './ReportConfirmationModal.css';

/**
 * ReportConfirmationModal
 * 
 * Confirmation modal matching Fixie's design system (SignOutModal style):
 * - Sage green top header (#DBEAE1) with title and subtitle
 * - Clean white card body displaying the exact values entered in the form
 * - Cancel (Go back with data intact) and Confirm (Submits with duplicate click protection)
 */
export default function ReportConfirmationModal({
  isOpen,
  formData,
  onConfirm,
  onCancel,
  isSubmitting = false,
}) {
  const cancelBtnRef = useRef(null);

  // Dismiss on Escape key (if not currently submitting)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel, isSubmitting]);

  // Focus cancel button on open
  useEffect(() => {
    if (isOpen && cancelBtnRef.current) {
      cancelBtnRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen || !formData) return null;

  const {
    studentName,
    studentYearBlock,
    studentId,
    avatarSrc,
    computerCenter,
    room,
    equipment,
    unitNumber,
    description,
    dateTimeDisplay,
    attachment,
    photoPreview,
  } = formData;

  const formattedUnit = unitNumber
    ? unitNumber.startsWith('PC-')
      ? unitNumber
      : `PC-#${unitNumber.replace(/\D/g, '') || unitNumber}`
    : 'N/A';

  return (
    <div
      className="fixie-confirm-modal-backdrop"
      onClick={() => {
        if (!isSubmitting) onCancel();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div
        className="fixie-confirm-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header: Soft Sage Green */}
        <div className="confirm-modal-top-panel">
          <div className="confirm-modal-icon-badge" aria-hidden="true">
            <FileText size={24} color="#0A401E" strokeWidth={2.4} />
          </div>
          <h2 id="confirm-modal-title" className="confirm-modal-heading">
            Confirm Report Submission
          </h2>
          <p className="confirm-modal-subheading">
            Please review the details below. Once confirmed, this report will be submitted to laboratory technical personnel.
          </p>
        </div>

        {/* Digest Body: Detailed incident summary */}
        <div className="confirm-modal-body">
          {/* Section 1: Student Information */}
          <div className="confirm-meta-row">
            <div className="confirm-meta-avatar-frame">
              {avatarSrc ? (
                <img src={avatarSrc} alt={studentName} className="confirm-meta-avatar-img" />
              ) : (
                <div className="confirm-meta-avatar-fallback">
                  <User size={18} />
                </div>
              )}
            </div>
            <div className="confirm-meta-text-block">
              <span className="confirm-meta-label">Reported By</span>
              <span className="confirm-meta-primary">{studentName || 'Student'}</span>
              <span className="confirm-meta-secondary">
                {studentYearBlock} {studentId ? `• ID: ${studentId}` : ''}
              </span>
            </div>
          </div>

          <div className="confirm-divider" />

          {/* Section 2: Grid of Location, Equipment, Unit, Timestamp */}
          <div className="confirm-details-grid">
            {/* Location */}
            <div className="confirm-detail-item">
              <span className="confirm-detail-label">
                <MapPin size={13} className="confirm-label-icon" /> Location
              </span>
              <span className="confirm-detail-value">{computerCenter}</span>
              <span className="confirm-detail-subvalue">{room}</span>
            </div>

            {/* Equipment & Unit */}
            <div className="confirm-detail-item">
              <span className="confirm-detail-label">
                <Monitor size={13} className="confirm-label-icon" /> Equipment &amp; Unit
              </span>
              <span className="confirm-detail-value">{equipment}</span>
              <span className="confirm-detail-subvalue">{formattedUnit}</span>
            </div>

            {/* Date & Time */}
            <div className="confirm-detail-item">
              <span className="confirm-detail-label">
                <Calendar size={13} className="confirm-label-icon" /> Date &amp; Time
              </span>
              <span className="confirm-detail-value">{dateTimeDisplay}</span>
            </div>
          </div>

          <div className="confirm-divider" />

          {/* Section 3: Description */}
          <div className="confirm-description-block">
            <span className="confirm-detail-label">Problem Description</span>
            <p className="confirm-description-text">{description}</p>
          </div>

          {/* Section 4: Photo Attachment (ONLY IF ATTACHED) */}
          {attachment && (
            <div className="confirm-photo-block">
              <span className="confirm-detail-label">Attached Photo</span>
              <div className="confirm-photo-chip">
                {photoPreview ? (
                  <img src={photoPreview} alt="Attached Preview" className="confirm-photo-thumb" />
                ) : (
                  <div className="confirm-photo-icon-box">
                    <ImageIcon size={16} color="#FFFFFF" />
                  </div>
                )}
                <div className="confirm-photo-meta">
                  <span className="confirm-photo-name">{attachment.name}</span>
                  <span className="confirm-photo-size">{attachment.size}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Actions: Cancel & Confirm */}
        <div className="confirm-modal-bottom-panel">
          <button
            ref={cancelBtnRef}
            type="button"
            className="confirm-cancel-btn"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </button>

          <button
            type="button"
            className="confirm-submit-btn"
            onClick={onConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="confirm-btn-loading">
                <Loader2 size={16} className="btn-spinner-icon" />
                Submitting...
              </span>
            ) : (
              <>
                <span>Confirm &amp; Submit</span>
                <Send size={15} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

import React, { useEffect } from 'react';
import { Lock } from 'lucide-react';
import { formatYearBlock, formatStudentEmail } from '../lib/studentFormatUtils';
import './StudentProfileModal.css';

import TechnicalAccountModal from './TechnicalAccountModal';

/**
 * Student Profile Modal (View Only)
 * Exact replica of the reference design screenshots.
 *
 * Displays registered student details:
 * - First Name, Middle Name, Last Name (Row 1)
 * - Year & Block, Student ID (Row 2)
 * - Email (Row 3)
 * - Optional "Email last updated: <date>" timestamp (Image 2)
 * - Official ICT Office advisory notice
 * - Deep dark forest green Close button
 */
export default function StudentProfileModal({
  isOpen,
  onClose,
  studentData,
  isUpdatedPreview = false,
  isTechnical = false,
  techData = null,
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

  // If technical personnel profile is requested, delegate to TechnicalAccountModal
  if (isTechnical) {
    return (
      <TechnicalAccountModal
        isOpen={isOpen}
        onClose={onClose}
        techData={techData}
      />
    );
  }

  if (!isOpen) return null;

  const firstName = studentData?.firstName ?? (studentData?.fullName ? studentData.fullName.split(' ')[0] : 'Angel Lae');
  const middleName = studentData?.middleName ?? '';
  const lastName = studentData?.lastName ?? (studentData?.fullName ? studentData.fullName.split(' ').slice(1).join(' ') : 'Martinez');
  const yearBlock = formatYearBlock(studentData?.yearBlock) || studentData?.yearBlock || '3rd year, BLK 2';
  const studentId = studentData?.studentId || studentData?.student_id || '24-0041-147';
  const email = formatStudentEmail(studentData?.email) || 'martinezangellaewup@gmail.com';

  // Email last updated timestamp (Image 2)
  const lastUpdated = isUpdatedPreview
    ? 'Oct 9, 2026'
    : studentData?.emailLastUpdated || null;

  return (
    <div
      className="student-profile-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="student-profile-title"
    >
      <div
        className="student-profile-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Dark Forest Green Header */}
        <div className="student-profile-modal-header">
          <div className="student-profile-header-text">
            <h2 id="student-profile-title" className="student-profile-heading">
              Student Profile
            </h2>
            <p className="student-profile-subheading">
              Your student details registered in the Fixie system.
            </p>
          </div>

          <span className="student-profile-view-only-badge">View only</span>
        </div>

        {/* White Modal Body */}
        <div className="student-profile-modal-body">
          {/* Row 1: First Name, Middle Name, Last Name */}
          <div className="profile-row-three-cols">
            <div className="profile-form-group">
              <label className="profile-field-label">First Name</label>
              <div className="profile-readonly-box">
                <span className="profile-field-value">{firstName}</span>
                <Lock size={15} className="profile-lock-icon" strokeWidth={2.2} />
              </div>
            </div>

            <div className="profile-form-group">
              <label className="profile-field-label">Middle Name</label>
              <div className="profile-readonly-box">
                <span className="profile-field-value">{middleName}</span>
                <Lock size={15} className="profile-lock-icon" strokeWidth={2.2} />
              </div>
            </div>

            <div className="profile-form-group">
              <label className="profile-field-label">Last Name</label>
              <div className="profile-readonly-box">
                <span className="profile-field-value">{lastName}</span>
                <Lock size={15} className="profile-lock-icon" strokeWidth={2.2} />
              </div>
            </div>
          </div>

          {/* Row 2: Year & Block, Student ID */}
          <div className="profile-row-two-cols">
            <div className="profile-form-group">
              <label className="profile-field-label">Year & Block</label>
              <div className="profile-readonly-box">
                <span className="profile-field-value">{yearBlock}</span>
                <Lock size={15} className="profile-lock-icon" strokeWidth={2.2} />
              </div>
            </div>

            <div className="profile-form-group">
              <label className="profile-field-label">Student ID</label>
              <div className="profile-readonly-box">
                <span className="profile-field-value">{studentId}</span>
                <Lock size={15} className="profile-lock-icon" strokeWidth={2.2} />
              </div>
            </div>
          </div>

          {/* Row 3: Email */}
          <div className="profile-form-group profile-row-full">
            <label className="profile-field-label">Email</label>
            <div className="profile-readonly-box">
              <span className="profile-field-value">{email}</span>
              <Lock size={15} className="profile-lock-icon" strokeWidth={2.2} />
            </div>
          </div>

          {/* Image 2: Email last updated timestamp (if technical personnel updated it) */}
          {lastUpdated && (
            <div className="profile-email-last-updated">
              Email last updated: {lastUpdated}
            </div>
          )}

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
              These details cannot be edited here. If something is incorrect, visit
              the ICT Office and ask the Technical Personnel, and bring your school
              ID.
            </p>
          </div>
        </div>

        {/* Modal Footer with Close Button */}
        <div className="student-profile-modal-footer">
          <button
            type="button"
            className="btn-student-profile-close"
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

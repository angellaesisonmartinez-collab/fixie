import React from 'react';
import { Check, Image as ImageIcon, FileText } from 'lucide-react';
import { parseReportDateTime } from '../lib/reportDateUtils';
import './ReportSubmittedModal.css';

/**
 * ReportSubmittedModal Component
 * Full-fidelity reproduction of the "Report Submitted" confirmation modal.
 */
export default function ReportSubmittedModal({
  isOpen,
  report,
  onDone,
  onViewReport,
}) {
  if (!isOpen || !report) return null;

  // Data formatting matching the UI mockup
  const reportId = report.report_id || report.id || 'LR-12';

  // Equipment formatting (e.g. "Monitor" or clean split if contains paren)
  const equipmentName = report.equipment
    ? report.equipment.split('(')[0].trim()
    : 'Monitor';
  const unitNumber = report.unit_number || report.unitNumber || 'PC-#14';

  // Location formatting
  let centerName = report.location_center || report.locationCenter || '';
  let roomName = report.location_room || report.locationRoom || '';

  if (!centerName && report.room) {
    const parts = report.room.split(',');
    centerName = parts[0]?.trim() || 'COMPUTER CENTER 5';
    roomName = parts[1]?.trim() || 'ROOM 204';
  } else {
    if (!centerName) centerName = 'COMPUTER CENTER 5';
    if (!roomName) roomName = 'ROOM 204';
  }

  // Description
  const description =
    report.description ||
    'Screen flickers every few seconds and shows horizontal lines.';

  // Standardized Date reported (Asia/Manila)
  const parsedDT = parseReportDateTime(report);
  const dateStr = parsedDT.submittedDate || 'Oct 17, 2026';
  const timeStr = parsedDT.submittedTime || '3:45 PM';
  const dateReportedDisplay = `${dateStr} | ${timeStr}`;

  // Attachment
  const attachment = report.attachment || null;

  return (
    <div
      className="report-submitted-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="submitted-modal-title"
    >
      <div className="report-submitted-card">
        {/* Header Section (Light Sage background with dark border) */}
        <div className="report-submitted-header">
          <div className="submitted-check-circle" aria-hidden="true">
            <Check size={28} color="#FFFFFF" strokeWidth={2.6} />
          </div>
          <div className="submitted-header-texts">
            <h2 id="submitted-modal-title" className="submitted-title">
              Report Submitted
            </h2>
            <p className="submitted-subtitle">
              Thanks for helping keep the computer lab ready! Your report is now with the laboratory personnel for review.
            </p>
          </div>
        </div>

        {/* Body Section: Incident Record Digest */}
        <div className="report-submitted-body">
          <div className="incident-digest-container">
            <div className="incident-digest-heading">
              INCIDENT RECORD DIGEST
            </div>
            <div className="incident-digest-divider" />

            <div className="incident-info-grid">
              {/* Left Column */}
              <div className="incident-info-left">
                {/* REPORT ID */}
                <div className="incident-info-block">
                  <span className="incident-info-label">REPORT ID</span>
                  <span className="incident-report-id">{reportId}</span>
                </div>

                {/* EQUIPMENT */}
                <div className="incident-info-block">
                  <span className="incident-info-label">EQUIPMENT</span>
                  <span className="incident-main-value">{equipmentName}</span>
                  <span className="incident-sub-value">{unitNumber}</span>
                </div>

                {/* DATE REPORTED */}
                <div className="incident-info-block">
                  <span className="incident-info-label">DATE REPORTED</span>
                  <span className="incident-date-reported">{dateReportedDisplay}</span>
                </div>
              </div>

              {/* Right Column */}
              <div className="incident-info-right">
                {/* COMPUTER CENTER/ROOM */}
                <div className="incident-info-block">
                  <span className="incident-info-label">COMPUTER CENTER/ROOM</span>
                  <span className="incident-main-value">{centerName.toUpperCase()}</span>
                  <span className="incident-sub-value">{roomName.toUpperCase()}</span>
                </div>

                {/* PROBLEM DESCRIPTION */}
                <div className="incident-info-block">
                  <span className="incident-info-label">PROBLEM DESCRIPTION</span>
                  <p className="incident-desc-text">{description}</p>

                  {/* Attachment chip if file exists */}
                  {attachment && (
                    <div className="incident-attachment-chip">
                      <div className="incident-attachment-icon-box" aria-hidden="true">
                        <ImageIcon size={13} color="#FFFFFF" />
                      </div>
                      <div className="incident-attachment-meta">
                        <span className="incident-attachment-name">
                          {attachment.name}
                        </span>
                        <span className="incident-attachment-size">
                          {attachment.size}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Section */}
        <div className="report-submitted-footer">
          <button
            type="button"
            className="btn-submitted-done"
            onClick={onDone}
          >
            Done
          </button>
          <button
            type="button"
            className="btn-submitted-view"
            onClick={onViewReport}
          >
            View Report
          </button>
        </div>
      </div>
    </div>
  );
}

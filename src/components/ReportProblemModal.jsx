import React, { useState, useEffect } from 'react';
import {
  X,
  UploadCloud,
  FileText,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Image as ImageIcon,
  Monitor,
  Building,
  Hash
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import ReportSubmittedModal from './ReportSubmittedModal';
import { DEFAULT_COMPUTER_CENTERS } from './SubmitReportPage';
import { formatStudentName, formatYearBlock } from '../lib/studentFormatUtils';
import {
  getServerTime,
  checkLaboratoryHours,
  formatManilaDate,
  formatManilaTime,
  formatManilaDateTime,
} from '../lib/reportDateUtils';
import { getStudentReportsTableName } from '../lib/studentReportsService';
import { broadcastReportSubmission } from '../lib/realtimeSyncService';

const EQUIPMENT_OPTIONS = [
  'Monitor',
  'Keyboard',
  'Mouse',
  'System Unit/CPU',
  'Network/Internet',
  'Software/OS',
  'Power/Cables',
  'Other',
];

/**
 * ReportProblemModal Component
 * Modal problem reporting form with clean default state,
 * auto-populating read-only room, and 1-40 unit validation.
 */
export default function ReportProblemModal({
  isOpen,
  onClose,
  studentProfile,
  onReportSubmitted,
}) {
  const [computerCenter, setComputerCenter] = useState('');
  const [room, setRoom] = useState('');
  const [equipment, setEquipment] = useState('');
  const [unitNumber, setUnitNumber] = useState('');
  const [description, setDescription] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  const [centersList, setCentersList] = useState(DEFAULT_COMPUTER_CENTERS);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Success summary modal state
  const [submittedReport, setSubmittedReport] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchCenters() {
      try {
        const { data, error } = await supabase
          .from('computer_centers')
          .select('center_number, name, room')
          .order('center_number', { ascending: true });

        if (!error && data && data.length > 0 && isMounted) {
          setCentersList(data);
        }
      } catch (err) {
        console.warn('Note loading centers in modal:', err);
      }
    }
    if (isOpen) {
      fetchCenters();
    }
    return () => { isMounted = false; };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCenterChange = (selectedName) => {
    setComputerCenter(selectedName);
    if (!selectedName) {
      setRoom('');
    } else {
      const match = centersList.find((c) => c.name === selectedName);
      setRoom(match ? match.room : '');
    }
    setFormError('');
  };

  const handleUnitNumberChange = (e) => {
    const rawVal = e.target.value.replace(/\D/g, '');
    setUnitNumber(rawVal);
    setFormError('');
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setFormError('Photo size must not exceed 5MB.');
      return;
    }

    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      setPhotoPreview(uploadEvent.target?.result);
    };
    reader.readAsDataURL(file);
    setFormError('');
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!computerCenter.trim()) {
      setFormError('Please select a Computer Center.');
      return;
    }

    if (!room.trim()) {
      setFormError('Room is required and must match the selected Computer Center.');
      return;
    }

    if (!equipment.trim()) {
      setFormError('Please select the affected laboratory equipment.');
      return;
    }

    if (!unitNumber.trim()) {
      setFormError('Unit Number is required.');
      return;
    }

    const unitInt = parseInt(unitNumber, 10);
    if (isNaN(unitInt) || unitInt < 1 || unitInt > 40 || String(unitInt) !== unitNumber.trim()) {
      setFormError('Unit Number must be a whole number between 1 and 40.');
      return;
    }

    if (!description.trim()) {
      setFormError('Please describe the problem.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Check laboratory hours (7:00 AM to 9:00 PM) using authentic server time
      const serverTime = await getServerTime();
      const labHoursCheck = checkLaboratoryHours(serverTime);
      if (!labHoursCheck.isAllowed) {
        setFormError(labHoursCheck.errorMessage);
        setIsSubmitting(false);
        return;
      }

      // 2. Generate next continuous sequence ID (e.g., LR-25)
      let nextIdNumber = 25;
      try {
        const { data: latestReport } = await supabase
          .from('reports')
          .select('report_id')
          .order('report_id', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestReport?.report_id) {
          const num = parseInt(latestReport.report_id.replace(/\D/g, ''), 10);
          if (!isNaN(num)) nextIdNumber = num + 1;
        }
      } catch (seqErr) {
        console.warn('Sequence fetch note:', seqErr);
      }

      // Re-verify laboratory hours with fresh server time right before database write
      const freshServerTime = await getServerTime();
      const freshCheck = checkLaboratoryHours(freshServerTime);
      if (!freshCheck.isAllowed) {
        setFormError(freshCheck.errorMessage);
        setIsSubmitting(false);
        return;
      }

      const generatedId = `LR-${String(nextIdNumber).padStart(2, '0')}`;
      const submittedDate = formatManilaDate(freshServerTime);
      const submittedTime = formatManilaTime(freshServerTime);
      const dateTimeDisplay = `${submittedDate} | ${submittedTime}`;
      const nowIso = freshServerTime.toISOString();

      const formattedUnit = `PC-#${String(unitInt).padStart(2, '0')}`;
      const studentName = formatStudentName(studentProfile) || studentProfile?.full_name || studentProfile?.name || 'Student';
      const studentId = studentProfile?.student_id || '';
      const studentYearBlock = formatYearBlock(studentProfile?.year_block) || studentProfile?.year_block || '';

      const newReportData = {
        id: `rep-${nextIdNumber}`,
        report_id: generatedId,
        unit_number: formattedUnit,
        unitNumber: formattedUnit,
        equipment,
        room: `${computerCenter}, ${room}`,
        computer_center: computerCenter,
        location_center: computerCenter,
        location_room: room,
        description: description.trim(),
        status: 'Submitted',
        displayStatus: 'UNDER REVIEW',
        display_status: 'UNDER REVIEW',
        statusClass: 'status-under-review',
        status_class: 'status-under-review',
        student_id: studentId,
        student_name: studentName,
        student_year_block: studentYearBlock,
        student_email: studentProfile?.email || '',
        submitted_date: submittedDate,
        submittedDate: submittedDate,
        submitted_time: submittedTime,
        submittedTime: submittedTime,
        date_time: `${submittedDate}, ${submittedTime}`,
        dateTimeDisplay,
        date_submitted: nowIso,
        created_at: nowIso,
        raw_created_at: nowIso,
        attachment: photoFile ? { name: photoFile.name, size: `${(photoFile.size / 1024 / 1024).toFixed(1)}MB` } : null,
        history: [
          { action: `Submitted by ${studentName}`, time: `${submittedDate}, ${submittedTime}` },
        ],
      };

      // 3. Save into Supabase
      let studentDbUuid = studentProfile?.id;
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(studentDbUuid);
      if (!isUuid) {
        const { data: studentRecord } = await supabase
          .from('students')
          .select('id')
          .or(`student_id.eq.${studentId},email.eq.${studentProfile?.email || ''}`)
          .limit(1)
          .maybeSingle();
        if (studentRecord?.id) {
          studentDbUuid = studentRecord.id;
        }
      }

      const reportPayload = {
        report_id: generatedId,
        unit_number: formattedUnit,
        equipment,
        room: `${computerCenter}, ${room}`,
        description: description.trim(),
        status: 'Submitted',
        created_at: nowIso,
      };
      if (studentDbUuid) {
        reportPayload.student_id = studentDbUuid;
      }

      let insertedReportUuid = null;
      try {
        const { data: repData, error: insertErr } = await supabase
          .from('reports')
          .insert([reportPayload])
          .select('id, report_id')
          .maybeSingle();

        if (insertErr) {
          console.warn(`Supabase reports note: ${insertErr.message}`);
        } else if (repData?.id) {
          insertedReportUuid = repData.id;
        }
      } catch (err) {
        console.warn('Supabase reports insert catch:', err);
      }

      if (!insertedReportUuid) {
        try {
          const { data: fetchRow } = await supabase
            .from('reports')
            .select('id')
            .eq('report_id', generatedId)
            .maybeSingle();
          if (fetchRow?.id) insertedReportUuid = fetchRow.id;
        } catch {}
      }

      // Record initial "Submitted" entry in public.report_status_history (if trigger didn't already create it)
      if (insertedReportUuid) {
        try {
          const { data: existingHist } = await supabase
            .from('report_status_history')
            .select('id')
            .eq('report_id', insertedReportUuid)
            .eq('status', 'Submitted')
            .limit(1);

          if (!existingHist || existingHist.length === 0) {
            await supabase.from('report_status_history').insert({
              report_id: insertedReportUuid,
              status: 'Submitted',
              remarks: null,
              created_at: nowIso,
            });
          }
        } catch (rshErr) {
          console.warn('Could not insert initial Submitted status history:', rshErr);
        }
      }

      try {
        await supabase.from('reports_of_student').insert([
          {
            report_id: generatedId,
            student_id: studentId,
            student_name: studentName,
            year_block: studentYearBlock,
            unit_number: formattedUnit,
            equipment,
            computer_center: computerCenter,
            room,
            description: description.trim(),
            status: 'Submitted',
            date_submitted: nowIso,
            date_time: `${submittedDate}, ${submittedTime}`,
            history: [
              {
                action: 'Submitted',
                status: 'Submitted',
                time: nowIso,
                remarksText: null,
              },
            ],
          },
        ]);
      } catch (err) {
        console.warn('Supabase reports_of_student insert catch:', err);
      }

      if (studentName) {
        try {
          const studentTableName = getStudentReportsTableName(studentName);
          await supabase.from(studentTableName).insert([
            {
              report_id: generatedId,
              student_id: studentId,
              student_uuid: studentDbUuid,
              student_name: studentName,
              year_block: studentYearBlock,
              unit_number: formattedUnit,
              equipment,
              computer_center: computerCenter,
              room,
              description: description.trim(),
              status: 'Submitted',
              date_submitted: nowIso,
              date_time: `${submittedDate}, ${submittedTime}`,
            },
          ]);
        } catch { }
      }

      // Persist locally for this student so reports survive refreshes even when backend tables are unavailable
      try {
        if (studentId) {
          const studentStored = localStorage.getItem(`fixie_student_reports_${studentId}`);
          const studentExisting = studentStored ? JSON.parse(studentStored) : [];
          const studentUpdated = [newReportData, ...(Array.isArray(studentExisting) ? studentExisting.filter((x) => (x.id || x.report_id) !== generatedId) : [])];
          localStorage.setItem(`fixie_student_reports_${studentId}`, JSON.stringify(studentUpdated));
        }
        localStorage.removeItem('fixie_student_reports');
      } catch { }

      // 3. Broadcast real-time cross-side sync to all screens
      try {
        broadcastReportSubmission(newReportData);
      } catch (bcErr) {
        console.warn('Realtime broadcast submission note:', bcErr);
      }

      setSubmittedReport(newReportData);

      // Reset fields to clean initial state
      setComputerCenter('');
      setRoom('');
      setEquipment('');
      setUnitNumber('');
      setDescription('');
      setPhotoFile(null);
      setPhotoPreview(null);
      setFormError('');

      if (onReportSubmitted) {
        onReportSubmitted(newReportData, false);
      }
    } catch (err) {
      setFormError(err.message || 'Error submitting report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDoneAndView = () => {
    const rep = submittedReport;
    setSubmittedReport(null);
    onClose();
    if (onReportSubmitted && rep) {
      onReportSubmitted(rep, true);
    }
  };

  if (submittedReport) {
    return (
      <ReportSubmittedModal
        isOpen={Boolean(submittedReport)}
        report={submittedReport}
        onDone={() => {
          setSubmittedReport(null);
          onClose();
        }}
        onViewReport={handleDoneAndView}
      />
    );
  }

  const sName = formatStudentName(studentProfile) || studentProfile?.full_name || studentProfile?.name || 'Student';
  const sId = studentProfile?.student_id || 'N/A';
  const sYearBlock = formatYearBlock(studentProfile?.year_block) || studentProfile?.year_block || 'N/A';
  const sEmail = studentProfile?.email || 'N/A';

  return (
    <div className="modal-backdrop-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="report-modal-heading">
      <div
        className="student-modal-card report-problem-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div className="student-profile-modal-header" style={{ position: 'relative' }}>
          <h2 id="report-modal-heading" className="student-profile-modal-title">
            Report a Problem
          </h2>
          <p className="student-profile-modal-subtitle">
            Report hardware, software, or laboratory issues to Technical Personnel.
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: '#d6e5db', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="student-profile-form" style={{ padding: '24px' }} noValidate>
          {formError && (
            <div className="modal-error-alert" role="alert" style={{ marginBottom: '16px' }}>
              <AlertCircle size={16} />
              <span>{formError}</span>
            </div>
          )}

          {/* Student Session Information Banner (Read-only, authentic data) */}
          <div style={{ backgroundColor: '#ebf2ed', border: '1px solid #8fa89a', borderRadius: '8px', padding: '12px 16px', marginBottom: '18px', fontSize: '12px', color: '#07281a' }}>
            <span style={{ fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>
              Reporter Profile (Verified Student Session)
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <div><strong>Name:</strong> {sName}</div>
              <div><strong>ID:</strong> {sId}</div>
              <div><strong>Year &amp; Block:</strong> {sYearBlock}</div>
              <div><strong>Email:</strong> {sEmail}</div>
            </div>
          </div>

          {/* Grid: Computer Center & Room */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div className="student-profile-field">
              <label className="student-profile-label">
                <Building size={14} style={{ display: 'inline', marginRight: '4px' }} />
                Computer Center *
              </label>
              <select
                className="student-profile-input"
                value={computerCenter}
                onChange={(e) => handleCenterChange(e.target.value)}
                required
              >
                <option value="">Select Computer Center</option>
                {centersList.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="student-profile-field">
              <label className="student-profile-label">
                Room *
              </label>
              <input
                type="text"
                className="student-profile-input"
                placeholder="Auto-populated"
                value={room}
                readOnly
                style={{ backgroundColor: '#f1f5f3', cursor: 'not-allowed', color: '#475569' }}
              />
            </div>
          </div>

          {/* Row: Equipment & Unit Number */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div className="student-profile-field">
              <label className="student-profile-label">
                <Monitor size={14} style={{ display: 'inline', marginRight: '4px' }} />
                Affected Equipment *
              </label>
              <select
                className="student-profile-input"
                value={equipment}
                onChange={(e) => {
                  setEquipment(e.target.value);
                  setFormError('');
                }}
                required
              >
                <option value="">Select equipment</option>
                {EQUIPMENT_OPTIONS.map((eq) => (
                  <option key={eq} value={eq}>
                    {eq}
                  </option>
                ))}
              </select>
            </div>

            <div className="student-profile-field">
              <label className="student-profile-label">
                <Hash size={14} style={{ display: 'inline', marginRight: '4px' }} />
                Unit Number (1 - 40) *
              </label>
              <input
                type="text"
                inputMode="numeric"
                className="student-profile-input"
                placeholder="e.g. 14"
                value={unitNumber}
                onChange={handleUnitNumberChange}
                required
              />
            </div>
          </div>

          {/* Field: Description */}
          <div className="student-profile-field" style={{ marginBottom: '14px' }}>
            <label className="student-profile-label">Describe the Problem *</label>
            <textarea
              className="student-profile-input"
              rows={4}
              placeholder="Provide a detailed explanation of the hardware malfunction, error code, or observed issue..."
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setFormError('');
              }}
              required
            />
          </div>

          {/* Field: Photo Upload (Optional - Default NULL) */}
          <div className="student-profile-field" style={{ marginBottom: '20px' }}>
            <label className="student-profile-label">Attach Photo (Optional)</label>
            {!photoPreview ? (
              <label
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px dashed #8fa89a',
                  borderRadius: '8px',
                  padding: '16px',
                  cursor: 'pointer',
                  backgroundColor: '#f8fafc',
                }}
              >
                <UploadCloud size={24} color="#15803d" />
                <span style={{ fontSize: '13px', color: '#475569', marginTop: '6px' }}>
                  Click to upload snapshot (.jpg, .png, .webp, max 5MB)
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  style={{ display: 'none' }}
                  onChange={handlePhotoSelect}
                />
              </label>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid #8fa89a', borderRadius: '8px', padding: '8px 12px', backgroundColor: '#f1f5f9' }}>
                <img
                  src={photoPreview}
                  alt="Snapshot Preview"
                  style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px' }}
                />
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#07281a', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {photoFile?.name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    {(photoFile?.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '4px' }}
                  title="Remove photo"
                >
                  <X size={18} />
                </button>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="student-profile-footer">
            <button
              type="button"
              className="student-profile-btn-close"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="student-profile-btn-register"
              disabled={isSubmitting}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="btn-spinner-icon" />
                  Submitting...
                </>
              ) : (
                'Submit Report'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

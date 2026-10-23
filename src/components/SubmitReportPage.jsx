import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronDown,
  UploadCloud,
  Calendar,
  Send,
  X,
  AlertCircle,
  Loader2,
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  Check
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getStudentAvatar } from '../lib/studentAvatarUtils';
import ReportSubmittedModal from './ReportSubmittedModal';
import ReportConfirmationModal from './ReportConfirmationModal';
import { formatStudentName, formatYearBlock } from '../lib/studentFormatUtils';
import {
  getServerTime,
  checkLaboratoryHours,
  formatManilaDate,
  formatManilaTime,
  formatManilaLiveClock,
} from '../lib/reportDateUtils';
import { broadcastReportSubmission } from '../lib/realtimeSyncService';
import Banner from './Banner';
import './SubmitReportPage.css';

export const DEFAULT_COMPUTER_CENTERS = [
  { center_number: 1, name: 'Computer Center 1', room: 'Room 201' },
  { center_number: 2, name: 'Computer Center 2', room: 'Room 202' },
  { center_number: 3, name: 'Computer Center 3', room: 'Room 203' },
  { center_number: 4, name: 'Computer Center 4', room: 'Room 204' },
  { center_number: 5, name: 'Computer Center 5', room: 'Room 205' },
  { center_number: 6, name: 'Computer Center 6', room: 'Room 206' },
  { center_number: 7, name: 'Computer Center 7', room: 'Room 207' },
  { center_number: 8, name: 'Computer Center 8', room: 'Room 208' },
  { center_number: 9, name: 'Computer Center 9', room: 'Room 209' },
  { center_number: 10, name: 'Computer Center 10', room: 'Room 210' },
];

const EQUIPMENT_OPTIONS = [
  'Computer/CPU (Power, OS, Crash)',
  'Monitor (No Display, Blank, Lines)',
  'Keyboard (Unresponsive, Missing Keys)',
  'Mouse (Scroll, Stuck, No Click)',
  'Network/Internet (Cable, Port, DNS)',
  'Power (AVR, UPS, Outlet, Trip)',
  'Software/OS (Crash, Blue Screen, App)',
];

function formatLiveDateTime(date = new Date()) {
  return formatManilaLiveClock(date);
}

/**
 * SubmitReportPage Component
 * Full-fidelity student problem reporting page with strict validation,
 * dynamic lookup auto-population, and submission confirmation modal.
 */
export default function SubmitReportPage({
  studentProfile,
  onReportSubmitted,
}) {
  // Form input states - initialized to clean/empty state (no prefilled mock values)
  const [computerCenter, setComputerCenter] = useState('');
  const [room, setRoom] = useState('');
  const [equipment, setEquipment] = useState('');
  const [equipmentDropdownOpen, setEquipmentDropdownOpen] = useState(false);
  const equipmentDropdownRef = useRef(null);
  const [centerDropdownOpen, setCenterDropdownOpen] = useState(false);
  const centerDropdownRef = useRef(null);
  const [unitNumber, setUnitNumber] = useState('');
  const [description, setDescription] = useState('');

  // Close equipment dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (equipmentDropdownRef.current && !equipmentDropdownRef.current.contains(e.target)) {
        setEquipmentDropdownOpen(false);
      }
      if (centerDropdownRef.current && !centerDropdownRef.current.contains(e.target)) {
        setCenterDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Lookup table state for Computer Centers and mapped Rooms
  const [centersList, setCentersList] = useState(DEFAULT_COMPUTER_CENTERS);

  // Photo upload state (default null - no prefilled placeholder)
  const [attachment, setAttachment] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // Submission, validation, and confirmation states
  const [errors, setErrors] = useState({});
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [pendingReportData, setPendingReportData] = useState(null);
  const [submittedReport, setSubmittedReport] = useState(null);

  const fileInputRef = useRef(null);

  // Live dynamic clock for Date & Time display
  const [currentDateTimeDisplay, setCurrentDateTimeDisplay] = useState(() => formatLiveDateTime());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTimeDisplay(formatLiveDateTime());
    }, 30000); // refresh every 30s
    return () => clearInterval(timer);
  }, []);

  // Fetch computer centers from Supabase on mount
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
        console.warn('Note on loading computer centers:', err);
      }
    }
    fetchCenters();
    return () => {
      isMounted = false;
    };
  }, []);

  // Student profile presentation - strictly uses authentic student data
  const studentName = formatStudentName(studentProfile) || studentProfile?.full_name || studentProfile?.name || '';
  const studentId = studentProfile?.student_id || '';
  const studentYearBlock = formatYearBlock(studentProfile?.year_block) || studentProfile?.year_block || '';
  const avatarSrc = studentProfile?.avatar || getStudentAvatar(studentProfile);

  // Handle Computer Center change and auto-populate matching Room
  const handleCenterChange = (selectedName) => {
    setComputerCenter(selectedName);
    if (!selectedName) {
      setRoom('');
    } else {
      const match = centersList.find((c) => c.name === selectedName);
      setRoom(match ? match.room : '');
    }
    if (errors.computerCenter || errors.room) {
      setErrors((prev) => ({ ...prev, computerCenter: '', room: '' }));
    }
  };

  // Handle Unit Number input (strictly allows integers 1 to 40)
  const handleUnitNumberChange = (e) => {
    const rawVal = e.target.value;
    // Allow only digits
    const cleaned = rawVal.replace(/\D/g, '');
    setUnitNumber(cleaned);

    if (errors.unitNumber) {
      setErrors((prev) => ({ ...prev, unitNumber: '' }));
    }
  };

  // Handle Photo selection from file picker
  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Photo size must not exceed 5MB.');
      return;
    }

    setPhotoFile(file);
    setAttachment({
      name: file.name,
      size: `${(file.size / (1024 * 1024)).toFixed(1)}MB`,
    });

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      setPhotoPreview(loadEvent.target?.result);
    };
    reader.readAsDataURL(file);
    setErrorMessage('');
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Photo size must not exceed 5MB.');
      return;
    }

    setPhotoFile(file);
    setAttachment({
      name: file.name,
      size: `${(file.size / (1024 * 1024)).toFixed(1)}MB`,
    });

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      setPhotoPreview(loadEvent.target?.result);
    };
    reader.readAsDataURL(file);
    setErrorMessage('');
  };

  const handleRemoveAttachment = () => {
    setAttachment(null);
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Field validation
  const validateForm = () => {
    const newErrors = {};

    if (!computerCenter.trim()) {
      newErrors.computerCenter = 'Please select a Computer Center.';
    }

    if (!room.trim()) {
      newErrors.room = 'Room is required and must match the selected Computer Center.';
    }

    if (!unitNumber.trim()) {
      newErrors.unitNumber = 'Unit Number is required.';
    } else {
      const num = parseInt(unitNumber, 10);
      if (isNaN(num) || num < 1 || num > 40 || String(num) !== unitNumber.trim()) {
        newErrors.unitNumber = 'Unit Number must be a whole number between 1 and 40.';
      }
    }

    if (!equipment.trim()) {
      newErrors.equipment = 'Please select the affected laboratory equipment.';
    }

    if (!description.trim()) {
      newErrors.description = 'Please describe the problem encountered.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Form submission initiator - validates and opens Confirmation Modal
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');

    if (!validateForm()) {
      setErrorMessage('Please correct the highlighted errors before submitting.');
      return;
    }

    // Check laboratory hours (7:00 AM to 9:00 PM) using authentic server time
    const serverTime = await getServerTime();
    const labHoursCheck = checkLaboratoryHours(serverTime);
    if (!labHoursCheck.isAllowed) {
      setErrorMessage(labHoursCheck.errorMessage);
      return;
    }

    // Re-verify room matches center mapping
    const match = centersList.find((c) => c.name === computerCenter);
    const verifiedRoom = match ? match.room : room;

    const num = parseInt(unitNumber, 10);
    const formattedUnit = `PC-#${String(num).padStart(2, '0')}`;

    const submittedDate = formatManilaDate(serverTime);
    const submittedTime = formatManilaTime(serverTime);
    const dateTimeDisplay = `${submittedDate} | ${submittedTime}`;

    const pendingData = {
      computerCenter,
      room: verifiedRoom,
      equipment,
      unitNumber: formattedUnit,
      rawUnitNumber: String(num),
      description: description.trim(),
      attachment: attachment ? { name: attachment.name, size: attachment.size } : null,
      photoFile,
      photoPreview,
      studentName,
      studentYearBlock,
      studentId,
      avatarSrc,
      timestamp: serverTime.toISOString(),
      submittedDate,
      submittedTime,
      dateTimeDisplay,
    };

    setPendingReportData(pendingData);
    setIsConfirmModalOpen(true);
  };

  // Confirmed submission handler - executes database save with duplicate protection
  const handleConfirmSubmit = async () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const dataToSave = pendingReportData;
      if (!dataToSave) return;

      // Re-verify laboratory hours with fresh server time right before database write
      const freshServerTime = await getServerTime();
      const labHoursCheck = checkLaboratoryHours(freshServerTime);
      if (!labHoursCheck.isAllowed) {
        setIsConfirmModalOpen(false);
        setErrorMessage(labHoursCheck.errorMessage);
        return;
      }

      // 1. Generate next sequential ID (e.g. LR-25)
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

      const generatedId = `LR-${String(nextIdNumber).padStart(2, '0')}`;
      const nowIso = freshServerTime.toISOString();
      const submittedDate = formatManilaDate(freshServerTime);
      const submittedTime = formatManilaTime(freshServerTime);
      const dateTimeDisplay = `${submittedDate} | ${submittedTime}`;

      // Upload attached photo file to Supabase Storage if present
      let uploadedPhotoUrl = null;
      if (dataToSave.photoFile) {
        try {
          const file = dataToSave.photoFile;
          const cleanName = (file.name || 'attachment.jpg').replace(/[^a-zA-Z0-9._-]/g, '_');
          const storagePath = `reports/${generatedId}_${Date.now()}_${cleanName}`;
          const { error: uploadErr } = await supabase.storage
            .from('avatars')
            .upload(storagePath, file, {
              contentType: file.type || 'image/jpeg',
              upsert: true,
            });

          if (!uploadErr) {
            const { data: pubData } = supabase.storage.from('avatars').getPublicUrl(storagePath);
            uploadedPhotoUrl = pubData?.publicUrl || null;
          } else {
            console.warn('Storage upload note:', uploadErr.message);
          }
        } catch (photoErr) {
          console.warn('Photo upload catch:', photoErr);
        }
      }

      const newReportData = {
        id: `rep-${nextIdNumber}`,
        report_id: generatedId,
        date_time: dateTimeDisplay,
        dateTimeDisplay,
        unit_number: dataToSave.unitNumber,
        unitNumber: dataToSave.unitNumber,
        equipment: dataToSave.equipment,
        room: `${dataToSave.computerCenter}, ${dataToSave.room}`,
        location_center: dataToSave.computerCenter,
        locationCenter: dataToSave.computerCenter,
        location_room: dataToSave.room,
        locationRoom: dataToSave.room,
        description: dataToSave.description,
        status: 'Submitted',
        displayStatus: 'UNDER REVIEW',
        display_status: 'UNDER REVIEW',
        statusClass: 'status-under-review',
        status_class: 'status-under-review',
        student_id: studentId,
        student_name: studentName,
        reportedByName: studentName,
        student_year_block: studentYearBlock,
        student_email: studentProfile?.email || '',
        profile_photo: studentProfile?.profile_photo || null,
        avatar: avatarSrc,
        students: {
          id: studentProfile?.id || studentId,
          student_id: studentId,
          name: studentName,
          first_name: studentProfile?.first_name || '',
          last_name: studentProfile?.last_name || '',
          year_block: studentYearBlock,
          email: studentProfile?.email || '',
          profile_photo: studentProfile?.profile_photo || null,
          avatar: avatarSrc,
        },
        submitted_date: submittedDate,
        submittedDate: submittedDate,
        submitted_time: submittedTime,
        submittedTime: submittedTime,
        date_submitted: nowIso,
        raw_created_at: nowIso,
        created_at: nowIso,
        photo_url: uploadedPhotoUrl,
        attachment: dataToSave.attachment
          ? {
              ...dataToSave.attachment,
              url: uploadedPhotoUrl || dataToSave.attachment.url || null,
            }
          : null,
        history: [
          {
            action: `Submitted by ${studentName}`,
            time: `${submittedDate}, ${submittedTime}`,
          },
        ],
      };

      // 2. Insert into Supabase tables
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

      const reportInsertPayload = {
        report_id: generatedId,
        unit_number: dataToSave.unitNumber,
        equipment: dataToSave.equipment,
        room: `${dataToSave.computerCenter}, ${dataToSave.room}`,
        description: dataToSave.description,
        status: 'Submitted',
        photo_url: uploadedPhotoUrl,
        created_at: nowIso,
      };
      if (studentDbUuid) {
        reportInsertPayload.student_id = studentDbUuid;
      }

      let insertedReportUuid = null;
      try {
        const { data: repData, error: insertErr } = await supabase
          .from('reports')
          .insert([reportInsertPayload])
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
        const { error: sInsertErr } = await supabase.from('reports_of_student').insert([
          {
            report_id: generatedId,
            student_id: studentId,
            student_name: studentName,
            year_block: studentYearBlock,
            unit_number: dataToSave.unitNumber,
            equipment: dataToSave.equipment,
            computer_center: dataToSave.computerCenter,
            room: dataToSave.room,
            description: dataToSave.description,
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
        if (sInsertErr) {
          console.warn('Note on saving reports_of_student:', sInsertErr.message);
        }
      } catch (err) {
        console.warn('Supabase reports_of_student insert catch:', err);
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
      } catch {}

      // 3. Broadcast realtime event for cross-side sync to Technical Personnel & all screens
      try {
        broadcastReportSubmission(newReportData);
      } catch (bcErr) {
        console.warn('Realtime broadcast submission note:', bcErr);
      }

      // Close confirmation modal
      setIsConfirmModalOpen(false);

      // Show success modal
      setSubmittedReport(newReportData);

      // Reset form fields to clean blank/null state
      setComputerCenter('');
      setRoom('');
      setEquipment('');
      setEquipmentDropdownOpen(false);
      setUnitNumber('');
      setDescription('');
      setAttachment(null);
      setPhotoFile(null);
      setPhotoPreview(null);
      setErrors({});

      // Update parent lists
      if (onReportSubmitted) {
        onReportSubmitted(newReportData, false);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Error submitting report. Please try again.');
      setIsConfirmModalOpen(false);
    } finally {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  const handleDoneAndView = () => {
    const rep = submittedReport;
    setSubmittedReport(null);
    if (onReportSubmitted && rep) {
      onReportSubmitted(rep, true); // navigate to details view
    }
  };

  return (
    <div className="submit-report-page-root">
      {/* Page Header: Technical Personnel Banner with White Card & Rings */}
      <Banner
        title="Submit a Laboratory Report"
        subtitle="Tell us about laboratory equipment issues so they can be reviewed and addressed."
        className="submit-report-hero-banner"
        ariaLabel="Submit a Laboratory Report Header"
      />

      {/* Submission Form */}
      <form onSubmit={handleSubmit} className="submit-report-form" noValidate>

        {/* ====================================================
            CARD 01: Where did the problem occur?
            ==================================================== */}
        <section className="report-section-card" aria-labelledby="card-01-title">
          <div className="card-header-row">
            <div className="card-header-left">
              <div className="step-number-badge" aria-hidden="true">01</div>
              <div className="card-title-group">
                <h2 id="card-01-title" className="card-title">Where did the problem occur?</h2>
                <p className="card-subtitle">
                  Specify the laboratory location and the affected equipment unit.
                </p>
              </div>
            </div>
            <span className="step-pill-badge">Step 1 of 3</span>
          </div>

          <div className="card-form-grid-2">
            {/* Field: Computer Center */}
            <div className="report-field-group">
              <label id="computer-center-select-label" className="report-field-label">
                Computer Center <span className="required-asterisk">*</span>
              </label>
              <div className="reports-dropdown-relative report-equipment-dropdown-container" ref={centerDropdownRef}>
                <button
                  id="computer-center-select"
                  type="button"
                  aria-labelledby="computer-center-select-label"
                  aria-haspopup="listbox"
                  aria-expanded={centerDropdownOpen}
                  className={`reports-filter-dropdown-btn report-equipment-dropdown-btn ${centerDropdownOpen ? 'dropdown-active' : ''} ${errors.computerCenter ? 'input-error' : ''}`}
                  onClick={() => setCenterDropdownOpen(!centerDropdownOpen)}
                >
                  <span className={!computerCenter ? 'equipment-placeholder-text' : 'equipment-selected-text'}>
                    {computerCenter || 'Select Computer Center'}
                  </span>
                  <ChevronDown
                    size={14}
                    className={`dropdown-arrow-icon ${centerDropdownOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {centerDropdownOpen && (
                  <div className="reports-dropdown-menu report-equipment-dropdown-menu" role="listbox">
                    <button
                      type="button"
                      role="option"
                      aria-selected={!computerCenter}
                      className={`dropdown-menu-opt ${!computerCenter ? 'opt-active' : ''}`}
                      onClick={() => {
                        handleCenterChange('');
                        setCenterDropdownOpen(false);
                      }}
                    >
                      <span className="equipment-placeholder-text">Select Computer Center</span>
                      {!computerCenter && <Check size={14} className="opt-check" />}
                    </button>
                    {centersList.map((cc) => (
                      <button
                        key={cc.name}
                        type="button"
                        role="option"
                        aria-selected={computerCenter === cc.name}
                        className={`dropdown-menu-opt ${computerCenter === cc.name ? 'opt-active' : ''}`}
                        onClick={() => {
                          handleCenterChange(cc.name);
                          setCenterDropdownOpen(false);
                        }}
                      >
                        <span className="equipment-option-text">{cc.name}</span>
                        {computerCenter === cc.name && <Check size={14} className="opt-check" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {errors.computerCenter && (
                <p className="field-error-text" role="alert">
                  <AlertCircle size={13} /> {errors.computerCenter}
                </p>
              )}
            </div>

            {/* Field: Room (Read-only, auto-populated) */}
            <div className="report-field-group">
              <label htmlFor="room-input" className="report-field-label">
                Room <span className="required-asterisk">*</span>
              </label>
              <div className="report-readonly-wrapper">
                <input
                  id="room-input"
                  type="text"
                  className={`report-text-input report-readonly-input ${errors.room ? 'input-error' : ''}`}
                  placeholder="Auto-populated from Computer Center"
                  value={room}
                  readOnly
                  aria-readonly="true"
                />
              </div>
              {errors.room && (
                <p className="field-error-text" role="alert">
                  <AlertCircle size={13} /> {errors.room}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ====================================================
            CARD 02: What is the problem?
            ==================================================== */}
        <section className="report-section-card" aria-labelledby="card-02-title">
          <div className="card-header-row">
            <div className="card-header-left">
              <div className="step-number-badge" aria-hidden="true">02</div>
              <div className="card-title-group">
                <h2 id="card-02-title" className="card-title">What is the problem?</h2>
                <p className="card-subtitle">
                  Categorize and explain the symptom or fault in plain terms.
                </p>
              </div>
            </div>
            <span className="step-pill-badge">Step 2 of 3</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Row 1: Equipment & Unit Number */}
            <div className="card-form-grid-2">
              <div className="report-field-group">
                <label id="equipment-select-label" className="report-field-label">
                  Affected Laboratory Equipment <span className="required-asterisk">*</span>
                </label>
                <div className="reports-dropdown-relative report-equipment-dropdown-container" ref={equipmentDropdownRef}>
                  <button
                    id="equipment-select"
                    type="button"
                    aria-labelledby="equipment-select-label"
                    aria-haspopup="listbox"
                    aria-expanded={equipmentDropdownOpen}
                    className={`reports-filter-dropdown-btn report-equipment-dropdown-btn ${equipmentDropdownOpen ? 'dropdown-active' : ''} ${errors.equipment ? 'input-error' : ''}`}
                    onClick={() => setEquipmentDropdownOpen(!equipmentDropdownOpen)}
                  >
                    <span className={!equipment ? 'equipment-placeholder-text' : 'equipment-selected-text'}>
                      {equipment || 'Select Equipment'}
                    </span>
                    <ChevronDown
                      size={14}
                      className={`dropdown-arrow-icon ${equipmentDropdownOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {equipmentDropdownOpen && (
                    <div className="reports-dropdown-menu report-equipment-dropdown-menu" role="listbox">
                      <button
                        type="button"
                        role="option"
                        aria-selected={!equipment}
                        className={`dropdown-menu-opt ${!equipment ? 'opt-active' : ''}`}
                        onClick={() => {
                          setEquipment('');
                          setEquipmentDropdownOpen(false);
                        }}
                      >
                        <span className="equipment-placeholder-text">Select Equipment</span>
                        {!equipment && <Check size={14} className="opt-check" />}
                      </button>
                      {EQUIPMENT_OPTIONS.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          role="option"
                          aria-selected={equipment === opt}
                          className={`dropdown-menu-opt ${equipment === opt ? 'opt-active' : ''}`}
                          onClick={() => {
                            setEquipment(opt);
                            if (errors.equipment) {
                              setErrors((prev) => ({ ...prev, equipment: '' }));
                            }
                            setEquipmentDropdownOpen(false);
                          }}
                        >
                          <span className="equipment-option-text">{opt}</span>
                          {equipment === opt && <Check size={14} className="opt-check" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {errors.equipment && (
                  <p className="field-error-text" role="alert">
                    <AlertCircle size={13} /> {errors.equipment}
                  </p>
                )}
              </div>

              <div className="report-field-group">
                <label htmlFor="unit-number-input" className="report-field-label">
                  Unit Number <span className="required-asterisk">*</span>
                </label>
                <input
                  id="unit-number-input"
                  type="text"
                  inputMode="numeric"
                  className={`report-text-input ${errors.unitNumber ? 'input-error' : ''}`}
                  placeholder="e.g., 14 (1 - 40)"
                  value={unitNumber}
                  onChange={handleUnitNumberChange}
                  required
                />
                {errors.unitNumber ? (
                  <p className="field-error-text" role="alert">
                    <AlertCircle size={13} /> {errors.unitNumber}
                  </p>
                ) : (
                  <p className="field-helper-text">
                    <span className="helper-highlight">Unit Number</span> is a whole number from 1 to 40 labeled on the workstation sticker.
                  </p>
                )}
              </div>
            </div>

            {/* Row 2: Describe the problem */}
            <div className="report-field-group">
              <div className="field-label-row">
                <label htmlFor="description-input" className="report-field-label">
                  Describe the problem <span className="required-asterisk">*</span>
                </label>
                <span className="char-counter">
                  {description.length} characters
                </span>
              </div>
              <textarea
                id="description-input"
                className={`report-textarea-input ${errors.description ? 'input-error' : ''}`}
                rows={3}
                placeholder="Explain what happened, any error messages, or observed hardware/software issues..."
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (errors.description) {
                    setErrors((prev) => ({ ...prev, description: '' }));
                  }
                }}
                required
              />
              {errors.description && (
                <p className="field-error-text" role="alert">
                  <AlertCircle size={13} /> {errors.description}
                </p>
              )}
              <div className="field-info-note">
                <div className="info-circle-icon" aria-hidden="true">i</div>
                <span>
                  Please provide enough detail to help laboratory personnel understand and triage the issue before or during class.
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ====================================================
            CARD 03: Additional Information
            ==================================================== */}
        <section className="report-section-card" aria-labelledby="card-03-title">
          <div className="card-header-row">
            <div className="card-header-left">
              <div className="step-number-badge" aria-hidden="true">03</div>
              <div className="card-title-group">
                <h2 id="card-03-title" className="card-title">Additional Information</h2>
                <p className="card-subtitle">
                  Verified student authentication and optional workstation photo documentation.
                </p>
              </div>
            </div>
            <span className="step-pill-badge">Step 3 of 3</span>
          </div>

          <div className="additional-info-grid">
            {/* Left Column: STUDENT INFORMATION & TIMESTAMP */}
            <div className="student-info-dark-card">
              <div className="student-info-section-title">
                STUDENT INFORMATION &amp; TIMESTAMP
              </div>

              {/* Reported By White Card */}
              <div className="student-meta-white-card">
                <img
                  src={avatarSrc}
                  alt={studentName || 'Student Avatar'}
                  className="student-avatar-img"
                />
                <div className="student-meta-texts">
                  <span className="meta-sub-label">Reported By</span>
                  <span className="meta-main-value">{studentName || 'Student Reporter'}</span>
                  <span className="meta-desc-value">
                    {studentYearBlock || 'Enrolled Student'}{studentId ? ` | Student ID: ${studentId}` : ''}
                  </span>
                </div>
              </div>

              {/* Date & Time White Card (Renamed from Date & Time Logged) */}
              <div className="student-meta-white-card">
                <div className="meta-icon-box" aria-hidden="true">
                  <Calendar size={20} color="#2563EB" />
                </div>
                <div className="student-meta-texts">
                  <span className="meta-sub-label">Date &amp; Time</span>
                  <span className="meta-main-value">{currentDateTimeDisplay}</span>
                </div>
              </div>
            </div>

            {/* Right Column: Upload a photo of the problem */}
            <div className="photo-upload-section">
              <div className="photo-header-row">
                <span className="photo-section-title">Upload a photo of the problem</span>
                <span className="optional-badge">Optional</span>
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                onChange={handlePhotoSelect}
              />

              {/* Dotted Dropzone */}
              <div
                className={`photo-dropzone-box ${isDragging ? 'dragging-over' : ''}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                aria-label="Upload photo of the problem"
              >
                <UploadCloud size={26} className="dropzone-cloud-icon" />
                <p className="dropzone-main-text">
                  Drop image here or <span className="dropzone-browse-link">browse file</span>
                </p>
                <p className="dropzone-sub-text">
                  Accepted formats: JPG, PNG, or WEBP up to 5MB
                </p>
              </div>

              {/* Uploaded File Chip (rendered ONLY when a file has been selected) */}
              {attachment && (
                <div className="uploaded-file-chip">
                  <div className="file-chip-left">
                    {photoPreview ? (
                      <img src={photoPreview} alt="Preview" className="file-chip-thumb" />
                    ) : (
                      <div className="file-chip-icon-box" aria-hidden="true">
                        <ImageIcon size={15} color="#FFFFFF" />
                      </div>
                    )}
                    <div className="file-chip-meta">
                      <span className="file-chip-name">{attachment.name}</span>
                      <span className="file-chip-size">{attachment.size}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="file-chip-remove-btn"
                    onClick={handleRemoveAttachment}
                    aria-label="Remove uploaded photo"
                    title="Remove photo"
                  >
                    <X size={11} strokeWidth={3} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ====================================================
            BOTTOM SUBMISSION BAR
            ==================================================== */}
        {errorMessage && (
          <div className="report-error-alert" role="alert">
            <AlertCircle size={18} />
            <span>{errorMessage}</span>
          </div>
        )}

        <footer className="report-bottom-bar">
          <div className="bottom-bar-notice">
            <div className="notice-alert-icon" aria-hidden="true">!</div>
            <p className="notice-text">
              Please make sure the information you provided is accurate before submitting.
            </p>
          </div>

          <button
            type="submit"
            className="btn-submit-report"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="btn-spinner-icon" />
                <span>Validating...</span>
              </>
            ) : (
              <>
                <span>Submit Report</span>
                <Send size={15} className="submit-paper-plane-icon" />
              </>
            )}
          </button>
        </footer>
      </form>

      {/* ====================================================
          SUBMISSION CONFIRMATION MODAL (Step 5)
          ==================================================== */}
      <ReportConfirmationModal
        isOpen={isConfirmModalOpen}
        formData={pendingReportData}
        onConfirm={handleConfirmSubmit}
        onCancel={() => {
          if (!isSubmitting) {
            setIsConfirmModalOpen(false);
          }
        }}
        isSubmitting={isSubmitting}
      />

      {/* ====================================================
          SUBMISSION SUCCESS SUMMARY MODAL (Post-Submission)
          ==================================================== */}
      <ReportSubmittedModal
        isOpen={Boolean(submittedReport)}
        report={submittedReport}
        onDone={() => setSubmittedReport(null)}
        onViewReport={handleDoneAndView}
      />
    </div>
  );
}

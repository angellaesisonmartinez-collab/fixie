import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { subscribeToStudentUpdates } from '../lib/realtimeSyncService';
import { formatYearBlock, formatStudentEmail } from '../lib/studentFormatUtils';
import StudentProfileModal from './StudentProfileModal';
import TechnicalAccountModal from './TechnicalAccountModal';
import ChangePasswordModal from './ChangePasswordModal';
import PasswordUpdatedModal from './PasswordUpdatedModal';
import Banner from './Banner';

export default function SettingsPrivacyPage({ currentUser, userProfile }) {
  // Determine role: Technical Personnel vs Student
  const hash = typeof window !== 'undefined' ? window.location.hash : '';
  const isStudent =
    userProfile?.role === 'student' ||
    (!!userProfile?.student_id && userProfile?.role !== 'admin' && userProfile?.role !== 'technical_personnel') ||
    hash.startsWith('#student-');

  const isTechnical = !isStudent;

  // Modal visibility states
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(
    hash === '#student-profile-modal' ||
    hash === '#student-info-modal' ||
    hash === '#student-profile-updated' ||
    hash === '#student-info-updated' ||
    hash === '#account-info' ||
    hash === '#account-modal' ||
    hash === '#tech-info-modal' ||
    hash === '#tech-profile-modal' ||
    hash === '#tech-account-modal'
  );
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(
    hash === '#student-change-password' ||
    hash === '#change-password'
  );
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(
    hash === '#student-password-updated' ||
    hash === '#password-updated'
  );

  // Sync hash changes with modal states
  useEffect(() => {
    const handleHashSync = () => {
      const currentHash = window.location.hash;
      if (currentHash === '#student-change-password' || currentHash === '#change-password') {
        setIsChangePasswordOpen(true);
        setIsSuccessModalOpen(false);
      } else if (currentHash === '#student-password-updated' || currentHash === '#password-updated') {
        setIsChangePasswordOpen(false);
        setIsSuccessModalOpen(true);
      } else if (
        currentHash === '#student-profile-modal' ||
        currentHash === '#student-info-modal' ||
        currentHash === '#student-profile-updated' ||
        currentHash === '#student-info-updated' ||
        currentHash === '#account-info' ||
        currentHash === '#account-modal' ||
        currentHash === '#tech-info-modal' ||
        currentHash === '#tech-profile-modal' ||
        currentHash === '#tech-account-modal'
      ) {
        setIsInfoModalOpen(true);
      }
    };

    window.addEventListener('hashchange', handleHashSync);
    return () => window.removeEventListener('hashchange', handleHashSync);
  }, []);

  // Student Profile Data
  const [studentData, setStudentData] = useState(() => {
    let sessionStudent = null;
    try {
      const stored = sessionStorage.getItem('fixie_authenticated_student');
      if (stored) sessionStudent = JSON.parse(stored);
    } catch {}

    const base = sessionStudent || userProfile || {};
    const isDefaultFallback = !base.student_id;

    return {
      studentId: base.student_id || (isDefaultFallback ? '24-0041-147' : ''),
      firstName: base.first_name || (base.full_name ? base.full_name.split(' ')[0] : (isDefaultFallback ? 'Angel Lae' : '')),
      middleName: base.middle_name || (isDefaultFallback ? 'Sison' : ''),
      lastName: base.last_name || (base.full_name ? base.full_name.split(' ').slice(1).join(' ') : (isDefaultFallback ? 'Martinez' : '')),
      fullName: base.full_name || base.name || (isDefaultFallback ? 'Angel Lae Martinez' : ''),
      yearBlock: base.year_block || (isDefaultFallback ? '3rd year, Block 2' : ''),
      email: base.email || (isDefaultFallback ? 'martinezangellaewup@gmail.com' : ''),
      emailLastUpdated: base.email_last_updated || (hash.includes('updated') ? 'Oct 9, 2026' : null),
      profile_photo: base.profile_photo || null,
      status: base.status || 'active',
    };
  });

  // Technical Personnel Shared Account Data
  const [techData, setTechData] = useState(() => {
    return {
      username: userProfile?.username || 'ict-admin',
      role: 'Technical Personnel',
      accountType: 'Shared Account',
      email: userProfile?.email || currentUser?.email || 'angellaemrtnz@gmail.com',
    };
  });

  // Password last updated timestamp (Format: "Oct 9, 2026")
  const [passwordLastUpdated, setPasswordLastUpdated] = useState(() => {
    try {
      const storageKey =
        'fixie_password_last_updated_' +
        (isStudent
          ? userProfile?.student_id || 'student'
          : userProfile?.username || 'admin');
      const saved = localStorage.getItem(storageKey);
      if (saved) return saved;
    } catch { }

    const isUpdatedHash =
      hash === '#student-password-updated' ||
      hash === '#password-updated';
    return isUpdatedHash ? 'Oct 9, 2026' : null;
  });

  // Fetch real profile and timestamp data from Supabase
  useEffect(() => {
    let isMounted = true;

    async function fetchAccountData() {
      try {
        // 1. Fetch Student profile if on student side (only if incomplete)
        if (isStudent) {
          let sessionStudent = null;
          try {
            const stored = sessionStorage.getItem('fixie_authenticated_student');
            if (stored) sessionStudent = JSON.parse(stored);
          } catch {}

          const currentProfile = sessionStudent || userProfile;
          const isComplete =
            currentProfile?.student_id &&
            (currentProfile?.first_name || currentProfile?.name || currentProfile?.full_name) &&
            currentProfile?.email;

          // If already populated from login session, avoid redundant network query
          if (!isComplete) {
            const targetStudentId = currentProfile?.student_id || '24-0041-147';
            const targetEmail = currentProfile?.email;

            const queryParts = [
              targetStudentId ? `student_id.eq.${targetStudentId}` : null,
              targetEmail ? `email.eq.${targetEmail}` : null,
            ].filter(Boolean).join(',');

            const { data: studentRecord } = await supabase
              .from('students')
              .select('*')
              .or(queryParts || 'student_id.eq.24-0041-147')
              .maybeSingle();

            if (studentRecord && isMounted) {
              setStudentData({
                studentId: studentRecord.student_id,
                firstName: studentRecord.first_name || (studentRecord.name ? studentRecord.name.split(' ')[0] : ''),
                middleName: studentRecord.middle_name || '',
                lastName: studentRecord.last_name || (studentRecord.name ? studentRecord.name.split(' ').slice(1).join(' ') : ''),
                fullName:
                  studentRecord.name ||
                  `${studentRecord.first_name || ''} ${studentRecord.last_name || ''}`.trim(),
                yearBlock: studentRecord.year_block,
                email: studentRecord.email,
                emailLastUpdated: studentRecord.email_last_updated
                  ? new Date(studentRecord.email_last_updated).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                  : null,
                profile_photo: studentRecord.profile_photo,
                status: studentRecord.status || 'active',
              });
            }
          }
        } else {
          // 2. Fetch Technical Personnel profile only when on technical personnel side
          const { data: tpRecord } = await supabase
            .from('technical_personnel')
            .select('*')
            .limit(1)
            .maybeSingle();

          if (tpRecord && isMounted) {
            setTechData({
              username: tpRecord.username || userProfile?.username || 'ict-admin',
              role: 'Technical Personnel',
              accountType: 'Shared Account',
              email: tpRecord.registered_email || tpRecord.email || userProfile?.email || currentUser?.email || 'angellaemrtnz@gmail.com',
            });
          }
        }

        // 3. Check for actual saved password timestamp from trusted Supabase Auth metadata
        const { data: authData } = await supabase.auth.getUser();
        const authUser = authData?.user;
        const savedIso = authUser?.user_metadata?.password_last_updated;
        if (savedIso && isMounted) {
          const formatted = new Date(savedIso).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });
          setPasswordLastUpdated(formatted);
        }
      } catch (err) {
        console.warn('Settings data load notice:', err);
      }
    }

    fetchAccountData();
    return () => {
      isMounted = false;
    };
  }, [userProfile, currentUser, isStudent]);

  // Listen for real-time student profile updates from Technical Personnel
  useEffect(() => {
    const handleProfileUpdate = (e) => {
      const { student_id, year_block, email, email_last_updated } = e.detail || {};
      const myId = studentData.studentId || studentData.student_id;
      if (!student_id || student_id === myId) {
        setStudentData((prev) => ({
          ...prev,
          yearBlock: year_block ? formatYearBlock(year_block) : prev.yearBlock,
          email: email ? formatStudentEmail(email) : prev.email,
          emailLastUpdated: email_last_updated !== undefined ? email_last_updated : prev.emailLastUpdated,
        }));
      }
    };

    const unsubStudent = subscribeToStudentUpdates((payload) => {
      if (!payload) return;
      const targetId = payload.student_id || payload.id;
      const myId = studentData.studentId || studentData.student_id;
      if (!targetId || targetId === myId) {
        const raw = payload.student || payload.new || payload;
        setStudentData((prev) => ({
          ...prev,
          yearBlock: raw.year_block ? formatYearBlock(raw.year_block) : prev.yearBlock,
          email: raw.email ? formatStudentEmail(raw.email) : prev.email,
          emailLastUpdated: raw.email_last_updated
            ? (String(raw.email_last_updated).includes('T') || !isNaN(Date.parse(raw.email_last_updated))
                ? new Date(raw.email_last_updated).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : raw.email_last_updated)
            : prev.emailLastUpdated,
        }));
      }
    });

    window.addEventListener('fixie_student_profile_updated', handleProfileUpdate);
    return () => {
      window.removeEventListener('fixie_student_profile_updated', handleProfileUpdate);
      unsubStudent();
    };
  }, [studentData.studentId, studentData.student_id]);

  // Listen for real-time password update broadcasts
  useEffect(() => {
    const handlePasswordChange = (e) => {
      const { timestamp } = e.detail || {};
      if (timestamp) {
        setPasswordLastUpdated(timestamp);
      }
    };

    window.addEventListener('fixie_password_updated', handlePasswordChange);
    return () => window.removeEventListener('fixie_password_updated', handlePasswordChange);
  }, []);

  return (
    <div className="settings-privacy-root">
      {/* Top Banner Card copying styling from Students page header */}
      <Banner
        title="Stay in Control of your Account"
        subtitle="Review your personal information and keep your password secure. Make sure your information stays accurate and your account remains protected."
        className="settings-hero-banner"
        ariaLabel="Stay in Control of your Account"
      />

      {/* Two Action Cards Grid */}
      <div className="settings-cards-grid">
        {/* Card 1: Account Information */}
        <div className="settings-action-card">
          <div className="card-top-row">
            <div className="card-icon-badge" aria-hidden="true">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="card-svg-icon"
              >
                <rect x="2" y="4" width="20" height="16" rx="3" />
                <circle cx="8" cy="10" r="2" />
                <path d="M5 16.5c0-1.5 1.5-2.5 3-2.5s3 1 3 2.5" />
                <path d="M14 9h5" />
                <path d="M14 13h4" />
                <path d="M14 17h3" />
              </svg>
            </div>
            <span className="card-pill-view-only">View only</span>
          </div>

          <div className="card-body-text">
            <h2 className="card-heading-title">Account Information</h2>
            <p className="card-description-paragraph">
              {isTechnical
                ? "View the shared account's username, role, account type, and masked email address as recorded in the system. For account-related concerns or changes, please contact the developer."
                : "View your name, email, and student ID as recorded by your department. If any of your details are incorrect, please visit the ICT Room to have them updated."}
            </p>
          </div>

          <div className="card-footer-action">
            <button
              type="button"
              className="btn-settings-pill"
              onClick={() => setIsInfoModalOpen(true)}
              aria-haspopup="dialog"
            >
              View Information
            </button>
          </div>
        </div>

        {/* Card 2: Password Security */}
        <div className="settings-action-card">
          <div className="card-top-row">
            <div className="card-icon-badge badge-shield-key" aria-hidden="true">
              {/* Custom shield with keyhole glyph matching reference UI */}
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="card-svg-icon"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <circle cx="12" cy="10" r="1.5" fill="currentColor" stroke="none" />
                <path d="M12 11.5v3" strokeWidth="2.5" />
              </svg>
            </div>
          </div>

          <div className="card-body-text">
            <h2 className="card-heading-title">Password Security</h2>
            <p className="card-description-paragraph">
              Update the password you use to sign in to Fixie. Choose a strong password that you don't use on other accounts, and keep it private to protect your account.
            </p>
            {passwordLastUpdated && (
              <div className="card-password-last-updated">
                Password last updated: {passwordLastUpdated}
              </div>
            )}
          </div>

          <div className="card-footer-action">
            <button
              type="button"
              className="btn-settings-pill"
              onClick={() => setIsChangePasswordOpen(true)}
              aria-haspopup="dialog"
            >
              Change Password
            </button>
          </div>
        </div>
      </div>

      {/* ====================================================
          MODAL 1: ACCOUNT INFORMATION (Role-Specific)
          - Technical Personnel: Shared Account (Username, Role, Account Type, Masked Email)
          - Student: Individual Account (Name, Year & Block, Student ID, Email)
          ==================================================== */}
      {isTechnical ? (
        <TechnicalAccountModal
          isOpen={isInfoModalOpen}
          onClose={() => {
            setIsInfoModalOpen(false);
            if (
              window.location.hash === '#account-info' ||
              window.location.hash === '#account-modal' ||
              window.location.hash === '#tech-info-modal' ||
              window.location.hash === '#tech-profile-modal' ||
              window.location.hash === '#tech-account-modal'
            ) {
              window.location.hash = '#settings';
            }
          }}
          techData={techData}
        />
      ) : (
        <StudentProfileModal
          isOpen={isInfoModalOpen}
          onClose={() => {
            setIsInfoModalOpen(false);
            if (
              window.location.hash === '#student-profile-modal' ||
              window.location.hash === '#student-info-modal' ||
              window.location.hash === '#student-profile-updated' ||
              window.location.hash === '#student-info-updated'
            ) {
              window.location.hash = '#student-settings';
            }
          }}
          studentData={studentData}
          isUpdatedPreview={
            window.location.hash === '#student-profile-updated' ||
            window.location.hash === '#student-info-updated'
          }
        />
      )}

      {/* ====================================================
          MODAL 2: CHANGE PASSWORD (Image 1 Replica)
          ==================================================== */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => {
          setIsChangePasswordOpen(false);
          if (
            window.location.hash === '#student-change-password' ||
            window.location.hash === '#change-password'
          ) {
            window.location.hash = isStudent ? '#student-settings' : '#settings';
          }
        }}
        onSuccess={(updatedDate) => {
          if (updatedDate) {
            setPasswordLastUpdated(updatedDate);
          }
          setIsChangePasswordOpen(false);
          setIsSuccessModalOpen(true);
        }}
        currentUser={currentUser}
        userProfile={userProfile}
      />

      {/* ====================================================
          MODAL 3: PASSWORD UPDATED CONFIRMATION (Image 2 Replica)
          ==================================================== */}
      <PasswordUpdatedModal
        isOpen={isSuccessModalOpen}
        onContinue={() => {
          setIsSuccessModalOpen(false);
          setIsChangePasswordOpen(false);
          window.location.hash = isStudent ? '#student-settings' : '#settings';
        }}
      />
    </div>
  );
}

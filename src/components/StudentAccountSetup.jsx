import React, { useState } from 'react';
import {
  Lock,
  Eye,
  EyeOff,
  Check,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { getStudentAvatar, getStudentInitials } from '../lib/studentAvatarUtils';
import Header from './Header';
import Footer from './Footer';
import PasswordUpdatedCard from './PasswordUpdatedCard';
import { supabase } from '../lib/supabase';
import { formatStudentName, formatYearBlock, formatStudentEmail } from '../lib/studentFormatUtils';
import bcrypt from 'bcryptjs';

const isUuid = (val) => typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

export default function StudentAccountSetup({
  currentUser,
  userProfile,
  onSuccess,
  onSignOut,
  onReturnToLogin
}) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [newPasswordError, setNewPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [generalError, setGeneralError] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  // 5 security requirements rules (matching Technical Personnel setup)
  const requirements = [
    {
      id: 'length',
      label: 'Minimum of 8 characters',
      isMet: newPassword.length >= 8,
    },
    {
      id: 'uppercase',
      label: 'At least one uppercase letter',
      isMet: /[A-Z]/.test(newPassword),
    },
    {
      id: 'lowercase',
      label: 'At least one lowercase letter',
      isMet: /[a-z]/.test(newPassword),
    },
    {
      id: 'number',
      label: 'At least one number',
      isMet: /[0-9]/.test(newPassword),
    },
    {
      id: 'special',
      label: 'At least one special character',
      isMet: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword),
    },
  ];

  const allRequirementsMet = requirements.every((r) => r.isMet);

  const [profileData, setProfileData] = useState(userProfile || null);

  // Fetch registered student profile from Supabase
  React.useEffect(() => {
    if (userProfile) {
      setProfileData(userProfile);
    }
    const fetchLiveStudent = async () => {
      const studentIdToMatch = userProfile?.student_id || userProfile?.username || currentUser?.id;
      const studentEmailToMatch = userProfile?.email || currentUser?.email;
      if (!studentIdToMatch && !studentEmailToMatch) return;

      try {
        let query = supabase.from('students').select('*');
        if (userProfile?.id && isUuid(userProfile.id)) {
          query = query.eq('id', userProfile.id);
        } else if (studentIdToMatch) {
          if (isUuid(studentIdToMatch)) {
            query = query.eq('id', studentIdToMatch);
          } else {
            query = query.eq('student_id', studentIdToMatch);
          }
        } else if (studentEmailToMatch) {
          query = query.eq('email', studentEmailToMatch);
        }
        const { data: stData } = await query.maybeSingle();
        if (stData) {
          setProfileData((prev) => ({
            ...(prev || {}),
            id: stData.id,
            student_id: stData.student_id,
            username: stData.student_id,
            full_name: stData.name,
            name: stData.name,
            email: formatStudentEmail(stData.email),
            year_block: stData.year_block,
            role: 'student',
          }));
        }
      } catch (err) {
        console.warn('StudentAccountSetup live student fetch note:', err);
      }
    };
    fetchLiveStudent();
  }, [userProfile, currentUser]);

  // Format student role / section display
  const studentRole = formatYearBlock(profileData?.year_block) || '3rd year, BLK 2';
  const studentName = formatStudentName(profileData) || profileData?.full_name || profileData?.name || 'Angel Lae Martinez';

  // Avatar resolution: use angelAvatar for Angel or fallback to initials
  const isAngel = profileData?.student_id === '24-0041-147' || studentName.toLowerCase().includes('angel');
  const studentInitials = getStudentInitials(profileData || studentName);

  const validateForm = () => {
    let isValid = true;
    setNewPasswordError('');
    setConfirmPasswordError('');
    setGeneralError('');

    // 1. New Password validation
    if (!newPassword) {
      setNewPasswordError('New password is required.');
      isValid = false;
    } else if (!allRequirementsMet) {
      setNewPasswordError('Please satisfy all password security requirements below.');
      isValid = false;
    }

    // 2. Confirm Password validation
    if (!confirmPassword) {
      setConfirmPasswordError('Please confirm your new password.');
      isValid = false;
    } else if (newPassword !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match.');
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isLoading) return;
    if (!validateForm()) return;

    setIsLoading(true);
    setGeneralError('');

    try {
      // Step A: Update Supabase Auth user password
      try {
        const { error: authError } = await supabase.auth.updateUser({
          password: newPassword,
          data: {
            password_last_updated: new Date().toISOString(),
          },
        });
        if (authError) {
          console.warn('Supabase auth updateUser notice:', authError.message);
        }
      } catch (authErr) {
        console.warn('Supabase auth catch note:', authErr);
      }

      // Step B: Update students directory in Supabase (save hashed password and mark must_change_password = false)
      const studentIdToMatch = userProfile?.student_id || userProfile?.username || currentUser?.id;
      const studentEmailToMatch = userProfile?.email || currentUser?.email;

      if (studentIdToMatch || studentEmailToMatch) {
        try {
          const password_hash = bcrypt.hashSync(newPassword, 10);
          let query = supabase
            .from('students')
            .update({
              password_hash,
              must_change_password: false,
              updated_at: new Date().toISOString(),
            });

          if (userProfile?.id && isUuid(userProfile.id)) {
            query = query.eq('id', userProfile.id);
          } else if (studentIdToMatch) {
            if (isUuid(studentIdToMatch)) {
              query = query.eq('id', studentIdToMatch);
            } else {
              query = query.eq('student_id', studentIdToMatch);
            }
          } else {
            query = query.eq('email', studentEmailToMatch);
          }

          const { error: dbError } = await query;
          if (dbError) {
            console.warn('Students table update error:', dbError);
          }
        } catch (dbErr) {
          console.warn('Students update exception:', dbErr);
        }
      }

      // Step C: Update profiles view/table if applicable
      if (currentUser?.id) {
        try {
          await supabase
            .from('profiles')
            .update({
              must_change_password: false,
              updated_at: new Date().toISOString(),
            })
            .eq('id', currentUser.id);
        } catch (profErr) {
          // view may be read-only
        }
      }

      // Step D: Trigger Success Modal (Image 2)
      setIsSuccessModalOpen(true);
    } catch (err) {
      setGeneralError(err.message || 'An unexpected error occurred during password update.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccessRedirect = async () => {
    try {
      const signOutPromise = supabase.auth.signOut();
      const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 800));
      await Promise.race([signOutPromise, timeoutPromise]);
    } catch {
      // ignore
    }

    if (onReturnToLogin) {
      onReturnToLogin();
    } else if (onSignOut) {
      onSignOut();
    } else {
      window.location.hash = '';
      window.location.reload();
    }
  };

  const handleContinueToDashboard = (profile) => {
    const updated = profile || {
      ...userProfile,
      must_change_password: false,
      is_setup_complete: true,
      role: 'student',
    };

    if (onSuccess) {
      onSuccess(updated);
    } else {
      window.location.hash = '#student-dashboard';
      window.location.reload();
    }
  };

  // Exit button action: non-destructive redirect immediately to login without modifying credentials
  const handleExit = async () => {
    try {
      await supabase.auth.signOut().catch(() => {});
    } catch {}

    if (onReturnToLogin) {
      onReturnToLogin();
    } else if (onSignOut) {
      onSignOut();
    } else {
      window.location.hash = '';
      window.location.reload();
    }
  };

  return (
    <div className="setup-page-root">
      {/* Top Header with Registered Student Info on Right & Back Arrow on Left */}
      <Header
        showLogo={false}
        showBack={true}
        onBack={handleExit}
        showActionButton={false}
        showUser={true}
        userName={studentName}
        userRole={studentRole}
        avatarImg={isAngel ? getStudentAvatar({ student_id: '24-0041-147' }) : getStudentAvatar(profileData || userProfile)}
        avatarText={studentInitials}
      />

      {/* Main Centered Content Viewport */}
      <main className="setup-main-viewport">
        <div className="setup-card-container">
          {/* Top Banner: First-Time Login Security Requirement */}
          <div className="setup-security-banner">
            <div className="banner-badge-icon" aria-hidden="true">
              <span className="banner-exclamation">!</span>
            </div>
            <div className="banner-text-content">
              <h2 className="banner-title">
                FIRST-TIME LOGIN SECURITY REQUIREMENT
              </h2>
              <p className="banner-description">
                You are currently logged in with a single-use temporary password. Please update
                your password to secure your account before accessing the Fixie dashboard.
              </p>
            </div>
          </div>

          {/* Card Body */}
          <div className="setup-card-body">
            <div className="setup-headings-group">
              <h1 className="setup-main-heading">Update Password</h1>
              <p className="setup-sub-heading">
                You need to update your password before continuing.
              </p>
            </div>

            {generalError && (
              <div className="setup-error-banner" role="alert">
                <AlertCircle size={18} className="error-icon" />
                <span>{generalError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="setup-form">
              {/* Field 1: NEW PASSWORD (Note: Username field excluded per requirement 3) */}
              <div className="setup-field-group">
                <label htmlFor="student-setup-new-password" className="setup-field-label">
                  NEW PASSWORD
                </label>
                <div className={`setup-input-wrapper ${newPasswordError ? 'has-error' : ''}`}>
                  <Lock size={18} className="setup-input-icon" aria-hidden="true" />
                  <input
                    id="student-setup-new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    className="setup-text-input"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (newPasswordError) setNewPasswordError('');
                    }}
                    disabled={isLoading}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="setup-eye-toggle-btn"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                    disabled={isLoading}
                  >
                    {showNewPassword ? (
                      <Eye size={18} aria-hidden="true" />
                    ) : (
                      <EyeOff size={18} aria-hidden="true" />
                    )}
                  </button>
                </div>
                {newPasswordError && (
                  <p className="setup-error-text" role="alert">
                    {newPasswordError}
                  </p>
                )}
              </div>

              {/* SECURITY REQUIREMENTS Box */}
              <div className="setup-requirements-card">
                <h3 className="setup-requirements-title">SECURITY REQUIREMENTS</h3>
                <ul className="setup-requirements-list">
                  {requirements.map((req) => (
                    <li
                      key={req.id}
                      className={`setup-requirement-item ${req.isMet ? 'is-met' : 'not-met'}`}
                    >
                      <span className="requirement-check-circle" aria-hidden="true">
                        <Check size={11} strokeWidth={3} />
                      </span>
                      <span className="requirement-label-text">{req.label}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Field 2: CONFIRM PASSWORD */}
              <div className="setup-field-group">
                <label htmlFor="student-setup-confirm-password" className="setup-field-label">
                  CONFIRM PASSWORD
                </label>
                <div className={`setup-input-wrapper ${confirmPasswordError ? 'has-error' : ''}`}>
                  <Lock size={18} className="setup-input-icon" aria-hidden="true" />
                  <input
                    id="student-setup-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="setup-text-input"
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (confirmPasswordError) setConfirmPasswordError('');
                    }}
                    disabled={isLoading}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="setup-eye-toggle-btn"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? (
                      <Eye size={18} aria-hidden="true" />
                    ) : (
                      <EyeOff size={18} aria-hidden="true" />
                    )}
                  </button>
                </div>
                {confirmPasswordError && (
                  <p className="setup-error-text" role="alert">
                    {confirmPasswordError}
                  </p>
                )}
              </div>

              {/* Submit Action Button */}
              <button
                type="submit"
                className="setup-submit-btn"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="btn-loading-flex">
                    <Loader2 size={18} className="spinner-rotate" />
                    Updating Password...
                  </span>
                ) : (
                  'Update Password'
                )}
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />

      {/* Phase 02 Confirmation Modal: "Account Updated Successfully" */}
      {isSuccessModalOpen && (
        <div
          className="modal-backdrop-overlay"
          role="dialog"
          aria-modal="true"
        >
          <PasswordUpdatedCard
            updatedProfile={{
              ...userProfile,
              must_change_password: false,
              is_setup_complete: true,
              role: 'student',
            }}
            onReturnToLogin={handleSuccessRedirect}
            onContinueToDashboard={handleContinueToDashboard}
          />
        </div>
      )}
    </div>
  );
}

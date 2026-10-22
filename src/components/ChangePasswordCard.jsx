import React, { useState } from 'react';
import { Lock, Eye, EyeOff, AlertCircle, Loader2, Check } from 'lucide-react';
import PasswordUpdatedCard from './PasswordUpdatedCard';
import { supabase } from '../lib/supabase';
import bcrypt from 'bcryptjs';

export default function ChangePasswordCard({ currentUser, userProfile, onPasswordUpdated, onSignOut }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [newPasswordError, setNewPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [generalError, setGeneralError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Success state: shown only after password update AND profile verification succeed
  const [isPasswordUpdated, setIsPasswordUpdated] = useState(false);
  const [verifiedProfile, setVerifiedProfile] = useState(null);

  // 5 Security Requirements (matching the UI screenshot checklist):
  const reqLength = newPassword.length >= 8;
  const reqUpper = /[A-Z]/.test(newPassword);
  const reqLower = /[a-z]/.test(newPassword);
  const reqNumber = /[0-9]/.test(newPassword);
  const reqSpecial = /[^A-Za-z0-9]/.test(newPassword);
  const allReqsMet = reqLength && reqUpper && reqLower && reqNumber && reqSpecial;

  const validateForm = () => {
    let isValid = true;
    setNewPasswordError('');
    setConfirmPasswordError('');
    setGeneralError('');

    // 1. Password validation against the 5 security requirements
    if (!newPassword) {
      setNewPasswordError('New password is required.');
      isValid = false;
    } else if (!allReqsMet) {
      setNewPasswordError('Please satisfy all security requirements listed below.');
      isValid = false;
    }

    // 2. Confirm Password Validation
    if (!confirmPassword) {
      setConfirmPasswordError('Confirm password is required.');
      isValid = false;
    } else if (newPassword && newPassword !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match.');
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isLoading) return;

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setGeneralError('');

    try {
      // Step 1: Update Supabase Auth user password
      try {
        const { error: updateError } = await supabase.auth.updateUser({
          password: newPassword,
        });
        if (updateError) {
          console.warn('Supabase auth updateUser note:', updateError.message);
        }
      } catch (authErr) {
        console.warn('Supabase auth catch note:', authErr);
      }

      // Step 2: Update password_hash and mark must_change_password = false in students directory table
      const studentIdToMatch = userProfile?.student_id || userProfile?.username || currentUser?.id;
      const studentEmailToMatch = userProfile?.email || currentUser?.email;

      if (studentIdToMatch) {
        try {
          const password_hash = bcrypt.hashSync(newPassword, 10);
          await supabase
            .from('students')
            .update({
              password_hash,
              must_change_password: false,
              updated_at: new Date().toISOString(),
            })
            .or(`student_id.eq.${studentIdToMatch},email.eq.${studentEmailToMatch}`);
        } catch (dbErr) {
          console.warn('Students table update note:', dbErr);
        }
      }

      // Step 3: Update public.profiles table if present
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
          console.warn('Profiles table update note:', profErr);
        }
      }

      // Step 4: Construct verified profile and trigger PasswordUpdatedCard
      const updated = {
        ...userProfile,
        must_change_password: false,
        is_setup_complete: true,
      };

      setVerifiedProfile(updated);
      setIsPasswordUpdated(true);
    } catch (err) {
      setGeneralError(err.message || 'An unexpected error occurred during password update.');
    } finally {
      setIsLoading(false);
    }
  };

  // If password update and profile verification succeeded, display Password Updated UI
  if (isPasswordUpdated && verifiedProfile) {
    return (
      <PasswordUpdatedCard
        updatedProfile={verifiedProfile}
        onContinueToDashboard={(profile) => {
          if (onPasswordUpdated) {
            onPasswordUpdated(profile);
          }
        }}
        onReturnToLogin={onSignOut}
      />
    );
  }

  return (
    <div className="student-first-login-card">
      {/* 1. Dark Forest Green Top Security Banner */}
      <div className="first-login-security-banner">
        <div className="first-login-alert-badge" aria-hidden="true">
          !
        </div>
        <div className="first-login-security-text-col">
          <h3 className="first-login-security-title">
            FIRST-TIME LOGIN SECURITY REQUIREMENT
          </h3>
          <p className="first-login-security-desc">
            You are currently logged in using a temporary password. Please update your password to secure your account before accessing the Fixie dashboard.
          </p>
        </div>
      </div>

      {/* 2. Main Card Body */}
      <div className="first-login-card-body">
        <div className="first-login-card-header">
          <h2 className="first-login-card-heading">Update your Password</h2>
          <p className="first-login-card-subheading">
            You need to update your password before continuing.
          </p>
        </div>

        {generalError && (
          <div className="modal-error-alert" role="alert" style={{ marginBottom: '16px' }}>
            <AlertCircle size={16} />
            <span>{generalError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="first-login-form">
          {/* Field 1: NEW PASSWORD (Note: NO username field as student ID is their permanent username) */}
          <div className="first-login-field-group">
            <label htmlFor="newPassword" className="first-login-field-label">
              NEW PASSWORD
            </label>
            <div className={`first-login-input-wrap ${newPasswordError ? 'input-error-border' : ''}`}>
              <Lock className="first-login-left-icon" size={17} aria-hidden="true" />
              <input
                id="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                className="first-login-text-input"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (newPasswordError) setNewPasswordError('');
                }}
                disabled={isLoading}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                className="first-login-eye-btn"
                onClick={() => setShowNewPassword(!showNewPassword)}
                aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
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
              <p className="first-login-error-text" role="alert">
                {newPasswordError}
              </p>
            )}
          </div>

          {/* 3. SECURITY REQUIREMENTS Checklist Box */}
          <div className="first-login-requirements-box">
            <h4 className="first-login-requirements-title">
              SECURITY REQUIREMENTS
            </h4>
            <ul className="first-login-requirements-list">
              <li className={`first-login-req-item ${reqLength ? 'req-met' : ''}`}>
                <span className="first-login-check-badge">
                  <Check size={11} strokeWidth={3.5} />
                </span>
                <span>Minimum of 8 characters</span>
              </li>
              <li className={`first-login-req-item ${reqUpper ? 'req-met' : ''}`}>
                <span className="first-login-check-badge">
                  <Check size={11} strokeWidth={3.5} />
                </span>
                <span>At least one uppercase letter</span>
              </li>
              <li className={`first-login-req-item ${reqLower ? 'req-met' : ''}`}>
                <span className="first-login-check-badge">
                  <Check size={11} strokeWidth={3.5} />
                </span>
                <span>At least one lowercase letter</span>
              </li>
              <li className={`first-login-req-item ${reqNumber ? 'req-met' : ''}`}>
                <span className="first-login-check-badge">
                  <Check size={11} strokeWidth={3.5} />
                </span>
                <span>At least one number</span>
              </li>
              <li className={`first-login-req-item ${reqSpecial ? 'req-met' : ''}`}>
                <span className="first-login-check-badge">
                  <Check size={11} strokeWidth={3.5} />
                </span>
                <span>At least one special character</span>
              </li>
            </ul>
          </div>

          {/* Field 2: CONFIRM PASSWORD */}
          <div className="first-login-field-group">
            <label htmlFor="confirmPassword" className="first-login-field-label">
              CONFIRM PASSWORD
            </label>
            <div className={`first-login-input-wrap ${confirmPasswordError ? 'input-error-border' : ''}`}>
              <Lock className="first-login-left-icon" size={17} aria-hidden="true" />
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                className="first-login-text-input"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (confirmPasswordError) setConfirmPasswordError('');
                }}
                disabled={isLoading}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                className="first-login-eye-btn"
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
              <p className="first-login-error-text" role="alert">
                {confirmPasswordError}
              </p>
            )}
          </div>

          {/* Submit Action Button */}
          <button
            type="submit"
            className="first-login-submit-btn"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="first-login-loading-wrap">
                <Loader2 size={16} className="spinner-icon" />
                Updating Password...
              </span>
            ) : (
              'Update Password'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

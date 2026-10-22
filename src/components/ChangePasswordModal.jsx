import React, { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import bcrypt from 'bcryptjs';
import './ChangePasswordModal.css';

/**
 * Trusted validation function enforcing security requirements.
 */
export function validatePasswordSecurity(password) {
  if (!password || typeof password !== 'string') return false;
  if (password.length < 8) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(password)) return false;
  return true;
}

/**
 * Change Password Modal (Image 1 Replica)
 * - Deep Forest Green Header (#072617)
 * - Fields: Current Password, New Password, Confirm Password (with lock and eye toggle)
 * - Real-time SECURITY REQUIREMENTS checklist:
 *   1. Minimum of 8 characters
 *   2. At least one uppercase letter
 *   3. At least one lowercase letter
 *   4. At least one number
 *   5. At least one special character
 * - Validation: Confirm matches new password, new password differs from current
 * - Deep Forest Green Footer (#072617) with Close and solid white Update Password button
 */
export default function ChangePasswordModal({
  isOpen,
  onClose,
  onSuccess,
  currentUser,
  userProfile,
}) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  // Reset form when opened
  useEffect(() => {
    if (isOpen) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      setFormError('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Real-time validation criteria
  const lengthValid = newPassword.length >= 8;
  const uppercaseValid = /[A-Z]/.test(newPassword);
  const lowercaseValid = /[a-z]/.test(newPassword);
  const numberValid = /[0-9]/.test(newPassword);
  const specialValid = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(newPassword);

  const allSecurityMet =
    lengthValid &&
    uppercaseValid &&
    lowercaseValid &&
    numberValid &&
    specialValid;

  const passwordsMatch =
    confirmPassword.length > 0 && confirmPassword === newPassword;

  const passwordDiffers =
    currentPassword.length > 0 &&
    newPassword.length > 0 &&
    newPassword !== currentPassword;

  const isFormValid =
    currentPassword.trim().length > 0 &&
    allSecurityMet &&
    passwordsMatch &&
    passwordDiffers;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!currentPassword) {
      setFormError('Please enter your current password.');
      return;
    }

    if (!newPassword) {
      setFormError('Please enter your new password.');
      return;
    }

    if (!allSecurityMet) {
      setFormError('New password must satisfy all 5 security requirements.');
      return;
    }

    if (!passwordDiffers) {
      setFormError('New password must differ from your current password.');
      return;
    }

    if (!passwordsMatch) {
      setFormError('Confirm password does not match the new password.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Resolve user email for authentication
      const { data: authData } = await supabase.auth.getUser();
      const authUser = authData?.user;
      const userEmail = authUser?.email || currentUser?.email || userProfile?.email;

      // 2. Verify current password through trusted layer
      const isStudent = userProfile?.role === 'student' || !!userProfile?.student_id;
      if (isStudent) {
        const studentId = userProfile?.student_id || '24-0041-147';
        const { data: stRow } = await supabase
          .from('students')
          .select('password_hash')
          .or(`student_id.eq.${studentId},email.eq.${userEmail}`)
          .maybeSingle();

        if (stRow?.password_hash) {
          const isValid = bcrypt.compareSync(currentPassword, stRow.password_hash);
          if (!isValid) {
            throw new Error('Incorrect current password. Please try again.');
          }
        }
      } else if (userEmail) {
        let isTpValid = false;
        try {
          const { error: verifyError } = await supabase.auth.signInWithPassword({
            email: userEmail,
            password: currentPassword,
          });
          if (!verifyError) isTpValid = true;
        } catch {}

        if (!isTpValid) {
          const { data: tpRow } = await supabase
            .from('technical_personnel')
            .select('password_hash')
            .or(`registered_email.eq.${userEmail},username.eq.${userProfile?.username || 'ict-admin'}`)
            .maybeSingle();
          if (tpRow?.password_hash && bcrypt.compareSync(currentPassword, tpRow.password_hash)) {
            isTpValid = true;
          }
        }

        if (!isTpValid) {
          throw new Error('Incorrect current password. Please try again.');
        }
      }

      // 3. Update password via Supabase Auth (if user exists in auth)
      const nowIso = new Date().toISOString();
      try {
        await supabase.auth.updateUser({
          password: newPassword,
          data: {
            password_last_updated: nowIso,
          },
        });
      } catch (authErr) {
        console.warn('Supabase auth updateUser notice:', authErr);
      }

      // 4. Update database record with hashed password and timestamp
      const newPasswordHash = bcrypt.hashSync(newPassword, 10);
      if (isStudent) {
        const studentId = userProfile?.student_id || '24-0041-147';
        await supabase
          .from('students')
          .update({
            password_hash: newPasswordHash,
            must_change_password: false,
            updated_at: nowIso,
          })
          .or(`student_id.eq.${studentId},email.eq.${userEmail}`);
      } else {
        const username = userProfile?.username || 'ict-admin';
        await supabase
          .from('technical_personnel')
          .update({
            password_hash: newPasswordHash,
            updated_at: nowIso,
          })
          .or(`username.eq.${username},registered_email.eq.${userEmail}`);
      }

      // 5. Format timestamp (e.g. "Oct 9, 2026")
      const formattedDate = new Date(nowIso).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      // 6. Persist timestamp for session persistence across reloads/logins
      const storageKey =
        'fixie_password_last_updated_' +
        (isStudent
          ? userProfile?.student_id || 'student'
          : userProfile?.username || 'admin');

      try {
        localStorage.setItem(storageKey, formattedDate);
        window.dispatchEvent(
          new CustomEvent('fixie_password_updated', {
            detail: {
              timestamp: formattedDate,
              iso: nowIso,
              role: isStudent ? 'student' : 'technical',
            },
          })
        );
      } catch { }

      // 7. Invoke success callback to close modal and open Success modal (Image 2)
      if (onSuccess) {
        onSuccess(formattedDate);
      }
    } catch (err) {
      console.error('Password change error:', err);
      setFormError(
        err.message || 'An error occurred while updating your password. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderCheckmark = (isMet) => {
    if (isMet) {
      return (
        <svg
          width="15"
          height="15"
          viewBox="0 0 16 16"
          fill="none"
          className="change-pwd-req-icon"
          aria-hidden="true"
        >
          <circle cx="8" cy="8" r="8" fill="#22C55E" />
          <path
            d="M4.5 8L6.8 10.3L11.5 5.7"
            stroke="white"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    }
    return (
      <svg
        width="15"
        height="15"
        viewBox="0 0 16 16"
        fill="none"
        className="change-pwd-req-icon"
        aria-hidden="true"
      >
        <circle cx="8" cy="8" r="7.25" stroke="#CBD5E1" strokeWidth="1.5" fill="#F1F5F9" />
        <path
          d="M4.5 8L6.8 10.3L11.5 5.7"
          stroke="#94A3B8"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  return (
    <div
      className="change-pwd-backdrop"
      onClick={() => !isSubmitting && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="change-pwd-title"
    >
      <div
        className="change-pwd-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: Deep Forest Green Banner */}
        <div className="change-pwd-header">
          <h2 id="change-pwd-title" className="change-pwd-modal-title">
            Change Password
          </h2>
          <p className="change-pwd-modal-subtitle">
            Choose a strong password you don't use anywhere else.
          </p>
        </div>

        {/* Form Body */}
        <form id="change-pwd-form" onSubmit={handleSubmit} className="change-pwd-body">
          {formError && (
            <div className="change-pwd-error-alert" role="alert">
              <AlertCircle size={16} />
              <span>{formError}</span>
            </div>
          )}

          {/* Current Password Field */}
          <div className="change-pwd-field">
            <label htmlFor="modal-current-password" className="change-pwd-label">
              Current Password
            </label>
            <div className="change-pwd-input-wrapper">
              <Lock size={18} className="change-pwd-lock-icon" />
              <input
                id="modal-current-password"
                type={showCurrentPassword ? 'text' : 'password'}
                className="change-pwd-text-input"
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={isSubmitting}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="change-pwd-eye-btn"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
                tabIndex={-1}
              >
                {showCurrentPassword ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            </div>
          </div>

          {/* New Password Field */}
          <div className="change-pwd-field">
            <label htmlFor="modal-new-password" className="change-pwd-label">
              New Password
            </label>
            <div className="change-pwd-input-wrapper">
              <Lock size={18} className="change-pwd-lock-icon" />
              <input
                id="modal-new-password"
                type={showNewPassword ? 'text' : 'password'}
                className="change-pwd-text-input"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isSubmitting}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="change-pwd-eye-btn"
                onClick={() => setShowNewPassword(!showNewPassword)}
                aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                tabIndex={-1}
              >
                {showNewPassword ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            </div>
            {currentPassword && newPassword && !passwordDiffers && (
              <span className="change-pwd-inline-hint error">
                New password must differ from your current password.
              </span>
            )}
          </div>

          {/* SECURITY REQUIREMENTS Box */}
          <div className="change-pwd-security-box">
            <div className="change-pwd-security-title">SECURITY REQUIREMENTS</div>
            <div className="change-pwd-req-list">
              <div className={`change-pwd-req-item ${lengthValid ? 'is-met' : 'is-unmet'}`}>
                {renderCheckmark(lengthValid)}
                <span>Minimum of 8 characters</span>
              </div>

              <div className={`change-pwd-req-item ${uppercaseValid ? 'is-met' : 'is-unmet'}`}>
                {renderCheckmark(uppercaseValid)}
                <span>At least one uppercase letter</span>
              </div>

              <div className={`change-pwd-req-item ${lowercaseValid ? 'is-met' : 'is-unmet'}`}>
                {renderCheckmark(lowercaseValid)}
                <span>At least one lowercase letter</span>
              </div>

              <div className={`change-pwd-req-item ${numberValid ? 'is-met' : 'is-unmet'}`}>
                {renderCheckmark(numberValid)}
                <span>At least one number</span>
              </div>

              <div className={`change-pwd-req-item ${specialValid ? 'is-met' : 'is-unmet'}`}>
                {renderCheckmark(specialValid)}
                <span>At least one special character</span>
              </div>
            </div>
          </div>

          {/* Confirm Password Field */}
          <div className="change-pwd-field">
            <label htmlFor="modal-confirm-password" className="change-pwd-label">
              Confirm Password
            </label>
            <div className="change-pwd-input-wrapper">
              <Lock size={18} className="change-pwd-lock-icon" />
              <input
                id="modal-confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                className="change-pwd-text-input"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isSubmitting}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="change-pwd-eye-btn"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                tabIndex={-1}
              >
                {showConfirmPassword ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            </div>
            {confirmPassword && !passwordsMatch && (
              <span className="change-pwd-inline-hint error">
                Confirm password does not match new password.
              </span>
            )}
          </div>
        </form>

        {/* Footer (Image 1: Deep Forest Green #072617, White Update Password Button) */}
        <div className="change-pwd-footer">
          <button
            type="button"
            className="change-pwd-btn-close"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Close
          </button>

          <button
            type="submit"
            form="change-pwd-form"
            className="change-pwd-btn-update"
            disabled={!isFormValid || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="btn-spinner-icon" />
                Updating...
              </>
            ) : (
              'Update Password'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

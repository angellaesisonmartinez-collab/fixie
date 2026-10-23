import React, { useState, useEffect } from 'react';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Check,
  Loader2,
  AlertCircle
} from 'lucide-react';
import Header from './Header';
import Footer from './Footer';
import fixieMascotSuccess from '../assets/fixie-mascot-success.png';
import { supabase } from '../lib/supabase';
import { sendPasswordResetEmail, verifyOtpCode } from '../lib/emailService';
import bcrypt from 'bcryptjs';

export default function ForgotPasswordPage({ initialStep = 1, onReturnToLogin }) {
  // Step 1: Email Identification, Step 2: Code Verification, Step 3: New Password, Step 4: Password Reset Confirmation
  const [step, setStep] = useState(initialStep);
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // 5-minute (300 seconds) countdown timer for Step 2
  const [secondsRemaining, setSecondsRemaining] = useState(300);

  useEffect(() => {
    setStep(initialStep);
  }, [initialStep]);

  useEffect(() => {
    let timer;
    if (step === 2 && secondsRemaining > 0) {

      timer = setInterval(() => {
        setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, secondsRemaining]);

  const formatTimer = (sec) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Phase 02 password security requirement rules
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

  // Step 1: Send Code Handler
  const handleSendCode = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    setIsLoading(true);
    try {
      // Validate email exists in database (profiles or students table)
      let userFullName = 'User';
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, email, status, full_name')
          .eq('email', trimmedEmail)
          .maybeSingle();

        if (profile) {
          if (profile.status === 'disabled') {
            setErrorMessage('Your account has been disabled because you have already graduated or transferred.');
            setIsLoading(false);
            return;
          }
          if (profile.full_name) {
            userFullName = profile.full_name;
          }
        } else {
          // Check students table for student accounts
          const { data: student } = await supabase
            .from('students')
            .select('id, email, status, name, first_name, last_name')
            .eq('email', trimmedEmail)
            .maybeSingle();

          if (student) {
            if (student.status === 'disabled' || student.status === 'inactive') {
              setErrorMessage('Your account has been disabled because you have already graduated or transferred.');
              setIsLoading(false);
              return;
            }
            userFullName = student.name || `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'Student';
          }
        }
      } catch (err) {
        console.warn('Profile/student lookup note:', err);
      }

      // Dispatch 6-digit OTP code via EmailJS
      await sendPasswordResetEmail(trimmedEmail, userFullName);

      // Transition to Step 2
      setStep(2);
      setSecondsRemaining(300);
    } catch (err) {
      setErrorMessage(err.message || 'This email address is not registered in the system.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify Code Handler
  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const trimmedCode = otpCode.trim();
    if (!trimmedCode || trimmedCode.length !== 6) {
      setErrorMessage('Please enter the 6-digit verification code.');
      return;
    }

    if (secondsRemaining <= 0) {
      setErrorMessage('Verification code has expired. Please request a new code.');
      return;
    }

    setIsLoading(true);
    try {
      const isValid = await verifyOtpCode(email.trim(), trimmedCode);

      if (!isValid) {
        throw new Error('Invalid or expired verification code. Please check your email.');
      }

      // Transition to Step 3
      setStep(3);
    } catch (err) {
      setErrorMessage(err.message || 'Invalid or expired verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Resend Code Handler (Phase 7 Section 2 & Validation Item 15)
  const handleResendCode = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setErrorMessage('');
    try {
      await sendPasswordResetEmail(email.trim(), 'Technical Personnel');
      setSecondsRemaining(300);
      setErrorMessage('');
    } catch (err) {
      setErrorMessage(err.message || 'Error resending code.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Reset Password Handler
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!newPassword) {
      setErrorMessage('Please enter a new password.');
      return;
    }

    if (!allRequirementsMet) {
      setErrorMessage('Password does not fulfill all required security criteria.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const trimmedEmail = email.trim();
      const nowIso = new Date().toISOString();
      const passwordHash = bcrypt.hashSync(newPassword, 10);
      let updatedAnyRecord = false;

      // 1. Student accounts: login verifies students.password_hash (bcrypt).
      //    SAFETY: only update when the email identifies exactly ONE student,
      //    so one reset can never overwrite other students' passwords.
      let sharedEmailConflict = false;
      try {
        const [userPart, domainPart] = trimmedEmail.split('@');
        const { data: matches, error: findErr } = await supabase
          .from('students')
          .select('id')
          .or(`email.ilike.${trimmedEmail},email.ilike.${userPart}+%@${domainPart}`);
        if (findErr) console.warn('Student lookup note:', findErr.message);

        if (matches && matches.length > 1) {
          sharedEmailConflict = true;
        } else if (matches && matches.length === 1) {
          const { data: stRows, error: stErr } = await supabase
            .from('students')
            .update({
              password_hash: passwordHash,
              must_change_password: false,
              updated_at: nowIso,
            })
            .eq('id', matches[0].id)
            .select('id');
          if (stErr) console.warn('Student password update note:', stErr.message);
          if (stRows && stRows.length > 0) updatedAnyRecord = true;
        }
      } catch (stErr) {
        console.warn('Student table password sync note:', stErr);
      }

      if (sharedEmailConflict) {
        throw new Error('Several accounts share this email address, so the password cannot be reset automatically. Please contact the ICT Office.');
      }

      // 2. Technical personnel accounts: fallback login verifies technical_personnel.password_hash
      try {
        const { data: tpRows, error: tpErr } = await supabase
          .from('technical_personnel')
          .update({
            password_hash: passwordHash,
            updated_at: nowIso,
          })
          .eq('registered_email', trimmedEmail)
          .select('id');
        if (tpErr) console.warn('Technical personnel password update note:', tpErr.message);
        if (tpRows && tpRows.length > 0) updatedAnyRecord = true;
      } catch (tpErr) {
        console.warn('Technical personnel password sync note:', tpErr);
      }

      // 3. Supabase Auth (only succeeds when a session exists; harmless otherwise)
      try {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) console.warn('Supabase auth update notice:', error.message);
        else updatedAnyRecord = true;
      } catch (authErr) {
        console.warn('Supabase auth update note:', authErr);
      }

      if (!updatedAnyRecord) {
        throw new Error('We could not update the password for this email. Please try again or contact the ICT Office.');
      }

      // Transition to Step 4: Confirmation Modal
      setStep(4);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to update password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReturnToLogin = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }

    if (onReturnToLogin) {
      onReturnToLogin();
    } else {
      window.location.hash = '';
      window.location.reload();
    }
  };

  const handleCancel = async () => {
    try {
      await supabase.auth.signOut().catch(() => { });
    } catch { }

    if (onReturnToLogin) {
      onReturnToLogin();
    } else {
      window.location.hash = '';
      window.location.reload();
    }
  };

  return (
    <div className="forgot-page-root">
      {/* Top Header: Fixie brand lockup on the left matching Login page */}
      <Header />

      {/* Main Centered Viewport */}
      <main className="forgot-main-viewport">
        {/* STEP 1: Forgot Password (Email Identification) */}
        {step === 1 && (
          <div className="forgot-card-container">
            <div className="forgot-headings-block">
              <h1 className="forgot-card-title">Forgot Password</h1>
              <p className="forgot-card-subtitle">
                Enter your email and we’ll send a 6-digit code.
              </p>
            </div>

            {errorMessage && (
              <div className="forgot-error-banner" role="alert">
                <AlertCircle size={16} className="error-icon" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSendCode} noValidate className="forgot-form">
              <div className="forgot-field-group">
                <label htmlFor="forgot-email-input" className="forgot-field-label">
                  Email
                </label>
                <div className="forgot-input-wrapper">
                  <Mail size={18} className="forgot-input-icon" aria-hidden="true" />
                  <input
                    id="forgot-email-input"
                    type="email"
                    className="forgot-text-input"
                    placeholder="Enter email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errorMessage) setErrorMessage('');
                    }}
                    disabled={isLoading}
                    autoComplete="email"
                    autoFocus
                  />
                </div>
              </div>

              <div className="forgot-button-row">
                <button
                  type="button"
                  className="forgot-cancel-btn"
                  onClick={handleCancel}
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="forgot-submit-btn"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="btn-loading-flex">
                      <Loader2 size={18} className="spinner-rotate" />
                      Sending Code...
                    </span>
                  ) : (
                    'Send Code'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 2: Enter Code (Code Verification) */}
        {step === 2 && (
          <div className="forgot-card-container">
            <div className="forgot-headings-block">
              <h1 className="forgot-card-title">Enter Code</h1>
              <p className="forgot-card-subtitle">
                A code has been sent to the email.
              </p>
            </div>

            {errorMessage && (
              <div className="forgot-error-banner" role="alert">
                <AlertCircle size={16} className="error-icon" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleVerifyCode} noValidate className="forgot-form">
              <div className="forgot-field-group">
                <label htmlFor="forgot-otp-input" className="forgot-field-label">
                  6-digit code
                </label>
                <div className="forgot-input-wrapper">
                  <input
                    id="forgot-otp-input"
                    type="text"
                    maxLength={6}
                    className="forgot-text-input"
                    placeholder="000000"
                    value={otpCode}
                    onChange={(e) => {
                      setOtpCode(e.target.value);
                      if (errorMessage) setErrorMessage('');
                    }}
                    disabled={isLoading}
                    autoFocus
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                  <p className="forgot-timer-text" style={{ margin: 0 }}>
                    Code expires in {formatTimer(secondsRemaining)}
                  </p>
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={isLoading}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#15803d',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      padding: '2px 6px',
                      textDecoration: 'none',
                    }}
                  >
                    Resend Code
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="forgot-submit-btn"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="btn-loading-flex">
                    <Loader2 size={18} className="spinner-rotate" />
                    Verifying...
                  </span>
                ) : (
                  'Verify Code'
                )}
              </button>
            </form>
          </div>
        )}

        {/* STEP 3: New Password (Reset Password) */}
        {step === 3 && (
          <div className="forgot-card-container">
            <div className="forgot-headings-block">
              <h1 className="forgot-card-title">New Password</h1>
              <p className="forgot-card-subtitle">
                Create a new password for your account.
              </p>
            </div>

            {errorMessage && (
              <div className="forgot-error-banner" role="alert">
                <AlertCircle size={16} className="error-icon" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleResetPassword} noValidate className="forgot-form">
              {/* Field 1: New Password */}
              <div className="forgot-field-group">
                <label htmlFor="forgot-new-password" className="forgot-field-label">
                  New Password
                </label>
                <div className="forgot-input-wrapper">
                  <Lock size={18} className="forgot-input-icon" aria-hidden="true" />
                  <input
                    id="forgot-new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    className="forgot-text-input"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (errorMessage) setErrorMessage('');
                    }}
                    disabled={isLoading}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="forgot-eye-btn"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                </div>
              </div>

              {/* SECURITY REQUIREMENTS Panel */}
              <div className="forgot-requirements-card">
                <h3 className="forgot-requirements-title">SECURITY REQUIREMENTS</h3>
                <ul className="forgot-requirements-list">
                  {requirements.map((req) => (
                    <li
                      key={req.id}
                      className={`forgot-requirement-item ${req.isMet ? 'is-met' : 'not-met'}`}
                    >
                      <span className="requirement-check-circle" aria-hidden="true">
                        <Check size={9} strokeWidth={3.5} />
                      </span>
                      <span className="requirement-label-text">{req.label}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Field 2: Confirm Password */}
              <div className="forgot-field-group">
                <label htmlFor="forgot-confirm-password" className="forgot-field-label">
                  Confirm Password
                </label>
                <div className="forgot-input-wrapper">
                  <Lock size={18} className="forgot-input-icon" aria-hidden="true" />
                  <input
                    id="forgot-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="forgot-text-input"
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (errorMessage) setErrorMessage('');
                    }}
                    disabled={isLoading}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="forgot-eye-btn"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirmPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="forgot-submit-btn"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="btn-loading-flex">
                    <Loader2 size={18} className="spinner-rotate" />
                    Resetting Password...
                  </span>
                ) : (
                  'Reset Password'
                )}
              </button>
            </form>
          </div>
        )}

        {/* STEP 4: Password Reset Confirmation Modal Dialog */}
        {step === 4 && (
          <div
            className="modal-backdrop-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="password-reset-success-title"
          >
            <div className="password-reset-modal-card">
              {/* Upper Sage Mint Body */}
              <div className="password-reset-modal-body">
                <div className="mascot-illustration-wrapper">
                  <img
                    src={fixieMascotSuccess}
                    alt="Password Reset Success Mascot"
                    className="success-mascot-img"
                  />
                </div>

                <h2 id="password-reset-success-title" className="password-reset-modal-title">
                  Password Reset!
                </h2>
                <p className="password-reset-modal-subtitle">
                  Your password has been reset and updated. You can now log in.
                </p>
              </div>

              {/* Bottom White Action Footer */}
              <div className="password-reset-modal-footer">
                <button
                  type="button"
                  className="password-reset-return-btn"
                  onClick={handleReturnToLogin}
                >
                  Return to Login
                </button>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}

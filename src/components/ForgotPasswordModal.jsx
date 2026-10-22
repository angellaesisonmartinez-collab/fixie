import { useState, useEffect } from 'react';
import { 
  X, 
  Mail, 
  KeyRound, 
  Lock, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle2, 
  ArrowLeft, 
  Loader2, 
  ShieldCheck,
  Check,
  Clock
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { sendPasswordResetEmail, verifyOtpCode } from '../lib/emailService';
import bcrypt from 'bcryptjs';

export default function ForgotPasswordModal({ isOpen, onClose }) {
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password, 4: Success
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successNotice, setSuccessNotice] = useState('');

  // Countdown timer for 5 minutes (300 seconds)
  const [secondsRemaining, setSecondsRemaining] = useState(300);

  useEffect(() => {
    let timer;
    if (isOpen && step === 2 && secondsRemaining > 0) {
      timer = setInterval(() => {
        setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isOpen, step, secondsRemaining]);

  if (!isOpen) return null;

  const handleClose = () => {
    setStep(1);
    setEmail('');
    setOtpCode('');
    setNewPassword('');
    setConfirmPassword('');
    setErrorMessage('');
    setSuccessNotice('');
    setSecondsRemaining(300);
    onClose();
  };

  const formatTimer = (sec) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Password criteria check
  const hasMinLength = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword);

  const passedCount = [hasMinLength, hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;
  let strengthTier = 'Weak';
  let strengthClass = 'tier-weak';
  if (passedCount >= 5) {
    strengthTier = 'Strong';
    strengthClass = 'tier-strong';
  } else if (passedCount >= 3) {
    strengthTier = 'Moderate';
    strengthClass = 'tier-moderate';
  }

  // Step 1: Send OTP to Email
  const handleSendCode = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessNotice('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage('Please enter your registered email address.');
      return;
    }

    setIsLoading(true);
    try {
      // Check if email exists in public profiles or technical_personnel
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, status, role, full_name')
        .eq('email', trimmedEmail)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      let recipientName = data?.full_name || '';

      if (!data) {
        const { data: stData } = await supabase
          .from('students')
          .select('id, email, status, name, first_name, last_name')
          .eq('email', trimmedEmail)
          .maybeSingle();

        if (stData) {
          if (stData.status === 'disabled' || stData.status === 'inactive') {
            setErrorMessage('Your account has been disabled because you have already graduated or transferred.');
            setIsLoading(false);
            return;
          }
          recipientName = stData.name || `${stData.first_name || ''} ${stData.last_name || ''}`.trim();
        }
      }

      // Dispatch 6-digit OTP code via EmailJS service
      await sendPasswordResetEmail(trimmedEmail, recipientName || 'User');

      setStep(2);
      setSecondsRemaining(300);
      setSuccessNotice(`A 6-digit verification code has been dispatched to ${trimmedEmail}`);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to dispatch verification code. Please check the email.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify Code
  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!otpCode || otpCode.trim().length !== 6) {
      setErrorMessage('Please enter the valid 6-digit verification code.');
      return;
    }

    if (secondsRemaining <= 0) {
      setErrorMessage('Verification code has expired. Please request a new code.');
      return;
    }

    setIsLoading(true);
    try {
      const isValid = await verifyOtpCode(email.trim(), otpCode.trim());

      if (!isValid) {
        throw new Error('Invalid or expired verification code. Please check your email.');
      }

      setStep(3);
      setErrorMessage('');
      setSuccessNotice('');
    } catch (err) {
      setErrorMessage(err.message || 'Invalid or expired verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2 Resend Code
  const handleResendCode = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setErrorMessage('');
    try {
      await sendPasswordResetEmail(email.trim(), 'Technical Personnel');
      setSecondsRemaining(300);
      setSuccessNotice('A fresh 6-digit verification code has been dispatched to your email.');
    } catch (err) {
      setErrorMessage(err.message || 'Error resending code.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (passedCount < 5) {
      setErrorMessage('Password does not fulfill all required security criteria.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify both fields.');
      return;
    }

    setIsLoading(true);
    try {
      try {
        await supabase.auth.updateUser({
          password: newPassword,
        });
      } catch (authErr) {
        console.warn('Supabase auth reset updateUser note:', authErr);
      }

      const password_hash = bcrypt.hashSync(newPassword, 10);
      try {
        await supabase
          .from('students')
          .update({
            password_hash,
            must_change_password: false,
            updated_at: new Date().toISOString(),
          })
          .eq('email', email.trim());
      } catch (stErr) {
        console.warn('Student table password sync note:', stErr);
      }

      try {
        await supabase
          .from('technical_personnel')
          .update({
            password_hash,
            updated_at: new Date().toISOString(),
          })
          .eq('registered_email', email.trim());
      } catch (tpErr) {
        console.warn('TP table password sync note:', tpErr);
      }

      setStep(4);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to update password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop-overlay" role="dialog" aria-modal="true" aria-labelledby="forgot-modal-title">
      <div className="forgot-modal-card">
        {/* Modal Top Bar */}
        <div className="modal-top-bar">
          <div className="modal-header-text">
            <h3 id="forgot-modal-title" className="modal-title">
              {step === 4 ? 'Password Reset Complete' : 'Forgot Password'}
            </h3>
            <p className="modal-sub">
              {step === 1 && 'Step 1 of 3: Registered Email Identification'}
              {step === 2 && 'Step 2 of 3: 6-Digit Code Verification'}
              {step === 3 && 'Step 3 of 3: Set Your New Secure Password'}
              {step === 4 && 'Your credentials have been securely updated.'}
            </p>
          </div>
          <button 
            type="button" 
            className="modal-close-btn" 
            onClick={handleClose} 
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Global Modal Alert Banner */}
        {errorMessage && (
          <div className="modal-alert-banner alert-error" role="alert">
            <AlertCircle size={18} className="flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successNotice && (
          <div className="modal-alert-banner alert-success" role="status">
            <CheckCircle2 size={18} className="flex-shrink-0" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* STEP 1: Email Identification */}
        {step === 1 && (
          <form onSubmit={handleSendCode} className="modal-form-flow">
            <div className="form-group">
              <label htmlFor="reset-email" className="modal-field-label">
                REGISTERED EMAIL ADDRESS
              </label>
              <div className="modal-input-wrapper">
                <Mail className="modal-input-icon" size={18} />
                <input
                  id="reset-email"
                  type="email"
                  className="modal-input-field"
                  placeholder="name@university.edu"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  disabled={isLoading}
                  autoFocus
                  required
                />
              </div>
            </div>

            {/* Assistance Guides */}
            <div className="reset-assistance-card">
              <div className="assistance-block">
                <span className="role-badge student">Students</span>
                <p className="assistance-text">
                  Can’t access your email? Visit the <strong>ICT Room</strong> and ask Technical Personnel for assistance.
                </p>
              </div>
              <div className="assistance-block">
                <span className="role-badge tech">Technical Personnel</span>
                <p className="assistance-text">
                  Contact the <strong>developer</strong>, who can recover or change the registered email.
                </p>
              </div>
            </div>

            <div className="modal-actions-row">
              <button
                type="button"
                className="modal-secondary-btn"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="modal-primary-btn"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="btn-loading-content">
                    <Loader2 size={18} className="spinner-icon" />
                    Sending Code...
                  </span>
                ) : (
                  'Send Verification Code'
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: Code Verification */}
        {step === 2 && (
          <form onSubmit={handleVerifyCode} className="modal-form-flow">
            <div className="form-group">
              <label htmlFor="reset-otp" className="modal-field-label">
                6-DIGIT VERIFICATION CODE
              </label>
              <div className="modal-input-wrapper">
                <KeyRound className="modal-input-icon" size={18} />
                <input
                  id="reset-otp"
                  type="text"
                  maxLength={6}
                  className="modal-input-field otp-letter-spacing"
                  placeholder="000000"
                  value={otpCode}
                  onChange={(e) => {
                    setOtpCode(e.target.value.replace(/\D/g, ''));
                    if (errorMessage) setErrorMessage('');
                  }}
                  disabled={isLoading}
                  autoFocus
                  required
                />
              </div>
            </div>

            {/* Timer countdown and resend */}
            <div className="otp-timer-container">
              <div className="otp-timer-badge">
                <Clock size={16} />
                <span>Code expires in: <strong>{formatTimer(secondsRemaining)}</strong></span>
              </div>
              <button
                type="button"
                className="otp-resend-btn"
                onClick={handleResendCode}
                disabled={isLoading || secondsRemaining > 240}
              >
                Resend Code
              </button>
            </div>

            <div className="modal-actions-row">
              <button
                type="button"
                className="modal-secondary-btn"
                onClick={() => setStep(1)}
                disabled={isLoading}
              >
                <ArrowLeft size={16} /> Back
              </button>
              <button
                type="submit"
                className="modal-primary-btn"
                disabled={isLoading || otpCode.length !== 6}
              >
                {isLoading ? (
                  <span className="btn-loading-content">
                    <Loader2 size={18} className="spinner-icon" />
                    Verifying...
                  </span>
                ) : (
                  'Verify Code'
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: Reset Password */}
        {step === 3 && (
          <form onSubmit={handleResetPassword} className="modal-form-flow">
            <div className="form-group">
              <label htmlFor="modal-new-pw" className="modal-field-label">
                NEW PASSWORD
              </label>
              <div className="modal-input-wrapper">
                <Lock className="modal-input-icon" size={18} />
                <input
                  id="modal-new-pw"
                  type={showNewPassword ? 'text' : 'password'}
                  className="modal-input-field"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isLoading}
                  autoFocus
                  required
                />
                <button
                  type="button"
                  className="modal-pw-toggle"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Password Strength Meter */}
            <div className="strength-meter-card">
              <div className="meter-header">
                <span className="meter-label">Password Security:</span>
                <span className={`meter-tier ${strengthClass}`}>{strengthTier}</span>
              </div>
              <div className="meter-track">
                <div 
                  className={`meter-bar ${strengthClass}`} 
                  style={{ width: `${(passedCount / 5) * 100}%` }} 
                />
              </div>

              {/* Requirement Checklist */}
              <ul className="strength-requirements-list">
                <li className={hasMinLength ? 'req-satisfied' : 'req-unmet'}>
                  <Check size={14} /> At least 8 characters
                </li>
                <li className={hasUpper ? 'req-satisfied' : 'req-unmet'}>
                  <Check size={14} /> At least one uppercase letter (A-Z)
                </li>
                <li className={hasLower ? 'req-satisfied' : 'req-unmet'}>
                  <Check size={14} /> At least one lowercase letter (a-z)
                </li>
                <li className={hasNumber ? 'req-satisfied' : 'req-unmet'}>
                  <Check size={14} /> At least one number (0-9)
                </li>
                <li className={hasSpecial ? 'req-satisfied' : 'req-unmet'}>
                  <Check size={14} /> At least one special symbol (!@#$...)
                </li>
              </ul>
            </div>

            <div className="form-group">
              <label htmlFor="modal-confirm-pw" className="modal-field-label">
                CONFIRM NEW PASSWORD
              </label>
              <div className="modal-input-wrapper">
                <Lock className="modal-input-icon" size={18} />
                <input
                  id="modal-confirm-pw"
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="modal-input-field"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  required
                />
                <button
                  type="button"
                  className="modal-pw-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="modal-actions-row">
              <button
                type="button"
                className="modal-secondary-btn"
                onClick={() => setStep(2)}
                disabled={isLoading}
              >
                <ArrowLeft size={16} /> Back
              </button>
              <button
                type="submit"
                className="modal-primary-btn"
                disabled={isLoading || passedCount < 5 || newPassword !== confirmPassword}
              >
                {isLoading ? (
                  <span className="btn-loading-content">
                    <Loader2 size={18} className="spinner-icon" />
                    Resetting...
                  </span>
                ) : (
                  'Reset Password'
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 4: Success Modal Dialog */}
        {step === 4 && (
          <div className="modal-success-layout">
            <div className="modal-success-icon-wrap">
              <ShieldCheck size={56} className="text-emerald-500" />
            </div>
            <h4 className="success-dialog-title">Password Reset Successful!</h4>
            <p className="success-dialog-text">
              Your password has been securely updated. You can now log into your Fixie portal account with your new credentials.
            </p>
            <button
              type="button"
              className="modal-primary-btn w-full"
              onClick={handleClose}
            >
              Return to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

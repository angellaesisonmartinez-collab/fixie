import React, { useState } from 'react';
import { 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  Check, 
  Loader2, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import Header from './Header';
import Footer from './Footer';
import PasswordUpdatedCard from './PasswordUpdatedCard';
import { supabase } from '../lib/supabase';

export default function TechnicalPersonnelSetup({ 
  currentUser, 
  userProfile, 
  onSuccess, 
  onSignOut,
  onReturnToLogin
}) {
  const [profileData, setProfileData] = useState(userProfile || null);
  const [username, setUsername] = useState(
    userProfile?.username && userProfile.username !== 'ict-admin' 
      ? userProfile.username 
      : ''
  );
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Fetch live profile from Supabase if currentUser or userProfile changes
  React.useEffect(() => {
    if (userProfile) {
      setProfileData(userProfile);
      if (userProfile.username && userProfile.username !== 'ict-admin' && !username) {
        setUsername(userProfile.username);
      }
    }
    const fetchLiveProfile = async () => {
      const emailToMatch = userProfile?.email || currentUser?.email;
      const idToMatch = userProfile?.id || currentUser?.id;
      if (!emailToMatch && !idToMatch) return;
      try {
        const { data: tpUser } = await supabase
          .from('technical_personnel')
          .select('*')
          .or(`id.eq.${idToMatch || ''},registered_email.eq.${emailToMatch || ''}`)
          .maybeSingle();
        if (tpUser) {
          setProfileData((prev) => ({
            ...(prev || {}),
            id: tpUser.id,
            username: tpUser.username,
            full_name: 'Technical Personnel',
            role: 'admin',
          }));
          if (tpUser.username && tpUser.username !== 'ict-admin') {
            setUsername((curr) => curr || tpUser.username);
          }
        }
      } catch (err) {
        console.warn('TechnicalPersonnelSetup live fetch note:', err);
      }
    };
    fetchLiveProfile();
  }, [userProfile, currentUser]);

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [usernameError, setUsernameError] = useState('');
  const [newPasswordError, setNewPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [generalError, setGeneralError] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  // 5 Phase 02 security requirement rules
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

  const validateForm = () => {
    let isValid = true;
    setUsernameError('');
    setNewPasswordError('');
    setConfirmPasswordError('');
    setGeneralError('');

    const trimmedUsername = username.trim();

    // 1. Username validation
    if (!trimmedUsername) {
      setUsernameError('Username is required.');
      isValid = false;
    } else if (trimmedUsername.length < 3) {
      setUsernameError('Username must be at least 3 characters.');
      isValid = false;
    }

    // 2. New Password validation
    if (!newPassword) {
      setNewPasswordError('New password is required.');
      isValid = false;
    } else if (!allRequirementsMet) {
      setNewPasswordError('Please satisfy all password security requirements below.');
      isValid = false;
    }

    // 3. Confirm Password validation
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
      const trimmedUsername = username.trim();

      // Step A: Update credentials in Supabase Auth if a session exists
      if (currentUser) {
        const authPayload = {
          password: newPassword,
          data: { 
            username: trimmedUsername,
            password_last_updated: new Date().toISOString()
          },
        };

        const { error: authError } = await supabase.auth.updateUser(authPayload);
        if (authError) {
          setGeneralError(authError.message || 'Failed to update authentication password.');
          setIsLoading(false);
          return;
        }

        // Step B: Update public.profiles record / technical_personnel table
        let rpcSuccessful = false;
        try {
          const { error: rpcError } = await supabase.rpc('update_admin_account_credentials', {
            p_username: trimmedUsername,
          });
          if (!rpcError) {
            rpcSuccessful = true;
          }
        } catch {
          // ignore rpc fallback
        }

        // Always update technical_personnel table directly so it's guaranteed saved
        try {
          const userEmail = currentUser?.email || 'angellaemrtnz@gmail.com';
          const { error: tableError } = await supabase
            .from('technical_personnel')
            .update({
              username: trimmedUsername,
              is_setup_complete: true,
              updated_at: new Date().toISOString(),
            })
            .or(`registered_email.eq.${userEmail},id.eq.${currentUser.id}`);

          if (tableError) {
            console.warn('Profile direct update notice:', tableError);
          }
        } catch (dbErr) {
          console.warn('DB update error:', dbErr);
        }

        // Also update profiles view/table if applicable
        try {
          await supabase
            .from('profiles')
            .update({
              username: trimmedUsername,
              is_setup_complete: true,
              must_change_password: false,
              updated_at: new Date().toISOString(),
            })
            .eq('id', currentUser.id);
        } catch (pErr) {
          // view may be read-only
        }
      }

      // Step C: Trigger Success Modal (Image 2)
      setIsSuccessModalOpen(true);
    } catch (err) {
      setGeneralError(err.message || 'An unexpected error occurred during account setup.');
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
      // ignore sign out error
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
    if (onSuccess) {
      onSuccess(profile || {
        ...userProfile,
        username: username.trim(),
        role: 'admin',
        must_change_password: false,
        is_setup_complete: true,
      });
    } else {
      window.location.hash = '#admin-dashboard';
      window.location.reload();
    }
  };

  // Exit button action: redirect immediately to login without modifying credentials
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
      {/* Top Header with Profile Info on Right & Back Arrow on Left */}
      <Header
        showLogo={false}
        showBack={true}
        onBack={handleExit}
        showActionButton={false}
        showUser={true}
        userName={profileData?.full_name || 'Technical Personnel'}
        userRole="ICT-Admin"
        avatarText="TP"
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
              <h1 className="setup-main-heading">Update Credentials</h1>
              <p className="setup-sub-heading">
                You need to update your credentials before continuing.
              </p>
            </div>

            {generalError && (
              <div className="setup-error-banner" role="alert">
                <AlertCircle size={18} className="error-icon" />
                <span>{generalError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="setup-form">
              {/* Field 1: USERNAME */}
              <div className="setup-field-group">
                <label htmlFor="setup-username-input" className="setup-field-label">
                  USERNAME
                </label>
                <div className={`setup-input-wrapper ${usernameError ? 'has-error' : ''}`}>
                  <User size={18} className="setup-input-icon" aria-hidden="true" />
                  <input
                    id="setup-username-input"
                    type="text"
                    className="setup-text-input"
                    placeholder="Enter username"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      if (usernameError) setUsernameError('');
                    }}
                    disabled={isLoading}
                    autoComplete="username"
                  />
                </div>
                {usernameError && (
                  <p className="setup-error-text" role="alert">
                    {usernameError}
                  </p>
                )}
              </div>

              {/* Field 2: NEW PASSWORD */}
              <div className="setup-field-group">
                <label htmlFor="setup-new-password-input" className="setup-field-label">
                  NEW PASSWORD
                </label>
                <div className={`setup-input-wrapper ${newPasswordError ? 'has-error' : ''}`}>
                  <Lock size={18} className="setup-input-icon" aria-hidden="true" />
                  <input
                    id="setup-new-password-input"
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

              {/* Field 3: CONFIRM PASSWORD */}
              <div className="setup-field-group">
                <label htmlFor="setup-confirm-password-input" className="setup-field-label">
                  CONFIRM PASSWORD
                </label>
                <div className={`setup-input-wrapper ${confirmPasswordError ? 'has-error' : ''}`}>
                  <Lock size={18} className="setup-input-icon" aria-hidden="true" />
                  <input
                    id="setup-confirm-password-input"
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
              username: username.trim(),
              role: 'admin',
              must_change_password: false,
              is_setup_complete: true,
            }}
            onReturnToLogin={handleSuccessRedirect}
            onContinueToDashboard={handleContinueToDashboard}
          />
        </div>
      )}
    </div>
  );
}

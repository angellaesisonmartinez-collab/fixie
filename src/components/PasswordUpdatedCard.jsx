import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import fixieMascotSuccess from '../assets/fixie-mascot-success.png';
import { supabase } from '../lib/supabase';

export default function PasswordUpdatedCard({ updatedProfile, onContinueToDashboard, onReturnToLogin }) {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState('');

  const handleReturnToLogin = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    setSignOutError('');

    try {
      // Non-blocking sign out with 1.2s timeout guard so it never gets stuck
      const signOutPromise = supabase.auth.signOut();
      const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 1200));
      await Promise.race([signOutPromise, timeoutPromise]);
    } catch (err) {
      console.warn('Sign out notice:', err);
    } finally {
      setIsSigningOut(false);
      if (onReturnToLogin) {
        onReturnToLogin();
      }
    }
  };

  return (
    <div className="password-updated-card" role="dialog" aria-modal="true" aria-labelledby="modal-success-title">
      {/* Upper Card Content Area (Sage background) */}
      <div className="password-updated-body">
        {/* Mascot Header Graphic */}
        <div className="mascot-illustration-wrapper">
          <img
            src={fixieMascotSuccess}
            alt="Account Updated Success Mascot"
            className="success-mascot-img"
          />
        </div>

        {/* Heading & Subtitle */}
        <h2 id="modal-success-title" className="password-updated-title">
          Account Updated Successfully
        </h2>
        <p className="password-updated-subtitle">
          Use your new credentials the next time you sign in.
        </p>

        {signOutError && (
          <p className="field-error-msg" style={{ textAlign: 'center', marginTop: '12px', color: '#dc2626' }}>
            {signOutError}
          </p>
        )}

      </div>

      {/* Bottom Action Footer (White background) */}
      <div className="password-updated-footer">
        <button
          type="button"
          className="return-to-login-btn"
          onClick={handleReturnToLogin}
          disabled={isSigningOut}
        >
          {isSigningOut ? (
            <span className="btn-loading-content">
              <Loader2 size={16} className="spinner-icon" />
              Signing Out...
            </span>
          ) : (
            'Return to Login'
          )}
        </button>

        <button
          type="button"
          className="continue-dashboard-btn"
          onClick={() => onContinueToDashboard && onContinueToDashboard(updatedProfile)}
          disabled={isSigningOut}
        >
          Continue to Dashboard
        </button>
      </div>
    </div>
  );
}


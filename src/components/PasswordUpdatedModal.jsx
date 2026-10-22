import React, { useEffect } from 'react';
import fixieMascotSuccess from '../assets/fixie-mascot-success.png';
import './PasswordUpdatedModal.css';

/**
 * Password Updated Modal
 * Exact replica of the reference design screenshot (Image 2).
 *
 * Features:
 * - Upper section with pale sage green (#D8E7DD) background
 * - Centered Fox Mascot with builder helmet, medal & sparkles
 * - "Password Updated" headline
 * - Helpful explanatory subtext
 * - Crisp white footer with right-aligned deep forest green (#072617) "Continue" button
 * - Clicking "Continue" directs the student back to Settings & Privacy screen
 */
export default function PasswordUpdatedModal({
  isOpen,
  onContinue,
}) {
  // Listen for Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onContinue();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onContinue]);

  if (!isOpen) return null;

  return (
    <div
      className="pwd-updated-backdrop"
      onClick={onContinue}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwd-updated-title"
    >
      <div
        className="pwd-updated-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Upper Pale Sage Green Section */}
        <div className="pwd-updated-top-body">
          <div className="pwd-updated-mascot-wrapper">
            <img
              src={fixieMascotSuccess}
              alt="Password Updated Mascot"
              className="pwd-updated-mascot-img"
            />
          </div>

          <h2 id="pwd-updated-title" className="pwd-updated-title">
            Password Updated
          </h2>

          <p className="pwd-updated-subtitle">
            Your password has been changed successfully. Use your new credentials the next time you sign in.
          </p>
        </div>

        {/* Lower Crisp White Footer */}
        <div className="pwd-updated-footer">
          <button
            type="button"
            className="pwd-updated-btn-continue"
            onClick={onContinue}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

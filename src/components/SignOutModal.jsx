import React, { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import fixieMascotSad from '../assets/fixie-mascot-sad.png';

/**
 * SignOutModal
 * 
 * Pixel-perfect confirmation dialog asking technical personnel or students
 * if they really want to sign out.
 * 
 * Design Features (matching provided reference UI):
 * - Rounded container with crisp dark forest green border (#0A3420)
 * - Calming sage/mint upper section (#DBEAE1) with sad Fixie mascot and prompt
 * - Clean white lower panel with "Cancel" text button and solid forest green "Sign Out" button
 * - Backdrop blur, ESC key dismiss, and smooth animations
 */
export default function SignOutModal({ isOpen, onConfirm, onCancel, isLoading = false }) {
  const cancelBtnRef = useRef(null);

  // Dismiss on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  // Accessibility: focus cancel button upon open
  useEffect(() => {
    if (isOpen && cancelBtnRef.current) {
      cancelBtnRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixie-signout-modal-backdrop"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="signout-modal-title"
    >
      <div
        className="fixie-signout-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Section: Soft Sage Green with Sad Mascot & Prompt */}
        <div className="signout-modal-top-panel">
          <div className="signout-mascot-container">
            <img
              src={fixieMascotSad}
              alt="Sad Fixie mascot"
              className="signout-sad-mascot-img"
            />
          </div>
          <h2 id="signout-modal-title" className="signout-modal-question">
            Are you sure you want to sign out?
          </h2>
        </div>

        {/* Bottom Section: Pure White with Action Buttons */}
        <div className="signout-modal-bottom-panel">
          <button
            ref={cancelBtnRef}
            type="button"
            className="signout-cancel-stay-btn"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </button>

          <button
            type="button"
            className="signout-confirm-action-btn"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="signout-btn-loading">
                <Loader2 size={16} className="btn-spinner-icon" />
                Signing out...
              </span>
            ) : (
              'Sign Out'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

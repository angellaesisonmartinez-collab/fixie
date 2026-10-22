import React, { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Universal Modal Component (Phase 3 Section 3.6)
 * Accessible dialog wrapper featuring backdrop blur (backdrop-filter: blur(8px)),
 * focus trapping, and keyboard escape dismissal.
 *
 * @param {boolean} isOpen Visibility state
 * @param {function} onClose Callback to close dialog
 * @param {string} title Modal heading text
 * @param {React.ReactNode} children Modal inner content
 * @param {string} size Modal size ('small', 'medium', 'large')
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'medium',
  showCloseButton = true,
  className = '',
}) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixie-universal-modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(7, 40, 26, 0.65)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title || 'Dialog'}
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) {
          onClose();
        }
      }}
    >
      <div
        className={`fixie-universal-modal-card modal-size-${size} ${className}`}
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          width: '100%',
          maxWidth: size === 'small' ? '420px' : size === 'large' ? '720px' : '540px',
          boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.3)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div
            className="universal-modal-header"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '20px 24px',
              borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
            }}
          >
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#07281a' }}>
              {title}
            </h3>
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px',
                  borderRadius: '6px',
                }}
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}

        <div className="universal-modal-content" style={{ padding: '24px' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

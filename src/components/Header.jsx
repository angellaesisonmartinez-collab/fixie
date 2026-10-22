import { ArrowLeft } from 'lucide-react';
import fixieLogo from '../assets/fixie-logo.png';

export default function Header({
  showLogo = true,
  showBrand = true,
  showBack = false,
  onBack = null,
  showUser = false,
  userName = 'Technical Personnel',
  userRole = 'ICT-Admin',
  avatarText = 'TP',
  avatarImg = null,
  onSignOut,
  actionButtonLabel = 'Sign Out',
  showActionButton = true,
  onActionClick = null,
  onExit = null,
}) {
  const handleAction = onActionClick || onExit || onSignOut;
  const handleBack = onBack || onExit || onSignOut;
  const shouldShowLogo = showLogo && showBrand && !showBack;
  const shouldShowActionButton = showActionButton && !showBack;

  return (
    <header className="site-header">
      <div className="site-header-content">
        {showBack && (
          <button
            type="button"
            className="header-back-btn"
            onClick={handleBack}
            aria-label="Back to Login"
            title="Back to Login"
          >
            <ArrowLeft size={32} className="header-back-icon" aria-hidden="true" />
          </button>
        )}

        {shouldShowLogo && (
          <div
            className="brand-lockup"
            onClick={() => {
              if (window.location.hash) {
                window.location.hash = '';
              }
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ' ') && window.location.hash) {
                window.location.hash = '';
              }
            }}
            style={{ cursor: 'pointer' }}
            title="Fixie - Return to Login"
          >
            <img
              src={fixieLogo}
              alt="Fixie - Laboratory Readiness &amp; Maintenance Monitoring"
              className="header-brand-logo-img"
            />
          </div>
        )}

        {showUser && (
          <div className="header-user-section">
            <div className="header-user-avatar">
              {avatarImg ? (
                <img src={avatarImg} alt={userName} className="header-avatar-img" />
              ) : (
                <span>{avatarText}</span>
              )}
            </div>
            <div className="header-user-meta">
              <span className="header-user-name">{userName}</span>
              <span className="header-user-role">{userRole}</span>
            </div>
            {shouldShowActionButton && (
              <button
                type="button"
                className="header-signout-btn"
                onClick={handleAction}
              >
                {actionButtonLabel}
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}


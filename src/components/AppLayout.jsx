import React, { useState } from 'react';
import { X, Menu } from 'lucide-react';
import fixieLogo from '../assets/fixie-logo.png';
import SideNav from './SideNav';
import TopBar from './TopBar';

/**
 * Shared Page Layout Wrapper
 * Single source of truth for screen layout matching Image 3:
 * - Side navigation docked on left, fixed full height (100vh), no page scroll
 * - Right content pane consisting of:
 *   1. TopBar: height 64px, background #CEDDD3, containing Notifications & Settings & Privacy buttons
 *   2. Main content area: background #F2F6F3, scrollable, sits directly below TopBar
 */
export default function AppLayout({
  children,
  navItems = [],
  activeNav = 'Dashboard',
  onNavClick,
  sectionTitle = 'LABORATORY OPERATIONS',
  userProfile = null,
  onSignOut,
  showTopActions = true,
  onSettingsClick,
  notifications = [],
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="fixie-dashboard-viewport">
      {/* Mobile Top Bar */}
      <header className="fixie-mobile-topbar">
        <div className="fixie-mobile-logo">
          <img src={fixieLogo} alt="Fixie Logo" className="mobile-brand-img" />
        </div>
        <div className="fixie-mobile-actions">
          <button
            type="button"
            className="mobile-menu-burger"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixie-sidebar-backdrop"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Standardized Reusable SideNav Component (Left Docked) */}
      <SideNav
        navItems={navItems}
        activeNav={activeNav}
        onNavClick={onNavClick}
        sectionTitle={sectionTitle}
        userProfile={userProfile}
        onSignOut={onSignOut}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />

      {/* Right Column: TopBar above the page, Main Viewport below */}
      <div className={`fixie-dashboard-content-pane ${userProfile?.role === 'student' || activeNav === 'My Reports' || activeNav === 'Submitted Reports' || activeNav === 'Report a Problem' || activeNav === 'Laboratory Guides' ? 'student-portal-layout' : ''}`}>
        {showTopActions && (
          <TopBar
            activeNav={activeNav}
            onSettingsClick={onSettingsClick}
            userProfile={userProfile}
            notifications={notifications}
          />
        )}

        {/* Main Viewport Content Area - Sits directly below TopBar */}
        <main className="fixie-dashboard-main">
          {children}
        </main>
      </div>
    </div>
  );
}

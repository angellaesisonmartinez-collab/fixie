import React, { useState, useEffect, useRef } from 'react';
import { MoreVertical, LogOut, X } from 'lucide-react';
import SidebarLogo from './SidebarLogo';
import SignOutModal from './SignOutModal';
import { supabase } from '../lib/supabase';
import { getStudentAvatar } from '../lib/studentAvatarUtils';

/**
 * Standardized Side Navigation Bar
 * Single source of truth for the Fixie side navigation bar matching Image 1 exactly:
 * - 1. Logo Section (top): Centered Fixie logo with full-width divider below it
 * - 2. Navigation Tabs (middle): Spaced navigation items with active & hover states
 * - 3. Profile Section (bottom, pinned): Technical Personnel user badge with full-width divider above it
 */
export default function SideNav({
  navItems = [],
  activeNav = 'Dashboard',
  onNavClick,
  sectionTitle = 'LABORATORY OPERATIONS',
  userProfile = {
    full_name: 'Technical Personnel',
    role: 'ICT-Admin',
    initials: 'TP',
  },
  onSignOut,
  mobileMenuOpen = false,
  setMobileMenuOpen = () => {},
}) {
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const profileMenuRef = useRef(null);

  // Close profile dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setProfileMenuOpen(false);
      }
    };
    if (profileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileMenuOpen]);

  const handleItemClick = (item) => {
    if (onNavClick) {
      onNavClick(item);
    } else if (item.onClick) {
      item.onClick();
    } else if (item.route) {
      window.location.hash = item.route;
    }
    if (setMobileMenuOpen) {
      setMobileMenuOpen(false);
    }
  };

  const getInitials = (name) => {
    if (!name || name === 'Loading...') return '--';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const isStudent =
    userProfile?.role === 'student' ||
    Boolean(userProfile?.year_block) ||
    navItems.some(
      (item) => item.id === 'Report a Problem' || item.id === 'My Reports' || item.label === 'Report a Problem'
    );
  const isLoading = Boolean(userProfile?.isLoading || (isStudent && !userProfile?.full_name));

  let displayName;
  let displayRole;
  let displayInitials;

  if (isStudent) {
    if (isLoading || !userProfile?.full_name) {
      displayName = 'Loading...';
      displayRole = userProfile?.year_block || '...';
      displayInitials = '--';
    } else {
      displayName = userProfile?.full_name;
      displayRole = userProfile?.year_block || '';
      displayInitials = userProfile?.initials || getInitials(displayName);
    }
  } else {
    displayName = userProfile?.full_name || 'Technical Personnel';
    displayRole = userProfile?.role === 'admin' ? 'ICT-Admin' : (userProfile?.role || 'ICT-Admin');
    displayInitials = userProfile?.initials || 'TP';
  }

  const avatarSrc = userProfile?.avatar || (isStudent ? getStudentAvatar(userProfile) : null);

  return (
    <aside
      className={`fixie-main-sidebar ${mobileMenuOpen ? 'sidebar-open-mobile' : ''}`}
      aria-label="Main Navigation Sidebar"
    >
      {/* 1. LOGO SECTION (top) - Horizontally centered with full-width divider directly below */}
      <div className="sidebar-brand-container">
        <SidebarLogo />
        {mobileMenuOpen && (
          <button
            type="button"
            className="sidebar-mobile-close-btn"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* 2. NAVIGATION TABS (middle) - Middle section with exact spacing and active/hover styles */}
      <div className="sidebar-nav-section">
        {sectionTitle && (
          <p className="sidebar-section-eyebrow">{sectionTitle}</p>
        )}
        <nav className="sidebar-nav-list" aria-label="Side Navigation">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = activeNav === item.id || activeNav === item.label;
            return (
              <button
                key={item.id || item.label}
                type="button"
                className={`sidebar-nav-button ${isActive ? 'active-nav-pill' : ''}`}
                onClick={() => handleItemClick(item)}
                aria-current={isActive ? 'page' : undefined}
                title={item.label}
              >
                {IconComponent && <IconComponent size={19} strokeWidth={2.2} className="sidebar-nav-icon" />}
                <span className="sidebar-nav-text">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* 3. PROFILE SECTION (bottom, pinned) - Technical Personnel profile with full-width divider above */}
      <div className="sidebar-bottom-profile">
        <div className="profile-badge-row" ref={profileMenuRef}>
          <div className="profile-avatar-circle" style={{ overflow: 'hidden' }}>
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt={displayName}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            ) : (
              <span className="profile-initials">{displayInitials}</span>
            )}
          </div>
          <div className="profile-text-group">
            <span className="profile-name-text" title={displayName}>
              {displayName}
            </span>
            <span className="profile-role-subtext" title={displayRole}>
              {displayRole}
            </span>
          </div>
          <div className="profile-menu-wrapper">
            <button
              type="button"
              className="profile-dots-trigger"
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              aria-label="Account options"
              title="Account options"
            >
              <MoreVertical size={16} />
            </button>

            {/* Profile Dropdown Menu - Exclusively displays Sign Out button */}
            {profileMenuOpen && (
              <div className="profile-dropdown-menu">
                <button
                  type="button"
                  className="dropdown-menu-item item-signout"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    setIsSignOutModalOpen(true);
                  }}
                >
                  <LogOut size={14} /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Global Standardized Sign Out Confirmation Modal */}
      <SignOutModal
        isOpen={isSignOutModalOpen}
        isLoading={isSigningOut}
        onCancel={() => setIsSignOutModalOpen(false)}
        onConfirm={async () => {
          setIsSigningOut(true);
          try {
            if (onSignOut) {
              await onSignOut();
            } else {
              try {
                await supabase.auth.signOut();
              } catch (err) {
                console.warn('Sign out error:', err);
              }
              window.location.hash = '';
            }
          } catch (err) {
            console.error('Sign out error:', err);
          } finally {
            setIsSigningOut(false);
            setIsSignOutModalOpen(false);
          }
        }}
      />
    </aside>
  );
}

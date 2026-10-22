import React, { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * TopBar Component
 * Exact UI replication from reference images:
 * - Image 1: Header bar background #B5D1BF across all screens, 64px height, subtle bottom border rgba(13, 43, 29, 0.12)
 * - Image 2: Notifications Bell icon button (38x38px, white #FFFFFF bg, 1px solid #C0C8C3 border, 8px radius, deep forest green #204C35 icon with dome + 2px gap + rim bar + clapper)
 * - Image 3: Settings & Privacy Gear icon button (38x38px, dark green #062512 bg, 8px radius, crisp white #FFFFFF 8-tooth mechanical cog)
 * - Spacing: 9px gap between buttons, 26px right margin, vertically centered
 */
export default function TopBar({
  activeNav = 'Dashboard',
  onSettingsClick,
  notifications = [
    {
      id: '1',
      reportId: 'LR-24',
      status: 'is Under Review',
      sub: 'PC-#14 • Monitor • Computer Center 3',
      time: 'Today, 10:40 AM',
      dotClass: 'dot-amber',
      unread: true,
    },
    {
      id: '2',
      reportId: 'LR-22',
      status: 'moved to Under Repair',
      sub: 'PC-#23 • Network/Internet • Computer Center 3',
      time: 'Oct 15, 2026',
      dotClass: 'dot-blue',
      unread: true,
    },
    {
      id: '3',
      reportId: 'LR-21',
      status: 'marked as Resolved',
      sub: 'PC-#03 • Computer Center 6',
      time: 'Oct 14, 2026',
      dotClass: 'dot-green',
      unread: false,
    },
  ],
}) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const popoverRef = useRef(null);

  // Close notifications popover on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setNotificationsOpen(false);
      }
    };
    if (notificationsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [notificationsOpen]);

  const handleSettings = () => {
    if (onSettingsClick) {
      onSettingsClick();
    } else {
      window.location.hash = '#settings';
    }
  };

  return (
    <header className="fixie-top-bar" aria-label="Screen Top Bar">
      <div className="top-bar-actions-cluster">
        {/* Notifications Icon Button (Image 2) */}
        <div className="top-bar-btn-wrapper" ref={popoverRef}>
          <button
            type="button"
            className="top-bar-icon-btn bell-btn"
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            aria-label="Notifications"
            title="Notifications"
          >
            {/* Bell Icon matching Image 2: dome + 2px gap + rim bar + clapper in #204C35 */}
            <svg
              className="top-bar-svg-icon bell-icon-svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              {/* Bell Dome */}
              <path
                d="M12 2.5C10.7 2.5 9.6 3.4 9.2 4.7C8.6 6.8 7.9 10.3 7 14H17C16.1 10.3 15.4 6.8 14.8 4.7C14.4 3.4 13.3 2.5 12 2.5Z"
                fill="#204C35"
              />
              {/* Horizontal Rim Bar with distinct 2px separation gap */}
              <rect
                x="4.8"
                y="15.8"
                width="14.4"
                height="2.2"
                rx="1.1"
                fill="#204C35"
              />
              {/* Clapper hanging below rim bar */}
              <path
                d="M10.2 18.6C10.2 19.9 11 21 12 21C13 21 13.8 19.9 13.8 18.6H10.2Z"
                fill="#204C35"
              />
            </svg>
          </button>

          {/* Notifications Popover Card */}
          {notificationsOpen && (
            <div className="notifications-popover-card">
              <div className="popover-header">
                <span className="popover-title">Recent Activity</span>
                <button
                  type="button"
                  className="popover-close-btn"
                  onClick={() => setNotificationsOpen(false)}
                  aria-label="Close notifications"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="popover-body">
                {notifications.map((item) => (
                  <div key={item.id} className={`popover-item ${item.unread ? 'unread' : ''}`}>
                    <div className={`item-dot ${item.dotClass}`} />
                    <div className="item-text">
                      <p className="item-headline">
                        <strong>{item.reportId}</strong> {item.status}
                      </p>
                      <p className="item-sub">{item.sub}</p>
                      <span className="item-time">{item.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Settings & Privacy Icon Button (Image 3) */}
        <button
          type="button"
          className={`top-bar-icon-btn settings-btn ${activeNav === 'Settings' ? 'active-top-settings' : ''}`}
          onClick={handleSettings}
          aria-label="Settings & Privacy"
          title="Settings & Privacy"
        >
          {/* Mechanical Cog Icon matching Image 3: 8-tooth gear with circular hole in #FFFFFF */}
          <svg
            className="top-bar-svg-icon gear-icon-svg"
            width="19"
            height="19"
            viewBox="0 0 24 24"
            fill="#FFFFFF"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"
            />
          </svg>
        </button>
      </div>
    </header>
  );
}

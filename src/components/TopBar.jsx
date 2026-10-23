import React, { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { subscribeToReportUpdates } from '../lib/realtimeSyncService';
import { supabase } from '../lib/supabase';

const MAX_NOTIFICATIONS = 15;

function formatNotifTime(iso) {
  try {
    const d = new Date(iso);
    const tz = { timeZone: 'Asia/Manila' };
    const time = d.toLocaleTimeString('en-US', { ...tz, hour: 'numeric', minute: '2-digit' });
    const dayKey = (x) => x.toLocaleDateString('en-US', tz);
    if (dayKey(d) === dayKey(new Date())) return `Today, ${time}`;
    return `${d.toLocaleDateString('en-US', { ...tz, month: 'short', day: 'numeric', year: 'numeric' })}, ${time}`;
  } catch {
    return '';
  }
}

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
  userProfile = null,
  notifications = [],
}) {
  const isStudent = userProfile?.role === 'student';
  const studentCode = isStudent ? userProfile?.student_id : null;
  const storageKey = `fixie_notifications_${isStudent ? `student_${studentCode || ''}` : 'staff'}`;

  const [notificationsList, setNotificationsList] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || 'null');
      if (Array.isArray(stored)) return stored;
    } catch {}
    return notifications;
  });
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const popoverRef = useRef(null);
  const studentUuidRef = useRef(null);
  const lastStatusRef = useRef(new Map());

  // Reload stored notifications if the signed-in student changes
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || 'null');
      setNotificationsList(Array.isArray(stored) ? stored : notifications);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // Persist notifications so they survive page refreshes
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(notificationsList.slice(0, MAX_NOTIFICATIONS)));
    } catch {}
  }, [notificationsList, storageKey]);

  // Resolve the student's database UUID so events keyed by UUID can be matched
  useEffect(() => {
    studentUuidRef.current = userProfile?.id || null;
    if (!studentCode || studentUuidRef.current) return;
    let cancelled = false;
    supabase
      .from('students')
      .select('id')
      .eq('student_id', studentCode)
      .limit(1)
      .then(({ data }) => {
        if (!cancelled && data && data[0]?.id) studentUuidRef.current = data[0].id;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [studentCode, userProfile?.id]);

  // Subscribe to real-time report activity
  useEffect(() => {
    const unsub = subscribeToReportUpdates((payload) => {
      if (!payload) return;
      // Only report rows; ignore student/guide/history/bookmark noise and the duplicate student-side table
      if (payload.isStudentChange || payload.isSavedGuidesUpdate || payload.isStatusHistoryChange) return;
      if (payload.table && payload.table !== 'reports') return;

      const eventType = payload.eventType || 'UPDATE';
      if (eventType === 'DELETE') return;

      const reportCode = payload.reportCode || payload.report_id || payload.reportId || payload.id;
      const newStatus = payload.newStatus || payload.status;
      if (!reportCode || !newStatus) return;

      const previousStatus = lastStatusRef.current.get(reportCode);
      lastStatusRef.current.set(reportCode, newStatus);

      let statusText;
      let dotClass;
      if (isStudent) {
        // Students: only status updates on their own reports
        if (eventType !== 'UPDATE') return;
        if (previousStatus === newStatus) return;

        const mine = new Set([studentCode, studentUuidRef.current, userProfile?.id].filter(Boolean));
        const candidates = [
          payload.student_id,
          payload.studentId,
          payload.student_uuid,
          payload.studentUuid,
          payload.students?.student_id,
          payload.new?.student_id,
        ].filter(Boolean);
        if (!candidates.some((c) => mine.has(c))) return;

        const s = String(newStatus).toLowerCase();
        if (s === 'resolved') { statusText = 'has been marked as Resolved'; dotClass = 'dot-green'; }
        else if (s === 'under repair') { statusText = 'moved to Under Repair'; dotClass = 'dot-blue'; }
        else if (s === 'on hold') { statusText = 'has been placed On Hold'; dotClass = 'dot-amber'; }
        else if (s === 'under review') { statusText = 'is now Under Review'; dotClass = 'dot-amber'; }
        else return;
      } else {
        // Technical personnel: only newly submitted reports
        if (eventType !== 'INSERT') return;
        const who = payload.student_name || payload.students?.name || payload.students?.full_name;
        statusText = who ? `was submitted by ${who}` : 'was submitted by a student';
        dotClass = 'dot-amber';
      }

      const subText = [
        payload.equipment,
        payload.unit_number || payload.unitNumber,
        payload.room || payload.computer_center,
      ]
        .filter(Boolean)
        .join(' • ');

      const nowIso = new Date().toISOString();
      setNotificationsList((prev) => {
        // Skip duplicates arriving through multiple realtime paths
        const dup = prev.some(
          (n) => n.reportId === reportCode && n.status === statusText && Date.now() - new Date(n.createdAt || 0).getTime() < 15000
        );
        if (dup) return prev;
        const newNotif = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          reportId: reportCode,
          status: statusText,
          sub: subText,
          createdAt: nowIso,
          time: formatNotifTime(nowIso),
          dotClass,
          unread: true,
        };
        return [newNotif, ...prev].slice(0, MAX_NOTIFICATIONS);
      });
    });

    return () => unsub();
  }, [isStudent, studentCode, userProfile?.id]);

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
            onClick={() => {
              const willOpen = !notificationsOpen;
              setNotificationsOpen(willOpen);
              if (willOpen) {
                // Mark all notifications as read upon opening
                setNotificationsList((prev) => prev.map((n) => ({ ...n, unread: false })));
              }
            }}
            aria-label="Notifications"
            title="Notifications"
            style={{ position: 'relative' }}
          >
            {notificationsList.some((n) => n.unread) && (
              <span
                style={{
                  position: 'absolute',
                  top: '5px',
                  right: '5px',
                  width: '8px',
                  height: '8px',
                  backgroundColor: '#D97706',
                  borderRadius: '50%',
                  border: '1.5px solid #FFFFFF',
                  pointerEvents: 'none'
                }}
              />
            )}
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
                {notificationsList.length === 0 && (
                  <p className="item-sub" style={{ padding: '16px', textAlign: 'center' }}>
                    No notifications yet.
                  </p>
                )}
                {notificationsList.map((item) => (
                  <div key={item.id} className={`popover-item ${item.unread ? 'unread' : ''}`}>
                    <div className={`item-dot ${item.dotClass}`} />
                    <div className="item-text">
                      <p className="item-headline">
                        <strong>{item.reportId}</strong> {item.status}
                      </p>
                      {item.sub && <p className="item-sub">{item.sub}</p>}
                      <span className="item-time">{item.createdAt ? formatNotifTime(item.createdAt) : item.time}</span>
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

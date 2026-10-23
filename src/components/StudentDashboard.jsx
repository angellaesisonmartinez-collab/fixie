import { useState, useEffect, useMemo } from 'react';
import {
  LayoutGrid,
  FilePenLine,
  FileText,
  Megaphone,
  MoreVertical,
  Bell,
  Settings,
  BookOpen,
  FileCheck,
  User,
  X,
  Menu,
  LogOut,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { supabase, safeRealtimeChannel, safeRemoveChannel } from '../lib/supabase';
import { registerVisibilityAndOnlineSync, subscribeToStudentUpdates } from '../lib/realtimeSyncService';
import fixieLogo from '../assets/fixie-logo.svg';
import angelAvatar from '../assets/avatars/angel.png';
import { getStudentAvatar } from '../lib/studentAvatarUtils';
import ReportsPage from './ReportsPage';
import StudentSubmittedReportsPage from './StudentSubmittedReportsPage';
import GuidesPage from './GuidesPage';
import StudentGuidesPage from './StudentGuidesPage';
import SettingsPrivacyPage from './SettingsPrivacyPage';
import ReportDetailsModal from './ReportDetailsModal';
import ReportProblemModal from './ReportProblemModal';
import SubmitReportPage from './SubmitReportPage';
import HeaderRings from './HeaderRings';
import Banner from './Banner';
import AppLayout from './AppLayout';
import ErrorBoundary from './ErrorBoundary';
import { formatStudentName, formatYearBlock } from '../lib/studentFormatUtils';
import { parseReportDateTime } from '../lib/reportDateUtils';
import { AUTHENTIC_REPORT_STUDENTS } from '../lib/reportStudentMapping';
import { getReportAttachment } from '../lib/reportAttachmentUtils';
import {
  useStudentReports,
  normalizeStudentReportItem,
} from '../lib/studentReportsService';

// Shared student report normalization
const normalizeReportItem = (item) => normalizeStudentReportItem(item);

export default function StudentDashboard({
  currentUser,
  userProfile,
  onSignOut,
  onAccountDisabled,
  initialNav = 'Dashboard',
}) {
  const [activeNav, setActiveNav] = useState(initialNav);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [isReportProblemModalOpen, setIsReportProblemModalOpen] = useState(false);

  const handleFinalSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Student sign out error:', err);
    }
    try {
      sessionStorage.removeItem('fixie_authenticated_student');
      localStorage.removeItem('fixie_authenticated_student');
    } catch { }
    setActiveStudent(null);
    if (onSignOut) {
      onSignOut();
    } else {
      window.location.hash = '';
    }
  };


  // Default fallback student profile (matching design mockup: Angel Lae Martinez, BSIT 3-2)
  const DEFAULT_STUDENT = {
    id: '9002d8e6-bc03-4070-8aae-299147dead9a',
    username: '24-0041-147',
    student_id: '24-0041-147',
    name: 'Angel Lae Martinez',
    full_name: 'Angel Lae Martinez',
    first_name: 'Angel Lae',
    last_name: 'Martinez',
    year_block: 'BSIT 3-2',
    email: 'martinezangellaewup@gmail.com',
    role: 'student',
    avatar: angelAvatar,
  };

  // Authenticated Student profile state
  const [activeStudent, setActiveStudent] = useState(() => {
    // 1. Check if session storage has authenticated student
    try {
      const stored = sessionStorage.getItem('fixie_authenticated_student');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && (parsed.student_id || parsed.email)) return parsed;
      }
    } catch { }
    // 2. If userProfile was passed from login (not the preview-student default), use it
    if (userProfile && userProfile.id !== 'preview-student' && userProfile.role === 'student') {
      return userProfile;
    }
    if (userProfile && (userProfile.student_id || userProfile.email)) {
      return userProfile;
    }
    return DEFAULT_STUDENT;
  });

  // Ensure any contaminated global reports cache is purged from localStorage
  useEffect(() => {
    try {
      localStorage.removeItem('fixie_student_reports');
    } catch {}
  }, []);

  // Keep activeStudent in sync if parent passes updated userProfile
  useEffect(() => {
    if (userProfile && (userProfile.student_id || userProfile.id)) {
      if (userProfile.student_id !== activeStudent?.student_id || userProfile.id !== activeStudent?.id) {
        setActiveStudent(userProfile);
      }
    }
  }, [userProfile]);

  // Resolve authentic student record directly from Supabase students table
  useEffect(() => {
    let isMounted = true;

    async function loadStudentProfile() {
      try {
        let identifier = null;

        // 1. Check sessionStorage
        try {
          const stored = sessionStorage.getItem('fixie_authenticated_student');
          if (stored) {
            const parsed = JSON.parse(stored);
            identifier = parsed?.student_id || parsed?.email;
          }
        } catch { }

        // 2. If not found, check activeStudent or userProfile (non-preview)
        if (!identifier && activeStudent?.id !== 'preview-student') {
          identifier = activeStudent?.student_id || activeStudent?.email;
        }
        if (!identifier && userProfile?.id !== 'preview-student') {
          identifier = userProfile?.student_id || userProfile?.email;
        }

        // 3. Fallback to passed userProfile identifier if present
        if (!identifier && userProfile) {
          identifier = userProfile.student_id || userProfile.email;
        }

        // Avoid redundant network query if activeStudent is already complete from login or storage
        const isAlreadyComplete =
          activeStudent?.student_id &&
          activeStudent?.email &&
          (activeStudent?.name || activeStudent?.full_name) &&
          activeStudent?.id !== 'preview-student' &&
          activeStudent?.id !== DEFAULT_STUDENT.id;

        if (isAlreadyComplete) {
          return;
        }

        if (identifier) {
          const { data: dbStudent, error } = await supabase
            .from('students')
            .select('*')
            .or(`student_id.eq.${identifier},email.eq.${identifier}`)
            .maybeSingle();

          if (!error && dbStudent && isMounted) {
            const resolved = {
              id: dbStudent.id,
              username: dbStudent.student_id,
              student_id: dbStudent.student_id,
              name: dbStudent.name,
              full_name: dbStudent.name || `${dbStudent.first_name || ''} ${dbStudent.last_name || ''}`.trim(),
              first_name: dbStudent.first_name,
              middle_name: dbStudent.middle_name,
              last_name: dbStudent.last_name,
              year_block: dbStudent.year_block,
              email: dbStudent.email,
              date_registered: dbStudent.date_registered || dbStudent.created_at,
              email_last_updated: dbStudent.email_last_updated,
              role: 'student',
              status: dbStudent.status,
              profile_photo: dbStudent.profile_photo,
              avatar: getStudentAvatar(dbStudent),
            };

            const hasChanged =
              activeStudent?.id !== resolved.id ||
              activeStudent?.name !== resolved.name ||
              activeStudent?.email !== resolved.email ||
              activeStudent?.year_block !== resolved.year_block ||
              activeStudent?.status !== resolved.status ||
              activeStudent?.profile_photo !== resolved.profile_photo;

            if (hasChanged) {
              setActiveStudent(resolved);
            }
            try {
              sessionStorage.setItem('fixie_authenticated_student', JSON.stringify(resolved));
            } catch { }
          }
        }
      } catch (err) {
        console.warn('Note on resolving student profile:', err);
      }
    }

    loadStudentProfile();
    return () => {
      isMounted = false;
    };
  }, [userProfile?.student_id, userProfile?.email]);

  // Live real-time student profile synchronization via centralized realtimeSyncService
  useEffect(() => {
    const unsub = subscribeToStudentUpdates((payload) => {
      if (!payload) return;
      const targetId = payload.student_id || payload.id;
      const curId = activeStudent?.student_id || activeStudent?.id;
      if (!targetId || targetId === curId) {
        const raw = payload.student || payload.new || payload;
        setActiveStudent((prev) => {
          if (!prev) return prev;
          const updated = {
            ...prev,
            ...raw,
            name: raw.name || prev.name,
            full_name: raw.name || `${raw.first_name || prev.first_name || ''} ${raw.last_name || prev.last_name || ''}`.trim(),
            year_block: raw.year_block ? formatYearBlock(raw.year_block) : prev.year_block,
            email: raw.email || prev.email,
            email_last_updated: raw.email_last_updated || prev.email_last_updated,
          };
          try {
            sessionStorage.setItem('fixie_authenticated_student', JSON.stringify(updated));
          } catch {}
          return updated;
        });
      }
    });

    const handleWindowProfileUpdate = (e) => {
      const detail = e.detail;
      const curId = activeStudent?.student_id || activeStudent?.id;
      if (detail && (!detail.student_id || detail.student_id === curId)) {
        setActiveStudent((prev) => {
          if (!prev) return prev;
          const updated = {
            ...prev,
            year_block: detail.year_block ? formatYearBlock(detail.year_block) : prev.year_block,
            email: detail.email || prev.email,
            email_last_updated: detail.email_last_updated || prev.email_last_updated,
          };
          try {
            sessionStorage.setItem('fixie_authenticated_student', JSON.stringify(updated));
          } catch {}
          return updated;
        });
      }
    };

    window.addEventListener('fixie_student_profile_updated', handleWindowProfileUpdate);

    return () => {
      unsub();
      window.removeEventListener('fixie_student_profile_updated', handleWindowProfileUpdate);
    };
  }, [activeStudent?.student_id, activeStudent?.id]);

  // Memoized student profile metadata to prevent downstream re-renders and re-fetches
  const studentProfile = useMemo(() => {
    return {
      id: activeStudent?.id || DEFAULT_STUDENT.id,
      full_name: activeStudent?.full_name || activeStudent?.name || DEFAULT_STUDENT.full_name,
      first_name: activeStudent?.first_name || '',
      middle_name: activeStudent?.middle_name || '',
      last_name: activeStudent?.last_name || '',
      year_block: activeStudent?.year_block
        ? formatYearBlock(activeStudent.year_block)
        : (activeStudent?.student_id === '24-0041-147' ? '3rd year, BLK 2' : (DEFAULT_STUDENT.year_block || 'N/A')),
      student_id: activeStudent?.student_id || DEFAULT_STUDENT.student_id,
      email: activeStudent?.email || currentUser?.email || DEFAULT_STUDENT.email,
      date_registered: activeStudent?.date_registered || activeStudent?.created_at || null,
      email_last_updated: activeStudent?.email_last_updated || null,
      role: 'student',
      status: activeStudent?.status || 'active',
      profile_photo: activeStudent?.profile_photo || null,
      avatar: getStudentAvatar(activeStudent) || angelAvatar,
      isLoading: false,
    };
  }, [activeStudent, currentUser?.email]);

  // Shared authentic reports and statistics from Supabase (with instant cache)
  const studentReportsData = useStudentReports(studentProfile);
  const {
    reports: allReports = [],
    activeReports = [],
    recentReports = [],
    stats = {},
    refetch: refetchReports,
  } = studentReportsData;

  const activeReportsCount = stats.activeReportsCount ?? 0;
  const resolvedCount = stats.resolvedCount ?? 0;
  const savedGuidesCount = stats.savedGuidesCount ?? 0;

  // Instant Active Session Revocation (Phase 2 Section 3.5 & Acceptance Checklist #7)
  useEffect(() => {
    const studentId = studentProfile.student_id;
    if (!studentId) return;

    const revokeSession = () => {
      const disabledMsg = 'Your account has been disabled because you have already graduated or transferred.';
      if (onAccountDisabled) {
        onAccountDisabled(disabledMsg);
      } else if (onSignOut) {
        alert(disabledMsg);
        onSignOut();
      }
    };

    // 1. Initial status verification on mount (only if status is disabled/deactivated)
    if (studentProfile.status === 'disabled' || studentProfile.status === 'deactivated') {
      revokeSession();
      return;
    }

    // 2. Realtime channel subscription for instant revocation if Technical Personnel disables account
    let accountChannel = null;
    try {
      accountChannel = safeRealtimeChannel(`student_session_guard_${studentId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'students',
            filter: `student_id=eq.${studentId}`,
          },
          (payload) => {
            if (payload.new && (payload.new.status === 'disabled' || payload.new.status === 'deactivated')) {
              revokeSession();
            }
          }
        )
        .subscribe();
    } catch (chanErr) {
      console.warn('Student session guard subscription note:', chanErr);
    }

    // 3. Local/Cross-tab window event listener for instant response
    const handleStatusEvent = (e) => {
      if (e.detail?.studentId === studentId && (e.detail?.status === 'disabled' || e.detail?.status === 'deactivated')) {
        revokeSession();
      }
    };
    window.addEventListener('fixie_student_status_changed', handleStatusEvent);

    return () => {
      safeRemoveChannel(accountChannel);
      window.removeEventListener('fixie_student_status_changed', handleStatusEvent);
    };
  }, [studentProfile.student_id, onAccountDisabled, onSignOut]);

  // Tab visibility and network reconnect refetching for Student Dashboard
  useEffect(() => {
    return registerVisibilityAndOnlineSync(() => {
      if (refetchReports) refetchReports();
    });
  }, [refetchReports]);

  // Status filter state for navigating into My Reports
  const [reportsFilter, setReportsFilter] = useState('ALL');

  const navigateToReports = (filter = 'ALL') => {
    setReportsFilter(filter);
    setActiveNav('My Reports');
    window.location.hash = '#my-reports';
  };

  // Sync activeNav with URL hash changes
  useEffect(() => {
    const syncNavWithHash = () => {
      const rawHash = window.location.hash || '';
      const hash = decodeURIComponent(rawHash).toLowerCase().trim();
      if (hash === '#report-problem' || hash === '#report-a-problem') {
        setActiveNav('Report a Problem');
      } else if (
        hash === '#reports' ||
        hash === '#my-reports' ||
        hash === '#my reports' ||
        hash === '#student-reports' ||
        hash === '#submitted-reports'
      ) {
        setActiveNav('My Reports');
      } else if (
        hash === '#guides' ||
        hash === '#laboratory-guides' ||
        hash === '#lab-guides' ||
        hash === '#student-guides' ||
        hash === '#student-lab-guides' ||
        hash === '#student-laboratory-guides' ||
        hash === '#student-resources' ||
        hash === '#student-guide-modal' ||
        hash === '#guide-modal'
      ) {
        setActiveNav('Laboratory Guides');
      } else if (
        hash === '#settings' ||
        hash === '#settings-privacy' ||
        hash === '#account' ||
        hash === '#student-settings' ||
        hash === '#student-privacy' ||
        hash === '#student-account-settings'
      ) {
        setActiveNav('Settings');
      } else if (
        hash === '#dashboard' ||
        hash === '#student' ||
        hash === '#student-dashboard' ||
        hash === ''
      ) {
        setActiveNav('Dashboard');
      }
    };

    syncNavWithHash();
    window.addEventListener('hashchange', syncNavWithHash);
    return () => window.removeEventListener('hashchange', syncNavWithHash);
  }, []);

  const navItems = [
    { id: 'Dashboard', label: 'Dashboard', icon: LayoutGrid },
    { id: 'Report a Problem', label: 'Report a Problem', icon: FilePenLine },
    { id: 'My Reports', label: 'My Reports', icon: FileText },
    { id: 'Laboratory Guides', label: 'Laboratory Guides', icon: Megaphone },
  ];

  const handleNavClick = (navId) => {
    setActiveNav(navId);
    setMobileMenuOpen(false);
    if (navId === 'Report a Problem') {
      window.location.hash = '#report-problem';
    } else if (navId === 'Dashboard') {
      window.location.hash = '#student-dashboard';
    } else if (navId === 'My Reports') {
      window.location.hash = '#my-reports';
    } else if (navId === 'Laboratory Guides') {
      window.location.hash = '#student-guides';
    }
  };

  return (
    <AppLayout
      navItems={navItems}
      activeNav={activeNav}
      onNavClick={(item) => handleNavClick(item.id)}
      sectionTitle="LABORATORY OPERATIONS"
      userProfile={{
        full_name: studentProfile.full_name,
        role: 'student',
        year_block: studentProfile.year_block,
        student_id: studentProfile.student_id,
        email: studentProfile.email,
        avatar: studentProfile.avatar || getStudentAvatar(studentProfile),
        isLoading: studentProfile.isLoading,
      }}
      onSignOut={handleFinalSignOut}
      onSettingsClick={() => {
        setActiveNav('Settings');
        window.location.hash = '#student-settings';
      }}
    >

      {/* Sub-page router or Default Student Dashboard */}
      <ErrorBoundary>
        {activeNav === 'Report a Problem' ? (
          <SubmitReportPage
            studentProfile={studentProfile}
            onReportSubmitted={(newRep, viewDetails) => {
              if (refetchReports) refetchReports();
              if (viewDetails) {
                setActiveNav('My Reports');
                setSelectedReport(normalizeReportItem(newRep));
                window.location.hash = '#reports';
              }
            }}
          />
        ) : activeNav === 'My Reports' ? (
          <StudentSubmittedReportsPage
            studentProfile={studentProfile}
            studentReportsData={studentReportsData}
            initialFilter={reportsFilter}
            onReportProblem={() => {
              setActiveNav('Report a Problem');
              window.location.hash = '#report-problem';
            }}
            onSelectReport={(rep) => setSelectedReport(rep)}
          />
        ) : activeNav === 'Laboratory Guides' ? (
          <StudentGuidesPage
            studentProfile={studentProfile}
            currentUser={currentUser}
          />
        ) : activeNav === 'Settings' ? (
          <SettingsPrivacyPage
            currentUser={currentUser || { id: 'student-id', email: studentProfile.email }}
            userProfile={userProfile || studentProfile}
          />
        ) : (
          <div className="dashboard-content-layout student-dashboard-content-layout">
            {/* HERO WELCOME BANNER CARD - Matching Technical Personnel Students page Header */}
            <Banner
              title="Welcome to Fixie!"
              subtitle="Your space to report laboratory issues, track updates, and access helpful guides."
              className="student-welcome-banner"
              ariaLabel="Student Welcome Header"
            />

            {/* 3 STAT METRIC CARDS ROW - Exact match to Technical Personnel Students page cards & Mockup */}
            <section className="student-metric-cards-row" aria-label="Student Overview Metrics">
              {/* Card 1: ACTIVE REPORTS (Under Review + Under Repair) */}
              <div
                className="student-metric-card cursor-pointer"
                onClick={() => navigateToReports('ACTIVE')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigateToReports('ACTIVE');
                  }
                }}
                role="button"
                tabIndex={0}
                title="Filter by Active Reports"
              >
                <div className="stat-card-header">
                  <span className="stat-card-title-serif">ACTIVE REPORTS</span>
                  <div className="student-metric-icon-box" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <polygon points="12 2, 22 12, 12 22, 2 12" fill="#0D2B1D" />
                      <line x1="12" y1="7.5" x2="12" y2="12.5" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" />
                      <circle cx="12" cy="16" r="1.2" fill="#FFFFFF" />
                    </svg>
                  </div>
                </div>
                <div className="stat-card-value-display">
                  <span className="stat-number-serif">
                    {studentReportsData.isLoading && allReports.length === 0 ? '...' : activeReportsCount}
                  </span>
                </div>
                <p className="stat-card-caption">
                  Reports still being reviewed or repaired.
                </p>
              </div>

              {/* Card 2: RESOLVED THIS MONTH (Total resolved reports across all dates) */}
              <div
                className="student-metric-card stat-card-resolved-border cursor-pointer"
                onClick={() => navigateToReports('RESOLVED')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigateToReports('RESOLVED');
                  }
                }}
                role="button"
                tabIndex={0}
                title="Filter by Resolved Reports"
              >
                <div className="stat-card-header">
                  <span className="stat-card-title-serif">RESOLVED</span>
                  <div className="student-metric-icon-box" aria-hidden="true">
                    <FileCheck size={18} strokeWidth={2.2} color="#0D2B1D" />
                  </div>
                </div>
                <div className="stat-card-value-display">
                  <span className="stat-number-serif">
                    {studentReportsData.isLoading && allReports.length === 0 ? '...' : resolvedCount}
                  </span>
                </div>
                <p className="stat-card-caption">
                  Reports fixed by technical personnel.
                </p>
              </div>

              {/* Card 3: SAVED GUIDES */}
              <div
                className="student-metric-card cursor-pointer"
                onClick={() => {
                  setActiveNav('Laboratory Guides');
                  window.location.hash = '#student-guides';
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActiveNav('Laboratory Guides');
                    window.location.hash = '#student-guides';
                  }
                }}
                role="button"
                tabIndex={0}
                title="View bookmarked guides"
              >
                <div className="stat-card-header">
                  <span className="stat-card-title-serif">SAVED GUIDES</span>
                  <div className="student-metric-icon-box" aria-hidden="true">
                    <BookOpen size={18} strokeWidth={2.2} color="#0D2B1D" />
                  </div>
                </div>
                <div className="stat-card-value-display">
                  <span className="stat-number-serif">
                    {studentReportsData.isLoading && allReports.length === 0 ? '...' : savedGuidesCount}
                  </span>
                </div>
                <p className="stat-card-caption">
                  Your bookmarked laboratory guides.
                </p>
              </div>
            </section>

            {/* RECENT REPORTS TABLE SECTION - Visual match to Technical Personnel Reports table & User screenshot */}
            <section className="dashboard-recent-reports-card" aria-label="Recent Laboratory Reports">
              {/* Card Header */}
              <div className="recent-reports-card-header">
                <h2 className="recent-reports-main-title">Recent Reports</h2>
                <p className="recent-reports-sub-title">
                  Latest 5 laboratory equipment and facility reports.
                </p>
              </div>

              {/* Responsive Table Scroll Frame */}
              <div className="recent-reports-table-scroll-frame">
                <table className="recent-reports-data-table">
                  <thead>
                    <tr className="reports-table-heading-row">
                      <th scope="col" className="th-id">ID</th>
                      <th scope="col" className="th-equipment">EQUIPMENT</th>
                      <th scope="col" className="th-location">COMPUTER CENTER &amp; ROOM</th>
                      <th scope="col" className="th-submitted">DATE &amp; TIME SUBMITTED</th>
                      <th scope="col" className="th-status">STATUS</th>
                      <th scope="col" className="th-action"><span className="sr-only">Action</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentReportsData.isLoading && recentReports.length === 0 ? (
                      [1, 2, 3].map((idx) => (
                        <tr key={`loading-row-${idx}`} className="reports-table-data-row loading-skeleton-row">
                          <td className="cell-id">
                            <div className="skeleton-line skeleton-badge" />
                          </td>
                          <td className="cell-equipment">
                            <div className="cell-stack-block">
                              <div className="skeleton-line skeleton-title" />
                              <div className="skeleton-line skeleton-sub" />
                            </div>
                          </td>
                          <td className="cell-location">
                            <div className="cell-stack-block">
                              <div className="skeleton-line skeleton-title" />
                              <div className="skeleton-line skeleton-sub" />
                            </div>
                          </td>
                          <td className="cell-submitted">
                            <div className="cell-stack-block">
                              <div className="skeleton-line skeleton-title" />
                              <div className="skeleton-line skeleton-sub" />
                            </div>
                          </td>
                          <td className="cell-status">
                            <div className="skeleton-line skeleton-pill" />
                          </td>
                          <td className="cell-action">
                            <div className="skeleton-line skeleton-btn" />
                          </td>
                        </tr>
                      ))
                    ) : recentReports.length === 0 ? (
                      <tr className="reports-table-data-row">
                        <td colSpan={6} style={{ textAlign: 'center', padding: '36px 16px', color: '#6b7280', fontSize: '13px' }}>
                          No recent reports submitted yet.
                        </td>
                      </tr>
                    ) : (
                      recentReports.map((report) => (
                        <tr key={report.id || report.report_id} className="reports-table-data-row">
                          {/* Column 1: ID Badge */}
                          <td className="cell-id">
                            <span className="report-id-pill-badge">{report.id || report.report_id}</span>
                          </td>

                          {/* Column 2: Equipment (Unit Number & Type) */}
                          <td className="cell-equipment">
                            <div className="cell-stack-block">
                              <span className="cell-main-text">{report.unitNumber || report.unit_number}</span>
                              <span className="cell-sub-text">{report.equipment}</span>
                            </div>
                          </td>

                          {/* Column 3: Computer Center & Room */}
                          <td className="cell-location">
                            <div className="cell-stack-block">
                              <span className="cell-main-text">{report.locationCenter || report.location_center}</span>
                              <span className="cell-sub-text">{report.locationRoom || report.location_room}</span>
                            </div>
                          </td>

                          {/* Column 4: Date & Time Submitted */}
                          <td className="cell-submitted">
                            <div className="cell-stack-block">
                              <span className="cell-main-text">{report.submittedDate || report.submitted_date}</span>
                              <span className="cell-sub-text">{report.submittedTime || report.submitted_time}</span>
                            </div>
                          </td>

                          {/* Column 5: Status Capsule Badge */}
                          <td className="cell-status">
                            <span className={`status-pill-capsule ${report.statusClass || report.status_class}`}>
                              {report.displayStatus || report.display_status}
                            </span>
                          </td>

                          {/* Column 6: View Action Button */}
                          <td className="cell-action">
                            <button
                              type="button"
                              className="btn-view-serif"
                              onClick={() => setSelectedReport(report)}
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Footer Banner */}
              <div className="reports-table-footer-banner">
                <span className="reports-table-footer-mono">
                  Showing <strong>{recentReports.length}</strong> recent reports
                </span>
              </div>
            </section>
          </div>
        )}
      </ErrorBoundary>

      {/* Report Details Modal */}
      {selectedReport && (
        <ReportDetailsModal
          report={selectedReport}
          isStudent={true}
          studentProfile={activeStudent || userProfile || currentUser}
          onClose={() => setSelectedReport(null)}
          onUpdateStatus={async (reportId, newStatus, updatedHistory, newRemarks) => {
            const targetId = reportId || selectedReport.report_id || selectedReport.id;

            setSelectedReport((prev) => {
              if (!prev) return null;
              return normalizeReportItem({
                ...prev,
                status: newStatus,
                remarks: newRemarks !== undefined ? newRemarks : prev.remarks,
                history: updatedHistory || prev.history,
                updated_at: new Date().toISOString(),
              });
            });

            // Sync to Supabase reports_of_student table
            try {
              const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId);
              const updatePayload = {
                status: newStatus,
                remarks: newRemarks || null,
                updated_at: new Date().toISOString(),
              };
              if (isUuid) {
                await supabase.from('reports_of_student').update(updatePayload).eq('id', targetId);
              } else {
                await supabase.from('reports_of_student').update(updatePayload).eq('report_id', targetId);
              }
            } catch (syncErr) {
              console.warn('Sync note on reports_of_student update:', syncErr);
            }

            if (refetchReports) refetchReports();

            // Dispatch global event so any other open component updates immediately
            window.dispatchEvent(
              new CustomEvent('fixie_report_status_updated', {
                detail: { reportId: targetId, newStatus, newRemarks },
              })
            );
          }}
        />
      )}

      {/* Screen 6: Report a Problem Flow & Summary Modal */}
      <ReportProblemModal
        isOpen={isReportProblemModalOpen}
        onClose={() => setIsReportProblemModalOpen(false)}
        studentProfile={studentProfile}
        onReportSubmitted={(newRep, viewDetails) => {
          if (refetchReports) refetchReports();
          if (viewDetails) {
            setActiveNav('My Reports');
            setSelectedReport(normalizeReportItem(newRep));
          }
        }}
      />
    </AppLayout>
  );
}

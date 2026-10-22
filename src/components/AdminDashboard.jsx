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
  Check,
  Clock,
  Wrench,
  CheckCircle2,
  Menu,
  LogOut
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import fixieLogo from '../assets/fixie-logo.svg';
import angelAvatar from '../assets/avatars/angel.png';
import jennelynAvatar from '../assets/avatars/jennelyn.png';
import reynAvatar from '../assets/avatars/reyn.png';
import juanAvatar from '../assets/avatars/juan.png';
import mariaAvatar from '../assets/avatars/maria.png';
import mariaOrtizAvatar from '../assets/avatars/maria_ortiz.png';
import phiaAvatar from '../assets/avatars/phia.png';
import StudentsPage from './StudentsPage';
import ReportsPage from './ReportsPage';
import GuidesPage from './GuidesPage';
import SettingsPrivacyPage from './SettingsPrivacyPage';
import ReportDetailsModal from './ReportDetailsModal';
import HeaderRings from './HeaderRings';
import AppLayout from './AppLayout';
import DashboardContent from './DashboardContent';
import ErrorBoundary from './ErrorBoundary';
import {
  DashboardTabIcon,
  StudentsTabIcon,
  ReportsTabIcon,
  GuidesTabIcon,
} from './TechNavIcons';
import { formatStudentName, formatYearBlock } from '../lib/studentFormatUtils';
import { getReportAttachment } from '../lib/reportAttachmentUtils';
import { resolveAuthenticReportStudent } from '../lib/reportStudentMapping';
import {
  fetchAdminDashboardData,
  getCachedAdminDashboardData,
  clearAdminDashboardCache,
  formatAdminDashboardReport,
  isReportOnHold,
} from '../lib/adminDashboardService';
import {
  subscribeToReportUpdates,
  subscribeToStudentUpdates,
  subscribeToGuideUpdates,
  registerVisibilityAndOnlineSync,
} from '../lib/realtimeSyncService';

// Fallback avatar lookup for known students
const avatarMap = {
  '24-0041-147': angelAvatar,
  'angellae@gmail.com': angelAvatar,
  'Angel Lae Martinez': angelAvatar,
  'Angel Lae S. Martinez': angelAvatar,
  '24-2026-340': jennelynAvatar,
  'jennelyn@gmail.com': jennelynAvatar,
  'Jennelyn Vergara': jennelynAvatar,
  '24-7345-853': reynAvatar,
  'reyn.arahan@gmail.com': reynAvatar,
  'Reyn Arahan': reynAvatar,
  '24-0031-267': juanAvatar,
  'juan.delacruz@gmail.com': juanAvatar,
  'Juan Dela Cruz': juanAvatar,
  '24-8521-063': mariaAvatar,
  'maria.reyes@gmail.com': mariaAvatar,
  'Maria Reyes': mariaAvatar,
  '24-0872-090': mariaOrtizAvatar,
  'maria.ortiz@gmail.com': mariaOrtizAvatar,
  'Maria Ortiz': mariaOrtizAvatar,
  '24-4011-088': phiaAvatar,
  'phia.cayetano@gmail.com': phiaAvatar,
  'Phia Cayetano': phiaAvatar,
};

export default function AdminDashboard({ currentUser, userProfile, onSignOut, initialNav = 'Dashboard' }) {
  const [activeNav, setActiveNav] = useState(initialNav);
  const [reportsFilter, setReportsFilter] = useState(() => {
    if (
      typeof window !== 'undefined' &&
      (window.location.hash === '#reports-on-hold' ||
        window.location.hash === '#reports/on-hold' ||
        window.location.hash === '#on-hold')
    ) {
      return 'ON_HOLD';
    }
    return 'ALL';
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  const handleFinalSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Admin sign out error:', err);
    }
    try {
      sessionStorage.removeItem('fixie_authenticated_tech');
    } catch {}
    clearAdminDashboardCache();
    if (onSignOut) {
      onSignOut();
    } else {
      window.location.hash = '';
    }
  };

  // Sync activeNav with URL hash changes
  useEffect(() => {
    const syncNavWithHash = () => {
      const hash = window.location.hash;
      if (
        hash === '#students' ||
        hash === '#registered-students' ||
        hash === '#register-student' ||
        hash === '#register' ||
        hash.startsWith('#students')
      ) {
        setActiveNav('Students');
        setSidebarMode('admin');
      } else if (
        hash === '#reports' ||
        hash === '#reports-management' ||
        hash.startsWith('#reports') ||
        hash === '#on-hold'
      ) {
        setActiveNav('Reports');
        if (hash === '#reports-on-hold' || hash === '#reports/on-hold' || hash === '#on-hold') {
          setReportsFilter('ON_HOLD');
        } else {
          setReportsFilter('ALL');
        }
      } else if (
        hash === '#guides' ||
        hash === '#laboratory-guides' ||
        hash === '#lab-guides' ||
        hash.startsWith('#guides')
      ) {
        setActiveNav('Laboratory Guides');
      } else if (
        hash === '#settings' ||
        hash === '#settings-privacy' ||
        hash === '#privacy' ||
        hash === '#account-settings'
      ) {
        setActiveNav('Settings');
      } else if (
        hash === '#dashboard' ||
        hash === '#admin' ||
        hash === '#admin-dashboard' ||
        hash === '#overview' ||
        hash === ''
      ) {
        setActiveNav('Dashboard');
      }
    };

    syncNavWithHash();
    window.addEventListener('hashchange', syncNavWithHash);
    return () => window.removeEventListener('hashchange', syncNavWithHash);
  }, []);

  // Update activeNav if initialNav prop changes
  useEffect(() => {
    if (initialNav) {
      setActiveNav(initialNav);
    }
  }, [initialNav]);

  // Live stat metrics & recent reports - initialized strictly from cache or null loading state
  const initialData = getCachedAdminDashboardData();
  const [allReports, setAllReports] = useState(initialData?.reports || null);
  const [totalStudents, setTotalStudents] = useState(initialData?.totalStudents ?? initialData?.stats?.totalStudents ?? null);
  const [totalGuides, setTotalGuides] = useState(initialData?.totalGuides ?? initialData?.stats?.totalGuides ?? null);
  const [isLoading, setIsLoading] = useState(!initialData?.reports);

  // Compute stat card numbers strictly from ONE single source of truth (allReports)
  const stats = useMemo(() => {
    if (!allReports) return null;
    const totalReports = allReports.length;
    const onHoldReports = allReports.filter((r) => isReportOnHold(r)).length;
    const resolvedThisMonth = allReports.filter((r) => r.status === 'Resolved' || (r.displayStatus || '').toUpperCase() === 'RESOLVED').length;

    return {
      totalStudents: totalStudents ?? 0,
      totalReports,
      totalGuides: totalGuides ?? 0,
      onHoldReports,
      resolvedThisMonth,
    };
  }, [allReports, totalStudents, totalGuides]);

  // Derive 5 recent reports from the exact same reports state
  const recentReports = useMemo(() => {
    if (!allReports) return [];
    return allReports.slice(0, 5);
  }, [allReports]);

  // Fetch live reports and stats from Supabase (single source of truth)
  useEffect(() => {
    let isMounted = true;

    async function fetchDashboardData(forceRefresh = false) {
      try {
        const data = await fetchAdminDashboardData(forceRefresh);
        if (isMounted && data) {
          setAllReports(data.reports);
          setTotalStudents(data.totalStudents);
          setTotalGuides(data.totalGuides);
          setIsLoading(false);
        }
      } catch (err) {
        console.warn('Dashboard live sync note:', err?.message || err);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchDashboardData();

    // Direct local state updater for instant UI reaction (zero lag, safe incremental updates)
    const handleReportLiveUpdate = (payload) => {
      if (!isMounted || !payload) return;
      const targetId = payload.report_id || payload.id || payload.reportId;
      const eventType = payload.eventType || (payload.report ? 'INSERT' : 'UPDATE');
      const newStatus = payload.newStatus || payload.status;
      const newRemarks = payload.remarks !== undefined ? payload.remarks : payload.newRemarks;

      setAllReports((prev) => {
        if (!prev) return prev;

        if (eventType === 'DELETE') {
          return prev.filter(
            (r) => r.id !== targetId && r.report_id !== targetId && r.canonicalUuid !== targetId
          );
        }

        if (eventType === 'INSERT') {
          const rawReport = payload.report || payload.new || payload;
          const formatted = formatAdminDashboardReport(rawReport);
          if (!formatted) return prev;

          // Check if report already exists in list (avoid duplicate)
          const exists = prev.some(
            (r) =>
              r.id === formatted.id ||
              r.report_id === formatted.report_id ||
              (rawReport.id && r.id === rawReport.id) ||
              (rawReport.report_id && r.report_id === rawReport.report_id)
          );
          if (exists) {
            // Update in place if newer
            return prev.map((r) =>
              r.id === formatted.id || r.report_id === formatted.report_id ? { ...r, ...formatted } : r
            );
          }
          return [formatted, ...prev];
        }

        // UPDATE: replace item by ID in place safely
        let matched = false;
        const updated = prev.map((r) => {
          const isMatch =
            r.id === targetId ||
            r.report_id === targetId ||
            (payload.canonicalUuid && (r.canonicalUuid === payload.canonicalUuid || r.id === payload.canonicalUuid));

          if (isMatch) {
            matched = true;
            const effectiveStatus = newStatus || r.status;
            const effectiveRemarks = newRemarks !== undefined ? newRemarks : r.remarks;

            // Check if status & remarks are already identical (ignore duplicate)
            if (r.status === effectiveStatus && r.remarks === effectiveRemarks) {
              return r;
            }

            // Check out-of-order timestamp
            if (payload.updated_at && r.updated_at && new Date(payload.updated_at) < new Date(r.updated_at)) {
              return r;
            }

            let displayStatus = 'RESOLVED';
            let statusClass = 'status-resolved';
            if (effectiveStatus === 'Submitted' || effectiveStatus === 'Under Review' || effectiveStatus === 'Reviewed') {
              displayStatus = 'UNDER REVIEW';
              statusClass = 'status-under-review';
            } else if (effectiveStatus === 'Under Repair' || effectiveStatus === 'Under repair') {
              displayStatus = 'UNDER REPAIR';
              statusClass = 'status-under-repair';
            } else if (effectiveStatus === 'On Hold' || effectiveStatus === 'on_hold') {
              displayStatus = 'ON HOLD';
              statusClass = 'status-on-hold';
            }

            return {
              ...r,
              status: effectiveStatus,
              displayStatus,
              display_status: displayStatus,
              statusClass,
              status_class: statusClass,
              remarks: effectiveRemarks,
              updated_at: payload.updated_at || new Date().toISOString(),
            };
          }
          return r;
        });

        return matched ? updated : prev;
      });
    };

    // 1. Centralized Realtime & Broadcast listeners (single source of events via realtimeSyncService)
    const unsubReports = subscribeToReportUpdates(handleReportLiveUpdate);
    const unsubStudents = subscribeToStudentUpdates((payload) => {
      if (payload?.eventType === 'INSERT') {
        setTotalStudents((prev) => (prev !== null ? prev + 1 : prev));
      } else if (payload?.eventType === 'UPDATE' && payload?.new?.status !== 'active') {
        setTotalStudents((prev) => (prev !== null ? Math.max(0, prev - 1) : prev));
      } else {
        fetchDashboardData(true);
      }
    });
    const unsubGuides = subscribeToGuideUpdates((payload) => {
      if (payload?.eventType === 'INSERT') {
        setTotalGuides((prev) => (prev !== null ? prev + 1 : prev));
      } else if (payload?.eventType === 'DELETE') {
        setTotalGuides((prev) => (prev !== null ? Math.max(0, prev - 1) : prev));
      } else {
        fetchDashboardData(true);
      }
    });

    // 2. Tab visibility and network reconnect refetching
    const unsubVisibility = registerVisibilityAndOnlineSync(() => fetchDashboardData(true));

    return () => {
      isMounted = false;
      unsubReports();
      unsubStudents();
      unsubGuides();
      unsubVisibility();
    };
  }, []);

  // F5 key listener for Demo Reset
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F5') {
        e.preventDefault();
        if (window.confirm('Trigger Demo Reset? This will restore initial starting state and return to login.')) {
          supabase
            .rpc('reset_fixie_demo_state')
            .catch(() => { })
            .finally(() => {
              window.location.hash = '';
              window.location.reload();
            });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // For Technical Personnel, default to 'admin' mode so Students is always visible in the sidebar
  const isStudentRole = userProfile?.role === 'student';
  const [sidebarMode, setSidebarMode] = useState(isStudentRole && initialNav !== 'Students' ? 'student' : 'admin');

  const studentNavItems = [
    { id: 'Dashboard', label: 'Dashboard', icon: LayoutGrid },
    { id: 'Report a Problem', label: 'Report a Problem', icon: FilePenLine },
    { id: 'My Reports', label: 'My Reports', icon: FileText },
    { id: 'Laboratory Guides', label: 'Laboratory Guides', icon: Megaphone },
  ];

  const adminNavItems = [
    { id: 'Dashboard', label: 'Dashboard', icon: DashboardTabIcon },
    { id: 'Students', label: 'Students', icon: StudentsTabIcon },
    { id: 'Reports', label: 'Reports', icon: ReportsTabIcon },
    { id: 'Laboratory Guides', label: 'Laboratory Guides', icon: GuidesTabIcon },
  ];

  const navItems = sidebarMode === 'student' ? studentNavItems : adminNavItems;

  return (
    <AppLayout
      navItems={adminNavItems}
      activeNav={activeNav}
      onNavClick={(item) => {
        setActiveNav(item.id);
        if (item.id === 'Students') {
          window.location.hash = '#students';
        } else if (item.id === 'Reports' || item.id === 'My Reports' || item.id === 'Report a Problem') {
          window.location.hash = '#reports';
        } else if (item.id === 'Laboratory Guides') {
          window.location.hash = '#guides';
        } else if (item.id === 'Dashboard') {
          window.location.hash = '#dashboard';
        }
      }}
      sectionTitle="LABORATORY OPERATIONS"
      userProfile={userProfile || { full_name: 'Technical Personnel', role: 'ICT-Admin', initials: 'TP' }}
      onSignOut={handleFinalSignOut}
      onSettingsClick={() => {
        setActiveNav('Settings');
        window.location.hash = '#settings';
      }}
    >

      <ErrorBoundary>
        {activeNav === 'Students' ? (
          <StudentsPage />
        ) : activeNav === 'Reports' || activeNav === 'My Reports' || activeNav === 'Report a Problem' ? (
          <ReportsPage initialFilter={reportsFilter} />
        ) : activeNav === 'Laboratory Guides' ? (
          <GuidesPage />
        ) : activeNav === 'Settings' ? (
          <SettingsPrivacyPage currentUser={currentUser} userProfile={userProfile} />
        ) : (
          <DashboardContent
            stats={stats}
            statsLoading={isLoading}
            recentReports={recentReports}
            recentReportsLoading={isLoading}
            onSelectReport={(report) => setSelectedReport(report)}
            onNavigate={(navTarget, filter = 'ALL') => {
              if (filter && filter !== 'ALL') {
                setReportsFilter(filter);
              } else {
                setReportsFilter('ALL');
              }
              setActiveNav(navTarget);
              if (navTarget === 'Students') window.location.hash = '#students';
              else if (navTarget === 'Reports') {
                window.location.hash = filter === 'ON_HOLD' ? '#reports-on-hold' : '#reports';
              }
              else if (navTarget === 'Laboratory Guides') window.location.hash = '#guides';
            }}
          />
        )}
      </ErrorBoundary>

      {/* Report Details Modal */}
      {selectedReport && (
        <ReportDetailsModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          onUpdateStatus={(reportId, newStatus, updatedHistory, newRemarks) => {
            const displayStatus =
              newStatus === 'Submitted'
                ? 'UNDER REVIEW'
                : newStatus === 'Reviewed'
                  ? 'REVIEWED'
                  : newStatus === 'Under Repair'
                    ? 'UNDER REPAIR'
                    : newStatus === 'On Hold'
                      ? 'ON HOLD'
                      : 'RESOLVED';
            const statusClass =
              newStatus === 'Submitted'
                ? 'status-under-review'
                : newStatus === 'Reviewed'
                  ? 'status-reviewed'
                  : newStatus === 'Under Repair'
                    ? 'status-under-repair'
                    : newStatus === 'On Hold'
                      ? 'status-on-hold'
                      : 'status-resolved';

            setAllReports((prev) =>
              prev
                ? prev.map((r) => {
                    if (r.id === reportId || r.report_id === reportId) {
                      return {
                        ...r,
                        status: newStatus,
                        displayStatus,
                        statusClass,
                        history: updatedHistory,
                        remarks: newRemarks !== undefined ? newRemarks : r.remarks,
                      };
                    }
                    return r;
                  })
                : prev
            );

            setSelectedReport((prev) => {
              if (!prev) return null;
              return {
                ...prev,
                status: newStatus,
                displayStatus,
                statusClass,
                history: updatedHistory,
                remarks: newRemarks !== undefined ? newRemarks : prev.remarks,
              };
            });

            // Sync to Supabase reports and reports_of_student tables
            try {
              const updatePayload = {
                status: newStatus,
                updated_at: new Date().toISOString(),
              };
              if (newRemarks !== undefined && newRemarks !== null) {
                updatePayload.remarks = newRemarks;
              }

              const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(reportId);
              if (isUuid) {
                supabase.from('reports').update(updatePayload).eq('id', reportId);
                supabase.from('reports_of_student').update(updatePayload).eq('id', reportId);
              } else {
                supabase.from('reports').update(updatePayload).eq('report_id', reportId);
                supabase.from('reports_of_student').update(updatePayload).eq('report_id', reportId);
              }
            } catch (err) {
              console.warn('Sync error on admin report update:', err);
            }

            window.dispatchEvent(
              new CustomEvent('fixie_report_status_updated', {
                detail: { reportId, newStatus, newRemarks },
              })
            );
          }}
        />
      )}
    </AppLayout>
  );
}

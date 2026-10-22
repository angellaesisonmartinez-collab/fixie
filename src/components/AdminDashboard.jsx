import { useState, useEffect } from 'react';
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
import { supabase, safeRealtimeChannel, safeRemoveChannel } from '../lib/supabase';
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
  const [stats, setStats] = useState(initialData?.stats || null);
  const [statsLoading, setStatsLoading] = useState(!initialData?.stats);
  const [recentReports, setRecentReports] = useState(initialData?.recentReports || []);
  const [recentReportsLoading, setRecentReportsLoading] = useState(!initialData?.recentReports);

  // Fetch live stats and 5 recent reports from Supabase (single source of truth)
  useEffect(() => {
    let isMounted = true;

    async function fetchDashboardData(forceRefresh = false) {
      try {
        const data = await fetchAdminDashboardData(forceRefresh);
        if (isMounted && data) {
          setStats(data.stats);
          setRecentReports(data.recentReports);
          setStatsLoading(false);
          setRecentReportsLoading(false);
        }
      } catch (err) {
        console.warn('Dashboard live sync note:', err?.message || err);
        if (isMounted) {
          setStatsLoading(false);
          setRecentReportsLoading(false);
        }
      }
    }

    fetchDashboardData();

    // Direct local state updater for instant UI reaction (zero lag)
    const handleReportLiveUpdate = (payload) => {
      if (!isMounted || !payload) return;
      const targetId = payload.report_id || payload.id || payload.reportId;
      const eventType = payload.eventType || (payload.report ? 'INSERT' : 'UPDATE');
      const newStatus = payload.newStatus || payload.status;
      const newRemarks = payload.remarks !== undefined ? payload.remarks : payload.newRemarks;

      if (eventType === 'DELETE') {
        // DELETE: remove item directly from local state and decrement totalReports
        setRecentReports((prev) => prev.filter((r) => r.id !== targetId && r.report_id !== targetId));
        setStats((prev) => ({
          ...prev,
          totalReports: Math.max(0, (prev?.totalReports || 1) - 1),
        }));
      } else if (eventType === 'INSERT') {
        // INSERT: add new item directly to top of recent reports
        const rawReport = payload.report || payload.new || payload;
        const formatted = formatAdminDashboardReport(rawReport);
        if (formatted) {
          setRecentReports((prev) => {
            const exists = prev.some((r) => r.id === formatted.id || r.report_id === formatted.report_id);
            if (exists) return prev;
            return [formatted, ...prev].slice(0, 5);
          });
        }
        setStats((prev) => {
          const isHold = newStatus === 'On Hold' || newStatus === 'on_hold';
          const isRes = newStatus === 'Resolved';
          return {
            ...prev,
            totalReports: (prev?.totalReports || 0) + 1,
            onHoldReports: isHold ? (prev?.onHoldReports || 0) + 1 : (prev?.onHoldReports || 0),
            resolvedThisMonth: isRes ? (prev?.resolvedThisMonth || 0) + 1 : (prev?.resolvedThisMonth || 0),
          };
        });
      } else {
        // UPDATE: replace item by ID and recompute relevant stat cards
        setRecentReports((prev) =>
          prev.map((r) => {
            if (r.id === targetId || r.report_id === targetId) {
              let displayStatus = 'RESOLVED';
              let statusClass = 'status-resolved';
              if (newStatus === 'Submitted' || newStatus === 'Under Review' || newStatus === 'Reviewed') {
                displayStatus = 'UNDER REVIEW';
                statusClass = 'status-under-review';
              } else if (newStatus === 'Under Repair' || newStatus === 'Under repair') {
                displayStatus = 'UNDER REPAIR';
                statusClass = 'status-under-repair';
              } else if (newStatus === 'On Hold' || newStatus === 'on_hold') {
                displayStatus = 'ON HOLD';
                statusClass = 'status-on-hold';
              }

              return {
                ...r,
                status: newStatus || r.status,
                displayStatus,
                display_status: displayStatus,
                statusClass,
                status_class: statusClass,
                remarks: newRemarks !== undefined ? newRemarks : r.remarks,
              };
            }
            return r;
          })
        );
      }

      // Background verification from Supabase single source of truth
      fetchDashboardData(true);
    };

    // 1. Supabase Realtime subscription on core tables (Phase 6 Deliverable #2)
    let dashboardChannel = null;
    try {
      dashboardChannel = safeRealtimeChannel('admin-dashboard-global-sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, (payload) => {
          const data = payload.new || payload.old || {};
          handleReportLiveUpdate({
            ...data,
            eventType: payload.eventType,
            new: payload.new,
            old: payload.old,
          });
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'reports_of_student' }, (payload) => {
          const data = payload.new || payload.old || {};
          handleReportLiveUpdate({
            ...data,
            eventType: payload.eventType,
            new: payload.new,
            old: payload.old,
          });
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, (payload) => {
          if (payload.eventType === 'INSERT') {
            setStats((prev) => ({ ...prev, totalStudents: (prev?.totalStudents || 0) + 1 }));
          } else if (payload.eventType === 'UPDATE' && payload.new?.status !== 'active') {
            setStats((prev) => ({ ...prev, totalStudents: Math.max(0, (prev?.totalStudents || 1) - 1) }));
          }
          fetchDashboardData(true);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'guides' }, (payload) => {
          if (payload.eventType === 'INSERT') {
            setStats((prev) => ({ ...prev, totalGuides: (prev?.totalGuides || 0) + 1 }));
          } else if (payload.eventType === 'DELETE') {
            setStats((prev) => ({ ...prev, totalGuides: Math.max(0, (prev?.totalGuides || 1) - 1) }));
          }
          fetchDashboardData(true);
        })
        .subscribe();
    } catch (chanErr) {
      console.warn('Dashboard realtime setup note:', chanErr);
    }

    // 2. Realtime Broadcast & Cross-window listener for instant sync
    const unsubReports = subscribeToReportUpdates(handleReportLiveUpdate);
    const unsubStudents = subscribeToStudentUpdates(() => fetchDashboardData(true));
    const unsubGuides = subscribeToGuideUpdates(() => fetchDashboardData(true));

    // 3. Tab visibility and network reconnect refetching
    const unsubVisibility = registerVisibilityAndOnlineSync(() => fetchDashboardData(true));

    return () => {
      isMounted = false;
      safeRemoveChannel(dashboardChannel);
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
            statsLoading={statsLoading}
            recentReports={recentReports}
            recentReportsLoading={recentReportsLoading}
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

            setRecentReports((prev) =>
              prev.map((r) => {
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

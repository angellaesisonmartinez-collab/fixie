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

  // Live stat metrics (initialized from Supabase state)
  const [stats, setStats] = useState({
    totalStudents: 13,
    totalReports: 24,
    totalGuides: 25,
    onHoldReports: 1,
    resolvedThisMonth: 10,
  });

  // Recent 5 reports data (initialized to match database specification)
  const [recentReports, setRecentReports] = useState([
    {
      id: 'LR-24',
      report_id: 'LR-24',
      unitNumber: 'PC-#14',
      unit_number: 'PC-#14',
      equipment: 'Monitor',
      reportedByName: 'Maria Ortiz',
      student_name: 'Maria Ortiz',
      reportedByYearBlock: '3rd year, BLK 1',
      student_year_block: '3rd year, BLK 1',
      studentId: '24-0872-090',
      student_id: '24-0872-090',
      email: 'maria.ortiz@gmail.com',
      avatar: mariaOrtizAvatar,
      locationCenter: 'Computer Center 3',
      location_center: 'Computer Center 3',
      locationRoom: 'Room 203',
      location_room: 'Room 203',
      submittedDate: 'Oct 17, 2026',
      submitted_date: 'Oct 17, 2026',
      submittedTime: '10:40 AM',
      submitted_time: '10:40 AM',
      status: 'Submitted',
      displayStatus: 'UNDER REVIEW',
      statusClass: 'status-under-review',
      description: 'Screen display flickers intermittently when running graphics applications.',
      attachment: {
        name: 'pc014_monitor_display.jpg',
        size: '1.4MB',
      },
      history: [
        { action: 'Submitted by Maria Ortiz', time: 'Oct 17, 10:40 AM' },
      ],
      remarks: null,
    },
    {
      id: 'LR-23',
      report_id: 'LR-23',
      unitNumber: 'PC-#12',
      unit_number: 'PC-#12',
      equipment: 'Network/Internet',
      reportedByName: 'Jennelyn Vergara',
      student_name: 'Jennelyn Vergara',
      reportedByYearBlock: '3rd year, BLK 2',
      student_year_block: '3rd year, BLK 2',
      studentId: '24-2026-340',
      student_id: '24-2026-340',
      email: 'jennelynvergara@gmail.com',
      avatar: jennelynAvatar,
      locationCenter: 'Computer Center 4',
      locationRoom: 'Room 204',
      submittedDate: 'Oct 16, 2026',
      submittedTime: '9:30 AM',
      status: 'Submitted',
      displayStatus: 'UNDER REVIEW',
      statusClass: 'status-under-review',
      description: 'No ethernet connection detected; LAN port indicator is unlit.',
      remarks: null,
    },
    {
      id: 'LR-22',
      report_id: 'LR-22',
      unitNumber: 'PC-#23',
      unit_number: 'PC-#23',
      equipment: 'Network/Internet',
      reportedByName: 'Reyn Arahan',
      student_name: 'Reyn Arahan',
      reportedByYearBlock: '3rd year, BLK 1',
      student_year_block: '3rd year, BLK 1',
      studentId: '24-7345-853',
      student_id: '24-7345-853',
      email: 'reynarahan@gmail.com',
      avatar: reynAvatar,
      locationCenter: 'Computer Center 3',
      locationRoom: 'Room 203',
      submittedDate: 'Oct 15, 2026',
      submittedTime: '1:30 PM',
      status: 'Under Repair',
      displayStatus: 'UNDER REPAIR',
      statusClass: 'status-under-repair',
      description: 'Damaged RJ-45 jack causing packet loss and intermittent drops.',
      remarks: 'Port keystone needs replacement. Parts requisition submitted.',
    },
    {
      id: 'LR-21',
      report_id: 'LR-21',
      unitNumber: 'PC-#03',
      unit_number: 'PC-#03',
      equipment: 'Network/Internet',
      reportedByName: 'Juan Dela Cruz',
      student_name: 'Juan Dela Cruz',
      reportedByYearBlock: '2nd year, BLK 2',
      student_year_block: '2nd year, BLK 2',
      studentId: '24-0031-267',
      student_id: '24-0031-267',
      email: 'jualdelacruz@gmail.com',
      avatar: juanAvatar,
      locationCenter: 'Computer Center 6',
      locationRoom: 'Room 206',
      submittedDate: 'Oct 14, 2026',
      submittedTime: '2:45 PM',
      status: 'Resolved',
      displayStatus: 'RESOLVED',
      statusClass: 'status-resolved',
      description: 'High packet loss encountered during lab networking practical exercise.',
      remarks: 'Re-crimped RJ-45 connector and tested continuous ping at 0% drop rate.',
    },
    {
      id: 'LR-20',
      report_id: 'LR-20',
      unitNumber: 'PC-#13',
      unit_number: 'PC-#13',
      equipment: 'Network/Internet',
      reportedByName: 'Maria Reyes',
      student_name: 'Maria Reyes',
      reportedByYearBlock: '1st year, BLK 1',
      student_year_block: '1st year, BLK 1',
      studentId: '24-8521-063',
      student_id: '24-8521-063',
      email: 'mariareyes@gmail.com',
      avatar: mariaAvatar,
      locationCenter: 'Computer Center 5',
      locationRoom: 'Room 205',
      submittedDate: 'Oct 12, 2026',
      submittedTime: '3:15 PM',
      status: 'Resolved',
      displayStatus: 'RESOLVED',
      statusClass: 'status-resolved',
      description: 'Slow gateway response and intermittent DNS lookup timeouts.',
      remarks: 'Replaced patch cable with Cat6 shielded cable. Full gigabit link restored.',
    },
  ]);

  // Fetch live stats and 5 recent reports from Supabase
  useEffect(() => {
    let isMounted = true;

    async function fetchDashboardData() {
      try {
        // Execute all dashboard queries in parallel with Promise.all
        const [
          studentRes,
          reportRes,
          onHoldRes,
          guideRes,
          resolvedRes,
          recentReportsRes,
        ] = await Promise.all([
          supabase.from('students').select('*', { count: 'exact', head: true }).eq('status', 'active'),
          supabase.from('reports').select('*', { count: 'exact', head: true }),
          supabase.from('reports').select('*', { count: 'exact', head: true }).or('status.eq.On Hold,status.eq.on_hold'),
          supabase.from('guides').select('*', { count: 'exact', head: true }),
          supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'Resolved'),
          supabase
            .from('reports')
            .select('*, students(*)')
            .order('created_at', { ascending: false })
            .order('report_id', { ascending: false })
            .limit(5),
        ]);

        const studentCount = studentRes?.count;
        const reportCount = reportRes?.count;
        const onHoldCount = onHoldRes?.count;
        const guideCount = guideRes?.count;
        const thisMonthResolved = resolvedRes?.count ?? 10;
        const dbReports = recentReportsRes?.data;

        if (isMounted) {
          setStats({
            totalStudents: studentCount ?? 13,
            totalReports: reportCount ?? 24,
            totalGuides: guideCount ?? 25,
            onHoldReports: onHoldCount ?? 0,
            resolvedThisMonth: thisMonthResolved,
          });
        }

        if (dbReports && dbReports.length > 0 && isMounted) {
          const formatted = dbReports.map((r) => {
            const reportId = r.report_id || `LR-${r.id.slice(0, 4)}`;
            const st = resolveAuthenticReportStudent(reportId, r.students);

            // Format student name consistently (no middle initial or middle name)
            const studentName = formatStudentName(st) || 'Student';
            const yearBlock = formatYearBlock(st.year_block) || '3rd year, BLK 2';

            // Split location
            let locationCenter = 'Computer Center';
            let locationRoom = 'Room';
            if (r.room) {
              const parts = r.room.split(',');
              if (parts.length >= 2) {
                locationCenter = parts[0].trim();
                locationRoom = parts[1].trim();
              } else {
                locationCenter = r.room;
              }
            }

            // Format date & time
            const dateObj = new Date(r.created_at);
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const submittedDate = `${months[dateObj.getMonth()]} ${dateObj.getDate()}, ${dateObj.getFullYear()}`;

            let hours = dateObj.getHours();
            const minutes = dateObj.getMinutes().toString().padStart(2, '0');
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12;
            const submittedTime = `${hours}:${minutes} ${ampm}`;

            // Map display status and badge style
            let displayStatus = 'RESOLVED';
            let statusClass = 'status-resolved';
            if (r.status === 'Submitted' || r.status === 'Reviewed' || r.status === 'Under Review') {
              displayStatus = 'UNDER REVIEW';
              statusClass = 'status-under-review';
            } else if (r.status === 'Under Repair') {
              displayStatus = 'UNDER REPAIR';
              statusClass = 'status-under-repair';
            } else if (r.status === 'On Hold' || r.status === 'on_hold') {
              displayStatus = 'ON HOLD';
              statusClass = 'status-on-hold';
            }

            // Avatar lookup
            const avatar =
              st.avatar ||
              avatarMap[st.student_id] ||
              avatarMap[st.email] ||
              avatarMap[studentName] ||
              avatarMap[st.name] ||
              null;

            return {
              id: reportId,
              report_id: reportId,
              unitNumber: r.unit_number || 'PC-#01',
              unit_number: r.unit_number || 'PC-#01',
              equipment: r.equipment || 'Equipment',
              reportedByName: studentName,
              student_name: studentName,
              reportedByYearBlock: yearBlock,
              student_year_block: yearBlock,
              studentId: st.student_id || 'N/A',
              student_id: st.student_id || 'N/A',
              email: st.email || '',
              avatar,
              locationCenter,
              location_center: locationCenter,
              locationRoom,
              location_room: locationRoom,
              submittedDate,
              submitted_date: submittedDate,
              submittedTime,
              submitted_time: submittedTime,
              raw_created_at: r.created_at,
              status: r.status,
              displayStatus,
              display_status: displayStatus,
              statusClass,
              status_class: statusClass,
              description: r.description,
              remarks: r.remarks,
              photo_url: r.photo_url || null,
              attachment: getReportAttachment(r),
            };
          });

          setRecentReports(formatted);
        }
      } catch (err) {
        console.warn('Dashboard live sync note:', err.message);
      }
    }

    fetchDashboardData();

    // 1. Supabase Realtime subscriptions on reports, students, and guides (Phase 6 Deliverable #2)
    let dashboardChannel = null;
    try {
      dashboardChannel = safeRealtimeChannel('admin-dashboard-global-sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, () => {
          fetchDashboardData();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => {
          fetchDashboardData();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'guides' }, () => {
          fetchDashboardData();
        })
        .subscribe();
    } catch (chanErr) {
      console.warn('Dashboard realtime setup note:', chanErr);
    }

    // 2. Cross-component event listeners for instant reactivity across Fixie
    const handleReportUpdate = () => fetchDashboardData();
    const handleStudentStatusUpdate = (e) => {
      if (e?.detail?.status === 'deactivated') {
        setStats((prev) => ({
          ...prev,
          totalStudents: Math.max(0, prev.totalStudents - 1),
        }));
      } else if (e?.detail?.status === 'active') {
        setStats((prev) => ({
          ...prev,
          totalStudents: prev.totalStudents + 1,
        }));
      }
      fetchDashboardData();
    };
    const handleStudentRegistered = () => {
      setStats((prev) => ({
        ...prev,
        totalStudents: prev.totalStudents + 1,
      }));
      fetchDashboardData();
    };
    const handleGuideUpdate = () => fetchDashboardData();

    window.addEventListener('fixie_report_status_updated', handleReportUpdate);
    window.addEventListener('fixie_student_status_changed', handleStudentStatusUpdate);
    window.addEventListener('fixie_student_registered', handleStudentRegistered);
    window.addEventListener('fixie_guide_updated', handleGuideUpdate);

    return () => {
      isMounted = false;
      safeRemoveChannel(dashboardChannel);
      window.removeEventListener('fixie_report_status_updated', handleReportUpdate);
      window.removeEventListener('fixie_student_status_changed', handleStudentStatusUpdate);
      window.removeEventListener('fixie_student_registered', handleStudentRegistered);
      window.removeEventListener('fixie_guide_updated', handleGuideUpdate);
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
            recentReports={recentReports}
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

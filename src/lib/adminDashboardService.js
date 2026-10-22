import { supabase } from './supabase.js';
import { formatStudentName, formatYearBlock } from './studentFormatUtils.js';
import { getReportAttachment } from './reportAttachmentUtils.js';
import { resolveAuthenticReportStudent } from './reportStudentMapping.js';
import angelAvatar from '../assets/avatars/angel.png';
import jennelynAvatar from '../assets/avatars/jennelyn.png';
import reynAvatar from '../assets/avatars/reyn.png';
import juanAvatar from '../assets/avatars/juan.png';
import mariaAvatar from '../assets/avatars/maria.png';
import mariaOrtizAvatar from '../assets/avatars/maria_ortiz.png';
import phiaAvatar from '../assets/avatars/phia.png';

// Fallback avatar lookup for known students
export const avatarMap = {
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

export function formatAdminDashboardReport(r) {
  if (!r) return null;
  const reportId = r.report_id || `LR-${r.id?.slice(0, 4) || '00'}`;
  const st = resolveAuthenticReportStudent(reportId, r.students);

  // Format student name consistently (no middle initial or middle name)
  const studentName = formatStudentName(st) || 'Student';
  const yearBlock = formatYearBlock(st?.year_block) || '3rd year, BLK 2';

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
  const dateObj = r.created_at ? new Date(r.created_at) : new Date();
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
    st?.avatar ||
    avatarMap[st?.student_id] ||
    avatarMap[st?.email] ||
    avatarMap[studentName] ||
    avatarMap[st?.name] ||
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
    studentId: st?.student_id || 'N/A',
    student_id: st?.student_id || 'N/A',
    email: st?.email || '',
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
}

export function isReportOnHold(report) {
  if (!report) return false;
  const statusStr = (report.status || '').toLowerCase().trim();
  const displayStatusStr = (report.display_status || report.displayStatus || '').toLowerCase().trim();
  return (
    statusStr === 'on hold' ||
    statusStr === 'on_hold' ||
    statusStr === 'hold' ||
    displayStatusStr === 'on hold'
  );
}

// In-memory module cache for instant hydration
let cachedAdminDashboardData = null;
let inFlightDashboardPromise = null;

export function getCachedAdminDashboardData() {
  return cachedAdminDashboardData;
}

export function clearAdminDashboardCache() {
  cachedAdminDashboardData = null;
  inFlightDashboardPromise = null;
}

/**
 * Fetch all Technical Personnel Dashboard metrics & reports from Supabase.
 * Reports and stat card counts are derived from ONE single source of truth.
 */
export async function fetchAdminDashboardData(forceRefresh = false) {
  if (!forceRefresh && inFlightDashboardPromise) {
    return inFlightDashboardPromise;
  }

  inFlightDashboardPromise = (async () => {
    try {
      const [
        studentRes,
        reportsRes,
        guideRes,
      ] = await Promise.all([
        supabase.from('students').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase
          .from('reports')
          .select('*, students(*)')
          .order('created_at', { ascending: false })
          .order('report_id', { ascending: false }),
        supabase.from('guides').select('*', { count: 'exact', head: true }),
      ]);

      const rawReports = reportsRes?.data || [];
      const reports = rawReports.map(formatAdminDashboardReport).filter(Boolean);

      const totalStudents = typeof studentRes?.count === 'number' ? studentRes.count : 0;
      const totalGuides = typeof guideRes?.count === 'number' ? guideRes.count : 0;
      const totalReports = reports.length;
      const onHoldReports = reports.filter(isReportOnHold).length;
      const resolvedThisMonth = reports.filter((r) => r.status === 'Resolved' || (r.displayStatus || '').toUpperCase() === 'RESOLVED').length;

      const stats = {
        totalStudents,
        totalReports,
        totalGuides,
        onHoldReports,
        resolvedThisMonth,
      };

      const result = {
        reports,
        stats,
        recentReports: reports.slice(0, 5),
        totalStudents,
        totalGuides,
      };

      cachedAdminDashboardData = result;
      return result;
    } finally {
      inFlightDashboardPromise = null;
    }
  })();

  return inFlightDashboardPromise;
}

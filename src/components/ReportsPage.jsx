import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Clock,
  Wrench,
  CheckCircle2,
  PauseCircle,
  Search,
  ChevronDown,
  RotateCw,
  X,
  Check,
  AlertCircle
} from 'lucide-react';
import { supabase, safeRealtimeChannel, safeRemoveChannel } from '../lib/supabase';
import { getVisiblePages, getDisplayedCount } from '../lib/paginationUtils';
import Banner from './Banner';
import ReportDetailsModal, { reportHistoryCache, canonicalUuidCache, buildUnifiedHistoryEntries } from './ReportDetailsModal';
import StudentSubmittedReportsPage from './StudentSubmittedReportsPage';
import { formatStudentName, formatYearBlock } from '../lib/studentFormatUtils';
import { parseReportDateTime } from '../lib/reportDateUtils';
import { resolveAuthenticReportStudent, fetchStudentForReport } from '../lib/reportStudentMapping';
import { getStudentAvatar } from '../lib/studentAvatarUtils';
import { getReportAttachment } from '../lib/reportAttachmentUtils';
import { broadcastReportStatusUpdate, broadcastReportDeleted, subscribeToReportUpdates, registerVisibilityAndOnlineSync } from '../lib/realtimeSyncService';
import angelAvatar from '../assets/avatars/angel.png';
import jennelynAvatar from '../assets/avatars/jennelyn.png';
import reynAvatar from '../assets/avatars/reyn.png';
import juanAvatar from '../assets/avatars/juan.png';
import mariaAvatar from '../assets/avatars/maria.png';
import phiaAvatar from '../assets/avatars/phia.png';
import jeaneAvatar from '../assets/avatars/jeane.png';
import jazminAvatar from '../assets/avatars/jazmin.png';
import emmanuelAvatar from '../assets/avatars/emmanuel.png';

// Fallback avatar lookup by student ID, email, or full name
const avatarMap = {
  '24-0041-147': angelAvatar,
  '2024-147-098': angelAvatar,
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

  '24-0872-090': mariaAvatar,
  'maria.ortiz@gmail.com': mariaAvatar,
  'Maria Ortiz': mariaAvatar,
  'Maria Santos Ortiz': mariaAvatar,

  'Phia Cayetano': phiaAvatar,
  'phia.cayetano@gmail.com': phiaAvatar,
  '24-4011-088': phiaAvatar,

  '24-1003-101': jeaneAvatar,
  'jeanekelly@gmail.com': jeaneAvatar,
  'Jeane Kelly Mina': jeaneAvatar,

  '24-2745-132': jazminAvatar,
  'jazmin@gmail.com': jazminAvatar,
  'Jazmin Bayudan': jazminAvatar,

  '24-0132-062': emmanuelAvatar,
  'emmang@gmail.com': emmanuelAvatar,
  'Emmanuel Gaspar': emmanuelAvatar,
};

/**
 * Extracts the numeric portion of a Report ID (e.g., "LR-30" -> 30, "LR-09" -> 9, "LR-01" -> 1).
 * Returns -1 if no numeric digits are found.
 */
export function parseReportIdNumber(reportOrId) {
  if (!reportOrId) return -1;
  const rawId = typeof reportOrId === 'string'
    ? reportOrId
    : (reportOrId.report_id || reportOrId.reportId || reportOrId.id || '');
  const match = String(rawId).match(/\d+/);
  return match ? parseInt(match[0], 10) : -1;
}

/**
 * Sorts reports strictly by Report ID in descending order (highest ID first, e.g. LR-30, LR-29 ... LR-01).
 * Correctly compares the numeric portion so LR-30 appears before LR-09 and LR-01.
 */
export function compareReportsByReportIdDesc(a, b) {
  const numA = parseReportIdNumber(a);
  const numB = parseReportIdNumber(b);

  if (numA !== numB) {
    return numB - numA; // Higher numeric ID first (e.g. 30 > 9 > 1)
  }

  // Tie-breaker: natural locale comparison descending
  const idA = String(a?.report_id || a?.reportId || a?.id || '');
  const idB = String(b?.report_id || b?.reportId || b?.id || '');
  const idComp = idB.localeCompare(idA, undefined, { numeric: true, sensitivity: 'base' });
  if (idComp !== 0) return idComp;

  // Fallback tie-breaker: created_at / raw_created_at descending
  const dateA = new Date(a?.raw_created_at || a?.created_at || 0).getTime();
  const dateB = new Date(b?.raw_created_at || b?.created_at || 0).getTime();
  return dateB - dateA;
}

// Initial 24 reports matching Supabase database & reference mockups exactly
const defaultReports = [
  // --- Page 1 (7 reports as seen in reference screenshot) ---
  {
    id: 'rep-24',
    report_id: 'LR-24',
    unit_number: 'PC-#14',
    equipment: 'Monitor',
    student_name: 'Maria Ortiz',
    student_year_block: '3rd year, BLK 1',
    student_id: '24-0872-090',
    student_email: 'maria.ortiz@gmail.com',
    location_center: 'Computer Center 3',
    location_room: 'Room 203',
    submitted_date: 'Oct 17, 2026',
    submitted_time: '10:40 AM',
    raw_created_at: '2026-10-17T02:40:00.000Z',
    status: 'Submitted',
    display_status: 'UNDER REVIEW',
    status_class: 'status-under-review',
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
    id: 'rep-23',
    report_id: 'LR-23',
    unit_number: 'PC-#12',
    equipment: 'Network/Internet',
    student_name: 'Jennelyn Vergara',
    student_year_block: 'BSIT 3-2',
    student_id: '24-2026-340',
    student_email: 'jennelyn@gmail.com',
    location_center: 'Computer Center 4',
    location_room: 'Room 204',
    submitted_date: 'Oct 16, 2026',
    submitted_time: '9:30 AM',
    raw_created_at: '2026-10-16T01:30:00.000Z',
    status: 'Submitted',
    display_status: 'UNDER REVIEW',
    status_class: 'status-under-review',
    description: 'No ethernet connection detected; LAN port indicator is unlit.',
    remarks: null,
  },
  {
    id: 'rep-22',
    report_id: 'LR-22',
    unit_number: 'PC-#23',
    equipment: 'Network/Internet',
    student_name: 'Reyn Arahan',
    student_year_block: 'BSIT 3-1',
    student_id: '24-7345-853',
    student_email: 'reyn.arahan@gmail.com',
    location_center: 'Computer Center 3',
    location_room: 'Room 203',
    submitted_date: 'Oct 15, 2026',
    submitted_time: '1:30 PM',
    raw_created_at: '2026-10-15T05:30:00.000Z',
    status: 'Under Repair',
    display_status: 'UNDER REPAIR',
    status_class: 'status-under-repair',
    description: 'Damaged RJ-45 jack causing packet loss and intermittent drops.',
    remarks: 'Port keystone needs replacement. Parts requisition submitted.',
  },
  {
    id: 'rep-21',
    report_id: 'LR-21',
    unit_number: 'PC-#03',
    equipment: 'Network/Internet',
    student_name: 'Juan Dela Cruz',
    student_year_block: 'BSIT 2-2',
    student_id: '24-0031-267',
    student_email: 'juan.delacruz@gmail.com',
    location_center: 'Computer Center 6',
    location_room: 'Room 206',
    submitted_date: 'Oct 14, 2026',
    submitted_time: '2:45 PM',
    raw_created_at: '2026-10-14T06:45:00.000Z',
    status: 'Resolved',
    display_status: 'RESOLVED',
    status_class: 'status-resolved',
    description: 'High packet loss encountered during lab networking practical exercise.',
    remarks: 'Re-crimped RJ-45 connector and tested continuous ping at 0% drop rate.',
  },
  {
    id: 'rep-20',
    report_id: 'LR-20',
    unit_number: 'PC-#13',
    equipment: 'Network/Internet',
    student_name: 'Maria Reyes',
    student_year_block: 'BSIT 1-1',
    student_id: '24-8521-063',
    student_email: 'maria.reyes@gmail.com',
    location_center: 'Computer Center 5',
    location_room: 'Room 205',
    submitted_date: 'Oct 12, 2026',
    submitted_time: '3:15 PM',
    raw_created_at: '2026-10-12T07:15:00.000Z',
    status: 'Resolved',
    display_status: 'RESOLVED',
    status_class: 'status-resolved',
    description: 'Slow gateway response and intermittent DNS lookup timeouts.',
    remarks: 'Replaced patch cable with Cat6 shielded cable. Full gigabit link restored.',
  },
  {
    id: 'rep-19',
    report_id: 'LR-19',
    unit_number: 'PC-#18',
    equipment: 'Monitor',
    student_name: 'Phia Cayetano',
    student_year_block: 'BSIT 4-1',
    student_id: '24-4011-088',
    student_email: 'phia.cayetano@gmail.com',
    location_center: 'Computer Center 2',
    location_room: 'Room 205',
    submitted_date: 'Oct 12, 2026',
    submitted_time: '3:15 PM',
    raw_created_at: '2026-10-12T07:15:00.000Z',
    status: 'On Hold',
    display_status: 'ON HOLD',
    status_class: 'status-on-hold',
    description: 'Display output intermittently blank or flickering under load.',
    remarks: 'Awaiting replacement parts from supplier.',
  },
  {
    id: 'rep-18',
    report_id: 'LR-18',
    unit_number: 'PC-#14',
    equipment: 'Keyboard',
    student_name: 'Phia Cayetano',
    student_year_block: 'BSIT 4-1',
    student_id: '24-4011-088',
    student_email: 'phia.cayetano@gmail.com',
    location_center: 'Computer Center 2',
    location_room: 'Room 205',
    submitted_date: 'Oct 12, 2026',
    submitted_time: '3:15 PM',
    raw_created_at: '2026-10-12T07:15:00.000Z',
    status: 'Resolved',
    display_status: 'RESOLVED',
    status_class: 'status-resolved',
    description: 'Sticky key switches and unresponsiveness on spacebar and enter.',
    remarks: 'Cleaned switches and replaced worn keycaps.',
  },

  // --- Page 2 (7 reports) ---
  {
    id: 'rep-17',
    report_id: 'LR-17',
    unit_number: 'PC-#31',
    equipment: 'System Unit/CPU',
    student_name: 'Emmanuel Gaspar',
    student_year_block: 'BSIT 3-1',
    student_id: '24-0132-062',
    student_email: 'emmang@gmail.com',
    location_center: 'Computer Center 7',
    location_room: 'Room 207',
    submitted_date: 'Oct 09, 2026',
    submitted_time: '10:15 AM',
    raw_created_at: '2026-10-09T02:15:00.000Z',
    status: 'Resolved',
    display_status: 'RESOLVED',
    status_class: 'status-resolved',
    description: 'CPU fan making loud grinding noise during boot.',
    remarks: 'Replaced chassis fan and reapplied thermal paste.',
  },
  {
    id: 'rep-16',
    report_id: 'LR-16',
    unit_number: 'PC-#09',
    equipment: 'Power (AVR/UPS/Outlet)',
    student_name: 'Bianca Allyzon Antonio',
    student_year_block: 'BSIT 3-1',
    student_id: '24-2026-106',
    student_email: 'bianca@gmail.com',
    location_center: 'Computer Center 8',
    location_room: 'Room 208',
    submitted_date: 'Oct 08, 2026',
    submitted_time: '1:10 PM',
    raw_created_at: '2026-10-08T05:10:00.000Z',
    status: 'Resolved',
    display_status: 'RESOLVED',
    status_class: 'status-resolved',
    description: 'AVR power switch clicks off when PC starts high-load processes.',
    remarks: 'Defective fuse replaced and surge suppression load-tested.',
  },
  {
    id: 'rep-15',
    report_id: 'LR-15',
    unit_number: 'PC-#17',
    equipment: 'Software/OS',
    student_name: 'Chryztel Geene Salvador',
    student_year_block: 'BSIT 3-1',
    student_id: '24-2026-107',
    student_email: 'geene@gmail.com',
    location_center: 'Computer Center 9',
    location_room: 'Room 209',
    submitted_date: 'Oct 07, 2026',
    submitted_time: '11:45 AM',
    raw_created_at: '2026-10-07T03:45:00.000Z',
    status: 'Resolved',
    display_status: 'RESOLVED',
    status_class: 'status-resolved',
    description: 'Compiler license expired on IDE toolchain.',
    remarks: 'Renewed institutional license server key and verified compiler build.',
  },
  {
    id: 'rep-14',
    report_id: 'LR-14',
    unit_number: 'PC-#35',
    equipment: 'Monitor',
    student_name: 'John Lester Tan',
    student_year_block: 'BSIT 3-1',
    student_id: '24-2026-108',
    student_email: 'lester@gmail.com',
    location_center: 'Computer Center 10',
    location_room: 'Room 210',
    submitted_date: 'Oct 05, 2026',
    submitted_time: '9:30 AM',
    raw_created_at: '2026-10-05T01:30:00.000Z',
    status: 'Resolved',
    display_status: 'RESOLVED',
    status_class: 'status-resolved',
    description: 'HDMI color tint shifted towards heavy yellow/green.',
    remarks: 'Replaced bent HDMI cable and recalibrated color profile.',
  },
  {
    id: 'rep-13',
    report_id: 'LR-13',
    unit_number: 'PC-#19',
    equipment: 'Keyboard',
    student_name: 'Justine Kate Abello',
    student_year_block: 'BSIT 3-2',
    student_id: '24-2026-109',
    student_email: 'kate@gmail.com',
    location_center: 'Computer Center 4',
    location_room: 'Room 204',
    submitted_date: 'Oct 04, 2026',
    submitted_time: '3:00 PM',
    raw_created_at: '2026-10-04T07:00:00.000Z',
    status: 'Resolved',
    display_status: 'RESOLVED',
    status_class: 'status-resolved',
    description: 'NumPad keys 4, 5, 6 unresponsive.',
    remarks: 'Firmware updated and cable seated properly in rear USB 3.0 port.',
  },
  {
    id: 'rep-12',
    report_id: 'LR-12',
    unit_number: 'PC-#14',
    equipment: 'Monitor',
    student_name: 'Angel Lae Martinez',
    student_year_block: '3rd year, BLK 2',
    student_id: '24-0041-147',
    student_email: 'martinezangellaewup@gmail.com',
    location_center: 'Computer Center 5',
    location_room: 'Room 204',
    submitted_date: 'Oct 02, 2026',
    submitted_time: '10:00 AM',
    raw_created_at: '2026-10-02T02:00:00.000Z',
    status: 'Reviewed',
    display_status: 'UNDER REVIEW',
    status_class: 'status-under-review',
    description: 'Monitor display flickering intermittently and showing vertical green artifacts during laboratory session.',
    remarks: 'Assigned for hardware diagnostic by technical personnel.',
  },
  {
    id: 'rep-11',
    report_id: 'LR-11',
    unit_number: 'PC-#10',
    equipment: 'Network/Internet',
    student_name: 'Angel Lae Martinez',
    student_year_block: '3rd year, BLK 2',
    student_id: '24-0041-147',
    student_email: 'martinezangellaewup@gmail.com',
    location_center: 'Computer Center 5',
    location_room: 'Room 204',
    submitted_date: 'Oct 04, 2026',
    submitted_time: '1:00 PM',
    raw_created_at: '2026-10-04T05:00:00.000Z',
    status: 'Under Repair',
    display_status: 'UNDER REPAIR',
    status_class: 'status-under-repair',
    description: 'PC not connecting to internet gateway; LAN port link LED off.',
    remarks: 'Technician currently re-terminating patch panel drop cable.',
  },

  // --- Page 3 (7 reports) ---
  {
    id: 'rep-10',
    report_id: 'LR-10',
    unit_number: 'PC-#15',
    equipment: 'Power (AVR/UPS/Outlet)',
    student_name: 'Jennelyn Vergara',
    student_year_block: 'BSIT 3-2',
    student_id: '24-2026-340',
    student_email: 'jennelyn@gmail.com',
    location_center: 'Computer Center 3',
    location_room: 'Room 203',
    submitted_date: 'Oct 04, 2026',
    submitted_time: '4:15 PM',
    raw_created_at: '2026-10-04T08:15:00.000Z',
    status: 'Resolved',
    display_status: 'RESOLVED',
    status_class: 'status-resolved',
    description: 'Power strip outlet loose causing sudden shutdown.',
    remarks: 'Replaced electrical wall outlet plate and tightened terminal lugs.',
  },
  {
    id: 'rep-09',
    report_id: 'LR-09',
    unit_number: 'PC-#30',
    equipment: 'Software/OS',
    student_name: 'Reyn Arahan',
    student_year_block: 'BSIT 3-1',
    student_id: '24-7345-853',
    student_email: 'reyn.arahan@gmail.com',
    location_center: 'Computer Center 1',
    location_room: 'Room 201',
    submitted_date: 'Oct 03, 2026',
    submitted_time: '9:30 AM',
    raw_created_at: '2026-10-03T01:30:00.000Z',
    status: 'Resolved',
    display_status: 'RESOLVED',
    status_class: 'status-resolved',
    description: 'Windows audio service crashing repeatedly.',
    remarks: 'Realtek audio driver reinstalled from OEM repository.',
  },
  {
    id: 'rep-08',
    report_id: 'LR-08',
    unit_number: 'PC-#04',
    equipment: 'Monitor',
    student_name: 'Juan Dela Cruz',
    student_year_block: 'BSIT 2-2',
    student_id: '24-0031-267',
    student_email: 'juan.delacruz@gmail.com',
    location_center: 'Computer Center 6',
    location_room: 'Room 206',
    submitted_date: 'Oct 03, 2026',
    submitted_time: '2:10 PM',
    raw_created_at: '2026-10-03T06:10:00.000Z',
    status: 'Resolved',
    display_status: 'RESOLVED',
    status_class: 'status-resolved',
    description: 'Monitor resolution locked at 1024x768.',
    remarks: 'Installed updated Intel display graphics drivers.',
  },
  {
    id: 'rep-07',
    report_id: 'LR-07',
    unit_number: 'PC-#21',
    equipment: 'Keyboard',
    student_name: 'Maria Reyes',
    student_year_block: 'BSIT 1-1',
    student_id: '24-8521-063',
    student_email: 'maria.reyes@gmail.com',
    location_center: 'Computer Center 7',
    location_room: 'Room 207',
    submitted_date: 'Oct 02, 2026',
    submitted_time: '10:00 AM',
    raw_created_at: '2026-10-02T02:00:00.000Z',
    status: 'Resolved',
    display_status: 'RESOLVED',
    status_class: 'status-resolved',
    description: 'Caps Lock LED stuck on; typing produces mixed casing.',
    remarks: 'Keyboard controller reset; normal operation verified.',
  },
  {
    id: 'rep-06',
    report_id: 'LR-06',
    unit_number: 'PC-#08',
    equipment: 'Mouse',
    student_name: 'Alyssa Ramos',
    student_year_block: 'BSIT 1-1',
    student_id: '22-0941-301',
    student_email: 'alyssa.ramos@gmail.com',
    location_center: 'Computer Center 5',
    location_room: 'Room 204',
    submitted_date: 'Oct 02, 2026',
    submitted_time: '12:20 PM',
    raw_created_at: '2026-10-02T04:20:00.000Z',
    status: 'Resolved',
    display_status: 'RESOLVED',
    status_class: 'status-resolved',
    description: 'Scroll wheel loose and skips lines when scrolling.',
    remarks: 'Optical wheel encoder cleaned and tested.',
  },
  {
    id: 'rep-05',
    report_id: 'LR-05',
    unit_number: 'PC-#11',
    equipment: 'Network/Internet',
    student_name: 'Jeane Kelly Mina',
    student_year_block: 'BSIT 3-2',
    student_id: '24-1003-101',
    student_email: 'jeanekelly@gmail.com',
    location_center: 'Computer Center 8',
    location_room: 'Room 208',
    submitted_date: 'Oct 02, 2026',
    submitted_time: '2:40 PM',
    raw_created_at: '2026-10-02T06:40:00.000Z',
    status: 'Resolved',
    display_status: 'RESOLVED',
    status_class: 'status-resolved',
    description: 'DHCP auto-assigning 169.254.x.x link-local IP.',
    remarks: 'Switch port VLAN membership reconfigured in rack 2.',
  },
  {
    id: 'rep-04',
    report_id: 'LR-04',
    unit_number: 'PC-#38',
    equipment: 'System Unit/CPU',
    student_name: 'Jazmin Bayudan',
    student_year_block: 'BSIT 3-2',
    student_id: '24-2745-132',
    student_email: 'jazmin@gmail.com',
    location_center: 'Computer Center 9',
    location_room: 'Room 209',
    submitted_date: 'Oct 01, 2026',
    submitted_time: '9:15 AM',
    raw_created_at: '2026-10-01T01:15:00.000Z',
    status: 'Resolved',
    display_status: 'RESOLVED',
    status_class: 'status-resolved',
    description: 'Front panel USB 3.0 ports failing to recognize flash drives.',
    remarks: 'Reconnected front-panel motherboard header cable.',
  },

  // --- Page 4 (3 reports) ---
  {
    id: 'rep-03',
    report_id: 'LR-03',
    unit_number: 'PC-#25',
    equipment: 'Power (AVR/UPS/Outlet)',
    student_name: 'Emmanuel Gaspar',
    student_year_block: 'BSIT 3-1',
    student_id: '24-0132-062',
    student_email: 'emmang@gmail.com',
    location_center: 'Computer Center 10',
    location_room: 'Room 210',
    submitted_date: 'Oct 01, 2026',
    submitted_time: '11:00 AM',
    raw_created_at: '2026-10-01T03:00:00.000Z',
    status: 'Resolved',
    display_status: 'RESOLVED',
    status_class: 'status-resolved',
    description: 'UPS beeping continuously on AC power line.',
    remarks: 'Battery calibrated and sensitivity potentiometer adjusted.',
  },
  {
    id: 'rep-02',
    report_id: 'LR-02',
    unit_number: 'PC-#14',
    equipment: 'Keyboard',
    student_name: 'Bianca Allyzon Antonio',
    student_year_block: 'BSIT 3-1',
    student_id: '24-2026-106',
    student_email: 'bianca@gmail.com',
    location_center: 'Computer Center 5',
    location_room: 'Room 206',
    submitted_date: 'Oct 01, 2026',
    submitted_time: '2:15 PM',
    raw_created_at: '2026-10-01T06:15:00.000Z',
    status: 'Resolved',
    display_status: 'RESOLVED',
    status_class: 'status-resolved',
    description: 'Multiple keys unresponsive after morning cleaning.',
    remarks: 'Replacement keyboard issued from stock. Verified operational.',
  },
  {
    id: 'rep-01',
    report_id: 'LR-01',
    unit_number: 'PC-#18',
    equipment: 'Software/OS',
    student_name: 'Chryztel Geene Salvador',
    student_year_block: 'BSIT 3-1',
    student_id: '24-2026-107',
    student_email: 'geene@gmail.com',
    location_center: 'Computer Center 5',
    location_room: 'Room 204',
    submitted_date: 'Oct 01, 2026',
    submitted_time: '4:45 PM',
    raw_created_at: '2026-10-01T08:45:00.000Z',
    status: 'Resolved',
    display_status: 'RESOLVED',
    status_class: 'status-resolved',
    description: 'Operating system fails to boot into desktop; blue screen error encountered.',
    remarks: 'OS re-imaged and updated. Verified operational.',
  },

].map((r) => {
  const isAngelReport = r.report_id && parseInt(r.report_id.replace('LR-', ''), 10) <= 18;
  return {
    ...r,
    student_name: isAngelReport ? 'Angel Lae Martinez' : formatStudentName(r.student_name),
    student_year_block: isAngelReport ? '3rd year, BLK 2' : formatYearBlock(r.student_year_block),
    student_id: isAngelReport ? '24-0041-147' : r.student_id,
    student_email: isAngelReport ? 'martinezangellaewup@gmail.com' : r.student_email,
    photo_url: r.photo_url || (r.report_id === 'LR-24' ? 'https://ieznsbzddanjwmnpvncs.supabase.co/storage/v1/object/public/avatars/reports/pc014_monitor_display.jpg' : null),
    attachment: getReportAttachment({
      ...r,
      photo_url: r.photo_url || (r.report_id === 'LR-24' ? 'https://ieznsbzddanjwmnpvncs.supabase.co/storage/v1/object/public/avatars/reports/pc014_monitor_display.jpg' : null)
    }),
  };
}).sort(compareReportsByReportIdDesc);

export default function ReportsPage({ initialFilter = 'ALL', ...props }) {
  if (props.isStudent) {
    return (
      <StudentSubmittedReportsPage
        studentProfile={props.studentProfile}
        onReportProblem={props.onReportProblem}
        onSelectReport={props.onSelectReport}
      />
    );
  }

  return <TechnicalPersonnelReportsPage initialFilter={initialFilter} {...props} />;
}

// Module-level cache for technical reports so tab switching in sidenav is completely seamless
let cachedTechnicalReports = null;

function getInitialTechnicalReports() {
  if (cachedTechnicalReports && Array.isArray(cachedTechnicalReports) && cachedTechnicalReports.length > 0) {
    const hasBroken = cachedTechnicalReports.some(
      (r) => r.student_name === 'Student' || r.reportedByName === 'Student' || (!r.avatar && !r.profile_photo)
    );
    if (!hasBroken) return [...cachedTechnicalReports].sort(compareReportsByReportIdDesc);
  }
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const stored = sessionStorage.getItem('fixie_technical_reports_cache');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const hasBroken = parsed.some(
            (r) => r.student_name === 'Student' || r.reportedByName === 'Student' || (!r.avatar && !r.profile_photo)
          );
          if (!hasBroken) {
            const sorted = [...parsed].sort(compareReportsByReportIdDesc);
            cachedTechnicalReports = sorted;
            return sorted;
          }
        }
      }
    }
  } catch {}
  return [...defaultReports].sort(compareReportsByReportIdDesc);
}

// Helper to determine if a report has "On Hold" status
function isReportOnHold(report) {
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

// Helper to search strictly by Report ID (e.g. LR-27) or PC number (1-40)
function matchesReportIdOrPcNumber(report, searchQuery) {
  const cleanQuery = (searchQuery || '').trim().toLowerCase();
  if (!cleanQuery) return true;

  const normalizedQuery = cleanQuery.replace(/\s+/g, ' ');
  const queryAlpha = cleanQuery.replace(/[^a-z0-9]/gi, '');
  const isPureNumber = /^\d+$/.test(cleanQuery);
  const queryNum = isPureNumber ? parseInt(cleanQuery, 10) : null;

  // 1. Report ID matching (e.g. "LR-27", "lr-27", "lr 27", "lr27", "27")
  const rawReportId = (report.report_id || report.id || '').toLowerCase().trim();
  const reportIdNormalized = rawReportId.replace(/\s+/g, ' ');
  const reportIdAlpha = rawReportId.replace(/[^a-z0-9]/gi, '');
  const repNumMatch = rawReportId.match(/\d+/);
  const repNum = repNumMatch ? parseInt(repNumMatch[0], 10) : null;

  let matchReportId = false;
  if (isPureNumber) {
    if (
      repNum !== null &&
      (repNum === queryNum ||
        String(repNum) === cleanQuery ||
        String(repNum).padStart(2, '0') === cleanQuery)
    ) {
      matchReportId = true;
    }
  } else {
    matchReportId =
      reportIdNormalized.includes(normalizedQuery) ||
      (queryAlpha.length > 0 && reportIdAlpha.includes(queryAlpha));

    if (!matchReportId && repNum !== null && queryAlpha.startsWith('lr')) {
      const qNumMatch = queryAlpha.match(/\d+/);
      if (qNumMatch && parseInt(qNumMatch[0], 10) === repNum) {
        matchReportId = true;
      }
    }
  }

  // 2. PC Number matching (e.g. "PC-#14", "PC-14", "PC 14", "pc14", "14", "4", "PC 4")
  const rawUnit = (report.unit_number || report.unitNumber || '').toLowerCase().trim();
  const unitNormalized = rawUnit.replace(/\s+/g, ' ');
  const unitAlpha = rawUnit.replace(/[^a-z0-9]/gi, '');
  const pcNumMatch = rawUnit.match(/\d+/);
  const pcNum = pcNumMatch ? parseInt(pcNumMatch[0], 10) : null;

  let matchPc = false;
  if (isPureNumber) {
    if (
      pcNum !== null &&
      (pcNum === queryNum ||
        String(pcNum) === cleanQuery ||
        String(pcNum).padStart(2, '0') === cleanQuery)
    ) {
      matchPc = true;
    }
  } else {
    matchPc =
      unitNormalized.includes(normalizedQuery) ||
      (queryAlpha.length > 0 && unitAlpha.includes(queryAlpha));

    if (!matchPc && pcNum !== null && queryAlpha.startsWith('pc')) {
      const qNumMatch = queryAlpha.match(/\d+/);
      if (qNumMatch && parseInt(qNumMatch[0], 10) === pcNum) {
        matchPc = true;
      }
    }
  }

  return matchReportId || matchPc;
}

function TechnicalPersonnelReportsPage({
  initialFilter = 'ALL',
  onSelectReport: _onSelectReport,
}) {

  const [reportsList, setReportsList] = useState(getInitialTechnicalReports);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(!cachedTechnicalReports);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Tab state: 'DEFAULT' or 'ON_HOLD' (separated from status filter)
  const [activeTab, setActiveTab] = useState(() => {
    if (
      initialFilter === 'ON_HOLD' ||
      (typeof window !== 'undefined' &&
        (window.location.hash === '#reports-on-hold' ||
          window.location.hash === '#reports/on-hold' ||
          window.location.hash === '#on-hold'))
    ) {
      return 'ON_HOLD';
    }
    return 'DEFAULT';
  });

  // Status Filter state: 'ALL', 'SUBMITTED', 'UNDER_REVIEW', 'UNDER_REPAIR', 'RESOLVED'
  const [selectedStatusFilter, setSelectedStatusFilter] = useState(() => {
    if (initialFilter && initialFilter !== 'ON_HOLD') {
      return initialFilter;
    }
    return 'ALL';
  });

  useEffect(() => {
    if (initialFilter === 'ON_HOLD') {
      setActiveTab('ON_HOLD');
    } else if (initialFilter) {
      setSelectedStatusFilter(initialFilter);
      setActiveTab('DEFAULT');
    }
  }, [initialFilter]);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7; // Exactly 7 reports per page matching reference UI

  // Modal state
  const [activeReportModal, setActiveReportModal] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Synchronize activeReportModal if reportsList updates in realtime (prevent unnecessary re-renders)
  useEffect(() => {
    if (!activeReportModal) return;
    const match = reportsList.find(
      (r) =>
        (r.report_id && r.report_id === activeReportModal.report_id) ||
        (r.id && r.id === activeReportModal.id)
    );
    if (
      match &&
      (match.status !== activeReportModal.status ||
        match.remarks !== activeReportModal.remarks ||
        match.displayStatus !== activeReportModal.displayStatus ||
        match.display_status !== activeReportModal.display_status)
    ) {
      setActiveReportModal((prev) => (prev ? { ...prev, ...match } : null));
    }
  }, [reportsList, activeReportModal]);

  // Fetch live reports from Supabase
  const fetchLiveReports = async (showSpinner = false) => {
    if (showSpinner) setIsRefreshing(true);
    try {
      const [reportsRes, historyRes] = await Promise.all([
        supabase
          .from('reports')
          .select('*, students(*)')
          .order('report_id', { ascending: false }),
        supabase
          .from('report_status_history')
          .select('id, report_id, status, remarks, created_at')
          .order('created_at', { ascending: true }),
      ]);

      const { data, error } = reportsRes;
      const historyRows = historyRes.data || [];

      // Pre-group history rows by report_id (UUID)
      const historyByReportId = new Map();
      for (const row of historyRows) {
        if (!row?.report_id) continue;
        if (!historyByReportId.has(row.report_id)) {
          historyByReportId.set(row.report_id, []);
        }
        historyByReportId.get(row.report_id).push(row);
      }

      if (error) {
        console.warn('Could not fetch from Supabase reports, using current seed:', error.message);
      } else if (data && data.length > 0) {
        const mapped = data.map((r) => {
          const reportId = r.report_id || `LR-${r.id.slice(0, 4)}`;
          const st = resolveAuthenticReportStudent(reportId, r.students);

          // Populate canonicalUuidCache for instant lookup
          canonicalUuidCache.set(r.id, r.id);
          if (r.report_id) canonicalUuidCache.set(r.report_id, r.id);

          // Student name and year block formatting consistently
          const studentName = formatStudentName(st) || st.name || st.full_name || 'Student Reporter';
          const yearBlock = formatYearBlock(st.year_block) || '3rd year, BLK 2';
          const studentAvatar = st.avatar || getStudentAvatar(st);

          // Location split
          let locCenter = 'Computer Center';
          let locRoom = 'Room';
          if (r.room) {
            const parts = r.room.split(',');
            if (parts.length >= 2) {
              locCenter = parts[0].trim();
              locRoom = parts[1].trim();
            } else {
              locCenter = r.room;
            }
          }

          // Date & Time formatting (standardized to Philippine Time Asia/Manila)
          const parsedDT = parseReportDateTime(r);
          const submittedDate = parsedDT.submittedDate;
          const submittedTime = parsedDT.submittedTime;

          // Status badges matching Dashboard definitions
          let displayStatus = 'RESOLVED';
          let statusClass = 'status-resolved';
          if (r.status === 'Submitted') {
            displayStatus = 'SUBMITTED';
            statusClass = 'status-submitted';
          } else if (r.status === 'Reviewed' || r.status === 'Under Review') {
            displayStatus = 'UNDER REVIEW';
            statusClass = 'status-under-review';
          } else if (r.status === 'Under Repair') {
            displayStatus = 'UNDER REPAIR';
            statusClass = 'status-under-repair';
          } else if (r.status === 'On Hold' || r.status === 'on_hold') {
            displayStatus = 'ON HOLD';
            statusClass = 'status-on-hold';
          }

          // Pre-populate reportHistoryCache for instant modal opening with 0ms delay
          const reportSpecificHistory = historyByReportId.get(r.id) || [];
          const unified = buildUnifiedHistoryEntries({
            historyRows: reportSpecificHistory,
            currentReport: r,
            currentStatus: r.status,
            currentRemarks: r.remarks,
          });
          if (unified.entries && unified.entries.length > 0) {
            reportHistoryCache.set(r.id, unified.entries);
            if (r.report_id) reportHistoryCache.set(r.report_id, unified.entries);
          }

          return {
            id: r.id,
            canonical_uuid: r.id,
            canonicalUuid: r.id,
            report_id: r.report_id || `LR-${r.id.slice(0, 4)}`,
            unit_number: r.unit_number || 'PC-#01',
            unitNumber: r.unit_number || 'PC-#01',
            equipment: r.equipment || 'Equipment',
            student_name: studentName,
            reportedByName: studentName,
            student_year_block: yearBlock,
            reportedByYearBlock: yearBlock,
            student_id: st.student_id || 'N/A',
            studentId: st.student_id || 'N/A',
            student_email: st.email || '',
            email: st.email || '',
            profile_photo: st.profile_photo || r.students?.profile_photo || null,
            avatar: studentAvatar,
            students: st,
            location_center: locCenter,
            locationCenter: locCenter,
            location_room: locRoom,
            locationRoom: locRoom,
            submitted_date: submittedDate,
            submittedDate: submittedDate,
            submitted_time: submittedTime,
            submittedTime: submittedTime,
            raw_created_at: r.created_at,
            status: r.status,
            display_status: displayStatus,
            displayStatus: displayStatus,
            status_class: statusClass,
            statusClass: statusClass,
            description: r.description,
            remarks: r.remarks,
            photo_url: r.photo_url || null,
            attachment: getReportAttachment(r),
          };
        });

        mapped.sort(compareReportsByReportIdDesc);
        cachedTechnicalReports = mapped;
        try {
          if (typeof window !== 'undefined' && window.sessionStorage) {
            sessionStorage.setItem('fixie_technical_reports_cache', JSON.stringify(mapped));
          }
        } catch {}

        setReportsList(mapped);
      }
    } catch (err) {
      console.warn('Reports sync error:', err.message);
    } finally {
      setIsLoading(false);
      if (showSpinner) setIsRefreshing(false);
    }
  };

  // Reset all filters, search query, dropdowns, and pagination back to original default values
  const handleResetAllFilters = () => {
    setSelectedStatusFilter('ALL');
    setActiveTab('DEFAULT');
    setSearchQuery('');
    setStatusDropdownOpen(false);
    setCurrentPage(1);
    fetchLiveReports(false);
  };

  // Realtime replication & cross-component sync via centralized realtimeSyncService
  useEffect(() => {
    fetchLiveReports(false);

    // Realtime and Broadcast listener for instant multi-tab & cross-component sync
    const handleSyncPayload = (payload) => {
      if (!payload) return;
      const targetId = payload.report_id || payload.reportId || payload.id;
      const eventType = payload.eventType || (payload.report ? 'INSERT' : 'UPDATE');
      const newStatus = payload.new_status || payload.newStatus || payload.status;
      const newRemarks = payload.remarks !== undefined ? payload.remarks : payload.newRemarks;

      if (eventType === 'DELETE') {
        // DELETE: remove item directly by ID
        setReportsList((prevList) => {
          const updated = prevList.filter(
            (r) => r.report_id !== targetId && r.id !== targetId && r.canonicalUuid !== targetId
          );
          if (updated.length === prevList.length) return prevList;
          updated.sort(compareReportsByReportIdDesc);
          cachedTechnicalReports = updated;
          try {
            if (typeof window !== 'undefined' && window.sessionStorage) {
              sessionStorage.setItem('fixie_technical_reports_cache', JSON.stringify(updated));
            }
          } catch {}
          return updated;
        });
      } else if (eventType === 'INSERT') {
        // INSERT: dynamically look up authentic student and add new report item
        const rawReport = payload.report || payload.new || payload;
        const reportId = rawReport.report_id || rawReport.id || targetId || `LR-${Date.now()}`;

        const processInsert = async () => {
          let studentObj = rawReport.students;
          if (!studentObj || (!studentObj.name && !studentObj.first_name)) {
            const sid = rawReport.student_id || payload.student_id;
            if (sid) {
              studentObj = await fetchStudentForReport(sid);
            }
          }

          const st = resolveAuthenticReportStudent(reportId, studentObj);
          const studentName = formatStudentName(st) || st.name || st.full_name || rawReport.student_name || rawReport.reportedByName || 'Student Reporter';
          const yearBlock = formatYearBlock(st?.year_block || rawReport.student_year_block || rawReport.reportedByYearBlock) || '3rd year, BLK 2';
          const studentAvatar = st.avatar || getStudentAvatar(st);

          let locCenter = 'Computer Center';
          let locRoom = 'Room';
          if (rawReport.room) {
            const parts = String(rawReport.room).split(',');
            if (parts.length >= 2) {
              locCenter = parts[0].trim();
              locRoom = parts[1].trim();
            } else {
              locCenter = rawReport.room;
            }
          }

          const parsedDT = parseReportDateTime(rawReport);
          const submittedDate = parsedDT.submittedDate;
          const submittedTime = parsedDT.submittedTime;

          let displayStatus = 'RESOLVED';
          let statusClass = 'status-resolved';
          if (rawReport.status === 'Submitted' || rawReport.status === 'submitted') {
            displayStatus = 'SUBMITTED';
            statusClass = 'status-submitted';
          } else if (rawReport.status === 'Reviewed' || rawReport.status === 'Under Review' || rawReport.status === 'reviewed') {
            displayStatus = 'UNDER REVIEW';
            statusClass = 'status-under-review';
          } else if (rawReport.status === 'Under Repair' || rawReport.status === 'Under repair') {
            displayStatus = 'UNDER REPAIR';
            statusClass = 'status-under-repair';
          } else if (rawReport.status === 'On Hold' || rawReport.status === 'on_hold') {
            displayStatus = 'ON HOLD';
            statusClass = 'status-on-hold';
          }

          const newMapped = {
            id: rawReport.id || reportId,
            report_id: reportId,
            unit_number: rawReport.unit_number || rawReport.unitNumber || 'PC-#01',
            unitNumber: rawReport.unit_number || rawReport.unitNumber || 'PC-#01',
            equipment: rawReport.equipment || 'Equipment',
            student_name: studentName,
            reportedByName: studentName,
            student_year_block: yearBlock,
            reportedByYearBlock: yearBlock,
            student_id: st?.student_id || rawReport.student_id || 'N/A',
            studentId: st?.student_id || rawReport.student_id || 'N/A',
            student_email: st?.email || rawReport.student_email || '',
            email: st?.email || rawReport.student_email || '',
            profile_photo: st?.profile_photo || rawReport.profile_photo || null,
            avatar: studentAvatar,
            students: st,
            location_center: locCenter,
            locationCenter: locCenter,
            location_room: locRoom,
            locationRoom: locRoom,
            submitted_date: submittedDate,
            submittedDate: submittedDate,
            submitted_time: submittedTime,
            submittedTime: submittedTime,
            raw_created_at: rawReport.created_at || new Date().toISOString(),
            status: rawReport.status || 'Submitted',
            display_status: displayStatus,
            displayStatus: displayStatus,
            status_class: statusClass,
            statusClass: statusClass,
            description: rawReport.description || '',
            remarks: rawReport.remarks || null,
            photo_url: rawReport.photo_url || null,
            attachment: getReportAttachment(rawReport),
          };

          setReportsList((prevList) => {
            const exists = prevList.some(
              (r) =>
                r.report_id === reportId ||
                r.id === newMapped.id ||
                (rawReport.id && (r.id === rawReport.id || r.canonicalUuid === rawReport.id))
            );
            let updated;
            if (exists) {
              // Update in place if already present
              updated = prevList.map((r) =>
                r.report_id === reportId || r.id === newMapped.id || (rawReport.id && r.id === rawReport.id)
                  ? { ...r, ...newMapped }
                  : r
              );
            } else {
              updated = [newMapped, ...prevList];
            }
            updated.sort(compareReportsByReportIdDesc);
            cachedTechnicalReports = updated;
            try {
              if (typeof window !== 'undefined' && window.sessionStorage) {
                sessionStorage.setItem('fixie_technical_reports_cache', JSON.stringify(updated));
              }
            } catch {}
            return updated;
          });
        };

        processInsert();
        fetchLiveReports(false);
      } else if (targetId && (newStatus || newRemarks !== undefined)) {
        // UPDATE: replace item by ID safely with deduplication
        setReportsList((prevList) => {
          let hasMatch = false;
          const updated = prevList.map((r) => {
            const isMatch =
              r.report_id === targetId ||
              r.id === targetId ||
              (payload.canonicalUuid && (r.canonicalUuid === payload.canonicalUuid || r.id === payload.canonicalUuid));

            if (isMatch) {
              hasMatch = true;
              const effectiveStatus = newStatus || r.status;
              const effectiveRemarks = newRemarks !== undefined ? newRemarks : r.remarks;

              // Check if status & remarks are already identical (ignore duplicate)
              if (r.status === effectiveStatus && r.remarks === effectiveRemarks) {
                return r;
              }

              // Check out-of-order timestamp
              if (payload.updated_at && r.raw_created_at && new Date(payload.updated_at) < new Date(r.raw_created_at)) {
                return r;
              }

              let displayStatus = 'RESOLVED';
              let statusClass = 'status-resolved';
              if (effectiveStatus === 'Submitted') {
                displayStatus = 'SUBMITTED';
                statusClass = 'status-submitted';
              } else if (effectiveStatus === 'Reviewed' || effectiveStatus === 'Under Review') {
                displayStatus = 'UNDER REVIEW';
                statusClass = 'status-under-review';
              } else if (effectiveStatus === 'Under Repair' || effectiveStatus === 'Under repair') {
                displayStatus = 'UNDER REPAIR';
                statusClass = 'status-under-repair';
              } else if (effectiveStatus === 'On Hold' || effectiveStatus === 'on_hold') {
                displayStatus = 'ON HOLD';
                statusClass = 'status-on-hold';
              } else if (effectiveStatus === 'Resolved') {
                displayStatus = 'RESOLVED';
                statusClass = 'status-resolved';
              }

              return {
                ...r,
                status: effectiveStatus,
                display_status: displayStatus,
                displayStatus: displayStatus,
                status_class: statusClass,
                statusClass: statusClass,
                remarks: effectiveRemarks,
              };
            }
            return r;
          });

          if (!hasMatch) return prevList;
          updated.sort(compareReportsByReportIdDesc);
          cachedTechnicalReports = updated;
          try {
            if (typeof window !== 'undefined' && window.sessionStorage) {
              sessionStorage.setItem('fixie_technical_reports_cache', JSON.stringify(updated));
            }
          } catch {}
          return updated;
        });
      }
    };

    const unsubSync = subscribeToReportUpdates(handleSyncPayload);
    const unsubVisibility = registerVisibilityAndOnlineSync(() => fetchLiveReports(false));

    return () => {
      unsubSync();
      unsubVisibility();
    };
  }, []);

  // Compute live card metric numbers
  const stats = useMemo(() => {
    let total = reportsList.length;
    let underReview = 0;
    let underRepair = 0;
    let onHold = 0;
    let resolved = 0;

    reportsList.forEach((r) => {
      if (isReportOnHold(r)) {
        onHold += 1;
      } else if (
        r.status === 'Reviewed' ||
        r.status === 'Submitted' ||
        r.status === 'Under Review' ||
        (r.display_status || '').toUpperCase() === 'UNDER REVIEW' ||
        (r.displayStatus || '').toUpperCase() === 'UNDER REVIEW'
      ) {
        underReview += 1;
      } else if (
        r.status === 'Under Repair' ||
        r.status === 'under repair' ||
        (r.display_status || '').toUpperCase() === 'UNDER REPAIR' ||
        (r.displayStatus || '').toUpperCase() === 'UNDER REPAIR'
      ) {
        underRepair += 1;
      } else if (
        r.status === 'Resolved' ||
        r.status === 'resolved' ||
        (r.display_status || '').toUpperCase() === 'RESOLVED' ||
        (r.displayStatus || '').toUpperCase() === 'RESOLVED'
      ) {
        resolved += 1;
      }
    });

    return {
      total,
      underReview,
      underRepair,
      onHold,
      resolved,
    };
  }, [reportsList]);

  // Filtered and searched reports
  const filteredReports = useMemo(() => {
    const list = reportsList.filter((r) => {
      // 1. Tab & Status Filtering
      if (activeTab === 'ON_HOLD') {
        // "On Hold" is its own tab: show only On Hold reports
        if (!isReportOnHold(r)) return false;
      } else {
        // Default tab: On Hold reports belong in the On Hold tab
        if (isReportOnHold(r)) return false;

        // Status filter applies only to Submitted, Under Review, Under Repair, Resolved
        if (selectedStatusFilter === 'SUBMITTED') {
          const isSubmitted =
            r.status === 'Submitted' ||
            (r.display_status || '').toUpperCase() === 'SUBMITTED' ||
            (r.displayStatus || '').toUpperCase() === 'SUBMITTED';
          if (!isSubmitted) return false;
        } else if (selectedStatusFilter === 'UNDER_REVIEW') {
          const isUnderReview =
            (r.status === 'Reviewed' ||
              r.status === 'Under Review' ||
              (r.display_status || '').toUpperCase() === 'UNDER REVIEW' ||
              (r.displayStatus || '').toUpperCase() === 'UNDER REVIEW') &&
            r.status !== 'Submitted';
          if (!isUnderReview) return false;
        } else if (selectedStatusFilter === 'UNDER_REPAIR') {
          const isUnderRepair =
            r.status === 'Under Repair' ||
            r.status === 'under repair' ||
            (r.display_status || '').toUpperCase() === 'UNDER REPAIR' ||
            (r.displayStatus || '').toUpperCase() === 'UNDER REPAIR';
          if (!isUnderRepair) return false;
        } else if (selectedStatusFilter === 'RESOLVED') {
          const isResolved =
            r.status === 'Resolved' ||
            r.status === 'resolved' ||
            (r.display_status || '').toUpperCase() === 'RESOLVED' ||
            (r.displayStatus || '').toUpperCase() === 'RESOLVED';
          if (!isResolved) return false;
        }
      }

      // 2. Search query: ONLY by Report ID (e.g. LR-27) and PC number (1-40)
      if (searchQuery.trim()) {
        return matchesReportIdOrPcNumber(r, searchQuery);
      }

      return true;
    });

    return list.sort(compareReportsByReportIdDesc);
  }, [reportsList, activeTab, selectedStatusFilter, searchQuery]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedStatusFilter, activeTab]);

  // Paginate reports: 7 per page
  const totalPages = Math.max(1, Math.ceil(filteredReports.length / itemsPerPage));
  const paginatedReports = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return filteredReports.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredReports, currentPage, itemsPerPage]);

  const displayedCount = getDisplayedCount(currentPage, itemsPerPage, filteredReports.length);
  const visiblePages = getVisiblePages(currentPage, totalPages);

  // Ensure currentPage is valid if totalPages changes
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  // Avatar helper
  const getAvatar = (report) => {
    if (report?.avatar) return report.avatar;
    return (
      getStudentAvatar({
        name: report?.student_name || report?.reportedByName,
        student_id: report?.student_id || report?.studentId,
        email: report?.student_email || report?.email,
        profile_photo: report?.profile_photo,
      })
    );
  };

  // Status badge label helper (Status filter dropdown only works for Submitted, Under Review, Under Repair, Resolved, All Statuses)
  const getStatusLabel = (filterKey) => {
    switch (filterKey) {
      case 'SUBMITTED':
        return 'Submitted';
      case 'UNDER_REVIEW':
        return 'Under Review';
      case 'UNDER_REPAIR':
        return 'Under Repair';
      case 'RESOLVED':
        return 'Resolved';
      case 'ALL':
      default:
        return 'All Statuses';
    }
  };

  // Handle status update in modal across the workflow phases
  const handleUpdateStatus = async (reportId, newStatus, updatedHistory, newRemarks) => {
    setUpdatingStatus(true);
    const targetId = reportId || activeReportModal?.report_id || activeReportModal?.id;

    let displayStatus = 'RESOLVED';
    let statusClass = 'status-resolved';
    if (newStatus === 'Submitted') {
      displayStatus = 'SUBMITTED';
      statusClass = 'status-submitted';
    } else if (newStatus === 'Reviewed' || newStatus === 'Under Review') {
      displayStatus = 'UNDER REVIEW';
      statusClass = 'status-under-review';
    } else if (newStatus === 'Under Repair') {
      displayStatus = 'UNDER REPAIR';
      statusClass = 'status-under-repair';
    } else if (newStatus === 'On Hold') {
      displayStatus = 'ON HOLD';
      statusClass = 'status-on-hold';
    } else if (newStatus === 'Resolved') {
      displayStatus = 'RESOLVED';
      statusClass = 'status-resolved';
    }

    setReportsList((prevList) => {
      const updated = prevList.map((r) => {
        const isMatch =
          r.report_id === targetId ||
          r.id === targetId ||
          r.canonicalUuid === targetId ||
          r.canonical_uuid === targetId ||
          (activeReportModal &&
            (r.report_id === activeReportModal.report_id ||
              r.id === activeReportModal.id ||
              r.canonicalUuid === activeReportModal.canonicalUuid ||
              r.canonical_uuid === activeReportModal.canonical_uuid));

        if (isMatch) {
          return {
            ...r,
            status: newStatus,
            display_status: displayStatus,
            displayStatus: displayStatus,
            status_class: statusClass,
            statusClass: statusClass,
            history: updatedHistory || r.history,
            remarks: newRemarks !== undefined ? newRemarks : r.remarks,
          };
        }
        return r;
      });
      updated.sort(compareReportsByReportIdDesc);
      cachedTechnicalReports = updated;
      try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          sessionStorage.setItem('fixie_technical_reports_cache', JSON.stringify(updated));
        }
      } catch {}
      return updated;
    });

    setActiveReportModal((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        status: newStatus,
        display_status: displayStatus,
        displayStatus: displayStatus,
        status_class: statusClass,
        statusClass: statusClass,
        history: updatedHistory || prev.history,
        remarks: newRemarks !== undefined ? newRemarks : prev.remarks,
      };
    });

    try {
      const nowIso = new Date().toISOString();
      const updatePayload = {
        status: newStatus,
        updated_at: nowIso,
      };
      if (newRemarks !== undefined && newRemarks !== null) {
        updatePayload.remarks = newRemarks;
      }

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId);
      if (isUuid) {
        await supabase.from('reports').update(updatePayload).eq('id', targetId);
        await supabase.from('reports_of_student').update(updatePayload).eq('id', targetId);
      } else {
        await supabase.from('reports').update(updatePayload).eq('report_id', targetId);
        await supabase.from('reports_of_student').update(updatePayload).eq('report_id', targetId);
      }

      broadcastReportStatusUpdate({
        reportId: targetId,
        newStatus,
        status: newStatus,
        remarks: newRemarks,
        updatedAt: nowIso,
      });
    } catch (err) {
      console.warn('Update exception in reports:', err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <div className="reports-page-container">
      {/* Page Title & Subtitle Header - Matches Students Page Banner */}
      <Banner
        title="Report Management"
        subtitle="Review submitted laboratory reports, track maintenance progress, and manage issue resolution."
        className="reports-hero-banner"
        ariaLabel="Report Management Header"
      />

      {/* 4 Metric Summary Cards Grid - Matches Students Page Stat Cards */}
      <div className="reports-metric-cards-grid">
        {/* 1. TOTAL REPORTS */}
        <div
          className={`student-metric-card tech-stat-card card-all-guides ${activeTab === 'DEFAULT' && selectedStatusFilter === 'ALL' ? 'card-filter-active' : ''}`}
          onClick={() => {
            setActiveTab('DEFAULT');
            setSelectedStatusFilter('ALL');
            setCurrentPage(1);
          }}
          role="button"
          tabIndex={0}
          title="Show all reports"
        >
          <div className="student-metric-header">
            <span className="student-metric-title">TOTAL REPORTS</span>
            <div className="student-metric-badge badge-active-green" aria-hidden="true">
              <FileText size={18} strokeWidth={2.2} />
            </div>
          </div>
          <div className="student-metric-value-wrap">
            <span className="student-metric-number">{isLoading && (!reportsList || reportsList.length === 0) ? '...' : stats.total}</span>
          </div>
          <p className="student-metric-caption">All submitted laboratory tickets.</p>
        </div>

        {/* 2. UNDER REVIEW */}
        <div
          className={`student-metric-card ${activeTab === 'DEFAULT' && selectedStatusFilter === 'UNDER_REVIEW' ? 'card-filter-active' : ''}`}
          onClick={() => {
            setActiveTab('DEFAULT');
            setSelectedStatusFilter((prev) => (activeTab === 'DEFAULT' && prev === 'UNDER_REVIEW' ? 'ALL' : 'UNDER_REVIEW'));
            setCurrentPage(1);
          }}
          role="button"
          tabIndex={0}
          title="Filter by Under Review"
        >
          <div className="student-metric-header">
            <span className="student-metric-title">UNDER REVIEW</span>
            <div className="student-metric-badge badge-review-yellow" aria-hidden="true">
              <Clock size={18} strokeWidth={2.2} className="metric-icon-svg icon-yellow" />
            </div>
          </div>
          <div className="student-metric-value-wrap">
            <span className="student-metric-number font-serif">{isLoading && (!reportsList || reportsList.length === 0) ? '...' : stats.underReview}</span>
          </div>
          <p className="student-metric-caption">Awaiting triage & technician review.</p>
        </div>

        {/* 3. UNDER REPAIR */}
        <div
          className={`student-metric-card ${activeTab === 'DEFAULT' && selectedStatusFilter === 'UNDER_REPAIR' ? 'card-filter-active' : ''}`}
          onClick={() => {
            setActiveTab('DEFAULT');
            setSelectedStatusFilter((prev) => (activeTab === 'DEFAULT' && prev === 'UNDER_REPAIR' ? 'ALL' : 'UNDER_REPAIR'));
            setCurrentPage(1);
          }}
          role="button"
          tabIndex={0}
          title="Filter by Under Repair"
        >
          <div className="student-metric-header">
            <span className="student-metric-title">UNDER REPAIR</span>
            <div className="student-metric-badge badge-repair-blue" aria-hidden="true">
              <Wrench size={18} strokeWidth={2.2} className="metric-icon-svg icon-blue" />
            </div>
          </div>
          <div className="student-metric-value-wrap">
            <span className="student-metric-number font-serif">{isLoading && (!reportsList || reportsList.length === 0) ? '...' : stats.underRepair}</span>
          </div>
          <p className="student-metric-caption">Currently being serviced & fixed.</p>
        </div>

        {/* 4. RESOLVED */}
        <div
          className={`student-metric-card ${activeTab === 'DEFAULT' && selectedStatusFilter === 'RESOLVED' ? 'card-filter-active' : ''}`}
          onClick={() => {
            setActiveTab('DEFAULT');
            setSelectedStatusFilter((prev) => (activeTab === 'DEFAULT' && prev === 'RESOLVED' ? 'ALL' : 'RESOLVED'));
            setCurrentPage(1);
          }}
          role="button"
          tabIndex={0}
          title="Filter by Resolved"
        >
          <div className="student-metric-header">
            <span className="student-metric-title">RESOLVED</span>
            <div className="student-metric-badge badge-resolved-green" aria-hidden="true">
              <CheckCircle2 size={18} strokeWidth={2.2} className="metric-icon-svg icon-green" />
            </div>
          </div>
          <div className="student-metric-value-wrap">
            <span className="student-metric-number font-serif">{isLoading && (!reportsList || reportsList.length === 0) ? '...' : stats.resolved}</span>
          </div>
          <p className="student-metric-caption">Issues successfully fixed & closed.</p>
        </div>
      </div>

      {/* Filter and Search Bar Controls Row */}
      <div className="reports-controls-bar">
        {/* Search Input Box (Search ONLY by Report ID and PC number) */}
        <div className="reports-search-box-wrapper">
          <Search size={15} className="reports-search-icon" />
          <input
            type="text"
            className="reports-search-input"
            placeholder="Search by report ID or PC number"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Status Filter Dropdown (Separated from On Hold tab) */}
        <div className="reports-dropdown-relative">
          <button
            type="button"
            className="reports-filter-dropdown-btn"
            onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
            aria-expanded={statusDropdownOpen}
          >
            <span>{getStatusLabel(selectedStatusFilter)}</span>
            <ChevronDown size={14} className={`dropdown-arrow-icon ${statusDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {statusDropdownOpen && (
            <div className="reports-dropdown-menu">
              <button
                type="button"
                className={`dropdown-menu-opt ${activeTab === 'DEFAULT' && selectedStatusFilter === 'ALL' ? 'opt-active' : ''}`}
                onClick={() => {
                  setSelectedStatusFilter('ALL');
                  setActiveTab('DEFAULT');
                  setStatusDropdownOpen(false);
                  setCurrentPage(1);
                }}
              >
                <span>All Statuses</span>
                {activeTab === 'DEFAULT' && selectedStatusFilter === 'ALL' && <Check size={14} className="opt-check" />}
              </button>
              <button
                type="button"
                className={`dropdown-menu-opt ${activeTab === 'DEFAULT' && selectedStatusFilter === 'SUBMITTED' ? 'opt-active' : ''}`}
                onClick={() => {
                  setSelectedStatusFilter('SUBMITTED');
                  setActiveTab('DEFAULT');
                  setStatusDropdownOpen(false);
                  setCurrentPage(1);
                }}
              >
                <span>Submitted</span>
                {activeTab === 'DEFAULT' && selectedStatusFilter === 'SUBMITTED' && <Check size={14} className="opt-check" />}
              </button>
              <button
                type="button"
                className={`dropdown-menu-opt ${activeTab === 'DEFAULT' && selectedStatusFilter === 'UNDER_REVIEW' ? 'opt-active' : ''}`}
                onClick={() => {
                  setSelectedStatusFilter('UNDER_REVIEW');
                  setActiveTab('DEFAULT');
                  setStatusDropdownOpen(false);
                  setCurrentPage(1);
                }}
              >
                <span>Under Review</span>
                {activeTab === 'DEFAULT' && selectedStatusFilter === 'UNDER_REVIEW' && <Check size={14} className="opt-check" />}
              </button>
              <button
                type="button"
                className={`dropdown-menu-opt ${activeTab === 'DEFAULT' && selectedStatusFilter === 'UNDER_REPAIR' ? 'opt-active' : ''}`}
                onClick={() => {
                  setSelectedStatusFilter('UNDER_REPAIR');
                  setActiveTab('DEFAULT');
                  setStatusDropdownOpen(false);
                  setCurrentPage(1);
                }}
              >
                <span>Under Repair</span>
                {activeTab === 'DEFAULT' && selectedStatusFilter === 'UNDER_REPAIR' && <Check size={14} className="opt-check" />}
              </button>
              <button
                type="button"
                className={`dropdown-menu-opt ${activeTab === 'DEFAULT' && selectedStatusFilter === 'RESOLVED' ? 'opt-active' : ''}`}
                onClick={() => {
                  setSelectedStatusFilter('RESOLVED');
                  setActiveTab('DEFAULT');
                  setStatusDropdownOpen(false);
                  setCurrentPage(1);
                }}
              >
                <span>Resolved</span>
                {activeTab === 'DEFAULT' && selectedStatusFilter === 'RESOLVED' && <Check size={14} className="opt-check" />}
              </button>
            </div>
          )}
        </div>

        {/* Dedicated Clickable On Hold Tab Pill Button */}
        <button
          type="button"
          className={`reports-on-hold-pill-btn ${activeTab === 'ON_HOLD' ? 'pill-active' : ''}`}
          onClick={() => {
            setActiveTab((prev) => (prev === 'ON_HOLD' ? 'DEFAULT' : 'ON_HOLD'));
            setStatusDropdownOpen(false);
            setCurrentPage(1);
          }}
          aria-pressed={activeTab === 'ON_HOLD'}
          title="On Hold tab"
        >
          <span>On Hold</span>
          <span className="reports-on-hold-badge-count">{isLoading && (!reportsList || reportsList.length === 0) ? '...' : stats.onHold}</span>
        </button>

        {/* Reset All Filters Button */}
        <button
          type="button"
          className="reports-refresh-btn"
          title="Reset all filters"
          aria-label="Reset all filters and restore default reports list"
          onClick={handleResetAllFilters}
        >
          <RotateCw size={15} className={`refresh-icon ${isRefreshing ? 'spin-anim' : ''}`} />
        </button>
      </div>

      {/* Main Reports Data Table */}
      <div className="reports-table-card-container">
        <div className="recent-reports-table-scroll-frame">
          <table className="recent-reports-data-table reports-data-table">
            <thead>
              <tr className="reports-table-heading-row">
                <th scope="col" className="th-id">ID</th>
                <th scope="col" className="th-equipment">EQUIPMENT</th>
                <th scope="col" className="th-reported">REPORTED BY</th>
                <th scope="col" className="th-location">LOCATION</th>
                <th scope="col" className="th-submitted">SUBMITTED AT</th>
                <th scope="col" className="th-status">STATUS</th>
                <th scope="col" className="th-action"><span className="sr-only">Action</span></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (!reportsList || reportsList.length === 0) ? (
                [...Array(7)].map((_, idx) => (
                  <tr key={`loading-reports-row-${idx}`} className="reports-table-data-row loading-skeleton-row">
                    <td className="cell-id"><div className="skeleton-line skeleton-badge" /></td>
                    <td className="cell-equipment"><div className="skeleton-line skeleton-title" /><div className="skeleton-line skeleton-sub" /></td>
                    <td className="cell-reported"><div className="skeleton-line skeleton-title" /></td>
                    <td className="cell-location"><div className="skeleton-line skeleton-title" /></td>
                    <td className="cell-submitted"><div className="skeleton-line skeleton-title" /></td>
                    <td className="cell-status"><div className="skeleton-line skeleton-pill" /></td>
                    <td className="cell-action"><div className="skeleton-line skeleton-btn" /></td>
                  </tr>
                ))
              ) : paginatedReports.length > 0 ? (
                paginatedReports.map((report) => {
                  const avatar = getAvatar(report);
                  return (
                    <tr key={report.id || report.report_id} className="reports-table-data-row">
                      {/* Column 1: ID Badge */}
                      <td className="cell-id">
                        <span className="report-id-pill-badge">{report.report_id || report.id}</span>
                      </td>

                      {/* Column 2: Equipment */}
                      <td className="cell-equipment">
                        <div className="cell-stack-block">
                          <span className="cell-main-text">{report.unit_number || report.unitNumber}</span>
                          <span className="cell-sub-text">{report.equipment}</span>
                        </div>
                      </td>

                      {/* Column 3: Reported By */}
                      <td className="cell-reported">
                        <div className="reporter-avatar-row">
                          <div className="reporter-avatar-frame">
                            {avatar ? (
                              <img
                                src={avatar}
                                alt={report.student_name || report.reportedByName}
                                className="reporter-avatar-img"
                              />
                            ) : (
                              <div className="reporter-avatar-fallback">
                                {(report.student_name || report.reportedByName)?.charAt(0) || 'U'}
                              </div>
                            )}
                          </div>
                          <div className="cell-stack-block">
                            <span className="cell-main-text">{report.student_name || report.reportedByName}</span>
                            <span className="cell-sub-text">{report.student_year_block || report.reportedByYearBlock}</span>
                          </div>
                        </div>
                      </td>

                      {/* Column 4: Location */}
                      <td className="cell-location">
                        <div className="cell-stack-block">
                          <span className="cell-main-text">{report.location_center || report.locationCenter}</span>
                          <span className="cell-sub-text">{report.location_room || report.locationRoom}</span>
                        </div>
                      </td>

                      {/* Column 5: Submitted At */}
                      <td className="cell-submitted">
                        <div className="cell-stack-block">
                          <span className="cell-main-text">{report.submitted_date || report.submittedDate}</span>
                          <span className="cell-sub-text">{report.submitted_time || report.submittedTime}</span>
                        </div>
                      </td>

                      {/* Column 6: Status Capsule */}
                      <td className="cell-status">
                        <span className={`status-pill-capsule ${report.status_class || report.statusClass}`}>
                          {report.display_status || report.displayStatus}
                        </span>
                      </td>

                      {/* Column 7: View Action Button */}
                      <td className="cell-action">
                        <button
                          type="button"
                          className="btn-view-report-dark"
                          onClick={() => {
                            setActiveReportModal(report);
                          }}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" className="reports-empty-cell" style={{ padding: '36px 16px' }}>
                    <div className="reports-empty-state">
                      <p>No reports match your current search query or filter selection.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer: Results Counter and Pagination */}
        <div className="reports-table-footer">
          <span className="showing-reports-count">
            Showing <strong>{displayedCount}</strong> of{' '}
            <strong>{filteredReports.length}</strong> results
          </span>

          <div className="reports-pagination-controls">
            <button
              type="button"
              className="reports-page-nav-btn"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              aria-label="Previous page"
            >
              Previous
            </button>

            {visiblePages.map((pageNum) => (
              <button
                key={pageNum}
                type="button"
                className={`reports-page-num-btn ${currentPage === pageNum ? 'active-page-pill' : ''}`}
                onClick={() => setCurrentPage(pageNum)}
              >
                {pageNum}
              </button>
            ))}

            <button
              type="button"
              className="reports-page-nav-btn"
              disabled={currentPage >= totalPages || filteredReports.length === 0}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Next page"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* ====================================================
          REPORT DETAILS MODAL
          ==================================================== */}
      {activeReportModal && (
        <ReportDetailsModal
          report={activeReportModal}
          onClose={() => setActiveReportModal(null)}
          onUpdateStatus={handleUpdateStatus}
          isUpdating={updatingStatus}
        />
      )}
    </div>
  );
}

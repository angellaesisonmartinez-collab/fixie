import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  RotateCw,
  User,
  UserPlus,
  ChevronDown,
  X,
  Check,
  AlertCircle,
  Eye,
  Edit2,
  UserX,
  UserCheck,
  CheckCircle2,
  Calendar,
  Mail,
  BookOpen,
  Hash,
  Lock
} from 'lucide-react';
import { supabase, safeRealtimeChannel, safeRemoveChannel } from '../lib/supabase';
import {
  subscribeToStudentUpdates,
  registerVisibilityAndOnlineSync,
  broadcastStudentChange,
} from '../lib/realtimeSyncService';
import { sendStudentCredentialsEmail, generateDefaultStudentPassword } from '../lib/emailService';
import { getVisiblePages, getDisplayedCount } from '../lib/paginationUtils';
import {
  formatStudentName,
  formatYearBlock,
  formatStudentEmail,
  STUDENT_ID_REGEX,
  formatStudentIdInput,
} from '../lib/studentFormatUtils';
import bcrypt from 'bcryptjs';
import Banner from './Banner';
import fixieMascotSuccess from '../assets/fixie-mascot-success.png';
import fixieMascotSad from '../assets/fixie-mascot-sad.png';

import { getStudentAvatar, getStudentInitials } from '../lib/studentAvatarUtils';

// Official Year & Block list with 'BLK' format and '3rd year, BLK 3'
export const YEAR_BLOCK_OPTIONS = [
  '1st year, BLK 1',
  '1st year, BLK 2',
  '2nd year, BLK 1',
  '2nd year, BLK 2',
  '3rd year, BLK 1',
  '3rd year, BLK 2',
  '3rd year, BLK 3',
  '4th year, BLK 1',
  '4th year, BLK 2',
];

// Initial default seed matching reference screenshot and Supabase students
const defaultStudents = [
  // Page 1: 7 students exactly matching reference screenshot
  {
    id: 's-01',
    student_id: '24-0041-147',
    name: 'Angel Lae Martinez',
    first_name: 'Angel Lae',
    middle_name: 'Sison',
    last_name: 'Martinez',
    year_block: '3rd year, BLK 2',
    email: 'martinezangellaewup@gmail.com',
    date_registered: '2026-09-28',
    created_at: '2026-09-28T08:30:00.000Z',
    status: 'active',
    must_change_password: false,
  },
  {
    id: 's-02',
    student_id: '24-2026-340',
    name: 'Jennelyn Vergara',
    first_name: 'Jennelyn',
    middle_name: 'Garcia',
    last_name: 'Vergara',
    year_block: '3rd year, BLK 2',
    email: 'jennelynvergara@gmail.com',
    date_registered: '2026-09-28',
    created_at: '2026-09-28T08:15:00.000Z',
    status: 'active',
    must_change_password: false,
  },
  {
    id: 's-03',
    student_id: '24-7345-853',
    name: 'Reyn Arahan',
    first_name: 'Reyn',
    middle_name: null,
    last_name: 'Arahan',
    year_block: '3rd year, BLK 1',
    email: 'reynarahan@gmail.com',
    date_registered: '2026-09-27',
    created_at: '2026-09-27T09:00:00.000Z',
    status: 'active',
    must_change_password: false,
  },
  {
    id: 's-04',
    student_id: '24-0031-267',
    name: 'Juan Dela Cruz',
    first_name: 'Juan',
    middle_name: 'Navarro',
    last_name: 'Dela Cruz',
    year_block: '2nd year, BLK 2',
    email: 'jualdelacruz@gmail.com',
    date_registered: '2026-09-26',
    created_at: '2026-09-26T14:00:00.000Z',
    status: 'active',
    must_change_password: false,
  },
  {
    id: 's-05',
    student_id: '24-8521-063',
    name: 'Maria Reyes',
    first_name: 'Maria',
    middle_name: 'Clara',
    last_name: 'Reyes',
    year_block: '1st year, BLK 1',
    email: 'mariareyes@gmail.com',
    date_registered: '2026-09-26',
    created_at: '2026-09-26T10:00:00.000Z',
    status: 'active',
    must_change_password: false,
  },
  {
    id: 's-06',
    student_id: '24-1003-101',
    name: 'Jeane Kelly Mina',
    first_name: 'Jeane Kelly',
    middle_name: 'Ramos',
    last_name: 'Mina',
    year_block: '3rd year, BLK 2',
    email: 'jeanekellymina@gmail.com',
    date_registered: '2026-09-25',
    created_at: '2026-09-25T16:00:00.000Z',
    status: 'active',
    must_change_password: false,
  },
  {
    id: 's-07',
    student_id: '24-2745-132',
    name: 'Jazmin Bayudan',
    first_name: 'Jazmin',
    middle_name: 'Dela Cruz',
    last_name: 'Bayudan',
    year_block: '3rd year, BLK 2',
    email: 'jazminbayudan@gmail.com',
    date_registered: '2026-09-25',
    created_at: '2026-09-25T11:00:00.000Z',
    status: 'active',
    must_change_password: false,
  },
  // Remaining active students (including Maria Santos Ortiz)
  {
    id: 's-08',
    student_id: '24-0132-062',
    name: 'Emmanuel Gaspar',
    first_name: 'Emmanuel',
    middle_name: 'Bautista',
    last_name: 'Gaspar',
    year_block: '3rd year, BLK 1',
    email: 'emmang@gmail.com',
    date_registered: '2026-09-24',
    created_at: '2026-09-24T10:00:00.000Z',
    status: 'active',
    must_change_password: false,
  },
  {
    id: 's-09',
    student_id: '24-2026-106',
    name: 'Bianca Allyzon Antonio',
    first_name: 'Bianca Allyzon',
    middle_name: 'Reyes',
    last_name: 'Antonio',
    year_block: '3rd year, BLK 1',
    email: 'bianca@gmail.com',
    date_registered: '2026-09-23',
    created_at: '2026-09-23T10:00:00.000Z',
    status: 'active',
    must_change_password: false,
  },
  {
    id: 's-10',
    student_id: '24-2026-107',
    name: 'Chryztel Geene Salvador',
    first_name: 'Chryztel Geene',
    middle_name: 'Flores',
    last_name: 'Salvador',
    year_block: '3rd year, BLK 1',
    email: 'geene@gmail.com',
    date_registered: '2026-09-22',
    created_at: '2026-09-22T10:00:00.000Z',
    status: 'active',
    must_change_password: false,
  },
  {
    id: 's-11',
    student_id: '24-2026-108',
    name: 'John Lester Tan',
    first_name: 'John Lester',
    middle_name: 'Mercado',
    last_name: 'Tan',
    year_block: '3rd year, BLK 1',
    email: 'lester@gmail.com',
    date_registered: '2026-09-21',
    created_at: '2026-09-21T10:00:00.000Z',
    status: 'active',
    must_change_password: false,
  },
  {
    id: 's-12',
    student_id: '24-2026-109',
    name: 'Justine Kate Abello',
    first_name: 'Justine Kate',
    middle_name: 'Castro',
    last_name: 'Abello',
    year_block: '3rd year, BLK 2',
    email: 'kate@gmail.com',
    date_registered: '2026-09-20',
    created_at: '2026-09-20T10:00:00.000Z',
    status: 'active',
    must_change_password: false,
  },
  {
    id: 's-13',
    student_id: '24-0872-090',
    name: 'Maria Ortiz',
    first_name: 'Maria',
    middle_name: 'Santos',
    last_name: 'Ortiz',
    year_block: '3rd year, BLK 1',
    email: 'maria.ortiz@gmail.com',
    date_registered: '2026-09-10',
    created_at: '2026-09-10T10:00:00.000Z',
    status: 'active',
    must_change_password: false,
  },
  // Deactivated accounts (registered in September 2026)
  {
    id: 's-14',
    student_id: '24-4011-088',
    name: 'Phia Cayetano',
    first_name: 'Phia',
    middle_name: null,
    last_name: 'Cayetano',
    year_block: '4th year, BLK 1',
    email: 'phia.cayetano@gmail.com',
    date_registered: '2026-09-01',
    created_at: '2026-09-01T10:00:00.000Z',
    status: 'deactivated',
    must_change_password: false,
  },
  {
    id: 's-15',
    student_id: '22-0941-301',
    name: 'Alyssa Ramos',
    first_name: 'Alyssa',
    middle_name: 'Mae',
    last_name: 'Ramos',
    year_block: '1st year, BLK 1',
    email: 'alyssa.ramos@gmail.com',
    date_registered: '2026-09-01',
    created_at: '2026-09-01T10:00:00.000Z',
    status: 'deactivated',
    must_change_password: false,
  },
].map((st) => ({
  ...st,
  name: formatStudentName(st),
  year_block: formatYearBlock(st.year_block),
}));

// Helper to format date strings into "Month DD, YYYY" (e.g. Sept 28, 2026 or Oct 19, 2026)
const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'
];

function formatDisplayDate(dateInput) {
  if (!dateInput) return 'Sept 01, 2026';
  try {
    const parts = String(dateInput).split('T')[0].split('-');
    if (parts.length === 3) {
      const year = parts[0] || '2026';
      const monthIdx = parseInt(parts[1], 10) - 1;
      const monthName = MONTH_NAMES[monthIdx] || 'Sept';
      const day = parseInt(parts[2], 10);
      return `${monthName} ${day}, ${year}`;
    }
    const d = new Date(dateInput);
    if (!isNaN(d.getTime())) {
      const monthName = MONTH_NAMES[d.getMonth()] || 'Sept';
      const day = d.getDate();
      const year = d.getFullYear() || 2026;
      return `${monthName} ${day}, ${year}`;
    }
  } catch {
    // fallback
  }
  return 'Sept 01, 2026';
}

/**
 * Comparator to sort students by Date Registered, newest first.
 * - Uses actual registration timestamps from Supabase, not Student ID or name.
 * - Compares calendar registration date first (newest date first).
 * - If calendar registration dates are identical, breaks ties with actual registration timestamp (created_at).
 */
export const sortStudentsByRegistrationDateDesc = (a, b) => {
  const dateStrA = a?.date_registered
    ? String(a.date_registered).split('T')[0]
    : (a?.created_at ? String(a.created_at).split('T')[0] : '');
  const dateStrB = b?.date_registered
    ? String(b.date_registered).split('T')[0]
    : (b?.created_at ? String(b.created_at).split('T')[0] : '');

  const timeA = dateStrA ? new Date(dateStrA).getTime() : 0;
  const timeB = dateStrB ? new Date(dateStrB).getTime() : 0;

  if (timeB !== timeA) {
    return timeB - timeA;
  }

  // Exact timestamp tiebreaker if dates are identical
  const hasTimeA = a?.date_registered && (String(a.date_registered).includes('T') || String(a.date_registered).includes(':'));
  const hasTimeB = b?.date_registered && (String(b.date_registered).includes('T') || String(b.date_registered).includes(':'));

  const exactTimeA = hasTimeA
    ? new Date(a.date_registered).getTime()
    : new Date(a?.created_at || a?.date_registered || 0).getTime() || 0;
  const exactTimeB = hasTimeB
    ? new Date(b.date_registered).getTime()
    : new Date(b?.created_at || b?.date_registered || 0).getTime() || 0;

  if (exactTimeB !== exactTimeA) {
    return exactTimeB - exactTimeA;
  }

  return 0;
};

const initialStudents = [...defaultStudents].sort(sortStudentsByRegistrationDateDesc);

export default function StudentsPage() {
  const [studentsList, setStudentsList] = useState(initialStudents);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'DEACTIVATED'
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [yearBlockFilter, setYearBlockFilter] = useState('ALL');
  const [yearBlockDropdownOpen, setYearBlockDropdownOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  // Modals state
  const [viewingStudent, setViewingStudent] = useState(null);
  const [editingStudent, setEditingStudent] = useState(null);
  const [disablingStudent, setDisablingStudent] = useState(null);
  const [deactivateSuccessData, setDeactivateSuccessData] = useState(null);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [regSuccessData, setRegSuccessData] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Register Form State
  const [regFirstName, setRegFirstName] = useState('');
  const [regMiddleName, setRegMiddleName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regYearBlock, setRegYearBlock] = useState('');
  const [regYearBlockDropdownOpen, setRegYearBlockDropdownOpen] = useState(false);
  const regDropdownRef = useRef(null);
  const [regStudentId, setRegStudentId] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regCheckIdVerified, setRegCheckIdVerified] = useState(false);
  const [regCheckEmailVerified, setRegCheckEmailVerified] = useState(false);
  const [regError, setRegError] = useState('');
  const [regHasAttemptedSubmit, setRegHasAttemptedSubmit] = useState(false);
  const [regSubmitting, setRegSubmitting] = useState(false);

  const resetRegisterForm = () => {
    setRegFirstName('');
    setRegMiddleName('');
    setRegLastName('');
    setRegStudentId('');
    setRegEmail('');
    setRegYearBlock('');
    setRegYearBlockDropdownOpen(false);
    setRegCheckIdVerified(false);
    setRegCheckEmailVerified(false);
    setRegError('');
    setRegHasAttemptedSubmit(false);
  };

  // Click outside to close register Year & Block dropdown
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (regDropdownRef.current && !regDropdownRef.current.contains(e.target)) {
        setRegYearBlockDropdownOpen(false);
      }
    };
    if (regYearBlockDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [regYearBlockDropdownOpen]);

  // Check registration form validity: all required fields filled, Student ID matches XX-XXXX-XXX, and both checkboxes checked
  const isRegFormValid = Boolean(
    regFirstName.trim() &&
    regLastName.trim() &&
    regYearBlock &&
    regStudentId.trim() &&
    STUDENT_ID_REGEX.test(regStudentId.trim()) &&
    regEmail.trim() &&
    regCheckIdVerified &&
    regCheckEmailVerified
  );

  // Edit Form State
  const [editYearBlock, setEditYearBlock] = useState('3rd year, BLK 2');
  const [editYearBlockDropdownOpen, setEditYearBlockDropdownOpen] = useState(false);
  const editDropdownRef = useRef(null);
  const [editEmail, setEditEmail] = useState('');
  const [editCheckVerified, setEditCheckVerified] = useState(false);
  const [editError, setEditError] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editSuccessData, setEditSuccessData] = useState(null);

  // Click outside to close edit Year & Block dropdown
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (editDropdownRef.current && !editDropdownRef.current.contains(e.target)) {
        setEditYearBlockDropdownOpen(false);
      }
    };
    if (editYearBlockDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [editYearBlockDropdownOpen]);

  // Fetch live students from Supabase
  const fetchStudents = async (showSpinner = false) => {
    if (showSpinner) setIsRefreshing(true);
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('date_registered', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Could not fetch from Supabase students table, using cached data:', error.message);
      } else if (data && data.length > 0) {
        const mapped = data.map((st) => {
          const fullName = formatStudentName(st) || st.name || `${st.first_name || ''} ${st.last_name || ''}`.trim();
          const yearBlock = formatYearBlock(st.year_block);
          const normStatus = st.status === 'active' ? 'active' : 'deactivated';
          const cleanEmail = formatStudentEmail(st.email);
          return {
            ...st,
            email: cleanEmail,
            name: fullName,
            year_block: yearBlock,
            date_registered: st.date_registered || (st.created_at ? st.created_at.split('T')[0] : '2026-09-01'),
            status: normStatus,
          };
        });

        // Default sorting: actual registration timestamp descending, newest first
        mapped.sort(sortStudentsByRegistrationDateDesc);

        setStudentsList(mapped);
      }
    } catch (err) {
      console.warn('Network sync note:', err.message);
    } finally {
      if (showSpinner) setIsRefreshing(false);
    }
  };

  // Reset all filters, search query, dropdowns, and pagination back to original default values
  const handleResetAllFilters = () => {
    setSelectedStatusFilter('ALL');
    setYearBlockFilter('ALL');
    setSearchQuery('');
    setStatusDropdownOpen(false);
    setYearBlockDropdownOpen(false);
    setCurrentPage(1);
    fetchStudents(false);
  };

  useEffect(() => {
    fetchStudents(false);

    // Direct local state updater for instant UI reaction
    const handleStudentLiveUpdate = (payload) => {
      if (!payload) return;
      const targetId = payload.student_id || payload.id;
      const eventType = payload.eventType || 'UPDATE';

      if (eventType === 'DELETE') {
        // DELETE: remove directly by ID
        setStudentsList((prev) => prev.filter((s) => s.id !== targetId && s.student_id !== targetId));
      } else if (eventType === 'INSERT') {
        // INSERT: add new student directly to top of list
        const raw = payload.student || payload.new || payload;
        const fullName = formatStudentName(raw) || raw.name || `${raw.first_name || ''} ${raw.last_name || ''}`.trim();
        const yearBlock = formatYearBlock(raw.year_block);
        const normStatus = raw.status === 'active' ? 'active' : 'deactivated';
        const newSt = {
          ...raw,
          email: formatStudentEmail(raw.email),
          name: fullName,
          year_block: yearBlock,
          date_registered: raw.date_registered || (raw.created_at ? raw.created_at.split('T')[0] : '2026-09-01'),
          status: normStatus,
        };
        setStudentsList((prev) => {
          const exists = prev.some((s) => s.id === newSt.id || s.student_id === newSt.student_id);
          if (exists) return prev;
          const updated = [newSt, ...prev];
          updated.sort(sortStudentsByRegistrationDateDesc);
          return updated;
        });
      } else {
        // UPDATE: replace student by ID
        setStudentsList((prev) =>
          prev.map((s) => {
            if (s.id === targetId || s.student_id === targetId) {
              const updatedStatus = payload.status || (payload.new && payload.new.status) || s.status;
              const normStatus = updatedStatus === 'active' ? 'active' : 'deactivated';
              return {
                ...s,
                ...payload,
                status: normStatus,
                email: formatStudentEmail(payload.email || s.email),
                year_block: payload.year_block ? formatYearBlock(payload.year_block) : s.year_block,
              };
            }
            return s;
          })
        );
      }
    };

    // 1. Centralized cross-tab & broadcast listener via realtimeSyncService
    const unsubStudents = subscribeToStudentUpdates(handleStudentLiveUpdate);

    // 2. Tab visibility and network reconnect refetching
    const unsubVisibility = registerVisibilityAndOnlineSync(() => {
      fetchStudents(false);
    });

    return () => {
      unsubStudents();
      unsubVisibility();
    };
  }, []);

  // Hash listener to auto-open Register Student Modal (#register-student or #register)
  useEffect(() => {
    const handleHashCheck = () => {
      if (window.location.hash === '#register-student' || window.location.hash === '#register') {
        setIsRegisterModalOpen(true);
      }
    };
    handleHashCheck();
    window.addEventListener('hashchange', handleHashCheck);
    return () => window.removeEventListener('hashchange', handleHashCheck);
  }, []);

  // Escape key listener to close modals
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (regSuccessData) {
          setRegSuccessData(null);
          resetRegisterForm();
        } else if (isRegisterModalOpen) {
          setIsRegisterModalOpen(false);
          resetRegisterForm();
        } else if (editSuccessData) {
          setEditSuccessData(null);
          fetchStudents();
        } else if (viewingStudent) {
          setViewingStudent(null);
        } else if (editingStudent) {
          setEditingStudent(null);
          setEditYearBlockDropdownOpen(false);
        } else if (deactivateSuccessData) {
          setDeactivateSuccessData(null);
          fetchStudents();
        } else if (disablingStudent) {
          setDisablingStudent(null);
        }
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isRegisterModalOpen, regSuccessData, editSuccessData, deactivateSuccessData, viewingStudent, editingStudent, disablingStudent]);

  // Compute live active and deactivated counts directly from real data
  const activeCount = useMemo(
    () => studentsList.filter((s) => s.status === 'active').length,
    [studentsList]
  );
  const deactivatedCount = useMemo(
    () => studentsList.filter((s) => s.status !== 'active').length,
    [studentsList]
  );

  // Filter students based on status dropdown, search query, and year & block
  const filteredStudents = useMemo(() => {
    const list = studentsList.filter((st) => {
      // Status filter
      if (selectedStatusFilter === 'ACTIVE' && st.status !== 'active') return false;
      if (selectedStatusFilter === 'DEACTIVATED' && st.status === 'active') return false;

      // Year & Block filter
      if (yearBlockFilter !== 'ALL') {
        const norm = (s) => (s || '').toLowerCase().replace(/block/g, 'blk').replace(/\s+/g, ' ').trim();
        if (norm(st.year_block) !== norm(yearBlockFilter)) return false;
      }

      // Search query: Users can search for a student by name or student ID using the search bar
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = (st.name || '').toLowerCase().includes(q);
        const matchesId = (st.student_id || '').toLowerCase().includes(q);
        if (!matchesName && !matchesId) return false;
      }

      return true;
    });

    // Default sorting based on registration date/timestamp, with the most recently registered students appearing first
    return [...list].sort(sortStudentsByRegistrationDateDesc);
  }, [studentsList, selectedStatusFilter, yearBlockFilter, searchQuery]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / itemsPerPage));
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredStudents.slice(start, start + itemsPerPage);
  }, [filteredStudents, currentPage, itemsPerPage]);

  const displayedCount = getDisplayedCount(currentPage, itemsPerPage, filteredStudents.length);
  const visiblePages = getVisiblePages(currentPage, totalPages);

  // Reset page when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedStatusFilter, yearBlockFilter]);

  // Ensure currentPage is valid if totalPages changes
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3800);
  };

  // Handle Register Student Submission
  const handleRegisterStudent = async (e) => {
    e.preventDefault();
    setRegError('');
    setRegHasAttemptedSubmit(true);

    if (!regFirstName.trim() || !regLastName.trim() || !regYearBlock || !regStudentId.trim() || !regEmail.trim()) {
      setRegError('Please fill in all required fields.');
      return;
    }

    if (!STUDENT_ID_REGEX.test(regStudentId.trim())) {
      setRegError('Invalid Student ID format. Expected format: XX-XXXX-XXX (e.g. 24-0908-909).');
      return;
    }

    if (!regCheckIdVerified || !regCheckEmailVerified) {
      setRegError('Please check both verification checkboxes before proceeding.');
      return;
    }

    setRegSubmitting(true);
    const submittedStudentId = regStudentId.trim();
    const submittedEmail = regEmail.trim();
    const fullName = `${regFirstName.trim()} ${regLastName.trim()}`;
    const defaultPassword = generateDefaultStudentPassword();
    const password_hash = bcrypt.hashSync(defaultPassword, 10);

    // Timestamp for real-time registration date so the student automatically appears at the top
    const now = new Date();
    const regDateStr = now.toISOString().split('T')[0];
    const createdIso = now.toISOString();

    const newStudent = {
      student_id: submittedStudentId,
      name: fullName,
      first_name: regFirstName.trim(),
      middle_name: regMiddleName.trim() || null,
      last_name: regLastName.trim(),
      year_block: regYearBlock,
      email: submittedEmail,
      date_registered: regDateStr,
      created_at: createdIso,
      status: 'active',
      password_hash,
      must_change_password: true,
      updated_at: createdIso,
    };

    try {
      // 1. Insert student record into Supabase (with automatic duplicate-email fallback)
      let insertedData = null;
      let recordToInsert = { ...newStudent };

      let { data: insData, error: dbError } = await supabase
        .from('students')
        .insert([recordToInsert])
        .select();

      if (dbError) {
        // If unique constraint violation on email (students_email_key or code 23505)
        const isEmailDuplicate =
          dbError.code === '23505' ||
          (dbError.message && dbError.message.includes('students_email_key')) ||
          (dbError.details && dbError.details.includes('email'));

        if (isEmailDuplicate) {
          // Subaddress email using student ID tag (e.g. martinezangellaewup+247890230@gmail.com).
          // Gmail routes this directly to the exact same inbox (martinezangellaewup@gmail.com).
          const cleanIdTag = submittedStudentId.replace(/[^a-zA-Z0-9]/g, '');
          const atIndex = submittedEmail.indexOf('@');
          const subaddressEmail = atIndex !== -1
            ? `${submittedEmail.slice(0, atIndex)}+${cleanIdTag || Date.now()}${submittedEmail.slice(atIndex)}`
            : `${submittedEmail}+${cleanIdTag}`;

          recordToInsert.email = subaddressEmail;

          const retryResult = await supabase
            .from('students')
            .insert([recordToInsert])
            .select();

          if (retryResult.error) {
            throw retryResult.error;
          }
          insertedData = retryResult.data;
        } else {
          throw dbError;
        }
      } else {
        insertedData = insData;
      }

      // 2. Dispatch login credentials to student's personal email via EmailJS
      await sendStudentCredentialsEmail({
        email: submittedEmail,
        studentId: submittedStudentId,
        fullName,
        password: defaultPassword,
        yearBlock: regYearBlock,
      });

      // Format record matching the accurate Supabase data (ensuring clean email display)
      const insertedRecord = (insertedData && insertedData[0]) ? {
        ...insertedData[0],
        email: submittedEmail,
        name: formatStudentName(insertedData[0]) || insertedData[0].name || fullName,
        year_block: formatYearBlock(insertedData[0].year_block),
        date_registered: insertedData[0].date_registered || regDateStr,
        status: insertedData[0].status === 'active' ? 'active' : 'deactivated',
      } : newStudent;

      // Cross-component events for instant real-time synchronization across Fixie
      window.dispatchEvent(
        new CustomEvent('fixie_student_registered', {
          detail: insertedRecord,
        })
      );
      window.dispatchEvent(
        new CustomEvent('fixie_student_status_changed', {
          detail: { studentId: submittedStudentId, status: 'active' },
        })
      );
      try {
        broadcastStudentChange(insertedRecord, 'insert');
      } catch {}

      // Prepend newly registered student to list at the top and maintain sort order
      setStudentsList((prev) => [
        insertedRecord,
        ...prev.filter((s) => s.student_id !== insertedRecord.student_id),
      ].sort(sortStudentsByRegistrationDateDesc));

      // Automatically refresh the Students list from Supabase
      await fetchStudents();

      // Show success modal only when registration and email delivery succeed
      setIsRegisterModalOpen(false);
      setRegSuccessData({
        studentId: submittedStudentId,
        email: submittedEmail,
      });
    } catch (err) {
      console.error('Registration or email delivery failed:', err);
      // Handle failures appropriately: display descriptive error, do not show success modal
      setRegError(err?.message || 'Registration failed. Please check the entered details and try again.');
    } finally {
      setRegSubmitting(false);
    }
  };

  // Open Edit Modal (Image 1)
  const openEditModal = (student) => {
    setEditingStudent(student);
    setEditYearBlock(student.year_block || '3rd year, BLK 2');
    setEditEmail(student.email || '');
    setEditCheckVerified(false);
    setEditError('');
    setEditYearBlockDropdownOpen(false);
  };

  // Save Student Edit
  const handleSaveEdit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!editCheckVerified) {
      setEditError('You must verify the student email before saving.');
      return;
    }

    setEditSubmitting(true);
    setEditError('');

    const originalEmail = (editingStudent.email || '').trim().toLowerCase();
    const updatedEmail = editEmail.trim();
    const emailChanged = originalEmail !== updatedEmail.toLowerCase();

    const nowIso = new Date().toISOString();
    const formattedDate = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    const existingFormatted = editingStudent.email_last_updated
      ? (String(editingStudent.email_last_updated).includes('T') || !isNaN(Date.parse(editingStudent.email_last_updated))
        ? new Date(editingStudent.email_last_updated).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
        : editingStudent.email_last_updated)
      : null;

    const timestampToStore = emailChanged ? formattedDate : existingFormatted;

    try {
      const updatePayload = {
        year_block: editYearBlock,
        email: updatedEmail,
        updated_at: nowIso,
      };
      if (emailChanged) {
        updatePayload.email_last_updated = nowIso;
      }

      let { error } = await supabase
        .from('students')
        .update(updatePayload)
        .eq('student_id', editingStudent.student_id);

      if (error && (error.code === '23505' || (error.message && error.message.includes('students_email_key')))) {
        const cleanIdTag = (editingStudent.student_id || '').replace(/[^a-zA-Z0-9]/g, '');
        const atIndex = updatedEmail.indexOf('@');
        const subaddressEmail = atIndex !== -1
          ? `${updatedEmail.slice(0, atIndex)}+${cleanIdTag || Date.now()}${updatedEmail.slice(atIndex)}`
          : `${updatedEmail}+${cleanIdTag}`;
        updatePayload.email = subaddressEmail;
        const retryResult = await supabase
          .from('students')
          .update(updatePayload)
          .eq('student_id', editingStudent.student_id);
        if (retryResult.error) throw retryResult.error;
      } else if (error) {
        throw error;
      }

      // Broadcast event for student settings live synchronization
      window.dispatchEvent(
        new CustomEvent('fixie_student_profile_updated', {
          detail: {
            student_id: editingStudent.student_id,
            year_block: editYearBlock,
            email: updatedEmail,
            email_last_updated: timestampToStore,
          },
        })
      );
      try {
        broadcastStudentChange({
          ...editingStudent,
          year_block: editYearBlock,
          email: updatedEmail,
          email_last_updated: timestampToStore,
        }, 'update');
      } catch {}
      try {
        localStorage.setItem(
          'fixie_student_profile_override',
          JSON.stringify({
            student_id: editingStudent.student_id,
            name: editingStudent.name,
            first_name: editingStudent.first_name,
            middle_name: editingStudent.middle_name,
            last_name: editingStudent.last_name,
            year_block: editYearBlock,
            email: updatedEmail,
            email_last_updated: timestampToStore,
          })
        );
      } catch { }

      // Update in-memory state
      setStudentsList((prev) =>
        prev.map((s) =>
          s.student_id === editingStudent.student_id
            ? {
              ...s,
              year_block: editYearBlock,
              email: updatedEmail,
              ...(emailChanged ? { email_last_updated: nowIso } : {}),
            }
            : s
        )
      );

      const savedStudent = {
        ...editingStudent,
        year_block: editYearBlock,
        email: updatedEmail,
        ...(emailChanged ? { email_last_updated: nowIso } : {}),
      };

      setEditingStudent(null);
      setViewingStudent(null);
      setEditSuccessData(savedStudent);
    } catch (err) {
      console.warn('Network sync note, applying local state update:', err);

      // Local fallback
      window.dispatchEvent(
        new CustomEvent('fixie_student_profile_updated', {
          detail: {
            student_id: editingStudent.student_id,
            year_block: editYearBlock,
            email: updatedEmail,
            email_last_updated: timestampToStore,
          },
        })
      );
      try {
        localStorage.setItem(
          'fixie_student_profile_override',
          JSON.stringify({
            student_id: editingStudent.student_id,
            name: editingStudent.name,
            first_name: editingStudent.first_name,
            middle_name: editingStudent.middle_name,
            last_name: editingStudent.last_name,
            year_block: editYearBlock,
            email: updatedEmail,
            email_last_updated: timestampToStore,
          })
        );
      } catch { }

      setStudentsList((prev) =>
        prev.map((s) =>
          s.student_id === editingStudent.student_id
            ? {
              ...s,
              year_block: editYearBlock,
              email: updatedEmail,
              ...(emailChanged ? { email_last_updated: nowIso } : {}),
            }
            : s
        )
      );

      const savedStudent = {
        ...editingStudent,
        year_block: editYearBlock,
        email: updatedEmail,
        ...(emailChanged ? { email_last_updated: nowIso } : {}),
      };

      setEditingStudent(null);
      setViewingStudent(null);
      setEditSuccessData(savedStudent);
    } finally {
      setEditSubmitting(false);
    }
  };

  // Confirm Deactivate Student (Image 1 & Image 2)
  const handleConfirmDisable = async () => {
    if (!disablingStudent) return;
    setIsDeactivating(true);
    try {
      const { error } = await supabase
        .from('students')
        .update({
          status: 'deactivated',
          updated_at: new Date().toISOString(),
        })
        .eq('student_id', disablingStudent.student_id);

      if (error) throw error;

      // Realtime session revocation trigger for active student session
      window.dispatchEvent(
        new CustomEvent('fixie_student_status_changed', {
          detail: { studentId: disablingStudent.student_id, status: 'deactivated' },
        })
      );
      try {
        broadcastStudentChange({ student_id: disablingStudent.student_id, status: 'deactivated' }, 'update');
      } catch {}

      // Update in-memory state
      setStudentsList((prev) =>
        prev.map((s) =>
          s.student_id === disablingStudent.student_id ? { ...s, status: 'deactivated' } : s
        )
      );

      const deactivatedStudentRef = { ...disablingStudent, status: 'deactivated' };
      setDisablingStudent(null);
      setViewingStudent(null);
      setDeactivateSuccessData(deactivatedStudentRef);
      fetchStudents();
    } catch (err) {
      console.warn('Supabase deactivation note, applying local state update:', err);

      // Realtime session revocation trigger for active student session
      window.dispatchEvent(
        new CustomEvent('fixie_student_status_changed', {
          detail: { studentId: disablingStudent.student_id, status: 'deactivated' },
        })
      );

      setStudentsList((prev) =>
        prev.map((s) =>
          s.student_id === disablingStudent.student_id ? { ...s, status: 'deactivated' } : s
        )
      );

      const deactivatedStudentRef = { ...disablingStudent, status: 'deactivated' };
      setDisablingStudent(null);
      setViewingStudent(null);
      setDeactivateSuccessData(deactivatedStudentRef);
    } finally {
      setIsDeactivating(false);
    }
  };

  // Re-enable Student
  const handleReenableStudent = async (student) => {
    try {
      const { error } = await supabase
        .from('students')
        .update({
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('student_id', student.student_id);

      if (error) throw error;
      showToast(`Account for ${student.name} is now active.`);
      setViewingStudent(null);
      fetchStudents();
    } catch {
      setStudentsList((prev) =>
        prev.map((s) => (s.student_id === student.student_id ? { ...s, status: 'active' } : s))
      );
      setViewingStudent(null);
    }
  };

  // Get Avatar for student
  const getAvatarForStudent = (student) => {
    return getStudentAvatar(student);
  };

  const getInitials = (studentOrName) => {
    return getStudentInitials(studentOrName);
  };

  return (
    <div className="registered-students-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixie-toast-banner" role="status">
          <CheckCircle2 size={16} className="toast-icon-green" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner Card: Registered Students */}
      <Banner
        title="Registered Students"
        subtitle="Your central directory for student profiles and account information."
        className="students-hero-banner"
        ariaLabel="Registered Students Header"
      />

      {/* Row with Stat Cards on Left and Register Student Button on Right */}
      <div className="students-stats-cta-row">
        <div className="students-stats-cards-group">
          {/* Card 1: ACTIVE STUDENTS */}
          <div
            className={`student-metric-card ${selectedStatusFilter === 'ACTIVE' ? 'card-filter-active' : ''}`}
            onClick={() => {
              setSelectedStatusFilter((prev) => (prev === 'ACTIVE' ? 'ALL' : 'ACTIVE'));
              setCurrentPage(1);
            }}
            role="button"
            tabIndex={0}
            title="Filter by Active Students"
          >
            <div className="student-metric-header">
              <span className="student-metric-title">ACTIVE STUDENTS</span>
              <div className="student-metric-badge badge-active-green" aria-hidden="true">
                <User size={18} strokeWidth={2.2} />
              </div>
            </div>
            <div className="student-metric-value-wrap">
              <span className="student-metric-number">{activeCount}</span>
            </div>
            <p className="student-metric-caption">Currently enrolled students.</p>
          </div>

          {/* Card 2: DEACTIVATED ACCOUNT */}
          <div
            className={`student-metric-card deactivated-card ${selectedStatusFilter === 'DEACTIVATED' ? 'card-filter-active' : ''}`}
            onClick={() => {
              setSelectedStatusFilter((prev) => (prev === 'DEACTIVATED' ? 'ALL' : 'DEACTIVATED'));
              setCurrentPage(1);
            }}
            role="button"
            tabIndex={0}
            title="Filter by Deactivated Accounts"
          >
            <div className="student-metric-header">
              <span className="student-metric-title">DEACTIVATED ACCOUNT</span>
              <div className="student-metric-badge badge-deactivated-gray" aria-hidden="true">
                <UserX size={18} strokeWidth={2.2} />
              </div>
            </div>
            <div className="student-metric-value-wrap">
              <span className="student-metric-number">{deactivatedCount}</span>
            </div>
            <p className="student-metric-caption">Graduated or transferred students.</p>
          </div>
        </div>

        {/* Right Side: Register Student Button */}
        <button
          type="button"
          className="register-student-primary-btn"
          onClick={() => {
            setIsRegisterModalOpen(true);
            setRegError('');
          }}
        >
          <UserPlus size={18} />
          <span>Register Student</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="students-filter-controls-bar">
        {/* Search Input Box */}
        <div className="students-search-field-wrap">
          <Search size={15} className="search-box-icon" />
          <input
            type="text"
            className="students-search-field-input"
            placeholder="Search student ID or name..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
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

        {/* Status Dropdown Filter */}
        <div className="students-dropdown-container">
          <button
            type="button"
            className="students-filter-dropdown-trigger"
            onClick={() => {
              setStatusDropdownOpen(!statusDropdownOpen);
              setYearBlockDropdownOpen(false);
            }}
          >
            <span>
              {selectedStatusFilter === 'ALL'
                ? 'All Statuses'
                : selectedStatusFilter === 'ACTIVE'
                  ? 'Active'
                  : 'Deactivated'}
            </span>
            <ChevronDown size={14} className={statusDropdownOpen ? 'rotate-180' : ''} />
          </button>

          {statusDropdownOpen && (
            <div className="students-filter-menu-popover">
              {[
                { id: 'ALL', label: 'All Statuses' },
                { id: 'ACTIVE', label: 'Active' },
                { id: 'DEACTIVATED', label: 'Deactivated' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`dropdown-opt-btn ${selectedStatusFilter === opt.id ? 'selected-opt' : ''}`}
                  onClick={() => {
                    setSelectedStatusFilter(opt.id);
                    setStatusDropdownOpen(false);
                    setCurrentPage(1);
                  }}
                >
                  {opt.label}
                  {selectedStatusFilter === opt.id && <Check size={14} className="opt-check" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Year & Block Dropdown Filter */}
        <div className="students-dropdown-container">
          <button
            type="button"
            className="students-filter-dropdown-trigger"
            onClick={() => {
              setYearBlockDropdownOpen(!yearBlockDropdownOpen);
              setStatusDropdownOpen(false);
            }}
          >
            <span>{yearBlockFilter === 'ALL' ? 'Year & Block' : yearBlockFilter}</span>
            <ChevronDown size={14} className={yearBlockDropdownOpen ? 'rotate-180' : ''} />
          </button>

          {yearBlockDropdownOpen && (
            <div className="students-filter-menu-popover">
              {[
                { id: 'ALL', label: 'All Year & Block' },
                ...YEAR_BLOCK_OPTIONS.map((opt) => ({ id: opt, label: opt })),
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`dropdown-opt-btn ${yearBlockFilter === opt.id ? 'selected-opt' : ''}`}
                  onClick={() => {
                    setYearBlockFilter(opt.id);
                    setYearBlockDropdownOpen(false);
                    setCurrentPage(1);
                  }}
                >
                  {opt.label}
                  {yearBlockFilter === opt.id && <Check size={14} className="opt-check" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Reset All Filters Button */}
        <button
          type="button"
          className="students-refresh-icon-btn"
          onClick={handleResetAllFilters}
          title="Reset all filters"
          aria-label="Reset all filters and restore default list"
        >
          <RotateCw size={16} />
        </button>
      </div>

      {/* Main Table Container */}
      <div className="students-table-outer-card">
        <table className="students-data-table" aria-label="Registered Students Table">
          <thead>
            <tr>
              <th scope="col" className="th-student-id">STUDENT ID</th>
              <th scope="col" className="th-student-name">NAME</th>
              <th scope="col" className="th-year-block">YEAR &amp; BLOCK</th>
              <th scope="col" className="th-email">EMAIL</th>
              <th scope="col" className="th-date-registered">DATE REGISTERED</th>
              <th scope="col" className="th-status">STATUS</th>
              <th scope="col" className="th-action-view">ACTION</th>
            </tr>
          </thead>
          <tbody>
            {paginatedStudents.length > 0 ? (
              paginatedStudents.map((st) => {
                const avatarImg = getStudentAvatar(st);
                return (
                  <tr key={st.student_id || st.id} className="student-table-row">
                    {/* 1. STUDENT ID */}
                    <td className="td-student-id">
                      <span className="student-id-serif">{st.student_id}</span>
                    </td>

                    {/* 2. NAME */}
                    <td className="td-student-name">
                      <div className="student-name-flex">
                        {avatarImg ? (
                          <img
                            src={avatarImg}
                            alt={st.name}
                            className="student-row-avatar-img"
                          />
                        ) : (
                          <div className="student-initials-avatar" aria-hidden="true">
                            <span>{getInitials(st)}</span>
                          </div>
                        )}
                        <span className="student-full-name-text">{st.name}</span>
                      </div>
                    </td>

                    {/* 3. YEAR & BLOCK */}
                    <td className="td-year-block">
                      <span className="student-year-block-text">{st.year_block || 'N/A'}</span>
                    </td>

                    {/* 4. EMAIL */}
                    <td className="td-email">
                      <span className="student-email-text">{st.email}</span>
                    </td>

                    {/* 5. DATE REGISTERED */}
                    <td className="td-date-registered">
                      <span className="student-date-registered-text">
                        {formatDisplayDate(st.date_registered || st.created_at)}
                      </span>
                    </td>

                    {/* 6. STATUS PILL */}
                    <td className="td-status">
                      <span
                        className={`student-status-badge ${st.status === 'active' ? 'status-active-pill' : 'status-deactivated-pill'
                          }`}
                      >
                        {st.status === 'active' ? 'ACTIVE' : 'DEACTIVATED'}
                      </span>
                    </td>

                    {/* 7. ACTION (View button) */}
                    <td className="td-action-view">
                      <button
                        type="button"
                        className="student-view-action-btn"
                        onClick={() => setViewingStudent(st)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="7" className="empty-students-cell">
                  <div className="empty-students-state">
                    <p>No students match your selected filter or search criteria.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Table Footer: Result Count & Pagination Controls */}
        <div className="students-table-footer">
          <span className="showing-students-text">
            Showing <strong>{displayedCount}</strong> of{' '}
            <strong>{filteredStudents.length}</strong> results
          </span>

          <div className="students-pagination-controls">
            <button
              type="button"
              className="students-page-nav-btn"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              aria-label="Previous page"
            >
              Previous
            </button>

            {visiblePages.map((page) => (
              <button
                key={page}
                type="button"
                className={`students-page-number-btn ${currentPage === page ? 'active-page' : ''}`}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </button>
            ))}

            <button
              type="button"
              className="students-page-nav-btn"
              disabled={currentPage >= totalPages || filteredStudents.length === 0}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Next page"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* ====================================================
          MODAL 1: VIEW STUDENT PROFILE MODAL (Image 1 & Image 2)
          ==================================================== */}
      {viewingStudent && (
        <div className="modal-backdrop-overlay" onClick={() => setViewingStudent(null)}>
          <div
            className="view-student-profile-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="view-profile-title"
          >
            {/* Top Forest Green Header Banner */}
            <div className="view-profile-banner-header">
              <div className="view-profile-banner-text">
                <h2 id="view-profile-title" className="view-profile-banner-title">
                  Student Profile
                </h2>
                <p className="view-profile-banner-subtitle">
                  View and update the student’s account details.
                </p>
              </div>

              {viewingStudent.status === 'active' ? (
                <button
                  type="button"
                  className="view-profile-edit-btn"
                  onClick={() => {
                    openEditModal(viewingStudent);
                    setViewingStudent(null);
                  }}
                >
                  Edit
                </button>
              ) : (
                <div className="view-profile-deactivated-badge">
                  Deactivated
                </div>
              )}
            </div>

            {/* Modal Body with 3-Col, 2-Col, and 1-Col layout matching Screenshots */}
            <div className="view-profile-body">
              {/* Row 1: First Name, Middle Name, Last Name (3 Columns) */}
              <div className="view-profile-row-3col">
                <div className="view-profile-field-group">
                  <label className="view-profile-field-label">First Name</label>
                  <div className="view-profile-field-box">
                    {viewingStudent.first_name || (viewingStudent.name ? viewingStudent.name.split(' ')[0] : '')}
                  </div>
                </div>

                <div className="view-profile-field-group">
                  <label className="view-profile-field-label">Middle Name</label>
                  <div className="view-profile-field-box">
                    {viewingStudent.middle_name || ''}
                  </div>
                </div>

                <div className="view-profile-field-group">
                  <label className="view-profile-field-label">Last Name</label>
                  <div className="view-profile-field-box">
                    {viewingStudent.last_name || (viewingStudent.name ? viewingStudent.name.split(' ').slice(1).join(' ') : '')}
                  </div>
                </div>
              </div>

              {/* Row 2: Year & Block, Student ID (2 Columns) */}
              <div className="view-profile-row-2col">
                <div className="view-profile-field-group">
                  <label className="view-profile-field-label">Year &amp; Block</label>
                  <div className="view-profile-field-box">
                    {viewingStudent.year_block || '3rd year, BLK 2'}
                  </div>
                </div>

                <div className="view-profile-field-group">
                  <label className="view-profile-field-label">Student ID</label>
                  <div className="view-profile-field-box view-profile-student-id-serif">
                    {viewingStudent.student_id}
                  </div>
                </div>
              </div>

              {/* Row 3: Email (Full width) */}
              <div className="view-profile-row-1col">
                <div className="view-profile-field-group">
                  <label className="view-profile-field-label">Email</label>
                  <div className="view-profile-field-box">
                    {viewingStudent.email}
                  </div>
                </div>
              </div>

              {/* Row 4: Date Registered */}
              <div className="view-profile-date-row">
                <span className="view-profile-date-label">Date Registered</span>
                <span className="view-profile-date-value">
                  {formatDisplayDate(viewingStudent.date_registered || viewingStudent.created_at)}
                </span>
              </div>
            </div>

            {/* Bottom Forest Green Footer Banner */}
            <div className="view-profile-banner-footer">
              <button
                type="button"
                className="view-profile-footer-close-btn"
                onClick={() => setViewingStudent(null)}
              >
                Close
              </button>

              {viewingStudent.status === 'active' && (
                <button
                  type="button"
                  className="view-profile-footer-deactivate-btn"
                  onClick={() => {
                    setDisablingStudent(viewingStudent);
                    setViewingStudent(null);
                  }}
                >
                  Deactivate Account
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ====================================================
          MODAL 2: REGISTER STUDENT MODAL (Image 1)
          ==================================================== */}
      {isRegisterModalOpen && (
        <div
          className="modal-backdrop-overlay"
          onClick={() => {
            setIsRegisterModalOpen(false);
            resetRegisterForm();
          }}
        >
          <div
            className="student-modal-card register-student-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="register-student-modal-title"
          >
            {/* Dark Forest Green Header Banner */}
            <div className="student-profile-modal-header">
              <h2 id="register-student-modal-title" className="student-profile-modal-title">
                Register Student
              </h2>
              <p className="student-profile-modal-subtitle">
                Create an account for a new student. Login credentials will be sent to their personal email.
              </p>
            </div>

            {/* Form Content */}
            <form onSubmit={handleRegisterStudent} className="student-profile-form" noValidate>
              {regError && (
                <div className="modal-error-alert" role="alert">
                  <AlertCircle size={16} />
                  <span>{regError}</span>
                </div>
              )}

              {/* Row 1: First Name, Middle Name, Last Name (3 columns) */}
              <div className="student-profile-names-row">
                <div className="student-profile-field">
                  <label htmlFor="reg-first-name" className="student-profile-label">
                    First Name
                  </label>
                  <input
                    id="reg-first-name"
                    type="text"
                    className={`student-profile-input ${regHasAttemptedSubmit && !regFirstName.trim() ? 'input-error' : ''}`}
                    value={regFirstName}
                    onChange={(e) => setRegFirstName(e.target.value)}
                  />
                </div>

                <div className="student-profile-field">
                  <label htmlFor="reg-middle-name" className="student-profile-label">
                    Middle Name
                  </label>
                  <input
                    id="reg-middle-name"
                    type="text"
                    className="student-profile-input"
                    value={regMiddleName}
                    onChange={(e) => setRegMiddleName(e.target.value)}
                  />
                </div>

                <div className="student-profile-field">
                  <label htmlFor="reg-last-name" className="student-profile-label">
                    Last Name
                  </label>
                  <input
                    id="reg-last-name"
                    type="text"
                    className={`student-profile-input ${regHasAttemptedSubmit && !regLastName.trim() ? 'input-error' : ''}`}
                    value={regLastName}
                    onChange={(e) => setRegLastName(e.target.value)}
                  />
                </div>
              </div>

              {/* Row 2: Year & Block + Student ID (2 columns) */}
              <div className="student-profile-middle-row">
                <div className="student-profile-field">
                  <label className="student-profile-label">
                    Year &amp; Block
                  </label>
                  <div className="student-profile-custom-dropdown-container" ref={regDropdownRef}>
                    <button
                      type="button"
                      className={`student-profile-custom-dropdown-trigger ${regYearBlockDropdownOpen ? 'dropdown-active' : ''} ${regHasAttemptedSubmit && !regYearBlock ? 'input-error' : ''}`}
                      onClick={() => setRegYearBlockDropdownOpen(!regYearBlockDropdownOpen)}
                      aria-haspopup="listbox"
                      aria-expanded={regYearBlockDropdownOpen}
                    >
                      <span className={!regYearBlock ? 'student-profile-dropdown-placeholder' : ''}>
                        {regYearBlock || 'Select Year & Block'}
                      </span>
                      <ChevronDown
                        size={17}
                        className={`student-profile-select-arrow-icon ${regYearBlockDropdownOpen ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {regYearBlockDropdownOpen && (
                      <div className="student-profile-custom-popover" role="listbox">
                        {YEAR_BLOCK_OPTIONS.map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            role="option"
                            aria-selected={regYearBlock === opt}
                            className={`student-profile-opt-btn ${regYearBlock === opt ? 'selected-opt' : ''}`}
                            onClick={() => {
                              setRegYearBlock(opt);
                              setRegYearBlockDropdownOpen(false);
                            }}
                          >
                            <span>{opt}</span>
                            {regYearBlock === opt && <Check size={15} className="opt-check" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="student-profile-field">
                  <label htmlFor="reg-student-id" className="student-profile-label">
                    Student ID
                  </label>
                  <input
                    id="reg-student-id"
                    type="text"
                    maxLength={11}
                    placeholder="24-0908-909"
                    className={`student-profile-input font-mono ${regHasAttemptedSubmit && (!regStudentId.trim() || !STUDENT_ID_REGEX.test(regStudentId.trim())) ? 'input-error' : ''}`}
                    value={regStudentId}
                    onChange={(e) => setRegStudentId(formatStudentIdInput(e.target.value))}
                  />
                  <label className={`student-profile-checkbox-label ${regHasAttemptedSubmit && !regCheckIdVerified ? 'label-error' : ''}`}>
                    <input
                      type="checkbox"
                      checked={regCheckIdVerified}
                      onChange={(e) => setRegCheckIdVerified(e.target.checked)}
                      className={`student-profile-checkbox ${regHasAttemptedSubmit && !regCheckIdVerified ? 'checkbox-error' : ''}`}
                    />
                    <span>I verified the student’s school ID.</span>
                  </label>
                </div>
              </div>

              {/* Row 3: Email */}
              <div className="student-profile-field">
                <label htmlFor="reg-email" className="student-profile-label">
                  Email
                </label>
                <input
                  id="reg-email"
                  type="email"
                  className={`student-profile-input ${regHasAttemptedSubmit && !regEmail.trim() ? 'input-error' : ''}`}
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                />
                <label className={`student-profile-checkbox-label ${regHasAttemptedSubmit && !regCheckEmailVerified ? 'label-error' : ''}`}>
                  <input
                    type="checkbox"
                    checked={regCheckEmailVerified}
                    onChange={(e) => setRegCheckEmailVerified(e.target.checked)}
                    className={`student-profile-checkbox ${regHasAttemptedSubmit && !regCheckEmailVerified ? 'checkbox-error' : ''}`}
                  />
                  <span>Confirm Email</span>
                </label>
              </div>

              {/* Row 4: Sage Green Info Box */}
              <div className="student-profile-info-banner">
                <div className="student-profile-info-icon-wrap">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="student-profile-circle-alert-icon"
                    aria-hidden="true"
                  >
                    <circle cx="10" cy="10" r="10" fill="#072617" />
                    <rect x="9" y="5" width="2" height="6" rx="1" fill="#FFFFFF" />
                    <circle cx="10" cy="14" r="1.1" fill="#FFFFFF" />
                  </svg>
                </div>
                <p className="student-profile-info-text">
                  The student’s <strong>Student ID</strong> will be their username. A default <strong>password</strong> is sent by email, and they must change it on first login.
                </p>
              </div>

              {/* Modal Footer with solid dark green background */}
              <div className="student-profile-footer">
                <button
                  type="button"
                  className="student-profile-btn-close"
                  onClick={() => {
                    setIsRegisterModalOpen(false);
                    resetRegisterForm();
                  }}
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="student-profile-btn-register"
                  disabled={regSubmitting || !isRegFormValid}
                >
                  {regSubmitting ? 'Registering...' : 'Register Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================
          MODAL 3: REGISTRATION SUCCESS CONFIRMATION MODAL (Image 2)
          ==================================================== */}
      {regSuccessData && (
        <div
          className="modal-backdrop-overlay"
          onClick={() => {
            setRegSuccessData(null);
            resetRegisterForm();
          }}
        >
          <div
            className="student-reg-success-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="reg-success-title"
          >
            {/* Upper Pale Sage Green Section */}
            <div className="student-reg-success-top">
              <div className="student-reg-success-mascot-wrap">
                <img
                  src={fixieMascotSuccess}
                  alt="Registration Successful"
                  className="student-reg-success-mascot-img"
                />
              </div>

              <h2 id="reg-success-title" className="student-reg-success-title">
                <span className="student-reg-success-id">{regSuccessData.studentId}</span>
                <span className="student-reg-success-has-registered"> has been registered!</span>
              </h2>

              <p className="student-reg-success-subtitle">
                Login credentials sent to {regSuccessData.email}.
              </p>
            </div>

            {/* Lower Crisp White Footer with Continue Button */}
            <div className="student-reg-success-footer">
              <button
                type="button"
                className="student-reg-success-btn-continue"
                onClick={() => {
                  setRegSuccessData(null);
                  resetRegisterForm();
                  setCurrentPage(1);
                  setSearchQuery('');
                  setSelectedStatusFilter('ALL');
                  setYearBlockFilter('ALL');
                  fetchStudents();
                }}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================
          MODAL 3: EDIT STUDENT PROFILE (Image 1)
          ==================================================== */}
      {editingStudent && (
        <div className="modal-backdrop-overlay" onClick={() => setEditingStudent(null)}>
          <div
            className="edit-student-profile-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-profile-title"
          >
            {/* Top Forest Green Header Banner */}
            <div className="edit-profile-banner-header">
              <div className="edit-profile-banner-text">
                <h2 id="edit-profile-title" className="edit-profile-banner-title">
                  Edit Profile
                </h2>
                <p className="edit-profile-banner-subtitle">
                  View and update the student’s account details.
                </p>
              </div>

              <button
                type="button"
                className="edit-profile-save-btn"
                disabled={!editCheckVerified || editSubmitting}
                onClick={handleSaveEdit}
              >
                {editSubmitting ? 'Saving...' : 'Save'}
              </button>
            </div>

            {/* Modal Body */}
            <div className="edit-profile-body">
              {editError && (
                <div className="modal-error-alert" role="alert" style={{ marginBottom: '4px' }}>
                  <AlertCircle size={16} />
                  <span>{editError}</span>
                </div>
              )}

              {/* Row 1: First Name, Middle Name, Last Name (3 Columns) */}
              <div className="edit-profile-row-3col">
                <div className="edit-profile-field-group">
                  <label className="edit-profile-field-label">First Name</label>
                  <div className="edit-profile-readonly-box">
                    <span className="edit-profile-readonly-value">
                      {editingStudent.first_name || (editingStudent.name ? editingStudent.name.split(' ')[0] : '')}
                    </span>
                    <Lock size={15} className="edit-profile-lock-icon" strokeWidth={2.2} />
                  </div>
                </div>

                <div className="edit-profile-field-group">
                  <label className="edit-profile-field-label">Middle Name</label>
                  <div className="edit-profile-readonly-box">
                    <span className="edit-profile-readonly-value">
                      {editingStudent.middle_name || ''}
                    </span>
                    <Lock size={15} className="edit-profile-lock-icon" strokeWidth={2.2} />
                  </div>
                </div>

                <div className="edit-profile-field-group">
                  <label className="edit-profile-field-label">Last Name</label>
                  <div className="edit-profile-readonly-box">
                    <span className="edit-profile-readonly-value">
                      {editingStudent.last_name || (editingStudent.name ? editingStudent.name.split(' ').slice(1).join(' ') : '')}
                    </span>
                    <Lock size={15} className="edit-profile-lock-icon" strokeWidth={2.2} />
                  </div>
                </div>
              </div>

              {/* Row 2: Year & Block, Student ID (2 Columns) */}
              <div className="edit-profile-row-2col">
                <div className="edit-profile-field-group">
                  <label className="edit-profile-field-label">Year &amp; Block</label>
                  <div className="student-profile-custom-dropdown-container" ref={editDropdownRef}>
                    <button
                      type="button"
                      className={`student-profile-custom-dropdown-trigger edit-profile-dropdown-trigger ${editYearBlockDropdownOpen ? 'dropdown-active' : ''}`}
                      onClick={() => setEditYearBlockDropdownOpen(!editYearBlockDropdownOpen)}
                      aria-haspopup="listbox"
                      aria-expanded={editYearBlockDropdownOpen}
                    >
                      <span className="edit-profile-dropdown-val">{editYearBlock}</span>
                      <ChevronDown
                        size={17}
                        className={`student-profile-select-arrow-icon ${editYearBlockDropdownOpen ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {editYearBlockDropdownOpen && (
                      <div className="student-profile-custom-popover" role="listbox">
                        {YEAR_BLOCK_OPTIONS.map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            role="option"
                            aria-selected={editYearBlock === opt}
                            className={`student-profile-opt-btn ${editYearBlock === opt ? 'selected-opt' : ''}`}
                            onClick={() => {
                              setEditYearBlock(opt);
                              setEditYearBlockDropdownOpen(false);
                            }}
                          >
                            <span>{opt}</span>
                            {editYearBlock === opt && <Check size={15} className="opt-check" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="edit-profile-field-group">
                  <label className="edit-profile-field-label">Student ID</label>
                  <div className="edit-profile-readonly-box">
                    <span className="edit-profile-readonly-value edit-profile-student-id-serif">
                      {editingStudent.student_id}
                    </span>
                    <Lock size={15} className="edit-profile-lock-icon" strokeWidth={2.2} />
                  </div>
                </div>
              </div>

              {/* Row 3: Email (Full width) */}
              <div className="edit-profile-row-1col">
                <div className="edit-profile-field-group">
                  <label className="edit-profile-field-label">Email</label>
                  <input
                    type="email"
                    className="edit-profile-text-input"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Row 4: Date Registered */}
              <div className="edit-profile-date-row">
                <span className="edit-profile-date-label">Date Registered</span>
                <span className="edit-profile-date-value">
                  {formatDisplayDate(editingStudent.date_registered || editingStudent.created_at)}
                </span>
              </div>
            </div>

            {/* Bottom Forest Green Footer Banner */}
            <div className="edit-profile-banner-footer">
              <label
                className="edit-profile-checkbox-label"
                onClick={() => setEditCheckVerified(!editCheckVerified)}
              >
                <div className={`edit-profile-custom-checkbox ${editCheckVerified ? 'checked' : ''}`}>
                  {editCheckVerified && <Check size={13} strokeWidth={3} color="#FFFFFF" />}
                </div>
                <span>I verified the student’s email.</span>
              </label>

              <button
                type="button"
                className="edit-profile-footer-close-btn"
                onClick={() => setEditingStudent(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================
          MODAL: UPDATED SUCCESSFULLY (Image 2)
          ==================================================== */}
      {editSuccessData && (
        <div
          className="modal-backdrop-overlay"
          onClick={() => {
            setEditSuccessData(null);
            fetchStudents();
          }}
        >
          <div
            className="edit-profile-success-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-success-title"
          >
            {/* Upper Pale Sage Green Section */}
            <div className="edit-profile-success-top">
              <div className="student-reg-success-mascot-wrap">
                <img
                  src={fixieMascotSuccess}
                  alt="Updated Successfully"
                  className="student-reg-success-mascot-img"
                />
              </div>

              <h2 id="edit-success-title" className="edit-profile-success-title">
                Updated Successfully!
              </h2>

              <p className="edit-profile-success-subtitle">
                Your changes have been saved. The student’s information is now up to date.
              </p>
            </div>

            {/* Lower Crisp White Footer with Continue Button */}
            <div className="edit-profile-success-footer">
              <button
                type="button"
                className="student-reg-success-btn-continue"
                onClick={() => {
                  setEditSuccessData(null);
                  fetchStudents();
                }}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================
          MODAL 4: DEACTIVATE ACCOUNT CONFIRMATION (Image 1)
          ==================================================== */}
      {disablingStudent && (
        <div className="modal-backdrop-overlay" onClick={() => setDisablingStudent(null)}>
          <div
            className="deactivate-confirm-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="deactivate-confirm-title"
          >
            {/* Upper Pale Sage Green Section */}
            <div className="deactivate-confirm-top">
              <div className="deactivate-mascot-wrap">
                <img
                  src={fixieMascotSad}
                  alt="Deactivate Confirmation"
                  className="deactivate-mascot-img"
                />
              </div>

              <h2 id="deactivate-confirm-title" className="deactivate-confirm-title">
                Deactivate the account?
              </h2>

              <p className="deactivate-confirm-subtitle">
                The student will no longer be able to log in. This cannot be undone from here.
              </p>
            </div>

            {/* Lower Crisp White Footer with Cancel & Confirm Buttons */}
            <div className="deactivate-confirm-footer">
              <button
                type="button"
                className="btn-deactivate-cancel"
                onClick={() => setDisablingStudent(null)}
              >
                Cancel
              </button>

              <button
                type="button"
                className="btn-deactivate-confirm"
                disabled={isDeactivating}
                onClick={handleConfirmDisable}
              >
                {isDeactivating ? 'Deactivating...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================
          MODAL 5: ACCOUNT DEACTIVATED SUCCESS (Image 2)
          ==================================================== */}
      {deactivateSuccessData && (
        <div
          className="modal-backdrop-overlay"
          onClick={() => {
            setDeactivateSuccessData(null);
            fetchStudents();
          }}
        >
          <div
            className="deactivate-success-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="deactivate-success-title"
          >
            {/* Upper Pale Sage Green Section */}
            <div className="deactivate-success-top">
              <div className="deactivate-mascot-wrap">
                <img
                  src={fixieMascotSuccess}
                  alt="Account Deactivated"
                  className="deactivate-mascot-img"
                />
              </div>

              <h2 id="deactivate-success-title" className="deactivate-success-title">
                Account Deactivated!
              </h2>

              <p className="deactivate-success-subtitle">
                <span className="deactivate-success-id-serif">
                  {deactivateSuccessData.student_id || deactivateSuccessData.studentId}
                </span>{' '}
                can no longer log in.
              </p>
            </div>

            {/* Lower Crisp White Footer with Continue Button */}
            <div className="deactivate-success-footer">
              <button
                type="button"
                className="student-reg-success-btn-continue"
                onClick={() => {
                  setDeactivateSuccessData(null);
                  fetchStudents();
                }}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

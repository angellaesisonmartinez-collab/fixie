import { supabase } from './supabase.js';
import { formatStudentName, formatYearBlock, formatStudentEmail } from './studentFormatUtils.js';

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

/**
 * Normalizes a raw student record into a clean UI-ready object.
 */
export function formatStudentListItem(st) {
  if (!st) return null;
  const fullName = formatStudentName(st) || st.name || `${st.first_name || ''} ${st.last_name || ''}`.trim();
  const yearBlock = formatYearBlock(st.year_block);
  const normStatus = st.status === 'active' ? 'active' : 'deactivated';
  const cleanEmail = formatStudentEmail(st.email);

  return {
    ...st,
    id: st.id || st.student_id,
    student_id: st.student_id,
    email: cleanEmail,
    name: fullName,
    year_block: yearBlock,
    date_registered: st.date_registered || (st.created_at ? st.created_at.split('T')[0] : null),
    created_at: st.created_at,
    status: normStatus,
    must_change_password: Boolean(st.must_change_password),
  };
}

// In-memory module cache for instant 0ms hydration
let cachedStudentsList = null;
let inFlightStudentsPromise = null;

export function getCachedStudents() {
  return cachedStudentsList;
}

export function setCachedStudents(list) {
  if (Array.isArray(list)) {
    cachedStudentsList = [...list].sort(sortStudentsByRegistrationDateDesc);
  } else {
    cachedStudentsList = list;
  }
}

export function clearStudentsCache() {
  cachedStudentsList = null;
  inFlightStudentsPromise = null;
}

export function getCachedStudentMetrics() {
  if (!cachedStudentsList) return null;
  const activeStudents = cachedStudentsList.filter((s) => s.status === 'active').length;
  const deactivatedStudents = cachedStudentsList.filter((s) => s.status !== 'active').length;
  const totalStudents = cachedStudentsList.length;

  return {
    activeStudents,
    deactivatedStudents,
    totalStudents,
  };
}

/**
 * Fetch all students from Supabase (single source of truth)
 * Updates the in-memory cache and returns the sorted students list.
 */
export async function fetchStudentsData(forceRefresh = false) {
  if (!forceRefresh && cachedStudentsList) {
    return cachedStudentsList;
  }

  if (!forceRefresh && inFlightStudentsPromise) {
    return inFlightStudentsPromise;
  }

  inFlightStudentsPromise = (async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('date_registered', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Could not fetch from Supabase students table:', error.message);
        return cachedStudentsList || [];
      }

      if (data && Array.isArray(data)) {
        const formatted = data.map(formatStudentListItem).filter(Boolean);
        formatted.sort(sortStudentsByRegistrationDateDesc);
        cachedStudentsList = formatted;
        return formatted;
      }

      return cachedStudentsList || [];
    } catch (err) {
      console.warn('Students fetch exception:', err?.message || err);
      return cachedStudentsList || [];
    } finally {
      inFlightStudentsPromise = null;
    }
  })();

  return inFlightStudentsPromise;
}

/**
 * Update the in-memory cache synchronously when a Realtime event arrives,
 * ensuring background updates are immediately reflected even if StudentsPage was unmounted.
 */
export function updateCachedStudent(payload) {
  if (!payload || !cachedStudentsList) return;

  const targetId = payload.student_id || payload.id;
  const eventType = payload.eventType || (payload.new ? 'UPDATE' : 'INSERT');

  if (eventType === 'DELETE') {
    cachedStudentsList = cachedStudentsList.filter(
      (s) => s.id !== targetId && s.student_id !== targetId
    );
    return;
  }

  const raw = payload.student || payload.new || payload;
  const formatted = formatStudentListItem(raw);
  if (!formatted) return;

  if (eventType === 'INSERT') {
    const exists = cachedStudentsList.some(
      (s) => s.id === formatted.id || s.student_id === formatted.student_id
    );
    if (!exists) {
      cachedStudentsList = [formatted, ...cachedStudentsList].sort(sortStudentsByRegistrationDateDesc);
    } else {
      cachedStudentsList = cachedStudentsList.map((s) =>
        s.id === formatted.id || s.student_id === formatted.student_id ? { ...s, ...formatted } : s
      ).sort(sortStudentsByRegistrationDateDesc);
    }
    return;
  }

  // UPDATE
  let matched = false;
  cachedStudentsList = cachedStudentsList.map((s) => {
    if (s.id === targetId || s.student_id === targetId) {
      matched = true;
      return { ...s, ...formatted };
    }
    return s;
  });

  if (!matched && formatted.status === 'active') {
    cachedStudentsList = [formatted, ...cachedStudentsList].sort(sortStudentsByRegistrationDateDesc);
  }
}

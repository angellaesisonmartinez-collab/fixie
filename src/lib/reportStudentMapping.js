/**
 * Canonical mapping of report IDs to authentic student reporters.
 * Matches the Supabase database records where Angel Lae Martinez has 18 reports (LR-01 to LR-18).
 */

import angelAvatar from '../assets/avatars/angel.png';
import jennelynAvatar from '../assets/avatars/jennelyn.png';
import reynAvatar from '../assets/avatars/reyn.png';
import juanAvatar from '../assets/avatars/juan.png';
import mariaAvatar from '../assets/avatars/maria.png';
import mariaOrtizAvatar from '../assets/avatars/maria_ortiz.png';
import phiaAvatar from '../assets/avatars/phia.png';
import { getStudentAvatar } from './studentAvatarUtils';
import { formatStudentName } from './studentFormatUtils';
import { supabase } from './supabase';

const ANGEL_RECORD = {
  student_id: '24-0041-147',
  name: 'Angel Lae Martinez',
  first_name: 'Angel Lae',
  last_name: 'Martinez',
  year_block: '3rd year, BLK 2',
  email: 'martinezangellaewup@gmail.com',
  uuid: '9002d8e6-bc03-4070-8aae-299147dead9a',
  avatar: angelAvatar,
};

export const AUTHENTIC_REPORT_STUDENTS = {
  // Angel Lae Martinez: exactly 18 reports (LR-01 to LR-18)
  'LR-01': ANGEL_RECORD,
  'LR-02': ANGEL_RECORD,
  'LR-03': ANGEL_RECORD,
  'LR-04': ANGEL_RECORD,
  'LR-05': ANGEL_RECORD,
  'LR-06': ANGEL_RECORD,
  'LR-07': ANGEL_RECORD,
  'LR-08': ANGEL_RECORD,
  'LR-09': ANGEL_RECORD,
  'LR-10': ANGEL_RECORD,
  'LR-11': ANGEL_RECORD,
  'LR-12': ANGEL_RECORD,
  'LR-13': ANGEL_RECORD,
  'LR-14': ANGEL_RECORD,
  'LR-15': ANGEL_RECORD,
  'LR-16': ANGEL_RECORD,
  'LR-17': ANGEL_RECORD,
  'LR-18': ANGEL_RECORD,

  // Other students' reports
  'LR-19': {
    student_id: '24-4011-088',
    name: 'Phia Cayetano',
    first_name: 'Phia',
    last_name: 'Cayetano',
    year_block: '4th year, BLK 1',
    email: 'phia.cayetano@gmail.com',
    uuid: '43516fd4-6370-409e-96c0-5acc8d56d9c6',
    avatar: phiaAvatar,
  },
  'LR-20': {
    student_id: '24-8521-063',
    name: 'Maria Reyes',
    first_name: 'Maria',
    last_name: 'Reyes',
    year_block: '1st year, BLK 1',
    email: 'mariareyes@gmail.com',
    uuid: '21877a55-8600-4a5d-88ce-4e0746c23898',
    avatar: mariaAvatar,
  },
  'LR-21': {
    student_id: '24-0031-267',
    name: 'Juan Dela Cruz',
    first_name: 'Juan',
    last_name: 'Dela Cruz',
    year_block: '2nd year, BLK 2',
    email: 'jualdelacruz@gmail.com',
    uuid: '82f230ea-abdb-4bc2-8fea-e87eb897299c',
    avatar: juanAvatar,
  },
  'LR-22': {
    student_id: '24-7345-853',
    name: 'Reyn Arahan',
    first_name: 'Reyn',
    last_name: 'Arahan',
    year_block: '3rd year, BLK 1',
    email: 'reynarahan@gmail.com',
    uuid: 'a9974b97-4eb0-4876-8a62-cdc86023bbd4',
    avatar: reynAvatar,
  },
  'LR-23': {
    student_id: '24-2026-340',
    name: 'Jennelyn Vergara',
    first_name: 'Jennelyn',
    last_name: 'Vergara',
    year_block: '3rd year, BLK 2',
    email: 'jennelynvergara@gmail.com',
    uuid: '51664213-275b-4e67-9024-d92d7e0a8022',
    avatar: jennelynAvatar,
  },
  'LR-24': {
    student_id: '24-0872-090',
    name: 'Maria Ortiz',
    first_name: 'Maria',
    last_name: 'Ortiz',
    year_block: '3rd year, BLK 1',
    email: 'maria.ortiz@gmail.com',
    uuid: 'd168ef6a-b9c3-4f47-8860-5a1a0c28f76f',
    avatar: mariaOrtizAvatar,
  },
  'LR-25': {
    student_id: '24-2026-106',
    name: 'Bianca Allyzon Antonio',
    first_name: 'Bianca Allyzon',
    last_name: 'Antonio',
    year_block: '2nd year, BLK 2',
    email: 'bianca@gmail.com',
    uuid: 'c52fa8d2-b505-4249-b012-060e313fe18e',
    avatar: getStudentAvatar({ student_id: '24-2026-106' }),
  },
  'LR-26': {
    student_id: '24-2026-107',
    name: 'Chryztel Geene Salvador',
    first_name: 'Chryztel Geene',
    last_name: 'Salvador',
    year_block: '2nd year, BLK 1',
    email: 'geene@gmail.com',
    uuid: 'e101ced6-cc94-4d17-83e7-c519782f7dba',
    avatar: getStudentAvatar({ student_id: '24-2026-107' }),
  },
  'LR-27': {
    student_id: '24-2026-108',
    name: 'John Lester Tan',
    first_name: 'John Lester',
    last_name: 'Tan',
    year_block: '3rd year, BLK 1',
    email: 'lester@gmail.com',
    uuid: 'bbb5f955-b361-4929-8055-031d61dd4f58',
    avatar: getStudentAvatar({ student_id: '24-2026-108' }),
  },
};

// In-memory student cache keyed by student_id and database id (UUID)
const studentCache = new Map();

/**
 * Cache student record in-memory for instant 0ms retrieval.
 */
export function cacheStudentProfile(student) {
  if (!student || typeof student !== 'object') return;
  if (student.id) studentCache.set(student.id, student);
  if (student.student_id) studentCache.set(student.student_id, student);
  if (student.uuid) studentCache.set(student.uuid, student);
}

/**
 * Dynamically fetches a student record from Supabase by UUID or Student ID.
 */
export async function fetchStudentForReport(studentIdOrUuid) {
  if (!studentIdOrUuid) return null;
  const cached = studentCache.get(studentIdOrUuid);
  if (cached && (cached.name || cached.first_name || cached.full_name)) {
    return cached;
  }

  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(studentIdOrUuid);
    const query = isUuid
      ? supabase.from('students').select('*').eq('id', studentIdOrUuid).maybeSingle()
      : supabase.from('students').select('*').or(`student_id.eq.${studentIdOrUuid},id.eq.${studentIdOrUuid}`).maybeSingle();

    const { data, error } = await query;
    if (!error && data) {
      const formatted = {
        ...data,
        name: formatStudentName(data) || data.name || `${data.first_name || ''} ${data.last_name || ''}`.trim(),
        avatar: getStudentAvatar(data),
      };
      cacheStudentProfile(formatted);
      return formatted;
    }
  } catch (err) {
    console.warn('Note on fetching student for report:', err);
  }
  return null;
}

/**
 * Resolves the student metadata for a given report object and joined student object.
 * Always prefers the authentic database relation when present.
 */
export function resolveAuthenticReportStudent(reportId, dbStudent = null) {
  // Check if dbStudent is a valid student object (and not a raw report object)
  const isRawReport = dbStudent && (dbStudent.unit_number !== undefined || dbStudent.equipment !== undefined);
  const hasRealStudentInfo =
    dbStudent &&
    !isRawReport &&
    (dbStudent.name ||
      dbStudent.full_name ||
      dbStudent.first_name ||
      dbStudent.last_name ||
      (dbStudent.student_id && /^\d{2}-\d{4}-\d{3}$/.test(dbStudent.student_id)));

  if (hasRealStudentInfo) {
    const fullName = formatStudentName(dbStudent) || dbStudent.name || dbStudent.full_name;
    const resolved = {
      ...dbStudent,
      name: fullName,
      full_name: fullName,
      avatar: getStudentAvatar(dbStudent),
    };
    cacheStudentProfile(resolved);
    return resolved;
  }

  // Check cache by student_id or id if dbStudent was a UUID string or reference
  const potentialId = typeof dbStudent === 'string'
    ? dbStudent
    : (dbStudent?.student_id || dbStudent?.id);

  if (potentialId && studentCache.has(potentialId)) {
    const cached = studentCache.get(potentialId);
    if (cached && (cached.name || cached.first_name || cached.full_name)) {
      const fullName = formatStudentName(cached) || cached.name || cached.full_name;
      return {
        ...cached,
        name: fullName,
        full_name: fullName,
        avatar: cached.avatar || getStudentAvatar(cached),
      };
    }
  }

  const authentic = AUTHENTIC_REPORT_STUDENTS[reportId];
  if (authentic) {
    cacheStudentProfile(authentic);
    return authentic;
  }

  return dbStudent && !isRawReport ? dbStudent : {};
}

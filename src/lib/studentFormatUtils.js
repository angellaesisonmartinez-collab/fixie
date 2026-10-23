/**
 * Utility functions to ensure consistent formatting of student data across
 * Technical Personnel Dashboard, Students Page, and Reports Page.
 */

/**
 * Formats student name to display complete first and last name,
 * without middle name or middle initial.
 * E.g., 'Angel Lae Martinez', 'Maria Ortiz', 'Juan Dela Cruz'.
 *
 * @param {object|string} studentOrName
 * @returns {string}
 */
export function formatStudentName(studentOrName) {
  if (!studentOrName) return '';

  if (typeof studentOrName === 'object') {
    const { first_name, last_name, name, full_name, middle_name } = studentOrName;
    if (first_name && last_name) {
      return `${first_name.trim()} ${last_name.trim()}`;
    }
    const rawName = name || full_name;
    if (rawName) {
      return cleanStudentNameString(rawName, middle_name);
    }
    if (first_name) {
      return first_name.trim();
    }
    return '';
  }

  if (typeof studentOrName === 'string') {
    return cleanStudentNameString(studentOrName);
  }

  return String(studentOrName);
}

/**
 * Strips middle name or middle initial (e.g., 'S.', 'Santos') from a full name string
 */
export function cleanStudentNameString(nameStr, middleName = null) {
  if (!nameStr) return '';
  let cleaned = nameStr.trim();

  // If explicit middleName provided, remove it
  if (middleName && typeof middleName === 'string' && middleName.trim()) {
    const midRegex = new RegExp(`\\s+${escapeRegex(middleName.trim())}\\s+`, 'gi');
    cleaned = cleaned.replace(midRegex, ' ');
  }

  // Remove middle initial with period, e.g. "Angel Lae S. Martinez" -> "Angel Lae Martinez"
  cleaned = cleaned.replace(/\s+[A-Za-z]\.\s+/g, ' ');

  // Remove standalone single-letter middle initial, e.g. "Angel Lae S Martinez" -> "Angel Lae Martinez"
  cleaned = cleaned.replace(/\s+[A-Za-z]\s+/g, ' ');

  // Normalize specific database edge cases like "Maria Santos Ortiz" -> "Maria Ortiz"
  cleaned = cleaned.replace(/\bSantos\s+Ortiz\b/gi, 'Ortiz');

  return cleaned.trim();
}

/**
 * Formats year level and block/section to 'Xth year, BLK Y' format.
 * E.g., '3rd year, BLK 2' instead of 'BSIT 3-2' or '3-2'.
 *
 * @param {string} rawYearBlock
 * @returns {string}
 */
export function formatYearBlock(rawYearBlock) {
  if (!rawYearBlock || typeof rawYearBlock !== 'string') return '';
  const trimmed = rawYearBlock.trim();

  // If already matches: "3rd year, BLK 2" or "3rd year, Block 2"
  const standardMatch = trimmed.match(/^(\d)(?:st|nd|rd|th)?\s*year[,\s]*(?:BLK|Block)\s*(\d+)$/i);
  if (standardMatch) {
    const yr = standardMatch[1];
    const blk = standardMatch[2];
    const suffix = yr === '1' ? '1st' : yr === '2' ? '2nd' : yr === '3' ? '3rd' : `${yr}th`;
    return `${suffix} year, BLK ${blk}`;
  }

  // If matches "BSIT 3-2" or "3-2" or "BSIT 3/2"
  const bsitMatch = trimmed.match(/^(?:BSIT\s*)?(\d)\s*[-/]\s*(\d+)$/i);
  if (bsitMatch) {
    const yr = bsitMatch[1];
    const blk = bsitMatch[2];
    const suffix = yr === '1' ? '1st' : yr === '2' ? '2nd' : yr === '3' ? '3rd' : `${yr}th`;
    return `${suffix} year, BLK ${blk}`;
  }

  // Fallback: replace Block with BLK if present
  return trimmed.replace(/\bBlock\b/gi, 'BLK');
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Formats student email to strip out internal subaddress/plus-addressing tags
 * (e.g. martinezangellaewup+247890230@gmail.com -> martinezangellaewup@gmail.com)
 * so that the user and UI always see the clean, real email address.
 *
 * @param {string} email
 * @returns {string}
 */
export function formatStudentEmail(email) {
  if (!email || typeof email !== 'string') return '';
  return email.trim().replace(/\+[^@]+@/, '@');
}

/**
 * Official Student ID format requirement: XX-XXXX-XXX (e.g. 24-0908-909)
 */
export const STUDENT_ID_REGEX = /^\d{2}-\d{4}-\d{3}$/;

/**
 * Automatically masks/formats student ID input to strictly adhere to XX-XXXX-XXX format.
 * Strips non-digits, limits to 9 digits, and auto-inserts hyphens:
 * e.g., '240908909' -> '24-0908-909'
 *
 * @param {string} val
 * @returns {string}
 */
export function formatStudentIdInput(val) {
  if (!val) return '';
  const clean = val.replace(/\D/g, '').slice(0, 9);
  if (clean.length <= 2) {
    return clean;
  }
  if (clean.length <= 6) {
    return `${clean.slice(0, 2)}-${clean.slice(2)}`;
  }
  return `${clean.slice(0, 2)}-${clean.slice(2, 6)}-${clean.slice(6, 9)}`;
}

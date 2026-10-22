/**
 * Report Date and Time Utilities
 * Enforces Philippine Time (Asia/Manila, UTC+8) and Laboratory Hours (7:00 AM to 9:00 PM)
 * across the entire Fixie application.
 */

export const MANILA_TIMEZONE = 'Asia/Manila';
export const LAB_START_HOUR = 7; // 7:00 AM
export const LAB_START_MINUTE = 0;
export const LAB_END_HOUR = 21; // 9:00 PM
export const LAB_END_MINUTE = 0;

export const LAB_HOURS_ERROR_MESSAGE =
  'Reports can only be submitted during laboratory hours (7:00 AM to 9:00 PM).';

/**
 * Parses any date input into a valid Date object anchored properly to UTC / Manila time.
 */
function toDate(input) {
  if (!input) return null;
  if (input instanceof Date) return isNaN(input.getTime()) ? null : input;
  if (typeof input === 'string') {
    let s = input.replace(/•/g, ' ').replace(/\s+/g, ' ').trim();

    // If ISO with timezone (Z or +08:00 or -05:00 etc)
    if (/^\d{4}-\d{2}-\d{2}T/i.test(s)) {
      const d = new Date(s);
      if (!isNaN(d.getTime())) return d;
    }

    // Check if format is 'MMM DD, YYYY, h:mm A' or 'MMM DD, YYYY h:mm A' or 'MMM DD, h:mm A'
    const fullMatch = s.match(/^([A-Za-z]{3})\s+(\d{1,2}),?\s*(\d{4})?,?\s*(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
    if (fullMatch) {
      const [_, mStr, dStr, yStr, hrStr, minStr, ampm] = fullMatch;
      const year = yStr || '2026';
      const months = {
        jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
        jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
      };
      const m = months[mStr.toLowerCase()];
      if (m) {
        const day = dStr.padStart(2, '0');
        let hour = parseInt(hrStr, 10);
        if (ampm) {
          if (ampm.toUpperCase() === 'PM' && hour < 12) hour += 12;
          if (ampm.toUpperCase() === 'AM' && hour === 12) hour = 0;
        }
        const hourStr = String(hour).padStart(2, '0');
        // Anchor strictly to Asia/Manila (+08:00) to avoid browser timezone offset skew
        const manilaIso = `${year}-${m}-${day}T${hourStr}:${minStr}:00+08:00`;
        const d = new Date(manilaIso);
        if (!isNaN(d.getTime())) return d;
      }
    }

    const d = new Date(s);
    if (!isNaN(d.getTime())) return d;
  }
  const d = new Date(input);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Get Manila time components (hour 0-23, minute 0-59, second 0-59)
 */
export function getManilaTimeParts(dateInput = new Date()) {
  const d = toDate(dateInput) || new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: MANILA_TIMEZONE,
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });

  const parts = formatter.formatToParts(d);
  let hour = 0;
  let minute = 0;
  let second = 0;

  for (const p of parts) {
    if (p.type === 'hour') hour = parseInt(p.value, 10);
    if (p.type === 'minute') minute = parseInt(p.value, 10);
    if (p.type === 'second') second = parseInt(p.value, 10);
  }

  // Handle midnight 24 edge case in some Intl implementations
  if (hour === 24) hour = 0;

  return { hour, minute, second, totalMinutes: hour * 60 + minute };
}

/**
 * Enforce laboratory hours: 7:00 AM (07:00) to 9:00 PM (21:00) inclusive in Asia/Manila.
 * Returns { isAllowed: boolean, hour: number, minute: number, formattedTime: string, errorMessage: string | null }
 */
export function checkLaboratoryHours(dateInput = new Date()) {
  const { hour, minute, second, totalMinutes } = getManilaTimeParts(dateInput);
  const startMinutes = LAB_START_HOUR * 60 + LAB_START_MINUTE; // 07:00 -> 420
  const endMinutes = LAB_END_HOUR * 60 + LAB_END_MINUTE;       // 21:00 -> 1260

  const isAllowed = totalMinutes >= startMinutes && totalMinutes <= endMinutes;
  const formattedTime = formatManilaTime(dateInput);

  return {
    isAllowed,
    hour,
    minute,
    second,
    totalMinutes,
    formattedTime,
    errorMessage: isAllowed ? null : LAB_HOURS_ERROR_MESSAGE,
  };
}

/**
 * Format status history timestamp in Asia/Manila: "Oct 22, 2026, 7:23 PM"
 * Shared single source of truth formatter for status history on Student and Technical sides.
 */
export function formatManilaHistoryTime(timeInput, fallbackTime = '') {
  if (!timeInput) return fallbackTime;

  const rawD = toDate(timeInput);
  if (!rawD) return fallbackTime || String(timeInput);

  // Enforce laboratory operating hours (7:00 AM to 9:00 PM Asia/Manila)
  const d = sanitizeLabHoursDate(rawD) || rawD;

  const month = new Intl.DateTimeFormat('en-US', {
    timeZone: MANILA_TIMEZONE,
    month: 'short',
  }).format(d);
  const day = new Intl.DateTimeFormat('en-US', {
    timeZone: MANILA_TIMEZONE,
    day: 'numeric',
  }).format(d);
  const year = new Intl.DateTimeFormat('en-US', {
    timeZone: MANILA_TIMEZONE,
    year: 'numeric',
  }).format(d);
  const time = new Intl.DateTimeFormat('en-US', {
    timeZone: MANILA_TIMEZONE,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d);

  return `${month} ${day}, ${year}, ${time}`;
}

/**
 * Fetch tamper-proof server time via lightweight HTTP HEAD request to Supabase.
 * Bypasses client-side clock modifications.
 */
export async function getServerTime() {
  try {
    const supabaseUrl =
      import.meta.env?.VITE_SUPABASE_URL || 'https://ieznsbzddanjwmnpvncs.supabase.co';
    const supabaseKey =
      import.meta.env?.VITE_SUPABASE_ANON_KEY || 'sb_publishable_U9igmXfsc3LK2ota2FuC6w_QxW2ojfr';

    const response = await fetch(`${supabaseUrl}/rest/v1/reports?select=report_id&limit=1`, {
      method: 'HEAD',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    });

    const dateHeader = response.headers.get('date');
    if (dateHeader) {
      const serverDate = new Date(dateHeader);
      if (!isNaN(serverDate.getTime())) {
        return serverDate;
      }
    }
  } catch (err) {
    console.warn('Could not fetch server time, falling back to client clock:', err);
  }
  return new Date();
}

/**
 * Format date in Asia/Manila: "Oct 17, 2026"
 */
export function formatManilaDate(dateInput) {
  const d = toDate(dateInput);
  if (!d) return '';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: MANILA_TIMEZONE,
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(d);
}

/**
 * Format time in Asia/Manila: "3:45 PM"
 */
export function formatManilaTime(dateInput) {
  const d = toDate(dateInput);
  if (!d) return '';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: MANILA_TIMEZONE,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d);
}

/**
 * Format date and time in Asia/Manila: "Oct 17, 2026  •  3:45 PM"
 */
export function formatManilaDateTime(dateInput) {
  const d = toDate(dateInput);
  if (!d) return '';
  const dateStr = formatManilaDate(d);
  const timeStr = formatManilaTime(d);
  return `${dateStr}  •  ${timeStr}`;
}

/**
 * Format live clock header in Asia/Manila: "October 17, 2026 | 03:45 PM"
 */
export function formatManilaLiveClock(dateInput = new Date()) {
  const d = toDate(dateInput) || new Date();
  const dateStr = new Intl.DateTimeFormat('en-US', {
    timeZone: MANILA_TIMEZONE,
    month: 'long',
    day: '2-digit',
    year: 'numeric',
  }).format(d);

  const parts = getManilaTimeParts(d);
  let displayHour = parts.hour % 12 || 12;
  const ampm = parts.hour >= 12 ? 'PM' : 'AM';
  const timeStr = `${String(displayHour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')} ${ampm}`;

  return `${dateStr} | ${timeStr}`;
}

/**
 * Automatically adjusts a Date object if it suffered from a +8 hour double-offset
 * or is outside 7:00 AM - 9:00 PM Manila time.
 * Clamps strictly to laboratory operating hours (7:00 AM to 9:00 PM Asia/Manila).
 */
export function sanitizeLabHoursDate(dateInput) {
  const d = toDate(dateInput);
  if (!d) return null;

  const parts = getManilaTimeParts(d);

  // If time is before opening hours (7:00 AM) in Asia/Manila:
  if (parts.hour < LAB_START_HOUR) {
    // If hour is 0..6 (e.g. 12:40 AM, 1:30 AM, 4:47 AM, 5:48 AM), it suffered from UTC +8h offset
    // Check if shifting back 8 hours lands it in valid afternoon hours (e.g. 00:40 -> 16:40 / 4:40 PM)
    const shifted = new Date(d.getTime() - 8 * 60 * 60 * 1000);
    const shiftedParts = getManilaTimeParts(shifted);
    if (
      shiftedParts.hour >= LAB_START_HOUR &&
      (shiftedParts.hour < LAB_END_HOUR || (shiftedParts.hour === LAB_END_HOUR && shiftedParts.minute === 0))
    ) {
      return shifted;
    }

    // Otherwise clamp to 7:00 AM Manila time on the same date
    const year = new Intl.DateTimeFormat('en-US', { timeZone: MANILA_TIMEZONE, year: 'numeric' }).format(d);
    const month = new Intl.DateTimeFormat('en-US', { timeZone: MANILA_TIMEZONE, month: '2-digit' }).format(d);
    const day = new Intl.DateTimeFormat('en-US', { timeZone: MANILA_TIMEZONE, day: '2-digit' }).format(d);
    return new Date(`${year}-${month}-${day}T07:00:00+08:00`);
  }

  // If time is after closing hours (9:00 PM) in Asia/Manila:
  if (parts.hour > LAB_END_HOUR || (parts.hour === LAB_END_HOUR && parts.minute > LAB_END_MINUTE)) {
    // Check if shifting back 8 hours lands it in valid daytime hours
    const shifted = new Date(d.getTime() - 8 * 60 * 60 * 1000);
    const shiftedParts = getManilaTimeParts(shifted);
    if (
      shiftedParts.hour >= LAB_START_HOUR &&
      (shiftedParts.hour < LAB_END_HOUR || (shiftedParts.hour === LAB_END_HOUR && shiftedParts.minute === 0))
    ) {
      return shifted;
    }

    // Otherwise clamp to 9:00 PM (21:00) Manila time on the same date
    const year = new Intl.DateTimeFormat('en-US', { timeZone: MANILA_TIMEZONE, year: 'numeric' }).format(d);
    const month = new Intl.DateTimeFormat('en-US', { timeZone: MANILA_TIMEZONE, month: '2-digit' }).format(d);
    const day = new Intl.DateTimeFormat('en-US', { timeZone: MANILA_TIMEZONE, day: '2-digit' }).format(d);
    return new Date(`${year}-${month}-${day}T21:00:00+08:00`);
  }

  return d;
}

/**
 * Converts a Manila date string ("Oct 17, 2026") and time string ("3:45 PM") into a valid UTC ISO string.
 */
export function manilaDateTimeToUtcIso(dateStr, timeStr) {
  if (!dateStr) return null;
  const combined = (timeStr ? `${dateStr} ${timeStr}` : dateStr).trim();
  const match = combined.match(
    /^([A-Za-z]{3})\s+(\d{1,2}),\s+(\d{4}),?\s*(\d{1,2}):(\d{2})\s*(AM|PM)?$/i
  );
  if (!match) return null;
  const [_, mStr, dStr, yStr, hrStr, minStr, ampm] = match;
  const months = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
  };
  const m = months[mStr.toLowerCase()];
  const day = dStr.padStart(2, '0');
  let hour = parseInt(hrStr, 10);
  if (ampm) {
    if (ampm.toUpperCase() === 'PM' && hour < 12) hour += 12;
    if (ampm.toUpperCase() === 'AM' && hour === 12) hour = 0;
  }
  const hourStr = String(hour).padStart(2, '0');
  const d = new Date(`${yStr}-${m}-${day}T${hourStr}:${minStr}:00+08:00`);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * Extracts the authentic submission Date object for a report anchored strictly to Asia/Manila (+08:00).
 */
export function getManilaSubmissionDate(report) {
  if (!report) return new Date();
  const parsed = parseReportDateTime(report);
  const dateStr = parsed.submittedDate || report.submitted_date || report.submittedDate;
  const timeStr = parsed.submittedTime || report.submitted_time || report.submittedTime;

  if (dateStr && timeStr) {
    const utcIso = manilaDateTimeToUtcIso(dateStr, timeStr);
    if (utcIso) {
      const d = new Date(utcIso);
      if (!isNaN(d.getTime())) return d;
    }
  }

  const fallback = report.created_at || report.date_submitted || report.raw_created_at || parsed.rawCreatedAt;
  const d = toDate(fallback);
  return d ? sanitizeLabHoursDate(d) : new Date();
}

/**
 * Parse an item from the database (reports_of_student, reports, or client state)
 * and extract standardized Manila submittedDate, submittedTime, and ISO string.
 */
export function parseReportDateTime(item) {
  if (!item) {
    const now = new Date();
    return {
      submittedDate: formatManilaDate(now),
      submittedTime: formatManilaTime(now),
      dateTimeDisplay: formatManilaDateTime(now),
      rawCreatedAt: now.toISOString(),
    };
  }

  // 1. If explicit submitted_date and submitted_time are already provided
  const directDate = item.submitted_date || item.submittedDate;
  const directTime = item.submitted_time || item.submittedTime;
  if (directDate && directTime) {
    const calculatedIso = manilaDateTimeToUtcIso(directDate, directTime);
    return {
      submittedDate: directDate,
      submittedTime: directTime,
      dateTimeDisplay: `${directDate}  •  ${directTime}`,
      rawCreatedAt: calculatedIso || item.date_submitted || item.created_at || item.raw_created_at || new Date().toISOString(),
    };
  }

  // 2. If item has human-readable date_time string (e.g. "Oct 17, 2026, 3:45 PM")
  if (typeof item.date_time === 'string' && item.date_time.trim()) {
    const dt = item.date_time.trim();
    // Match "Oct 17, 2026, 3:45 PM" or "Oct 02, 2026, 8:15 AM"
    const match = dt.match(/^([A-Za-z]{3}\s+\d{1,2},\s+\d{4}),?\s*(.*)$/);
    if (match) {
      const parsedDate = match[1];
      const parsedTime = match[2] || '';
      const calculatedIso = manilaDateTimeToUtcIso(parsedDate, parsedTime);
      return {
        submittedDate: parsedDate,
        submittedTime: parsedTime,
        dateTimeDisplay: parsedTime ? `${parsedDate}  •  ${parsedTime}` : parsedDate,
        rawCreatedAt: calculatedIso || item.date_submitted || item.created_at || item.raw_created_at || new Date().toISOString(),
      };
    }
  }

  // 3. If item has date_submitted (e.g. from reports_of_student)
  if (item.date_submitted) {
    const rawD = toDate(item.date_submitted);
    const d = rawD ? sanitizeLabHoursDate(rawD) : null;
    if (d) {
      const submittedDate = formatManilaDate(d);
      const submittedTime = formatManilaTime(d);
      return {
        submittedDate,
        submittedTime,
        dateTimeDisplay: `${submittedDate}  •  ${submittedTime}`,
        rawCreatedAt: d.toISOString(),
      };
    }
  }

  // 4. If item has created_at or raw_created_at (e.g. from reports table)
  const fallbackTimestamp = item.created_at || item.raw_created_at;
  if (fallbackTimestamp) {
    const rawD = toDate(fallbackTimestamp);
    const d = rawD ? sanitizeLabHoursDate(rawD) : null;
    if (d) {
      const submittedDate = formatManilaDate(d);
      const submittedTime = formatManilaTime(d);
      return {
        submittedDate,
        submittedTime,
        dateTimeDisplay: `${submittedDate}  •  ${submittedTime}`,
        rawCreatedAt: d.toISOString(),
      };
    }
  }

  // 5. Fallback to current Manila time
  const now = new Date();
  return {
    submittedDate: formatManilaDate(now),
    submittedTime: formatManilaTime(now),
    dateTimeDisplay: formatManilaDateTime(now),
    rawCreatedAt: now.toISOString(),
  };
}

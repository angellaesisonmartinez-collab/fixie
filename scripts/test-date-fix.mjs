const MANILA_TIMEZONE = 'Asia/Manila';

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
        // Anchor strictly to Asia/Manila (+08:00)
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

function formatManilaHistoryTime(timeInput, fallbackTime = '') {
  if (!timeInput) return fallbackTime;
  if (typeof timeInput === 'string') {
    const s = timeInput.trim();
    // If already in 'Oct 23, 2026, 2:35 PM' format
    const alreadyFormatted = s.match(/^[A-Za-z]{3}\s+\d{1,2},\s+\d{4},\s+\d{1,2}:\d{2}\s+(?:AM|PM)$/i);
    if (alreadyFormatted) return s;
  }

  const rawD = toDate(timeInput);
  if (!rawD) return fallbackTime || String(timeInput);

  const month = new Intl.DateTimeFormat('en-US', {
    timeZone: MANILA_TIMEZONE,
    month: 'short',
  }).format(rawD);
  const day = new Intl.DateTimeFormat('en-US', {
    timeZone: MANILA_TIMEZONE,
    day: 'numeric',
  }).format(rawD);
  const year = new Intl.DateTimeFormat('en-US', {
    timeZone: MANILA_TIMEZONE,
    year: 'numeric',
  }).format(rawD);
  const time = new Intl.DateTimeFormat('en-US', {
    timeZone: MANILA_TIMEZONE,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(rawD);

  return `${month} ${day}, ${year}, ${time}`;
}

// Test cases
console.log('1. ISO UTC:', formatManilaHistoryTime('2026-10-22T17:30:21.629Z')); // Should be Oct 23, 2026, 1:30 AM
console.log('2. ISO Manila:', formatManilaHistoryTime('2026-10-23T01:30:21.629+08:00')); // Should be Oct 23, 2026, 1:30 AM
console.log('3. Formatted string:', formatManilaHistoryTime('Oct 23, 2026, 2:35 PM')); // Should be Oct 23, 2026, 2:35 PM
console.log('4. Seed string with bullet:', formatManilaHistoryTime('Oct 17, 2026 • 3:45 PM')); // Should be Oct 17, 2026, 3:45 PM
console.log('5. Current date:', formatManilaHistoryTime(new Date()));

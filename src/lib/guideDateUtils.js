/**
 * Formats guide publication and update timestamps:
 * Display each guide's dates as: Published {date} • Updated {date}
 * using the actual publication and last-update dates.
 */
export const formatGuideDateDisplay = (guide) => {
  if (!guide) return '';

  const formatDate = (isoOrDateStr) => {
    if (!isoOrDateStr) return '';
    const cleanStr = String(isoOrDateStr).replace(/^(Posted|Updated|Published)\s+/i, '').trim();

    // Check if it's already in format "Mmm DD, YYYY" or "Mmm D, YYYY"
    const mmmMatch = cleanStr.match(/^([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})/);
    if (mmmMatch) {
      const month = mmmMatch[1].slice(0, 3);
      const capMonth = month.charAt(0).toUpperCase() + month.slice(1).toLowerCase();
      const day = mmmMatch[2].padStart(2, '0');
      const year = mmmMatch[3];
      return `${capMonth} ${day}, ${year}`;
    }

    const d = new Date(cleanStr);
    if (isNaN(d.getTime())) {
      return cleanStr;
    }
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getUTCMonth()];
    const day = d.getUTCDate().toString().padStart(2, '0');
    const year = d.getUTCFullYear();
    return `${month} ${day}, ${year}`;
  };

  // Original publication date
  const pubDateStr = formatDate(guide.created_at || guide.date || guide.updated_at);
  // Last-update date
  const updDateStr = formatDate(guide.updated_at || guide.created_at || guide.date);

  if (pubDateStr && updDateStr) {
    return `Published ${pubDateStr}    •    Updated ${updDateStr}`;
  }
  if (pubDateStr) {
    return `Published ${pubDateStr}`;
  }
  if (updDateStr) {
    return `Updated ${updDateStr}`;
  }
  return '';
};

/**
 * Returns original publication timestamp (created_at) for descending sorting (newest first).
 * Original publication date is preserved so that updating an existing guide
 * does not alter its position in the list.
 */
export const getGuideSortTime = (guide) => {
  if (!guide) return 0;
  if (guide.created_at) {
    const cr = new Date(guide.created_at).getTime();
    if (!isNaN(cr) && cr > 0) return cr;
  }
  if (guide.date) {
    const clean = String(guide.date).replace(/^(Posted|Updated|Published)\s+/i, '').trim();
    const dt = new Date(clean).getTime();
    if (!isNaN(dt) && dt > 0) return dt;
  }
  if (guide.updated_at) {
    const up = new Date(guide.updated_at).getTime();
    if (!isNaN(up) && up > 0) return up;
  }
  return 0;
};


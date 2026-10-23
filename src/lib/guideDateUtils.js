import DOMPurify from 'dompurify';

/**
 * Robust sanitizer wrapper that works in browser and Node environments.
 */
const sanitizeWithDomPurify = (dirtyHtml, config = {}) => {
  if (!dirtyHtml) return '';
  const defaultConfig = {
    ALLOWED_TAGS: [
      'p', 'b', 'strong', 'i', 'em', 'u', 'ul', 'ol', 'li', 'br', 'span', 'div',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'hr'
    ],
    ALLOWED_ATTR: ['class', 'style'],
  };
  const finalConfig = { ...defaultConfig, ...config };

  try {
    if (DOMPurify && typeof DOMPurify.sanitize === 'function') {
      return DOMPurify.sanitize(dirtyHtml, finalConfig);
    }
    if (typeof window !== 'undefined' && typeof DOMPurify === 'function') {
      return DOMPurify(window).sanitize(dirtyHtml, finalConfig);
    }
  } catch (err) {
    console.warn('DOMPurify sanitize warning:', err);
  }
  return dirtyHtml;
};

/**
 * Formats ISO or date string to standard "Mmm DD, YYYY"
 */
export const formatDate = (isoOrDateStr) => {
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

/**
 * Formats guide publication and update timestamps:
 * Display each guide's dates as: Published {date} • Updated {date}
 * 
 * Rules:
 * 1. Show "Updated" only if updated_at is later than published_at
 *    by more than a minute (> 60,000ms). Otherwise show only "Published <date>".
 * 2. On newly published guides where updated_at == created_at, shows only "Published <date>".
 */
export const formatGuideDateDisplay = (guide) => {
  if (!guide) return '';

  const pubRaw = guide.created_at || guide.date || guide.published_at || guide.updated_at;
  const updRaw = guide.updated_at;

  const pubDateStr = formatDate(pubRaw);

  let showUpdated = false;
  let updDateStr = '';

  if (updRaw && pubRaw) {
    const pubTime = new Date(pubRaw).getTime();
    const updTime = new Date(updRaw).getTime();
    if (!isNaN(pubTime) && !isNaN(updTime)) {
      // Show update if updated_at is at least 1 second after created_at
      if (updTime - pubTime >= 1000) {
        showUpdated = true;
        updDateStr = formatDate(updRaw);
      }
    }
  }

  if (pubDateStr && showUpdated && updDateStr) {
    return `Published ${pubDateStr} • Update ${updDateStr}`;
  }
  if (pubDateStr) {
    return `Published ${pubDateStr}`;
  }
  if (updRaw) {
    return `Update ${formatDate(updRaw)}`;
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

/**
 * Decodes escaped HTML entities like &nbsp;, &lt;, &gt;, &quot;, &#39;, &amp;
 */
export const decodeHtmlEntities = (str) => {
  if (!str) return '';
  return String(str)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'");
};

/**
 * Converts HTML or entity-filled string into clean plain text:
 * - Strips all HTML tags
 * - Converts &nbsp; and other entities to normal text
 * - Collapses extra spaces into a single space
 * Shared helper used on both student and technical personnel sides.
 */
export const htmlToPlainText = (htmlOrText) => {
  if (!htmlOrText) return '';
  let str = String(htmlOrText);

  // Replace block elements and line breaks with space to prevent words joining
  str = str.replace(/<\/(?:p|div|li|ol|ul|h[1-6]|tr|blockquote)>/gi, ' ');
  str = str.replace(/<(?:br|hr)\s*[\/]?>/gi, ' ');
  // Strip all remaining HTML tags
  str = str.replace(/<[^>]*>/g, ' ');

  // Decode HTML entities
  str = decodeHtmlEntities(str);

  // Replace Unicode non-breaking space
  str = str.replace(/\u00a0/g, ' ');

  // Collapse consecutive whitespace and trim
  return str.replace(/\s+/g, ' ').trim();
};

/**
 * Generates a clean single-line preview snippet for lists and cards:
 * - Removes all HTML tags & entities (including &nbsp;)
 * - Strips list/step markers ("1. ", "Step 1")
 * - Cleans trailing punctuation
 * - Truncates smoothly with ellipsis
 */
export const getGuideSnippet = (guide, maxLength = 120) => {
  if (!guide) return '';
  let raw = '';
  if (guide.preview) {
    raw = guide.preview;
  } else if (guide.leadText) {
    raw = guide.leadText;
  } else if (guide.content) {
    raw = guide.content;
  }

  let text = htmlToPlainText(raw);

  // Cut off before numbered lists or step markers like "1. ", "1) ", "Step 1"
  const listIndex = text.search(/(?:^|\s)(?:1[.)]\s+|Step\s+1[:.-]?\s+)/i);
  if (listIndex > 0) {
    text = text.substring(0, listIndex).trim();
  }

  // Remove trailing colons, dashes or trailing spaces
  text = text.replace(/[:\-–—\s]+$/, '').trim();

  // If empty after truncation, fall back to plain text of content
  if (!text && guide.content) {
    text = htmlToPlainText(guide.content);
  }

  if (maxLength && text.length > maxLength) {
    return text.substring(0, maxLength).trim() + '...';
  }
  return text;
};

/**
 * Cleans HTML content before saving from rich text editor:
 * - Replaces &nbsp; and \u00a0 with normal space
 * - Unescapes if accidentally double-escaped
 * - Cleans extraneous spaces after opening tags or before closing tags
 * - Collapses repeated spaces
 * - Sanitizes with DOMPurify
 */
export const cleanHtmlForStorage = (html) => {
  if (!html) return '';
  let cleaned = String(html);

  // Unescape if escaped e.g. &lt;li&gt;
  if (/&lt;(?:p|ul|ol|li|b|i|u|strong|em|div|span|br)[\s\/>]/i.test(cleaned)) {
    cleaned = decodeHtmlEntities(cleaned);
  }

  // Replace &nbsp; and Unicode non-breaking spaces with normal space
  cleaned = cleaned.replace(/&nbsp;/gi, ' ');
  cleaned = cleaned.replace(/&#160;/gi, ' ');
  cleaned = cleaned.replace(/\u00a0/g, ' ');

  // Clean leading spaces immediately after opening BLOCK tags only
  // (inline tags like <b>/<i>/<span> must keep spaces, otherwise "turn off</b> equipment" loses its space)
  cleaned = cleaned.replace(/(<(?:li|p|ol|ul|div)(?:\s[^>]*)?>)\s+/gi, '$1');
  // Clean trailing spaces immediately before closing BLOCK tags only
  cleaned = cleaned.replace(/\s+(<\/(?:li|p|ol|ul|div)>)/gi, '$1');

  // Collapse multiple spaces
  cleaned = cleaned.replace(/ {2,}/g, ' ');

  // Sanitize with DOMPurify
  return sanitizeWithDomPurify(cleaned.trim());
};

/**
 * Returns formatted and sanitized HTML for the Guide Detail View Modal:
 * - Unescapes if double-escaped
 * - Formats plain text lines into paragraphs and bulleted/numbered lists
 * - Replaces any &nbsp; with normal space
 * - Sanitizes with DOMPurify
 */
export const getSanitizedGuideHtml = (guide) => {
  if (!guide) return '';
  let raw = guide.content || '';

  // Unescape if double-escaped e.g. &lt;p&gt;
  if (/&lt;(?:p|ul|ol|li|b|i|u|strong|em|div|span|br)[\s\/>]/i.test(raw)) {
    raw = decodeHtmlEntities(raw);
  }

  // Replace &nbsp; and \u00a0 with normal space
  raw = raw.replace(/&nbsp;/gi, ' ').replace(/&#160;/gi, ' ').replace(/\u00a0/g, ' ');

  let html = '';
  if (raw && /<[a-z][\s\S]*>/i.test(raw)) {
    // Already contains HTML tags
    html = raw;
  } else if (guide.leadText && Array.isArray(guide.bulletPoints) && guide.bulletPoints.length > 0) {
    html = `<p><b>${guide.leadText}</b></p><ul>${guide.bulletPoints.map((b) => `<li>${b}</li>`).join('')}</ul>`;
  } else if (raw) {
    // Plain text: format paragraphs and bullet points
    const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length > 0) {
      const first = lines[0];
      const rest = lines.slice(1);
      const isList = rest.some((l) => /^[0-9]+[.)]\s*|^[-*•]\s*/.test(l));
      if (isList) {
        const listItems = rest
          .map((l) => `<li>${l.replace(/^[0-9]+[.)]\s*|^[-*•]\s*/, '').trim()}</li>`)
          .join('');
        html = `<p><b>${first}</b></p><ul>${listItems}</ul>`;
      } else {
        html = lines.map((p, idx) => (idx === 0 ? `<p><b>${p}</b></p>` : `<p>${p}</p>`)).join('');
      }
    }
  } else if (guide.preview) {
    html = `<p>${guide.preview}</p>`;
  }

  return sanitizeWithDomPurify(html);
};

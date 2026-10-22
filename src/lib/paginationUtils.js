/**
 * Standardized Pagination Helper Utilities
 * Standardizes calculation of cumulative results count and rolling 3-page numbers.
 */

/**
 * Calculates visible page numbers for pagination controls.
 * - Always displays at most 3 page numbers at a time.
 * - Dynamically rolls as the user navigates.
 * - Keeps numbers within valid range near start and end.
 *
 * @param {number} currentPage Current active page (1-based)
 * @param {number} totalPages Total number of pages
 * @returns {number[]} Array of at most 3 page numbers
 */
export function getVisiblePages(currentPage, totalPages) {
  const total = Math.max(1, totalPages || 1);
  if (total <= 3) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  let startPage = currentPage - 1;
  if (startPage < 1) {
    startPage = 1;
  } else if (startPage + 2 > total) {
    startPage = total - 2;
  }

  return [startPage, startPage + 1, startPage + 2];
}

/**
 * Calculates the cumulative results displayed count up to the current page.
 * Example for 15 results with 5 items per page:
 * - Page 1: 5
 * - Page 2: 10
 * - Page 3: 15
 *
 * @param {number} currentPage Current active page (1-based)
 * @param {number} pageSize Number of items per page
 * @param {number} totalResults Total number of filtered items
 * @returns {number} Cumulative count
 */
export function getDisplayedCount(currentPage, pageSize, totalResults) {
  if (!totalResults || totalResults <= 0) return 0;
  return Math.min(currentPage * pageSize, totalResults);
}

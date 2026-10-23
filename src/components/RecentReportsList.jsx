import React from 'react';

/**
 * Reusable RecentReportsList Component (Image 5 Reference)
 * - Header: "Recent Reports" and "Latest 5 laboratory equipment and facility reports."
 * - Table header bar in sage green (#DBE9E0)
 * - 5 data rows displaying:
 *    - ID badge (dark green #234F20)
 *    - Equipment (unit and equipment type)
 *    - Reported By (circle avatar, name, year block)
 *    - Location (computer center and room)
 *    - Submitted At (date and time)
 *    - Status capsule (UNDER REVIEW, UNDER REPAIR, RESOLVED)
 *    - View button (dark green #062512)
 * - Footer bar in sage green (#DBE9E0) with monospace report count
 */
export default function RecentReportsList({
  reports = [],
  loading = false,
  onSelectReport = () => {},
}) {
  return (
    <section className="dashboard-recent-reports-card" aria-label="Recent Laboratory Reports">
      {/* Card Header */}
      <div className="recent-reports-card-header">
        <h2 className="recent-reports-main-title">Recent Reports</h2>
        <p className="recent-reports-sub-title">
          Latest 5 laboratory equipment and facility reports.
        </p>
      </div>

      {/* Reports Table Frame */}
      <div className="recent-reports-table-scroll-frame">
        <table className="recent-reports-data-table">
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
            {loading && reports.length === 0 ? (
              [...Array(5)].map((_, idx) => (
                <tr key={`recent-loading-row-${idx}`} className="reports-table-data-row loading-skeleton-row">
                  <td className="cell-id">
                    <div className="skeleton-line skeleton-badge" />
                  </td>
                  <td className="cell-equipment">
                    <div className="skeleton-line skeleton-title" />
                    <div className="skeleton-line skeleton-sub" />
                  </td>
                  <td className="cell-reported">
                    <div className="skeleton-line skeleton-title" />
                    <div className="skeleton-line skeleton-sub" />
                  </td>
                  <td className="cell-location">
                    <div className="skeleton-line skeleton-title" />
                    <div className="skeleton-line skeleton-sub" />
                  </td>
                  <td className="cell-submitted">
                    <div className="skeleton-line skeleton-title" />
                    <div className="skeleton-line skeleton-sub" />
                  </td>
                  <td className="cell-status">
                    <div className="skeleton-line skeleton-pill" />
                  </td>
                  <td className="cell-action">
                    <div className="skeleton-line skeleton-btn" />
                  </td>
                </tr>
              ))
            ) : reports.length === 0 ? (
              <tr className="reports-table-data-row">
                <td colSpan={7} className="reports-empty-cell" style={{ textAlign: 'center', padding: '36px 16px', color: '#6b7280', fontSize: '13px' }}>
                  No recent reports submitted yet.
                </td>
              </tr>
            ) : reports.slice(0, 5).map((report) => (
              <tr key={report.id || report.report_id} className="reports-table-data-row">
                {/* Column 1: ID Badge */}
                <td className="cell-id">
                  <span className="report-id-pill-badge">{report.id || report.report_id}</span>
                </td>

                {/* Column 2: Equipment */}
                <td className="cell-equipment">
                  <div className="cell-stack-block">
                    <span className="cell-main-text">{report.unitNumber || report.unit_number}</span>
                    <span className="cell-sub-text">{report.equipment}</span>
                  </div>
                </td>

                {/* Column 3: Reported By */}
                <td className="cell-reported">
                  <div className="reporter-avatar-row">
                    <div className="reporter-avatar-frame">
                      {report.avatar ? (
                        <img
                          src={report.avatar}
                          alt={report.reportedByName || report.student_name}
                          className="reporter-avatar-img"
                        />
                      ) : (
                        <div className="reporter-avatar-fallback">
                          {(report.reportedByName || report.student_name)?.charAt(0) || 'U'}
                        </div>
                      )}
                    </div>
                    <div className="cell-stack-block">
                      <span className="cell-main-text">{report.reportedByName || report.student_name}</span>
                      <span className="cell-sub-text">{report.reportedByYearBlock || report.student_year_block}</span>
                    </div>
                  </div>
                </td>

                {/* Column 4: Location */}
                <td className="cell-location">
                  <div className="cell-stack-block">
                    <span className="cell-main-text">{report.locationCenter || report.location_center}</span>
                    <span className="cell-sub-text">{report.locationRoom || report.location_room}</span>
                  </div>
                </td>

                {/* Column 5: Submitted At */}
                <td className="cell-submitted">
                  <div className="cell-stack-block">
                    <span className="cell-main-text">{report.submittedDate || report.submitted_date}</span>
                    <span className="cell-sub-text">{report.submittedTime || report.submitted_time}</span>
                  </div>
                </td>

                {/* Column 6: Status Capsule */}
                <td className="cell-status">
                  <span className={`status-pill-capsule ${report.statusClass || report.status_class || 'status-under-review'}`}>
                    {report.displayStatus || report.display_status || 'UNDER REVIEW'}
                  </span>
                </td>

                {/* Column 7: View Action Button */}
                <td className="cell-action">
                  <button
                    type="button"
                    className="btn-view-report-dark"
                    onClick={() => onSelectReport(report)}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Table Footer Banner */}
      <div className="reports-table-footer-banner">
        <span className="reports-table-footer-mono">
          Showing <strong>{loading && reports.length === 0 ? '...' : Math.min(reports.length, 5)}</strong> recent reports
        </span>
      </div>
    </section>
  );
}

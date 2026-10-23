import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  FileText,
  Clock,
  Wrench,
  CheckCircle2,
  Search,
  ChevronDown,
  RotateCw,
  Plus,
  X,
  Check,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getVisiblePages, getDisplayedCount } from '../lib/paginationUtils';
import ReportDetailsModal from './ReportDetailsModal';
import ReportProblemModal from './ReportProblemModal';
import { formatStudentName, formatYearBlock } from '../lib/studentFormatUtils';
import { parseReportDateTime, formatManilaHistoryTime } from '../lib/reportDateUtils';
import { AUTHENTIC_REPORT_STUDENTS } from '../lib/reportStudentMapping';
import { getReportAttachment } from '../lib/reportAttachmentUtils';
import Banner from './Banner';
import {
  useStudentReports,
  normalizeStudentReportItem,
} from '../lib/studentReportsService';
import './StudentSubmittedReportsPage.css';

// Shared normalization from studentReportsService
const normalizeStudentReport = (item) => normalizeStudentReportItem(item);

export default function StudentSubmittedReportsPage({
  studentProfile,
  studentReportsData: incomingReportsData,
  onReportProblem,
  onSelectReport,
  initialFilter = 'ALL',
}) {
  const activeStudentId = studentProfile?.student_id;

  const isAngelAccount =
    activeStudentId === '24-0041-147' ||
    studentProfile?.username === '24-0041-147' ||
    studentProfile?.email === 'martinezangellaewup@gmail.com' ||
    studentProfile?.full_name?.toLowerCase().includes('angel');

  const getReportSubmittedDateTime = (report) => {
    if (isAngelAccount) {
      let historyList = report?.history;
      if (typeof historyList === 'string') {
        try {
          historyList = JSON.parse(historyList);
        } catch {}
      }
      if (Array.isArray(historyList) && historyList.length > 0) {
        const subHistory = historyList.find(
          (h) => (h.action || h.status || '').toLowerCase().includes('submit')
        );
        const subTimestamp = subHistory?.time || subHistory?.created_at;
        if (subTimestamp) {
          const formattedHistory = formatManilaHistoryTime(subTimestamp);
          if (formattedHistory && formattedHistory.includes(' • ')) {
            const [hDate, hTime] = formattedHistory.split(' • ');
            return { date: hDate, time: hTime };
          }
        }
      }
    }
    const d = report?.submitted_date || report?.submittedDate;
    const t = report?.submitted_time || report?.submittedTime;
    if (d && t) return { date: d, time: t };
    if (typeof report?.date_time === 'string' && report.date_time.includes(',')) {
      const match = report.date_time.trim().match(/^([A-Za-z]{3}\s+\d{1,2},\s+\d{4}),?\s*(.*)$/);
      if (match) {
        return { date: match[1], time: match[2] };
      }
    }
    return {
      date: d || '',
      time: t || '',
    };
  };

  // Shared reports data from parent or hook (only enable hook if no incoming data passed)
  const fallbackReportsData = useStudentReports(studentProfile, { enabled: !incomingReportsData });
  const reportsData = incomingReportsData || fallbackReportsData;
  const { reports: reportsList = [], stats = {}, refetch } = reportsData;
  const isRefreshing = Boolean(reportsData.isLoading);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState(initialFilter || 'ALL');
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const statusDropdownRef = useRef(null);

  // Pagination state: exactly 7 rows per page matching reference UI
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  // Selected report for Details Modal
  const [activeReportModal, setActiveReportModal] = useState(null);
  const [isReportProblemModalOpen, setIsReportProblemModalOpen] = useState(false);

  // Sync initialFilter prop if changed
  useEffect(() => {
    if (initialFilter) {
      setSelectedStatusFilter(initialFilter);
    }
  }, [initialFilter]);

  // Handle dropdown close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target)) {
        setStatusDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keep activeReportModal updated if report status updates in the background
  useEffect(() => {
    if (!activeReportModal) return;
    const match = reportsList.find(
      (r) =>
        r.report_id === activeReportModal.report_id ||
        r.id === activeReportModal.id ||
        (activeReportModal.canonicalUuid && (r.canonicalUuid === activeReportModal.canonicalUuid || r.id === activeReportModal.canonicalUuid))
    );
    if (match && (match.status !== activeReportModal.status || match.remarks !== activeReportModal.remarks)) {
      setActiveReportModal((prev) => (prev ? { ...prev, ...match } : null));
    }
  }, [reportsList, activeReportModal]);

  // Reset all filters, search query, dropdowns, and pagination back to default
  const handleResetAllFilters = () => {
    setSelectedStatusFilter('ALL');
    setSearchQuery('');
    setStatusDropdownOpen(false);
    setCurrentPage(1);
    if (refetch) refetch();
  };

  const fetchReports = async (showSpinner = false) => {
    if (refetch) await refetch();
  };

  // Filter & search logic
  const isTargetJohnLester =
    activeStudentId === '24-2026-108' ||
    studentProfile?.username === '24-2026-108' ||
    studentProfile?.email === 'lester@gmail.com' ||
    studentProfile?.id === 'bbb5f955-b361-4929-8055-031d61dd4f58';

  const filteredReports = useMemo(() => {
    return reportsList.filter((r) => {
      // LR-27 must strictly appear ONLY in John Lester's account
      if ((r.report_id === 'LR-27' || r.id === 'LR-27') && !isTargetJohnLester) {
        return false;
      }

      const st = r.status;
      const disp = r.display_status || r.displayStatus;

      // 1. Status Filter
      if (selectedStatusFilter === 'ACTIVE') {
        if (st === 'Resolved' || disp === 'RESOLVED') return false;
      } else if (selectedStatusFilter === 'SUBMITTED') {
        if (st !== 'Submitted') return false;
      } else if (selectedStatusFilter === 'UNDER_REVIEW') {
        if (st !== 'Under Review' && st !== 'Submitted' && st !== 'Reviewed' && disp !== 'UNDER REVIEW') return false;
      } else if (selectedStatusFilter === 'UNDER_REPAIR') {
        if (st !== 'Under Repair' && st !== 'Under repair' && disp !== 'UNDER REPAIR') return false;
      } else if (selectedStatusFilter === 'ON_HOLD') {
        if (st !== 'On Hold' && st !== 'on_hold' && disp !== 'ON HOLD') return false;
      } else if (selectedStatusFilter === 'RESOLVED') {
        if (st !== 'Resolved' && disp !== 'RESOLVED') return false;
      }

      // 2. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const mId = (r.report_id || r.id || '').toLowerCase().includes(q);
        const mUnit = (r.unit_number || r.unitNumber || '').toLowerCase().includes(q);
        const mEquip = (r.equipment || '').toLowerCase().includes(q);
        const mCenter = (r.location_center || r.locationCenter || '').toLowerCase().includes(q);
        const mRoom = (r.location_room || r.locationRoom || '').toLowerCase().includes(q);
        const mDesc = (r.description || '').toLowerCase().includes(q);

        if (!mId && !mUnit && !mEquip && !mCenter && !mRoom && !mDesc) {
          return false;
        }
      }

      return true;
    });

    // Strict scope: For Angel Lae Martinez, sort reports strictly by Report ID descending (e.g. ID 17 down to ID 1)
    if (isAngelAccount) {
      const parseReportIdNum = (r) => {
        const idStr = String(r?.report_id || r?.id || '');
        const match = idStr.match(/\d+/);
        return match ? parseInt(match[0], 10) : 0;
      };
      return [...list].sort((a, b) => {
        const numA = parseReportIdNum(a);
        const numB = parseReportIdNum(b);
        if (numB !== numA) return numB - numA;
        return (b.report_id || b.id || '').localeCompare(a.report_id || a.id || '', undefined, { numeric: true });
      });
    }

    return list;
  }, [reportsList, selectedStatusFilter, searchQuery, isAngelAccount, isTargetJohnLester]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedStatusFilter]);

  // Pagination calculation: exactly 7 items per page
  const totalPages = Math.max(1, Math.ceil(filteredReports.length / itemsPerPage));
  const paginatedReports = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return filteredReports.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredReports, currentPage, itemsPerPage]);

  const displayedCount = getDisplayedCount(currentPage, itemsPerPage, filteredReports.length);
  const visiblePages = getVisiblePages(currentPage, totalPages);

  // Ensure currentPage is valid if totalPages changes
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const getStatusLabel = (filterKey) => {
    switch (filterKey) {
      case 'ACTIVE':
        return 'Active Reports';
      case 'SUBMITTED':
        return 'Submitted';
      case 'UNDER_REVIEW':
        return 'Under Review';
      case 'UNDER_REPAIR':
        return 'Under Repair';
      case 'ON_HOLD':
        return 'On Hold';
      case 'RESOLVED':
        return 'Resolved';
      default:
        return 'All Statuses';
    }
  };

  const handleOpenReportModal = (report) => {
    if (onSelectReport) {
      onSelectReport(report);
    } else {
      setActiveReportModal(report);
    }
  };

  const handleReportProblemClick = () => {
    if (onReportProblem) {
      onReportProblem();
    } else {
      window.location.hash = '#report-problem';
    }
  };

  return (
    <div className="student-submitted-reports-container">
      {/* 1. Top Header: Technical Personnel White Card (Rings removed per user request) */}
      <Banner
        title="Submitted Reports"
        subtitle="Track your reported laboratory issues and monitor their resolution progress."
        className="student-reports-hero-banner"
        ariaLabel="Submitted Reports Header"
        showRings={false}
      >
        <button
          type="button"
          className="btn-student-report-problem"
          onClick={handleReportProblemClick}
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>Report a problem</span>
        </button>
      </Banner>

      {/* 2. Four Stat Metric Cards: Matching Technical Personnel Reports page */}
      <div className="reports-metric-cards-grid" aria-label="Reports Summary Metrics">
        {/* Card 1: TOTAL REPORTS */}
        <div
          className={`student-metric-card tech-stat-card card-all-guides ${selectedStatusFilter === 'ALL' ? 'card-filter-active' : ''}`}
          onClick={() => {
            setSelectedStatusFilter('ALL');
            setCurrentPage(1);
          }}
          role="button"
          tabIndex={0}
          title="Show all reports"
        >
          <div className="student-metric-header">
            <span className="student-metric-title">TOTAL REPORTS</span>
            <div className="student-metric-badge badge-active-green" aria-hidden="true">
              <FileText size={18} strokeWidth={2.2} />
            </div>
          </div>
          <div className="student-metric-value-wrap">
            <span className="student-metric-number font-serif">
              {reportsData.isLoading && reportsList.length === 0 ? '...' : (stats.total ?? 0)}
            </span>
          </div>
          <p className="student-metric-caption">All submitted laboratory tickets.</p>
        </div>

        {/* Card 2: UNDER REVIEW */}
        <div
          className={`student-metric-card ${selectedStatusFilter === 'UNDER_REVIEW' ? 'card-filter-active' : ''}`}
          onClick={() => {
            setSelectedStatusFilter((prev) => (prev === 'UNDER_REVIEW' ? 'ALL' : 'UNDER_REVIEW'));
            setCurrentPage(1);
          }}
          role="button"
          tabIndex={0}
          title="Filter by Under Review"
        >
          <div className="student-metric-header">
            <span className="student-metric-title">UNDER REVIEW</span>
            <div className="student-metric-badge badge-review-yellow" aria-hidden="true">
              <Clock size={18} strokeWidth={2.2} className="metric-icon-svg icon-yellow" />
            </div>
          </div>
          <div className="student-metric-value-wrap">
            <span className="student-metric-number font-serif">
              {reportsData.isLoading && reportsList.length === 0 ? '...' : (stats.underReview ?? 0)}
            </span>
          </div>
          <p className="student-metric-caption">Awaiting triage & technician review.</p>
        </div>

        {/* Card 3: UNDER REPAIR */}
        <div
          className={`student-metric-card ${selectedStatusFilter === 'UNDER_REPAIR' ? 'card-filter-active' : ''}`}
          onClick={() => {
            setSelectedStatusFilter((prev) => (prev === 'UNDER_REPAIR' ? 'ALL' : 'UNDER_REPAIR'));
            setCurrentPage(1);
          }}
          role="button"
          tabIndex={0}
          title="Filter by Under Repair"
        >
          <div className="student-metric-header">
            <span className="student-metric-title">UNDER REPAIR</span>
            <div className="student-metric-badge badge-repair-blue" aria-hidden="true">
              <Wrench size={18} strokeWidth={2.2} className="metric-icon-svg icon-blue" />
            </div>
          </div>
          <div className="student-metric-value-wrap">
            <span className="student-metric-number font-serif">
              {reportsData.isLoading && reportsList.length === 0 ? '...' : (stats.underRepair ?? 0)}
            </span>
          </div>
          <p className="student-metric-caption">Currently being serviced & fixed.</p>
        </div>

        {/* Card 4: RESOLVED */}
        <div
          className={`student-metric-card ${selectedStatusFilter === 'RESOLVED' ? 'card-filter-active' : ''}`}
          onClick={() => {
            setSelectedStatusFilter((prev) => (prev === 'RESOLVED' ? 'ALL' : 'RESOLVED'));
            setCurrentPage(1);
          }}
          role="button"
          tabIndex={0}
          title="Filter by Resolved"
        >
          <div className="student-metric-header">
            <span className="student-metric-title">RESOLVED</span>
            <div className="student-metric-badge badge-resolved-green" aria-hidden="true">
              <CheckCircle2 size={18} strokeWidth={2.2} className="metric-icon-svg icon-green" />
            </div>
          </div>
          <div className="student-metric-value-wrap">
            <span className="student-metric-number font-serif">
              {reportsData.isLoading && reportsList.length === 0 ? '...' : (stats.resolved ?? 0)}
            </span>
          </div>
          <p className="student-metric-caption">Issues successfully fixed & closed.</p>
        </div>
      </div>

      {/* 3. Controls Bar: Single White Bordered Container */}
      <div className="student-reports-filter-bar-container" aria-label="Search and Filter Reports">
        {/* Search Input Box */}
        <div className="reports-search-box-wrapper">
          <Search size={15} className="reports-search-icon" />
          <input
            type="text"
            className="reports-search-input"
            placeholder="Search by report ID, PC, or description"
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
              onClick={() => {
                setSearchQuery('');
                setCurrentPage(1);
              }}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Status Filter Dropdown */}
        <div className="reports-dropdown-relative" ref={statusDropdownRef}>
          <button
            type="button"
            className="reports-filter-dropdown-btn"
            onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
            aria-expanded={statusDropdownOpen}
          >
            <span>{getStatusLabel(selectedStatusFilter)}</span>
            <ChevronDown size={14} className={`dropdown-arrow-icon ${statusDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {statusDropdownOpen && (
            <div className="reports-dropdown-menu" role="menu">
              <button
                type="button"
                className={`dropdown-menu-opt ${selectedStatusFilter === 'ALL' ? 'opt-active' : ''}`}
                onClick={() => {
                  setSelectedStatusFilter('ALL');
                  setStatusDropdownOpen(false);
                  setCurrentPage(1);
                }}
              >
                <span>All Statuses</span>
                {selectedStatusFilter === 'ALL' && <Check size={14} className="opt-check" />}
              </button>
              <button
                type="button"
                className={`dropdown-menu-opt ${selectedStatusFilter === 'ACTIVE' ? 'opt-active' : ''}`}
                onClick={() => {
                  setSelectedStatusFilter('ACTIVE');
                  setStatusDropdownOpen(false);
                  setCurrentPage(1);
                }}
              >
                <span>Active Reports</span>
                {selectedStatusFilter === 'ACTIVE' && <Check size={14} className="opt-check" />}
              </button>
              <button
                type="button"
                className={`dropdown-menu-opt ${selectedStatusFilter === 'SUBMITTED' ? 'opt-active' : ''}`}
                onClick={() => {
                  setSelectedStatusFilter('SUBMITTED');
                  setStatusDropdownOpen(false);
                  setCurrentPage(1);
                }}
              >
                <span>Submitted</span>
                {selectedStatusFilter === 'SUBMITTED' && <Check size={14} className="opt-check" />}
              </button>
              <button
                type="button"
                className={`dropdown-menu-opt ${selectedStatusFilter === 'UNDER_REVIEW' ? 'opt-active' : ''}`}
                onClick={() => {
                  setSelectedStatusFilter('UNDER_REVIEW');
                  setStatusDropdownOpen(false);
                  setCurrentPage(1);
                }}
              >
                <span>Under Review</span>
                {selectedStatusFilter === 'UNDER_REVIEW' && <Check size={14} className="opt-check" />}
              </button>
              <button
                type="button"
                className={`dropdown-menu-opt ${selectedStatusFilter === 'UNDER_REPAIR' ? 'opt-active' : ''}`}
                onClick={() => {
                  setSelectedStatusFilter('UNDER_REPAIR');
                  setStatusDropdownOpen(false);
                  setCurrentPage(1);
                }}
              >
                <span>Under Repair</span>
                {selectedStatusFilter === 'UNDER_REPAIR' && <Check size={14} className="opt-check" />}
              </button>
              <button
                type="button"
                className={`dropdown-menu-opt ${selectedStatusFilter === 'RESOLVED' ? 'opt-active' : ''}`}
                onClick={() => {
                  setSelectedStatusFilter('RESOLVED');
                  setStatusDropdownOpen(false);
                  setCurrentPage(1);
                }}
              >
                <span>Resolved</span>
                {selectedStatusFilter === 'RESOLVED' && <Check size={14} className="opt-check" />}
              </button>
            </div>
          )}
        </div>

        {/* Dedicated Clickable On Hold Pill Button */}
        <button
          type="button"
          className={`reports-on-hold-pill-btn ${selectedStatusFilter === 'ON_HOLD' ? 'pill-active' : ''}`}
          onClick={() => {
            setSelectedStatusFilter((prev) => (prev === 'ON_HOLD' ? 'ALL' : 'ON_HOLD'));
            setStatusDropdownOpen(false);
            setCurrentPage(1);
          }}
          aria-pressed={selectedStatusFilter === 'ON_HOLD'}
          title="Filter by On Hold reports"
        >
          <span>On Hold</span>
          <span className="reports-on-hold-badge-count">{stats.onHold}</span>
        </button>

        {/* Reset / Refresh All Filters Button */}
        <button
          type="button"
          className="reports-refresh-btn"
          title="Refresh reports and reset filters"
          aria-label="Refresh reports and reset filters"
          onClick={handleResetAllFilters}
        >
          <RotateCw size={15} className={`refresh-icon ${isRefreshing ? 'spin-anim' : ''}`} />
        </button>
      </div>

      {/* 4. Submitted Reports Table */}
      <div className="reports-table-card-container">
        <div className="recent-reports-table-scroll-frame">
          <table className="recent-reports-data-table reports-data-table">
            <thead>
              <tr className="reports-table-heading-row">
                <th scope="col" className="th-id">ID</th>
                <th scope="col" className="th-equipment">EQUIPMENT</th>
                <th scope="col" className="th-location">COMPUTER CENTER &amp; ROOM</th>
                <th scope="col" className="th-submitted">DATE &amp; TIME SUBMITTED</th>
                <th scope="col" className="th-status">STATUS</th>
                <th scope="col" className="th-action"><span className="sr-only">Action</span></th>
              </tr>
            </thead>
            <tbody>
              {reportsData.isLoading && reportsList.length === 0 ? (
                [...Array(5)].map((_, idx) => (
                  <tr key={`student-loading-row-${idx}`} className="reports-table-data-row loading-skeleton-row">
                    <td className="cell-id"><div className="skeleton-line skeleton-badge" /></td>
                    <td className="cell-equipment"><div className="skeleton-line skeleton-title" /><div className="skeleton-line skeleton-sub" /></td>
                    <td className="cell-location"><div className="skeleton-line skeleton-title" /></td>
                    <td className="cell-submitted"><div className="skeleton-line skeleton-title" /></td>
                    <td className="cell-status"><div className="skeleton-line skeleton-pill" /></td>
                    <td className="cell-action"><div className="skeleton-line skeleton-btn" /></td>
                  </tr>
                ))
              ) : paginatedReports.length > 0 ? (
                paginatedReports.map((report) => (
                  <tr key={report.id || report.report_id} className="reports-table-data-row">
                    {/* Column 1: ID Badge */}
                    <td className="cell-id">
                      <span className="report-id-pill-badge">{report.report_id || report.id}</span>
                    </td>

                    {/* Column 2: Equipment (Unit Number & Type) */}
                    <td className="cell-equipment">
                      <div className="equipment-col-wrap">
                        <span className="equipment-unit-title">{report.unit_number || report.unitNumber}</span>
                        <span className="equipment-category-sub">{report.equipment}</span>
                      </div>
                    </td>

                    {/* Column 3: Computer Center & Room */}
                    <td className="cell-location">
                      <div className="location-col-wrap">
                        <span className="location-center-title">{report.location_center || report.locationCenter}</span>
                        <span className="location-room-sub">{report.location_room || report.locationRoom}</span>
                      </div>
                    </td>

                    {/* Column 4: Date & Time Submitted */}
                    <td className="cell-submitted">
                      {(() => {
                        const dt = getReportSubmittedDateTime(report);
                        return (
                          <div className="submitted-col-wrap">
                            <span className="submitted-date-title">{dt.date}</span>
                            <span className="submitted-time-sub">{dt.time}</span>
                          </div>
                        );
                      })()}
                    </td>

                    {/* Column 5: Status Capsule Badge */}
                    <td className="cell-status">
                      <span className={`status-pill ${report.status_class || report.statusClass}`}>
                        {report.display_status || report.displayStatus}
                      </span>
                    </td>

                    {/* Column 6: View Action Button */}
                    <td className="cell-action">
                      <button
                        type="button"
                        className="report-view-action-btn"
                        onClick={() => handleOpenReportModal(report)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              ) : isRefreshing && reportsList.length === 0 ? (
                [1, 2, 3, 4, 5].map((idx) => (
                  <tr key={`loading-sub-row-${idx}`} className="reports-table-data-row loading-skeleton-row">
                    <td className="cell-id">
                      <div className="skeleton-line skeleton-badge" />
                    </td>
                    <td className="cell-equipment">
                      <div className="cell-equipment-stack">
                        <div className="skeleton-line skeleton-title" />
                        <div className="skeleton-line skeleton-sub" />
                      </div>
                    </td>
                    <td className="cell-location">
                      <div className="cell-location-stack">
                        <div className="skeleton-line skeleton-title" />
                        <div className="skeleton-line skeleton-sub" />
                      </div>
                    </td>
                    <td className="cell-submitted">
                      <div className="cell-submitted-stack">
                        <div className="skeleton-line skeleton-title" />
                        <div className="skeleton-line skeleton-sub" />
                      </div>
                    </td>
                    <td className="cell-status">
                      <div className="skeleton-line skeleton-pill" />
                    </td>
                    <td className="cell-action">
                      <div className="skeleton-line skeleton-btn" />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="reports-empty-cell" style={{ padding: '36px 16px' }}>
                    <div className="reports-empty-state">
                      {reportsList.length === 0 ? (
                        <p>You have not submitted any problem reports yet.</p>
                      ) : (
                        <p>No reports match your current search query or filter selection.</p>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer: Results Counter and Pagination */}
        <div className="reports-table-footer">
          <span className="showing-reports-count">
            Showing <strong>{displayedCount}</strong> of{' '}
            <strong>{filteredReports.length}</strong> reports
          </span>

          <div className="reports-pagination-controls">
            <button
              type="button"
              className="reports-page-nav-btn"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              aria-label="Previous page"
            >
              Previous
            </button>

            {visiblePages.map((pageNum) => (
              <button
                key={pageNum}
                type="button"
                className={`reports-page-num-btn ${currentPage === pageNum ? 'active-page-pill' : ''}`}
                onClick={() => setCurrentPage(pageNum)}
              >
                {pageNum}
              </button>
            ))}

            <button
              type="button"
              className="reports-page-nav-btn"
              disabled={currentPage >= totalPages || filteredReports.length === 0}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Next page"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* 5. Info Notice Banner below table */}
      <div className="student-reports-notice-banner">
        <div className="student-notice-icon-circle" aria-hidden="true">
          !
        </div>
        <p className="student-notice-text">
          Reports are reviewed by technical personnel. You will see the status update here.
        </p>
      </div>

      {/* Standalone Report Details Modal if opened directly */}
      {activeReportModal && (
        <ReportDetailsModal
          report={activeReportModal}
          isStudent={true}
          studentProfile={studentProfile}
          onClose={() => setActiveReportModal(null)}
          onUpdateStatus={async (reportId, newStatus, updatedHistory, newRemarks) => {
            const targetId = reportId || activeReportModal.report_id || activeReportModal.id;

            setActiveReportModal((prev) => {
              if (!prev) return null;
              return normalizeStudentReport({
                ...prev,
                status: newStatus,
                remarks: newRemarks !== undefined ? newRemarks : prev.remarks,
                history: updatedHistory || prev.history,
              });
            });

            try {
              const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId);
              if (isUuid) {
                await supabase
                  .from('reports_of_student')
                  .update({ status: newStatus, remarks: newRemarks || null })
                  .eq('id', targetId);
              } else {
                await supabase
                  .from('reports_of_student')
                  .update({ status: newStatus, remarks: newRemarks || null })
                  .eq('report_id', targetId);
              }
            } catch (err) {
              console.warn('Note updating status:', err);
            }

            if (refetch) await refetch();

            window.dispatchEvent(
              new CustomEvent('fixie_report_status_updated', {
                detail: { reportId: targetId, newStatus, newRemarks },
              })
            );
          }}
        />
      )}

      {/* Standalone Report Problem Modal if opened directly */}
      {isReportProblemModalOpen && (
        <ReportProblemModal
          isOpen={isReportProblemModalOpen}
          onClose={() => setIsReportProblemModalOpen(false)}
          studentProfile={studentProfile}
          onReportSubmitted={async (newRep, viewDetails) => {
            if (refetch) await refetch();
            setIsReportProblemModalOpen(false);
            if (viewDetails) {
              const normalized = normalizeStudentReportItem(newRep, studentProfile);
              if (onSelectReport) {
                onSelectReport(normalized);
              } else {
                setActiveReportModal(normalized);
              }
            }
          }}
        />
      )}
    </div>
  );
}

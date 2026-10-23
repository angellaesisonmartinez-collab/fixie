import React from 'react';
import { User, FileText, BookOpen, PauseCircle } from 'lucide-react';
import Banner from './Banner';
import StatCard from './StatCard';
import RecentReportsList from './RecentReportsList';
import { useStatsRefresh } from './GuideMetricNumber';

/**
 * DashboardContent Component
 * Assembles the three sections:
 * - Part 2: Banner (Students page styling reference)
 * - Part 3: Stat Cards x4 (Total Students, Total Reports, Total Guides, On Hold)
 * - Part 4: Recent Reports List
 */
export default function DashboardContent({
  stats = null,
  statsLoading = false,
  recentReports = [],
  recentReportsLoading = false,
  onSelectReport = () => {},
  onNavigate = () => {},
}) {
  const isInitialStatsLoading = statsLoading || !stats;

  // When any one count changes, all four cards show the loading placeholder together
  const statsRefreshing = useStatsRefresh(
    `${stats?.totalStudents}|${stats?.totalReports}|${stats?.totalGuides}|${stats?.onHoldReports}`,
    isInitialStatsLoading
  );
  const isStatsLoading = isInitialStatsLoading || statsRefreshing;

  return (
    <div className="dashboard-content-layout">
      {/* Part 2: Banner with Circle Ring */}
      <Banner />

      {/* Part 3: Four Stat Cards */}
      <section className="dashboard-stat-cards-grid" aria-label="System Metrics">
        {/* Card 1: TOTAL STUDENTS */}
        <StatCard
          title="TOTAL STUDENTS"
          value={stats?.totalStudents}
          loading={isStatsLoading}
          icon={User}
          caption="Registered student accounts in Fixie."
          onClick={() => onNavigate('Students')}
        />

        {/* Card 2: TOTAL REPORTS */}
        <StatCard
          title="TOTAL REPORTS"
          value={stats?.totalReports}
          loading={isStatsLoading}
          icon={FileText}
          caption="Reported laboratory issues."
          onClick={() => onNavigate('Reports')}
        />

        {/* Card 3: TOTAL GUIDES */}
        <StatCard
          title="TOTAL GUIDES"
          value={stats?.totalGuides}
          loading={isStatsLoading}
          icon={BookOpen}
          caption="Laboratory safety & guidelines."
          onClick={() => onNavigate('Laboratory Guides')}
        />

        {/* Card 4: ON HOLD (Replacing Resolved) */}
        <StatCard
          title="ON HOLD"
          value={stats?.onHoldReports}
          loading={isStatsLoading}
          icon={PauseCircle}
          caption="Reports currently placed on hold."
          isOnHold={true}
          onClick={() => onNavigate('Reports', 'ON_HOLD')}
        />
      </section>

      {/* Part 4: Recent Reports List (Image 5) */}
      <RecentReportsList
        reports={recentReports}
        loading={recentReportsLoading}
        onSelectReport={onSelectReport}
      />
    </div>
  );
}

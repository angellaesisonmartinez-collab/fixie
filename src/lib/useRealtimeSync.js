import { useEffect } from 'react';
import { supabase, safeRealtimeChannel, safeRemoveChannel } from './supabase';

/**
 * Centralized Client Realtime Manager Hook (Phase 6 Section 3.1)
 * Subscribes to PostgreSQL change data capture (CDC) across core Fixie tables:
 * - reports
 * - report_status_history
 * - students
 * - guides
 * 
 * @param {Object} handlers
 * @param {Function} [handlers.onReportChange] - Callback for reports table mutations
 * @param {Function} [handlers.onStatusHistoryInsert] - Callback for new status audit transitions
 * @param {Function} [handlers.onStudentUpdate] - Callback for student account updates/disabling
 * @param {Function} [handlers.onGuideChange] - Callback for guide publications and updates
 */
export function useRealtimeSync({
  onReportChange,
  onStatusHistoryInsert,
  onStudentUpdate,
  onGuideChange,
} = {}) {
  useEffect(() => {
    let channel = null;
    try {
      channel = safeRealtimeChannel('fixie-global-sync')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'reports' },
          (payload) => onReportChange?.(payload)
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'report_status_history' },
          (payload) => onStatusHistoryInsert?.(payload)
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'students' },
          (payload) => onStudentUpdate?.(payload)
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'guides' },
          (payload) => onGuideChange?.(payload)
        )
        .subscribe();
    } catch (chanErr) {
      console.warn('Fixie global realtime sync setup note:', chanErr);
    }

    return () => {
      safeRemoveChannel(channel);
    };
  }, [onReportChange, onStatusHistoryInsert, onStudentUpdate, onGuideChange]);
}

export default useRealtimeSync;

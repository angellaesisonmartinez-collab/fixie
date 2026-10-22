import { supabase, safeRemoveChannel } from './supabase';

const SYNC_CHANNEL_NAME = 'fixie-reports-sync';
const BROADCAST_CHANNEL_NAME = 'fixie_sync_channel';

// Singleton Supabase Realtime channel instance for global broadcast and listening
let globalRealtimeChannel = null;

// Registry of active subscriber callbacks
const reportUpdateListeners = new Set();

// Singleton Web API BroadcastChannel instance for same-origin cross-window/cross-tab sync
let crossTabChannel = null;
let crossTabListenerInitialized = false;
let windowListenerInitialized = false;

/**
 * Dispatch an update payload safely to all registered listeners.
 */
function notifyReportListeners(payload) {
  if (!payload) return;
  reportUpdateListeners.forEach((listener) => {
    try {
      listener(payload);
    } catch (err) {
      console.warn('Report update listener callback note:', err);
    }
  });
}

function getCrossTabChannel() {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    if (!crossTabChannel) {
      try {
        crossTabChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      } catch (err) {
        console.warn('BroadcastChannel initialization note:', err);
      }
    }
    return crossTabChannel;
  }
  return null;
}

function ensureAuxiliaryListeners() {
  if (!crossTabListenerInitialized) {
    const bc = getCrossTabChannel();
    if (bc) {
      bc.addEventListener('message', (event) => {
        if (event.data?.payload) {
          if (event.data.type === 'saved_guides_updated') {
            notifyReportListeners({ ...event.data.payload, isSavedGuidesUpdate: true });
          } else {
            notifyReportListeners(event.data.payload);
          }
        }
      });
      crossTabListenerInitialized = true;
    }
  }

  if (!windowListenerInitialized && typeof window !== 'undefined') {
    window.addEventListener('fixie_report_status_updated', (event) => {
      if (event.detail) notifyReportListeners(event.detail);
    });
    window.addEventListener('fixie_report_submitted', (event) => {
      if (event.detail) notifyReportListeners(event.detail);
    });
    window.addEventListener('fixie_saved_guides_updated', (event) => {
      if (event.detail) notifyReportListeners({ ...event.detail, isSavedGuidesUpdate: true });
    });
    windowListenerInitialized = true;
  }
}

/**
 * Get or create the singleton Supabase Realtime channel.
 * Note: All broadcast and postgres_changes callbacks MUST be attached
 * before .subscribe() is called.
 */
export function getGlobalRealtimeChannel() {
  if (!globalRealtimeChannel) {
    try {
      globalRealtimeChannel = supabase.channel(SYNC_CHANNEL_NAME, {
        config: { broadcast: { ack: false } },
      });

      // Attach all event listeners BEFORE calling .subscribe()
      globalRealtimeChannel
        .on('broadcast', { event: 'report_status_updated' }, (e) => {
          if (e?.payload) notifyReportListeners(e?.payload);
        })
        .on('broadcast', { event: 'report_submitted' }, (e) => {
          if (e?.payload) notifyReportListeners(e?.payload);
        })
        .on('broadcast', { event: 'saved_guides_updated' }, (e) => {
          if (e?.payload) notifyReportListeners({ ...e.payload, isSavedGuidesUpdate: true });
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, (e) => {
          if (e?.new) notifyReportListeners(e.new);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'reports_of_student' }, (e) => {
          if (e?.new) notifyReportListeners(e.new);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'report_status_history' }, (e) => {
          if (e?.new) notifyReportListeners({ ...e.new, isStatusHistoryChange: true });
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'saved_guides' }, (e) => {
          if (e?.new || e?.old) notifyReportListeners({ ...(e?.new || e?.old), isSavedGuidesUpdate: true });
        });

      globalRealtimeChannel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Channel active
        }
      });
    } catch (err) {
      console.warn('Realtime global channel initialization note:', err);
    }
  }
  return globalRealtimeChannel;
}

/**
 * Broadcast report status update across all remote clients (Supabase Realtime Broadcast),
 * all same-browser tabs/windows (Web API BroadcastChannel), and local window components.
 */
export function broadcastReportStatusUpdate(detail) {
  if (!detail) return;

  const targetId = detail.reportId || detail.report_id || detail.id;
  const newStatus = detail.newStatus || detail.status;
  const remarks = detail.remarks !== undefined ? detail.remarks : detail.newRemarks;
  const studentId = detail.studentId || detail.student_id;
  const studentUuid = detail.studentUuid || detail.student_uuid;
  const updatedAt = detail.updated_at || new Date().toISOString();

  const payload = {
    report_id: targetId,
    id: targetId,
    canonicalUuid: detail.canonicalUuid || null,
    reportCode: detail.reportCode || detail.report_id || null,
    status: newStatus,
    newStatus,
    remarks: remarks || null,
    newRemarks: remarks || null,
    student_id: studentId,
    student_uuid: studentUuid,
    updated_at: updatedAt,
    timestamps: detail.timestamps || null,
    history: detail.updatedHistory || detail.history || null,
  };

  // 1. Supabase Realtime broadcast across all remote browsers & sessions
  try {
    const ch = getGlobalRealtimeChannel();
    if (ch) {
      ch.send({
        type: 'broadcast',
        event: 'report_status_updated',
        payload,
      }).catch((sendErr) => console.warn('Supabase broadcast send note:', sendErr));
    }
  } catch (err) {
    console.warn('Supabase realtime broadcast exception:', err);
  }

  // 2. Web API BroadcastChannel for instantaneous same-origin cross-tab/cross-window sync
  try {
    const bc = getCrossTabChannel();
    if (bc) {
      bc.postMessage({
        type: 'report_status_updated',
        payload,
      });
    }
  } catch (bcErr) {
    console.warn('BroadcastChannel postMessage note:', bcErr);
  }

  // 3. Local window DOM CustomEvent for active components in current tab
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('fixie_report_status_updated', {
          detail: payload,
        })
      );
    }
  } catch (domErr) {
    console.warn('Window dispatch event note:', domErr);
  }
}

/**
 * Broadcast report submission across all clients
 */
export function broadcastReportSubmission(report) {
  if (!report) return;

  const payload = {
    report_id: report.report_id || report.id,
    id: report.id || report.report_id,
    status: report.status || 'Submitted',
    student_id: report.student_id,
    student_name: report.student_name || report.reportedByName,
    created_at: report.created_at || new Date().toISOString(),
    report,
  };

  // 1. Supabase Realtime broadcast
  try {
    const ch = getGlobalRealtimeChannel();
    if (ch) {
      ch.send({
        type: 'broadcast',
        event: 'report_submitted',
        payload,
      }).catch(() => {});
    }
  } catch {}

  // 2. BroadcastChannel
  try {
    const bc = getCrossTabChannel();
    if (bc) {
      bc.postMessage({
        type: 'report_submitted',
        payload,
      });
    }
  } catch {}

  // 3. Window event
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('fixie_report_submitted', {
          detail: payload,
        })
      );
    }
  } catch {}
}

/**
 * Universal subscription helper for report status transitions and submissions.
 * Listens to:
 * - Supabase Realtime Broadcasts on 'fixie-reports-sync'
 * - Supabase Realtime CDC 'postgres_changes' on 'reports', 'reports_of_student', and 'saved_guides'
 * - Web API BroadcastChannel cross-tab messages
 * - Window custom events
 */
export function subscribeToReportUpdates(onUpdate) {
  if (typeof onUpdate !== 'function') return () => {};

  reportUpdateListeners.add(onUpdate);

  try {
    getGlobalRealtimeChannel();
    ensureAuxiliaryListeners();
  } catch (err) {
    console.warn('Realtime subscription initialization note:', err);
  }

  // Cleanup function
  return () => {
    reportUpdateListeners.delete(onUpdate);
  };
}

/**
 * Broadcast saved guides bookmark update across all remote clients,
 * same-origin tabs/windows, and local window components.
 */
export function broadcastSavedGuidesUpdate(detail) {
  if (!detail) return;
  const studentId = detail.student_id || detail.studentId;
  const studentUuid = detail.student_uuid || detail.studentUuid;
  const count = typeof detail.count === 'number' ? detail.count : 0;
  const savedIds = Array.isArray(detail.savedIds) ? detail.savedIds : [];

  const payload = {
    student_id: studentId,
    student_uuid: studentUuid,
    count,
    savedIds,
    isSavedGuidesUpdate: true,
  };

  // 1. Supabase Realtime broadcast across all remote browsers & sessions
  try {
    const ch = getGlobalRealtimeChannel();
    if (ch) {
      ch.send({
        type: 'broadcast',
        event: 'saved_guides_updated',
        payload,
      }).catch((sendErr) => console.warn('Supabase broadcast saved_guides send note:', sendErr));
    }
  } catch (err) {
    console.warn('Supabase realtime saved_guides broadcast exception:', err);
  }

  // 2. Web API BroadcastChannel for instantaneous same-origin cross-tab/cross-window sync
  try {
    const bc = getCrossTabChannel();
    if (bc) {
      bc.postMessage({
        type: 'saved_guides_updated',
        payload,
      });
    }
  } catch (bcErr) {
    console.warn('BroadcastChannel postMessage saved_guides note:', bcErr);
  }

  // 3. Local window DOM CustomEvent for active components in current tab
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('fixie_saved_guides_updated', {
        detail: payload,
      })
    );
  }
}

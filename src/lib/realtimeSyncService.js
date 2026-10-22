import { supabase, safeRemoveChannel } from './supabase';

const SYNC_CHANNEL_NAME = 'fixie-reports-sync';
const BROADCAST_CHANNEL_NAME = 'fixie_sync_channel';

// Singleton Supabase Realtime channel instance for global broadcast and listening
let globalRealtimeChannel = null;

// Registry of active subscriber callbacks
const reportUpdateListeners = new Set();
const studentUpdateListeners = new Set();
const guideUpdateListeners = new Set();

// Singleton Web API BroadcastChannel instance for same-origin cross-window/cross-tab sync
let crossTabChannel = null;
let crossTabListenerInitialized = false;
let windowListenerInitialized = false;

// Cache to deduplicate rapid duplicate report events (e.g. broadcast + WAL CDC + status history within a short window)
const recentReportEventTimestamps = new Map();

/**
 * Dispatch a report update payload safely to all registered listeners.
 * Deduplicates rapid identical events to prevent glitching, double counting, and jitter.
 */
function notifyReportListeners(payload) {
  if (!payload) return;

  const targetId = payload.report_id || payload.id || payload.reportId || payload.canonicalUuid;
  const eventType = payload.eventType || (payload.report ? 'INSERT' : 'UPDATE');
  const status = payload.newStatus || payload.status || '';
  const remarks = payload.remarks !== undefined ? payload.remarks : (payload.newRemarks || '');

  if (targetId && (eventType === 'UPDATE' || eventType === 'INSERT')) {
    const signature = `${targetId}:${eventType}:${status}:${remarks}`;
    const now = Date.now();
    const lastTime = recentReportEventTimestamps.get(signature);
    if (lastTime && now - lastTime < 1200) {
      // Rapid duplicate event received within 1.2s; ignore duplicate dispatch
      return;
    }
    recentReportEventTimestamps.set(signature, now);

    // Periodically prune stale event signatures
    if (recentReportEventTimestamps.size > 200) {
      for (const [key, ts] of recentReportEventTimestamps.entries()) {
        if (now - ts > 5000) {
          recentReportEventTimestamps.delete(key);
        }
      }
    }
  }

  reportUpdateListeners.forEach((listener) => {
    try {
      listener(payload);
    } catch (err) {
      console.warn('Report update listener callback note:', err);
    }
  });
}

function notifyStudentListeners(payload) {
  if (!payload) return;
  studentUpdateListeners.forEach((listener) => {
    try {
      listener(payload);
    } catch (err) {
      console.warn('Student update listener callback note:', err);
    }
  });
}

function notifyGuideListeners(payload) {
  if (!payload) return;
  guideUpdateListeners.forEach((listener) => {
    try {
      listener(payload);
    } catch (err) {
      console.warn('Guide update listener callback note:', err);
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
        const data = event.data;
        if (!data) return;
        if (data.type === 'report_status_updated' || data.type === 'report_submitted' || data.type === 'report_deleted') {
          notifyReportListeners(data.payload);
        } else if (data.type === 'saved_guides_updated') {
          notifyReportListeners({ ...data.payload, isSavedGuidesUpdate: true });
        } else if (data.type === 'student_status_changed' || data.type === 'student_registered') {
          notifyStudentListeners(data.payload);
          notifyReportListeners({ ...data.payload, isStudentChange: true });
        } else if (data.type === 'guide_updated') {
          notifyGuideListeners(data.payload);
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
    window.addEventListener('fixie_report_deleted', (event) => {
      if (event.detail) notifyReportListeners(event.detail);
    });
    window.addEventListener('fixie_saved_guides_updated', (event) => {
      if (event.detail) notifyReportListeners({ ...event.detail, isSavedGuidesUpdate: true });
    });
    window.addEventListener('fixie_student_status_changed', (event) => {
      if (event.detail) {
        notifyStudentListeners(event.detail);
        notifyReportListeners({ ...event.detail, isStudentChange: true });
      }
    });
    window.addEventListener('fixie_student_registered', (event) => {
      if (event.detail) {
        notifyStudentListeners(event.detail);
        notifyReportListeners({ ...event.detail, isStudentChange: true });
      }
    });
    window.addEventListener('fixie_guide_updated', (event) => {
      if (event.detail) notifyGuideListeners(event.detail);
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
        // Broadcasts
        .on('broadcast', { event: 'report_status_updated' }, (e) => {
          if (e?.payload) notifyReportListeners({ ...e.payload, eventType: 'UPDATE' });
        })
        .on('broadcast', { event: 'report_submitted' }, (e) => {
          if (e?.payload) notifyReportListeners({ ...e.payload, eventType: 'INSERT' });
        })
        .on('broadcast', { event: 'report_deleted' }, (e) => {
          if (e?.payload) notifyReportListeners({ ...e.payload, eventType: 'DELETE' });
        })
        .on('broadcast', { event: 'saved_guides_updated' }, (e) => {
          if (e?.payload) notifyReportListeners({ ...e.payload, isSavedGuidesUpdate: true });
        })
        .on('broadcast', { event: 'student_status_changed' }, (e) => {
          if (e?.payload) {
            notifyStudentListeners(e.payload);
            notifyReportListeners({ ...e.payload, isStudentChange: true });
          }
        })
        .on('broadcast', { event: 'student_registered' }, (e) => {
          if (e?.payload) {
            notifyStudentListeners(e.payload);
            notifyReportListeners({ ...e.payload, isStudentChange: true });
          }
        })
        .on('broadcast', { event: 'guide_updated' }, (e) => {
          if (e?.payload) notifyGuideListeners(e.payload);
        })
        // Postgres Changes (WAL CDC)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, (e) => {
          const item = e.new || e.old || {};
          notifyReportListeners({
            ...item,
            eventType: e.eventType,
            new: e.new,
            old: e.old,
            table: 'reports',
            id: item.id || item.report_id,
            report_id: item.report_id || item.id,
            status: item.status,
            remarks: item.remarks,
          });
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'reports_of_student' }, (e) => {
          const item = e.new || e.old || {};
          notifyReportListeners({
            ...item,
            eventType: e.eventType,
            new: e.new,
            old: e.old,
            table: 'reports_of_student',
            id: item.id || item.report_id,
            report_id: item.report_id || item.id,
            status: item.status,
            remarks: item.remarks,
          });
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'phia-reports' }, (e) => {
          const item = e.new || e.old || {};
          notifyReportListeners({
            ...item,
            eventType: e.eventType,
            new: e.new,
            old: e.old,
            table: 'phia-reports',
            id: item.id || item.report_id,
            report_id: item.report_id || item.id,
            status: item.status,
            remarks: item.remarks,
          });
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'jennelyn-reports' }, (e) => {
          const item = e.new || e.old || {};
          notifyReportListeners({
            ...item,
            eventType: e.eventType,
            new: e.new,
            old: e.old,
            table: 'jennelyn-reports',
            id: item.id || item.report_id,
            report_id: item.report_id || item.id,
            status: item.status,
            remarks: item.remarks,
          });
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'report_status_history' }, (e) => {
          const item = e?.new || e?.old;
          if (item) {
            notifyReportListeners({
              ...item,
              canonicalUuid: item.report_id,
              reportId: item.report_id,
              report_id: item.report_id,
              status: item.status,
              newStatus: item.status,
              remarks: item.remarks,
              newRemarks: item.remarks,
              eventType: e.eventType,
              new: e.new,
              isStatusHistoryChange: true,
              table: 'report_status_history',
            });
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, (e) => {
          const studentItem = e.new || e.old || {};
          const payload = {
            ...studentItem,
            eventType: e.eventType,
            new: e.new,
            old: e.old,
            table: 'students',
            isStudentChange: true,
            student_id: studentItem.student_id,
            status: studentItem.status,
          };
          notifyStudentListeners(payload);
          notifyReportListeners(payload);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'guides' }, (e) => {
          const guideItem = e.new || e.old || {};
          notifyGuideListeners({
            ...guideItem,
            eventType: e.eventType,
            new: e.new,
            old: e.old,
            table: 'guides',
          });
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'saved_guides' }, (e) => {
          notifyReportListeners({
            ...(e?.new || e?.old || {}),
            eventType: e.eventType,
            isSavedGuidesUpdate: true,
            table: 'saved_guides',
          });
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
    eventType: 'UPDATE',
    table: 'reports',
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
    photo_url: detail.photo_url || null,
    equipment: detail.equipment || null,
    unit_number: detail.unit_number || detail.unitNumber || null,
    room: detail.room || null,
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

  // 4. Local in-process notification to guarantee zero lag
  notifyReportListeners(payload);
}

/**
 * Broadcast report submission across all clients
 */
export function broadcastReportSubmission(report) {
  if (!report) return;

  const payload = {
    eventType: 'INSERT',
    table: 'reports',
    report_id: report.report_id || report.id,
    id: report.id || report.report_id,
    canonicalUuid: report.id || report.canonicalUuid || null,
    status: report.status || 'Submitted',
    student_id: report.student_id,
    student_name: report.student_name || report.reportedByName,
    equipment: report.equipment,
    unit_number: report.unit_number || report.unitNumber,
    room: report.room,
    description: report.description,
    remarks: report.remarks || null,
    photo_url: report.photo_url || null,
    created_at: report.created_at || new Date().toISOString(),
    updated_at: report.updated_at || new Date().toISOString(),
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

  // 4. Local in-process notification
  notifyReportListeners(payload);
}

/**
 * Broadcast report deletion across all clients
 */
export function broadcastReportDeleted(reportId) {
  if (!reportId) return;

  const payload = {
    eventType: 'DELETE',
    table: 'reports',
    report_id: reportId,
    id: reportId,
  };

  // 1. Supabase Realtime broadcast
  try {
    const ch = getGlobalRealtimeChannel();
    if (ch) {
      ch.send({
        type: 'broadcast',
        event: 'report_deleted',
        payload,
      }).catch(() => {});
    }
  } catch {}

  // 2. BroadcastChannel
  try {
    const bc = getCrossTabChannel();
    if (bc) {
      bc.postMessage({
        type: 'report_deleted',
        payload,
      });
    }
  } catch {}

  // 3. Window event
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('fixie_report_deleted', {
          detail: payload,
        })
      );
    }
  } catch {}

  // 4. Local in-process notification
  notifyReportListeners(payload);
}

/**
 * Broadcast student status update / registration across all clients
 */
export function broadcastStudentChange(student, action = 'update') {
  if (!student) return;

  const payload = {
    eventType: action === 'insert' ? 'INSERT' : action === 'delete' ? 'DELETE' : 'UPDATE',
    table: 'students',
    student_id: student.student_id,
    id: student.id || student.student_id,
    name: student.name || student.full_name,
    email: student.email,
    year_block: student.year_block,
    status: student.status,
    isStudentChange: true,
    student,
  };

  try {
    const ch = getGlobalRealtimeChannel();
    if (ch) {
      ch.send({
        type: 'broadcast',
        event: action === 'insert' ? 'student_registered' : 'student_status_changed',
        payload,
      }).catch(() => {});
    }
  } catch {}

  try {
    const bc = getCrossTabChannel();
    if (bc) {
      bc.postMessage({
        type: action === 'insert' ? 'student_registered' : 'student_status_changed',
        payload,
      });
    }
  } catch {}

  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(action === 'insert' ? 'fixie_student_registered' : 'fixie_student_status_changed', {
          detail: payload,
        })
      );
    }
  } catch {}

  notifyStudentListeners(payload);
  notifyReportListeners(payload);
}

/**
 * Broadcast guide creation, update, or deletion across all clients
 */
export function broadcastGuideChange(guide, action = 'update') {
  if (!guide) return;

  const payload = {
    eventType: action === 'insert' ? 'INSERT' : action === 'delete' ? 'DELETE' : 'UPDATE',
    table: 'guides',
    id: guide.id,
    title: guide.title,
    category: guide.category,
    content: guide.content,
    guide,
  };

  try {
    const ch = getGlobalRealtimeChannel();
    if (ch) {
      ch.send({
        type: 'broadcast',
        event: 'guide_updated',
        payload,
      }).catch(() => {});
    }
  } catch {}

  try {
    const bc = getCrossTabChannel();
    if (bc) {
      bc.postMessage({
        type: 'guide_updated',
        payload,
      });
    }
  } catch {}

  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('fixie_guide_updated', {
          detail: payload,
        })
      );
    }
  } catch {}

  notifyGuideListeners(payload);
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

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('fixie_saved_guides_updated', {
        detail: payload,
      })
    );
  }

  notifyReportListeners(payload);
}

/**
 * Universal subscription helper for report updates.
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

  return () => {
    reportUpdateListeners.delete(onUpdate);
  };
}

/**
 * Subscription helper for student records updates.
 */
export function subscribeToStudentUpdates(onUpdate) {
  if (typeof onUpdate !== 'function') return () => {};

  studentUpdateListeners.add(onUpdate);

  try {
    getGlobalRealtimeChannel();
    ensureAuxiliaryListeners();
  } catch (err) {
    console.warn('Student realtime subscription initialization note:', err);
  }

  return () => {
    studentUpdateListeners.delete(onUpdate);
  };
}

/**
 * Subscription helper for laboratory guides updates.
 */
export function subscribeToGuideUpdates(onUpdate) {
  if (typeof onUpdate !== 'function') return () => {};

  guideUpdateListeners.add(onUpdate);

  try {
    getGlobalRealtimeChannel();
    ensureAuxiliaryListeners();
  } catch (err) {
    console.warn('Guide realtime subscription initialization note:', err);
  }

  return () => {
    guideUpdateListeners.delete(onUpdate);
  };
}

/**
 * Utility to refetch data when tab becomes visible again or internet reconnects.
 * Ensures no missed events if client was sleeping or network dropped.
 */
export function registerVisibilityAndOnlineSync(refetchFn) {
  if (typeof window === 'undefined' || typeof refetchFn !== 'function') return () => {};

  const handleVisibility = () => {
    if (document.visibilityState === 'visible') {
      try {
        refetchFn();
      } catch (err) {
        console.warn('Visibility refetch note:', err);
      }
    }
  };

  const handleOnline = () => {
    try {
      refetchFn();
    } catch (err) {
      console.warn('Online refetch note:', err);
    }
  };

  document.addEventListener('visibilitychange', handleVisibility);
  window.addEventListener('online', handleOnline);

  return () => {
    document.removeEventListener('visibilitychange', handleVisibility);
    window.removeEventListener('online', handleOnline);
  };
}

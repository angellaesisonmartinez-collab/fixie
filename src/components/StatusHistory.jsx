import React from 'react';
import { History, MessageSquare } from 'lucide-react';

/**
 * StatusHistory Component (Phase 3 Section 3.2)
 * Chronological timeline display for report state transitions and technician remarks.
 *
 * @param {Array} history Array of status history objects [{ action: 'Reviewed', time: 'Oct 05, 2:15 PM', remarksText: '...' }]
 */
export default function StatusHistory({ history = [], title = 'Status History', className = '' }) {
  if (!history || history.length === 0) {
    return (
      <div className={`detail-status-history-section ${className}`}>
        <h4 className="status-history-title">{title}</h4>
        <p className="status-history-empty-text" style={{ color: '#64748b', fontSize: '13px' }}>
          No historical events recorded yet.
        </p>
      </div>
    );
  }

  return (
    <div className={`detail-status-history-section ${className}`}>
      <div className="status-history-header-row" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <History size={16} className="history-icon-accent" color="#10b981" />
        <h4 className="status-history-title" style={{ margin: 0 }}>{title}</h4>
      </div>

      <div className="status-history-list">
        {history.map((item, index) => (
          <div key={index} className="status-history-entry-block">
            <div className="status-history-item-line">
              <strong className="history-action-text">{item.action}</strong>
              <span className="history-bullet-dot"> — </span>
              <span className="history-timestamp-text">{item.time}</span>
            </div>
            {item.remarksText && (
              <div className="history-remarks-subline" style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginTop: '4px' }}>
                <MessageSquare size={13} style={{ flexShrink: 0, marginTop: '2px', opacity: 0.7 }} />
                <span>Remarks: {item.remarksText}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

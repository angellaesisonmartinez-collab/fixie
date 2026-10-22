import React from 'react';
import { Check } from 'lucide-react';

/**
 * StatusStepper Component (Phase 3 Section 3.1)
 * Renders the linear 4-step workflow: Submitted -> Reviewed -> Under repair -> Resolved
 *
 * @param {string|number} status Current status name ('Submitted', 'Reviewed', 'Under Repair', 'Resolved') or 1-indexed phase number
 * @param {object} stepTimestamps Optional map of step dates/times { 1: 'Oct 05, 02:10 PM', ... }
 */
export default function StatusStepper({
  status = 'Submitted',
  phaseIndex: propPhaseIndex,
  isOnHold: propIsOnHold = false,
  stepTimestamps: _stepTimestamps = {},
  className = '',
}) {
  const s = String(status || '').toLowerCase().trim();
  const isOnHold = propIsOnHold || s === 'on hold' || s === 'on_hold';

  // Determine normalized 1-based index (1 = Submitted, 2 = Reviewed, 3 = Under repair, 4 = Resolved)
  let phaseIndex = 1;
  if (typeof propPhaseIndex === 'number') {
    phaseIndex = propPhaseIndex;
  } else {
    if (s.includes('resolve')) phaseIndex = 4;
    else if (isOnHold || s.includes('repair')) phaseIndex = 3;
    else if (s.includes('review')) phaseIndex = 2;
    else phaseIndex = 1;
  }

  const steps = [
    { index: 1, label: 'Submitted' },
    { index: 2, label: 'Reviewed' },
    { index: 3, label: 'Under repair' },
    { index: 4, label: 'Resolved' },
  ];

  return (
    <div className={`fixie-workflow-stepper-wrap ${className}`} role="region" aria-label="Report Status Workflow">
      {steps.map((step, idx) => {
        const isCompleted = phaseIndex > step.index || (phaseIndex === 4 && step.index === 4);
        const isActive = phaseIndex === step.index && phaseIndex !== 4;
        const isStepOnHold = isOnHold && step.index === 3 && phaseIndex !== 4;

        let circleClass = 'node-inactive';
        if (isStepOnHold) {
          circleClass = 'node-on-hold-amber';
        } else if (phaseIndex === 4 && step.index === 4) {
          circleClass = 'node-active-blue-check';
        } else if (isCompleted) {
          circleClass = 'node-completed-green';
        } else if (isActive) {
          circleClass = 'node-active';
        }

        return (
          <React.Fragment key={step.index}>
            <div className="stepper-node-item">
              <div
                className={`stepper-node-circle ${circleClass}`}
                aria-current={isActive || isStepOnHold ? 'step' : undefined}
              >
                {phaseIndex === 4 && step.index === 4 ? (
                  <Check size={14} strokeWidth={2.8} color="#2563EB" />
                ) : isCompleted && !isStepOnHold ? (
                  <Check size={14} strokeWidth={3} color="#15803D" />
                ) : (
                  step.index
                )}
              </div>
              <span
                className={`stepper-node-label ${
                  isActive || isCompleted || isStepOnHold ? 'label-highlighted' : 'label-muted'
                }`}
              >
                {step.label}
              </span>
              {/* Image 1: On Hold badge pill directly beneath Under repair */}
              {isStepOnHold && (
                <span className="stepper-on-hold-pill-badge">On Hold</span>
              )}
            </div>

            {/* Horizontal line connector between steps */}
            {idx < steps.length - 1 && (
              <div
                className={`stepper-horizontal-line ${
                  phaseIndex > step.index || (isOnHold && step.index < 3)
                    ? 'line-completed-green'
                    : 'line-inactive'
                }`}
                aria-hidden="true"
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

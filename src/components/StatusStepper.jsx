import React from 'react';
import { Check } from 'lucide-react';

/**
 * StatusStepper Component
 * Renders the linear workflow matching Status History:
 * - If On Hold was triggered: 4 steps (Under Review -> Under Repair -> On Hold -> Resolved)
 * - If resolved directly or never on hold: 3 steps (Under Review -> Under Repair -> Resolved)
 *
 * @param {string|number} status Current status name ('Under Review', 'Under Repair', 'On Hold', 'Resolved') or 1-indexed phase number
 * @param {boolean} isOnHold Whether the report is currently On Hold
 * @param {boolean} hasBeenOnHold Whether the report was ever on hold in its history
 */
export default function StatusStepper({
  status = 'Submitted',
  phaseIndex: propPhaseIndex,
  isOnHold: propIsOnHold = false,
  hasBeenOnHold: propHasBeenOnHold = false,
  stepTimestamps: _stepTimestamps = {},
  className = '',
}) {
  const s = String(status || '').toLowerCase().trim();
  const isCurrentlyOnHold = propIsOnHold || s === 'on hold' || s === 'on_hold' || s.includes('hold');
  const wasOrIsOnHold = isCurrentlyOnHold || propHasBeenOnHold;

  const steps = wasOrIsOnHold
    ? [
        { index: 1, label: 'Under Review' },
        { index: 2, label: 'Under Repair' },
        { index: 3, label: 'On Hold' },
        { index: 4, label: 'Resolved' },
      ]
    : [
        { index: 1, label: 'Under Review' },
        { index: 2, label: 'Under Repair' },
        { index: 3, label: 'Resolved' },
      ];

  // Determine normalized 1-based index (0 means no step highlighted yet)
  let phaseIndex = 0;
  if (typeof propPhaseIndex === 'number') {
    phaseIndex = Math.min(propPhaseIndex, steps.length);
  } else {
    if (s.includes('resolve')) {
      phaseIndex = steps.length;
    } else if (isCurrentlyOnHold && wasOrIsOnHold) {
      phaseIndex = 3;
    } else if (s.includes('repair')) {
      phaseIndex = 2;
    } else if (s === 'reviewed' || s === 'under review' || s === 'under_review') {
      phaseIndex = 1;
    } else if (s === 'submitted' || s.includes('submit')) {
      phaseIndex = 0;
    } else {
      phaseIndex = 0;
    }
  }

  return (
    <div className={`fixie-workflow-stepper-wrap ${className}`} role="region" aria-label="Report Status Workflow">
      {steps.map((step, idx) => {
        const isCompleted = phaseIndex > 0 && (phaseIndex > step.index || (phaseIndex === steps.length && step.index <= steps.length));
        const isActive = phaseIndex > 0 && phaseIndex === step.index && phaseIndex !== steps.length;
        const isStepOnHold = phaseIndex > 0 && (isCurrentlyOnHold || phaseIndex === 3) && step.label === 'On Hold' && phaseIndex !== steps.length;

        let circleClass = 'node-inactive';
        if (isStepOnHold) {
          circleClass = 'node-on-hold-amber';
        } else if (isCompleted) {
          circleClass = 'node-completed-green';
        } else if (isActive) {
          circleClass = 'node-active';
        }

        return (
          <React.Fragment key={`${step.label}-${step.index}`}>
            <div className="stepper-node-item">
              <div
                className={`stepper-node-circle ${circleClass}`}
                aria-current={isActive || isStepOnHold || (phaseIndex === steps.length && step.index === steps.length) ? 'step' : undefined}
              >
                {isCompleted && !isStepOnHold ? (
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
            </div>

            {/* Horizontal line connector between steps */}
            {idx < steps.length - 1 && (
              <div
                className={`stepper-horizontal-line ${
                  phaseIndex > 0 && (phaseIndex > step.index || (phaseIndex === steps.length && step.index < steps.length))
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

import React from 'react';
import { Check, X } from 'lucide-react';

/**
 * PasswordStrengthMeter Component (Phase 3 Section 3.3)
 * Evaluates 5 security criteria and displays 3-tier visual meter + live checklist.
 *
 * @param {string} password The password string being evaluated
 * @param {boolean} showChecklist Whether to display the 5 bullet requirements
 */
export default function PasswordStrengthMeter({ password = '', showChecklist = true, className = '' }) {
  const reqLength = password.length >= 8;
  const reqUpper = /[A-Z]/.test(password);
  const reqLower = /[a-z]/.test(password);
  const reqNumber = /[0-9]/.test(password);
  const reqSpecial = /[^A-Za-z0-9]/.test(password);

  const passedCount = [reqLength, reqUpper, reqLower, reqNumber, reqSpecial].filter(Boolean).length;

  let strengthTier = 'Weak';
  let tierClass = 'tier-weak';
  let barWidth = '33%';
  let barColor = '#ef4444'; // Red

  if (passedCount >= 5) {
    strengthTier = 'Strong';
    tierClass = 'tier-strong';
    barWidth = '100%';
    barColor = '#10b981'; // Emerald
  } else if (passedCount >= 3) {
    strengthTier = 'Moderate';
    tierClass = 'tier-moderate';
    barWidth = '66%';
    barColor = '#f59e0b'; // Amber
  }

  const requirements = [
    { label: 'At least 8 characters', met: reqLength },
    { label: 'At least 1 uppercase letter (A-Z)', met: reqUpper },
    { label: 'At least 1 lowercase letter (a-z)', met: reqLower },
    { label: 'At least 1 number (0-9)', met: reqNumber },
    { label: 'At least 1 special character (!@#$%^&*)', met: reqSpecial },
  ];

  return (
    <div className={`fixie-password-strength-widget ${className}`} aria-live="polite">
      {/* 3-Tier Visual Bar */}
      <div className="strength-bar-track" style={{ height: '5px', backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: '3px', overflow: 'hidden', margin: '8px 0 6px' }}>
        <div
          className={`strength-bar-fill ${tierClass}`}
          style={{
            width: password ? barWidth : '0%',
            height: '100%',
            backgroundColor: barColor,
            transition: 'width 0.25s ease, background-color 0.25s ease',
          }}
        />
      </div>

      {password && (
        <div className="strength-tier-label-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '600', marginBottom: '8px', color: barColor }}>
          <span>Password Strength:</span>
          <span>{strengthTier}</span>
        </div>
      )}

      {/* Requirement Checklist */}
      {showChecklist && (
        <ul className="strength-requirements-list" style={{ listStyle: 'none', padding: 0, margin: '6px 0 0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {requirements.map((req, i) => (
            <li
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                color: req.met ? '#15803d' : '#64748b',
                transition: 'color 0.2s ease',
              }}
            >
              {req.met ? (
                <Check size={13} strokeWidth={2.5} color="#15803d" />
              ) : (
                <div style={{ width: '13px', height: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#94a3b8' }} />
                </div>
              )}
              <span>{req.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

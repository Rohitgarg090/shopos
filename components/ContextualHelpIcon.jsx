'use client';
import React, { useState } from 'react';
import { HelpCircle, X } from 'lucide-react';

export default function ContextualHelpIcon({ onStartTour, tooltipText = 'Need help with this page?' }) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => onStartTour()}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          border: '1px solid rgba(27, 94, 138, 0.3)',
          background: 'rgba(27, 94, 138, 0.08)',
          color: '#1B5E8A',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease',
        }}
        onMouseEnterCapture={(e) => {
          e.currentTarget.style.background = 'rgba(27, 94, 138, 0.15)';
          e.currentTarget.style.transform = 'scale(1.05)';
        }}
        onMouseLeaveCapture={(e) => {
          e.currentTarget.style.background = 'rgba(27, 94, 138, 0.08)';
          e.currentTarget.style.transform = 'scale(1)';
        }}
        title="Get help with this page"
      >
        <HelpCircle size={18} />
      </button>

      {showTooltip && (
        <div
          style={{
            position: 'absolute',
            right: -10,
            top: 40,
            background: '#1A1A18',
            color: '#fff',
            padding: '8px 12px',
            borderRadius: 6,
            fontSize: 12,
            whiteSpace: 'nowrap',
            zIndex: 1000,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
        >
          {tooltipText}
        </div>
      )}
    </div>
  );
}

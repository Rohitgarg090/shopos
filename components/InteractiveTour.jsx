'use client';
import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';
import Portal from '@/components/Portal';

export default function InteractiveTour({ steps, activeStep, isOpen, onClose, onNext, onPrev }) {
  const [highlightedElement, setHighlightedElement] = useState(null);

  useEffect(() => {
    if (!isOpen || !steps[activeStep]) return;
    const selector = steps[activeStep].selector;
    if (selector) {
      const element = document.querySelector(selector);
      if (element) {
        const rect = element.getBoundingClientRect();
        setHighlightedElement({ rect, selector });
      }
    }
  }, [activeStep, isOpen, steps]);

  if (!isOpen || !steps[activeStep]) return null;

  const step = steps[activeStep];
  const { rect } = highlightedElement || {};

  return (
    <Portal>
      {/* Semi-transparent overlay */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          zIndex: 98000,
          pointerEvents: 'none',
        }}
      />

      {/* Highlight box around target element */}
      {rect && (
        <div
          style={{
            position: 'fixed',
            top: rect.top - 8,
            left: rect.left - 8,
            width: rect.width + 16,
            height: rect.height + 16,
            border: '2px solid #6366F1',
            borderRadius: 12,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6), 0 0 20px rgba(99, 102, 241, 0.6)',
            zIndex: 98001,
            pointerEvents: 'none',
            animation: 'pulse 2s infinite',
          }}
        />
      )}

      {/* Tooltip */}
      <div
        style={{
          position: 'fixed',
          top: rect ? Math.max(20, rect.top - 200) : '50%',
          left: rect ? Math.min(window.innerWidth - 350, rect.left + rect.width / 2 - 150) : '50%',
          background: '#fff',
          borderRadius: 12,
          padding: 24,
          maxWidth: 350,
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          zIndex: 98002,
          transform: !rect ? 'translate(-50%, -50%)' : 'none',
        }}
      >
        <style>{`
          @keyframes pulse {
            0%, 100% { box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.6), 0 0 20px rgba(99, 102, 241, 0.6); }
            50% { box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.6), 0 0 30px rgba(99, 102, 241, 0.8); }
          }
        `}</style>

        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#888',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <X size={18} />
        </button>

        {/* Step counter */}
        <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>
          Step {activeStep + 1} of {steps.length}
        </div>

        {/* Title */}
        <h3 style={{ marginBottom: 8, fontSize: 16, fontWeight: 700, color: '#1A1A18' }}>
          {step.title}
        </h3>

        {/* Description */}
        <p style={{ marginBottom: 16, fontSize: 14, color: '#555', lineHeight: 1.6 }}>
          {step.description}
        </p>

        {/* Action text */}
        {step.action && (
          <div
            style={{
              background: '#E3EFF8',
              border: '1px solid #1B5E8A',
              borderRadius: 8,
              padding: 12,
              marginBottom: 16,
              fontSize: 13,
              color: '#1B5E8A',
            }}
          >
            👆 {step.action}
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onPrev}
            disabled={activeStep === 0}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 12px',
              border: '1px solid #E3E1D9',
              background: '#fff',
              borderRadius: 6,
              cursor: activeStep === 0 ? 'not-allowed' : 'pointer',
              fontSize: 12,
              fontWeight: 600,
              color: activeStep === 0 ? '#CCC' : '#1A1A18',
              transition: 'all 0.2s',
            }}
          >
            <ChevronLeft size={14} /> Back
          </button>

          <button
            onClick={activeStep === steps.length - 1 ? onClose : onNext}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 12px',
              border: 'none',
              background: '#1B5E8A',
              color: '#fff',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
              transition: 'all 0.2s',
            }}
          >
            {activeStep === steps.length - 1 ? 'Done' : 'Next'} <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </Portal>
  );
}

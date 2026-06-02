'use client';
import React from 'react';
import { X, Check } from 'lucide-react';
import Portal from '@/components/Portal';

export default function AnimatedDemo({ isOpen, onClose, title, demos }) {
  if (!isOpen || !demos || demos.length === 0) return null;

  return (
    <Portal>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99000,
          padding: 20,
        }}
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: '#fff',
            borderRadius: 16,
            maxWidth: 700,
            maxHeight: '85vh',
            overflow: 'auto',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '20px 24px',
              borderBottom: '1px solid #E3E1D9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1A1A18', margin: 0 }}>
              {title}
            </h2>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#888',
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Demos */}
          <div style={{ padding: 24 }}>
            {demos.map((demo, idx) => (
              <div key={idx} style={{ marginBottom: idx < demos.length - 1 ? 32 : 0 }}>
                {/* Demo animation */}
                <div
                  style={{
                    background: '#F5F4F0',
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 12,
                    minHeight: 200,
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {demo.animation}
                </div>

                {/* Demo description */}
                <div>
                  <h4 style={{ fontSize: 14, fontWeight: 600, color: '#1A1A18', marginBottom: 6 }}>
                    {demo.title}
                  </h4>
                  <p style={{ fontSize: 13, color: '#666', lineHeight: 1.6, margin: 0 }}>
                    {demo.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '12px 24px',
              borderTop: '1px solid #E3E1D9',
              textAlign: 'right',
            }}
          >
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px',
                background: '#1B5E8A',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 12,
              }}
            >
              Got it!
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

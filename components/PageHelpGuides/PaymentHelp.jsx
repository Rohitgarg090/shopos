'use client';
import React, { useState } from 'react';
import { ChevronRight, X } from 'lucide-react';
import Portal from '@/components/Portal';
import ContextualHelpIcon from '@/components/ContextualHelpIcon';
import InteractiveTour from '@/components/InteractiveTour';
import AnimatedDemo from '@/components/AnimatedDemo';

const paymentTourSteps = [
  {
    selector: '.payment-search-box',
    title: '🔍 Search Payments',
    description: 'Find payments by customer name, invoice number, or payment date. Quick lookup for payment history.',
    action: 'Try typing a customer name or invoice number',
  },
  {
    selector: '.record-payment-btn',
    title: '➕ Record New Payment',
    description: 'Add a new payment for an invoice. You can link payments to specific invoices to track them.',
    action: 'Click to record a payment',
  },
  {
    selector: '.payment-method-filter',
    title: '💳 Payment Method',
    description: 'Track payments by method: Cash, UPI, Cheque, or others. Helps with accounting and reconciliation.',
    action: 'Filter by payment method',
  },
  {
    selector: '.payment-list-table',
    title: '📋 Payment History',
    description: 'View all recorded payments. You can edit or delete payments if needed. Dates are automatically tracked.',
    action: 'Click on a payment to see details',
  },
];

const paymentDemos = [
  {
    title: '💰 Recording a Payment - Step by Step',
    description: 'Here\'s how to record a payment:',
    animation: (
      <div style={{ position: 'relative', height: 180 }}>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#1B5E8A', marginBottom: 4 }}>
            Step 1: Select Invoice
          </div>
          <div
            style={{
              padding: 8,
              background: '#fff',
              border: '1px solid #E3E1D9',
              borderRadius: 6,
              fontSize: 12,
              animation: 'slideIn 0.5s ease-out',
            }}
          >
            📄 Choose invoice #INV-001 for "Akash Garment Store"
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#2E6B1F', marginBottom: 4 }}>
            Step 2: Enter Payment Details
          </div>
          <div
            style={{
              padding: 8,
              background: '#fff',
              border: '1px solid #E3E1D9',
              borderRadius: 6,
              fontSize: 12,
              animation: 'slideIn 0.7s ease-out',
            }}
          >
            💵 Amount: ₹2,950, Method: UPI (PhonePe), Date: Today
          </div>
        </div>

        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#9B2626', marginBottom: 4 }}>
            Step 3: Save Payment
          </div>
          <div
            style={{
              padding: 8,
              background: '#EBF5E4',
              border: '1px solid #2E6B1F',
              borderRadius: 6,
              fontSize: 12,
              color: '#2E6B1F',
              fontWeight: 600,
              animation: 'slideIn 0.9s ease-out',
            }}
          >
            ✅ Payment recorded! Invoice balance updated automatically
          </div>
        </div>

        <style>{`
          @keyframes slideIn {
            from { opacity: 0; transform: translateX(-10px); }
            to { opacity: 1; transform: translateX(0); }
          }
        `}</style>
      </div>
    ),
  },
  {
    title: '🔄 What Happens When You Record a Payment',
    description: 'The system auto-updates everything:',
    animation: (
      <div style={{ position: 'relative', height: 180 }}>
        <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: '#E3EFF8',
              color: '#1B5E8A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            1
          </div>
          <div style={{ fontSize: 13 }}>Invoice balance decreases by payment amount</div>
        </div>

        <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: '#E3EFF8',
              color: '#1B5E8A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            2
          </div>
          <div style={{ fontSize: 13 }}>Customer's total outstanding balance reduces</div>
        </div>

        <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: '#E3EFF8',
              color: '#1B5E8A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            3
          </div>
          <div style={{ fontSize: 13 }}>Invoice status changes (Unpaid → Partial → Paid)</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: '#EBF5E4',
              color: '#2E6B1F',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            ✓
          </div>
          <div style={{ fontSize: 13, color: '#2E6B1F' }}>Reports automatically refresh with new data!</div>
        </div>
      </div>
    ),
  },
];

export default function PaymentHelp() {
  const [helpMode, setHelpMode] = useState(null);
  const [tourStep, setTourStep] = useState(0);

  return (
    <>
      <ContextualHelpIcon
        onStartTour={() => setHelpMode('menu')}
        tooltipText="Learn how to record payments"
      />

      {helpMode === 'menu' && (
        <Portal>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 99500,
            }}
            onClick={() => setHelpMode(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#fff',
                borderRadius: 14,
                overflow: 'hidden',
                minWidth: 300,
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              }}
            >
              <div
                style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid #E3E1D9',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>How to record Payments?</h3>
                <button
                  onClick={() => setHelpMode(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#888',
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ padding: '12px 0' }}>
                <button
                  onClick={() => {
                    setHelpMode('tour');
                    setTourStep(0);
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 20px',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: 13,
                    fontWeight: 500,
                    color: '#1A1A18',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#F5F4F0')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{ fontSize: 16 }}>👆</span>
                  <div>
                    <div style={{ fontWeight: 600 }}>Interactive Tour</div>
                    <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                      Highlights show you where to click
                    </div>
                  </div>
                  <ChevronRight size={16} style={{ marginLeft: 'auto' }} />
                </button>

                <button
                  onClick={() => setHelpMode('demo')}
                  style={{
                    width: '100%',
                    padding: '12px 20px',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: 13,
                    fontWeight: 500,
                    color: '#1A1A18',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#F5F4F0')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{ fontSize: 16 }}>🎬</span>
                  <div>
                    <div style={{ fontWeight: 600 }}>Animated Demo</div>
                    <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                      See examples of how payments work
                    </div>
                  </div>
                  <ChevronRight size={16} style={{ marginLeft: 'auto' }} />
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      <InteractiveTour
        steps={paymentTourSteps}
        activeStep={tourStep}
        isOpen={helpMode === 'tour'}
        onClose={() => {
          setHelpMode(null);
          setTourStep(0);
        }}
        onNext={() => setTourStep(tourStep + 1)}
        onPrev={() => setTourStep(Math.max(0, tourStep - 1))}
      />

      <AnimatedDemo
        isOpen={helpMode === 'demo'}
        onClose={() => setHelpMode(null)}
        title="Payment Recording & Tracking"
        demos={paymentDemos}
      />
    </>
  );
}

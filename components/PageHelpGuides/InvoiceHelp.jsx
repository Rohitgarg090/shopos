'use client';
import React, { useState } from 'react';
import { ChevronRight, X } from 'lucide-react';
import Portal from '@/components/Portal';
import ContextualHelpIcon from '@/components/ContextualHelpIcon';
import InteractiveTour from '@/components/InteractiveTour';
import AnimatedDemo from '@/components/AnimatedDemo';

const invoiceTourSteps = [
  {
    selector: '.invoice-search-box',
    title: '🔍 Search Invoices',
    description: 'Use the search box to quickly find invoices by customer name, phone, invoice number, or date.',
    action: 'Try typing a customer name or invoice number',
  },
  {
    selector: '.create-invoice-btn',
    title: '➕ Create New Invoice',
    description: 'Click this button to start creating a new invoice. You\'ll add customers, products, and calculate taxes.',
    action: 'Click to create your first invoice',
  },
  {
    selector: '.invoice-status-filter',
    title: '📊 Filter by Status',
    description: 'Filter invoices by Unpaid, Partial, or Paid. This helps you track payment status at a glance.',
    action: 'Click any status to filter',
  },
  {
    selector: '.invoice-list-table',
    title: '📋 Invoice List',
    description: 'All your invoices appear here. Click any row to view, edit, or print the invoice.',
    action: 'Click on an invoice to see details',
  },
];

const invoiceDemos = [
  {
    title: '✅ Creating an Invoice - Step by Step',
    description: 'Here\'s how a typical invoice is created:',
    animation: (
      <div style={{ position: 'relative', height: 180 }}>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#1B5E8A', marginBottom: 4 }}>
            Step 1: Select Customer
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
            👤 Choose "Akash Garment Store" from customer list
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#2E6B1F', marginBottom: 4 }}>
            Step 2: Add Products
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
            📦 Add "Shirt XL" × 5 @ ₹500 = ₹2,500
          </div>
        </div>

        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#9B2626', marginBottom: 4 }}>
            Step 3: Review & Save
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
            ✅ Invoice saved! GST (18%) auto-calculated = ₹450. Total: ₹2,950
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
    title: '💰 What Happens When You Edit',
    description: 'Editing an invoice is simple:',
    animation: (
      <div style={{ position: 'relative', height: 160 }}>
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
          <div style={{ fontSize: 13 }}>Click the invoice in the list</div>
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
          <div style={{ fontSize: 13 }}>Hit the "Edit" button in the detail view</div>
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
          <div style={{ fontSize: 13 }}>Modify quantities, rates, or customer</div>
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
          <div style={{ fontSize: 13, color: '#2E6B1F' }}>Save - everything updates instantly!</div>
        </div>
      </div>
    ),
  },
];

export default function InvoiceHelp() {
  const [helpMode, setHelpMode] = useState(null);
  const [tourStep, setTourStep] = useState(0);

  const handleStartTour = () => {
    setHelpMode('tour');
    setTourStep(0);
  };

  return (
    <>
      {/* Help Icon */}
      <ContextualHelpIcon
        onStartTour={() => setHelpMode('menu')}
        tooltipText="Learn how to create & manage invoices"
      />

      {/* Help Menu */}
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
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>How to use Invoices?</h3>
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
                  onClick={handleStartTour}
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
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#F5F4F0';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
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
                  onClick={() => {
                    setHelpMode('demo');
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
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#F5F4F0';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <span style={{ fontSize: 16 }}>🎬</span>
                  <div>
                    <div style={{ fontWeight: 600 }}>Animated Demo</div>
                    <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                      See examples of how invoices work
                    </div>
                  </div>
                  <ChevronRight size={16} style={{ marginLeft: 'auto' }} />
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Interactive Tour */}
      <InteractiveTour
        steps={invoiceTourSteps}
        activeStep={tourStep}
        isOpen={helpMode === 'tour'}
        onClose={() => {
          setHelpMode(null);
          setTourStep(0);
        }}
        onNext={() => setTourStep(tourStep + 1)}
        onPrev={() => setTourStep(Math.max(0, tourStep - 1))}
      />

      {/* Animated Demo */}
      <AnimatedDemo
        isOpen={helpMode === 'demo'}
        onClose={() => setHelpMode(null)}
        title="Invoice Creation & Management"
        demos={invoiceDemos}
      />
    </>
  );
}

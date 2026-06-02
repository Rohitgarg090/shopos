'use client';
import React, { useState } from 'react';
import { ChevronRight, X } from 'lucide-react';
import Portal from '@/components/Portal';
import ContextualHelpIcon from '@/components/ContextualHelpIcon';
import InteractiveTour from '@/components/InteractiveTour';
import AnimatedDemo from '@/components/AnimatedDemo';

const customerTourSteps = [
  {
    selector: '.customer-search-box',
    title: '🔍 Search Customers',
    description: 'Find customers by name, phone number, or business name. Fuzzy search helps even if you don\'t remember exact details.',
    action: 'Try typing a customer name',
  },
  {
    selector: '.add-customer-btn',
    title: '➕ Add New Customer',
    description: 'Create a new customer record with contact details and credit limit. You can add more customers anytime.',
    action: 'Click to add a new customer',
  },
  {
    selector: '.customer-list-table',
    title: '👥 Customer List',
    description: 'View all your customers, their outstanding balance, and total purchases. Click any customer to see details.',
    action: 'Click on a customer row',
  },
  {
    selector: '.credit-limit-badge',
    title: '💳 Credit Limit & Balance',
    description: 'Set how much credit you\'re willing to extend. The app warns you if a customer exceeds their limit.',
    action: 'Check the balance column',
  },
];

const customerDemos = [
  {
    title: '✅ Adding a Customer',
    description: 'Here\'s how to add a new customer:',
    animation: (
      <div style={{ position: 'relative', height: 180 }}>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#1B5E8A', marginBottom: 4 }}>
            Step 1: Fill Customer Details
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
            📝 Name: "Akash Garment Store", Phone: "9876543210", Credit Limit: "₹50,000"
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#2E6B1F', marginBottom: 4 }}>
            Step 2: Save Customer
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
            ✅ Customer saved! Now you can create invoices for them
          </div>
        </div>

        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#1B5E8A', marginBottom: 4 }}>
            Step 3: Start Creating Invoices
          </div>
          <div
            style={{
              padding: 8,
              background: '#E3EFF8',
              border: '1px solid #1B5E8A',
              borderRadius: 6,
              fontSize: 12,
              animation: 'slideIn 0.9s ease-out',
            }}
          >
            💼 Go to Invoices and select this customer to create an invoice
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
    title: '📊 Track Customer Balance',
    description: 'Monitor how much each customer owes:',
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
          <div style={{ fontSize: 13 }}>Create invoices for the customer</div>
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
          <div style={{ fontSize: 13 }}>Balance increases (unpaid amount)</div>
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
          <div style={{ fontSize: 13 }}>Record payments to reduce balance</div>
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
          <div style={{ fontSize: 13, color: '#2E6B1F' }}>Balance updates automatically!</div>
        </div>
      </div>
    ),
  },
];

export default function CustomerHelp() {
  const [helpMode, setHelpMode] = useState(null);
  const [tourStep, setTourStep] = useState(0);

  return (
    <>
      <ContextualHelpIcon
        onStartTour={() => setHelpMode('menu')}
        tooltipText="Learn how to manage customers"
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
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>How to manage Customers?</h3>
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
                      See examples of how customers work
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
        steps={customerTourSteps}
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
        title="Customer Management"
        demos={customerDemos}
      />
    </>
  );
}

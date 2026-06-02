'use client';
import React, { useState } from 'react';
import { X, ChevronDown, Play, BookOpen, Lightbulb, HelpCircle } from 'lucide-react';
import Portal from '@/components/Portal';

const BL='#1B5E8A', BLL='#E3EFF8', BORD='#E3E1D9', MUT='#888', TXT='#1A1A18', BG='#F5F4F0', GR='#2E6B1F';

export default function HelpModal({ isOpen, onClose }) {
  const [activeCategory, setActiveCategory] = useState('getting-started');
  const [expandedTopic, setExpandedTopic] = useState(null);

  // Handle ESC key to close modal
  React.useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden'; // Prevent background scroll
      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Modal styles
  const modalOverlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999, // Very high to be above everything
    animation: 'fadeIn 0.2s ease-in',
    padding: '20px'
  };

  const categories = {
    'getting-started': {
      label: '🚀 Getting Started',
      topics: [
        {
          id: 'setup',
          title: 'Initial Setup',
          steps: [
            '1️⃣ Create your firm/shop in "Settings → Account & Firm"',
            '2️⃣ Add your business details (name, GST, address)',
            '3️⃣ Upload your logo (optional)',
            '4️⃣ Configure invoice settings',
            '✅ Ready to create your first invoice!'
          ]
        },
        {
          id: 'first-invoice',
          title: 'Create Your First Invoice',
          steps: [
            '1️⃣ Go to "Invoices" tab',
            '2️⃣ Click "Create Invoice"',
            '3️⃣ Select or create a customer',
            '4️⃣ Add products/items with quantities & rates',
            '5️⃣ Review details (GST, discounts)',
            '6️⃣ Click "Save Invoice"',
            '💾 Invoice is saved & can be printed/emailed'
          ]
        }
      ]
    },
    'features': {
      label: '⭐ Features',
      topics: [
        {
          id: 'customers',
          title: 'Managing Customers',
          steps: [
            '📋 View all customers in "Customers" tab',
            '➕ Click "Add Customer" to create new',
            '📊 Track customer balance (outstanding amount)',
            '🔔 Set credit limits for customers',
            '📱 Store phone/email for notifications',
            '🔍 Search customers by name or ID'
          ]
        },
        {
          id: 'products',
          title: 'Managing Products',
          steps: [
            '📦 Go to "Products" tab',
            '➕ Add new product with SKU, rate, quantity',
            '🏷️ Set MRP (Max Retail Price) & wholesale rate',
            '📈 Track stock quantity automatically',
            '🔄 Update rates anytime (applies to future invoices)',
            '⚠️ Get low stock alerts'
          ]
        },
        {
          id: 'payments',
          title: 'Recording Payments',
          steps: [
            '💰 Go to "Payments" tab',
            '➕ Click "Record Payment"',
            '🔗 Link payment to customer invoice',
            '💵 Enter amount & payment method',
            '📅 Set payment date',
            '✅ Click "Save" - invoice balance updates automatically'
          ]
        },
        {
          id: 'returns',
          title: 'Processing Returns',
          steps: [
            '↩️ Go to "Returns" tab',
            '➕ Click "Create Return"',
            '🔗 Select original invoice',
            '📦 Enter returned items & quantities',
            '💰 Return amount calculated automatically',
            '✅ Save - customer balance adjusted'
          ]
        },
        {
          id: 'reports',
          title: 'Viewing Reports',
          steps: [
            '📊 Go to "Reports" tab for insights',
            '📈 Daily sales summary',
            '💸 Revenue by product/customer',
            '📉 Outstanding balances',
            '📅 Date range filters available',
            '⬇️ Download as PDF/Excel'
          ]
        },
        {
          id: 'support',
          title: 'Support Tickets',
          steps: [
            '🎫 Go to "Support Tickets" from dropdown',
            '➕ "New Ticket" for help/issues',
            '💬 Support team responds in conversation thread',
            '🔔 Get updates as responses arrive',
            '✅ Close ticket when resolved'
          ]
        }
      ]
    },
    'account': {
      label: '🔐 Account & Security',
      topics: [
        {
          id: 'change-password',
          title: 'Change Your Password',
          steps: [
            '1️⃣ Go to Settings → Security tab',
            '2️⃣ Click "Change Password"',
            '3️⃣ Enter your current password (verification)',
            '4️⃣ Enter new password (6+ characters)',
            '5️⃣ Confirm new password',
            '✅ Click "Update Password"',
            '🔒 Your account is now more secure'
          ]
        },
        {
          id: 'forgot-password',
          title: 'Forgot Your Password?',
          steps: [
            '1️⃣ On login page, click "Forgot your password?"',
            '2️⃣ Enter your registered email',
            '3️⃣ Check your inbox for OTP (6 digits)',
            '4️⃣ Enter OTP on the form',
            '5️⃣ Enter your new password (twice)',
            '✅ Click "Reset Password"',
            '🔓 Login with your new password'
          ]
        },
        {
          id: 'sessions',
          title: 'Session Tips',
          steps: [
            '⏱️ Your session lasts 24 hours',
            '🔒 Always logout from shared devices',
            '🌐 Logout button in user dropdown menu',
            '📱 Mobile: Your session stays active for convenience',
            '🔐 Automatic logout on very long inactivity'
          ]
        }
      ]
    },
    'tips': {
      label: '💡 Pro Tips & Shortcuts',
      topics: [
        {
          id: 'invoice-tips',
          title: 'Invoice Pro Tips',
          steps: [
            '⌨️ Press Enter to quickly add next item',
            '🔢 GST calculated automatically (IGST/SGST)',
            '💯 Discounts: enter % or fixed amount',
            '📧 Email invoices directly from ShopOS',
            '🖨️ Print & save as PDF for records',
            '🔍 Search old invoices by customer/date',
            '📊 Invoice status: Unpaid/Partial/Paid'
          ]
        },
        {
          id: 'customer-tips',
          title: 'Customer Management Tips',
          steps: [
            '📊 Check "Opening Balance" for historical dues',
            '🎯 Set credit limits to avoid over-extending',
            '📱 Save phone/email for WhatsApp/Email features',
            '🔍 Use search to quickly find customers',
            '💰 View full payment history with one click',
            '📈 See customer\'s total purchases & balance'
          ]
        },
        {
          id: 'data-tips',
          title: 'Data & Backup Tips',
          steps: [
            '☁️ All your data is safe in the cloud',
            '🔄 Auto-backup: No manual backup needed',
            '📱 Access from any device, anytime',
            '🌐 Works online & offline (syncs when back)',
            '🔐 Encrypted data transmission',
            '✅ Regular updates without losing data'
          ]
        }
      ]
    },
    'faq': {
      label: '❓ FAQs',
      topics: [
        {
          id: 'common-q',
          title: 'Common Questions',
          steps: [
            'Q: Can I edit an old invoice?\nA: Yes! Find it, click Edit, make changes, Save.',
            'Q: What if I made a payment mistake?\nA: Delete the wrong payment & record the correct one.',
            'Q: Can I use ShopOS offline?\nA: Yes! Data syncs automatically when online.',
            'Q: How do I delete a customer?\nA: Customers can\'t be deleted (for audit trail), but mark as inactive.',
            'Q: Can I import old data?\nA: Contact support for data migration assistance.',
            'Q: Is my data secure?\nA: Yes! Bank-level security with encryption.'
          ]
        }
      ]
    }
  };

  const handleBackdropClick = (e) => {
    // Only close if clicking directly on backdrop, not on modal content
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <Portal>
      <div style={modalOverlayStyle} onClick={handleBackdropClick}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideIn { from { transform: translateX(-20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
        .help-step { animation: slideIn 0.4s ease-out; }
        .help-badge { animation: pulse 2s infinite; }
      `}</style>

      <div style={{
        background: '#fff',
        borderRadius: 12,
        width: '90%',
        maxWidth: 900,
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 100000
      }}>
        {/* Header */}
        <div style={{
          background: `linear-gradient(135deg, ${BL} 0%, #0F5A7B 100%)`,
          color: '#fff',
          padding: '20px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <BookOpen size={28} />
            <div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>ShopOS Help & Guide</div>
              <div style={{ fontSize: 12, opacity: 0.9 }}>Learn how to use every feature</div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.25)',
              border: 'none',
              color: '#fff',
              borderRadius: '50%',
              width: 44,
              height: 44,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              transition: 'all 0.2s',
              flexShrink: 0,
              zIndex: 100001
            }}
            onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.35)'}
            onMouseLeave={e => e.target.style.background = 'rgba(255,255,255,0.25)'}
            title="Close (ESC)"
          >
            <X size={22} />
          </button>
        </div>

        {/* Content */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Sidebar */}
          <div style={{
            width: 220,
            background: BG,
            borderRight: `1px solid ${BORD}`,
            overflowY: 'auto',
            padding: '12px 0'
          }}>
            {Object.entries(categories).map(([key, cat]) => (
              <button
                key={key}
                onClick={() => setActiveCategory(key)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: 'none',
                  background: activeCategory === key ? BLL : 'transparent',
                  color: activeCategory === key ? BL : MUT,
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: activeCategory === key ? 600 : 500,
                  borderLeft: activeCategory === key ? `3px solid ${BL}` : '3px solid transparent',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => {
                  if (activeCategory !== key) e.target.style.background = 'rgba(27,94,138,0.05)';
                }}
                onMouseLeave={e => {
                  if (activeCategory !== key) e.target.style.background = 'transparent';
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Main Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
            {categories[activeCategory].topics.map((topic, idx) => (
              <div key={topic.id} style={{ marginBottom: idx < categories[activeCategory].topics.length - 1 ? 20 : 0 }}>
                {/* Topic Header */}
                <button
                  onClick={() => setExpandedTopic(expandedTopic === topic.id ? null : topic.id)}
                  style={{
                    width: '100%',
                    background: expandedTopic === topic.id ? BLL : 'transparent',
                    border: `1px solid ${expandedTopic === topic.id ? BL : BORD}`,
                    borderRadius: 8,
                    padding: '14px 16px',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.2s',
                    marginBottom: expandedTopic === topic.id ? 12 : 0
                  }}
                  onMouseEnter={e => {
                    if (expandedTopic !== topic.id) {
                      e.target.style.background = 'rgba(27,94,138,0.05)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (expandedTopic !== topic.id) {
                      e.target.style.background = 'transparent';
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Lightbulb size={18} color={expandedTopic === topic.id ? BL : MUT} />
                    <span style={{ fontWeight: expandedTopic === topic.id ? 600 : 500, color: TXT }}>{topic.title}</span>
                  </div>
                  <ChevronDown
                    size={20}
                    color={BL}
                    style={{
                      transform: expandedTopic === topic.id ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.3s ease'
                    }}
                  />
                </button>

                {/* Topic Content */}
                {expandedTopic === topic.id && (
                  <div style={{
                    background: BLL,
                    border: `1px solid ${BL}`,
                    borderTop: 'none',
                    borderRadius: '0 0 8px 8px',
                    padding: '16px'
                  }}>
                    {topic.steps.map((step, stepIdx) => (
                      <div
                        key={stepIdx}
                        className="help-step"
                        style={{
                          marginBottom: stepIdx < topic.steps.length - 1 ? 12 : 0,
                          paddingBottom: stepIdx < topic.steps.length - 1 ? 12 : 0,
                          borderBottom: stepIdx < topic.steps.length - 1 ? `1px solid rgba(27,94,138,0.1)` : 'none'
                        }}
                      >
                        <div style={{
                          fontSize: 13,
                          lineHeight: 1.6,
                          color: TXT,
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word'
                        }}>
                          {step}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          background: BG,
          borderTop: `1px solid ${BORD}`,
          padding: '12px 24px',
          fontSize: 12,
          color: MUT,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>💡 <strong>Tip:</strong> Click on any topic to expand and learn more</div>
          <button
            onClick={onClose}
            style={{
              background: BL,
              color: '#fff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 12
            }}
          >
            Got It!
          </button>
        </div>
      </div>
    </div>
    </Portal>
  );
}

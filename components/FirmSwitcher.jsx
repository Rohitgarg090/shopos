'use client';
import React, { useState } from 'react';
import { ChevronDown, Building2, Plus } from 'lucide-react';

const BL = '#1B5E8A', BLL = '#E3EFF8', BORD = '#E3E1D9', MUT = '#888', TXT = '#1A1A18', BG = '#F5F4F0', GR = '#2E6B1F';

export default function FirmSwitcher({ firms, activeFirm, onSelectFirm, onCreateFirm, mobile = false }) {
  const [open, setOpen] = useState(false);

  if (!firms || firms.length === 0) {
    return null;
  }

  const current = firms.find(f => f.id === activeFirm?.id);

  const S_btn = {
    display: 'flex',
    alignItems: 'center',
    gap: mobile ? 0 : 8,
    padding: mobile ? '6px 8px' : '8px 12px',
    border: '0.5px solid ' + BORD,
    borderRadius: 8,
    background: '#fff',
    cursor: 'pointer',
    fontSize: mobile ? 11 : 13,
    fontWeight: 600,
    color: TXT,
    transition: 'all 0.2s',
    minWidth: mobile ? 32 : 'auto',
    minHeight: mobile ? 32 : 'auto',
    justifyContent: 'center',
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Main Button */}
      <button
        onClick={() => setOpen(!open)}
        style={S_btn}
        onMouseEnter={(e) => e.currentTarget.style.background = BG}
        onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
        title={current?.name || 'Select Firm'}
      >
        <Building2 size={mobile ? 14 : 16} />
        {!mobile && (
          <>
            <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {current?.name || 'Select Firm'}
            </span>
            <ChevronDown size={14} style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0)' }} />
          </>
        )}
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 4,
            background: '#fff',
            border: '0.5px solid ' + BORD,
            borderRadius: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
            zIndex: 100,
            maxHeight: 300,
            overflowY: 'auto',
            minWidth: 240,
          }}
        >
          {/* Current firm highlight */}
          <div style={{ borderBottom: '0.5px solid ' + BORD, padding: '8px 12px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: MUT, textTransform: 'uppercase', marginBottom: 4 }}>
              Current Firm
            </div>
            <button
              onClick={() => {
                setOpen(false);
              }}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: BLL,
                border: '0.5px solid ' + BL,
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                color: BL,
                cursor: 'default',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Building2 size={14} />
              {current?.name}
            </button>
          </div>

          {/* Other firms */}
          {firms.length > 1 && (
            <div style={{ padding: '8px 12px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: MUT, textTransform: 'uppercase', marginBottom: 4 }}>
                Switch To
              </div>
              {firms
                .filter(f => f.id !== activeFirm?.id)
                .map(firm => (
                  <button
                    key={firm.id}
                    onClick={() => {
                      onSelectFirm(firm);
                      setOpen(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: 6,
                      fontSize: 12,
                      color: TXT,
                      cursor: 'pointer',
                      textAlign: 'left',
                      marginBottom: 4,
                      transition: 'all 0.15s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = BG;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <Building2 size={14} />
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: 2 }}>{firm.name}</div>
                      <div style={{ fontSize: 10, color: MUT }}>
                        {firm.members?.length || 0} member{firm.members?.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </button>
                ))}
            </div>
          )}

          {/* Create new firm option */}
          <div style={{ borderTop: '0.5px solid ' + BORD, padding: '8px 12px' }}>
            <button
              onClick={() => {
                onCreateFirm?.();
                setOpen(false);
              }}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'transparent',
                border: '0.5px dashed ' + BL,
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                color: BL,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = BLL;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <Plus size={14} />
              Create New Firm
            </button>
          </div>
        </div>
      )}

      {/* Close when clicking outside */}
      {open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99,
          }}
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  );
}

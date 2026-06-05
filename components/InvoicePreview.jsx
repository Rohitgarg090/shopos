'use client';
import React from 'react';
import { X, Send, Download, Printer } from 'lucide-react';

const BL = '#1B5E8A', GR = '#2E6B1F', RD = '#9B2626', BORD = '#E3E1D9', MUT = '#888', TXT = '#1A1A18', BG = '#F5F4F0';
const fmt = n => 'Rs.' + Number(n || 0).toFixed(2);

export default function InvoicePreview({ invoice, mobile, onSendWhatsApp, onSendEmail, onPrint, onDownload, onClose }) {
  const S_card = {
    background: '#fff',
    border: '0.5px solid ' + BORD,
    borderRadius: 12,
    padding: mobile ? '16px' : '24px',
  };

  const S_btn = (variant = 'primary', small = false) => {
    const styles = {
      primary: { bg: BL, co: '#fff' },
      secondary: { bg: '#f0f0f0', co: TXT },
    };
    const s = styles[variant] || styles.primary;
    return {
      background: s.bg,
      color: s.co,
      border: 'none',
      padding: small ? '8px 12px' : '10px 16px',
      borderRadius: 8,
      cursor: 'pointer',
      fontSize: small ? 12 : 13,
      fontWeight: 600,
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      flex: 1,
      justifyContent: 'center',
    };
  };

  if (!invoice) return null;

  const isPaid = invoice.paidAmount >= invoice.total;
  const isPartial = invoice.paidAmount > 0 && invoice.paidAmount < invoice.total;
  const statusColor = isPaid ? GR : isPartial ? '#B8690A' : RD;
  const statusText = isPaid ? 'PAID' : isPartial ? 'PARTIAL' : 'UNPAID';

  return (
    <div style={{ ...S_card, maxHeight: mobile ? '90vh' : '80vh', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '0.5px solid ' + BORD, paddingBottom: 12 }}>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: mobile ? 16 : 20, fontWeight: 700, color: TXT }}>
            Invoice
          </h2>
          <div style={{ fontSize: 11, color: MUT }}>
            {invoice.invoiceNo || '#' + invoice.id.substring(0, 8).toUpperCase()}
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: MUT }}>
            ×
          </button>
        )}
      </div>

      {/* Customer & Status */}
      <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: MUT, textTransform: 'uppercase', marginBottom: 4 }}>
            Bill To
          </div>
          <div style={{ fontSize: mobile ? 13 : 15, fontWeight: 600, color: TXT, marginBottom: 2 }}>
            {invoice.customerName}
          </div>
          <div style={{ fontSize: 11, color: MUT }}>
            {invoice.customerPhone}
          </div>
          {invoice.customerAddr && (
            <div style={{ fontSize: 10, color: MUT, marginTop: 4, lineHeight: 1.4 }}>
              {invoice.customerAddr}
            </div>
          )}
        </div>

        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: MUT, textTransform: 'uppercase', marginBottom: 4 }}>
            Status
          </div>
          <div
            style={{
              display: 'inline-block',
              padding: '6px 12px',
              background: statusColor + '20',
              border: '0.5px solid ' + statusColor,
              borderRadius: 6,
              fontSize: mobile ? 11 : 12,
              fontWeight: 700,
              color: statusColor,
              marginBottom: 8,
            }}
          >
            {statusText}
          </div>

          <div style={{ fontSize: 11, color: MUT }}>
            Date: {new Date(invoice.date).toLocaleDateString('en-IN')}
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div style={{ marginBottom: 20, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: mobile ? 11 : 12 }}>
          <thead>
            <tr style={{ borderBottom: '0.5px solid ' + BORD }}>
              <th style={{ textAlign: 'left', padding: '8px 0', fontWeight: 600, color: MUT, fontSize: 10 }}>
                Item
              </th>
              <th style={{ textAlign: 'right', padding: '8px 0', fontWeight: 600, color: MUT, fontSize: 10 }}>
                Qty
              </th>
              <th style={{ textAlign: 'right', padding: '8px 0', fontWeight: 600, color: MUT, fontSize: 10 }}>
                Rate
              </th>
              <th style={{ textAlign: 'right', padding: '8px 0', fontWeight: 600, color: MUT, fontSize: 10 }}>
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {invoice.items?.map((item, idx) => (
              <tr key={idx} style={{ borderBottom: '0.5px solid ' + BORD }}>
                <td style={{ padding: '10px 0', color: TXT, fontWeight: 500 }}>
                  <div>{item.name}</div>
                  {item.size && <div style={{ fontSize: 9, color: MUT }}>{item.size}</div>}
                </td>
                <td style={{ textAlign: 'right', padding: '10px 0', color: TXT }}>
                  {item.qty}
                </td>
                <td style={{ textAlign: 'right', padding: '10px 0', color: TXT }}>
                  {fmt(item.rate)}
                </td>
                <td style={{ textAlign: 'right', padding: '10px 0', color: TXT, fontWeight: 600 }}>
                  {fmt(item.qty * item.rate)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div style={{ background: BG, padding: 12, borderRadius: 8, marginBottom: 20 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 8,
            fontSize: mobile ? 12 : 13,
            paddingBottom: 8,
            borderBottom: '0.5px solid ' + BORD,
          }}
        >
          <span style={{ color: MUT }}>Subtotal</span>
          <span style={{ fontWeight: 600, color: TXT }}>{fmt(invoice.subtotal || invoice.total)}</span>
        </div>

        {invoice.discount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: mobile ? 12 : 13, paddingBottom: 8, borderBottom: '0.5px solid ' + BORD }}>
            <span style={{ color: MUT }}>Discount</span>
            <span style={{ fontWeight: 600, color: RD }}>-{fmt(invoice.discount)}</span>
          </div>
        )}

        {invoice.gst > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: mobile ? 12 : 13, paddingBottom: 8, borderBottom: '0.5px solid ' + BORD }}>
            <span style={{ color: MUT }}>GST</span>
            <span style={{ fontWeight: 600, color: TXT }}>{fmt(invoice.gst)}</span>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: mobile ? 14 : 16, fontWeight: 700 }}>
          <span style={{ color: TXT }}>Total Amount</span>
          <span style={{ color: BL }}>{fmt(invoice.total)}</span>
        </div>
      </div>

      {/* Paid & Balance */}
      {invoice.paidAmount > 0 && (
        <div style={{ background: '#EBF5E4', border: '0.5px solid ' + GR, padding: 12, borderRadius: 8, marginBottom: 20, fontSize: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: MUT }}>
            <span>Amount Paid</span>
            <span style={{ fontWeight: 600, color: GR }}>{fmt(invoice.paidAmount)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: GR }}>
            <span>Outstanding</span>
            <span>{fmt(Math.max(0, invoice.total - invoice.paidAmount))}</span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 8, position: mobile ? 'sticky' : 'relative', bottom: 0, background: '#fff', paddingTop: 12, borderTop: '0.5px solid ' + BORD }}>
        {onSendWhatsApp && (
          <button onClick={onSendWhatsApp} style={S_btn('primary', true)}>
            💬 WhatsApp
          </button>
        )}
        {onSendEmail && (
          <button onClick={onSendEmail} style={S_btn('primary', true)}>
            📧 Email
          </button>
        )}
        {onPrint && (
          <button onClick={onPrint} style={S_btn('secondary', true)}>
            🖨️ Print
          </button>
        )}
        {onDownload && (
          <button onClick={onDownload} style={S_btn('secondary', true)}>
            ⬇️ PDF
          </button>
        )}
      </div>
    </div>
  );
}

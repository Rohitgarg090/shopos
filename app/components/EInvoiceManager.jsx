'use client';

import { useState, useEffect } from 'react';
import EInvoiceButton from './EInvoiceButton';

export default function EInvoiceManager({ billId, firmId, billNo, getToken }) {
  const [eInvoice, setEInvoice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [details, setDetails] = useState(null);
  const [cancelling, setCancelling] = useState(false);


  const fetchEInvoice = async () => {
    setLoading(true);
    try {
      const token = await getToken();

      const res = await fetch(`/api/einvoice?bill_id=${billId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-firm-id': firmId,
        },
      });

      const data = await res.json();
      if (data.eInvoices?.length > 0) {
        setEInvoice(data.eInvoices[0]);
      }
    } catch (err) {
      console.error('Error fetching e-invoice:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async () => {
    setLoading(true);
    try {
      const token = await getToken();

      const res = await fetch(`/api/einvoice/${eInvoice.id}/details`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-firm-id': firmId,
        },
      });

      const data = await res.json();
      setDetails(data);
      setShowDetails(true);
    } catch (err) {
      console.error('Error fetching details:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this e-Invoice? This action cannot be undone.')) {
      return;
    }

    setCancelling(true);
    setError('');

    try {
      const token = await getToken();

      const res = await fetch(`/api/einvoice/${eInvoice.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-firm-id': firmId,
        },
        body: JSON.stringify({
          reason: 'Cancelled per user request',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setEInvoice(data.eInvoice);
      setShowDetails(false);
    } catch (err) {
      console.error('Error cancelling e-invoice:', err);
      setError(err.message);
    } finally {
      setCancelling(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadSignedJSON = () => {
    if (details?.signedJSON) {
      const element = document.createElement('a');
      element.setAttribute('href', 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(details.signedJSON, null, 2)));
      element.setAttribute('download', `einvoice-${eInvoice.irn}.json`);
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }
  };

  useEffect(() => {
    if (billId && firmId) {
      fetchEInvoice();
    }
  }, [billId, firmId]);

  if (!eInvoice) {
    return <EInvoiceButton billId={billId} firmId={firmId} billNo={billNo} onGenerated={setEInvoice} getToken={getToken} />;
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          ❌ {error}
        </div>
      )}

      {/* e-Invoice Status Card */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-gray-600 font-semibold">e-Invoice Status</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                eInvoice.status === 'cancelled'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-green-100 text-green-800'
              }`}>
                {eInvoice.status === 'cancelled' ? '❌ Cancelled' : '✅ Generated'}
              </span>
              <span className="text-sm text-gray-900 font-mono">{eInvoice.irn}</span>
            </div>
          </div>
          <div className="text-right text-xs text-gray-600">
            Generated: {new Date(eInvoice.generated_at).toLocaleDateString('en-IN')}
          </div>
        </div>

        {/* Action Buttons */}
        {eInvoice.status !== 'cancelled' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
            <button
              onClick={handleViewDetails}
              disabled={loading}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-semibold text-xs transition-all"
            >
              📋 View Details
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-xs transition-all"
            >
              🖨️ Print
            </button>
            <button
              onClick={() => {
                const link = document.createElement('a');
                link.href = eInvoice.qr_code_url;
                link.download = `qr-${billNo}.png`;
                link.click();
              }}
              className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold text-xs transition-all"
            >
              📥 QR Code
            </button>
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="px-3 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg font-semibold text-xs transition-all"
            >
              {cancelling ? '⏳ Cancelling...' : '❌ Cancel'}
            </button>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {showDetails && details && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-blue-600 text-white p-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">e-Invoice Details</h2>
                <p className="text-blue-100 text-sm mt-1">IRN: {details.eInvoice.irn}</p>
              </div>
              <button
                onClick={() => setShowDetails(false)}
                className="text-2xl font-bold hover:text-blue-200"
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* QR Code */}
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-900 mb-3">QR Code</p>
                <img
                  src={details.eInvoice.qr_code_url}
                  alt="e-Invoice QR Code"
                  className="w-40 h-40 mx-auto border-2 border-gray-300 rounded-lg p-2"
                />
              </div>

              {/* Invoice Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-600 font-semibold">Invoice Number</p>
                  <p className="text-sm text-gray-900 font-mono mt-1">{details.bill.invoice_no}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-semibold">Invoice Date</p>
                  <p className="text-sm text-gray-900 mt-1">
                    {new Date(details.bill.created_at).toLocaleDateString('en-IN')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-semibold">IRN</p>
                  <p className="text-sm text-gray-900 font-mono mt-1">{details.eInvoice.irn}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-semibold">ACK Number</p>
                  <p className="text-sm text-gray-900 font-mono mt-1">{details.eInvoice.ack_no || '—'}</p>
                </div>
              </div>

              {/* Buyer Info */}
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-3">Buyer Details</p>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
                  <p><span className="text-gray-600">Name:</span> <span className="text-gray-900">{details.customer.name}</span></p>
                  <p><span className="text-gray-600">GSTIN:</span> <span className="text-gray-900 font-mono">{details.customer.gst || '—'}</span></p>
                  {details.customer.email && <p><span className="text-gray-600">Email:</span> <span className="text-gray-900">{details.customer.email}</span></p>}
                  {details.customer.mobile && <p><span className="text-gray-600">Mobile:</span> <span className="text-gray-900">{details.customer.mobile}</span></p>}
                </div>
              </div>

              {/* Signed JSON Info */}
              {details.signedJSON && (
                <div>
                  <p className="text-sm font-semibold text-gray-900 mb-3">Signed JSON</p>
                  <div className="bg-gray-50 p-4 rounded-lg max-h-40 overflow-y-auto">
                    <pre className="text-xs text-gray-700 font-mono whitespace-pre-wrap break-words">
                      {JSON.stringify(details.signedJSON, null, 2).substring(0, 500)}...
                    </pre>
                  </div>
                  <button
                    onClick={handleDownloadSignedJSON}
                    className="mt-2 w-full px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold text-xs transition-all"
                  >
                    📥 Download Signed JSON
                  </button>
                </div>
              )}

              {/* Timeline */}
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-3">Timeline</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Generated:</span>
                    <span className="text-gray-900">{new Date(details.eInvoice.generated_at).toLocaleString('en-IN')}</span>
                  </div>
                  {details.eInvoice.acknowledged_at && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Acknowledged:</span>
                      <span className="text-gray-900">{new Date(details.eInvoice.acknowledged_at).toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {details.eInvoice.cancelled_at && (
                    <div className="flex justify-between text-red-600">
                      <span>Cancelled:</span>
                      <span>{new Date(details.eInvoice.cancelled_at).toLocaleString('en-IN')}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="bg-gray-50 p-6 border-t flex gap-2">
              <button
                onClick={handleDownloadSignedJSON}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-all"
              >
                📥 Download JSON
              </button>
              <button
                onClick={() => setShowDetails(false)}
                className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-900 rounded-lg font-semibold text-sm transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          body > * {
            display: none;
          }
          [data-print] {
            display: block;
          }
        }
      `}</style>
    </div>
  );
}

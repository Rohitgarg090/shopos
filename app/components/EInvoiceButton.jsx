'use client';

import { useState } from 'react';

export default function EInvoiceButton({ billId, firmId, billNo, onGenerated, getToken }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [eInvoice, setEInvoice] = useState(null);


  const handleGenerateEInvoice = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Get the authentication token
      const token = await getToken();

      if (!token) {
        throw new Error('Authentication required. Please login again.');
      }

      console.log('[EInvoiceButton] Calling generate with token and firmId:', { billId, firmId, tokenExists: !!token });

      const res = await fetch('/api/einvoice/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-firm-id': firmId,
        },
        body: JSON.stringify({
          billId,
        }),
      });

      const data = await res.json();

      console.log('[EInvoiceButton] API Response:', { ok: res.ok, status: res.status, data });

      if (!res.ok) {
        let errorMsg = data.error || 'Failed to generate e-Invoice';
        if (data.details && Array.isArray(data.details)) {
          errorMsg = data.details.join('\n');
        }
        throw new Error(errorMsg);
      }

      setEInvoice(data.eInvoice);
      setSuccess(`e-Invoice generated! IRN: ${data.eInvoice.irn}`);

      if (onGenerated) onGenerated(data.eInvoice);
    } catch (err) {
      console.error('Error generating e-Invoice:', err);
      setError(err.message || 'Error generating e-Invoice');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadQR = () => {
    if (eInvoice?.qr_code_url) {
      const link = document.createElement('a');
      link.href = eInvoice.qr_code_url;
      link.download = `einvoice-qr-${billNo}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="space-y-3">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          ❌ {error}
        </div>
      )}

      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          ✅ {success}
        </div>
      )}

      {!eInvoice ? (
        <button
          onClick={handleGenerateEInvoice}
          disabled={loading}
          className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-semibold text-sm transition-all shadow-md"
        >
          {loading ? '⏳ Generating e-Invoice...' : '📄 Generate e-Invoice'}
        </button>
      ) : (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 space-y-3">
          <div>
            <p className="text-xs text-gray-600 font-semibold">e-Invoice Status</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-block px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold">
                ✅ Generated
              </span>
              <span className="text-sm text-gray-900 font-mono">{eInvoice.irn}</span>
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-600 font-semibold mb-2">IRN Details</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-gray-600">IRN</p>
                <p className="font-mono text-gray-900 break-all">{eInvoice.irn}</p>
              </div>
              <div>
                <p className="text-gray-600">Ack No</p>
                <p className="font-mono text-gray-900">{eInvoice.ack_no || '—'}</p>
              </div>
            </div>
          </div>

          {eInvoice.qr_code_url && (
            <div>
              <p className="text-xs text-gray-600 font-semibold mb-2">QR Code</p>
              <div className="bg-white p-3 rounded border border-gray-300">
                <img
                  src={eInvoice.qr_code_url}
                  alt="e-Invoice QR Code"
                  className="w-24 h-24 mx-auto"
                />
              </div>
              <button
                onClick={handleDownloadQR}
                className="w-full mt-2 px-3 py-2 bg-white border border-blue-600 text-blue-600 rounded-lg font-semibold text-xs transition-all hover:bg-blue-50"
              >
                ⬇️ Download QR Code
              </button>
            </div>
          )}

          <div className="text-xs text-gray-600 bg-white p-2 rounded border border-gray-200">
            Generated: {new Date(eInvoice.generated_at).toLocaleString('en-IN')}
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';

// The portal returns the signed QR as text; draw it as an image
export function useQrImage(code) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    if (!code) { setSrc(''); return; }
    if (/^(data:|https?:)/.test(code)) { setSrc(code); return; }
    let live = true;
    import('qrcode').then(m => m.default.toDataURL(code, { margin: 1, width: 300, errorCorrectionLevel: 'L' })).then(u => live && setSrc(u)).catch(() => {});
    return () => { live = false; };
  }, [code]);
  return src;
}

export default function EInvoiceButton({ billId, firmId, billNo, onGenerated, getToken }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [eInvoice, setEInvoice] = useState(null);
  const [problems, setProblems] = useState(null);   // missing details reported by the server
  const [fix, setFix] = useState({});
  const qrSrc = useQrImage(eInvoice?.qr_code_url);


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

      const fixes = {};
      Object.entries(fix).forEach(([k, v]) => {
        if (k.startsWith('item.hsn:')) { fixes['item.hsn'] = { ...(fixes['item.hsn'] || {}), [k.slice(9)]: v }; }
        else if (String(v).trim()) fixes[k] = String(v).trim();
      });
      const res = await fetch('/api/einvoice/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'x-firm-id': firmId },
        body: JSON.stringify({ billId, fixes }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 422 && Array.isArray(data.problems)) {
        setProblems(data.problems);
        setFix(f => { const n = { ...f }; data.problems.forEach(p => { if (p.fix) { const k = p.fix.key === 'item.hsn' ? 'item.hsn:' + p.fix.id : p.fix.key; if (n[k] === undefined) n[k] = p.fix.value || ''; } }); return n; });
        return;
      }
      if (!res.ok) throw new Error(data.error || 'Failed to generate e-Invoice');
      setProblems(null); setFix({});
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
    if (qrSrc) {
      const link = document.createElement('a');
      link.href = qrSrc;
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

      {problems && !eInvoice && (
        <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-sm text-amber-900 space-y-2">
          <p className="font-semibold">A few details are needed before the e-Invoice can be filed:</p>
          {problems.filter(p => !p.fix).length > 0 && (
            <ul className="list-disc pl-5 space-y-0.5">{problems.filter(p => !p.fix).map((p, i) => <li key={i}>{p.msg}</li>)}</ul>
          )}
          {problems.filter(p => p.fix).map(p => {
            const k = p.fix.key === 'item.hsn' ? 'item.hsn:' + p.fix.id : p.fix.key;
            const numeric = /pincode|hsn/.test(k);
            return (
              <label key={k} className="block">
                <span className="block text-xs text-amber-800 mb-1">{p.msg}</span>
                <input value={fix[k] ?? ''} placeholder={p.fix.label}
                  onChange={e => { const v = numeric ? e.target.value.replace(/\D/g, '').slice(0, k.includes('hsn') ? 8 : 6) : k === 'customer.gst' ? e.target.value.toUpperCase().slice(0, 15) : e.target.value; setFix(f => ({ ...f, [k]: v })); }}
                  className="w-full px-3 py-2 border border-amber-300 rounded-md bg-white text-gray-900 text-sm" />
              </label>
            );
          })}
          <p className="text-xs text-amber-800">What you enter here is saved to the customer / invoice.</p>
        </div>
      )}

      {!eInvoice ? (
        <button
          onClick={handleGenerateEInvoice}
          disabled={loading}
          className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-semibold text-sm transition-all shadow-md"
        >
          {loading ? '⏳ Generating e-Invoice...' : problems ? 'Save details & generate e-Invoice' : '📄 Generate e-Invoice'}
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
                  src={qrSrc}
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

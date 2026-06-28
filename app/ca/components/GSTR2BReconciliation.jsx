'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

export default function GSTR2BReconciliation({ firmId }) {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [credentials, setCredentials] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [step, setStep] = useState('credentials'); // credentials, fetch, results
  const [reconciliationData, setReconciliationData] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [exporting, setExporting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ status: '', notes: '' });
  const [updating, setUpdating] = useState(false);

  const [formData, setFormData] = useState({
    gst_portal_username: '',
    gst_portal_password: '',
  });

  const getSupabaseClient = () => {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
  };

  // Fetch existing credentials
  useEffect(() => {
    const fetchCredentials = async () => {
      try {
        const supabase = getSupabaseClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const res = await fetch(`/api/ca/firm-settings?firm_id=${firmId}`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setCredentials(data);
          if (data.gst_portal_username && data.gst_portal_password) {
            setStep('fetch');
          } else {
            setStep('credentials');
          }
        }
      } catch (err) {
        console.error('Error fetching credentials:', err);
      }
    };
    if (firmId) fetchCredentials();
  }, [firmId]);

  const handleAddCredentials = async () => {
    if (!formData.gst_portal_username || !formData.gst_portal_password) {
      setError('Both username and password are required');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      const res = await fetch('/api/ca/firm-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          firmId,
          gst_portal_username: formData.gst_portal_username,
          gst_portal_password: formData.gst_portal_password,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save credentials');

      setCredentials(data);
      setFormData({ gst_portal_username: '', gst_portal_password: '' });
      setStep('fetch');
      setSuccess('GST credentials saved successfully');
    } catch (err) {
      console.error('Error saving credentials:', err);
      setError(err.message || 'Error saving credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleFetchGSTR2B = async () => {
    setLoading(true);
    setError('');
    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      const res = await fetch('/api/ca/gstr2b/fetch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ firmId, monthYear: month }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.needsCredentials) {
          setStep('credentials');
        }
        throw new Error(data.error || 'Failed to fetch GSTR-2B data');
      }

      setSuccess(`${data.message}`);
      setStep('reconcile');
    } catch (err) {
      console.error('Error fetching GSTR-2B:', err);
      setError(err.message || 'Error fetching GSTR-2B data');
    } finally {
      setLoading(false);
    }
  };

  const handleReconcile = async () => {
    setLoading(true);
    setError('');
    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      const res = await fetch('/api/ca/gstr2b/reconcile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ firmId, monthYear: month }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reconcile');

      setSuccess(`Reconciliation complete: ${data.summary.matched} matched, ${data.summary.mismatch} mismatches`);
      await fetchResults();
      setStep('results');
    } catch (err) {
      console.error('Error reconciling:', err);
      setError(err.message || 'Error reconciling data');
    } finally {
      setLoading(false);
    }
  };

  const fetchResults = async () => {
    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      const res = await fetch(`/api/ca/gstr2b/results?firm_id=${firmId}&month_year=${month}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setReconciliationData(data);
      }
    } catch (err) {
      console.error('Error fetching results:', err);
    }
  };

  const handleEditRecord = (record) => {
    setEditingId(record.id);
    setEditForm({
      status: record.status,
      notes: record.notes || '',
    });
  };

  const handleSaveRecord = async () => {
    if (!editingId) return;
    setUpdating(true);
    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      const res = await fetch(`/api/ca/gstr2b/${editingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(editForm),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update');

      // Update the record in the list
      setReconciliationData(prev => ({
        ...prev,
        records: prev.records.map(r => r.id === editingId ? data : r),
      }));

      setEditingId(null);
      setSuccess('Record updated successfully');
    } catch (err) {
      console.error('Error updating record:', err);
      setError(err.message || 'Error updating record');
    } finally {
      setUpdating(false);
    }
  };

  const handleExport = async (format) => {
    setExporting(true);
    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      const res = await fetch('/api/ca/gstr2b/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ firmId, monthYear: month, format }),
      });

      if (!res.ok) throw new Error('Failed to export');

      const blob = await res.blob();
      const filename = format === 'excel'
        ? `GSTR-2B-Reconciliation-${month}.csv`
        : `GSTR-2B-Reconciliation-${month}.html`;

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setSuccess(`${format.toUpperCase()} exported successfully!`);
    } catch (err) {
      console.error('Error exporting:', err);
      setError(err.message || `Error exporting ${format}`);
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    if (step === 'results') fetchResults();
  }, [step, month, firmId]);

  const filteredRecords = reconciliationData?.records?.filter(r =>
    filterStatus === 'all' || r.status === filterStatus
  ) || [];

  const getStatusColor = (status) => {
    switch (status) {
      case 'matched': return 'bg-green-100 text-green-800 border-green-300';
      case 'mismatch': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'not_in_gstr2b': return 'bg-red-100 text-red-800 border-red-300';
      case 'extra_in_gstr2b': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'ignored': return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'under_review': return 'bg-purple-100 text-purple-800 border-purple-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'matched': return '✅ Matched';
      case 'mismatch': return '⚠️ Mismatch';
      case 'not_in_gstr2b': return '❌ Not in GSTR-2B';
      case 'extra_in_gstr2b': return '➕ Extra in GSTR-2B';
      case 'ignored': return '🚫 Ignored';
      case 'under_review': return '⏳ Under Review';
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">GSTR-2B Reconciliation</h2>
        <input
          type="month"
          value={month}
          onChange={e => setMonth(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-blue-500"
        />
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          {success}
        </div>
      )}

      {/* Step 1: Add Credentials */}
      {step === 'credentials' && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Add GST Portal Credentials</h3>
          <p className="text-gray-600 text-sm mb-4">
            Enter your GST portal login credentials to fetch GSTR-2B reconciliation data.
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">GST Portal Username</label>
              <input
                type="text"
                placeholder="Your GST portal username/email"
                value={formData.gst_portal_username}
                onChange={e => setFormData(f => ({ ...f, gst_portal_username: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">GST Portal Password</label>
              <input
                type="password"
                placeholder="Your GST portal password"
                value={formData.gst_portal_password}
                onChange={e => setFormData(f => ({ ...f, gst_portal_password: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <button
              onClick={handleAddCredentials}
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-semibold text-sm transition-all"
            >
              {loading ? 'Saving...' : 'Save Credentials'}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Fetch GSTR-2B Data */}
      {step === 'fetch' && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-2">Fetch GSTR-2B Data</h3>
          <p className="text-gray-600 text-sm mb-4">
            Fetch GSTR-2B data from GST portal for {month}.
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleFetchGSTR2B}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-semibold text-sm transition-all"
            >
              {loading ? 'Fetching...' : '📥 Fetch GSTR-2B Data'}
            </button>
            <button
              onClick={() => setStep('credentials')}
              className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-semibold text-sm transition-all"
            >
              Change Credentials
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Reconcile */}
      {step === 'reconcile' && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-2">Run Reconciliation</h3>
          <p className="text-gray-600 text-sm mb-4">
            Compare your purchase invoices with GSTR-2B data to identify discrepancies.
          </p>
          <button
            onClick={handleReconcile}
            disabled={loading}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-semibold text-sm transition-all"
          >
            {loading ? 'Reconciling...' : '⚙️ Run Reconciliation'}
          </button>
        </div>
      )}

      {/* Step 4: Results */}
      {step === 'results' && reconciliationData && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-2xl p-4 shadow-sm">
              <p className="text-gray-700 text-xs font-semibold">Total</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{reconciliationData.summary.total}</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-2xl p-4 shadow-sm">
              <p className="text-gray-700 text-xs font-semibold">Matched ✅</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{reconciliationData.summary.matched}</p>
            </div>
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-200 rounded-2xl p-4 shadow-sm">
              <p className="text-gray-700 text-xs font-semibold">Mismatch ⚠️</p>
              <p className="text-3xl font-bold text-yellow-600 mt-2">{reconciliationData.summary.mismatch}</p>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-200 rounded-2xl p-4 shadow-sm">
              <p className="text-gray-700 text-xs font-semibold">Not in GSTR-2B ❌</p>
              <p className="text-3xl font-bold text-red-600 mt-2">{reconciliationData.summary.notInGstr2b}</p>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-200 rounded-2xl p-4 shadow-sm">
              <p className="text-gray-700 text-xs font-semibold">Extra ➕</p>
              <p className="text-3xl font-bold text-orange-600 mt-2">{reconciliationData.summary.extra}</p>
            </div>
          </div>

          {/* Export Section */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <label className="text-sm font-bold text-gray-900">Filter by Status:</label>
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="ml-3 px-4 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="all">All Records</option>
                  <option value="matched">Matched ✅</option>
                  <option value="mismatch">Mismatch ⚠️</option>
                  <option value="not_in_gstr2b">Not in GSTR-2B ❌</option>
                  <option value="extra_in_gstr2b">Extra ➕</option>
                </select>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => handleExport('excel')}
                  disabled={exporting}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-semibold text-sm transition-all"
                >
                  {exporting ? '⏳ Exporting...' : '📊 Export to Excel'}
                </button>
                <button
                  onClick={() => handleExport('pdf')}
                  disabled={exporting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg font-semibold text-sm transition-all"
                >
                  {exporting ? '⏳ Exporting...' : '📄 Export to PDF'}
                </button>
              </div>
            </div>
          </div>

          {/* Results Table */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left font-bold text-gray-900">Status</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-900">Invoice #</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-900">Your Amount</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-900">GSTR-2B Amount</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-900">Diff</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-900">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-8 text-center text-gray-600">
                        No records found
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map(record => (
                      editingId === record.id ? (
                        <tr key={record.id} className="bg-blue-50 border-2 border-blue-200">
                          <td colSpan="6" className="px-4 py-4">
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-xs font-bold text-gray-900 mb-1">Status</label>
                                  <select
                                    value={editForm.status}
                                    onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                                  >
                                    <option value="matched">Matched ✅</option>
                                    <option value="mismatch">Mismatch ⚠️</option>
                                    <option value="not_in_gstr2b">Not in GSTR-2B ❌</option>
                                    <option value="extra_in_gstr2b">Extra ➕</option>
                                    <option value="ignored">Ignored 🚫</option>
                                    <option value="under_review">Under Review ⏳</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-gray-900 mb-1">Invoice Details</label>
                                  <div className="text-sm text-gray-900 font-semibold px-3 py-2 bg-white border border-gray-300 rounded-lg">
                                    {record.purchase_invoice_number || record.gstr2b_invoice_id}
                                  </div>
                                </div>
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-gray-900 mb-1">Notes</label>
                                <textarea
                                  value={editForm.notes}
                                  onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                                  placeholder="Add notes about this record..."
                                  rows="3"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                                />
                              </div>
                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={handleSaveRecord}
                                  disabled={updating}
                                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-semibold text-sm transition-all"
                                >
                                  {updating ? '💾 Saving...' : '💾 Save'}
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  disabled={updating}
                                  className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-900 rounded-lg font-semibold text-sm transition-all"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        <tr key={record.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleEditRecord(record)}>
                          <td className="px-4 py-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(record.status)}`}>
                              {getStatusLabel(record.status)}
                            </span>
                            {record.manually_matched && <span className="text-xs text-blue-600 ml-1">✏️ Manual</span>}
                          </td>
                          <td className="px-4 py-3 font-semibold text-gray-900">
                            {record.purchase_invoice_number || record.gstr2b_invoice_id}
                          </td>
                          <td className="px-4 py-3 text-gray-900">
                            ₹{(record.purchase_amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-gray-900">
                            ₹{(record.gstr2b_amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-gray-900">
                            {record.amount_diff ? `₹${record.amount_diff.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '—'}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600">
                            <div className="max-w-xs truncate">{record.notes || '—'}</div>
                            <span className="text-gray-500 text-xs mt-1">Click to edit</span>
                          </td>
                        </tr>
                      )
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

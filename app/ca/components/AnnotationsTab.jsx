'use client';

import { useEffect, useState } from 'react';

const TAGS = [
  { value: 'general', label: 'General', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { value: 'compliance_issue', label: 'Compliance Issue', color: 'bg-red-100 text-red-800 border-red-200' },
  { value: 'itc_ineligible', label: 'ITC Ineligible', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  { value: 'missing_gstin', label: 'Missing GSTIN', color: 'bg-rose-100 text-rose-800 border-rose-200' },
  { value: 'pending_review', label: 'Pending Review', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  { value: 'approved', label: 'Approved', color: 'bg-green-100 text-green-800 border-green-200' },
];

const STATUSES = [
  { value: 'open', label: 'Open', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { value: 'resolved', label: 'Resolved', color: 'bg-green-100 text-green-800 border-green-200' },
];

export default function AnnotationsTab({ firmId, selectedClients }) {
  const [annotations, setAnnotations] = useState([]);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [billsLoading, setBillsLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('open');
  const [showForm, setShowForm] = useState(false);
  const [selectedBillId, setSelectedBillId] = useState(null);
  const [formData, setFormData] = useState({ annotation: '', tag: 'general' });
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});

  const fetchAnnotations = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      const res = await fetch(`/api/ca/annotations?firm_id=${firmId}&status=${filterStatus}`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setAnnotations(data);
    } catch (err) {
      console.error('Error fetching annotations:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBills = async () => {
    setBillsLoading(true);
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      const res = await fetch(`/api/ca/bills?firm_id=${firmId}`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch bills');
      const data = await res.json();
      setBills(data);
    } catch (err) {
      console.error('Error fetching bills:', err);
    } finally {
      setBillsLoading(false);
    }
  };

  useEffect(() => {
    if (firmId) {
      fetchAnnotations();
      fetchBills();
    }
  }, [firmId, filterStatus]);

  const handleAddAnnotation = async () => {
    if (!formData.annotation || !selectedBillId) return;
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      const res = await fetch('/api/ca/annotations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          firmId,
          billId: selectedBillId,
          annotation: formData.annotation,
          tag: formData.tag,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to add annotation');
      }

      setFormData({ annotation: '', tag: 'general' });
      setSelectedBillId(null);
      setShowForm(false);
      fetchAnnotations();
    } catch (err) {
      console.error('Error adding annotation:', err);
      alert('Error: ' + err.message);
    }
  };

  const handleUpdateAnnotation = async (id, updatePayload = null) => {
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      const payload = updatePayload || editData;

      const res = await fetch(`/api/ca/annotations/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to update');
      setEditingId(null);
      setEditData({});
      fetchAnnotations();
    } catch (err) {
      console.error('Error updating annotation:', err);
      alert('Error: ' + err.message);
    }
  };

  const handleDeleteAnnotation = async (id) => {
    if (!window.confirm('Delete this annotation?')) return;
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      const res = await fetch(`/api/ca/annotations/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session?.access_token}` },
      });
      if (!res.ok) throw new Error('Failed to delete');
      fetchAnnotations();
    } catch (err) {
      console.error('Error deleting annotation:', err);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Annotations</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-all shadow-md hover:shadow-lg"
        >
          + Add Note
        </button>
      </div>

      {/* Status Filter */}
      <div className="flex gap-3 mb-6">
        {['all', 'open', 'resolved'].map(status => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
              filterStatus === status
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
            }`}
          >
            {status === 'all' ? 'All' : status === 'open' ? 'Open' : 'Resolved'}
          </button>
        ))}
      </div>

      {/* Add Annotation Form */}
      {showForm && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 mb-6 shadow-sm">
          <div className="mb-4">
            <label className="block text-sm font-bold text-gray-900 mb-2">Select Bill</label>
            {billsLoading ? (
              <div className="text-sm text-gray-600">Loading bills...</div>
            ) : bills.length === 0 ? (
              <div className="text-sm text-gray-600">No bills found</div>
            ) : (
              <select
                value={selectedBillId || ''}
                onChange={e => setSelectedBillId(e.target.value ? e.target.value : null)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              >
                <option value="">-- Select a bill --</option>
                {bills.map(bill => (
                  <option key={bill.id} value={bill.id}>
                    {bill.invoice_no} - {bill.customer_name} - Rs.{bill.total}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-bold text-gray-900 mb-2">Note</label>
            <textarea
              placeholder="Enter your annotation..."
              value={formData.annotation}
              onChange={e => setFormData(f => ({ ...f, annotation: e.target.value }))}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-900 mb-2">Tag</label>
            <select
              value={formData.tag}
              onChange={e => setFormData(f => ({ ...f, tag: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
            >
              {TAGS.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleAddAnnotation}
              className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-sm transition-all shadow-md"
            >
              Save
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-semibold text-sm transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Annotations List */}
      <div className="space-y-3">
        {loading ? (
          <p className="text-center text-gray-500 py-8">Loading...</p>
        ) : annotations.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No annotations yet</p>
        ) : (
          annotations.map(ann => (
            <div key={ann.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="flex gap-2 flex-wrap">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${TAGS.find(t => t.value === ann.tag)?.color}`}>
                    {TAGS.find(t => t.value === ann.tag)?.label}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${STATUSES.find(s => s.value === ann.status)?.color}`}>
                    {STATUSES.find(s => s.value === ann.status)?.label}
                  </span>
                </div>
                <span className="text-xs text-gray-500">Bill #{ann.bill_id}</span>
              </div>

              {editingId === ann.id ? (
                <div>
                  <textarea
                    value={editData.annotation || ann.annotation}
                    onChange={e => setEditData(ed => ({ ...ed, annotation: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-blue-500 mb-3 transition-all"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdateAnnotation(ann.id)}
                      className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition-all"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="flex-1 px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg text-xs font-bold transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-gray-900 text-sm mb-3">{ann.annotation}</p>
                  <div className="text-xs text-gray-400 mb-3">
                    {new Date(ann.created_at).toLocaleDateString('en-IN')}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingId(ann.id);
                        setEditData({ annotation: ann.annotation });
                      }}
                      className="flex-1 px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-lg text-xs font-bold transition-all"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        const newStatus = ann.status === 'open' ? 'resolved' : 'open';
                        handleUpdateAnnotation(ann.id, { status: newStatus });
                      }}
                      className="flex-1 px-3 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg text-xs font-bold transition-all"
                    >
                      {ann.status === 'open' ? 'Resolve' : 'Reopen'}
                    </button>
                    <button
                      onClick={() => handleDeleteAnnotation(ann.id)}
                      className="flex-1 px-3 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg text-xs font-bold transition-all"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const supabaseClient = (() => {
  if (typeof window !== 'undefined') {
    const { createClient } = require('@supabase/supabase-js');
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
  }
  return null;
})();

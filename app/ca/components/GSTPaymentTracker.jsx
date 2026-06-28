'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

export default function GSTPaymentTracker({ firmId, onPaymentChange }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    monthYear: '',
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'bank_transfer',
    referenceNumber: '',
    notes: '',
  });

  const getSupabaseClient = () => {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
  };

  const fetchPayments = async () => {
    setLoading(true);
    setError('');
    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('No active session. Please log in again.');
        setLoading(false);
        return;
      }
      const res = await fetch(`/api/ca/gst-payments?firm_id=${firmId}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to fetch payments');
      }
      const data = await res.json();
      setPayments(data);
    } catch (err) {
      console.error('Error fetching payments:', err);
      setError(err.message || 'Error loading payments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (firmId) fetchPayments();
  }, [firmId]);

  const handleAddPayment = async () => {
    if (!formData.monthYear || !formData.amount) return;
    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('No active session. Please log in again.');
        return;
      }
      const res = await fetch('/api/ca/gst-payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          firmId,
          ...formData,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add payment');

      setFormData({
        monthYear: '',
        amount: '',
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'bank_transfer',
        referenceNumber: '',
        notes: '',
      });
      setShowForm(false);
      setError('');
      await fetchPayments();
      if (onPaymentChange) onPaymentChange();
    } catch (err) {
      console.error('Error adding payment:', err);
      setError(err.message || 'Error adding payment');
    }
  };

  const handleDeletePayment = async (id) => {
    if (!window.confirm('Delete this payment record?')) return;
    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('No active session. Please log in again.');
        return;
      }
      const res = await fetch(`/api/ca/gst-payments/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete');
      }
      setError('');
      await fetchPayments();
      if (onPaymentChange) onPaymentChange();
    } catch (err) {
      console.error('Error deleting payment:', err);
      setError(err.message || 'Error deleting payment');
    }
  };

  const totalPaid = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm mb-8">
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900">GST Payment Tracking</h3>
          <p className="text-sm text-gray-600 mt-1">Total Paid (All Time): ₹{totalPaid.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-all shadow-md"
        >
          + Record Payment
        </button>
      </div>

      {/* Add Payment Form */}
      {showForm && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 mb-6">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Month</label>
              <input
                type="month"
                value={formData.monthYear}
                onChange={e => setFormData(f => ({ ...f, monthYear: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Amount (₹)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.amount}
                onChange={e => setFormData(f => ({ ...f, amount: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Payment Date</label>
              <input
                type="date"
                value={formData.paymentDate}
                onChange={e => setFormData(f => ({ ...f, paymentDate: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Method</label>
              <select
                value={formData.paymentMethod}
                onChange={e => setFormData(f => ({ ...f, paymentMethod: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              >
                <option value="bank_transfer">Bank Transfer</option>
                <option value="neft">NEFT</option>
                <option value="rtgs">RTGS</option>
                <option value="imps">IMPS</option>
                <option value="cheque">Cheque</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-bold text-gray-900 mb-2">Reference Number</label>
            <input
              type="text"
              placeholder="Bank ref, Cheque number, etc."
              value={formData.referenceNumber}
              onChange={e => setFormData(f => ({ ...f, referenceNumber: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-900 mb-2">Notes</label>
            <textarea
              placeholder="Optional notes..."
              value={formData.notes}
              onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              rows={2}
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleAddPayment}
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-sm transition-all"
            >
              Save Payment
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-semibold text-sm transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Payment History */}
      <div className="space-y-3">
        {loading ? (
          <p className="text-gray-600 text-center py-8 text-sm">Loading payments...</p>
        ) : payments.length === 0 ? (
          <p className="text-gray-600 text-center py-8 text-sm">No payments recorded yet</p>
        ) : (
          payments.map(payment => (
            <div key={payment.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-bold text-gray-900">
                    ₹{parseFloat(payment.amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {payment.month_year} • {new Date(payment.payment_date).toLocaleDateString('en-IN')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-gray-700 bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    {payment.payment_method.replace('_', ' ').toUpperCase()}
                  </p>
                  {payment.reference_number && (
                    <p className="text-xs text-gray-600 mt-1">Ref: {payment.reference_number}</p>
                  )}
                </div>
              </div>
              {payment.notes && (
                <p className="text-xs text-gray-600 bg-white p-2 rounded border border-gray-200 mb-2">
                  {payment.notes}
                </p>
              )}
              <button
                onClick={() => handleDeletePayment(payment.id)}
                className="text-xs text-red-600 hover:text-red-700 font-semibold"
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

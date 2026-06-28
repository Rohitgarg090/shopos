'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import GSTTrendChart from './GSTTrendChart';
import GSTPaymentTracker from './GSTPaymentTracker';

export default function GSTLiabilityTab({ firmId }) {
  const [data, setData] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [firmSettings, setFirmSettings] = useState(null);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const getSupabaseClient = () => {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
  };

  const fetchPayments = async (supabase, session) => {
    try {
      const res = await fetch(`/api/ca/gst-payments?firm_id=${firmId}&month_year=${month}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const paymentData = await res.json();
        setPayments(paymentData || []);
      }
    } catch (err) {
      console.error('Error fetching payments:', err);
    }
  };

  const fetchFirmSettings = async (supabase, session) => {
    try {
      const res = await fetch(`/api/ca/firm-settings?firm_id=${firmId}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const settings = await res.json();
        setFirmSettings(settings);
      }
    } catch (err) {
      console.error('Error fetching firm settings:', err);
    }
  };

  const handlePaymentChange = async () => {
    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await fetchPayments(supabase, session);
      }
    } catch (err) {
      console.error('Error refreshing payments:', err);
    }
  };

  const fetchLiability = async () => {
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('No active session');
        setLoading(false);
        return;
      }
      const res = await fetch(`/api/ca/gst-liability?firm_id=${firmId}&month_year=${month}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setData(data);

      await fetchPayments(supabase, session);
      await fetchFirmSettings(supabase, session);
    } catch (err) {
      console.error('Error fetching liability:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (firmId) fetchLiability();
  }, [firmId, month]);

  if (loading) {
    return <p className="text-gray-600 text-center py-8">Loading...</p>;
  }

  if (!data) {
    return <p className="text-gray-600 text-center py-8">No data available</p>;
  }

  // Show debug info if no bills/purchases found
  if (data.debug && (data.debug.billsFound === 0 && data.debug.purchasesFound === 0)) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">GST Liability</h2>
          <input
            type="month"
            value={month}
            onChange={e => setMonth(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
          />
        </div>

        <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6 mb-6">
          <p className="text-blue-900 font-semibold mb-4">ℹ️ No data available for this month</p>
          <p className="text-blue-800 text-sm mb-4">To see GST liability calculations, you need:</p>
          <ul className="text-blue-800 text-sm space-y-2 ml-4">
            <li>✓ <strong>Sales Bills</strong> - Create invoices in the POS module</li>
            <li>✓ <strong>Purchase Records</strong> - Add purchase data (optional)</li>
          </ul>
          <p className="text-blue-700 text-xs mt-4 font-mono bg-blue-100 p-3 rounded">
            Looking for: {data.debug.dateRange}
          </p>
        </div>

        {/* Fallback Display with Zero Values */}
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200 rounded-2xl p-8 mb-8 shadow-sm">
          <div className="text-center">
            <p className="text-gray-700 text-sm font-semibold mb-2">Net GST Liability (Sample)</p>
            <div className="text-5xl font-bold mb-4 text-gray-600">₹0.00</div>
            <p className="text-gray-600 text-sm">Create bills to calculate liability</p>
          </div>
        </div>
      </div>
    );
  }

  const liabilityStatus = data.liability.netDue > 0 ? 'red' : 'green';
  const daysUntil = Math.ceil(
    (new Date(data.liability.dueDate) - new Date()) / (1000 * 60 * 60 * 24)
  );

  const totalPaid = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  const outstandingBalance = Math.max(0, data.liability.netDue - totalPaid);
  const outstandingStatus = outstandingBalance > 0 ? 'red' : 'green';

  // Calculate interest on overdue GST
  const daysOverdue = Math.max(0, daysUntil * -1);
  const interestRate = 12; // 12% p.a.
  const interestDue = firmSettings?.interest_enabled && outstandingBalance > 0 && daysOverdue > 60
    ? (outstandingBalance * (interestRate / 100) * (daysOverdue / 365))
    : 0;

  const totalDue = outstandingBalance + interestDue;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">GST Liability</h2>
        <input
          type="month"
          value={month}
          onChange={e => setMonth(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
        />
      </div>

      {/* Month Display */}
      <p className="text-sm text-gray-600 mb-6">{data.monthDisplay}</p>

      {/* Main Liability Card */}
      <div className={`${
        liabilityStatus === 'red'
          ? 'bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-200'
          : 'bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200'
      } rounded-2xl p-8 mb-8 shadow-sm`}>
        <div className="text-center">
          <p className="text-gray-700 text-sm font-semibold mb-2">Net GST Liability</p>
          <div className={`text-5xl font-bold mb-4 ${
            liabilityStatus === 'red' ? 'text-red-600' : 'text-green-600'
          }`}>
            ₹{data.liability.netDue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </div>
          <div className="flex justify-center gap-6 text-sm">
            <div>
              <p className="text-gray-600">Due Date</p>
              <p className="font-bold text-gray-900">
                {new Date(data.liability.dueDate).toLocaleDateString('en-IN')}
              </p>
            </div>
            <div className="border-l border-gray-300"></div>
            <div>
              <p className="text-gray-600">Days Left</p>
              <p className={`font-bold ${
                daysUntil <= 3 ? 'text-red-600' : daysUntil <= 7 ? 'text-amber-600' : 'text-green-600'
              }`}>
                {daysUntil <= 0 ? 'Overdue' : `${daysUntil} days`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Outstanding Balance Card */}
      <div className={`${
        outstandingStatus === 'red'
          ? 'bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200'
          : 'bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200'
      } rounded-2xl p-6 mb-8 shadow-sm`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-700 text-sm font-semibold">Outstanding Balance</p>
            <p className={`text-4xl font-bold mt-2 ${
              outstandingStatus === 'red' ? 'text-orange-600' : 'text-green-600'
            }`}>
              ₹{outstandingBalance.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="text-right">
            <p className="text-gray-600 text-sm mb-1">
              <span className="font-semibold">Due:</span> ₹{data.liability.netDue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </p>
            <p className="text-gray-600 text-sm">
              <span className="font-semibold">Paid:</span> ₹{totalPaid.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      {/* Interest Due Card */}
      {firmSettings?.interest_enabled && interestDue > 0 && (
        <div className="bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-200 rounded-2xl p-6 mb-8 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-700 text-sm font-semibold">Interest Due (12% p.a.)</p>
              <p className="text-4xl font-bold mt-2 text-red-600">
                ₹{interestDue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-gray-600 mt-2">Charged on outstanding balance after 60 days</p>
            </div>
            <div className="text-right">
              <p className="text-gray-600 text-sm mb-1">
                <span className="font-semibold">Days Overdue:</span> {daysOverdue} days
              </p>
              <p className="text-2xl font-bold text-red-600 mt-2">
                ₹{totalDue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-gray-600 mt-1">Total with interest</p>
            </div>
          </div>
        </div>
      )}

      {/* Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Sales Tax */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-gray-700 text-sm font-semibold">Sales Tax (GSTR-1)</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">
                ₹{data.liability.salesTax.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-blue-200 w-12 h-12 rounded-lg flex items-center justify-center text-lg font-bold text-blue-700">
              📊
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Bills: {data.sales.count}</span>
              <span className="font-semibold text-gray-900">₹{data.sales.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="border-t border-blue-200 pt-2 mt-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">CGST (9%)</span>
                <span className="font-semibold text-gray-900">₹{data.sales.cgst.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">SGST (9%)</span>
                <span className="font-semibold text-gray-900">₹{data.sales.sgst.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">IGST (18%)</span>
                <span className="font-semibold text-gray-900">₹{data.sales.igst.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Input Tax Credit */}
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-gray-700 text-sm font-semibold">Input Tax Credit (ITC)</p>
              <p className="text-3xl font-bold text-purple-600 mt-2">
                ₹{data.liability.itc.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-purple-200 w-12 h-12 rounded-lg flex items-center justify-center text-lg font-bold text-purple-700">
              ✓
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Purchases: {data.purchases.count}</span>
              <span className="font-semibold text-gray-900">₹{data.purchases.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="border-t border-purple-200 pt-2 mt-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">CGST (9%)</span>
                <span className="font-semibold text-gray-900">₹{data.purchases.cgst.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">SGST (9%)</span>
                <span className="font-semibold text-gray-900">₹{data.purchases.sgst.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">IGST (18%)</span>
                <span className="font-semibold text-gray-900">₹{data.purchases.igst.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 mb-8">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Summary</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center pb-3 border-b border-gray-200">
            <span className="text-gray-700">Total Sales Tax</span>
            <span className="text-xl font-bold text-gray-900">
              ₹{data.liability.salesTax.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between items-center pb-3 border-b border-gray-200">
            <span className="text-gray-700">Less: Input Tax Credit</span>
            <span className="text-xl font-bold text-gray-900">
              -₹{data.liability.itc.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between items-center pt-2">
            <span className="text-gray-700 font-semibold">Net GST Due</span>
            <span className={`text-2xl font-bold ${
              liabilityStatus === 'red' ? 'text-red-600' : 'text-green-600'
            }`}>
              ₹{data.liability.netDue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Payment Tracking */}
      <GSTPaymentTracker firmId={firmId} onPaymentChange={handlePaymentChange} />

      {/* 12-Month Trend Chart */}
      <GSTTrendChart firmId={firmId} />
    </div>
  );
}

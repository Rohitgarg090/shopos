'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import ExportModal from '../components/ExportModal';
import BulkRemindersModal from '../components/BulkRemindersModal';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function CADashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [caProfile, setCAProfile] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [selectedClients, setSelectedClients] = useState(new Set());
  const [monthYear, setMonthYear] = useState('');
  const [exportModal, setExportModal] = useState(null);
  const [remindersModal, setRemindersModal] = useState(false);

  useEffect(() => {
    const today = new Date();
    setMonthYear(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`);
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push('/ca/auth/login');
        return;
      }

      // Get CA profile
      const profileRes = await fetch('/api/ca/auth/me', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!profileRes.ok) throw new Error('Failed to fetch profile');
      const profileData = await profileRes.json();
      setCAProfile(profileData.ca);

      // Get dashboard data
      const dashRes = await fetch('/api/ca/dashboard', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!dashRes.ok) throw new Error('Failed to fetch dashboard');
      const dashData = await dashRes.json();
      setDashboard(dashData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleClient = (firmId) => {
    const newSelected = new Set(selectedClients);
    if (newSelected.has(firmId)) {
      newSelected.delete(firmId);
    } else {
      newSelected.add(firmId);
    }
    setSelectedClients(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedClients.size === dashboard?.clients?.length) {
      setSelectedClients(new Set());
    } else {
      const allIds = new Set(dashboard?.clients?.map(c => c.firmId));
      setSelectedClients(allIds);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/ca/auth/login');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-300 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                📊 CA Dashboard
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Welcome, {caProfile?.name}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {!dashboard?.clients?.length ? (
          <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
            <p className="text-gray-600 text-lg mb-4">
              No clients linked yet.
            </p>
            <p className="text-gray-500 text-sm">
              Ask your clients to invite you as a CA partner to get started.
            </p>
          </div>
        ) : (
          <div>
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="text-sm font-medium text-gray-600">Total Clients</div>
                <div className="text-3xl font-bold text-indigo-600 mt-1">
                  {dashboard.summary.total}
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="text-sm font-medium text-gray-600">🟢 Up to Date</div>
                <div className="text-3xl font-bold text-green-600 mt-1">
                  {dashboard.summary.green}
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="text-sm font-medium text-gray-600">🟡 Stale</div>
                <div className="text-3xl font-bold text-yellow-600 mt-1">
                  {dashboard.summary.amber}
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="text-sm font-medium text-gray-600">🔴 Action Needed</div>
                <div className="text-3xl font-bold text-red-600 mt-1">
                  {dashboard.summary.red}
                </div>
              </div>
            </div>

            {/* Toolbar */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
              <div className="flex items-center gap-4 flex-wrap">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedClients.size === dashboard?.clients?.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 cursor-pointer"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    {selectedClients.size > 0
                      ? `${selectedClients.size} selected`
                      : 'Select All'}
                  </span>
                </label>

                {selectedClients.size > 0 && (
                  <>
                    <button
                      onClick={() => {
                        // Show export modal for first selected client
                        const firstSelected = Array.from(selectedClients)[0];
                        const client = dashboard.clients.find(c => c.firmId === firstSelected);
                        setExportModal(client);
                      }}
                      className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors"
                    >
                      📥 Export ({selectedClients.size})
                    </button>
                    <button
                      onClick={() => setRemindersModal(true)}
                      className="px-4 py-2 text-sm font-medium bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
                    >
                      💬 Send Reminder ({selectedClients.size})
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Client Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {dashboard.clients.map(client => (
                <div
                  key={client.firmId}
                  className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => toggleClient(client.firmId)}
                >
                  {/* Checkbox */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {client.firmName}
                      </h3>
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedClients.has(client.firmId)}
                      onChange={() => {}}
                      className="w-5 h-5 cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>

                  {/* Status Indicator */}
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-2xl">
                      {client.status === 'green'
                        ? '🟢'
                        : client.status === 'amber'
                          ? '🟡'
                          : '🔴'}
                    </span>
                    <span className="text-sm font-medium text-gray-700">
                      {client.status === 'green'
                        ? 'Up to Date'
                        : client.status === 'amber'
                          ? 'Stale (5+ days)'
                          : 'Action Needed'}
                    </span>
                  </div>

                  {/* Metrics */}
                  <div className="space-y-3 mb-4 pb-4 border-b border-gray-200">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Bills</span>
                      <span className="font-semibold text-gray-900">
                        {client.salesCount}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Last Bill</span>
                      <span className="font-semibold text-gray-900">
                        {client.lastInvoiceDate
                          ? new Date(client.lastInvoiceDate).toLocaleDateString('en-IN')
                          : 'Never'}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setExportModal(client);
                      }}
                      className="px-3 py-2 text-xs font-medium bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-md transition-colors"
                    >
                      📥 Export
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedClients(new Set([client.firmId]));
                        setRemindersModal(true);
                      }}
                      className="px-3 py-2 text-xs font-medium bg-green-50 hover:bg-green-100 text-green-700 rounded-md transition-colors"
                    >
                      💬 Remind
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {exportModal && (
        <ExportModal
          firmId={exportModal.firmId}
          firmName={exportModal.firmName}
          onClose={() => setExportModal(null)}
        />
      )}

      {remindersModal && (
        <BulkRemindersModal
          selectedFirmIds={selectedClients}
          firmNames={dashboard?.clients
            ?.filter(c => selectedClients.has(c.firmId))
            ?.map(c => c.firmName) || []}
          onClose={() => {
            setRemindersModal(false);
            setSelectedClients(new Set());
          }}
        />
      )}
    </div>
  );
}

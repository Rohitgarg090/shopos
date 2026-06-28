'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import DashboardAnalytics from '../components/DashboardAnalytics';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const GSTR_TYPE_LABELS = {
  gstr1: 'GSTR-1',
  gstr2b: 'GSTR-2B',
  gstr3b: 'GSTR-3B',
  itc04: 'ITC-04',
  gstr5: 'GSTR-5',
  gstr6: 'GSTR-6',
};

export default function CADashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [caProfile, setCAProfile] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [filteredClients, setFilteredClients] = useState([]);

  useEffect(() => {
    fetchDashboard();
  }, []);

  useEffect(() => {
    if (dashboard) {
      applyFiltersAndSort();
    }
  }, [dashboard, filter, sortBy]);

  const fetchDashboard = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push('/ca/auth/login');
        return;
      }

      const profileRes = await fetch('/api/ca/auth/me', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });

      if (!profileRes.ok) throw new Error('Failed to fetch profile');
      const profileData = await profileRes.json();
      setCAProfile(profileData.ca);

      const dashRes = await fetch('/api/ca/dashboard', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
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

  const applyFiltersAndSort = () => {
    let clients = [...(dashboard?.clients || [])];

    if (filter === 'upToDate') {
      clients = clients.filter(c => c.completionPercent === 100);
    } else if (filter === 'dataGood') {
      clients = clients.filter(c => c.completionPercent >= 70 && c.completionPercent < 100);
    } else if (filter === 'dataPoor') {
      clients = clients.filter(c => c.completionPercent < 70);
    }

    if (sortBy === 'name') {
      clients.sort((a, b) => a.firmName.localeCompare(b.firmName));
    } else if (sortBy === 'deadline') {
      clients.sort((a, b) => {
        if (!a.nextDeadlineDate) return 1;
        if (!b.nextDeadlineDate) return -1;
        return new Date(a.nextDeadlineDate) - new Date(b.nextDeadlineDate);
      });
    } else if (sortBy === 'completion') {
      clients.sort((a, b) => b.completionPercent - a.completionPercent);
    } else if (sortBy === 'gstrType') {
      clients.sort((a, b) => (a.nextDeadlineType || '').localeCompare(b.nextDeadlineType || ''));
    }

    setFilteredClients(clients);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/ca/auth/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-700 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Compliance Hub</h1>
              <p className="text-gray-600 text-sm mt-1">Welcome back, {caProfile?.name}</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-semibold text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all border border-gray-300"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 shadow-sm">
            {error}
          </div>
        )}

        {!dashboard?.clients?.length ? (
          <div className="text-center py-16">
            <p className="text-gray-700 text-lg font-medium mb-2">No clients yet</p>
            <p className="text-gray-600">Ask your clients to invite you as a CA partner</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Dashboard Analytics */}
            <DashboardAnalytics dashboard={dashboard} />

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { key: 'all', label: 'Total Clients', value: dashboard.summary.total, bg: 'bg-gradient-to-br from-blue-50 to-blue-100', border: 'border-blue-200', hoverBg: 'hover:shadow-lg hover:from-blue-100 hover:to-blue-150', iconBg: 'bg-blue-200', iconText: '📊' },
                { key: 'upToDate', label: 'Completed', value: dashboard.summary.upToDate, bg: 'bg-gradient-to-br from-green-50 to-green-100', border: 'border-green-200', hoverBg: 'hover:shadow-lg hover:from-green-100 hover:to-green-150', iconBg: 'bg-green-200', iconText: '✓' },
                { key: 'dataGood', label: 'In Progress', value: dashboard.summary.dataGood, bg: 'bg-gradient-to-br from-amber-50 to-amber-100', border: 'border-amber-200', hoverBg: 'hover:shadow-lg hover:from-amber-100 hover:to-amber-150', iconBg: 'bg-amber-200', iconText: '→' },
                { key: 'dataPoor', label: 'Pending', value: dashboard.summary.dataPoor, bg: 'bg-gradient-to-br from-rose-50 to-rose-100', border: 'border-rose-200', hoverBg: 'hover:shadow-lg hover:from-rose-100 hover:to-rose-150', iconBg: 'bg-rose-200', iconText: '!' },
              ].map(card => (
                <button
                  key={card.key}
                  onClick={() => setFilter(card.key)}
                  className={`${card.bg} border-2 ${card.border} rounded-2xl p-6 transition-all duration-300 text-left ${card.hoverBg} ${filter === card.key ? 'ring-2 ring-offset-2 ring-blue-400' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-gray-700 text-sm font-semibold">{card.label}</p>
                      <div className="text-4xl font-bold text-gray-900 mt-2">{card.value}</div>
                    </div>
                    <div className={`${card.iconBg} w-12 h-12 rounded-lg flex items-center justify-center text-lg font-bold`}>
                      {card.iconText}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Controls */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between flex-wrap gap-6">
                <div className="flex items-center gap-3">
                  <label className="text-gray-900 text-sm font-semibold">Sort by</label>
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value)}
                    className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  >
                    <option value="name">Firm Name</option>
                    <option value="deadline">Next Deadline</option>
                    <option value="completion">Completion %</option>
                    <option value="gstrType">GSTR Type</option>
                  </select>
                </div>
                <div className="text-gray-700 text-sm">
                  <span className="font-bold text-gray-900">{filteredClients.length}</span> of <span className="font-bold text-gray-900">{dashboard.clients.length}</span> clients
                </div>
              </div>
            </div>

            {/* Clients Table */}
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Firm Name</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Completion</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Next Deadline</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Timeline</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredClients.map(client => {
                      const statusConfig = client.completionPercent === 100
                        ? { bg: 'bg-green-100', text: 'text-green-900', dot: 'bg-green-500', label: 'Complete', border: 'border-green-200' }
                        : client.completionPercent >= 70
                          ? { bg: 'bg-amber-100', text: 'text-amber-900', dot: 'bg-amber-500', label: 'On Track', border: 'border-amber-200' }
                          : { bg: 'bg-red-100', text: 'text-red-900', dot: 'bg-red-500', label: 'Needs Action', border: 'border-red-200' };

                      return (
                        <tr key={client.firmId} className="hover:bg-gray-50 transition-colors group">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Link
                              href={`/ca/client/${client.firmId}`}
                              className="font-bold text-blue-600 group-hover:text-blue-700 transition-colors"
                            >
                              {client.firmName}
                            </Link>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${statusConfig.bg} border ${statusConfig.border}`}>
                              <div className={`w-2 h-2 rounded-full ${statusConfig.dot}`}></div>
                              <span className={`text-xs font-bold ${statusConfig.text}`}>
                                {statusConfig.label}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="w-32 h-2.5 bg-gray-200 rounded-full overflow-hidden border border-gray-300">
                                <div
                                  className={`h-full bg-gradient-to-r ${client.completionPercent === 100 ? 'from-green-500 to-green-400' : client.completionPercent >= 70 ? 'from-amber-500 to-amber-400' : 'from-red-500 to-red-400'} transition-all duration-500`}
                                  style={{ width: `${client.completionPercent}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-bold text-gray-900 w-12 text-right">{client.completionPercent}%</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {client.nextDeadlineType ? (
                              <div>
                                <p className="text-gray-900 font-bold">{GSTR_TYPE_LABELS[client.nextDeadlineType]}</p>
                                <p className="text-gray-600 text-xs">{new Date(client.nextDeadlineDate).toLocaleDateString('en-IN')}</p>
                              </div>
                            ) : (
                              <span className="text-gray-600">No deadline</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {client.daysUntilDeadline !== null ? (
                              <span
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold inline-block border ${
                                  client.daysUntilDeadline <= 3
                                    ? 'bg-red-100 text-red-900 border-red-200'
                                    : client.daysUntilDeadline <= 7
                                      ? 'bg-amber-100 text-amber-900 border-amber-200'
                                      : 'bg-green-100 text-green-900 border-green-200'
                                }`}
                              >
                                {client.daysUntilDeadline === 0
                                  ? 'Due Today'
                                  : client.daysUntilDeadline < 0
                                    ? 'Overdue'
                                    : `${client.daysUntilDeadline}d`}
                              </span>
                            ) : (
                              <span className="text-gray-600">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {filteredClients.length === 0 && (
                <div className="p-12 text-center text-gray-600 font-medium">
                  No clients match the selected filter
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { CheckCircle, Clock, XCircle, Phone, Mail, MapPin, Building2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function DemoRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState(null);

  useEffect(() => {
    fetchDemoRequests();
  }, []);

  const fetchDemoRequests = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        router.push('/auth?mode=login');
        return;
      }

      const response = await fetch('/api/demo-request', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch demo requests');
      }

      const data = await response.json();
      setRequests(data.requests || []);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching demo requests:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const updateStatus = async (requestId, status) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const { error } = await supabase
        .from('demo_requests')
        .update({
          status,
          contacted_at: new Date().toISOString(),
          contacted_by: session?.user?.email,
        })
        .eq('id', requestId);

      if (error) throw error;

      // Refresh list
      fetchDemoRequests();
      setSelectedRequest(null);
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Failed to update status');
    }
  };

  const filteredRequests = requests.filter(req =>
    filter === 'all' ? true : req.status === filter
  );

  const getStatusBadge = (status) => {
    const badges = {
      pending: { icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
      contacted: { icon: Phone, color: 'text-blue-400', bg: 'bg-blue-500/20' },
      converted: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/20' },
      rejected: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/20' },
    };
    const badge = badges[status] || badges.pending;
    const Icon = badge.icon;
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${badge.bg}`}>
        <Icon size={16} className={badge.color} />
        <span className="text-sm font-semibold capitalize text-white">{status}</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Demo Requests</h1>
          <p className="text-slate-400">Manage and track customer demo requests</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total', count: requests.length, color: 'from-blue-500 to-cyan-500' },
            { label: 'Pending', count: requests.filter(r => r.status === 'pending').length, color: 'from-yellow-500 to-orange-500' },
            { label: 'Contacted', count: requests.filter(r => r.status === 'contacted').length, color: 'from-purple-500 to-pink-500' },
            { label: 'Converted', count: requests.filter(r => r.status === 'converted').length, color: 'from-green-500 to-emerald-500' },
          ].map((stat, idx) => (
            <div key={idx} className={`bg-gradient-to-br ${stat.color} rounded-xl p-6 text-white`}>
              <p className="text-sm opacity-90">{stat.label}</p>
              <p className="text-3xl font-bold">{stat.count}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {['all', 'pending', 'contacted', 'converted', 'rejected'].map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === status
                  ? 'bg-cyan-500 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
          {filteredRequests.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <p>No demo requests found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-700 bg-slate-900/50">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold text-slate-300">Name</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-300">Contact</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-300">Location</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-300">Status</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-300">Date</th>
                    <th className="px-6 py-3 text-center font-semibold text-slate-300">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map(req => (
                    <tr key={req.id} className="border-b border-slate-700 hover:bg-slate-700/30 transition">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-white">{req.name}</p>
                        {req.company_name && <p className="text-xs text-slate-400">{req.company_name}</p>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <p className="flex items-center gap-2 text-slate-300">
                            <Mail size={14} className="text-cyan-400" />
                            {req.email}
                          </p>
                          <p className="flex items-center gap-2 text-slate-300">
                            <Phone size={14} className="text-cyan-400" />
                            {req.contact_number}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="flex items-center gap-2 text-slate-300">
                          <MapPin size={14} className="text-cyan-400" />
                          {req.city}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(req.status)}
                      </td>
                      <td className="px-6 py-4 text-slate-400">
                        {new Date(req.created_at).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => setSelectedRequest(req)}
                          className="px-3 py-1 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-xs font-semibold transition"
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-8">
            <h3 className="text-2xl font-bold text-white mb-6">Demo Request Details</h3>

            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Name</label>
                <p className="text-white font-semibold">{selectedRequest.name}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Email</label>
                <a href={`mailto:${selectedRequest.email}`} className="text-cyan-400 hover:underline">
                  {selectedRequest.email}
                </a>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Contact</label>
                <a href={`tel:${selectedRequest.contact_number}`} className="text-cyan-400 hover:underline">
                  {selectedRequest.contact_number}
                </a>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">City</label>
                <p className="text-white">{selectedRequest.city}</p>
              </div>
              {selectedRequest.company_name && (
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Company</label>
                  <p className="text-white">{selectedRequest.company_name}</p>
                </div>
              )}
              {selectedRequest.message && (
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Message</label>
                  <p className="text-slate-300 text-sm">{selectedRequest.message}</p>
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Current Status</label>
                {getStatusBadge(selectedRequest.status)}
              </div>
            </div>

            <div className="space-y-2 mb-4">
              {['pending', 'contacted', 'converted', 'rejected'].map(status => (
                <button
                  key={status}
                  onClick={() => updateStatus(selectedRequest.id, status)}
                  disabled={selectedRequest.status === status}
                  className={`w-full py-2 px-4 rounded-lg font-semibold transition capitalize ${
                    selectedRequest.status === status
                      ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                      : 'bg-slate-800 hover:bg-slate-700 text-white'
                  }`}
                >
                  Mark as {status}
                </button>
              ))}
            </div>

            <button
              onClick={() => setSelectedRequest(null)}
              className="w-full py-2 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-semibold transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

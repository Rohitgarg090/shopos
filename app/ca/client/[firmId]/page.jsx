'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import AnnotationsTab from '../../components/AnnotationsTab';
import ComplianceCalendarTab from '../../components/ComplianceCalendarTab';
import GSTLiabilityTab from '../../components/GSTLiabilityTab';
import GSTR2BReconciliation from '../../components/GSTR2BReconciliation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const TABS = [
  { id: 'annotations', label: 'Annotations', icon: '📝' },
  { id: 'compliance', label: 'Compliance Calendar', icon: '📅' },
  { id: 'gst-liability', label: 'GST Liability', icon: '💰' },
  { id: 'gstr2b', label: 'GSTR-2B Reconciliation', icon: '🔍' },
];

export default function ClientDetail() {
  const router = useRouter();
  const params = useParams();
  const firmId = params?.firmId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [firm, setFirm] = useState(null);
  const [activeTab, setActiveTab] = useState('annotations');
  const [downloadMenu, setDownloadMenu] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (firmId) {
      console.log('Fetching client details for firmId:', firmId);
      fetchClientDetails();
    }
  }, [firmId]);

  const fetchClientDetails = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push('/ca/auth/login');
        return;
      }

      if (!firmId) {
        setError('No firm ID provided');
        setLoading(false);
        return;
      }

      const res = await fetch(`/api/ca/client/${firmId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch client details');
      }

      setFirm(data);
    } catch (err) {
      console.error('Error fetching client details:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (gstrType, format) => {
    setDownloading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const url = `/api/ca/export/${gstrType}?firm_id=${firmId}&format=${format}`;

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` },
      });

      if (!res.ok) throw new Error('Download failed');

      if (format === 'excel') {
        const data = await res.json();
        downloadAsExcel(data.data, data.filename);
      } else {
        const blob = await res.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `${gstrType}_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
      }
      setDownloadMenu(false);
    } catch (err) {
      console.error('Download error:', err);
      alert('Download failed: ' + err.message);
    } finally {
      setDownloading(false);
    }
  };

  const downloadAsExcel = (data, filename) => {
    const headers = Object.keys(data[0] || {});
    const rows = data.map(row => headers.map(h => {
      const val = row[h];
      return val === null || val === undefined ? '' : String(val);
    }));

    const csv = [headers, ...rows].map(row =>
      row.map(cell =>
        cell.includes(',') || cell.includes('"')
          ? `"${cell.replace(/"/g, '""')}"`
          : cell
      ).join(',')
    ).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-700 font-medium">Loading client details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-red-700 shadow-sm">
            {error}
          </div>
          <button
            onClick={() => router.push('/ca/dashboard')}
            className="mt-4 px-4 py-2 text-sm font-semibold text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all border border-gray-300 hover:border-gray-400"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex-1">
              <button
                onClick={() => router.push('/ca/dashboard')}
                className="text-sm text-blue-600 hover:text-blue-700 mb-3 font-semibold transition-colors"
              >
                ← Back to Dashboard
              </button>
              <h1 className="text-4xl font-bold text-gray-900">
                {firm?.firmName}
              </h1>
            </div>
            <div className="relative">
              <button
                onClick={() => setDownloadMenu(!downloadMenu)}
                disabled={downloading}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-semibold text-sm transition-all duration-300 disabled:opacity-50 shadow-md hover:shadow-lg"
              >
                {downloading ? 'Downloading...' : '⬇ Export Data'}
              </button>

              {downloadMenu && (
                <div className="absolute right-0 mt-3 w-80 bg-white border border-gray-200 rounded-xl shadow-xl z-10">
                  <div className="p-5">
                    <p className="text-sm font-bold text-gray-900 mb-4">Download GST Data</p>
                    <div className="space-y-3">
                      {[
                        { type: 'gstr-1', label: 'GSTR-1 (Sales Register)' },
                        { type: 'gstr-2b', label: 'GSTR-2B (Purchase Register)' },
                      ].map(item => (
                        <div key={item.type}>
                          <div className="text-xs font-bold text-gray-700 mb-2">{item.label}</div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleDownload(item.type, 'csv')}
                              disabled={downloading}
                              className="flex-1 px-3 py-2 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg font-semibold transition-all disabled:opacity-50"
                            >
                              CSV
                            </button>
                            <button
                              onClick={() => handleDownload(item.type, 'excel')}
                              disabled={downloading}
                              className="flex-1 px-3 py-2 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg font-semibold transition-all disabled:opacity-50"
                            >
                              Excel
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-4 border-b border-gray-200">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-4 font-semibold text-sm transition-all duration-300 relative ${
                  activeTab === tab.id
                    ? 'text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-blue-500 rounded-full"></div>
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'annotations' && (
          <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
            <AnnotationsTab firmId={firmId} />
          </div>
        )}
        {activeTab === 'compliance' && (
          <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
            <ComplianceCalendarTab firmId={firmId} />
          </div>
        )}
        {activeTab === 'gst-liability' && (
          <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
            <GSTLiabilityTab firmId={firmId} />
          </div>
        )}
        {activeTab === 'gstr2b' && (
          <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
            <GSTR2BReconciliation firmId={firmId} />
          </div>
        )}
      </main>
    </div>
  );
}

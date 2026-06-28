'use client';

import { useEffect, useState } from 'react';

const DEADLINE_TYPES = {
  gstr1: { label: 'GSTR-1 (Sales Register)', day: 11, color: 'from-blue-100 to-blue-50', borderColor: 'border-blue-200', dotColor: 'bg-blue-500' },
  gstr2b: { label: 'GSTR-2B (Purchase Register)', day: 12, color: 'from-green-100 to-green-50', borderColor: 'border-green-200', dotColor: 'bg-green-500' },
  gstr3b: { label: 'GSTR-3B (Summary)', day: 20, color: 'from-purple-100 to-purple-50', borderColor: 'border-purple-200', dotColor: 'bg-purple-500' },
  itc04: { label: 'ITC-04 (Input Credit Notice)', day: 30, color: 'from-pink-100 to-pink-50', borderColor: 'border-pink-200', dotColor: 'bg-pink-500' },
  gstr5: { label: 'GSTR-5 (Composition)', day: 21, color: 'from-orange-100 to-orange-50', borderColor: 'border-orange-200', dotColor: 'bg-orange-500' },
  gstr6: { label: 'GSTR-6 (TDS/TCS)', day: 15, color: 'from-red-100 to-red-50', borderColor: 'border-red-200', dotColor: 'bg-red-500' },
};

const STATUS_COLORS = {
  not_started: { bg: 'bg-gray-100', color: 'text-gray-800', dotColor: 'bg-gray-500', border: 'border-gray-200' },
  in_progress: { bg: 'bg-amber-100', color: 'text-amber-800', dotColor: 'bg-amber-500', border: 'border-amber-200' },
  completed: { bg: 'bg-green-100', color: 'text-green-800', dotColor: 'bg-green-500', border: 'border-green-200' },
  missed: { bg: 'bg-red-100', color: 'text-red-800', dotColor: 'bg-red-500', border: 'border-red-200' },
};

export default function ComplianceCalendarTab({ firmId }) {
  const [deadlines, setDeadlines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});

  const fetchDeadlines = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      const res = await fetch(`/api/ca/compliance-calendar?firm_id=${firmId}&month_year=${month}`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setDeadlines(data);
    } catch (err) {
      console.error('Error fetching deadlines:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (firmId) fetchDeadlines();
  }, [firmId, month]);

  const handleGenerateDefaults = async () => {
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();

      const defaultDeadlines = Object.entries(DEADLINE_TYPES).map(([key, val]) => ({
        firmId,
        deadlineType: key,
        monthYear: month,
        dueDate: `${month}-${String(val.day).padStart(2, '0')}`,
        reminderDate: getDateBefore(month, val.day, 3),
        status: 'not_started',
      }));

      for (const deadline of defaultDeadlines) {
        await fetch('/api/ca/compliance-calendar', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify(deadline),
        });
      }

      fetchDeadlines();
    } catch (err) {
      console.error('Error generating defaults:', err);
    }
  };

  const handleUpdateDeadline = async (id, updatePayload = null) => {
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      const payload = updatePayload || editData;

      const res = await fetch(`/api/ca/compliance-calendar/${id}`, {
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
      fetchDeadlines();
    } catch (err) {
      console.error('Error updating deadline:', err);
      alert('Error: ' + err.message);
    }
  };

  const handleDeleteDeadline = async (id) => {
    if (!window.confirm('Delete this deadline?')) return;
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      const res = await fetch(`/api/ca/compliance-calendar/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session?.access_token}` },
      });
      if (!res.ok) throw new Error('Failed to delete');
      fetchDeadlines();
    } catch (err) {
      console.error('Error deleting deadline:', err);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    await handleUpdateDeadline(id, { status: newStatus });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Compliance Calendar</h2>
          <input
            type="month"
            value={month}
            onChange={e => setMonth(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
          />
        </div>
        <button
          onClick={handleGenerateDefaults}
          className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-sm transition-all shadow-md"
        >
          Generate Deadlines
        </button>
      </div>

      {/* Deadlines Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <p className="text-gray-600 text-sm col-span-full text-center py-8">Loading...</p>
        ) : deadlines.length === 0 ? (
          <p className="text-gray-600 text-sm col-span-full text-center py-8">No deadlines for this month</p>
        ) : (
          deadlines.map(deadline => {
            const typeInfo = DEADLINE_TYPES[deadline.deadline_type];
            const statusInfo = STATUS_COLORS[deadline.status];
            const daysUntil = Math.ceil(
              (new Date(deadline.due_date) - new Date()) / (1000 * 60 * 60 * 24)
            );

            return (
              <div
                key={deadline.id}
                className={`bg-gradient-to-br ${typeInfo.color} border ${typeInfo.borderColor} rounded-2xl p-5 hover:shadow-lg transition-all`}
              >
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-3 h-3 rounded-full ${typeInfo.dotColor}`}></div>
                    <div className="text-sm font-bold text-gray-900">{typeInfo.label}</div>
                  </div>
                  <div className="text-xs text-gray-600">
                    Due: <strong>{new Date(deadline.due_date).toLocaleDateString('en-IN')}</strong>
                  </div>
                  {daysUntil >= 0 && (
                    <div className="text-xs text-gray-700 font-semibold mt-1">
                      {daysUntil === 0 ? '⏰ Due today' : `${daysUntil} days left`}
                    </div>
                  )}
                </div>

                {editingId === deadline.id ? (
                  <div className="mb-4">
                    <textarea
                      placeholder="Add notes..."
                      value={editData.notes || deadline.notes || ''}
                      onChange={e => setEditData(ed => ({ ...ed, notes: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 mb-3 transition-all"
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdateDeadline(deadline.id)}
                        className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition-all"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="flex-1 px-3 py-2 bg-gray-300 hover:bg-gray-400 text-gray-900 rounded-lg text-xs font-bold transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  deadline.notes && (
                    <div className="bg-white bg-opacity-60 p-3 rounded-lg text-xs text-gray-700 mb-4 border border-gray-200">
                      {deadline.notes}
                    </div>
                  )
                )}

                <div className="flex gap-2 flex-wrap mb-4">
                  {['not_started', 'in_progress', 'completed', 'missed'].map(status => (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(deadline.id, status)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                        deadline.status === status
                          ? `${STATUS_COLORS[status].bg} ${STATUS_COLORS[status].color} ${STATUS_COLORS[status].border}`
                          : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                      }`}
                    >
                      {status === 'not_started' ? 'Start' : status === 'in_progress' ? 'Progress' : status === 'completed' ? 'Done' : 'Missed'}
                    </button>
                  ))}
                </div>

                {editingId !== deadline.id && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingId(deadline.id);
                        setEditData({ notes: deadline.notes });
                      }}
                      className="flex-1 px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-lg text-xs font-bold transition-all"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteDeadline(deadline.id)}
                      className="flex-1 px-3 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg text-xs font-bold transition-all"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function getDateBefore(monthYear, day, daysBack) {
  const [year, month] = monthYear.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, day);
  date.setDate(date.getDate() - daysBack);
  return date.toISOString().split('T')[0];
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

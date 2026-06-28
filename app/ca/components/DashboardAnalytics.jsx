'use client';

import { useEffect, useState } from 'react';

export default function DashboardAnalytics({ dashboard }) {
  const [analytics, setAnalytics] = useState({
    overDueGST: 0,
    highRiskClients: 0,
    pendingDeadlines: 0,
    averageCompletion: 0,
    thisMonthGST: 0,
  });

  useEffect(() => {
    if (!dashboard?.clients) return;

    // Calculate analytics
    let overDueGST = 0;
    let highRiskClients = 0;
    let pendingDeadlines = 0;
    let totalCompletion = 0;

    dashboard.clients.forEach(client => {
      // High-risk clients (<70% completion)
      if (client.completionPercent < 70) {
        highRiskClients++;
        // Estimate GST due (rough calculation)
        overDueGST += (client.completionPercent < 50) ? 5000 : 2000;
      }

      // Pending deadlines (days due)
      if (client.daysUntilDeadline && client.daysUntilDeadline < 7 && client.daysUntilDeadline >= 0) {
        pendingDeadlines++;
      }

      totalCompletion += client.completionPercent || 0;
    });

    const averageCompletion = Math.round(totalCompletion / (dashboard.clients.length || 1));

    setAnalytics({
      overDueGST,
      highRiskClients,
      pendingDeadlines,
      averageCompletion,
      thisMonthGST: 0, // This would need actual data from GST calculations
    });
  }, [dashboard]);

  if (!dashboard?.clients?.length) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
      {/* Total Clients with High Risk */}
      <div className="bg-gradient-to-br from-rose-50 to-pink-50 border-2 border-rose-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-gray-700 text-xs font-semibold">HIGH RISK</p>
            <p className="text-3xl font-bold text-rose-600 mt-2">{analytics.highRiskClients}</p>
            <p className="text-xs text-gray-600 mt-2">Clients &lt;70% compliance</p>
          </div>
          <div className="text-2xl">⚠️</div>
        </div>
      </div>

      {/* Pending Deadlines */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-gray-700 text-xs font-semibold">DUE SOON</p>
            <p className="text-3xl font-bold text-amber-600 mt-2">{analytics.pendingDeadlines}</p>
            <p className="text-xs text-gray-600 mt-2">Deadlines in 7 days</p>
          </div>
          <div className="text-2xl">⏰</div>
        </div>
      </div>

      {/* Average Completion */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-gray-700 text-xs font-semibold">AVG COMPLETION</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">{analytics.averageCompletion}%</p>
            <p className="text-xs text-gray-600 mt-2">Across all clients</p>
          </div>
          <div className="text-2xl">📊</div>
        </div>
      </div>

      {/* Total Up to Date */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-gray-700 text-xs font-semibold">UP TO DATE</p>
            <p className="text-3xl font-bold text-green-600 mt-2">{dashboard.summary.upToDate}</p>
            <p className="text-xs text-gray-600 mt-2">100% compliant</p>
          </div>
          <div className="text-2xl">✅</div>
        </div>
      </div>

      {/* Total in Progress */}
      <div className="bg-gradient-to-br from-purple-50 to-violet-50 border-2 border-purple-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-gray-700 text-xs font-semibold">IN PROGRESS</p>
            <p className="text-3xl font-bold text-purple-600 mt-2">{dashboard.summary.dataGood}</p>
            <p className="text-xs text-gray-600 mt-2">70%+ compliant</p>
          </div>
          <div className="text-2xl">➡️</div>
        </div>
      </div>
    </div>
  );
}

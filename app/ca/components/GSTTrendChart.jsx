'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

export default function GSTTrendChart({ firmId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedMetric, setSelectedMetric] = useState('netGST'); // netGST, salesTax, billCount
  const [hoveredMonth, setHoveredMonth] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const getSupabaseClient = () => {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const supabase = getSupabaseClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setError('No active session');
          setLoading(false);
          return;
        }
        const res = await fetch(`/api/ca/gst-liability-history?firm_id=${firmId}`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
        });
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to fetch');
        }
        const data = await res.json();
        setData(data);
      } catch (err) {
        console.error('Error fetching trend data:', err);
        setError(err.message || 'Error loading trend data');
      } finally {
        setLoading(false);
      }
    };

    if (firmId) fetchData();
  }, [firmId]);

  if (loading) {
    return <p className="text-gray-600 text-center py-8">Loading trend data...</p>;
  }

  if (error) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <p className="text-red-600 text-center py-8">{error}</p>
      </div>
    );
  }

  if (!data || !data.data.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <p className="text-gray-600 text-center py-8">No trend data available</p>
      </div>
    );
  }

  const chartData = data.data;
  const maxValue = Math.max(
    ...chartData.map(m => {
      if (selectedMetric === 'netGST') return m.netGST;
      if (selectedMetric === 'salesTax') return m.salesTax;
      return m.billCount;
    })
  );

  const chartHeight = 200;
  const chartWidth = chartData.length * 50;
  const barWidth = 35;
  const barGap = 15;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-gray-900">12-Month GST Trend</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedMetric('netGST')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedMetric === 'netGST'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Net GST
          </button>
          <button
            onClick={() => setSelectedMetric('salesTax')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedMetric === 'salesTax'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Sales Tax
          </button>
          <button
            onClick={() => setSelectedMetric('billCount')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedMetric === 'billCount'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Bills
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="overflow-x-auto relative">
        <svg width={chartWidth} height={chartHeight + 50} className="mx-auto">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map(ratio => (
            <line
              key={`grid-${ratio}`}
              x1={0}
              y1={chartHeight - ratio * chartHeight}
              x2={chartWidth}
              y2={chartHeight - ratio * chartHeight}
              stroke="#E5E7EB"
              strokeDasharray="4"
              strokeWidth="1"
            />
          ))}

          {/* Bars */}
          {chartData.map((month, idx) => {
            const value = selectedMetric === 'netGST'
              ? month.netGST
              : selectedMetric === 'salesTax'
              ? month.salesTax
              : month.billCount;

            const barHeight = (value / maxValue) * chartHeight;
            const x = idx * 50 + barGap;
            const y = chartHeight - barHeight;

            let barColor = '#3B82F6'; // blue
            if (selectedMetric === 'salesTax') barColor = '#8B5CF6'; // purple
            if (selectedMetric === 'billCount') barColor = '#10B981'; // green

            return (
              <g key={`bar-${idx}`}>
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill={barColor}
                  rx="2"
                  opacity={hoveredMonth === idx ? '1' : '0.8'}
                  style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
                  onMouseEnter={() => {
                    setHoveredMonth(idx);
                    setTooltipPos({ x: x + barWidth / 2, y: y - 10 });
                  }}
                  onMouseLeave={() => setHoveredMonth(null)}
                />
                <text
                  x={x + barWidth / 2}
                  y={chartHeight + 20}
                  textAnchor="middle"
                  fontSize="12"
                  fill="#666"
                  fontWeight="500"
                >
                  {month.monthLabel}
                </text>
              </g>
            );
          })}

          {/* Tooltip */}
          {hoveredMonth !== null && chartData[hoveredMonth] && (
            <g>
              <rect
                x={tooltipPos.x - 60}
                y={tooltipPos.y - 40}
                width="120"
                height="35"
                fill="#1F2937"
                rx="4"
              />
              <text
                x={tooltipPos.x}
                y={tooltipPos.y - 20}
                textAnchor="middle"
                fontSize="11"
                fill="#fff"
                fontWeight="600"
              >
                {chartData[hoveredMonth].monthLabel}
              </text>
              <text
                x={tooltipPos.x}
                y={tooltipPos.y - 5}
                textAnchor="middle"
                fontSize="12"
                fill="#fff"
                fontWeight="700"
              >
                ₹{(selectedMetric === 'netGST'
                  ? chartData[hoveredMonth].netGST
                  : selectedMetric === 'salesTax'
                  ? chartData[hoveredMonth].salesTax
                  : chartData[hoveredMonth].billCount
                ).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-gray-200">
        <div>
          <p className="text-gray-600 text-sm font-semibold">Total Bills</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{data.summary.totalBills}</p>
        </div>
        <div>
          <p className="text-gray-600 text-sm font-semibold">Total Sales Tax</p>
          <p className="text-2xl font-bold text-purple-600 mt-1">
            ₹{data.summary.totalSalesTax.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div>
          <p className="text-gray-600 text-sm font-semibold">Net GST (12M)</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            ₹{data.summary.netGSTLiability.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
        </div>
      </div>
    </div>
  );
}

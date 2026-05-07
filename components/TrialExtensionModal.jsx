'use client';
import { useState } from 'react';
import { X, Calendar, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function TrialExtensionModal({ isOpen, daysRemaining, onExtend, onUpgrade, onClose }) {
  const [loading, setLoading] = useState(false);

  const handleExtend = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.error('No auth token');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/subscription-payments/extend-trial', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (response.ok) {
        onExtend?.();
      }
    } catch (err) {
      console.error('Failed to extend trial:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-t-2xl p-6 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
              <Calendar size={20} />
            </div>
            <h2 className="text-2xl font-bold">Trial Expiring Soon</h2>
          </div>
          <button onClick={onClose} className="hover:bg-blue-500 p-2 rounded-lg transition">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
          <div className="text-center">
            <p className="text-slate-600 mb-2">You have</p>
            <div className="text-5xl font-bold text-blue-600 mb-2">{daysRemaining}</div>
            <p className="text-slate-600">days remaining in your free trial</p>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${Math.max(0, (daysRemaining / 14) * 100)}%` }}
            ></div>
          </div>

          <div className="bg-blue-50 rounded-lg p-4 space-y-2">
            <p className="text-sm text-slate-700"><span className="font-semibold">What happens next?</span></p>
            <ul className="text-sm text-slate-600 space-y-1">
              <li className="flex items-start gap-2">
                <Check size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
                <span>Continue using all features during trial</span>
              </li>
              <li className="flex items-start gap-2">
                <Check size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
                <span>Upgrade anytime to continue after trial</span>
              </li>
              <li className="flex items-start gap-2">
                <Check size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
                <span>Extend trial once for 7 more days</span>
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleExtend}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                  Extending...
                </>
              ) : (
                <>
                  <Calendar size={18} />
                  Extend Trial 7 Days
                </>
              )}
            </button>
            <button
              onClick={onUpgrade}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold py-3 px-4 rounded-lg transition-all"
            >
              Upgrade to Paid Plan
            </button>
          </div>

          <p className="text-xs text-center text-slate-500">
            You can extend your trial only once
          </p>
        </div>
      </div>
    </div>
  );
}

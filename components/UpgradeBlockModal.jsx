'use client';
import { AlertCircle, ChevronRight } from 'lucide-react';

export default function UpgradeBlockModal({ isOpen, onUpgrade, onExtendTrial }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 p-8 text-white text-center">
          <AlertCircle size={48} className="mx-auto mb-4" />
          <h2 className="text-2xl font-bold">Trial Period Ended</h2>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6 text-center">
          <p className="text-slate-700 text-lg">
            Your free 14-day trial has ended. Upgrade to a paid plan to continue using ShopOS.
          </p>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 text-left">
            <p className="font-semibold text-slate-900 mb-3">What you get with a paid plan:</p>
            <ul className="space-y-2 text-sm text-slate-700">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                Unlimited invoices & transactions
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                Full analytics & reporting
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                Multi-firm support (Business plan+)
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                Priority customer support
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-4">
            <button
              onClick={onUpgrade}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-4 px-6 rounded-lg transition-all flex items-center justify-center gap-2"
            >
              Upgrade Now
              <ChevronRight size={20} />
            </button>
            <button
              onClick={onExtendTrial}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold py-3 px-6 rounded-lg transition-all"
            >
              Extend Trial (7 days)
            </button>
          </div>

          <p className="text-xs text-slate-500 pt-2">
            Limited to one 7-day extension
          </p>
        </div>
      </div>
    </div>
  );
}

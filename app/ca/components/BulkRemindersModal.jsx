'use client';

import { useState } from 'react';

export default function BulkRemindersModal({ selectedFirmIds, firmNames, onClose }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [sendVia, setSendVia] = useState('whatsapp');
  const [message, setMessage] = useState(
    'Hi, please update your books with latest invoices and make sure all transactions are recorded. This will help me prepare accurate GST filings.'
  );

  const handleSend = async () => {
    if (!message.trim()) {
      setError('Message cannot be empty');
      return;
    }

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const { data: { session } } = await (await import('@supabase/supabase-js')).createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ).auth.getSession();

      const response = await fetch('/api/ca/send-bulk-reminders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          firmIds: Array.from(selectedFirmIds),
          messageTemplate: message,
          sendVia,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Send failed');
      }

      const data = await response.json();
      setSuccess(`✅ Sent to ${data.summary.sent}/${data.summary.total} clients`);
      setTimeout(() => onClose(), 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4 sticky top-0 bg-white pb-3 border-b">
          <h2 className="text-xl font-bold text-gray-900">💬 Send Bulk Reminder</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Selected Firms */}
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <p className="text-sm font-medium text-blue-900 mb-2">Sending to {selectedFirmIds.size} client(s):</p>
          <div className="flex flex-wrap gap-2">
            {firmNames.map((name, idx) => (
              <span key={idx} className="inline-block px-2 py-1 bg-blue-200 text-blue-900 rounded text-xs">
                {name}
              </span>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
            {success}
          </div>
        )}

        {/* Send Via */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">Send Via</label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                name="sendVia"
                value="whatsapp"
                checked={sendVia === 'whatsapp'}
                onChange={(e) => setSendVia(e.target.value)}
                className="w-4 h-4 cursor-pointer"
              />
              <span className="ml-2 text-sm text-gray-700">📱 WhatsApp</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="sendVia"
                value="email"
                checked={sendVia === 'email'}
                onChange={(e) => setSendVia(e.target.value)}
                className="w-4 h-4 cursor-pointer"
              />
              <span className="ml-2 text-sm text-gray-700">📧 Email</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="sendVia"
                value="both"
                checked={sendVia === 'both'}
                onChange={(e) => setSendVia(e.target.value)}
                className="w-4 h-4 cursor-pointer"
              />
              <span className="ml-2 text-sm text-gray-700">📱📧 Both (WhatsApp + Email)</span>
            </label>
          </div>
        </div>

        {/* Message Template */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Message
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={500}
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            placeholder="Enter your reminder message..."
          />
          <p className="text-xs text-gray-500 mt-1">
            {message.length}/500 characters
          </p>
        </div>

        {/* Quick Templates */}
        <div className="mb-6">
          <p className="text-xs font-medium text-gray-600 mb-2">Quick Templates:</p>
          <div className="space-y-2">
            <button
              onClick={() => setMessage('Hi, please update your books with latest invoices. This will help me prepare accurate GST filings.')}
              className="w-full text-left px-3 py-2 text-xs bg-gray-50 hover:bg-gray-100 rounded border border-gray-200 transition-colors"
            >
              📋 Standard GST Reminder
            </button>
            <button
              onClick={() => setMessage('Hi, I need your invoice details for the current month to reconcile GSTR-2B. Please share your updated books.')}
              className="w-full text-left px-3 py-2 text-xs bg-gray-50 hover:bg-gray-100 rounded border border-gray-200 transition-colors"
            >
              📊 GSTR-2B Reconciliation
            </button>
            <button
              onClick={() => setMessage('Hi, please ensure all purchase invoices are recorded in your books. This is important for GST compliance.')}
              className="w-full text-left px-3 py-2 text-xs bg-gray-50 hover:bg-gray-100 rounded border border-gray-200 transition-colors"
            >
              ✓ Purchase Invoice Reminder
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3 sticky bottom-0 bg-white pt-3 border-t">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-100 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={loading || !message.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 rounded-md transition-colors"
          >
            {loading ? 'Sending...' : `Send via ${sendVia === 'both' ? 'Both' : sendVia === 'whatsapp' ? 'WhatsApp' : 'Email'}`}
          </button>
        </div>
      </div>
    </div>
  );
}

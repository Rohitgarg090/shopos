'use client';
import ShopOS from '@/components/ShopOS';

// The logged-in app. Loaded only for signed-in users (see home-gate.jsx).
export default function AppShell() {
  return (
    <div className="relative w-full min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-950 dark:to-slate-900">
      <ShopOS />
    </div>
  );
}

'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const Spinner = () => (
  <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-950 to-slate-900">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500" />
  </div>
);
const AppShell = dynamic(() => import('./app-shell'), { ssr: false, loading: Spinner });

// Signed-in sessions are kept in sessionStorage under "sb-<project>-auth-token".
const hasStoredSession = () => {
  try {
    for (let i = 0; i < sessionStorage.length; i++) if (/^sb-.+-auth-token$/.test(sessionStorage.key(i) || '')) return true;
  } catch { /* storage blocked */ }
  return /[?&]code=/.test(window.location.search); // returning from an auth redirect
};

// Visitors get the server-rendered landing page (children). The app bundle and the Supabase client
// are downloaded only when this browser tab holds a session.
export default function HomeGate({ children }) {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    if (!hasStoredSession()) { document.documentElement.removeAttribute('data-auth'); return; }
    let live = true;
    import('@/lib/supabase').then(({ supabase }) => supabase.auth.getSession()).then(({ data }) => {
      if (!live) return;
      if (data?.session) setSignedIn(true);
      else document.documentElement.removeAttribute('data-auth');
    }).catch(() => document.documentElement.removeAttribute('data-auth'));
    return () => { live = false; };
  }, []);
  return signedIn ? <AppShell /> : children;
}

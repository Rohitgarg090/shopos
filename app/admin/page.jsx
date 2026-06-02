'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import AdminPanel from '@/components/AdminPanel';

const ADMIN_EMAILS = ['rohitgarg090@gmail.com', 'info@shopos.co.in'];

export default function AdminPage() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('[admin] Checking auth...');

        // Get current session
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();

        console.log('[admin] Session check:', {
          hasSession: !!currentSession,
          userEmail: currentSession?.user?.email,
          error: error?.message
        });

        if (currentSession?.user?.email && ADMIN_EMAILS.map(e => e.toLowerCase()).includes(currentSession.user.email.toLowerCase())) {
          console.log('[admin] Access granted for:', currentSession.user.email);
          setSession(currentSession);
          setAccessDenied(false);
        } else {
          console.log('[admin] Access denied for:', currentSession?.user?.email);
          setAccessDenied(true);
          setSession(null);
        }
      } catch (err) {
        console.error('[admin] Auth error:', err);
        setAccessDenied(true);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#0A0A0F',
        color: '#F8FAFC',
      }}>
        <div style={{ fontSize: 14 }}>Loading...</div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#0A0A0F',
        color: '#F8FAFC',
        flexDirection: 'column',
        gap: 16,
        padding: 20,
      }}>
        <div style={{ fontSize: 18, fontWeight: 600 }}>⛔ Access Denied</div>
        <div style={{ fontSize: 12, color: '#94A3B8', maxWidth: 400, textAlign: 'center' }}>
          This admin panel is restricted to authorized administrators only.
        </div>
        <div style={{ fontSize: 11, color: '#64748B', maxWidth: 400, textAlign: 'center', marginTop: 8 }}>
          Please log in with your authorized admin account to continue.
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <a
            href="/auth?mode=login"
            style={{
              padding: '8px 16px',
              background: '#6366F1',
              color: '#fff',
              borderRadius: 6,
              textDecoration: 'none',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Login with Admin Email
          </a>
          <a
            href="/"
            style={{
              padding: '8px 16px',
              background: '#475569',
              color: '#fff',
              borderRadius: 6,
              textDecoration: 'none',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Back Home
          </a>
        </div>
      </div>
    );
  }

  return <AdminPanel session={session} />;
}

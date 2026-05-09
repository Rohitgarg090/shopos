'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import AdminPanel from '@/components/AdminPanel';

const ADMIN_EMAILS = ['info@shopos.co.in', 'rohitgarg090@gmail.com'];

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function AdminPage() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    const getSession = async () => {
      const {
        data: { session: ses },
      } = await supabase.auth.getSession();

      if (ses?.user?.email && ADMIN_EMAILS.includes(ses.user.email)) {
        setSession(ses);
      } else {
        setAccessDenied(true);
      }

      setLoading(false);
    };

    getSession();
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
      }}>
        <div style={{ fontSize: 18, fontWeight: 600 }}>Access Denied</div>
        <div style={{ fontSize: 12, color: '#94A3B8' }}>
          This admin panel is restricted to authorized administrators.
        </div>
        <a
          href="/"
          style={{
            marginTop: 16,
            padding: '8px 16px',
            background: '#6366F1',
            color: '#fff',
            borderRadius: 6,
            textDecoration: 'none',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          Back to App
        </a>
      </div>
    );
  }

  return <AdminPanel session={session} />;
}

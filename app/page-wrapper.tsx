"use client";

import React, { useEffect, useState } from "react";
import ShopOS from "@/components/ShopOS";
import { supabase } from "@/lib/supabase";
import dynamic from "next/dynamic";

const LandingPage = dynamic(() => import("./landing/page"), { ssr: false });

export default function PageWrapper() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setLoading(false);
    };
    checkSession();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-950 to-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  // Show landing page if not authenticated
  if (!session) {
    return <LandingPage />;
  }

  // Show ShopOS app if authenticated
  return (
    <div className="relative w-full min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-950 dark:to-slate-900">
      <ShopOS />
    </div>
  );
}

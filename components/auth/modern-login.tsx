"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import Button from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Input from "@/components/ui/input";
import { Mail, Lock, Loader2 } from "lucide-react";

interface ModernLoginProps {
  onLogin: (session: any) => void;
}

export default function ModernLogin({ onLogin }: ModernLoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"in" | "up">("in");

  const handleAuth = async () => {
    if (!email || !password) {
      setError("Email and password required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const redirectTo = window.location.origin + "/auth/callback";
      const res =
        mode === "in"
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({
              email,
              password,
              options: { emailRedirectTo: redirectTo },
            });

      if (res.error) throw res.error;

      if (mode === "up" && !res.data.session) {
        setError("Account created! Check email to confirm then sign in.");
        setMode("in");
        return;
      }

      onLogin(res.data.session);
    } catch (e: any) {
      setError(e.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl font-black text-white tracking-tight mb-2">
            SHOP<span className="bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">OS</span>
          </div>
          <p className="text-slate-400 text-sm font-semibold tracking-widest uppercase">
            Wholesale Management System
          </p>
        </div>

        {/* Login Card */}
        <Card variant="glass" className="border border-white/10 backdrop-blur-xl">
          <CardHeader className="pb-6">
            <CardTitle className="text-2xl">Welcome</CardTitle>
            <p className="text-sm text-slate-400 mt-2">
              Sign in to access your dashboard
            </p>
          </CardHeader>

          <CardContent>
            {/* Tab Toggle */}
            <div className="flex gap-2 mb-6 bg-slate-800/50 p-1 rounded-lg">
              {[
                { id: "in", label: "Sign In" },
                { id: "up", label: "Register" },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setMode(id as "in" | "up")}
                  className={`flex-1 py-2 px-4 rounded-md font-semibold transition-all text-sm ${
                    mode === id
                      ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg"
                      : "text-slate-400 hover:text-slate-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Email Input */}
            <div className="mb-4">
              <Input
                type="email"
                label="Email Address"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAuth()}
                icon={<Mail size={18} />}
                variant="glass"
                disabled={loading}
              />
            </div>

            {/* Password Input */}
            <div className="mb-6">
              <Input
                type="password"
                label="Password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAuth()}
                icon={<Lock size={18} />}
                variant="glass"
                disabled={loading}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div
                className={`mb-6 p-3 rounded-lg text-sm font-medium ${
                  error.includes("created")
                    ? "bg-green-500/20 text-green-300 border border-green-500/30"
                    : "bg-red-500/20 text-red-300 border border-red-500/30"
                }`}
              >
                {error}
              </div>
            )}

            {/* Submit Button */}
            <Button
              onClick={handleAuth}
              disabled={loading}
              variant="primary"
              fullWidth
              size="lg"
              className="font-bold"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Processing...
                </>
              ) : mode === "in" ? (
                "Sign In"
              ) : (
                "Create Account"
              )}
            </Button>

            {/* Footer */}
            <p className="text-center text-xs text-slate-500 mt-6">
              Secure authentication powered by Supabase
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

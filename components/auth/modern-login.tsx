"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Button from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Input from "@/components/ui/input";
import { Mail, Lock, Loader2, User, Building2 } from "lucide-react";

interface ModernLoginProps {
  onLogin: (session: any) => void;
}

export default function ModernLogin({ onLogin }: ModernLoginProps) {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [firmId, setFirmId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"in" | "up" | "forgot">("in");

  // Read mode from URL query parameters
  useEffect(() => {
    const urlMode = searchParams.get("mode");
    if (urlMode === "signup" || urlMode === "up") {
      setMode("up");
    } else if (urlMode === "login" || urlMode === "in") {
      setMode("in");
    } else if (urlMode === "forgot") {
      setMode("forgot");
    }
  }, [searchParams]);
  const [forgotStep, setForgotStep] = useState<"email" | "otp" | "reset">("email");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleAuth = async () => {
    if (!email || !password) {
      setError("Email and password required");
      return;
    }

    if (mode === "up" && (!name || !firmId)) {
      setError("Name and Firm ID are required to register");
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (mode === "in") {
        const res = await supabase.auth.signInWithPassword({ email, password });
        if (res.error) throw res.error;
        onLogin(res.data.session);
      } else {
        // Controlled registration: validate firm + create join request
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, name, firmId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setError(data.message || "Request submitted! Sign in and you'll see the pending status.");
        setMode("in");
        setName("");
        setFirmId("");
      }
    } catch (e: any) {
      setError(e.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (forgotStep === "email") {
      if (!email) {
        setError("Please enter your email");
        return;
      }
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setError("OTP sent to your email");
        setForgotStep("otp");
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    } else if (forgotStep === "otp") {
      if (!otp) {
        setError("Please enter the OTP");
        return;
      }
      setForgotStep("reset");
    } else if (forgotStep === "reset") {
      if (!newPassword || !confirmPassword) {
        setError("Please enter both passwords");
        return;
      }
      if (newPassword !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }
      if (newPassword.length < 6) {
        setError("Password must be at least 6 characters");
        return;
      }

      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/auth/verify-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, otp, newPassword }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setError("Password reset successful! Redirecting to login...");
        setTimeout(() => {
          setMode("in");
          setForgotStep("email");
          setEmail("");
          setOtp("");
          setNewPassword("");
          setConfirmPassword("");
          setError("");
        }, 2000);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
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
            <CardTitle className="text-2xl">{mode === "up" ? "Request Access" : "Welcome"}</CardTitle>
            <p className="text-sm text-slate-400 mt-2">
              {mode === "up"
                ? "Provide your Firm ID — your admin will approve your access"
                : "Sign in to access your dashboard"}
            </p>
          </CardHeader>

          <CardContent>
            {/* Tab Toggle */}
            {mode !== "forgot" && (
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
            )}

            {/* Forgot Password Header */}
            {mode === "forgot" && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-2">Reset Password</h3>
                <p className="text-sm text-slate-400">
                  {forgotStep === "email" && "Enter your email to receive an OTP"}
                  {forgotStep === "otp" && "Enter the OTP sent to your email"}
                  {forgotStep === "reset" && "Enter your new password"}
                </p>
              </div>
            )}

            {/* Name + Firm ID — only for Register mode */}
            {mode === "up" && (
              <>
                <div className="mb-4">
                  <Input
                    type="text"
                    label="Full Name"
                    placeholder="Your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    icon={<User size={18} />}
                    variant="glass"
                    disabled={loading}
                  />
                </div>
                <div className="mb-4">
                  <Input
                    type="text"
                    label="Firm ID"
                    placeholder="Get this from your firm admin"
                    value={firmId}
                    onChange={(e) => setFirmId(e.target.value.trim())}
                    icon={<Building2 size={18} />}
                    variant="glass"
                    disabled={loading}
                  />
                  <p className="text-xs text-slate-500 mt-1 pl-1">
                    Ask your firm owner or manager for the Firm ID
                  </p>
                </div>
              </>
            )}

            {/* Email Input - Show for Sign In, Register, and Forgot Email step */}
            {mode !== "forgot" || forgotStep === "email" ? (
              <div className="mb-4">
                <Input
                  type="email"
                  label="Email Address"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (mode === "forgot" ? handleForgotPassword() : handleAuth())}
                  icon={<Mail size={18} />}
                  variant="glass"
                  disabled={loading}
                />
              </div>
            ) : null}

            {/* OTP Input - Show in OTP step */}
            {mode === "forgot" && (forgotStep === "otp" || forgotStep === "reset") && (
              <div className="mb-4">
                <Input
                  type="text"
                  label="OTP"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.slice(0, 6))}
                  disabled={loading || forgotStep === "reset"}
                  variant="glass"
                />
              </div>
            )}

            {/* Password Input - Show for Sign In and Register */}
            {(mode === "in" || mode === "up") && (
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
            )}

            {/* New Password Input - Show in reset step */}
            {mode === "forgot" && forgotStep === "reset" && (
              <>
                <div className="mb-4">
                  <Input
                    type="password"
                    label="New Password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    icon={<Lock size={18} />}
                    variant="glass"
                    disabled={loading}
                  />
                </div>
                <div className="mb-6">
                  <Input
                    type="password"
                    label="Confirm Password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleForgotPassword()}
                    icon={<Lock size={18} />}
                    variant="glass"
                    disabled={loading}
                  />
                </div>
              </>
            )}

            {/* Error Message */}
            {error && (
              <div
                className={`mb-6 p-3 rounded-lg text-sm font-medium ${
                  error.includes("successful") || error.includes("sent") || error.includes("submitted") || error.includes("created") || error.includes("Request")
                    ? "bg-green-500/20 text-green-300 border border-green-500/30"
                    : "bg-red-500/20 text-red-300 border border-red-500/30"
                }`}
              >
                {error}
              </div>
            )}

            {/* Submit Button */}
            <Button
              onClick={mode === "forgot" ? handleForgotPassword : handleAuth}
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
              ) : mode === "up" ? (
                "Submit Request"
              ) : forgotStep === "email" ? (
                "Send OTP"
              ) : forgotStep === "otp" ? (
                "Verify OTP"
              ) : (
                "Reset Password"
              )}
            </Button>

            {/* Forgot Password Link - Show in Sign In mode */}
            {mode === "in" && (
              <button
                onClick={() => {
                  setMode("forgot");
                  setForgotStep("email");
                  setError("");
                  setEmail("");
                }}
                className="w-full text-center text-sm text-slate-400 hover:text-orange-400 mt-4 transition-colors"
              >
                Forgot your password?
              </button>
            )}

            {/* Back Button - Show in Forgot Password mode */}
            {mode === "forgot" && (
              <button
                onClick={() => {
                  setMode("in");
                  setForgotStep("email");
                  setError("");
                  setEmail("");
                  setOtp("");
                  setNewPassword("");
                  setConfirmPassword("");
                }}
                className="w-full text-center text-sm text-slate-400 hover:text-orange-400 mt-4 transition-colors"
              >
                ← Back to Sign In
              </button>
            )}

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

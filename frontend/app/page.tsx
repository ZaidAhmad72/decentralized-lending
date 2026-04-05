"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import GoogleTranslateSwitcher from "@/components/GoogleTranslateSwitcher";
import ThemeToggle from "@/components/ThemeToggle";
import { gsap } from "gsap";

function InputField({
  label, icon, children,
}: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">
        {label}
      </label>
      <div className="flex items-center bg-slate-50 dark:bg-slate-800 rounded-2xl px-4 py-3.5 border border-slate-200 dark:border-slate-700 gap-3 focus-within:border-blue-500 dark:focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
        <span className="text-slate-400 flex-shrink-0">{icon}</span>
        <div className="w-px h-4 bg-slate-200 dark:bg-slate-600" />
        {children}
      </div>
    </div>
  );
}

export default function AuthPage() {
  const router = useRouter();
  const supabase = createClient();

  const leftPanelRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const tl = gsap.timeline({ defaults: { ease: "power2.out" } });

    if (leftPanelRef.current) {
      tl.fromTo(leftPanelRef.current, { opacity: 0, x: -30 }, { opacity: 1, x: 0, duration: 0.6 });
    }
    if (formRef.current) {
      tl.fromTo(formRef.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5 }, "-=0.3");
    }
  }, []);

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);

  const handleSubmit = async () => {
    setError("");
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (mode === "signup") {
      if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
      if (!name.trim()) { setError("Please enter your name."); return; }
      if (!age || Number(age) < 18) { setError("Age must be 18 or older."); return; }
    }
    setLoading(true);
    if (mode === "signup") {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (signUpError) { setError(signUpError.message); setLoading(false); return; }
      const user = data.user;
      if (user) {
        const { data: existing } = await supabase.from("profiles").select("id").eq("id", user.id).single();
        if (!existing) {
          const walletAddress = `0x${user.id.replace(/-/g, '').slice(0, 40)}`;
          const { error: profileError } = await supabase.from("profiles").insert([{
            id: user.id, email, name: name.trim(), age: Number(age),
            reputation_score: 0, wallet_address: walletAddress, wallet_balance: 2.0,
          }]);
          if (profileError) { setError(profileError.message); setLoading(false); return; }
        }
        router.push("/dashboard");
      }
    } else {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email, options: { shouldCreateUser: false },
      });
      if (otpError) { setError("Failed to send OTP. Please check your email."); setLoading(false); return; }
      setOtpSent(true);
      setError("OTP sent! Check your email.");
    }
    setLoading(false);
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) { setError("Please enter a valid 6-digit OTP."); return; }
    setVerifying(true); setError("");
    const { error: verifyError } = await supabase.auth.verifyOtp({ email, token: otp, type: "email" });
    if (verifyError) { setError("Invalid OTP. Please try again."); setVerifying(false); return; }
    router.push("/dashboard");
    setVerifying(false);
  };

  const handleResendOtp = async () => {
    setError(""); setLoading(true);
    const { error: otpError } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
    setError(otpError ? "Failed to resend OTP." : "OTP resent! Check your email.");
    setLoading(false);
  };

  const switchMode = () => {
    setMode(mode === "login" ? "signup" : "login");
    setError(""); setPassword(""); setOtpSent(false); setOtp("");
  };

  const isLoading = loading || verifying;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col lg:flex-row transition-colors">

      {/* ── Left panel — branding (desktop only) ── */}
      <div ref={leftPanelRef} className="hidden lg:flex lg:w-[45%] xl:w-[40%] bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 flex-col justify-between p-12 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/5 rounded-full" />
          <div className="absolute -bottom-32 -left-16 w-80 h-80 bg-white/5 rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/3 rounded-full" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
              </svg>
            </div>
            <span className="text-white font-bold text-2xl tracking-tight">Vault</span>
          </div>

          <h2 className="text-4xl xl:text-5xl font-black text-white leading-tight mb-6">
            Decentralized<br />Lending,<br />Simplified.
          </h2>
          <p className="text-blue-100 text-lg leading-relaxed max-w-sm">
            Deposit, borrow, and repay with full transparency. Your credit score, your control.
          </p>
        </div>

        <div className="relative z-10 grid grid-cols-3 gap-4">
          {[
            { label: "Pool Liquidity", value: "₹2.4L+" },
            { label: "Active Users", value: "1,200+" },
            { label: "Avg Credit Score", value: "720" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white/10 backdrop-blur rounded-2xl p-4">
              <p className="text-white font-black text-xl">{stat.value}</p>
              <p className="text-blue-200 text-xs mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 lg:py-0">
        <div ref={formRef} className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="flex items-center justify-between mb-8 lg:hidden">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
                </svg>
              </div>
              <span className="text-slate-900 dark:text-white font-bold text-xl">Vault</span>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <GoogleTranslateSwitcher />
            </div>
          </div>

          {/* Desktop controls */}
          <div className="hidden lg:flex justify-end mb-6 gap-2">
            <ThemeToggle />
            <GoogleTranslateSwitcher />
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">
              {mode === "login" ? (otpSent ? "Check your email" : "Welcome back") : "Create your account"}
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              {mode === "login"
                ? otpSent ? "Enter the 6-digit code we sent you." : "We'll send a secure one-time code."
                : "Join Vault and start lending today."}
            </p>
          </div>

          {/* Form */}
          <div className="space-y-0">
            <InputField label="Email Address" icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
              </svg>
            }>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={otpSent && mode === "login"}
                className="flex-1 outline-none text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 bg-transparent disabled:opacity-50"
              />
            </InputField>

            {mode === "login" && otpSent && (
              <InputField label="One-Time Password" icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
                </svg>
              }>
                <input
                  type="text" value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  onKeyDown={(e) => e.key === "Enter" && handleVerifyOtp()}
                  placeholder="123456" maxLength={6}
                  className="flex-1 outline-none text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 bg-transparent tracking-[0.3em] font-mono"
                />
                <button onClick={handleResendOtp} disabled={isLoading}
                  className="text-xs text-blue-600 dark:text-blue-400 font-semibold whitespace-nowrap hover:underline disabled:opacity-50">
                  Resend
                </button>
              </InputField>
            )}

            {mode === "signup" && (
              <>
                <InputField label="Password" icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                  </svg>
                }>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    className="flex-1 outline-none text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 bg-transparent" />
                </InputField>

                <InputField label="Full Name" icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                  </svg>
                }>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    className="flex-1 outline-none text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 bg-transparent" />
                </InputField>

                <InputField label="Age" icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z" />
                  </svg>
                }>
                  <input type="number" value={age} onChange={(e) => setAge(e.target.value)}
                    placeholder="Must be 18+" min="18"
                    className="flex-1 outline-none text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 bg-transparent" />
                </InputField>
              </>
            )}
          </div>

          {/* Error / info */}
          {error && (
            <div className={`rounded-2xl px-4 py-3 text-sm mb-4 ${
              error.includes("sent") || error.includes("resent")
                ? "bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400"
                : "bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400"
            }`}>
              {error}
            </div>
          )}

          {/* CTA button */}
          <button
            onClick={mode === "login" && otpSent ? handleVerifyOtp : handleSubmit}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl py-4 font-bold text-base flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] shadow-lg shadow-blue-500/25 disabled:opacity-60 disabled:cursor-not-allowed mb-4"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.3" /><path d="M12 2a10 10 0 0 1 10 10" />
                </svg>
                Please wait...
              </>
            ) : (
              <>
                {mode === "login" && otpSent ? "Verify & Sign In" : mode === "login" ? "Send OTP" : "Create Account"}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                  <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
                </svg>
              </>
            )}
          </button>

          {/* Mode toggle */}
          <p className="text-center text-sm text-slate-500 dark:text-slate-400 mb-6">
            {mode === "login" ? "New to Vault? " : "Already have an account? "}
            <button onClick={switchMode} className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">
              {mode === "login" ? "Create account" : "Sign in"}
            </button>
          </p>

          {/* Trust badges */}
          <div className="flex items-center gap-3 p-4 bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="w-9 h-9 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#16a34a">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
                {mode === "login" ? "Secure OTP Login" : "Bank-grade Security"}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {mode === "login" ? "No password stored. Email OTP only." : "Your data is encrypted and non-custodial."}
              </p>
            </div>
          </div>

          <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-6">
            By continuing, you agree to our{" "}
            <span className="text-blue-600 dark:text-blue-400 cursor-pointer hover:underline">Terms</span> and{" "}
            <span className="text-blue-600 dark:text-blue-400 cursor-pointer hover:underline">Privacy Policy</span>.
          </p>
        </div>
      </div>
    </div>
  );
}

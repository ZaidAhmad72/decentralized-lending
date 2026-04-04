"use client";

import { useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

// ─── helpers ────────────────────────────────────────────────────────────────

async function checkUserExists(supabase: ReturnType<typeof createClient>, email: string) {
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .single();
  return !!data;
}

async function signupUser(
  supabase: ReturnType<typeof createClient>,
  email: string,
  name: string,
  age: number
) {
  // Step 1: create auth user via OTP (disabled for now — auto-confirm assumed)
  const { data: signInData, error: signInError } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  if (signInError) throw signInError;

  // Step 2: get the session/user that was just created
  // Since OTP is disabled (auto-confirm on), getUser works immediately
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw userError ?? new Error("No user found");

  // Step 3: insert profile
  const { error: profileError } = await supabase.from("profiles").insert([
    { id: userData.user.id, email, name, age, trust_score: 50 },
  ]);
  if (profileError) throw profileError;

  return userData.user;
}

async function loginUser(supabase: ReturnType<typeof createClient>, email: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false },
  });
  if (error) throw error;
}

// ─── component ──────────────────────────────────────────────────────────────

export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [step, setStep] = useState<"form" | "otp">("form");

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [age, setAge] = useState("");

  // OTP state — kept but bypassed for now
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const otpRefs = Array.from({ length: 6 }, () => useRef<HTMLInputElement>(null));

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(
    searchParams.get("error") ? "Session expired. Please log in again." : ""
  );
  const [successMsg, setSuccessMsg] = useState("");

  // ── OTP input handlers (kept for future re-enable) ──
  const handleOtpChange = (index: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[index] = val;
    setOtp(next);
    if (val && index < 5) otpRefs[index + 1].current?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs[index - 1].current?.focus();
    }
  };

  // ── Check email and route to correct mode ──
  const handleEmailContinue = async () => {
    setError("");
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    const exists = await checkUserExists(supabase, email);
    setLoading(false);
    if (exists) {
      setMode("login");
    } else {
      setMode("signup");
    }
    setStep("form");
  };

  // ── Signup submit ──
  const handleSignup = async () => {
    setError("");
    if (!name.trim()) { setError("Please enter your name."); return; }
    if (!age || isNaN(Number(age)) || Number(age) < 18) {
      setError("Please enter a valid age (18+).");
      return;
    }
    setLoading(true);
    try {
      // OTP DISABLED: using signInWithPassword workaround via magic link auto-confirm
      // When OTP is re-enabled, this will send OTP and move to step "otp"
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
      if (signInError) throw signInError;

      // Since "Confirm email" is OFF in Supabase, user is auto-confirmed
      // Fetch the user immediately
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        // Check if profile already exists to avoid duplicate insert
        const { data: existing } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", userData.user.id)
          .single();

        if (!existing) {
          await supabase.from("profiles").insert([
            { id: userData.user.id, email, name: name.trim(), age: Number(age), trust_score: 50 },
          ]);
        }
        router.push("/dashboard");
      } else {
        setSuccessMsg("Check your email to complete signup.");
        setStep("otp");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Signup failed.");
    }
    setLoading(false);
  };

  // ── Login submit ──
  const handleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
      });
      if (signInError) throw signInError;

      // Since "Confirm email" is OFF, user is auto-logged in
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        router.push("/dashboard");
      } else {
        setSuccessMsg("Check your email for your login link.");
        setStep("otp");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed.");
    }
    setLoading(false);
  };

  // ── OTP verify (re-enable when SMTP is ready) ──
  const handleVerifyOtp = async () => {
    setError("");
    const token = otp.join("");
    if (token.length < 6) { setError("Please enter the full 6-digit code."); return; }
    setLoading(true);
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email, token, type: "email",
    });
    if (verifyError) { setLoading(false); setError(verifyError.message); return; }

    if (data.user && mode === "signup") {
      await supabase.from("profiles").insert([
        { id: data.user.id, email, name: name.trim(), age: Number(age), trust_score: 50 },
      ]);
    }
    setLoading(false);
    router.push("/dashboard");
  };

  const isLoginMode = mode === "login";
  const headingText = isLoginMode ? "Welcome back." : "Create account.";
  const subText = isLoginMode
    ? "Log in to access your decentralized assets."
    : "Sign up to get started on Vault.";

  return (
    <div className="min-h-screen bg-[#eef2f7] flex flex-col lg:items-center lg:justify-center">
      <div className="w-full max-w-sm mx-auto flex flex-col px-6 pt-10 pb-8 lg:bg-white lg:rounded-3xl lg:shadow-lg lg:my-8">

        {/* Logo */}
        <div className="mb-8">
          <span className="text-[#1a2fb8] font-bold text-xl tracking-tight">Vault</span>
        </div>

        {/* Heading */}
        <div className="mb-8">
          <h1 className="text-4xl font-black text-[#111827] leading-tight mb-2">{headingText}</h1>
          <p className="text-[#6b7280] text-base leading-relaxed">{subText}</p>
        </div>

        {step === "form" && (
          <>
            {/* Email */}
            <div className="mb-4">
              <label className="block text-xs font-semibold tracking-widest text-[#6b7280] uppercase mb-2">
                Email Address
              </label>
              <div className="flex items-center bg-white rounded-2xl px-4 py-4 shadow-sm border border-[#e5e9f0] gap-3">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#6b7280" className="flex-shrink-0">
                  <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                </svg>
                <div className="w-px h-5 bg-[#d1d5db]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="flex-1 outline-none text-base text-[#374151] placeholder-[#9ca3af] bg-transparent"
                />
              </div>
            </div>

            {/* Signup-only fields */}
            {mode === "signup" && (
              <>
                <div className="mb-4">
                  <label className="block text-xs font-semibold tracking-widest text-[#6b7280] uppercase mb-2">
                    Full Name
                  </label>
                  <div className="flex items-center bg-white rounded-2xl px-4 py-4 shadow-sm border border-[#e5e9f0] gap-3">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#6b7280" className="flex-shrink-0">
                      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                    </svg>
                    <div className="w-px h-5 bg-[#d1d5db]" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your full name"
                      className="flex-1 outline-none text-base text-[#374151] placeholder-[#9ca3af] bg-transparent"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-xs font-semibold tracking-widest text-[#6b7280] uppercase mb-2">
                    Age
                  </label>
                  <div className="flex items-center bg-white rounded-2xl px-4 py-4 shadow-sm border border-[#e5e9f0] gap-3">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#6b7280" className="flex-shrink-0">
                      <path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z" />
                    </svg>
                    <div className="w-px h-5 bg-[#d1d5db]" />
                    <input
                      type="number"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder="Your age"
                      min="18"
                      max="120"
                      className="flex-1 outline-none text-base text-[#374151] placeholder-[#9ca3af] bg-transparent"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Submit button */}
            <button
              onClick={mode === "signup" ? handleSignup : handleLogin}
              disabled={loading}
              className="w-full bg-[#1a2fb8] text-white rounded-2xl py-5 font-bold text-lg flex items-center justify-center gap-3 hover:bg-[#1527a0] transition-all active:scale-95 mb-4 disabled:opacity-70"
            >
              {loading ? "Please wait..." : isLoginMode ? "Log In" : "Sign Up"}
              {!loading && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
                </svg>
              )}
            </button>

            {/* Mode toggle */}
            <p className="text-center text-sm text-[#6b7280] mb-6">
              {isLoginMode ? "New to Vault? " : "Already have an account? "}
              <button
                onClick={() => {
                  setMode(isLoginMode ? "signup" : "login");
                  setError("");
                  setSuccessMsg("");
                }}
                className="text-[#1a2fb8] font-bold"
              >
                {isLoginMode ? "Sign up" : "Log in"}
              </button>
            </p>
          </>
        )}

        {/* OTP step — kept, disabled for now, will activate when SMTP ready */}
        {step === "otp" && (
          <>
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-semibold tracking-widest text-[#6b7280] uppercase">
                  Verification Code
                </label>
                <button
                  onClick={() => { setStep("form"); setOtp(["","","","","",""]); }}
                  className="text-xs font-bold text-[#1a2fb8] tracking-widest uppercase"
                >
                  Back
                </button>
              </div>
              <div className="flex gap-2">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={otpRefs[i]}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    className="flex-1 aspect-square bg-white rounded-2xl text-center text-xl font-bold text-[#111827] border border-[#e5e9f0] shadow-sm outline-none focus:border-[#1a2fb8] transition-colors"
                  />
                ))}
              </div>
            </div>
            <button
              onClick={handleVerifyOtp}
              disabled={loading}
              className="w-full bg-[#1a2fb8] text-white rounded-2xl py-5 font-bold text-lg hover:bg-[#1527a0] transition-all active:scale-95 mb-6 disabled:opacity-70"
            >
              {loading ? "Verifying..." : "Verify & Continue"}
            </button>
          </>
        )}

        {/* Messages */}
        {successMsg && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-2xl px-4 py-3 mb-4">
            {successMsg}
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-2xl px-4 py-3 mb-4">
            {error}
          </div>
        )}

        {/* Security Badge */}
        <div className="bg-white rounded-2xl p-4 flex items-start gap-4 mb-6 border border-[#e5e9f0] shadow-sm">
          <div className="w-10 h-10 bg-[#4ade80] rounded-xl flex items-center justify-center flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#14532d">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-bold text-[#16a34a] tracking-widest uppercase mb-1">
              Institutional Security
            </p>
            <p className="text-sm text-[#374151] leading-relaxed">
              Your identity is verified on-chain. Secure, private, and non-custodial.
            </p>
          </div>
        </div>

        {/* Protocol Status */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-2 h-2 rounded-full bg-[#4ade80]" />
          <span className="text-xs font-semibold tracking-widest text-[#6b7280] uppercase">
            Decentralized Protocol Live
          </span>
        </div>

        <p className="text-center text-xs text-[#9ca3af] leading-relaxed mt-auto">
          By continuing, you agree to our{" "}
          <span className="text-[#1a2fb8] underline cursor-pointer">Terms of Service</span> and{" "}
          <span className="text-[#1a2fb8] underline cursor-pointer">Privacy Policy</span>.
        </p>
      </div>
    </div>
  );
}

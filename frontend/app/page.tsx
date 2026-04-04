"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const otpRefs = Array.from({ length: 6 }, () => useRef<HTMLInputElement>(null));

  const handleSendOtp = async () => {
    setError("");
    setSuccessMsg("");
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    const { error: otpError } = await supabase.auth.signInWithOtp({ email });
    setLoading(false);
    if (otpError) {
      setError(otpError.message);
    } else {
      setSuccessMsg(`OTP sent to ${email}`);
      setOtpSent(true);
    }
  };

  const handleResend = async () => {
    setError("");
    setSuccessMsg("");
    setOtp(["", "", "", "", "", ""]);
    await handleSendOtp();
  };

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

  const handleVerify = async () => {
    setError("");
    const token = otp.join("");
    if (token.length < 6) {
      setError("Please enter the full 6-digit code.");
      return;
    }
    setLoading(true);
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    });
    if (verifyError) {
      setLoading(false);
      setError(verifyError.message);
      return;
    }

    // Upsert profile on first login
    if (data.user) {
      await supabase.from("profiles").upsert(
        { id: data.user.id, email: data.user.email },
        { onConflict: "id", ignoreDuplicates: true }
      );
    }

    setLoading(false);
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-[#eef2f7] flex flex-col lg:items-center lg:justify-center">
      <div className="w-full max-w-sm mx-auto flex flex-col px-6 pt-10 pb-8 lg:bg-white lg:rounded-3xl lg:shadow-lg lg:my-8">

        {/* Logo */}
        <div className="mb-10">
          <span className="text-[#1a2fb8] font-bold text-xl tracking-tight">Vault</span>
        </div>

        {/* Heading */}
        <div className="mb-10">
          <h1 className="text-4xl font-black text-[#111827] leading-tight mb-3">Welcome back.</h1>
          <p className="text-[#6b7280] text-base leading-relaxed">
            Access your decentralized assets securely with email verification.
          </p>
        </div>

        {/* Email Input */}
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
              onKeyDown={(e) => e.key === "Enter" && !otpSent && handleSendOtp()}
              placeholder="Enter your email"
              disabled={otpSent}
              className="flex-1 outline-none text-base text-[#374151] placeholder-[#9ca3af] bg-transparent disabled:opacity-60"
            />
            <div className="w-8 h-8 bg-[#1a2fb8] rounded-full flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Send OTP Button */}
        {!otpSent && (
          <button
            onClick={handleSendOtp}
            disabled={loading}
            className="w-full bg-[#1a2fb8] text-white rounded-2xl py-5 font-bold text-lg flex items-center justify-center gap-3 hover:bg-[#1527a0] transition-all active:scale-95 mb-8 disabled:opacity-70"
          >
            {loading ? "Sending..." : "Send OTP"}
            {!loading && (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
              </svg>
            )}
          </button>
        )}

        {/* OTP Section */}
        {otpSent && (
          <>
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-semibold tracking-widest text-[#6b7280] uppercase">
                  Verification Code
                </label>
                <button
                  onClick={handleResend}
                  disabled={loading}
                  className="text-xs font-bold text-[#1a2fb8] tracking-widest uppercase disabled:opacity-50"
                >
                  Resend Code
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
              onClick={handleVerify}
              disabled={loading}
              className="w-full bg-[#1a2fb8] text-white rounded-2xl py-5 font-bold text-lg hover:bg-[#1527a0] transition-all active:scale-95 mb-6 disabled:opacity-70"
            >
              {loading ? "Verifying..." : "Verify & Login"}
            </button>
          </>
        )}

        {/* Success message */}
        {successMsg && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-2xl px-4 py-3 mb-4">
            {successMsg}
          </div>
        )}

        {/* Error message */}
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

        {/* Terms */}
        <p className="text-center text-xs text-[#9ca3af] leading-relaxed mt-auto">
          By continuing, you agree to our{" "}
          <span className="text-[#1a2fb8] underline cursor-pointer">Terms of Service</span> and acknowledge our{" "}
          <span className="text-[#1a2fb8] underline cursor-pointer">Privacy Policy</span>.
        </p>
      </div>
    </div>
  );
}

"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState(["", "", "", ""]);
  const otpRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const handleOtpChange = (index: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[index] = val;
    setOtp(next);
    if (val && index < 3) otpRefs[index + 1].current?.focus();
  };

  const handleLogin = () => {
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
          Access your decentralized assets securely with mobile verification.
        </p>
      </div>

      {/* Phone Input */}
      <div className="mb-4">
        <label className="block text-xs font-semibold tracking-widest text-[#6b7280] uppercase mb-2">
          Phone Number
        </label>
        <div className="flex items-center bg-white rounded-2xl px-4 py-4 shadow-sm border border-[#e5e9f0] gap-3">
          <span className="text-[#374151] font-semibold text-base">+1</span>
          <div className="w-px h-5 bg-[#d1d5db]" />
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="000 000 0000"
            className="flex-1 outline-none text-base text-[#374151] placeholder-[#9ca3af] bg-transparent"
          />
          <div className="w-8 h-8 bg-[#1a2fb8] rounded-full flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Send OTP Button */}
      <button
        onClick={() => setOtpSent(true)}
        className="w-full bg-[#1a2fb8] text-white rounded-2xl py-5 font-bold text-lg flex items-center justify-center gap-3 hover:bg-[#1527a0] transition-all active:scale-95 mb-8"
      >
        Send OTP
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
          <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
        </svg>
      </button>

      {/* OTP Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-semibold tracking-widest text-[#6b7280] uppercase">
            Verification Code
          </label>
          <button className="text-xs font-bold text-[#1a2fb8] tracking-widest uppercase">
            Resend Code
          </button>
        </div>
        <div className="flex gap-3">
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={otpRefs[i]}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleOtpChange(i, e.target.value)}
              className="flex-1 aspect-square bg-white rounded-2xl text-center text-xl font-bold text-[#111827] border border-[#e5e9f0] shadow-sm outline-none focus:border-[#1a2fb8] transition-colors"
            />
          ))}
        </div>
      </div>

      {/* Login Button (shown after OTP entry) */}
      {otpSent && (
        <button
          onClick={handleLogin}
          className="w-full bg-[#1a2fb8] text-white rounded-2xl py-5 font-bold text-lg hover:bg-[#1527a0] transition-all active:scale-95 mb-6"
        >
          Verify & Login
        </button>
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

      {/* Auth Icons */}
      <div className="flex items-center justify-center gap-6 mb-6">
        <div className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm border border-[#e5e9f0]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#6b7280">
              <path d="M17.81 4.47c-.08 0-.16-.02-.23-.06C15.66 3.42 14 3 12.01 3c-1.98 0-3.86.47-5.57 1.41-.24.13-.54.04-.68-.2-.13-.24-.04-.55.2-.68C7.82 2.52 9.86 2 12.01 2c2.13 0 3.99.47 6.03 1.52.25.13.34.43.21.67-.09.18-.26.28-.44.28zM3.5 9.72c-.1 0-.2-.03-.29-.09-.23-.16-.28-.47-.12-.7.99-1.4 2.25-2.5 3.75-3.27C9.98 4.04 14 4.03 17.15 6.65c1.5.77 2.76 1.86 3.75 3.25.16.22.11.54-.12.7-.23.16-.54.11-.7-.12-.9-1.26-2.04-2.25-3.39-2.94-2.87-2.43-6.62-2.43-9.49.01-1.36.69-2.5 1.68-3.4 2.94-.09.14-.25.23-.3.23zm6.25 2.89c-.1 0-.2-.03-.29-.09-.23-.16-.28-.47-.12-.7.49-.68 1.12-1.21 1.87-1.58 1.56-.76 3.4-.76 4.96 0 .75.37 1.38.9 1.87 1.58.16.22.11.54-.12.7-.23.16-.54.11-.7-.12-.39-.53-.89-.97-1.49-1.26-1.23-.6-2.68-.6-3.91 0-.6.29-1.1.73-1.49 1.26-.09.14-.25.21-.58.21zM12 22c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1s1 .45 1 1v4c0 .55-.45 1-1 1z" />
            </svg>
          </div>
          <span className="text-[10px] text-[#9ca3af]">Biometric</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm border border-[#e5e9f0]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#6b7280">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
            </svg>
          </div>
          <span className="text-[10px] text-[#9ca3af]">Face ID</span>
        </div>
      </div>

      {/* Terms */}
      <p className="text-center text-xs text-[#9ca3af] leading-relaxed mt-auto">
        By continuing, you agree to our{" "}
        <span className="text-[#1a2fb8] underline cursor-pointer">Terms of Service</span> and acknowledge our{" "}
        <span className="text-[#1a2fb8] underline cursor-pointer">Privacy Policy</span>.
      </p>
      </div>{/* end inner card */}
    </div>
  );
}

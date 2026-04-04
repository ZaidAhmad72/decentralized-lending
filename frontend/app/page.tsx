"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useI18n } from "@/i18n/I18nContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function AuthPage() {
  const router = useRouter();
  const supabase = createClient();
  const { t } = useI18n();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(t("auth.errorEmail"));
      return;
    }
    if (password.length < 6) {
      setError(t("auth.errorPassword"));
      return;
    }

    if (mode === "signup") {
      if (!name.trim()) { setError(t("auth.errorName")); return; }
      if (!age || Number(age) < 18) { setError(t("auth.errorAge")); return; }
    }

    setLoading(true);

    if (mode === "signup") {
      const { data, error: signUpError } = await supabase.auth.signUp({ email, password });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      const user = data.user;
      if (user) {
        const { data: existing } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .single();

        if (!existing) {
          const { error: profileError } = await supabase.from("profiles").insert([{
            id: user.id,
            email,
            name: name.trim(),
            age: Number(age),
            reputation_score: 0,
          }]);
          if (profileError) { setError(profileError.message); setLoading(false); return; }
        }
        router.push("/dashboard");
      }

    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

      if (signInError) {
        setError(t("auth.errorInvalidCredentials"));
        setLoading(false);
        return;
      }

      router.push("/dashboard");
    }

    setLoading(false);
  };

  const switchMode = () => {
    setMode(mode === "login" ? "signup" : "login");
    setError("");
    setPassword("");
  };

  return (
    <div className="min-h-screen bg-[#eef2f7] flex flex-col lg:items-center lg:justify-center">
      <div className="w-full max-w-sm mx-auto flex flex-col px-6 pt-10 pb-8 lg:bg-white lg:rounded-3xl lg:shadow-lg lg:my-8">

        {/* Logo */}
        <div className="mb-8 flex items-center justify-between">
          <span className="text-[#1a2fb8] font-bold text-xl tracking-tight">Vault</span>
          <LanguageSwitcher />
        </div>

        {/* Heading */}
        <div className="mb-8">
          <h1 className="text-4xl font-black text-[#111827] leading-tight mb-2">
            {mode === "login" ? t("auth.welcomeBack") : t("auth.createAccount")}
          </h1>
          <p className="text-[#6b7280] text-base leading-relaxed">
            {mode === "login" ? t("auth.loginSubtitle") : t("auth.signupSubtitle")}
          </p>
        </div>

        {/* Email */}
        <div className="mb-4">
          <label className="block text-xs font-semibold tracking-widest text-[#6b7280] uppercase mb-2">
            {t("auth.emailLabel")}
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
              placeholder={t("auth.emailPlaceholder")}
              className="flex-1 outline-none text-base text-[#374151] placeholder-[#9ca3af] bg-transparent"
            />
          </div>
        </div>

        {/* Password */}
        <div className="mb-4">
          <label className="block text-xs font-semibold tracking-widest text-[#6b7280] uppercase mb-2">
            {t("auth.passwordLabel")}
          </label>
          <div className="flex items-center bg-white rounded-2xl px-4 py-4 shadow-sm border border-[#e5e9f0] gap-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#6b7280" className="flex-shrink-0">
              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
            </svg>
            <div className="w-px h-5 bg-[#d1d5db]" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder={t("auth.passwordPlaceholder")}
              className="flex-1 outline-none text-base text-[#374151] placeholder-[#9ca3af] bg-transparent"
            />
          </div>
        </div>

        {/* Signup-only fields */}
        {mode === "signup" && (
          <>
            <div className="mb-4">
              <label className="block text-xs font-semibold tracking-widest text-[#6b7280] uppercase mb-2">
                {t("auth.nameLabel")}
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
                  placeholder={t("auth.namePlaceholder")}
                  className="flex-1 outline-none text-base text-[#374151] placeholder-[#9ca3af] bg-transparent"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold tracking-widest text-[#6b7280] uppercase mb-2">
                {t("auth.ageLabel")}
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
                  placeholder={t("auth.agePlaceholder")}
                  min="18"
                  className="flex-1 outline-none text-base text-[#374151] placeholder-[#9ca3af] bg-transparent"
                />
              </div>
            </div>
          </>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-[#1a2fb8] text-white rounded-2xl py-5 font-bold text-lg flex items-center justify-center gap-3 hover:bg-[#1527a0] transition-all active:scale-95 mb-4 disabled:opacity-70"
        >
          {loading ? t("auth.pleaseWait") : mode === "login" ? t("auth.loginButton") : t("auth.signupButton")}
          {!loading && (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
            </svg>
          )}
        </button>

        {/* Mode toggle */}
        <p className="text-center text-sm text-[#6b7280] mb-6">
          {mode === "login" ? t("auth.noAccount") : t("auth.haveAccount")}
          <button onClick={switchMode} className="text-[#1a2fb8] font-bold">
            {mode === "login" ? t("auth.signupButton") : t("auth.loginButton")}
          </button>
        </p>

        {/* Error */}
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
              {t("auth.securityTitle")}
            </p>
            <p className="text-sm text-[#374151] leading-relaxed">
              {t("auth.securityBody")}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-2 h-2 rounded-full bg-[#4ade80]" />
          <span className="text-xs font-semibold tracking-widest text-[#6b7280] uppercase">
            {t("auth.protocolLive")}
          </span>
        </div>

        <p className="text-center text-xs text-[#9ca3af] leading-relaxed mt-auto">
          {t("auth.termsText")}{" "}
          <span className="text-[#1a2fb8] underline cursor-pointer">{t("auth.terms")}</span> {t("auth.termsAnd")}{" "}
          <span className="text-[#1a2fb8] underline cursor-pointer">{t("auth.privacy")}</span>.
        </p>
      </div>
    </div>
  );
}

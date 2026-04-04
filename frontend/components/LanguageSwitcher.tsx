"use client";

import { useI18n, type Locale } from "@/i18n/I18nContext";

const LANGUAGES: { code: Locale; label: string; flag: string }[] = [
  { code: "en", label: "EN", flag: "🇺🇸" },
  { code: "hi", label: "हि", flag: "🇮🇳" },
];

/**
 * Compact language switcher — fits inline in Navbar without disrupting layout.
 * Matches existing Vault design system (rounded-xl, text-sm, #6b7280 palette).
 */
export default function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();

  return (
    <div className="flex items-center gap-1 bg-[#f3f4f6] rounded-xl p-1">
      {LANGUAGES.map(({ code, label, flag }) => (
        <button
          key={code}
          onClick={() => setLocale(code)}
          title={code === "en" ? "English" : "हिन्दी"}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            locale === code
              ? "bg-white text-[#1a2fb8] shadow-sm"
              : "text-[#6b7280] hover:text-[#111827]"
          }`}
        >
          <span>{flag}</span>
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}

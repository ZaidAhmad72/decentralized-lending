"use client";

import { useState, useEffect, useRef } from "react";

const STORAGE_KEY = "vault_gt_lang";

const LANGUAGES = [
  { code: "en", label: "English",    flag: "🇺🇸" },
  { code: "hi", label: "हिन्दी",      flag: "🇮🇳" },
  { code: "mr", label: "मराठी",       flag: "🇮🇳" },
  { code: "ta", label: "தமிழ்",       flag: "🇮🇳" },
  { code: "te", label: "తెలుగు",      flag: "🇮🇳" },
  { code: "kn", label: "ಕನ್ನಡ",       flag: "🇮🇳" },
  { code: "gu", label: "ગુજરાતી",     flag: "🇮🇳" },
];

/**
 * Triggers Google Translate by writing the googtrans cookie and
 * interacting with the hidden select element the SDK injects.
 * Falls back gracefully if the SDK hasn't loaded yet.
 */
function applyLanguage(langCode: string) {
  if (langCode === "en") {
    // Restore English: clear the cookie and reload
    document.cookie = "googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC";
    document.cookie = "googtrans=; path=/; domain=" + location.hostname + "; expires=Thu, 01 Jan 1970 00:00:00 UTC";
    window.location.reload();
    return;
  }

  // Set the googtrans cookie that Google Translate reads
  const value = `/en/${langCode}`;
  document.cookie = `googtrans=${value}; path=/`;
  document.cookie = `googtrans=${value}; path=/; domain=${location.hostname}`;

  // Also drive the hidden <select> the SDK injects — most reliable method
  const select = document.querySelector<HTMLSelectElement>(
    ".goog-te-combo, #google_translate_element select"
  );
  if (select) {
    select.value = langCode;
    select.dispatchEvent(new Event("change"));
  } else {
    // SDK select not ready yet — reload so the cookie takes effect
    window.location.reload();
  }
}

export default function GoogleTranslateSwitcher() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("en");
  const ref = useRef<HTMLDivElement>(null);

  // Restore persisted language on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && LANGUAGES.some((l) => l.code === stored)) {
      setCurrent(stored);
    }
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const select = (code: string) => {
    setCurrent(code);
    setOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch { /* ignore */ }
    applyLanguage(code);
  };

  const currentLang = LANGUAGES.find((l) => l.code === current) ?? LANGUAGES[0];

  return (
    <div ref={ref} className="relative">
      {/* Trigger button — matches existing Vault design */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#f3f4f6] text-sm font-semibold text-[#374151] hover:bg-[#e5e9f0] transition-colors"
        aria-label="Select language"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span>{currentLang.flag}</span>
        <span className="hidden sm:inline">{currentLang.label}</span>
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="currentColor"
          className={`text-[#6b7280] transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M7 10l5 5 5-5z" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="listbox"
          className="absolute right-0 top-full mt-1.5 w-44 bg-white rounded-2xl shadow-lg border border-[#e5e9f0] py-1.5 z-[9999]"
        >
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              role="option"
              aria-selected={current === lang.code}
              onClick={() => select(lang.code)}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors text-left ${
                current === lang.code
                  ? "bg-[#eef2ff] text-[#1a2fb8] font-bold"
                  : "text-[#374151] hover:bg-[#f3f4f6] font-medium"
              }`}
            >
              <span className="text-base">{lang.flag}</span>
              <span>{lang.label}</span>
              {current === lang.code && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#1a2fb8" className="ml-auto flex-shrink-0">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

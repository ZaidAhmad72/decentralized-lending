"use client";

import { useState, useEffect, useRef } from "react";
import { setLanguage, getSavedLanguage } from "@/utils/translate";

const LANGUAGES = [
  { code: "en", label: "English",  flag: "🇺🇸" },
  { code: "hi", label: "हिन्दी",    flag: "🇮🇳" },
  { code: "mr", label: "मराठी",     flag: "🇮🇳" },
  { code: "ta", label: "தமிழ்",     flag: "🇮🇳" },
  { code: "te", label: "తెలుగు",    flag: "🇮🇳" },
  { code: "kn", label: "ಕನ್ನಡ",     flag: "🇮🇳" },
  { code: "gu", label: "ગુજરાતી",   flag: "🇮🇳" },
];

export default function GoogleTranslateSwitcher() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("en");
  const ref = useRef<HTMLDivElement>(null);

  // Hydrate from persisted storage (client-only)
  useEffect(() => {
    setCurrent(getSavedLanguage());
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (code: string) => {
    setCurrent(code);
    setOpen(false);
    setLanguage(code); // handles cookie + localStorage + DOM/reload
  };

  const currentLang = LANGUAGES.find((l) => l.code === current) ?? LANGUAGES[0];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#f3f4f6] dark:bg-gray-700 text-sm font-semibold text-[#374151] dark:text-gray-200 hover:bg-[#e5e9f0] dark:hover:bg-gray-600 transition-colors"
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

      {open && (
        <div
          role="listbox"
          className="absolute right-0 top-full mt-1.5 w-44 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-[#e5e9f0] dark:border-gray-700 py-1.5 z-[9999]"
        >
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              role="option"
              aria-selected={current === lang.code}
              onClick={() => handleSelect(lang.code)}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors text-left ${
                current === lang.code
                  ? "bg-[#eef2ff] dark:bg-blue-950 text-[#1a2fb8] dark:text-blue-400 font-bold"
                  : "text-[#374151] dark:text-gray-300 hover:bg-[#f3f4f6] dark:hover:bg-gray-700 font-medium"
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

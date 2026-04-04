"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import en from "@/locales/en.json";
import hi from "@/locales/hi.json";

export type Locale = "en" | "hi";

const LOCALES: Record<Locale, typeof en> = { en, hi };
const STORAGE_KEY = "vault_locale";
const DEFAULT_LOCALE: Locale = "en";

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

/** Resolve a dot-notation key like "auth.loginButton" against a translations object. */
function resolve(obj: Record<string, unknown>, key: string): string {
  const parts = key.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return key;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : key;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (stored && stored in LOCALES) setLocaleState(stored);
    } catch {
      // localStorage unavailable (SSR / private mode) — use default
    }
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
      // Also set a cookie so server components can read it if needed
      document.cookie = `${STORAGE_KEY}=${next}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {
      // ignore
    }
  }, []);

  const t = useCallback(
    (key: string): string => {
      const translations = LOCALES[locale] as Record<string, unknown>;
      const result = resolve(translations, key);
      // Fallback to English if key missing in current locale
      if (result === key && locale !== DEFAULT_LOCALE) {
        return resolve(LOCALES[DEFAULT_LOCALE] as Record<string, unknown>, key);
      }
      return result;
    },
    [locale]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

/** Hook to consume translations anywhere in the app. */
export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}

/**
 * translate.ts — SSR-safe Google Translate helpers.
 * All functions guard against server-side execution with typeof window checks.
 */

const STORAGE_KEY = "vault_gt_lang";
const COOKIE_NAME = "googtrans";

/** Write the googtrans cookie on both root path and domain. */
function writeGoogTransCookie(value: string) {
  const host = window.location.hostname;
  // SameSite=Lax ensures the cookie survives client-side navigation
  document.cookie = `${COOKIE_NAME}=${value}; path=/; SameSite=Lax`;
  document.cookie = `${COOKIE_NAME}=${value}; path=/; domain=${host}; SameSite=Lax`;
}

/** Expire the googtrans cookie on both path and domain. */
function clearGoogTransCookie() {
  const host = window.location.hostname;
  const expired = "expires=Thu, 01 Jan 1970 00:00:00 UTC";
  document.cookie = `${COOKIE_NAME}=; path=/; ${expired}; SameSite=Lax`;
  document.cookie = `${COOKIE_NAME}=; path=/; domain=${host}; ${expired}; SameSite=Lax`;
}

/**
 * Select a language.
 * 1. Persists to localStorage + cookie.
 * 2. Drives the hidden SDK <select> if available (no reload needed).
 * 3. Falls back to reload so the cookie takes effect.
 */
export function setLanguage(lang: string): void {
  if (typeof window === "undefined") return;

  if (lang === "en") {
    clearGoogTransCookie();
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    window.location.reload();
    return;
  }

  try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* ignore */ }
  writeGoogTransCookie(`/en/${lang}`);

  // Drive the hidden SDK <select> — avoids a full reload when GT is ready
  const select = document.querySelector<HTMLSelectElement>(
    ".goog-te-combo, #google_translate_element select"
  );
  if (select) {
    select.value = lang;
    select.dispatchEvent(new Event("change"));
  } else {
    window.location.reload();
  }
}

/**
 * Re-apply the saved language on every page load.
 * Called from GoogleTranslate.tsx before the SDK script is injected,
 * so the cookie is always fresh when GT reads it.
 */
export function applySavedLanguage(): void {
  if (typeof window === "undefined") return;

  let lang: string | null = null;
  try { lang = localStorage.getItem(STORAGE_KEY); } catch { /* ignore */ }

  if (!lang || lang === "en") {
    clearGoogTransCookie();
    return;
  }

  // Refresh cookie with SameSite so it survives navigation
  writeGoogTransCookie(`/en/${lang}`);
}

/** Read the currently persisted language code (client-side only). */
export function getSavedLanguage(): string {
  if (typeof window === "undefined") return "en";
  try { return localStorage.getItem(STORAGE_KEY) ?? "en"; } catch { return "en"; }
}

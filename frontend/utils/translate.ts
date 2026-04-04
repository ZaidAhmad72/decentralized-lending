/**
 * translate.ts — SSR-safe Google Translate helpers.
 * All functions guard against server-side execution with typeof window checks.
 */

const STORAGE_KEY = "vault_gt_lang";
const COOKIE_NAME = "googtrans";

/** Write the googtrans cookie on both root path and domain (GT requires both). */
function writeGoogTransCookie(value: string) {
  document.cookie = `${COOKIE_NAME}=${value}; path=/`;
  document.cookie = `${COOKIE_NAME}=${value}; path=/; domain=${location.hostname}`;
}

/** Clear the googtrans cookie so Google Translate resets to source language. */
function clearGoogTransCookie() {
  const expired = "expires=Thu, 01 Jan 1970 00:00:00 UTC";
  document.cookie = `${COOKIE_NAME}=; path=/; ${expired}`;
  document.cookie = `${COOKIE_NAME}=; path=/; domain=${location.hostname}; ${expired}`;
}

/**
 * Persist and apply a language selection.
 * Tries the no-reload DOM method first; falls back to cookie + reload.
 */
export function setLanguage(lang: string): void {
  if (typeof window === "undefined") return;

  // Persist choice
  try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* ignore */ }

  if (lang === "en") {
    clearGoogTransCookie();
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    window.location.reload();
    return;
  }

  writeGoogTransCookie(`/en/${lang}`);

  // Try driving the hidden SDK <select> — avoids a full reload
  const select = document.querySelector<HTMLSelectElement>(
    ".goog-te-combo, #google_translate_element select"
  );
  if (select) {
    select.value = lang;
    select.dispatchEvent(new Event("change"));
  } else {
    // SDK not ready yet — reload so the cookie takes effect on next load
    window.location.reload();
  }
}

/**
 * Re-apply the saved language on page load.
 * Call this once from a client-side useEffect in the root layout.
 * If the cookie is already set (from a previous reload), GT picks it up
 * automatically — this just ensures the cookie is always fresh.
 */
export function applySavedLanguage(): void {
  if (typeof window === "undefined") return;

  let lang: string | null = null;
  try { lang = localStorage.getItem(STORAGE_KEY); } catch { /* ignore */ }

  if (!lang || lang === "en") {
    clearGoogTransCookie();
    return;
  }

  // Refresh the cookie so it doesn't expire mid-session
  writeGoogTransCookie(`/en/${lang}`);
}

/** Read the currently persisted language code (client-side only). */
export function getSavedLanguage(): string {
  if (typeof window === "undefined") return "en";
  try { return localStorage.getItem(STORAGE_KEY) ?? "en"; } catch { return "en"; }
}

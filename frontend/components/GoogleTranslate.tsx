"use client";

import { useEffect } from "react";
import { getSavedLanguage } from "@/utils/translate";

declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
    google?: {
      translate: {
        TranslateElement: new (
          config: { pageLanguage: string; includedLanguages?: string; autoDisplay: boolean },
          elementId: string
        ) => void;
      };
    };
  }
}

function removeBanner() {
  document.querySelectorAll<HTMLElement>(
    ".goog-te-banner-frame, iframe.goog-te-banner-frame, #goog-gt-tt, .goog-te-balloon-frame"
  ).forEach((el) => el.remove());
  document.body.style.setProperty("top", "0px", "important");
  document.body.style.setProperty("position", "static", "important");
  document.body.classList.add("gt-banner-removed");
}

/** Re-apply saved language cookie before SDK loads (prevents reset on navigation). */
function applySavedLanguage() {
  if (typeof window === "undefined") return;
  const lang = getSavedLanguage();
  if (!lang || lang === "en") return;
  const value = `/en/${lang}`;
  document.cookie = `googtrans=${value}; path=/; SameSite=Lax`;
  document.cookie = `googtrans=${value}; path=/; domain=${window.location.hostname}; SameSite=Lax`;
}

export default function GoogleTranslate() {
  useEffect(() => {
    applySavedLanguage();

    if (document.getElementById("gt-script")) return;

    window.googleTranslateElementInit = () => {
      try {
        new window.google!.translate.TranslateElement(
          { pageLanguage: "en", includedLanguages: "en,hi,mr,ta,te,kn,gu,ml,bn,pa", autoDisplay: false },
          "google_translate_element"
        );
      } catch { /* init failed — app works in English */ }
      removeBanner();
    };

    const script = document.createElement("script");
    script.id = "gt-script";
    script.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    script.async = true;
    script.onerror = () => { /* silent fallback */ };
    document.body.appendChild(script);

    const observer = new MutationObserver(() => removeBanner());
    observer.observe(document.body, { childList: true, subtree: true });

    const interval = setInterval(removeBanner, 300);
    const stopPolling = setTimeout(() => clearInterval(interval), 7000);

    const onVisible = () => { if (document.visibilityState === "visible") removeBanner(); };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      observer.disconnect();
      clearInterval(interval);
      clearTimeout(stopPolling);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return <div id="google_translate_element" aria-hidden="true" />;
}

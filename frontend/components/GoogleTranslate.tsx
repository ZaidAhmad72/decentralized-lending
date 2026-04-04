"use client";

import { useEffect } from "react";
import { applySavedLanguage } from "@/utils/translate";

declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
    google?: {
      translate: {
        TranslateElement: new (
          config: { pageLanguage: string; includedLanguages: string; autoDisplay: boolean },
          elementId: string
        ) => void;
      };
    };
  }
}

const SUPPORTED_LANGS = "en,hi,mr,ta,te,kn,gu,ml,bn,pa";

/**
 * Physically REMOVE the banner from the DOM (not just hide it).
 * Google can re-show a hidden element by toggling its style —
 * removing it entirely is the only reliable fix.
 */
function removeBanner() {
  // Remove every banner iframe variant Google injects
  document.querySelectorAll<HTMLElement>(
    ".goog-te-banner-frame, iframe.goog-te-banner-frame, #goog-gt-tt, .goog-te-balloon-frame"
  ).forEach((el) => el.remove());

  // Always force body top to 0 — GT sets it inline to push content down
  document.body.style.setProperty("top", "0px", "important");
  document.body.style.setProperty("position", "static", "important");

  // Add a class so our CSS rule also locks it (belt-and-suspenders)
  document.body.classList.add("gt-banner-removed");
}

export default function GoogleTranslate() {
  useEffect(() => {
    // Step 1: restore saved language cookie before SDK loads
    applySavedLanguage();

    // Step 2: inject SDK script only once (guard against HMR double-run)
    if (document.getElementById("gt-script")) {
      // Script already injected — still start the observer + polling
    } else {
      window.googleTranslateElementInit = () => {
        try {
          new window.google!.translate.TranslateElement(
            { pageLanguage: "en", includedLanguages: SUPPORTED_LANGS, autoDisplay: false },
            "google_translate_element"
          );
        } catch { /* SDK init failed — app works in English */ }

        // Fire immediately after SDK init
        removeBanner();
      };

      const script = document.createElement("script");
      script.id = "gt-script";
      script.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      script.async = true;
      script.onerror = () => { /* network failure — silent, English stays */ };
      document.body.appendChild(script);
    }

    // Step 3: MutationObserver with subtree:true catches banner
    //         re-injected anywhere in the document (not just direct children)
    const observer = new MutationObserver(() => removeBanner());
    observer.observe(document.body, { childList: true, subtree: true });

    // Step 4: aggressive polling for 7 s after mount
    //         handles slow networks and deferred GT initialisation
    const interval = setInterval(removeBanner, 300);
    const stopPolling = setTimeout(() => clearInterval(interval), 7000);

    // Step 5: also run on every visibility change (tab switch / navigation)
    const onVisible = () => { if (document.visibilityState === "visible") removeBanner(); };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      observer.disconnect();
      clearInterval(interval);
      clearTimeout(stopPolling);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  // Required anchor for the GT SDK — kept invisible via CSS
  return <div id="google_translate_element" aria-hidden="true" />;
}

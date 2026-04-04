"use client";

import { useEffect } from "react";

// Extend window type for Google Translate globals
declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
    google?: {
      translate: {
        TranslateElement: new (
          config: {
            pageLanguage: string;
            includedLanguages: string;
            autoDisplay: boolean;
          },
          elementId: string
        ) => void;
      };
    };
  }
}

const SUPPORTED_LANGS = "en,hi,mr,ta,te,kn,gu";

/**
 * GoogleTranslate — injects the Google Translate widget invisibly.
 * The hidden #google_translate_element div is required by the SDK;
 * all visual control is handled by GoogleTranslateSwitcher.
 * Safe: if the script fails to load, the page renders normally in English.
 */
export default function GoogleTranslate() {
  useEffect(() => {
    // Avoid double-injection on hot reload
    if (document.getElementById("gt-script")) return;

    // Define the init callback Google Translate will call after loading
    window.googleTranslateElementInit = () => {
      try {
        new window.google!.translate.TranslateElement(
          {
            pageLanguage: "en",
            includedLanguages: SUPPORTED_LANGS,
            autoDisplay: false,
          },
          "google_translate_element"
        );
      } catch {
        // Script loaded but init failed — site still works in English
      }
    };

    const script = document.createElement("script");
    script.id = "gt-script";
    script.src =
      "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    script.async = true;
    script.onerror = () => {
      // Network failure — silently ignore, English remains active
    };
    document.body.appendChild(script);

    // Inject CSS to hide the Google Translate toolbar banner
    const style = document.createElement("style");
    style.id = "gt-hide-style";
    style.textContent = `
      /* Hide the Google Translate top banner */
      .goog-te-banner-frame, #goog-gt-tt,
      .goog-te-balloon-frame, .goog-tooltip,
      .goog-tooltip:hover { display: none !important; }

      /* Prevent body top offset caused by the banner */
      body { top: 0 !important; }

      /* Hide the default widget container */
      #google_translate_element { display: none !important; }

      /* Remove the Google Translate attribution box */
      .goog-logo-link, .goog-te-gadget span { display: none !important; }
      .goog-te-gadget { font-size: 0 !important; }
    `;
    document.head.appendChild(style);

    return () => {
      // Cleanup on unmount (dev HMR only — not needed in production)
      document.getElementById("gt-script")?.remove();
      document.getElementById("gt-hide-style")?.remove();
      delete window.googleTranslateElementInit;
    };
  }, []);

  // Hidden anchor element required by the Google Translate SDK
  return <div id="google_translate_element" aria-hidden="true" />;
}

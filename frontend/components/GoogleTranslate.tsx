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

const SUPPORTED_LANGS = "en,hi,mr,ta,te,kn,gu";

/** Forcefully hide any Google Translate banner nodes in the DOM. */
function nukeBanner() {
  // The banner is an iframe injected into <body>
  document.querySelectorAll<HTMLElement>(
    ".goog-te-banner-frame, #goog-gt-tt, .goog-te-balloon-frame"
  ).forEach((el) => { el.style.setProperty("display", "none", "important"); });

  // Google sets body.style.top to push content down — reset it
  if (document.body.style.top && document.body.style.top !== "0px") {
    document.body.style.setProperty("top", "0px", "important");
  }
}

export default function GoogleTranslate() {
  useEffect(() => {
    // 1. Re-apply saved language cookie before SDK loads
    applySavedLanguage();

    // 2. Inject SDK only once
    if (document.getElementById("gt-script")) return;

    window.googleTranslateElementInit = () => {
      try {
        new window.google!.translate.TranslateElement(
          { pageLanguage: "en", includedLanguages: SUPPORTED_LANGS, autoDisplay: false },
          "google_translate_element"
        );
      } catch { /* init failed — site works in English */ }

      // Nuke banner immediately after SDK initialises
      nukeBanner();
    };

    const script = document.createElement("script");
    script.id = "gt-script";
    script.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    script.async = true;
    document.body.appendChild(script);

    // 3. MutationObserver: catch the banner if it's injected after init
    //    (GT sometimes re-injects it on route changes)
    const observer = new MutationObserver(() => nukeBanner());
    observer.observe(document.body, { childList: true, subtree: false });

    // 4. Also poll briefly after load — belt-and-suspenders for slow networks
    const timer = setInterval(nukeBanner, 500);
    const stopTimer = setTimeout(() => clearInterval(timer), 5000);

    return () => {
      observer.disconnect();
      clearInterval(timer);
      clearTimeout(stopTimer);
    };
  }, []);

  return <div id="google_translate_element" aria-hidden="true" />;
}

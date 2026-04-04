"use client";

import { useEffect } from "react";
import { getSavedLanguage } from "@/utils/translate";

// Injects the hidden Google Translate element used by GoogleTranslateSwitcher
export default function GoogleTranslate() {
  useEffect(() => {
    // Inject GT script once
    if (document.getElementById("gt-script")) return;

    (window as unknown as Record<string, unknown>).googleTranslateElementInit = () => {
      new (window as unknown as Record<string, { new(opts: unknown, id: string): void }>)
        .google.translate.TranslateElement(
          { pageLanguage: "en", autoDisplay: false },
          "google_translate_element"
        );
    };

    const script = document.createElement("script");
    script.id = "gt-script";
    script.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    script.async = true;
    document.body.appendChild(script);

    // Restore saved language after GT loads
    script.onload = () => {
      const saved = getSavedLanguage();
      if (saved !== "en") {
        setTimeout(() => {
          const select = document.querySelector<HTMLSelectElement>(".goog-te-combo");
          if (select) { select.value = saved; select.dispatchEvent(new Event("change")); }
        }, 1000);
      }
    };
  }, []);

  return <div id="google_translate_element" style={{ display: "none" }} />;
}

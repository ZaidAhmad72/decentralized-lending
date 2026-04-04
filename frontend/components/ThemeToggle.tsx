"use client";

import { useState, useEffect } from "react";
import { useTheme } from "@/context/themeContext";

/**
 * Modern iOS-style light/dark toggle switch.
 * SSR-safe: renders a static placeholder until mounted.
 */
export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Static placeholder ΓÇö same dimensions, no content shift
  if (!mounted) {
    return <div className="w-14 h-7 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" />;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`
        relative flex items-center w-14 h-7 rounded-full p-0.5 shrink-0
        transition-colors duration-300 active:scale-95
        ${isDark ? "bg-gray-700" : "bg-gray-200"}
      `}
    >
      {/* Sun icon ΓÇö left */}
      <span className={`absolute left-1.5 text-[11px] transition-opacity duration-200 ${isDark ? "opacity-30" : "opacity-100"}`}>
        ΓÿÇ∩╕Å
      </span>

      {/* Moon icon ΓÇö right */}
      <span className={`absolute right-1.5 text-[11px] transition-opacity duration-200 ${isDark ? "opacity-100" : "opacity-30"}`}>
        ≡ƒîÖ
      </span>

      {/* Sliding circle */}
      <span
        className={`
          relative z-10 w-6 h-6 rounded-full bg-white shadow-md
          transition-transform duration-300
          ${isDark ? "translate-x-7" : "translate-x-0"}
        `}
      />
    </button>
  );
}

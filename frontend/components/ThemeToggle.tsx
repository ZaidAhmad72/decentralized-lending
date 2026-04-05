"use client";

import { useState, useEffect } from "react";
import { useTheme } from "@/context/themeContext";

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) {
    return <div className="w-14 h-7 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0" />;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`
        relative flex items-center w-14 h-7 rounded-full p-0.5 shrink-0
        transition-colors duration-300 active:scale-95
        ${isDark ? "bg-indigo-600" : "bg-slate-200"}
      `}
    >
      {/* Sun icon — left side (visible in dark mode) */}
      <span className={`absolute left-1.5 transition-opacity duration-200 ${isDark ? "opacity-100" : "opacity-0"}`}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="#fbbf24">
          <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z" />
        </svg>
      </span>

      {/* Moon icon — right side (visible in light mode) */}
      <span className={`absolute right-1.5 transition-opacity duration-200 ${isDark ? "opacity-0" : "opacity-100"}`}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="#475569">
          <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z" />
        </svg>
      </span>

      {/* Sliding circle — left = light mode, right = dark mode */}
      <span
        className={`
          relative z-10 w-6 h-6 rounded-full shadow-md
          transition-transform duration-300
          ${isDark ? "translate-x-7 bg-slate-900" : "translate-x-0 bg-white"}
        `}
      />
    </button>
  );
}

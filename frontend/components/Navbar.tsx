"use client";

import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import GoogleTranslateSwitcher from "@/components/GoogleTranslateSwitcher";
import ThemeToggle from "@/components/ThemeToggle";

const TABS = [
  { label: "HOME",    path: "/dashboard",    icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" /></svg>) },
  { label: "DEPOSIT", path: "/deposit",      icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" /></svg>) },
  { label: "BORROW",  path: "/request-loan", icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>) },
  { label: "REPAY",   path: "/repay",        icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z" /></svg>) },
];

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const isActive = (path: string) => pathname === path;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <>
      {/* ΓöÇΓöÇ Desktop top navbar ΓöÇΓöÇ */}
      <nav className="hidden lg:flex fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-b border-[#e5e9f0] dark:border-gray-700 shadow-sm items-center justify-between px-10 h-16 transition-colors">
        <span
          className="text-[#1a2fb8] dark:text-blue-400 font-black text-xl tracking-tight cursor-pointer select-none"
          onClick={() => router.push("/dashboard")}
        >
          Vault
        </span>

        <div className="flex items-center gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.label}
              onClick={() => router.push(tab.path)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                isActive(tab.path)
                  ? "bg-[#eef2ff] dark:bg-blue-950 text-[#1a2fb8] dark:text-blue-400"
                  : "text-[#6b7280] dark:text-gray-400 hover:text-[#111827] dark:hover:text-white hover:bg-[#f3f4f6] dark:hover:bg-gray-800"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <GoogleTranslateSwitcher />
          <button
            onClick={handleLogout}
            className="text-sm font-semibold text-[#6b7280] dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors px-3 py-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950"
          >
            Logout
          </button>
        </div>
      </nav>

      {/* ΓöÇΓöÇ Mobile bottom navbar ΓöÇΓöÇ */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-[#e5e9f0] dark:border-gray-700 z-50 transition-colors">
        <div className="flex justify-end items-center gap-2 px-4 pt-1.5 pb-0">
          <ThemeToggle />
          <GoogleTranslateSwitcher />
        </div>
        <div className="flex">
          {TABS.map((tab) => (
            <button
              key={tab.label}
              onClick={() => router.push(tab.path)}
              className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 text-[9px] font-bold tracking-wider transition-colors ${
                isActive(tab.path)
                  ? "text-[#1a2fb8] dark:text-blue-400"
                  : "text-[#9ca3af] dark:text-gray-500"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
          <button
            onClick={handleLogout}
            className="flex-1 flex flex-col items-center justify-center py-3 gap-1 text-[9px] font-bold tracking-wider text-red-400 dark:text-red-500"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
            </svg>
            LOGOUT
          </button>
        </div>
      </div>
    </>
  );
}

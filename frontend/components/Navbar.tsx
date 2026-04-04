"use client";

import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

const tabs = [
  {
    label: "HOME",
    path: "/dashboard",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
      </svg>
    ),
  },
  {
    label: "MARKETPLACE",
    path: "/loans",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z" />
      </svg>
    ),
  },
  {
    label: "REQUEST LOAN",
    path: "/request-loan",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
      </svg>
    ),
  },
  {
    label: "REPAY",
    path: "/repay",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z" />
      </svg>
    ),
  },
];

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const isActive = (tab: (typeof tabs)[0]) => pathname === tab.path;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <>
      {/* ── Desktop top navbar ── */}
      <nav className="hidden lg:flex fixed top-0 left-0 right-0 z-50 bg-white border-b border-[#e5e9f0] shadow-sm items-center justify-between px-10 h-16">
        <span
          className="text-[#1a2fb8] font-black text-xl tracking-tight cursor-pointer select-none"
          onClick={() => router.push("/dashboard")}
        >
          Vault
        </span>

        <div className="flex items-center gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.label}
              onClick={() => router.push(tab.path)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                isActive(tab)
                  ? "bg-[#eef2ff] text-[#1a2fb8]"
                  : "text-[#6b7280] hover:text-[#111827] hover:bg-[#f3f4f6]"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <button
          onClick={handleLogout}
          className="text-sm font-semibold text-[#6b7280] hover:text-red-500 transition-colors px-3 py-2 rounded-xl hover:bg-red-50"
        >
          Logout
        </button>
      </nav>

      {/* ── Mobile bottom navbar ── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#e5e9f0] flex z-50">
        {tabs.map((tab) => (
          <button
            key={tab.label}
            onClick={() => router.push(tab.path)}
            className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 text-[9px] font-bold tracking-wider transition-colors ${
              isActive(tab) ? "text-[#1a2fb8]" : "text-[#9ca3af]"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
        {/* Mobile logout */}
        <button
          onClick={handleLogout}
          className="flex-1 flex flex-col items-center justify-center py-3 gap-1 text-[9px] font-bold tracking-wider text-red-400"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
          </svg>
          LOGOUT
        </button>
      </div>
    </>
  );
}

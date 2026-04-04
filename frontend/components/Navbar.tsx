"use client";

import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import GoogleTranslateSwitcher from "@/components/GoogleTranslateSwitcher";
import { useI18n } from "@/i18n/I18nContext";

const TAB_KEYS = [
  { labelKey: "nav.home",    path: "/dashboard",    icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" /></svg>) },
  { labelKey: "nav.deposit", path: "/deposit",      icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" /></svg>) },
  { labelKey: "nav.borrow",  path: "/request-loan", icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>) },
  { labelKey: "nav.repay",   path: "/repay",        icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z" /></svg>) },
];

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const { t } = useI18n();

  const isActive = (path: string) => pathname === path;

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
          {TAB_KEYS.map((tab) => (
            <button
              key={tab.labelKey}
              onClick={() => router.push(tab.path)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                isActive(tab.path)
                  ? "bg-[#eef2ff] text-[#1a2fb8]"
                  : "text-[#6b7280] hover:text-[#111827] hover:bg-[#f3f4f6]"
              }`}
            >
              {tab.icon}
              {t(tab.labelKey)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <GoogleTranslateSwitcher />
          <LanguageSwitcher />
          <button
            onClick={handleLogout}
            className="text-sm font-semibold text-[#6b7280] hover:text-red-500 transition-colors px-3 py-2 rounded-xl hover:bg-red-50"
          >
            {t("nav.logout")}
          </button>
        </div>
      </nav>

      {/* ── Mobile bottom navbar ── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#e5e9f0] z-50">
        {/* Mobile language bar */}
        <div className="flex justify-end px-4 pt-1.5 pb-0">
          <GoogleTranslateSwitcher />
        </div>
        <div className="flex">
        {TAB_KEYS.map((tab) => (
          <button
            key={tab.labelKey}
            onClick={() => router.push(tab.path)}
            className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 text-[9px] font-bold tracking-wider transition-colors ${
              isActive(tab.path) ? "text-[#1a2fb8]" : "text-[#9ca3af]"
            }`}
          >
            {tab.icon}
            {t(tab.labelKey)}
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
          {t("nav.logout")}
        </button>
        </div>
      </div>
    </>
  );
}

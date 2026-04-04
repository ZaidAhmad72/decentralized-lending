import type { Metadata } from "next";
import "./globals.css";
import { WalletProvider } from "@/wallet/walletContext";
import { I18nProvider } from "@/i18n/I18nContext";
import GoogleTranslate from "@/components/GoogleTranslate";

export const metadata: Metadata = {
  title: "Vault",
  description: "Decentralized lending platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#eef2f7]">
        <I18nProvider>
          <WalletProvider>
            {/* Google Translate script injector — hidden, non-intrusive */}
            <GoogleTranslate />
            {children}
          </WalletProvider>
        </I18nProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";
import { WalletProvider } from "@/wallet/walletContext";
import GoogleTranslate from "@/components/GoogleTranslate";

export const metadata: Metadata = {
  title: "Vault",
  description: "Decentralized lending platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#eef2f7]">
        <WalletProvider>
          {/* Injects Google Translate SDK once — hidden, non-intrusive */}
          <GoogleTranslate />
          {children}
        </WalletProvider>
      </body>
    </html>
  );
}

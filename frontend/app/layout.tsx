import type { Metadata } from "next";
import "./globals.css";
import { WalletProvider } from "@/wallet/walletContext";
import { ThemeProvider } from "@/context/themeContext";
import GoogleTranslate from "@/components/GoogleTranslate";

export const metadata: Metadata = {
  title: "Vault",
  description: "Decentralized lending platform",
};

// Inline script runs synchronously before React hydrates — prevents flash
const themeScript = `
(function(){
  try {
    var t = localStorage.getItem('vault_theme') || 'system';
    var dark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.classList.add('dark');
  } catch(e){}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* suppressHydrationWarning: the inline script mutates classList before React hydrates */}
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen bg-[#eef2f7] dark:bg-gray-950 transition-colors duration-200">
        <ThemeProvider>
          <WalletProvider>
            <GoogleTranslate />
            {children}
          </WalletProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

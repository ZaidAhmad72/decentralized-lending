"use client";

import { useState, useRef, useEffect } from "react";
import { getSavedLanguage } from "@/utils/translate";
import { BotMessageSquare } from "lucide-react";

type Message = { role: "user" | "bot"; text: string };

const LANGUAGE_LABELS: Record<string, string> = {
  en: "EN", hi: "HI", mr: "MR", ta: "TA", te: "TE", kn: "KN", gu: "GU",
};

const PLACEHOLDERS: Record<string, string> = {
  en: "Ask about DeFi...",
  hi: "DeFi के बारे में पूछें...",
  mr: "DeFi बद्दल विचारा...",
  ta: "DeFi பற்றி கேளுங்கள்...",
  te: "DeFi గురించి అడగండి...",
  kn: "DeFi ಬಗ್ಗೆ ಕೇಳಿ...",
  gu: "DeFi વિશે પૂછો...",
};

const GREETINGS: Record<string, string> = {
  en: "Hello! How can I help you today? Ask me anything about DeFi, lending, wallets, or crypto.",
  hi: "नमस्ते! मैं आज आपकी कैसे मदद कर सकता हूँ? DeFi, लेंडिंग, वॉलेट या क्रिप्टो के बारे में पूछें।",
  mr: "नमस्कार! मी आज तुम्हाला कशी मदत करू शकतो? DeFi, लेंडिंग, वॉलेट किंवा क्रिप्टोबद्दल विचारा।",
  ta: "வணக்கம்! இன்று நான் உங்களுக்கு எப்படி உதவலாம்? DeFi, கடன், வாலட் அல்லது கிரிப்டோ பற்றி கேளுங்கள்.",
  te: "నమస్కారం! నేను ఈరోజు మీకు ఎలా సహాయం చేయగలను? DeFi, రుణాలు, వాలెట్ లేదా క్రిప్టో గురించి అడగండి.",
  kn: "ನಮಸ್ಕಾರ! ಇಂದು ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು? DeFi, ಸಾಲ, ವಾಲೆಟ್ ಅಥವಾ ಕ್ರಿಪ್ಟೋ ಬಗ್ಗೆ ಕೇಳಿ.",
  gu: "નમસ્તે! આજે હું તમારી કેવી રીતે મદદ કરી શકું? DeFi, ઉધાર, વૉલેટ અથવા ક્રિપ્ટો વિશે પૂછો.",
};

export interface ChatbotContext {
  reputationScore?: number;
  activeLoan?: { amount: number; status: string; daysLeft: number } | null;
  userDeposited?: number;
  poolLiquidity?: number;
  poolAvailable?: number;
  walletBalance?: string;
  walletAddress?: string;
}

export default function Chatbot({ context }: { context?: ChatbotContext }) {
  const [open, setOpen] = useState(false);
  const [language, setLang] = useState("en");
  const [messages, setMessages] = useState<Message[]>([
    { role: "bot", text: GREETINGS.en },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Sync language from localStorage + listen for changes
  useEffect(() => {
    const sync = () => {
      const lang = getSavedLanguage();
      setLang((prev) => {
        if (prev === lang) return prev;
        setMessages([{ role: "bot", text: GREETINGS[lang] ?? GREETINGS.en }]);
        return lang;
      });
    };
    // Set correct greeting on mount in case saved language isn't "en"
    const initialLang = getSavedLanguage();
    setLang(initialLang);
    setMessages([{ role: "bot", text: GREETINGS[initialLang] ?? GREETINGS.en }]);

    window.addEventListener("storage", sync);
    const interval = setInterval(sync, 500);
    return () => { window.removeEventListener("storage", sync); clearInterval(interval); };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setMessages((prev) => [...prev, { role: "user", text }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, context, language }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: data.reply ?? data.error ?? "Something went wrong." },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: "Failed to reach the assistant. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Chat panel */}
      {open && (
        <div className="w-80 sm:w-96 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200"
          style={{ height: "480px" }}>
          {/* Header */}
          <div className="bg-indigo-600 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BotMessageSquare size={20} className="text-white" />
              <span className="text-white font-semibold text-sm">DeFi Assistant</span>
              <span className="bg-indigo-500 text-indigo-100 text-xs font-bold px-2 py-0.5 rounded-full">
                {LANGUAGE_LABELS[language] ?? "EN"}
              </span>
            </div>
            <button onClick={() => setOpen(false)}
              className="text-indigo-200 hover:text-white text-xl leading-none"
              aria-label="Close chat">×</button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-indigo-600 text-white rounded-br-none"
                    : "bg-white text-gray-800 border border-gray-200 rounded-bl-none shadow-sm"
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-xl rounded-bl-none px-4 py-2 shadow-sm">
                  <span className="flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:300ms]" />
                  </span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-gray-200 bg-white flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={PLACEHOLDERS[language] ?? PLACEHOLDERS.en}
              className="flex-1 text-sm text-gray-900 border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 placeholder-gray-400"
              disabled={loading}
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg px-3 py-2 text-sm font-medium transition-colors"
              aria-label="Send message">
              ➤
            </button>
          </div>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105"
        aria-label="Open DeFi assistant">
        {open ? <span className="text-xl font-bold">✕</span> : <BotMessageSquare size={26} />}
      </button>
    </div>
  );
}

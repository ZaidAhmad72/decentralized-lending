import { NextRequest, NextResponse } from "next/server";
import { retrieveContext } from "@/utils/rag";

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English", hi: "Hindi", mr: "Marathi",
  ta: "Tamil",   te: "Telugu", kn: "Kannada", gu: "Gujarati",
};

function buildSystemPrompt(languageName: string) {
  return `You are a DeFi assistant for a decentralized lending platform.
You MUST always respond in ${languageName}. Every single reply must be in ${languageName} only.
Only answer questions related to decentralized finance, blockchain, crypto markets, lending, borrowing, wallets, tokens, smart contracts, yield, staking, risk management, and knowledge base pipeline topics.
When a KNOWLEDGE BASE section is provided, prioritize that information and ground your answer in it. Cite it naturally (e.g. "According to the documentation...").
If the question is unrelated to these topics, respond in ${languageName} with: "I can only assist with DeFi-related questions."
Keep answers concise and beginner-friendly. Avoid hallucinating facts not present in the provided context.`;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Groq API key not configured" }, { status: 500 });
  }

  const { message, context, language } = await req.json();
  if (!message?.trim()) {
    return NextResponse.json({ error: "Empty message" }, { status: 400 });
  }

  const languageName = LANGUAGE_NAMES[language ?? "en"] ?? "English";
  const systemPrompt = buildSystemPrompt(languageName);

  // RAG: retrieve relevant document chunks for this query
  const docContext = retrieveContext(message);

  const contextBlock = context
    ? `\n\nCurrent user data (use this to answer user-specific questions):
- Reputation Score: ${context.reputationScore ?? "unknown"}
- Active Loan: ${context.activeLoan ? `$${context.activeLoan.amount}, status: ${context.activeLoan.status}, ${context.activeLoan.daysLeft} days left` : "None"}
- Total Deposited: ${context.userDeposited != null ? `$${context.userDeposited}` : "unknown"}
- Pool Total Liquidity: ${context.poolLiquidity != null ? `$${context.poolLiquidity}` : "unknown"}
- Pool Available for Loans: ${context.poolAvailable != null ? `$${context.poolAvailable}` : "unknown"}
- Wallet Balance: ${context.walletBalance ?? "unknown"} MATIC
- Wallet Address: ${context.walletAddress ?? "unknown"}`
    : "";

  const fullSystemPrompt = systemPrompt + contextBlock + docContext;

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: fullSystemPrompt },
          { role: "user", content: message },
        ],
        max_tokens: 512,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Groq API error:", res.status, err);
      return NextResponse.json({ error: `Groq error ${res.status}: ${err}` }, { status: 502 });
    }

    const data = await res.json();
    const reply = data?.choices?.[0]?.message?.content ?? "No response from Groq.";
    return NextResponse.json({ reply });
  } catch (err) {
    console.error("Chat route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

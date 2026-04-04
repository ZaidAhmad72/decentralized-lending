import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are a DeFi assistant for a decentralized lending platform. 
Only answer questions related to decentralized finance, blockchain, crypto markets, 
lending, borrowing, wallets, tokens, smart contracts, yield, staking, and risk management.
If the question is unrelated to these topics, respond with exactly: 
"I can only assist with DeFi-related questions."
Keep answers concise and beginner-friendly.`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Groq API key not configured" }, { status: 500 });
  }

  const { message, context } = await req.json();
  if (!message?.trim()) {
    return NextResponse.json({ error: "Empty message" }, { status: 400 });
  }

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

  const fullSystemPrompt = SYSTEM_PROMPT + contextBlock;

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

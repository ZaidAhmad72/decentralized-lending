"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";

// ─── Types ───────────────────────────────────────────────────────────────────
type Section = {
  id: string;
  emoji: string;
  title: string;
  content: React.ReactNode;
};

// ─── Reusable primitives ─────────────────────────────────────────────────────
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-[#e5e9f0] dark:border-gray-700 ${className}`}>
      {children}
    </div>
  );
}

function Warn({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-2xl px-4 py-3 my-3">
      <span className="text-lg flex-shrink-0">⚠️</span>
      <p className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">{children}</p>
    </div>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-2xl px-4 py-3 my-3">
      <span className="text-lg flex-shrink-0">💡</span>
      <p className="text-sm text-green-800 dark:text-green-300 leading-relaxed">{children}</p>
    </div>
  );
}

function Tag({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full ${color}`}>{children}</span>
  );
}

function Bullet({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 mt-3">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2 text-sm text-[#374151] dark:text-gray-300 leading-relaxed">
          <span className="text-[#1a2fb8] dark:text-blue-400 font-bold flex-shrink-0">→</span>
          {item}
        </li>
      ))}
    </ul>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-base font-black text-[#111827] dark:text-white mt-5 mb-2">{children}</h3>;
}

function Para({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-[#374151] dark:text-gray-300 leading-relaxed">{children}</p>;
}

// ─── Section content definitions ─────────────────────────────────────────────
const SECTIONS: Section[] = [
  {
    id: "what-is-defi",
    emoji: "🏦",
    title: "What is DeFi?",
    content: (
      <>
        <Para>DeFi stands for <strong>Decentralized Finance</strong> — financial services that run on a blockchain instead of a bank or company. Think of it as a bank that nobody owns, nobody can shut down, and anyone in the world can use.</Para>
        <Tip>Analogy: Traditional banking is like a vending machine owned by a company. DeFi is like a vending machine that runs itself — no owner, no middleman, just code.</Tip>
        <SectionTitle>What can you do with DeFi?</SectionTitle>
        <Bullet items={[
          "Lend your crypto and earn interest",
          "Borrow funds without a credit check",
          "Trade tokens directly from your wallet",
          "Earn yield by providing liquidity",
        ]} />
      </>
    ),
  },
  {
    id: "defi-vs-banks",
    emoji: "⚖️",
    title: "DeFi vs Traditional Banking",
    content: (
      <>
        <Para>Here's how DeFi compares to the banking system you already know:</Para>
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-[#eef2ff] dark:bg-blue-950 text-[#1a2fb8] dark:text-blue-300">
                <th className="text-left px-4 py-2 rounded-tl-xl font-bold">Feature</th>
                <th className="text-left px-4 py-2 font-bold">Traditional Bank</th>
                <th className="text-left px-4 py-2 rounded-tr-xl font-bold">DeFi</th>
              </tr>
            </thead>
            <tbody className="text-[#374151] dark:text-gray-300">
              {[
                ["Access", "Business hours only", "24/7, anywhere"],
                ["Approval", "Credit checks required", "No approval needed"],
                ["Transparency", "Hidden fees & rules", "All rules on-chain"],
                ["Custody", "Bank holds your money", "You hold your funds"],
                ["Speed", "Days for settlement", "Seconds"],
                ["Fees", "High & unpredictable", "Low (especially on Base)"],
              ].map(([f, b, d], i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-[#f9fafb] dark:bg-gray-800"}>
                  <td className="px-4 py-2 font-semibold">{f}</td>
                  <td className="px-4 py-2 text-red-500">{b}</td>
                  <td className="px-4 py-2 text-green-600 dark:text-green-400 font-semibold">{d}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Warn>DeFi also has risks: smart contract bugs, market volatility, and no customer support. Always start small.</Warn>
      </>
    ),
  },
  {
    id: "smart-contracts",
    emoji: "📜",
    title: "What Are Smart Contracts?",
    content: (
      <>
        <Para>A smart contract is a program stored on the blockchain that automatically executes when conditions are met — no human needed.</Para>
        <Tip>Analogy: Imagine a vending machine. You put in money, press a button, and the snack comes out automatically. A smart contract works the same way — you send funds, the contract does its job, no one can interfere.</Tip>
        <SectionTitle>In lending, smart contracts:</SectionTitle>
        <Bullet items={[
          "Lock your collateral securely",
          "Release borrowed funds instantly",
          "Calculate interest automatically",
          "Trigger liquidation if health drops too low",
        ]} />
        <Warn>Smart contracts can have bugs. Always use audited protocols. Vault's contracts are audited and open-source.</Warn>
      </>
    ),
  },
  {
    id: "peer-to-pool",
    emoji: "🌊",
    title: "How Peer-to-Pool Lending Works",
    content: (
      <>
        <Para>Instead of matching one lender to one borrower (peer-to-peer), Vault uses a <strong>liquidity pool</strong> — a shared pot of funds that anyone can deposit into or borrow from.</Para>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
          {[
            { icon: "💰", label: "Lenders Deposit", desc: "Add funds to the pool and earn interest" },
            { icon: "🏦", label: "Pool Holds Funds", desc: "Smart contract manages all assets" },
            { icon: "📤", label: "Borrowers Borrow", desc: "Take funds against collateral" },
          ].map((s) => (
            <div key={s.label} className="bg-[#eef2ff] dark:bg-blue-950 rounded-2xl p-4 text-center">
              <div className="text-2xl mb-2">{s.icon}</div>
              <p className="text-sm font-bold text-[#1a2fb8] dark:text-blue-300">{s.label}</p>
              <p className="text-xs text-[#6b7280] dark:text-gray-400 mt-1">{s.desc}</p>
            </div>
          ))}
        </div>
        <Tip>Pool utilization = borrowed / total deposited. Higher utilization → higher interest rates to attract more lenders.</Tip>
      </>
    ),
  },
  {
    id: "collateral",
    emoji: "🔒",
    title: "What is Collateral?",
    content: (
      <>
        <Para>Collateral is an asset you lock up as security when borrowing. If you can't repay, the protocol uses your collateral to cover the loan.</Para>
        <Tip>Analogy: Like a home mortgage — the bank holds your house as collateral. In DeFi, the smart contract holds your crypto.</Tip>
        <SectionTitle>Why overcollateralization?</SectionTitle>
        <Para>Crypto prices are volatile. If you borrow $100, you might need to lock $150 worth of crypto. This protects lenders if prices drop.</Para>
        <SectionTitle>Common collateral types:</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
          {[
            { name: "Stablecoins", risk: "Low", color: "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300", desc: "USDC, USDT — pegged to USD" },
            { name: "ETH / BTC", risk: "Medium", color: "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300", desc: "Major assets, less volatile" },
            { name: "Memecoins", risk: "High", color: "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300", desc: "DOGE, SHIB — very risky" },
          ].map((c) => (
            <div key={c.name} className={`rounded-2xl p-4 ${c.color}`}>
              <p className="font-bold text-sm">{c.name}</p>
              <p className="text-xs mt-1">{c.desc}</p>
              <span className="text-xs font-bold mt-2 inline-block">Risk: {c.risk}</span>
            </div>
          ))}
        </div>
      </>
    ),
  },
  {
    id: "liquidation",
    emoji: "⚡",
    title: "Liquidation Explained",
    content: (
      <>
        <Para>Liquidation happens when your collateral value drops too low relative to your loan. The protocol sells your collateral to repay the debt.</Para>
        <SectionTitle>Example scenario:</SectionTitle>
        <div className="bg-[#f9fafb] dark:bg-gray-800 rounded-2xl p-4 mt-2 space-y-2 text-sm text-[#374151] dark:text-gray-300">
          <p>1. You deposit <strong>$150 ETH</strong> and borrow <strong>$100 USDC</strong></p>
          <p>2. ETH price drops — your collateral is now worth <strong>$110</strong></p>
          <p>3. Health factor falls below 1.0</p>
          <p>4. Protocol liquidates your ETH to repay the loan</p>
        </div>
        <Warn>Most protocols liquidate instantly. Vault gives you a <strong>3-day grace period</strong> to top up collateral before liquidation triggers.</Warn>
      </>
    ),
  },
  {
    id: "key-metrics",
    emoji: "📊",
    title: "Key Metrics: LTV, Threshold & Health Factor",
    content: (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
          {[
            {
              term: "Loan-to-Value (LTV)",
              color: "border-blue-400",
              bg: "bg-blue-50 dark:bg-blue-950",
              desc: "How much you can borrow vs your collateral.",
              example: "LTV 70% → deposit $100, borrow up to $70",
            },
            {
              term: "Liquidation Threshold",
              color: "border-amber-400",
              bg: "bg-amber-50 dark:bg-amber-950",
              desc: "The point at which liquidation is triggered.",
              example: "Threshold 80% → if loan reaches 80% of collateral value, liquidation starts",
            },
            {
              term: "Health Factor",
              color: "border-green-400",
              bg: "bg-green-50 dark:bg-green-950",
              desc: "A score showing how safe your position is. Below 1.0 = danger.",
              example: "Health > 1.5 = safe. Health < 1.0 = liquidation risk",
            },
          ].map((m) => (
            <div key={m.term} className={`rounded-2xl p-4 border-l-4 ${m.color} ${m.bg}`}>
              <p className="font-black text-sm text-[#111827] dark:text-white">{m.term}</p>
              <p className="text-xs text-[#6b7280] dark:text-gray-400 mt-1">{m.desc}</p>
              <p className="text-xs font-semibold text-[#374151] dark:text-gray-300 mt-2 italic">{m.example}</p>
            </div>
          ))}
        </div>
        <Tip>Keep your Health Factor above 1.5 to stay safe from liquidation even during market dips.</Tip>
      </>
    ),
  },
  {
    id: "interest-credit",
    emoji: "📈",
    title: "Interest, Repayment & Reputation Score",
    content: (
      <>
        <Para>Interest accrues on your loan every second, calculated as an annual rate applied continuously. The longer you hold a loan, the more you owe.</Para>
        <SectionTitle>Reputation Score</SectionTitle>
        <Para>Vault tracks your on-chain behavior to build a <strong>reputation score</strong>. A higher score means:</Para>
        <Bullet items={[
          "Lower collateral requirements",
          "Higher borrowing limits",
          "Better loan terms over time",
          "Faster approvals",
        ]} />
        <Tip>Repay loans on time to grow your score. Think of it as a DeFi credit score — but fully on-chain and transparent.</Tip>
        <Warn>Missing repayments or getting liquidated will lower your reputation score.</Warn>
      </>
    ),
  },
  {
    id: "gas-fees",
    emoji: "⛽",
    title: "Gas Fees & Why Base is Cheap",
    content: (
      <>
        <Para>Gas is the fee you pay to process a transaction on a blockchain. It compensates the network for computing power.</Para>
        <SectionTitle>Why Base?</SectionTitle>
        <Para>Vault is built on <strong>Base</strong> — an Ethereum Layer 2 chain by Coinbase. It inherits Ethereum's security but costs a fraction of the price.</Para>
        <div className="grid grid-cols-2 gap-3 mt-3">
          {[
            { chain: "Ethereum", fee: "~$5–$50", color: "text-red-500" },
            { chain: "Base", fee: "~$0.01–$0.10", color: "text-green-600 dark:text-green-400 font-bold" },
          ].map((c) => (
            <div key={c.chain} className="bg-[#f9fafb] dark:bg-gray-800 rounded-2xl p-4 text-center">
              <p className="text-sm font-bold text-[#111827] dark:text-white">{c.chain}</p>
              <p className={`text-lg font-black mt-1 ${c.color}`}>{c.fee}</p>
              <p className="text-xs text-[#6b7280] dark:text-gray-400">per transaction</p>
            </div>
          ))}
        </div>
        <Tip>With ERC-4337 Account Abstraction, Vault can sponsor your gas fees entirely — so you don't even need ETH to get started.</Tip>
      </>
    ),
  },
];

const CRYPTO_SECTIONS: Section[] = [
  {
    id: "stablecoins",
    emoji: "💵",
    title: "Stablecoins",
    content: (
      <>
        <Para>Stablecoins are cryptocurrencies pegged to a stable asset — usually the US Dollar. $1 USDC always equals ~$1.</Para>
        <SectionTitle>Types:</SectionTitle>
        <Bullet items={[
          "Fiat-backed: USDC, USDT — backed by real dollars in a bank",
          "Crypto-backed: DAI — backed by ETH locked in a smart contract",
          "Algorithmic: maintain peg via code (higher risk)",
        ]} />
        <Tip>Stablecoins are the safest collateral in DeFi — their value doesn't swing wildly like ETH or BTC.</Tip>
      </>
    ),
  },
  {
    id: "bitcoin",
    emoji: "₿",
    title: "Bitcoin (BTC)",
    content: (
      <>
        <Para>Bitcoin is the first and most well-known cryptocurrency. It's often called "digital gold" — a store of value with a fixed supply of 21 million coins.</Para>
        <Bullet items={[
          "Created in 2009 by the pseudonymous Satoshi Nakamoto",
          "No central authority controls it",
          "Used in DeFi as Wrapped BTC (WBTC) — an ERC-20 token backed 1:1 by BTC",
          "High volatility — price can swing 10–20% in a day",
        ]} />
        <Warn>BTC's volatility makes it medium-risk collateral. A sudden price drop can trigger liquidation.</Warn>
      </>
    ),
  },
  {
    id: "ethereum",
    emoji: "⟠",
    title: "Ethereum (ETH)",
    content: (
      <>
        <Para>Ethereum is the programmable blockchain that powers most of DeFi. Unlike Bitcoin, Ethereum supports smart contracts — making it the foundation for lending, trading, and more.</Para>
        <Bullet items={[
          "ETH is used to pay gas fees on Ethereum",
          "Most DeFi protocols are built on Ethereum or its Layer 2s (like Base)",
          "ETH is widely accepted as collateral",
          "More volatile than stablecoins, less volatile than memecoins",
        ]} />
        <Tip>Vault is built on Base — an Ethereum L2. Your ETH works here with near-zero fees.</Tip>
      </>
    ),
  },
  {
    id: "memecoins",
    emoji: "🐕",
    title: "Memecoins",
    content: (
      <>
        <Para>Memecoins are cryptocurrencies that started as jokes or internet memes — like Dogecoin (DOGE) or Shiba Inu (SHIB). They can gain massive value quickly... and lose it just as fast.</Para>
        <Warn>Memecoins are extremely high-risk. They are generally not accepted as collateral in serious DeFi protocols because their value can drop 90% overnight.</Warn>
        <Bullet items={[
          "Driven by social media hype, not fundamentals",
          "No guaranteed utility or backing",
          "Can 10x — or go to zero — in days",
          "Not suitable for collateral in lending protocols",
        ]} />
      </>
    ),
  },
  {
    id: "asset-comparison",
    emoji: "📋",
    title: "Crypto Asset Comparison",
    content: (
      <>
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-[#eef2ff] dark:bg-blue-950 text-[#1a2fb8] dark:text-blue-300">
                {["Asset", "Stability", "Risk", "Use Case", "DeFi Role"].map((h) => (
                  <th key={h} className="text-left px-3 py-2 font-bold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="text-[#374151] dark:text-gray-300">
              {[
                ["USDC / USDT", "🟢 High", "Low", "Payments, savings", "Collateral, borrowing"],
                ["ETH", "🟡 Medium", "Medium", "Gas, DeFi", "Collateral, staking"],
                ["BTC (WBTC)", "🟡 Medium", "Medium", "Store of value", "Collateral"],
                ["DOGE / SHIB", "🔴 Low", "Very High", "Speculation", "Not recommended"],
                ["DAI", "🟢 High", "Low-Med", "Stable DeFi asset", "Borrowing, collateral"],
              ].map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-[#f9fafb] dark:bg-gray-800"}>
                  {row.map((cell, j) => (
                    <td key={j} className="px-3 py-2">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    ),
  },
];

const PROTOCOL_SECTIONS: Section[] = [
  {
    id: "less-collateral",
    emoji: "🎯",
    title: "Less Collateral for New Users",
    content: (
      <>
        <Para>Most DeFi protocols require 150%+ collateral. Vault lowers this barrier using your <strong>reputation score</strong>. The more you use the protocol responsibly, the less collateral you need.</Para>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div className="bg-red-50 dark:bg-red-950 rounded-2xl p-4 text-center">
            <p className="text-xs text-[#6b7280] dark:text-gray-400">Other Protocols</p>
            <p className="text-2xl font-black text-red-500 mt-1">150%+</p>
            <p className="text-xs text-[#6b7280] dark:text-gray-400">collateral required</p>
          </div>
          <div className="bg-green-50 dark:bg-green-950 rounded-2xl p-4 text-center">
            <p className="text-xs text-[#6b7280] dark:text-gray-400">Vault (high reputation)</p>
            <p className="text-2xl font-black text-green-600 dark:text-green-400 mt-1">110%</p>
            <p className="text-xs text-[#6b7280] dark:text-gray-400">collateral required</p>
          </div>
        </div>
      </>
    ),
  },
  {
    id: "grace-period",
    emoji: "⏳",
    title: "3-Day Liquidation Grace Period",
    content: (
      <>
        <Para>When your health factor drops below 1.0, most protocols liquidate you <strong>immediately</strong>. Vault gives you <strong>3 days</strong> to top up your collateral or repay part of your loan.</Para>
        <Tip>This is a major user safety improvement — market dips are often temporary. A 3-day window lets you recover without losing your position.</Tip>
        <Bullet items={[
          "Receive an alert when health factor drops",
          "3 days to add collateral or repay",
          "No penalty if you recover in time",
          "Liquidation only triggers after grace period expires",
        ]} />
      </>
    ),
  },
  {
    id: "erc4337",
    emoji: "🔮",
    title: "ERC-4337: Gas-Free Transactions",
    content: (
      <>
        <Para>ERC-4337 is a standard called <strong>Account Abstraction</strong>. It lets Vault sponsor your gas fees — so you can use the protocol without holding any ETH for gas.</Para>
        <SectionTitle>What this means for you:</SectionTitle>
        <Bullet items={[
          "No ETH needed just to pay fees",
          "Vault's paymaster covers transaction costs",
          "Simpler onboarding — just connect and go",
          "Batch multiple actions into one transaction",
        ]} />
        <Tip>This is why Vault feels more like a web app than a typical DeFi protocol — the complexity is hidden under the hood.</Tip>
      </>
    ),
  },
  {
    id: "reputation",
    emoji: "⭐",
    title: "Reputation-Based Lending",
    content: (
      <>
        <Para>Your on-chain history builds a <strong>reputation score</strong> that unlocks better terms over time. It's DeFi's answer to a credit score — but transparent, permissionless, and sybil-resistant.</Para>
        <Bullet items={[
          "Repay on time → score increases",
          "Higher score → lower collateral ratio",
          "Sybil-resistant: tied to wallet behavior, not identity",
          "Fully on-chain — no third party controls it",
        ]} />
      </>
    ),
  },
];

const RISKS: { icon: string; title: string; desc: string; tip: string }[] = [
  { icon: "🐛", title: "Smart Contract Risk", desc: "Bugs in code can lead to loss of funds.", tip: "Use only audited protocols. Vault is audited." },
  { icon: "📉", title: "Market Volatility", desc: "Crypto prices can drop fast, triggering liquidation.", tip: "Keep health factor above 1.5 and monitor regularly." },
  { icon: "⚡", title: "Liquidation Risk", desc: "If collateral value falls too low, your position is closed.", tip: "Vault's 3-day grace period gives you time to react." },
  { icon: "🔑", title: "Wallet Security", desc: "Losing your private key means losing your funds forever.", tip: "Never share your seed phrase. Use a hardware wallet for large amounts." },
];

const JOURNEY = [
  { step: 1, icon: "💰", title: "Deposit Collateral", desc: "Lock your crypto (ETH, USDC) into the smart contract." },
  { step: 2, icon: "📤", title: "Borrow Funds", desc: "Receive up to your LTV limit in borrowed assets instantly." },
  { step: 3, icon: "📈", title: "Interest Accrues", desc: "Interest builds on your loan every second." },
  { step: 4, icon: "📊", title: "Monitor Health Factor", desc: "Keep an eye on your position. Stay above 1.5." },
  { step: 5, icon: "✅", title: "Repay & Unlock", desc: "Repay loan + interest to get your collateral back." },
];

// ─── Accordion item ───────────────────────────────────────────────────────────
function AccordionItem({ section, isOpen, onToggle }: {
  section: Section;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <Card className="overflow-hidden !p-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-[#f9fafb] dark:hover:bg-gray-800 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{section.emoji}</span>
          <span className="font-black text-[#111827] dark:text-white text-sm sm:text-base">{section.title}</span>
        </div>
        <span className={`text-[#1a2fb8] dark:text-blue-400 text-xl font-bold transition-transform ${isOpen ? "rotate-45" : ""}`}>+</span>
      </button>
      {isOpen && (
        <div className="px-6 pb-6 border-t border-[#e5e9f0] dark:border-gray-700 pt-4">
          {section.content}
        </div>
      )}
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function LearnPage() {
  const router = useRouter();
  const [openIds, setOpenIds] = useState<Set<string>>(new Set(["what-is-defi"]));

  const toggle = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const expandAll = (sections: Section[]) =>
    setOpenIds((prev) => new Set([...prev, ...sections.map((s) => s.id)]));

  return (
    <div className="min-h-screen bg-[#eef2f7] dark:bg-gray-950 pb-28 lg:pb-12 lg:pt-20 transition-colors">
      <Navbar />

      <div className="max-w-3xl mx-auto px-5 lg:px-8 pt-8">

        {/* Hero */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Tag color="bg-[#eef2ff] dark:bg-blue-950 text-[#1a2fb8] dark:text-blue-300">Beginner Friendly</Tag>
            <Tag color="bg-[#f0fdf4] dark:bg-green-950 text-[#16a34a] dark:text-green-400">Free to Read</Tag>
          </div>
          <h1 className="text-4xl font-black text-[#111827] dark:text-white leading-tight mb-3">
            Learn DeFi & Crypto
          </h1>
          <p className="text-[#6b7280] dark:text-gray-400 text-base leading-relaxed">
            Everything you need to know to use Vault confidently — no prior crypto knowledge required.
          </p>
        </div>

        {/* Quick nav cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
          {[
            { label: "DeFi Basics", emoji: "🏦", anchor: "defi" },
            { label: "Crypto Assets", emoji: "🪙", anchor: "crypto" },
            { label: "Why Vault", emoji: "🚀", anchor: "protocol" },
            { label: "Risks & Safety", emoji: "⚠️", anchor: "risks" },
          ].map((n) => (
            <button
              key={n.anchor}
              onClick={() => document.getElementById(n.anchor)?.scrollIntoView({ behavior: "smooth" })}
              className="bg-white dark:bg-gray-900 border border-[#e5e9f0] dark:border-gray-700 rounded-2xl p-4 text-center hover:border-[#1a2fb8] dark:hover:border-blue-500 hover:shadow-md transition-all"
            >
              <div className="text-2xl mb-1">{n.emoji}</div>
              <p className="text-xs font-bold text-[#374151] dark:text-gray-300">{n.label}</p>
            </button>
          ))}
        </div>

        {/* ── Part 1: DeFi Basics ── */}
        <div id="defi" className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black text-[#111827] dark:text-white">Part 1 — DeFi Basics</h2>
            <button onClick={() => expandAll(SECTIONS)} className="text-xs font-bold text-[#1a2fb8] dark:text-blue-400 hover:underline">
              Expand all
            </button>
          </div>
          <div className="space-y-3">
            {SECTIONS.map((s) => (
              <AccordionItem key={s.id} section={s} isOpen={openIds.has(s.id)} onToggle={() => toggle(s.id)} />
            ))}
          </div>
        </div>

        {/* ── Part 2: Crypto Basics ── */}
        <div id="crypto" className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black text-[#111827] dark:text-white">Part 2 — Crypto Assets</h2>
            <button onClick={() => expandAll(CRYPTO_SECTIONS)} className="text-xs font-bold text-[#1a2fb8] dark:text-blue-400 hover:underline">
              Expand all
            </button>
          </div>
          <div className="space-y-3">
            {CRYPTO_SECTIONS.map((s) => (
              <AccordionItem key={s.id} section={s} isOpen={openIds.has(s.id)} onToggle={() => toggle(s.id)} />
            ))}
          </div>
        </div>

        {/* ── Part 3: Why Vault ── */}
        <div id="protocol" className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black text-[#111827] dark:text-white">Part 3 — Why Vault is Different</h2>
            <button onClick={() => expandAll(PROTOCOL_SECTIONS)} className="text-xs font-bold text-[#1a2fb8] dark:text-blue-400 hover:underline">
              Expand all
            </button>
          </div>
          <div className="space-y-3">
            {PROTOCOL_SECTIONS.map((s) => (
              <AccordionItem key={s.id} section={s} isOpen={openIds.has(s.id)} onToggle={() => toggle(s.id)} />
            ))}
          </div>
        </div>

        {/* ── Part 4: Risks ── */}
        <div id="risks" className="mb-10">
          <h2 className="text-xl font-black text-[#111827] dark:text-white mb-4">Part 4 — Risks & Safety</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {RISKS.map((r) => (
              <Card key={r.title}>
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{r.icon}</span>
                  <div>
                    <p className="font-black text-sm text-[#111827] dark:text-white">{r.title}</p>
                    <p className="text-xs text-[#6b7280] dark:text-gray-400 mt-1">{r.desc}</p>
                    <p className="text-xs text-[#1a2fb8] dark:text-blue-400 font-semibold mt-2">✓ {r.tip}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* ── Part 5: User Journey ── */}
        <div className="mb-10">
          <h2 className="text-xl font-black text-[#111827] dark:text-white mb-4">Part 5 — Your Journey on Vault</h2>
          <div className="space-y-3">
            {JOURNEY.map((j, i) => (
              <div key={j.step} className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-[#1a2fb8] text-white flex items-center justify-center font-black text-sm flex-shrink-0">
                    {j.step}
                  </div>
                  {i < JOURNEY.length - 1 && <div className="w-0.5 h-6 bg-[#e5e9f0] dark:bg-gray-700 mt-1" />}
                </div>
                <Card className="flex-1 !py-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{j.icon}</span>
                    <p className="font-black text-sm text-[#111827] dark:text-white">{j.title}</p>
                  </div>
                  <p className="text-xs text-[#6b7280] dark:text-gray-400">{j.desc}</p>
                </Card>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <Card className="text-center mb-6 bg-[#1a2fb8] dark:bg-blue-900 border-0">
          <p className="text-white font-black text-xl mb-2">Ready to get started?</p>
          <p className="text-blue-200 text-sm mb-5">You now know enough to use Vault safely.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => router.push("/dashboard")}
              className="bg-white text-[#1a2fb8] font-bold px-6 py-3 rounded-2xl hover:bg-blue-50 transition-colors text-sm"
            >
              Go to Dashboard
            </button>
            <button
              onClick={() => router.push("/request-loan")}
              className="bg-[#4ade80] text-[#14532d] font-bold px-6 py-3 rounded-2xl hover:bg-green-400 transition-colors text-sm"
            >
              Borrow Now
            </button>
          </div>
        </Card>

      </div>
    </div>
  );
}

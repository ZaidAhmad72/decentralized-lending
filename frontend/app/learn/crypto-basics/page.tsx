"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import {
  Wallet, ArrowUpFromLine, HeartPulse, RotateCcw, Star,
  ChevronLeft, ChevronRight, CheckCircle2, Circle,
  ShieldCheck, Zap, TrendingUp, AlertTriangle, Clock,
  Coins, Lock, BarChart3, ArrowRight, Sparkles, BadgeCheck,
} from "lucide-react";

// ─── Slide data ───────────────────────────────────────────────────────────────

type Slide = {
  id: string;
  step: number;
  tag: string;
  tagColor: string;
  title: string;
  subtitle: string;
  visual: React.ReactNode;
  points: { icon: React.ElementType; color: string; text: string }[];
  cta?: { label: string; path: string };
};

// ─── Visual components used inside slides ─────────────────────────────────────

function WelcomeVisual() {
  return (
    <div className="relative flex items-center justify-center h-full">
      {/* Outer ring */}
      <div className="absolute w-52 h-52 rounded-full border-2 border-dashed border-blue-200 dark:border-blue-800 animate-spin" style={{ animationDuration: "20s" }} />
      {/* Middle ring */}
      <div className="absolute w-36 h-36 rounded-full border-2 border-blue-300 dark:border-blue-700 opacity-60" />
      {/* Center */}
      <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#1a2fb8] to-[#4f46e5] flex items-center justify-center shadow-2xl shadow-blue-500/30">
        <span className="text-white font-black text-3xl">V</span>
      </div>
      {/* Orbiting icons */}
      {[
        { Icon: Coins,    top: "8%",  left: "50%",  bg: "bg-amber-100 dark:bg-amber-900",   color: "text-amber-600" },
        { Icon: Lock,     top: "50%", left: "92%",  bg: "bg-green-100 dark:bg-green-900",   color: "text-green-600" },
        { Icon: Zap,      top: "85%", left: "50%",  bg: "bg-purple-100 dark:bg-purple-900", color: "text-purple-600" },
        { Icon: ShieldCheck, top: "50%", left: "8%", bg: "bg-blue-100 dark:bg-blue-900",   color: "text-blue-600" },
      ].map(({ Icon, top, left, bg, color }, i) => (
        <div key={i} className={`absolute w-10 h-10 rounded-xl ${bg} flex items-center justify-center shadow-md -translate-x-1/2 -translate-y-1/2`} style={{ top, left }}>
          <Icon size={18} className={color} />
        </div>
      ))}
    </div>
  );
}

function DepositVisual() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 h-full">
      {/* Wallet → Pool flow */}
      <div className="flex items-center gap-3 w-full max-w-xs">
        <div className="flex-1 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 rounded-2xl p-4 text-center border border-blue-200 dark:border-blue-800">
          <Wallet size={28} className="text-[#1a2fb8] dark:text-blue-400 mx-auto mb-2" />
          <p className="text-xs font-bold text-[#1a2fb8] dark:text-blue-300">Your Wallet</p>
          <p className="text-lg font-black text-[#111827] dark:text-white mt-1">$500</p>
        </div>
        <div className="flex flex-col items-center gap-1">
          <ArrowRight size={20} className="text-[#1a2fb8] dark:text-blue-400" />
          <span className="text-xs text-[#6b7280] font-semibold">Deposit</span>
        </div>
        <div className="flex-1 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 rounded-2xl p-4 text-center border border-green-200 dark:border-green-800">
          <BarChart3 size={28} className="text-green-600 dark:text-green-400 mx-auto mb-2" />
          <p className="text-xs font-bold text-green-700 dark:text-green-300">Pool</p>
          <p className="text-lg font-black text-[#111827] dark:text-white mt-1">$2,700</p>
        </div>
      </div>
      {/* Earning indicator */}
      <div className="flex items-center gap-2 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-xl px-4 py-2">
        <TrendingUp size={16} className="text-green-600 dark:text-green-400" />
        <span className="text-sm font-bold text-green-700 dark:text-green-300">Earning interest automatically</span>
      </div>
    </div>
  );
}

function BorrowVisual() {
  const [ltv, setLtv] = useState(60);
  useEffect(() => {
    const t = setInterval(() => setLtv((v) => (v >= 85 ? 60 : v + 5)), 800);
    return () => clearInterval(t);
  }, []);
  const safe = ltv <= 75;
  return (
    <div className="flex flex-col items-center justify-center gap-5 h-full">
      {/* LTV meter */}
      <div className="w-full max-w-xs">
        <div className="flex justify-between text-xs font-semibold mb-2">
          <span className="text-[#6b7280] dark:text-gray-400">Loan-to-Value</span>
          <span className={safe ? "text-green-600 dark:text-green-400" : "text-red-500"}>{ltv}%</span>
        </div>
        <div className="h-3 bg-[#e5e9f0] dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${ltv <= 70 ? "bg-green-500" : ltv <= 80 ? "bg-yellow-500" : "bg-red-500"}`}
            style={{ width: `${ltv}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-[#9ca3af] mt-1">
          <span>Safe</span><span>Caution</span><span>Risk</span>
        </div>
      </div>
      {/* Collateral → Loan */}
      <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
        <div className="bg-amber-50 dark:bg-amber-950 rounded-2xl p-3 text-center border border-amber-200 dark:border-amber-800">
          <Lock size={20} className="text-amber-600 dark:text-amber-400 mx-auto mb-1" />
          <p className="text-xs text-[#6b7280] dark:text-gray-400">Collateral</p>
          <p className="text-base font-black text-[#111827] dark:text-white">$1,000</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-950 rounded-2xl p-3 text-center border border-blue-200 dark:border-blue-800">
          <ArrowUpFromLine size={20} className="text-[#1a2fb8] dark:text-blue-400 mx-auto mb-1" />
          <p className="text-xs text-[#6b7280] dark:text-gray-400">You Borrow</p>
          <p className="text-base font-black text-[#111827] dark:text-white">${Math.floor(1000 * ltv / 100)}</p>
        </div>
      </div>
    </div>
  );
}

function HealthVisual() {
  const [health, setHealth] = useState(2.1);
  useEffect(() => {
    const t = setInterval(() => setHealth((v) => parseFloat((v <= 0.9 ? 2.1 : v - 0.1).toFixed(1))), 600);
    return () => clearInterval(t);
  }, []);
  const color = health >= 1.5 ? "text-green-600 dark:text-green-400" : health >= 1.0 ? "text-yellow-500" : "text-red-500";
  const barColor = health >= 1.5 ? "bg-green-500" : health >= 1.0 ? "bg-yellow-500" : "bg-red-500";
  const label = health >= 1.5 ? "Safe" : health >= 1.0 ? "Caution" : "Danger";
  return (
    <div className="flex flex-col items-center justify-center gap-5 h-full">
      {/* Big health number */}
      <div className="text-center">
        <p className="text-xs font-semibold text-[#6b7280] dark:text-gray-400 uppercase tracking-widest mb-1">Health Factor</p>
        <p className={`text-6xl font-black transition-colors duration-300 ${color}`}>{health.toFixed(1)}</p>
        <span className={`text-sm font-bold px-3 py-1 rounded-full mt-2 inline-block ${
          health >= 1.5 ? "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400"
          : health >= 1.0 ? "bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-400"
          : "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400"
        }`}>{label}</span>
      </div>
      {/* Bar */}
      <div className="w-full max-w-xs">
        <div className="h-3 bg-[#e5e9f0] dark:bg-gray-700 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${Math.min((health / 2.5) * 100, 100)}%` }} />
        </div>
        <div className="flex justify-between text-xs text-[#9ca3af] mt-1.5">
          <span>0 — Liquidation</span><span>1.5 — Safe</span><span>2.5+</span>
        </div>
      </div>
      {/* Grace period badge */}
      <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-2">
        <Clock size={15} className="text-[#1a2fb8] dark:text-blue-400" />
        <span className="text-xs font-semibold text-[#1a2fb8] dark:text-blue-300">Vault gives you 3 days before liquidation</span>
      </div>
    </div>
  );
}

function RepayVisual() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 h-full">
      {/* Timeline */}
      <div className="w-full max-w-xs space-y-3">
        {[
          { Icon: ArrowUpFromLine, label: "Borrowed",    value: "$600",  color: "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400",   done: true },
          { Icon: TrendingUp,      label: "Interest",    value: "+$14",  color: "bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-400", done: true },
          { Icon: RotateCcw,       label: "Repay Total", value: "$614",  color: "bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400", done: false },
          { Icon: Star,            label: "Rep Boost",   value: "+10 pts", color: "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400", done: false },
        ].map((row, i, arr) => (
          <div key={row.label} className="flex items-center gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${row.color}`}>
                <row.Icon size={16} />
              </div>
              {i < arr.length - 1 && <div className="w-0.5 h-3 bg-[#e5e9f0] dark:bg-gray-700" />}
            </div>
            <div className="flex-1 flex justify-between items-center bg-white dark:bg-gray-800 rounded-xl px-3 py-2 border border-[#e5e9f0] dark:border-gray-700">
              <span className="text-sm text-[#374151] dark:text-gray-300">{row.label}</span>
              <span className="text-sm font-black text-[#111827] dark:text-white">{row.value}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReputationVisual() {
  const tiers = [
    { label: "New",       range: "0–29",   ltv: "60%", color: "bg-gray-200 dark:bg-gray-700",    text: "text-gray-600 dark:text-gray-400",    active: false },
    { label: "Fair",      range: "30–49",  ltv: "65%", color: "bg-yellow-200 dark:bg-yellow-900", text: "text-yellow-700 dark:text-yellow-400", active: false },
    { label: "Good",      range: "50–74",  ltv: "75%", color: "bg-blue-200 dark:bg-blue-900",    text: "text-blue-700 dark:text-blue-400",    active: true },
    { label: "Excellent", range: "75–100", ltv: "85%", color: "bg-green-200 dark:bg-green-900",  text: "text-green-700 dark:text-green-400",  active: false },
  ];
  return (
    <div className="flex flex-col items-center justify-center gap-4 h-full">
      <div className="flex items-end gap-2 w-full max-w-xs">
        {tiers.map((t, i) => (
          <div key={t.label} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-xs font-bold text-[#374151] dark:text-gray-300">{t.ltv}</span>
            <div
              className={`w-full rounded-t-xl transition-all ${t.color} ${t.active ? "ring-2 ring-[#1a2fb8] dark:ring-blue-400" : ""}`}
              style={{ height: `${40 + i * 20}px` }}
            />
            <span className={`text-xs font-bold ${t.text}`}>{t.label}</span>
            <span className="text-xs text-[#9ca3af]">{t.range}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 bg-[#eef2ff] dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-2">
        <BadgeCheck size={15} className="text-[#1a2fb8] dark:text-blue-400" />
        <span className="text-xs font-semibold text-[#1a2fb8] dark:text-blue-300">Higher score = lower collateral needed</span>
      </div>
    </div>
  );
}

// ─── Slide definitions ────────────────────────────────────────────────────────

const SLIDES: Slide[] = [
  {
    id: "welcome",
    step: 1,
    tag: "Welcome to Vault",
    tagColor: "bg-[#eef2ff] dark:bg-blue-950 text-[#1a2fb8] dark:text-blue-300",
    title: "Your DeFi Lending Platform",
    subtitle: "Vault lets you lend, borrow, and grow your crypto — without banks, paperwork, or credit checks.",
    visual: <WelcomeVisual />,
    points: [
      { icon: ShieldCheck,  color: "text-green-600 dark:text-green-400",  text: "Non-custodial — you always control your funds" },
      { icon: Zap,          color: "text-amber-600 dark:text-amber-400",  text: "Powered by Base — near-zero gas fees" },
      { icon: Sparkles,     color: "text-purple-600 dark:text-purple-400", text: "ERC-4337 Account Abstraction — gas-free UX" },
      { icon: BadgeCheck,   color: "text-blue-600 dark:text-blue-400",    text: "Reputation-based lending — better terms over time" },
    ],
  },
  {
    id: "deposit",
    step: 2,
    tag: "Step 1 — Deposit",
    tagColor: "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400",
    title: "Add Funds to the Pool",
    subtitle: "Deposit your crypto into the shared liquidity pool and start earning interest automatically.",
    visual: <DepositVisual />,
    points: [
      { icon: Coins,       color: "text-amber-600 dark:text-amber-400",  text: "Deposit USDC, ETH, or other supported assets" },
      { icon: TrendingUp,  color: "text-green-600 dark:text-green-400",  text: "Interest accrues every second — no lock-up" },
      { icon: ShieldCheck, color: "text-blue-600 dark:text-blue-400",    text: "Funds are secured by audited smart contracts" },
      { icon: Zap,         color: "text-purple-600 dark:text-purple-400", text: "Withdraw anytime when liquidity is available" },
    ],
    cta: { label: "Deposit Now", path: "/deposit" },
  },
  {
    id: "borrow",
    step: 3,
    tag: "Step 2 — Borrow",
    tagColor: "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400",
    title: "Borrow Against Collateral",
    subtitle: "Lock up collateral and borrow up to your credit limit instantly — no approval needed.",
    visual: <BorrowVisual />,
    points: [
      { icon: Lock,        color: "text-amber-600 dark:text-amber-400",  text: "Collateral is locked in the smart contract" },
      { icon: BarChart3,   color: "text-blue-600 dark:text-blue-400",    text: "LTV ratio determines how much you can borrow" },
      { icon: BadgeCheck,  color: "text-green-600 dark:text-green-400",  text: "Higher reputation score = higher LTV limit" },
      { icon: Zap,         color: "text-purple-600 dark:text-purple-400", text: "Funds arrive in your wallet instantly" },
    ],
    cta: { label: "Borrow Now", path: "/request-loan" },
  },
  {
    id: "health",
    step: 4,
    tag: "Step 3 — Monitor",
    tagColor: "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400",
    title: "Watch Your Health Factor",
    subtitle: "Your Health Factor shows how safe your position is. Keep it above 1.5 to avoid liquidation.",
    visual: <HealthVisual />,
    points: [
      { icon: HeartPulse,     color: "text-green-600 dark:text-green-400",  text: "Health > 1.5 — you're safe, no action needed" },
      { icon: AlertTriangle,  color: "text-yellow-600 dark:text-yellow-400", text: "Health 1.0–1.5 — add collateral or repay some" },
      { icon: Clock,          color: "text-blue-600 dark:text-blue-400",    text: "Health < 1.0 — 3-day grace period before liquidation" },
      { icon: ShieldCheck,    color: "text-purple-600 dark:text-purple-400", text: "Vault alerts you before your position is at risk" },
    ],
  },
  {
    id: "repay",
    step: 5,
    tag: "Step 4 — Repay",
    tagColor: "bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-400",
    title: "Repay & Unlock Collateral",
    subtitle: "Repay your loan plus interest to get your collateral back and boost your reputation score.",
    visual: <RepayVisual />,
    points: [
      { icon: RotateCcw,   color: "text-purple-600 dark:text-purple-400", text: "Repay principal + interest in one transaction" },
      { icon: Lock,        color: "text-amber-600 dark:text-amber-400",   text: "Collateral is released back to your wallet" },
      { icon: Star,        color: "text-yellow-600 dark:text-yellow-400", text: "+10 reputation points for on-time repayment" },
      { icon: TrendingUp,  color: "text-green-600 dark:text-green-400",   text: "Better score unlocks higher limits next time" },
    ],
    cta: { label: "Repay Loan", path: "/repay" },
  },
  {
    id: "reputation",
    step: 6,
    tag: "Pro Tip — Reputation",
    tagColor: "bg-yellow-50 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-400",
    title: "Build Your On-Chain Credit",
    subtitle: "Vault tracks your repayment history to build a reputation score — your DeFi credit score.",
    visual: <ReputationVisual />,
    points: [
      { icon: Star,        color: "text-yellow-600 dark:text-yellow-400", text: "Repay on time → score goes up" },
      { icon: BadgeCheck,  color: "text-green-600 dark:text-green-400",   text: "Higher score → lower collateral requirements" },
      { icon: ShieldCheck, color: "text-blue-600 dark:text-blue-400",     text: "Score is fully on-chain — transparent and fair" },
      { icon: Sparkles,    color: "text-purple-600 dark:text-purple-400", text: "Excellent tier unlocks 85% LTV borrowing" },
    ],
    cta: { label: "Go to Dashboard", path: "/dashboard" },
  },
];

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SetupGuidePage() {
  const router = useRouter();
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [direction, setDirection] = useState<"next" | "prev">("next");

  const slide = SLIDES[current];
  const isFirst = current === 0;
  const isLast = current === SLIDES.length - 1;

  const go = useCallback((dir: "next" | "prev") => {
    if (animating) return;
    const next = dir === "next" ? current + 1 : current - 1;
    if (next < 0 || next >= SLIDES.length) return;
    setDirection(dir);
    setAnimating(true);
    setTimeout(() => {
      setCurrent(next);
      setAnimating(false);
    }, 180);
  }, [animating, current]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go("next");
      if (e.key === "ArrowLeft") go("prev");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [go]);

  return (
    <div className="min-h-screen bg-[#eef2f7] dark:bg-gray-950 pb-28 lg:pb-10 lg:pt-20 transition-colors">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#111827] dark:text-white">Setup Guide</h1>
            <p className="text-sm text-[#6b7280] dark:text-gray-400 mt-0.5">Learn how Vault works in 6 steps</p>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-[#6b7280] dark:text-gray-400">{current + 1} / {SLIDES.length}</span>
            <div className="flex gap-1.5 mt-1.5">
              {SLIDES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { setDirection(i > current ? "next" : "prev"); setCurrent(i); }}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === current ? "w-6 bg-[#1a2fb8] dark:bg-blue-400" : "w-1.5 bg-[#d1d5db] dark:bg-gray-600 hover:bg-[#9ca3af]"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Slide card */}
        <div
          className={`bg-white dark:bg-gray-900 rounded-3xl shadow-lg border border-[#e5e9f0] dark:border-gray-700 overflow-hidden transition-all duration-180 ${
            animating
              ? direction === "next" ? "opacity-0 translate-x-4" : "opacity-0 -translate-x-4"
              : "opacity-100 translate-x-0"
          }`}
          style={{ transition: "opacity 180ms ease, transform 180ms ease" }}
        >
          {/* Top accent bar */}
          <div className="h-1 w-full bg-gradient-to-r from-[#1a2fb8] via-[#4f46e5] to-[#7c3aed]" />

          <div className="p-6 sm:p-8">
            {/* Tag + step */}
            <div className="flex items-center justify-between mb-5">
              <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${slide.tagColor}`}>{slide.tag}</span>
              <div className="flex items-center gap-1.5">
                {SLIDES.map((_, i) => (
                  i <= current
                    ? <CheckCircle2 key={i} size={14} className="text-[#1a2fb8] dark:text-blue-400" />
                    : <Circle key={i} size={14} className="text-[#d1d5db] dark:text-gray-600" />
                ))}
              </div>
            </div>

            {/* Title */}
            <h2 className="text-2xl sm:text-3xl font-black text-[#111827] dark:text-white leading-tight mb-2">
              {slide.title}
            </h2>
            <p className="text-sm sm:text-base text-[#6b7280] dark:text-gray-400 leading-relaxed mb-8">
              {slide.subtitle}
            </p>

            {/* Main content: visual + points */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">

              {/* Visual panel */}
              <div className="bg-[#f9fafb] dark:bg-gray-800 rounded-2xl border border-[#e5e9f0] dark:border-gray-700 h-64 sm:h-72 p-4 flex items-center justify-center">
                {slide.visual}
              </div>

              {/* Points */}
              <div className="space-y-4">
                {slide.points.map((pt, i) => (
                  <div key={i} className="flex items-start gap-3 group">
                    <div className="w-9 h-9 rounded-xl bg-[#f3f4f6] dark:bg-gray-800 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                      <pt.icon size={17} className={pt.color} />
                    </div>
                    <p className="text-sm text-[#374151] dark:text-gray-300 leading-relaxed pt-1.5">{pt.text}</p>
                  </div>
                ))}

                {/* CTA inside slide */}
                {slide.cta && (
                  <button
                    onClick={() => router.push(slide.cta!.path)}
                    className="mt-2 flex items-center gap-2 text-sm font-bold text-[#1a2fb8] dark:text-blue-400 hover:underline"
                  >
                    {slide.cta.label}
                    <ArrowRight size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={() => go("prev")}
            disabled={isFirst}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-white dark:bg-gray-900 border border-[#e5e9f0] dark:border-gray-700 text-[#374151] dark:text-gray-300 hover:border-[#1a2fb8] dark:hover:border-blue-500 hover:shadow-sm"
          >
            <ChevronLeft size={16} />
            Previous
          </button>

          {/* Step pills */}
          <div className="hidden sm:flex items-center gap-2">
            {SLIDES.map((s, i) => (
              <button
                key={s.id}
                onClick={() => { setDirection(i > current ? "next" : "prev"); setCurrent(i); }}
                className={`w-8 h-8 rounded-xl text-xs font-black transition-all ${
                  i === current
                    ? "bg-[#1a2fb8] text-white shadow-md scale-110"
                    : i < current
                    ? "bg-[#eef2ff] dark:bg-blue-950 text-[#1a2fb8] dark:text-blue-400"
                    : "bg-[#f3f4f6] dark:bg-gray-800 text-[#9ca3af] dark:text-gray-500"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          {isLast ? (
            <button
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm bg-[#4ade80] text-[#14532d] hover:bg-green-400 transition-all shadow-sm"
            >
              <CheckCircle2 size={16} />
              Go to Dashboard
            </button>
          ) : (
            <button
              onClick={() => go("next")}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm bg-[#1a2fb8] text-white hover:bg-[#1527a0] transition-all shadow-sm"
            >
              Next
              <ChevronRight size={16} />
            </button>
          )}
        </div>

        {/* Keyboard hint */}
        <p className="text-center text-xs text-[#9ca3af] dark:text-gray-600 mt-4">
          Use ← → arrow keys to navigate
        </p>

      </div>
    </div>
  );
}

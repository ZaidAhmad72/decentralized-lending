import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import {
  detectFraud,
  computeTrustScore,
  shouldBlacklist,
  type FraudAction,
  type FraudFlag,
  type UserFraudContext,
} from "@/lib/fraud";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const body = await req.json();
    const { userId, action } = body as {
      userId: string;
      action: FraudAction & { amount?: number; loansToday?: number };
    };

    if (!userId || !action?.type) {
      return NextResponse.json({ error: "userId and action are required" }, { status: 400 });
    }

    // ── 1. Fetch reputation row ───────────────────────────────────────────────
    const { data: rep } = await supabase
      .from("reputation")
      .select("credit_score, avg_borrow, fraud_score, fraud_flags, fraud_count, status, trust_score")
      .eq("user_id", userId)
      .maybeSingle();

    if (!rep) {
      return NextResponse.json({ error: "User reputation not found" }, { status: 404 });
    }

    // ── 2. Gather context ─────────────────────────────────────────────────────

    // R1: txns in last 60s
    const since60s = new Date(Date.now() - 60_000).toISOString();
    const { count: recentTxCount } = await supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", since60s);

    // R2: loans today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const { count: loansToday } = await supabase
      .from("loans")
      .select("id", { count: "exact", head: true })
      .eq("borrower_id", userId)
      .gte("created_at", todayStart.toISOString())
      .lte("created_at", todayEnd.toISOString());

    // R3: any defaulted loan
    const { count: defaultCount } = await supabase
      .from("loans")
      .select("id", { count: "exact", head: true })
      .eq("borrower_id", userId)
      .eq("status", "defaulted");

    const ctx: UserFraudContext = {
      recentTxCount: recentTxCount ?? 0,
      loansToday: loansToday ?? 0,
      hasDefault: (defaultCount ?? 0) > 0,
      avgBorrow: rep.avg_borrow ?? 0,
    };

    // Attach loansToday to action for R2 check
    const enrichedAction: FraudAction =
      action.type === "loan_request"
        ? { ...action, loansToday: ctx.loansToday }
        : action;

    // ── 3. Run detection ──────────────────────────────────────────────────────
    const { fraudScore, flags } = detectFraud(ctx, enrichedAction);

    if (flags.length === 0) {
      // No fraud detected — return current status
      return NextResponse.json({
        fraudScore: rep.fraud_score ?? 0,
        trustScore: rep.trust_score ?? rep.credit_score,
        status: rep.status ?? "ACTIVE",
        flags: [],
        loansToday: ctx.loansToday,
        dailyLimitReached: ctx.loansToday >= 3,
      });
    }

    // ── 4. Compute updates ────────────────────────────────────────────────────
    const isPrivatePool = action.isPrivatePool === true;
    const existingFlags: FraudFlag[] = Array.isArray(rep.fraud_flags) ? rep.fraud_flags : [];
    const mergedFlags = [...existingFlags, ...flags].slice(-50);

    const newFraudScore = Math.min(100, (rep.fraud_score ?? 0) + fraudScore);
    const newFraudCount = (rep.fraud_count ?? 0) + 1;
    const currentTrust = rep.trust_score ?? rep.credit_score ?? 500;
    const newTrustScore = computeTrustScore(currentTrust, fraudScore, isPrivatePool);
    const blacklisted = shouldBlacklist(newFraudScore, newFraudCount);
    const newStatus = blacklisted ? "BLACKLISTED" : (rep.status ?? "ACTIVE");

    // ── 5. Persist ────────────────────────────────────────────────────────────
    await supabase
      .from("reputation")
      .update({
        fraud_score: newFraudScore,
        fraud_flags: mergedFlags,
        fraud_count: newFraudCount,
        trust_score: Math.round(newTrustScore),
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    return NextResponse.json({
      fraudScore: newFraudScore,
      trustScore: Math.round(newTrustScore),
      status: newStatus,
      flags,
      loansToday: ctx.loansToday,
      dailyLimitReached: ctx.loansToday >= 3,
      isPrivatePool,
    });
  } catch (err) {
    console.error("Fraud API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

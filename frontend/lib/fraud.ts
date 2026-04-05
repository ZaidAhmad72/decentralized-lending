/**
 * lib/fraud.ts
 * Rule-based fraud detection engine.
 *
 * Rules:
 *   R1 — Rapid Transactions:       >5 txns in 60s          → +20
 *   R2 — Daily Loan Limit:         loans_today > 3          → +25
 *   R3 — Missed Repayment:         defaulted loan exists    → +40
 *   R4 — Abnormal Amount Spike:    amount > 2× avg_borrow   → +15
 *
 * Trust score: trust_score -= fraud_score * 0.3  (skipped for private pool)
 * Blacklist:   fraud_score > 80 OR fraud_count >= 3
 */

export const DAILY_LOAN_LIMIT = 3;

export type FraudAction =
  | { type: "loan_request"; amount: number; loansToday: number; isPrivatePool?: boolean }
  | { type: "transaction"; isPrivatePool?: boolean }
  | { type: "repayment"; isPrivatePool?: boolean };

export interface FraudFlag {
  rule: string;
  score: number;
  detail: string;
  timestamp: string;
}

export interface FraudDetectionResult {
  fraudScore: number;
  flags: FraudFlag[];
}

export interface UserFraudContext {
  recentTxCount: number;   // txns in last 60s
  loansToday: number;      // loans created today
  hasDefault: boolean;     // any defaulted loan
  avgBorrow: number;       // avg_borrow from reputation table
}

function flag(rule: string, score: number, detail: string): FraudFlag {
  return { rule, score, detail, timestamp: new Date().toISOString() };
}

/**
 * Pure, deterministic fraud detection — no DB calls, fully testable.
 */
export function detectFraud(
  ctx: UserFraudContext,
  action: FraudAction
): FraudDetectionResult {
  const flags: FraudFlag[] = [];

  // R1 — Rapid Transactions
  if (ctx.recentTxCount > 5) {
    flags.push(flag(
      "RAPID_TRANSACTIONS",
      20,
      `${ctx.recentTxCount} transactions in the last 60 seconds`
    ));
  }

  // R2 — Daily Loan Limit (loan_request only)
  if (action.type === "loan_request" && ctx.loansToday > DAILY_LOAN_LIMIT) {
    flags.push(flag(
      "DAILY_LOAN_LIMIT_EXCEEDED",
      25,
      `${ctx.loansToday} loans today (limit: ${DAILY_LOAN_LIMIT})`
    ));
  }

  // R3 — Missed Repayment / Default
  if (ctx.hasDefault) {
    flags.push(flag(
      "MISSED_REPAYMENT",
      40,
      "One or more defaulted loans on record"
    ));
  }

  // R4 — Abnormal Amount Spike (loan_request only)
  if (
    action.type === "loan_request" &&
    ctx.avgBorrow > 0 &&
    action.amount > ctx.avgBorrow * 2
  ) {
    flags.push(flag(
      "ABNORMAL_AMOUNT_SPIKE",
      15,
      `Requested ${action.amount.toFixed(4)} ETH vs avg ${ctx.avgBorrow.toFixed(4)} ETH (${(action.amount / ctx.avgBorrow).toFixed(1)}×)`
    ));
  }

  const fraudScore = Math.min(100, flags.reduce((s, f) => s + f.score, 0));
  return { fraudScore, flags };
}

/**
 * Compute updated trust score.
 * Skipped entirely for private pool actions.
 */
export function computeTrustScore(
  currentTrustScore: number,
  fraudScore: number,
  isPrivatePool: boolean
): number {
  if (isPrivatePool) return currentTrustScore;
  return Math.max(0, currentTrustScore - fraudScore * 0.3);
}

/**
 * Determine if user should be blacklisted.
 */
export function shouldBlacklist(fraudScore: number, fraudCount: number): boolean {
  return fraudScore > 80 || fraudCount >= 3;
}

/**
 * creditTier.ts
 * Single source of truth for credit score tiers, LTV mapping,
 * and context-aware multilingual labels.
 *
 * Score ranges:
 *   0–399   → Poor
 *   400–649 → Average
 *   650–799 → Good
 *   800+    → Excellent
 */

export type CreditTierKey = "Poor" | "Average" | "Good" | "Excellent";

// ─── Score → tier key ─────────────────────────────────────────────────────────

export function getCreditTierKey(score: number): CreditTierKey {
  if (score >= 800) return "Excellent";
  if (score >= 650) return "Good";
  if (score >= 400) return "Average";
  return "Poor";
}

// ─── Tier → max LTV ──────────────────────────────────────────────────────────

export function getMaxLTVFromTier(tier: CreditTierKey): number {
  switch (tier) {
    case "Excellent": return 0.85;
    case "Good":      return 0.75;
    case "Average":   return 0.65;
    case "Poor":      return 0.60;
  }
}

export function getMaxLTV(score: number): number {
  return getMaxLTVFromTier(getCreditTierKey(score));
}

// ─── Localized labels ─────────────────────────────────────────────────────────
// Translations are finance-context-aware, NOT literal word translations.
// "Average" avoids "Fair" which translates to skin-tone words in several languages.

const TIER_LABELS: Record<string, Record<CreditTierKey, string>> = {
  en: { Poor: "Poor",      Average: "Average",  Good: "Good",    Excellent: "Excellent"  },
  hi: { Poor: "कमज़ोर",    Average: "औसत",      Good: "अच्छा",   Excellent: "उत्कृष्ट"  },
  mr: { Poor: "कमकुवत",   Average: "सामान्य",  Good: "चांगले",  Excellent: "उत्कृष्ट"  },
  ta: { Poor: "குறைவான",  Average: "சராசரி",   Good: "நல்லது",  Excellent: "சிறந்தது"  },
  te: { Poor: "బలహీనమైన", Average: "సగటు",     Good: "మంచిది", Excellent: "అద్భుతమైన" },
  kn: { Poor: "ದುರ್ಬಲ",   Average: "ಸಾಮಾನ್ಯ",  Good: "ಉತ್ತಮ",  Excellent: "ಅತ್ಯುತ್ತಮ" },
  gu: { Poor: "નબળો",     Average: "સામાન્ય",  Good: "સારો",   Excellent: "ઉત્કૃષ્ટ"  },
};

/**
 * Returns the localized credit tier label for a given score and language.
 * Falls back to English if the language is not supported.
 */
export function getCreditTierLabel(score: number, lang = "en"): string {
  const tier = getCreditTierKey(score);
  const labels = TIER_LABELS[lang] ?? TIER_LABELS.en;
  return labels[tier];
}

// ─── Badge styling per tier ───────────────────────────────────────────────────

export const TIER_BADGE_STYLES: Record<CreditTierKey, string> = {
  Poor:      "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400",
  Average:   "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400",
  Good:      "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400",
  Excellent: "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400",
};

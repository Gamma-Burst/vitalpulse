import { SubscriptionState, SubscriptionTier } from "@/types/vitalpulse";

export const FREE_DAILY_FW_AI_LIMIT = 5;
export const FREE_DAILY_VISION_SCAN_LIMIT = 3;
export const FW_PLUS_DAILY_SOFT_CAP = 80;

export interface FolloWeightPlanSpec {
  id: SubscriptionTier;
  badgeFr: string;
  nameFr: string;
  priceLabelFr: string;
  subPriceLabelFr?: string;
  channelFr: string;
  recommended?: boolean;
  highlightsFr: string[];
}

export const FOLLOWEIGHT_PLANS: FolloWeightPlanSpec[] = [
  {
    id: "free",
    badgeFr: "GRATUIT À VIE · 0 €",
    nameFr: "FolloWeight Essentiel",
    priceLabelFr: "0 €",
    subPriceLabelFr: "Zéro publicité · Données privées locales",
    channelFr: "Web & Android inclus",
    highlightsFr: [
      "Scan code-barres OpenFoodFacts illimité",
      "Minuteur Jeûne & OMAD (23:1) + notifications fenêtre",
      "Courbe poids lissé EMA, mensurations US Navy & photos 100 % locales",
      "44 exercices & 10 sports + ravitaillement ISSN + montres connectées",
      "Analyse bilan sanguin déterministe + Lexique Santé (?)",
      "5 questions Coach FW AI / jour + 3 scans photo IA / jour offerts",
    ],
  },
  {
    id: "pro_annual",
    badgeFr: "RECOMMANDÉ · −50 %",
    nameFr: "FolloWeight Plus (FW+) Annuel",
    priceLabelFr: "29,99 € / an",
    subPriceLabelFr: "Soit 2,49 € / mois · 7 jours d'essai gratuit",
    channelFr: "Google Play Billing (RevenueCat)",
    recommended: true,
    highlightsFr: [
      "Coach FW AI illimité 24h/24 (usage personnel raisonnable jusqu'à 80 req/j)",
      "Scans photo repas & frigo illimités avec historique comparatif",
      "Tendances multi-bilans sanguins & suivi glycémie/lipides/foie dans le temps",
      "Périodisation musculation, progression tonnage & ravitaillement sport avancé",
      "Rappel transparent J-2 avant fin d'essai · Annulation en 2 clics",
    ],
  },
  {
    id: "pro_monthly",
    badgeFr: "FLEXIBLE",
    nameFr: "FolloWeight Plus (FW+) Mensuel",
    priceLabelFr: "4,99 € / mois",
    subPriceLabelFr: "Sans engagement · Résiliable à tout moment",
    channelFr: "Google Play Billing (RevenueCat)",
    highlightsFr: [
      "Tout FolloWeight Plus (FW AI + Vision IA illimités, multi-bilans, sport)",
      "Idéal pour tester sur 1 à 2 mois avant de basculer sur l'annuel",
    ],
  },
  {
    id: "founder_lifetime",
    badgeFr: "1 000 PLACES · WEB DIRECT",
    nameFr: "Pass Fondateur 5 ans (followeight.com)",
    priceLabelFr: "69,90 € une fois",
    subPriceLabelFr: "Soit ~1,17 € / mois sur 5 ans · Badge Fondateur numéroté",
    channelFr: "followeight.com (Stripe Web Checkout)",
    highlightsFr: [
      "Accès FW+ complet pendant 5 ans sur followeight.com et Android (compte lié)",
      "Aucune commission store 15–30 % : soutient directement le développement",
      "Accès prioritaire aux futures intégrations & exports médecin",
    ],
  },
];

export function createDefaultSubscriptionState(todayKey: string): SubscriptionState {
  return {
    tier: "free",
    source: "local_demo",
    trialEndsAtIso: null,
    renewsAtIso: null,
    dailyAiDateKey: todayKey,
    fwAiMessagesUsedToday: 0,
    visionScansUsedToday: 0,
  };
}

export function normalizeSubscriptionForToday(
  raw: Partial<SubscriptionState> | undefined,
  todayKey: string,
  nowMs: number = Date.now()
): SubscriptionState {
  const validTiers = new Set<SubscriptionTier>([
    "free",
    "pro_trial",
    "pro_monthly",
    "pro_annual",
    "founder_lifetime",
  ]);
  let tier: SubscriptionTier =
    raw?.tier && validTiers.has(raw.tier) ? raw.tier : "free";

  const source: SubscriptionState["source"] =
    raw?.source === "google_play" || raw?.source === "web_followeight"
      ? raw.source
      : "local_demo";

  let trialEndsAtIso = raw?.trialEndsAtIso ?? null;
  if (tier === "pro_trial" && trialEndsAtIso) {
    const endMs = Date.parse(trialEndsAtIso);
    if (Number.isFinite(endMs) && endMs <= nowMs) {
      tier = "free";
      trialEndsAtIso = null;
    }
  }

  const sameDay = raw?.dailyAiDateKey === todayKey;
  return {
    tier,
    source,
    trialEndsAtIso,
    renewsAtIso: raw?.renewsAtIso ?? null,
    dailyAiDateKey: todayKey,
    fwAiMessagesUsedToday: sameDay
      ? Math.max(0, Math.round(Number(raw?.fwAiMessagesUsedToday) || 0))
      : 0,
    visionScansUsedToday: sameDay
      ? Math.max(0, Math.round(Number(raw?.visionScansUsedToday) || 0))
      : 0,
  };
}

export function isFwPlusActive(
  sub: SubscriptionState,
  nowMs: number = Date.now()
): boolean {
  if (
    sub.tier === "pro_monthly" ||
    sub.tier === "pro_annual" ||
    sub.tier === "founder_lifetime"
  ) {
    return true;
  }
  if (sub.tier === "pro_trial") {
    if (!sub.trialEndsAtIso) return true;
    const endMs = Date.parse(sub.trialEndsAtIso);
    return !Number.isFinite(endMs) || endMs > nowMs;
  }
  return false;
}

export function canSendFwAiMessage(
  sub: SubscriptionState,
  todayKey: string,
  nowMs: number = Date.now()
): { allowed: boolean; remainingToday: number; limitToday: number; isPlus: boolean } {
  const norm = normalizeSubscriptionForToday(sub, todayKey, nowMs);
  const plus = isFwPlusActive(norm, nowMs);
  const limitToday = plus ? FW_PLUS_DAILY_SOFT_CAP : FREE_DAILY_FW_AI_LIMIT;
  const remainingToday = Math.max(0, limitToday - norm.fwAiMessagesUsedToday);
  return {
    allowed: norm.fwAiMessagesUsedToday < limitToday,
    remainingToday,
    limitToday,
    isPlus: plus,
  };
}

export function recordFwAiMessageUsage(
  sub: SubscriptionState,
  todayKey: string,
  nowMs: number = Date.now()
): SubscriptionState {
  const norm = normalizeSubscriptionForToday(sub, todayKey, nowMs);
  return {
    ...norm,
    fwAiMessagesUsedToday: norm.fwAiMessagesUsedToday + 1,
  };
}

export function canRunVisionScan(
  sub: SubscriptionState,
  todayKey: string,
  nowMs: number = Date.now()
): { allowed: boolean; remainingToday: number; limitToday: number; isPlus: boolean } {
  const norm = normalizeSubscriptionForToday(sub, todayKey, nowMs);
  const plus = isFwPlusActive(norm, nowMs);
  const limitToday = plus ? FW_PLUS_DAILY_SOFT_CAP : FREE_DAILY_VISION_SCAN_LIMIT;
  const remainingToday = Math.max(0, limitToday - norm.visionScansUsedToday);
  return {
    allowed: norm.visionScansUsedToday < limitToday,
    remainingToday,
    limitToday,
    isPlus: plus,
  };
}

export function recordVisionScanUsage(
  sub: SubscriptionState,
  todayKey: string,
  nowMs: number = Date.now()
): SubscriptionState {
  const norm = normalizeSubscriptionForToday(sub, todayKey, nowMs);
  return {
    ...norm,
    visionScansUsedToday: norm.visionScansUsedToday + 1,
  };
}

export function startSevenDayFreeTrial(
  sub: SubscriptionState,
  todayKey: string,
  nowMs: number = Date.now()
): SubscriptionState {
  const norm = normalizeSubscriptionForToday(sub, todayKey, nowMs);
  const sevenDaysMs = 7 * 24 * 3600 * 1000;
  return {
    ...norm,
    tier: "pro_trial",
    trialEndsAtIso: new Date(nowMs + sevenDaysMs).toISOString(),
  };
}

export function activatePlanTier(
  sub: SubscriptionState,
  tier: SubscriptionTier,
  todayKey: string,
  source: SubscriptionState["source"] = "local_demo",
  nowMs: number = Date.now()
): SubscriptionState {
  if (tier === "pro_trial") {
    return startSevenDayFreeTrial({ ...sub, source }, todayKey, nowMs);
  }
  const norm = normalizeSubscriptionForToday(sub, todayKey, nowMs);
  const renewalDays =
    tier === "pro_annual" ? 365 : tier === "pro_monthly" ? 30 : tier === "founder_lifetime" ? 365 * 5 : 0;
  return {
    ...norm,
    tier,
    source,
    trialEndsAtIso: null,
    renewsAtIso: renewalDays > 0 ? new Date(nowMs + renewalDays * 86400 * 1000).toISOString() : null,
  };
}

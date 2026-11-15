import { Capacitor } from "@capacitor/core";
import { SubscriptionState, SubscriptionTier } from "@/types/vitalpulse";

export const FREE_DAILY_FW_AI_LIMIT = 5;
export const FREE_DAILY_VISION_SCAN_LIMIT = 3;
export const FW_PLUS_DAILY_SOFT_CAP = 80;

export const FREE_DAILY_WEB_SEARCH_LIMIT = 1;
export const FW_PLUS_DAILY_WEB_SEARCH_LIMIT = 5;
export const FW_PLUS_MONTHLY_WEB_SEARCH_CAP = 30;

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
    channelFr: "Google Play / Web",
    recommended: true,
    highlightsFr: [
      "Coach FW AI illimité 24h/24 (usage personnel jusqu'à 80 req/j)",
      "Recherche Web scientifique & marques temps réel (usage raisonnable 5/j · 30/mois)",
      "Scans photo repas & frigo illimités avec historique comparatif",
      "Tendances multi-bilans sanguins & périodisation sport avancée",
      "Essai transparent 7 jours · Résiliation en 2 clics",
    ],
  },
  {
    id: "pro_monthly",
    badgeFr: "FLEXIBLE",
    nameFr: "FolloWeight Plus (FW+) Mensuel",
    priceLabelFr: "4,99 € / mois",
    subPriceLabelFr: "Sans engagement · Résiliable à tout moment",
    channelFr: "Google Play / Web",
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
    subPriceLabelFr: "Soit ~1,17 € / mois sur 5 ans · Licence portable Web + App",
    channelFr: "followeight.com (Stripe Web Checkout)",
    highlightsFr: [
      "Accès FW+ complet pendant 5 ans sur followeight.com et Android (clé portable)",
      "Aucun renouvellement mensuel : accès garanti 60 mois",
      "Accès prioritaire aux futures intégrations & exports médecin",
    ],
  },
];

export function isNativeAndroidStoreBuild(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return (
      typeof Capacitor?.isNativePlatform === "function" &&
      Capacitor.isNativePlatform() &&
      Capacitor.getPlatform() === "android"
    );
  } catch {
    return false;
  }
}

export function getPlansForPlatform(isNativeAndroid: boolean): FolloWeightPlanSpec[] {
  if (isNativeAndroid) {
    return FOLLOWEIGHT_PLANS.filter((p) => p.id !== "founder_lifetime").map((p) => ({
      ...p,
      channelFr: p.id === "free" ? "Inclus" : "Google Play",
    }));
  }
  return FOLLOWEIGHT_PLANS.map((p) => {
    if (p.id === "pro_annual" || p.id === "pro_monthly") {
      return { ...p, channelFr: "Stripe Checkout sécurisé" };
    }
    if (p.id === "founder_lifetime") {
      return { ...p, channelFr: "Pass Web Direct" };
    }
    return p;
  });
}

export function createDefaultSubscriptionState(todayKey: string): SubscriptionState {
  return {
    tier: "free",
    source: "local_demo",
    trialEndsAtIso: null,
    renewsAtIso: null,
    dailyAiDateKey: todayKey,
    fwAiMessagesUsedToday: 0,
    visionScansUsedToday: 0,
    dailyWebSearchDateKey: todayKey,
    dailyWebSearchCount: 0,
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

  let renewsAtIso = raw?.renewsAtIso ?? null;
  if (
    source !== "local_demo" &&
    (tier === "pro_monthly" ||
      tier === "pro_annual" ||
      tier === "founder_lifetime") &&
    renewsAtIso
  ) {
    const renewMs = Date.parse(renewsAtIso);
    if (Number.isFinite(renewMs) && renewMs <= nowMs) {
      tier = "free";
      renewsAtIso = null;
    }
  }

  const sameDay = raw?.dailyAiDateKey === todayKey;
  const sameWebDay = raw?.dailyWebSearchDateKey === todayKey;

  return {
    tier,
    source,
    trialEndsAtIso,
    renewsAtIso,
    dailyAiDateKey: todayKey,
    fwAiMessagesUsedToday: sameDay
      ? Math.max(0, Math.round(Number(raw?.fwAiMessagesUsedToday) || 0))
      : 0,
    visionScansUsedToday: sameDay
      ? Math.max(0, Math.round(Number(raw?.visionScansUsedToday) || 0))
      : 0,
    dailyWebSearchDateKey: todayKey,
    dailyWebSearchCount: sameWebDay
      ? Math.max(0, Math.round(Number(raw?.dailyWebSearchCount) || 0))
      : 0,
    ...(typeof raw?.licenseToken === "string" && raw.licenseToken.trim()
      ? { licenseToken: raw.licenseToken.trim() }
      : {}),
    ...(typeof raw?.customerEmail === "string" && raw.customerEmail.trim()
      ? { customerEmail: raw.customerEmail.trim().toLowerCase() }
      : {}),
    ...(typeof raw?.stripeCustomerId === "string" && raw.stripeCustomerId.trim()
      ? { stripeCustomerId: raw.stripeCustomerId.trim() }
      : {}),
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
    if (sub.source !== "local_demo" && sub.renewsAtIso) {
      const renewMs = Date.parse(sub.renewsAtIso);
      if (Number.isFinite(renewMs) && renewMs <= nowMs) {
        return false;
      }
    }
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

export function canUseLiveWebSearch(
  sub: SubscriptionState,
  todayKey: string,
  nowMs: number = Date.now()
): { allowed: boolean; remainingToday: number; limitToday: number; isPlus: boolean } {
  const norm = normalizeSubscriptionForToday(sub, todayKey, nowMs);
  const plus = isFwPlusActive(norm, nowMs);
  const limitToday = plus
    ? FW_PLUS_DAILY_WEB_SEARCH_LIMIT
    : FREE_DAILY_WEB_SEARCH_LIMIT;
  const used = norm.dailyWebSearchCount ?? 0;
  return {
    allowed: used < limitToday,
    remainingToday: Math.max(0, limitToday - used),
    limitToday,
    isPlus: plus,
  };
}

export function recordWebSearchUsage(
  sub: SubscriptionState,
  todayKey: string,
  nowMs: number = Date.now()
): SubscriptionState {
  const norm = normalizeSubscriptionForToday(sub, todayKey, nowMs);
  return {
    ...norm,
    dailyWebSearchDateKey: todayKey,
    dailyWebSearchCount: (norm.dailyWebSearchCount ?? 0) + 1,
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
    tier === "pro_annual"
      ? 365
      : tier === "pro_monthly"
        ? 30
        : tier === "founder_lifetime"
          ? 365 * 5
          : 0;
  return {
    ...norm,
    tier,
    source,
    trialEndsAtIso: null,
    renewsAtIso:
      renewalDays > 0
        ? new Date(nowMs + renewalDays * 86400 * 1000).toISOString()
        : null,
  };
}

export interface PurchaseActionResult {
  ok: boolean;
  mode?: "revenuecat" | "stripe" | "not_configured" | "cancelled";
  tier?: SubscriptionTier;
  source?: SubscriptionState["source"];
  licenseToken?: string;
  renewsAtIso?: string | null;
  trialEndsAtIso?: string | null;
  customerEmail?: string;
  stripeCustomerId?: string;
  checkoutUrl?: string;
  error?: string;
}

function resolveRevenueCatAndroidSdkKey(): string | null {
  const k =
    process.env.NEXT_PUBLIC_REVENUECAT_ANDROID_KEY?.trim() ||
    process.env.NEXT_PUBLIC_REVENUECAT_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_REVENUECAT_GOOGLE_KEY?.trim();
  return k || null;
}

function getOrCreateStableInstallId(): string {
  if (typeof window === "undefined") return "fw-server";
  const storageKey = "followeight_rc_app_user_id";
  try {
    const existing = window.localStorage.getItem(storageKey);
    if (existing && existing.length >= 8) return existing;
    const generated =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? `fw_${crypto.randomUUID()}`
        : `fw_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(storageKey, generated);
    return generated;
  } catch {
    return `fw_${Date.now()}`;
  }
}

export async function purchaseAndroidRevenueCatPlan(
  tier: "pro_annual" | "pro_monthly"
): Promise<PurchaseActionResult> {
  const apiKey = resolveRevenueCatAndroidSdkKey();
  if (!apiKey) {
    return {
      ok: false,
      mode: "not_configured",
      error:
        "Clé publique RevenueCat Android en attente de configuration (NEXT_PUBLIC_REVENUECAT_ANDROID_KEY).",
    };
  }
  try {
    const { Purchases } = await import("@revenuecat/purchases-capacitor");
    const appUserId = getOrCreateStableInstallId();
    await Purchases.configure({ apiKey, appUserID: appUserId });
    const offerings = await Purchases.getOfferings();
    const current = offerings.current;
    if (!current) {
      return {
        ok: false,
        mode: "revenuecat",
        error: "Aucune offre Google Play active trouvée dans RevenueCat.",
      };
    }

    const candidates = current.availablePackages || [];
    const targetPkg =
      tier === "pro_annual"
        ? current.annual ||
          candidates.find((p) =>
            String(p.identifier || "").toLowerCase().includes("annual")
          )
        : current.monthly ||
          candidates.find((p) =>
            String(p.identifier || "").toLowerCase().includes("month")
          );

    if (!targetPkg) {
      return {
        ok: false,
        mode: "revenuecat",
        error: "Formule Google Play introuvable dans l'offre courante.",
      };
    }

    const purchaseRes = await Purchases.purchasePackage({ aPackage: targetPkg });
    const ent = purchaseRes.customerInfo?.entitlements?.active?.["fw_plus"];
    if (!ent) {
      return {
        ok: false,
        mode: "revenuecat",
        error: "Achat finalisé mais entitlement fw_plus inactif.",
      };
    }

    let licenseToken: string | undefined;
    try {
      const syncRes = await fetch("/api/billing/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appUserId }),
      });
      if (syncRes.ok) {
        const syncJson = await syncRes.json();
        if (typeof syncJson?.licenseToken === "string") {
          licenseToken = syncJson.licenseToken;
        }
      }
    } catch {
      // Le droit Google Play local reste valide même hors-ligne
    }

    return {
      ok: true,
      mode: "revenuecat",
      tier,
      source: "google_play",
      renewsAtIso: ent.expirationDate ?? null,
      licenseToken,
    };
  } catch (err: unknown) {
    const maybeObj = err as { userCancelled?: boolean; message?: string };
    if (maybeObj?.userCancelled) {
      return { ok: false, mode: "cancelled", error: "Achat annulé." };
    }
    return {
      ok: false,
      mode: "revenuecat",
      error:
        maybeObj?.message ||
        "Impossible de contacter Google Play Billing pour le moment.",
    };
  }
}

export async function restoreAndroidRevenueCatPurchases(): Promise<PurchaseActionResult> {
  const apiKey = resolveRevenueCatAndroidSdkKey();
  if (!apiKey) {
    return {
      ok: false,
      mode: "not_configured",
      error:
        "Clé publique RevenueCat Android non configurée sur cet environnement.",
    };
  }
  try {
    const { Purchases } = await import("@revenuecat/purchases-capacitor");
    const appUserId = getOrCreateStableInstallId();
    await Purchases.configure({ apiKey, appUserID: appUserId });
    const restored = await Purchases.restorePurchases();
    const ent = restored.customerInfo?.entitlements?.active?.["fw_plus"];
    if (!ent) {
      return {
        ok: false,
        mode: "revenuecat",
        error: "Aucun abonnement Google Play FW+ actif trouvé sur ce compte.",
      };
    }
    const prod = String(ent.productIdentifier || "").toLowerCase();
    const tier: SubscriptionTier = prod.includes("month")
      ? "pro_monthly"
      : "pro_annual";
    return {
      ok: true,
      mode: "revenuecat",
      tier,
      source: "google_play",
      renewsAtIso: ent.expirationDate ?? null,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Échec de restauration Google Play.";
    return { ok: false, mode: "revenuecat", error: msg };
  }
}

export async function startWebStripeCheckout(
  tier: "pro_annual" | "pro_monthly" | "founder_lifetime",
  email?: string
): Promise<PurchaseActionResult> {
  try {
    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier, email }),
    });
    const data = await res.json();
    if (!res.ok) {
      return {
        ok: false,
        mode: data?.configured === false ? "not_configured" : "stripe",
        error: data?.error || "Impossible d'ouvrir le paiement Stripe.",
      };
    }
    return {
      ok: true,
      mode: "stripe",
      checkoutUrl: data.url,
    };
  } catch (err) {
    return {
      ok: false,
      mode: "stripe",
      error:
        err instanceof Error
          ? err.message
          : "Erreur réseau lors de l'ouverture du paiement.",
    };
  }
}

export async function verifyWebCheckoutSession(
  sessionId: string
): Promise<PurchaseActionResult> {
  try {
    const res = await fetch(
      `/api/billing/verify?session_id=${encodeURIComponent(sessionId)}`
    );
    const data = await res.json();
    if (!res.ok || !data?.ok) {
      return {
        ok: false,
        mode: "stripe",
        error: data?.error || "Paiement non confirmé.",
      };
    }
    return {
      ok: true,
      mode: "stripe",
      tier: data.tier,
      source: "web_followeight",
      licenseToken: data.token,
      renewsAtIso: data.renewsAtIso ?? null,
      trialEndsAtIso: data.trialEndsAtIso ?? null,
      customerEmail: data.email,
      stripeCustomerId: data.customerId,
    };
  } catch {
    return {
      ok: false,
      mode: "stripe",
      error: "Impossible de vérifier la session de paiement.",
    };
  }
}

export async function restoreEntitlementByTokenOrEmail(input: {
  token?: string;
  email?: string;
}): Promise<PurchaseActionResult> {
  try {
    const res = await fetch("/api/billing/restore", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok || !data?.ok) {
      return {
        ok: false,
        mode: data?.configured === false ? "not_configured" : "stripe",
        error: data?.error || "Aucun abonnement ou code FW+ valide trouvé.",
      };
    }
    return {
      ok: true,
      tier: data.tier,
      source: data.source || "web_followeight",
      licenseToken: data.licenseToken,
      renewsAtIso: data.renewsAtIso ?? null,
      trialEndsAtIso: data.trialEndsAtIso ?? null,
      customerEmail: data.email,
      stripeCustomerId: data.customerId,
    };
  } catch {
    return {
      ok: false,
      error: "Erreur réseau lors de la restauration FW+.",
    };
  }
}

export async function openWebBillingPortal(input: {
  customerId?: string;
  licenseToken?: string;
  email?: string;
}): Promise<{ ok: boolean; url?: string; error?: string }> {
  try {
    const res = await fetch("/api/billing/portal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok || !data?.url) {
      return {
        ok: false,
        error: data?.error || "Portail de gestion indisponible.",
      };
    }
    return { ok: true, url: data.url };
  } catch {
    return { ok: false, error: "Erreur réseau portail client." };
  }
}

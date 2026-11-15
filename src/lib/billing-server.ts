import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import type { SubscriptionTier } from "@/types/vitalpulse";

export type PortableBillingTier =
  | "pro_trial"
  | "pro_monthly"
  | "pro_annual"
  | "founder_lifetime";

export interface FwPlusTokenPayload {
  v: 1;
  sub: string;
  tier: PortableBillingTier;
  source: "web_followeight" | "google_play";
  iat: number;
  exp: number;
  email?: string;
  customerId?: string;
  subscriptionId?: string;
}

export interface VerifyTokenResult {
  valid: boolean;
  payload?: FwPlusTokenPayload;
  reason?: string;
}

export interface ServerBillingStatus {
  stripeConfigured: boolean;
  revenueCatAndroidConfigured: boolean;
  revenueCatServerConfigured: boolean;
  webhookSigningConfigured: boolean;
  aiWebSearchModel: "web_search";
}

function toBase64Url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(encoded: string): Buffer {
  const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/");
  const padLen = (4 - (normalized.length % 4)) % 4;
  return Buffer.from(normalized + "=".repeat(padLen), "base64");
}

export function getBillingHmacSecret(secretOverride?: string): string {
  if (secretOverride && secretOverride.trim()) return secretOverride.trim();
  const explicit =
    process.env.FOLLOWEIGHT_BILLING_HMAC_SECRET?.trim() ||
    process.env.BILLING_HMAC_SECRET?.trim();
  if (explicit) return explicit;
  const derived =
    getFollowEightStripeSecretKey() || process.env.OPENAI_API_KEY?.trim();
  if (derived) {
    return createHmac("sha256", "followeight-billing-key-derivation-v1")
      .update(derived)
      .digest("hex");
  }
  return "followeight-preview-nonprod-signing-secret";
}

export function getFollowEightStripeSecretKey(): string | null {
  const dedicated =
    process.env.FOLLOWEIGHT_STRIPE_SECRET_KEY?.trim() ||
    process.env.VITALPULSE_STRIPE_SECRET_KEY?.trim();
  if (dedicated) return dedicated;
  // On Vercel dedicated deployment, standard STRIPE_SECRET_KEY is isolated to this project.
  // Locally, guard against accidentally reading another store's root environment STRIPE_SECRET_KEY.
  if (process.env.VERCEL === "1" || process.env.FOLLOWEIGHT_USE_STRIPE_ENV === "1") {
    const shared = process.env.STRIPE_SECRET_KEY?.trim();
    if (shared && (shared.startsWith("sk_") || shared.startsWith("rk_"))) {
      return shared;
    }
  }
  return null;
}

export function getFollowEightStripeWebhookSecret(): string | null {
  const dedicated =
    process.env.FOLLOWEIGHT_STRIPE_WEBHOOK_SECRET?.trim() ||
    process.env.VITALPULSE_STRIPE_WEBHOOK_SECRET?.trim();
  if (dedicated) return dedicated;
  if (process.env.VERCEL === "1" || process.env.FOLLOWEIGHT_USE_STRIPE_ENV === "1") {
    return process.env.STRIPE_WEBHOOK_SECRET?.trim() || null;
  }
  return null;
}

export function getServerBillingStatus(): ServerBillingStatus {
  const rcAndroidKey =
    process.env.NEXT_PUBLIC_REVENUECAT_ANDROID_KEY?.trim() ||
    process.env.NEXT_PUBLIC_REVENUECAT_GOOGLE_KEY?.trim();
  return {
    stripeConfigured: Boolean(getFollowEightStripeSecretKey()),
    revenueCatAndroidConfigured: Boolean(rcAndroidKey),
    revenueCatServerConfigured: Boolean(process.env.REVENUECAT_SECRET_API_KEY?.trim()),
    webhookSigningConfigured: Boolean(getFollowEightStripeWebhookSecret()),
    aiWebSearchModel: "web_search",
  };
}

export function signEntitlementToken(
  payload: Omit<FwPlusTokenPayload, "v" | "iat"> & { iat?: number },
  secretOverride?: string
): string {
  const full: FwPlusTokenPayload = {
    v: 1,
    sub: payload.sub.trim() || "followeight-user",
    tier: payload.tier,
    source: payload.source,
    iat: payload.iat ?? Math.floor(Date.now() / 1000),
    exp: Math.floor(payload.exp),
    ...(payload.email ? { email: payload.email.trim().toLowerCase() } : {}),
    ...(payload.customerId ? { customerId: payload.customerId } : {}),
    ...(payload.subscriptionId ? { subscriptionId: payload.subscriptionId } : {}),
  };
  const encodedPayload = toBase64Url(JSON.stringify(full));
  const hmac = createHmac("sha256", getBillingHmacSecret(secretOverride))
    .update(`FWPLUS.${encodedPayload}`)
    .digest();
  return `FWPLUS.${encodedPayload}.${toBase64Url(hmac)}`;
}

export function verifyEntitlementToken(
  token: string | undefined | null,
  nowSec: number = Math.floor(Date.now() / 1000),
  secretOverride?: string
): VerifyTokenResult {
  if (!token || typeof token !== "string") {
    return { valid: false, reason: "TOKEN_MISSING" };
  }
  const trimmed = token.trim();
  const parts = trimmed.split(".");
  if (parts.length !== 3 || parts[0] !== "FWPLUS" || !parts[1] || !parts[2]) {
    return { valid: false, reason: "TOKEN_MALFORMED" };
  }
  try {
    const expectedSig = createHmac("sha256", getBillingHmacSecret(secretOverride))
      .update(`FWPLUS.${parts[1]}`)
      .digest();
    const providedSig = fromBase64Url(parts[2]);
    if (
      expectedSig.length !== providedSig.length ||
      !timingSafeEqual(expectedSig, providedSig)
    ) {
      return { valid: false, reason: "SIGNATURE_INVALID" };
    }
    const parsed = JSON.parse(
      fromBase64Url(parts[1]).toString("utf8")
    ) as Partial<FwPlusTokenPayload>;
    if (
      parsed.v !== 1 ||
      typeof parsed.sub !== "string" ||
      typeof parsed.exp !== "number" ||
      !parsed.tier ||
      !["pro_trial", "pro_monthly", "pro_annual", "founder_lifetime"].includes(
        parsed.tier
      )
    ) {
      return { valid: false, reason: "PAYLOAD_INVALID" };
    }
    if (parsed.exp <= nowSec) {
      return { valid: false, reason: "TOKEN_EXPIRED" };
    }
    return {
      valid: true,
      payload: parsed as FwPlusTokenPayload,
    };
  } catch {
    return { valid: false, reason: "TOKEN_PARSE_ERROR" };
  }
}

export async function stripeApiRequest<T = Record<string, unknown>>(
  path: string,
  options: {
    method?: "GET" | "POST";
    formParams?: URLSearchParams;
  } = {}
): Promise<T> {
  const key = getFollowEightStripeSecretKey();
  if (!key) {
    throw new Error("STRIPE_NOT_CONFIGURED");
  }
  const method = options.method || "GET";
  const url = `https://api.stripe.com${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      ...(method === "POST"
        ? { "Content-Type": "application/x-www-form-urlencoded" }
        : {}),
    },
    body: method === "POST" ? options.formParams?.toString() : undefined,
    signal: AbortSignal.timeout(12000),
  });
  const data = (await res.json()) as T & { error?: { message?: string } };
  if (!res.ok) {
    throw new Error(
      data?.error?.message || `Stripe HTTP ${res.status}`
    );
  }
  return data;
}

export function buildStripeCheckoutParams(input: {
  tier: "pro_annual" | "pro_monthly" | "founder_lifetime";
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
}): URLSearchParams {
  const params = new URLSearchParams();
  params.set("success_url", input.successUrl);
  params.set("cancel_url", input.cancelUrl);
  params.set("allow_promotion_codes", "true");
  params.set("billing_address_collection", "auto");
  if (input.customerEmail && input.customerEmail.includes("@")) {
    params.set("customer_email", input.customerEmail.trim().toLowerCase());
  }
  params.set("metadata[app]", "followeight");
  params.set("metadata[tier]", input.tier);

  if (process.env.FOLLOWEIGHT_STRIPE_AUTOMATIC_TAX === "1") {
    params.set("automatic_tax[enabled]", "true");
  }

  const envPriceId =
    input.tier === "pro_annual"
      ? process.env.FOLLOWEIGHT_STRIPE_PRICE_ANNUAL?.trim()
      : input.tier === "pro_monthly"
        ? process.env.FOLLOWEIGHT_STRIPE_PRICE_MONTHLY?.trim()
        : process.env.FOLLOWEIGHT_STRIPE_PRICE_FOUNDER?.trim();

  if (input.tier === "founder_lifetime") {
    params.set("mode", "payment");
    params.set("customer_creation", "always");
    if (envPriceId) {
      params.set("line_items[0][price]", envPriceId);
    } else {
      params.set("line_items[0][price_data][currency]", "eur");
      params.set("line_items[0][price_data][unit_amount]", "6990");
      params.set(
        "line_items[0][price_data][product_data][name]",
        "FolloWeight FW+ Pass Fondateur (5 ans)"
      );
      params.set(
        "line_items[0][price_data][product_data][description]",
        "Accès complet FW AI + Scans Vision + Bilans sanguins pendant 5 ans, utilisable sur Web & Android."
      );
    }
    params.set("line_items[0][quantity]", "1");
    return params;
  }

  params.set("mode", "subscription");
  params.set("subscription_data[metadata][tier]", input.tier);
  if (input.tier === "pro_annual") {
    params.set("subscription_data[trial_period_days]", "7");
  }

  if (envPriceId) {
    params.set("line_items[0][price]", envPriceId);
  } else {
    params.set("line_items[0][price_data][currency]", "eur");
    params.set(
      "line_items[0][price_data][unit_amount]",
      input.tier === "pro_annual" ? "2999" : "499"
    );
    params.set(
      "line_items[0][price_data][recurring][interval]",
      input.tier === "pro_annual" ? "year" : "month"
    );
    params.set(
      "line_items[0][price_data][product_data][name]",
      input.tier === "pro_annual"
        ? "FolloWeight FW+ Annuel (7 jours d'essai offerts)"
        : "FolloWeight FW+ Mensuel"
    );
    params.set(
      "line_items[0][price_data][product_data][description]",
      "Coach FW AI illimité (fair-use recherche Web 5/j · 30/mois), scans frigo & repas, analyse labo biomarqueurs."
    );
  }
  params.set("line_items[0][quantity]", "1");
  return params;
}

export async function verifyRevenueCatSubscriber(
  appUserId: string
): Promise<{
  active: boolean;
  tier?: PortableBillingTier;
  expiresAtIso?: string | null;
  token?: string;
  reason?: string;
}> {
  const rcKey = process.env.REVENUECAT_SECRET_API_KEY?.trim();
  if (!rcKey) {
    return { active: false, reason: "REVENUECAT_SERVER_NOT_CONFIGURED" };
  }
  const res = await fetch(
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId.trim())}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${rcKey}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10000),
    }
  );
  if (!res.ok) {
    return { active: false, reason: `REVENUECAT_HTTP_${res.status}` };
  }
  const data = (await res.json()) as {
    subscriber?: {
      entitlements?: Record<
        string,
        {
          expires_date?: string | null;
          product_identifier?: string;
          purchase_date?: string;
        }
      >;
    };
  };
  const ent = data.subscriber?.entitlements?.fw_plus;
  if (!ent) {
    return { active: false, reason: "NO_ACTIVE_ENTITLEMENT" };
  }
  const expMs = ent.expires_date ? Date.parse(ent.expires_date) : null;
  if (expMs !== null && (!Number.isFinite(expMs) || expMs <= Date.now())) {
    return { active: false, reason: "ENTITLEMENT_EXPIRED" };
  }
  const productId = (ent.product_identifier || "").toLowerCase();
  const tier: PortableBillingTier = productId.includes("month")
    ? "pro_monthly"
    : "pro_annual";
  const expSec =
    expMs !== null
      ? Math.floor(expMs / 1000)
      : Math.floor(Date.now() / 1000) + 30 * 24 * 3600;
  const token = signEntitlementToken({
    sub: appUserId.trim(),
    tier,
    source: "google_play",
    exp: expSec,
  });
  return {
    active: true,
    tier,
    expiresAtIso: ent.expires_date ?? null,
    token,
  };
}

export function verifyStripeWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string
): boolean {
  if (!signatureHeader || !secret) return false;
  const entries = signatureHeader.split(",").map((s) => s.trim());
  let timestamp = "";
  const signatures: string[] = [];
  for (const entry of entries) {
    const [k, v] = entry.split("=");
    if (k === "t" && v) timestamp = v;
    if (k === "v1" && v) signatures.push(v);
  }
  if (!timestamp || signatures.length === 0) return false;
  const tsNum = Number(timestamp);
  if (!Number.isFinite(tsNum) || Math.abs(Date.now() / 1000 - tsNum) > 300) {
    return false;
  }
  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest("hex");
  return signatures.some((sig) => {
    const a = Buffer.from(sig, "utf8");
    const b = Buffer.from(expected, "utf8");
    return a.length === b.length && timingSafeEqual(a, b);
  });
}

export function mapStripeSessionToEntitlement(session: {
  id: string;
  mode?: string;
  status?: string;
  payment_status?: string;
  customer?: string | null;
  customer_details?: { email?: string | null } | null;
  customer_email?: string | null;
  subscription?:
    | string
    | {
        id: string;
        status?: string;
        current_period_end?: number;
        trial_end?: number | null;
      }
    | null;
  metadata?: Record<string, string> | null;
}): {
  paid: boolean;
  tier: PortableBillingTier;
  token?: string;
  renewsAtIso?: string | null;
  trialEndsAtIso?: string | null;
  email?: string;
  customerId?: string;
} {
  const rawTier = session.metadata?.tier;
  const tier: PortableBillingTier =
    rawTier === "pro_monthly" ||
    rawTier === "pro_annual" ||
    rawTier === "founder_lifetime"
      ? rawTier
      : session.mode === "payment"
        ? "founder_lifetime"
        : "pro_annual";

  const subObj =
    session.subscription && typeof session.subscription === "object"
      ? session.subscription
      : null;
  const paid =
    session.payment_status === "paid" ||
    session.payment_status === "no_payment_required" ||
    subObj?.status === "trialing" ||
    subObj?.status === "active";

  const email =
    session.customer_details?.email?.trim().toLowerCase() ||
    session.customer_email?.trim().toLowerCase() ||
    undefined;
  const customerId =
    typeof session.customer === "string" ? session.customer : undefined;
  const subId =
    typeof session.subscription === "string"
      ? session.subscription
      : subObj?.id;

  if (!paid) {
    return { paid: false, tier, email, customerId };
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const fiveYearsSec = 5 * 365 * 24 * 3600;
  const expSec =
    tier === "founder_lifetime"
      ? nowSec + fiveYearsSec
      : subObj?.current_period_end ||
        (tier === "pro_annual"
          ? nowSec + 372 * 24 * 3600
          : nowSec + 32 * 24 * 3600);

  const effectiveTier: PortableBillingTier =
    subObj?.status === "trialing" ? "pro_trial" : tier;

  const token = signEntitlementToken({
    sub: customerId || email || session.id,
    tier: effectiveTier,
    source: "web_followeight",
    exp: expSec,
    email,
    customerId,
    subscriptionId: subId,
  });

  return {
    paid: true,
    tier: effectiveTier,
    token,
    renewsAtIso: new Date(expSec * 1000).toISOString(),
    trialEndsAtIso: subObj?.trial_end
      ? new Date(subObj.trial_end * 1000).toISOString()
      : null,
    email,
    customerId,
  };
}

export async function persistAiSafetyReport(input: {
  messageId: string;
  excerpt: string;
  reason: string;
  provider?: string;
}): Promise<{ reportId: string; persistedLocally: boolean; forwardedWebhook: boolean }> {
  const reportId = `rpt_${randomUUID().slice(0, 12)}`;
  const record = {
    reportId,
    createdAt: new Date().toISOString(),
    messageId: input.messageId.slice(0, 80),
    reason: input.reason.slice(0, 200),
    provider: (input.provider || "unknown").slice(0, 48),
    excerpt: input.excerpt.slice(0, 600),
  };

  console.warn("[FW-AI-SAFETY-REPORT]", JSON.stringify(record));

  let forwardedWebhook = false;
  const hookUrl = process.env.FOLLOWEIGHT_REPORT_WEBHOOK_URL?.trim();
  if (hookUrl) {
    try {
      const res = await fetch(hookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record),
        signal: AbortSignal.timeout(4000),
      });
      forwardedWebhook = res.ok;
    } catch {
      forwardedWebhook = false;
    }
  }

  let persistedLocally = false;
  if (process.env.VERCEL !== "1") {
    try {
      const fs = await import("fs/promises");
      const path = await import("path");
      const dir = path.join(process.cwd(), ".data");
      await fs.mkdir(dir, { recursive: true });
      await fs.appendFile(
        path.join(dir, "ai-reports.jsonl"),
        `${JSON.stringify(record)}\n`,
        "utf8"
      );
      persistedLocally = true;
    } catch {
      persistedLocally = false;
    }
  }

  return { reportId, persistedLocally, forwardedWebhook };
}

export function isTierEntitledToPaidQuota(tier?: SubscriptionTier | null): boolean {
  return (
    tier === "pro_trial" ||
    tier === "pro_monthly" ||
    tier === "pro_annual" ||
    tier === "founder_lifetime"
  );
}

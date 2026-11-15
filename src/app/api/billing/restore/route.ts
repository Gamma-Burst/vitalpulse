import { NextRequest, NextResponse } from "next/server";
import {
  getFollowEightStripeSecretKey,
  signEntitlementToken,
  stripeApiRequest,
  verifyEntitlementToken,
  verifyRevenueCatSubscriber,
  type PortableBillingTier,
} from "@/lib/billing-server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      token?: unknown;
      email?: unknown;
      appUserId?: unknown;
    };

    const rawToken = typeof body?.token === "string" ? body.token.trim() : "";
    if (rawToken) {
      const checked = verifyEntitlementToken(rawToken);
      if (!checked.valid || !checked.payload) {
        return NextResponse.json(
          {
            ok: false,
            error:
              checked.reason === "TOKEN_EXPIRED"
                ? "Ce code d'accès FW+ est expiré."
                : "Code d'accès FW+ invalide.",
          },
          { status: 401 }
        );
      }
      return NextResponse.json({
        ok: true,
        tier: checked.payload.tier,
        source: checked.payload.source,
        renewsAtIso: new Date(checked.payload.exp * 1000).toISOString(),
        email: checked.payload.email,
        customerId: checked.payload.customerId,
        licenseToken: rawToken,
      });
    }

    const appUserId =
      typeof body?.appUserId === "string" ? body.appUserId.trim() : "";
    if (appUserId) {
      const rc = await verifyRevenueCatSubscriber(appUserId);
      if (!rc.active || !rc.token) {
        return NextResponse.json(
          {
            ok: false,
            error:
              rc.reason === "REVENUECAT_SERVER_NOT_CONFIGURED"
                ? "Synchronisation serveur RevenueCat non configurée."
                : "Aucun abonnement Google Play actif trouvé pour cet identifiant.",
          },
          { status: 404 }
        );
      }
      return NextResponse.json({
        ok: true,
        tier: rc.tier,
        source: "google_play",
        renewsAtIso: rc.expiresAtIso ?? null,
        licenseToken: rc.token,
      });
    }

    const email =
      typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { ok: false, error: "Saisissez un e-mail valide ou un code FWPLUS." },
        { status: 400 }
      );
    }

    if (!getFollowEightStripeSecretKey()) {
      return NextResponse.json(
        {
          ok: false,
          configured: false,
          error:
            "La restauration par e-mail nécessite l'activation Stripe côté serveur (code FWPLUS utilisable dès maintenant).",
        },
        { status: 503 }
      );
    }

    const customers = await stripeApiRequest<{ data: Array<{ id: string }> }>(
      `/v1/customers?email=${encodeURIComponent(email)}&limit=5`
    );

    for (const c of customers.data || []) {
      const subs = await stripeApiRequest<{
        data: Array<{
          id: string;
          status: string;
          current_period_end: number;
          trial_end?: number | null;
          metadata?: Record<string, string>;
          items?: { data?: Array<{ price?: { recurring?: { interval?: string } } }> };
        }>;
      }>(`/v1/subscriptions?customer=${encodeURIComponent(c.id)}&status=all&limit=10`);

      const activeSub = (subs.data || []).find(
        (s) => s.status === "active" || s.status === "trialing"
      );
      if (activeSub) {
        const interval =
          activeSub.items?.data?.[0]?.price?.recurring?.interval;
        const baseTier: PortableBillingTier =
          activeSub.metadata?.tier === "pro_monthly" || interval === "month"
            ? "pro_monthly"
            : "pro_annual";
        const effectiveTier: PortableBillingTier =
          activeSub.status === "trialing" ? "pro_trial" : baseTier;
        const expSec = activeSub.current_period_end || Math.floor(Date.now() / 1000) + 30 * 86400;
        const licenseToken = signEntitlementToken({
          sub: c.id,
          tier: effectiveTier,
          source: "web_followeight",
          exp: expSec,
          email,
          customerId: c.id,
          subscriptionId: activeSub.id,
        });
        return NextResponse.json({
          ok: true,
          tier: effectiveTier,
          source: "web_followeight",
          renewsAtIso: new Date(expSec * 1000).toISOString(),
          trialEndsAtIso: activeSub.trial_end
            ? new Date(activeSub.trial_end * 1000).toISOString()
            : null,
          email,
          customerId: c.id,
          licenseToken,
        });
      }

      const sessions = await stripeApiRequest<{
        data: Array<{
          id: string;
          mode?: string;
          payment_status?: string;
          created?: number;
          metadata?: Record<string, string>;
        }>;
      }>(`/v1/checkout/sessions?customer=${encodeURIComponent(c.id)}&limit=10`);

      const founderSession = (sessions.data || []).find(
        (s) =>
          s.mode === "payment" &&
          s.payment_status === "paid" &&
          s.metadata?.app === "followeight"
      );
      if (founderSession) {
        const expSec =
          (founderSession.created || Math.floor(Date.now() / 1000)) +
          5 * 365 * 86400;
        const licenseToken = signEntitlementToken({
          sub: c.id,
          tier: "founder_lifetime",
          source: "web_followeight",
          exp: expSec,
          email,
          customerId: c.id,
        });
        return NextResponse.json({
          ok: true,
          tier: "founder_lifetime",
          source: "web_followeight",
          renewsAtIso: new Date(expSec * 1000).toISOString(),
          email,
          customerId: c.id,
          licenseToken,
        });
      }
    }

    return NextResponse.json(
      { ok: false, error: "Aucun abonnement FW+ actif trouvé pour cet e-mail." },
      { status: 404 }
    );
  } catch (err) {
    console.error("billing restore error:", err);
    return NextResponse.json(
      { ok: false, error: "Erreur serveur lors de la restauration FW+." },
      { status: 500 }
    );
  }
}

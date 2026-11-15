import { NextRequest, NextResponse } from "next/server";
import {
  buildStripeCheckoutParams,
  getFollowEightStripeSecretKey,
  stripeApiRequest,
} from "@/lib/billing-server";

export const runtime = "nodejs";

function resolveSafeOrigin(req: NextRequest): string {
  const hdrOrigin = req.headers.get("origin");
  if (hdrOrigin && /^https?:\/\/(localhost|followeight\.com|www\.followeight\.com|[a-z0-9-]+\.vercel\.app)/i.test(hdrOrigin)) {
    return hdrOrigin.replace(/\/+$/, "");
  }
  const urlOrigin = req.nextUrl.origin;
  if (urlOrigin && !urlOrigin.includes("0.0.0.0")) {
    return urlOrigin.replace(/\/+$/, "");
  }
  return "https://followeight.com";
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      tier?: unknown;
      email?: unknown;
    };
    const tier = body?.tier;
    if (
      tier !== "pro_annual" &&
      tier !== "pro_monthly" &&
      tier !== "founder_lifetime"
    ) {
      return NextResponse.json(
        { ok: false, error: "Formule d'abonnement invalide." },
        { status: 400 }
      );
    }

    if (!getFollowEightStripeSecretKey()) {
      return NextResponse.json(
        {
          ok: false,
          configured: false,
          error:
            "Paiement Stripe en attente d'activation marchand sur Vercel (FOLLOWEIGHT_STRIPE_SECRET_KEY).",
        },
        { status: 503 }
      );
    }

    const origin = resolveSafeOrigin(req);
    const email =
      typeof body.email === "string" && body.email.includes("@")
        ? body.email.trim().toLowerCase()
        : undefined;

    const formParams = buildStripeCheckoutParams({
      tier,
      successUrl: `${origin}/?billing_session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/?billing_cancel=1`,
      customerEmail: email,
    });

    const session = await stripeApiRequest<{ id: string; url?: string }>(
      "/v1/checkout/sessions",
      { method: "POST", formParams }
    );

    if (!session.url) {
      return NextResponse.json(
        { ok: false, error: "URL de paiement Stripe non reçue." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      configured: true,
      sessionId: session.id,
      url: session.url,
    });
  } catch (err) {
    console.error("billing checkout error:", err);
    return NextResponse.json(
      {
        ok: false,
        error:
          err instanceof Error
            ? err.message
            : "Impossible de créer la session Stripe.",
      },
      { status: 500 }
    );
  }
}

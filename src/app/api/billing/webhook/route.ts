import { NextRequest, NextResponse } from "next/server";
import {
  getFollowEightStripeWebhookSecret,
  verifyStripeWebhookSignature,
} from "@/lib/billing-server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const stripeSig = req.headers.get("stripe-signature");

  if (stripeSig !== null) {
    const secret = getFollowEightStripeWebhookSecret();
    if (!secret) {
      return NextResponse.json(
        { error: "Stripe webhook secret not configured" },
        { status: 503 }
      );
    }
    if (!verifyStripeWebhookSignature(rawBody, stripeSig, secret)) {
      return NextResponse.json(
        { error: "Invalid Stripe signature" },
        { status: 400 }
      );
    }
    try {
      const event = JSON.parse(rawBody) as { id?: string; type?: string };
      console.info("[BILLING-WEBHOOK:STRIPE]", event.type, event.id);
      return NextResponse.json({
        received: true,
        provider: "stripe",
        type: event.type ?? "unknown",
      });
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }
  }

  const authHeader = req.headers.get("authorization");
  const expectedRcAuth = process.env.REVENUECAT_WEBHOOK_AUTH?.trim();
  if (authHeader !== null) {
    if (!expectedRcAuth) {
      return NextResponse.json(
        { error: "RevenueCat webhook auth not configured" },
        { status: 503 }
      );
    }
    if (
      authHeader !== expectedRcAuth &&
      authHeader !== `Bearer ${expectedRcAuth}`
    ) {
      return NextResponse.json(
        { error: "Unauthorized webhook caller" },
        { status: 401 }
      );
    }
    try {
      const payload = JSON.parse(rawBody) as {
        event?: { type?: string; id?: string };
      };
      console.info(
        "[BILLING-WEBHOOK:REVENUECAT]",
        payload?.event?.type,
        payload?.event?.id
      );
      return NextResponse.json({
        received: true,
        provider: "revenuecat",
        type: payload?.event?.type ?? "unknown",
      });
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }
  }

  return NextResponse.json(
    { error: "Missing webhook authentication headers" },
    { status: 400 }
  );
}

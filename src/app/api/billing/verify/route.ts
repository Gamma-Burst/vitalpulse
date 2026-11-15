import { NextRequest, NextResponse } from "next/server";
import {
  getFollowEightStripeSecretKey,
  mapStripeSessionToEntitlement,
  stripeApiRequest,
} from "@/lib/billing-server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id")?.trim() || "";
  if (!sessionId.startsWith("cs_")) {
    return NextResponse.json(
      { ok: false, error: "Identifiant de session Checkout invalide." },
      { status: 400 }
    );
  }

  if (!getFollowEightStripeSecretKey()) {
    return NextResponse.json(
      { ok: false, configured: false, error: "Stripe non configuré." },
      { status: 503 }
    );
  }

  try {
    const session = await stripeApiRequest<{
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
    }>(`/v1/checkout/sessions/${encodeURIComponent(sessionId)}?expand[]=subscription`);

    const mapped = mapStripeSessionToEntitlement(session);
    return NextResponse.json({
      ok: mapped.paid,
      ...mapped,
    });
  } catch (err) {
    console.error("billing verify error:", err);
    return NextResponse.json(
      { ok: false, error: "Impossible de vérifier cette session de paiement." },
      { status: 500 }
    );
  }
}

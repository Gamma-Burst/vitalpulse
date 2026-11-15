import { NextRequest, NextResponse } from "next/server";
import {
  getFollowEightStripeSecretKey,
  stripeApiRequest,
  verifyEntitlementToken,
} from "@/lib/billing-server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!getFollowEightStripeSecretKey()) {
    return NextResponse.json(
      { ok: false, configured: false, error: "Portail Stripe non configuré." },
      { status: 503 }
    );
  }

  try {
    const body = (await req.json()) as {
      customerId?: unknown;
      licenseToken?: unknown;
      email?: unknown;
    };

    let customerId = "";
    if (typeof body?.licenseToken === "string" && body.licenseToken.trim()) {
      const checked = verifyEntitlementToken(body.licenseToken.trim());
      if (checked.valid && checked.payload?.customerId) {
        customerId = checked.payload.customerId;
      }
    }
    if (!customerId && typeof body?.customerId === "string" && body.customerId.startsWith("cus_")) {
      customerId = body.customerId.trim();
    }
    if (!customerId && typeof body?.email === "string" && body.email.includes("@")) {
      const customers = await stripeApiRequest<{ data: Array<{ id: string }> }>(
        `/v1/customers?email=${encodeURIComponent(body.email.trim().toLowerCase())}&limit=1`
      );
      customerId = customers.data?.[0]?.id || "";
    }

    if (!customerId) {
      return NextResponse.json(
        { ok: false, error: "Aucun compte client Stripe associé trouvé." },
        { status: 404 }
      );
    }

    const origin = req.headers.get("origin") || req.nextUrl.origin || "https://followeight.com";
    const form = new URLSearchParams();
    form.set("customer", customerId);
    form.set("return_url", `${origin.replace(/\/+$/, "")}/`);

    const portal = await stripeApiRequest<{ url?: string }>(
      "/v1/billing_portal/sessions",
      { method: "POST", formParams: form }
    );

    if (!portal.url) {
      return NextResponse.json(
        { ok: false, error: "Impossible d'ouvrir le portail de gestion." },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, url: portal.url });
  } catch (err) {
    console.error("billing portal error:", err);
    return NextResponse.json(
      { ok: false, error: "Erreur lors de la création du portail Stripe." },
      { status: 500 }
    );
  }
}

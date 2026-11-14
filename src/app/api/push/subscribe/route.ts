import { NextRequest, NextResponse } from "next/server";
import { PushSubscription } from "web-push";
import { pushSubscriptions } from "@/lib/push-store";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const sub = (await req.json()) as PushSubscription;
    if (!sub || !sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
      return NextResponse.json({ error: "Abonnement Push invalide." }, { status: 400 });
    }
    pushSubscriptions.set(sub.endpoint, sub);
    return NextResponse.json({
      subscribed: true,
      totalActiveSubscriptions: pushSubscriptions.size,
    });
  } catch {
    return NextResponse.json({ error: "Payload Push invalide." }, { status: 400 });
  }
}

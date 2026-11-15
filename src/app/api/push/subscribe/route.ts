import { NextRequest, NextResponse } from "next/server";
import type { PushSubscription } from "web-push";
import { pushSubscriptions } from "@/lib/push-store";
import { upsertCloudPushDevice } from "@/lib/push-cloud-repo";

export const runtime = "nodejs";

function extractSubscription(body: unknown): {
  subscription: PushSubscription | null;
  timezone?: string;
  scheduleSpec?: unknown;
} {
  const raw = (body && typeof body === "object" ? body : {}) as {
    subscription?: PushSubscription;
    timezone?: string;
    scheduleSpec?: unknown;
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };
  if (raw.subscription?.endpoint && raw.subscription.keys?.p256dh && raw.subscription.keys?.auth) {
    return {
      subscription: raw.subscription,
      timezone: raw.timezone,
      scheduleSpec: raw.scheduleSpec,
    };
  }
  if (raw.endpoint && raw.keys?.p256dh && raw.keys?.auth) {
    return {
      subscription: {
        endpoint: raw.endpoint,
        keys: {
          p256dh: raw.keys.p256dh,
          auth: raw.keys.auth,
        },
      },
      timezone: raw.timezone,
      scheduleSpec: raw.scheduleSpec,
    };
  }
  return { subscription: null };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subscription, timezone, scheduleSpec } = extractSubscription(body);
    if (!subscription) {
      return NextResponse.json({ error: "Abonnement Push invalide." }, { status: 400 });
    }

    pushSubscriptions.set(subscription.endpoint, subscription);

    let persistedCloud = false;
    let deviceId = "";
    try {
      const saved = await upsertCloudPushDevice({
        subscription,
        timezone,
        scheduleSpec,
      });
      persistedCloud = saved.persistedCloud;
      deviceId = saved.deviceId;
    } catch (err) {
      console.warn("[push/subscribe] cloud upsert failed:", err);
    }

    return NextResponse.json({
      subscribed: true,
      persistedCloud,
      deviceId,
      totalActiveSubscriptions: pushSubscriptions.size,
    });
  } catch {
    return NextResponse.json({ error: "Payload Push invalide." }, { status: 400 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import type { PushSubscription } from "web-push";
import { upsertCloudPushDevice } from "@/lib/push-cloud-repo";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      subscription?: PushSubscription;
      timezone?: string;
      scheduleSpec?: unknown;
    };
    const sub = body?.subscription;
    if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
      return NextResponse.json({ error: "Abonnement Push manquant ou invalide." }, { status: 400 });
    }

    const saved = await upsertCloudPushDevice({
      subscription: sub,
      timezone: body.timezone,
      scheduleSpec: body.scheduleSpec,
    });

    return NextResponse.json({
      synced: true,
      persistedCloud: saved.persistedCloud,
      deviceId: saved.deviceId,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur de synchronisation Push." },
      { status: 400 }
    );
  }
}

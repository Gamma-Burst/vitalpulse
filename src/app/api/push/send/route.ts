import { NextRequest, NextResponse } from "next/server";
import { PushSubscription } from "web-push";
import { computeDeviceId, configureWebPush, pushSubscriptions, webpush } from "@/lib/push-store";
import { listCloudPushDevices, markFiredAndPruneCloudDevices } from "@/lib/push-cloud-repo";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { configured } = configureWebPush();
    if (!configured) {
      return NextResponse.json(
        { error: "Clés VAPID non configurées côté serveur." },
        { status: 500 }
      );
    }

    const body = await req.json();
    const title = String(body.title || "FolloWeight · Rappel Objectif");
    const message = String(
      body.body || "Encore quelques pas ou un grand verre d'eau pour valider votre journée !"
    );
    const url = String(body.url || "/");
    const tag = body.tag ? String(body.tag) : undefined;
    const directSub = body.subscription as PushSubscription | undefined;

    const targetMap = new Map<string, PushSubscription>();
    if (directSub?.endpoint && directSub?.keys?.p256dh && directSub?.keys?.auth) {
      pushSubscriptions.set(directSub.endpoint, directSub);
      targetMap.set(directSub.endpoint, directSub);
    } else {
      for (const s of pushSubscriptions.values()) {
        targetMap.set(s.endpoint, s);
      }
      try {
        const cloudDevices = await listCloudPushDevices();
        for (const d of cloudDevices) {
          targetMap.set(d.subscription.endpoint, d.subscription);
        }
      } catch (err) {
        console.warn("[push/send] cloud list failed:", err);
      }
    }

    const targets = Array.from(targetMap.values());
    if (targets.length === 0) {
      return NextResponse.json({
        sent: 0,
        message: "Aucun appareil abonné au navigateur pour l'instant (activez les notifications Push d'abord).",
      });
    }

    const payload = JSON.stringify({ title, body: message, url, ...(tag ? { tag } : {}) });
    let sent = 0;
    const errors: string[] = [];
    const deadDeviceIds: string[] = [];

    for (const sub of targets) {
      try {
        await webpush.sendNotification(sub, payload, { TTL: 900 });
        sent += 1;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const statusCode =
          typeof err === "object" && err !== null && "statusCode" in err
            ? Number((err as { statusCode?: unknown }).statusCode)
            : 0;
        errors.push(msg);
        if (statusCode === 410 || statusCode === 404 || msg.includes("410") || msg.includes("404")) {
          pushSubscriptions.delete(sub.endpoint);
          deadDeviceIds.push(computeDeviceId(sub.endpoint));
        }
      }
    }

    if (deadDeviceIds.length > 0) {
      void markFiredAndPruneCloudDevices({
        firedUpdates: [],
        deadDeviceIds,
      }).catch(() => {});
    }

    return NextResponse.json({ sent, totalTargets: targets.length, errors });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur d'envoi Push." },
      { status: 400 }
    );
  }
}

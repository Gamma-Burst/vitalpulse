import { NextRequest, NextResponse } from "next/server";
import { PushSubscription } from "web-push";
import { configureWebPush, pushSubscriptions, webpush } from "@/lib/push-store";

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
    const directSub = body.subscription as PushSubscription | undefined;

    const targets: PushSubscription[] = [];
    if (directSub?.endpoint) {
      pushSubscriptions.set(directSub.endpoint, directSub);
      targets.push(directSub);
    } else {
      targets.push(...pushSubscriptions.values());
    }

    if (targets.length === 0) {
      return NextResponse.json({
        sent: 0,
        message: "Aucun appareil abonné au navigateur pour l'instant (activez les notifications Push d'abord).",
      });
    }

    const payload = JSON.stringify({ title, body: message, url });
    let sent = 0;
    const errors: string[] = [];

    for (const sub of targets) {
      try {
        await webpush.sendNotification(sub, payload);
        sent += 1;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(msg);
        if (msg.includes("410") || msg.includes("404")) {
          pushSubscriptions.delete(sub.endpoint);
        }
      }
    }

    return NextResponse.json({ sent, totalTargets: targets.length, errors });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur d'envoi Push." },
      { status: 400 }
    );
  }
}

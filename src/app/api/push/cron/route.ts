import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  configureWebPush,
  getPushCronGateToken,
  pushSubscriptions,
  webpush,
} from "@/lib/push-store";
import {
  listCloudPushDevices,
  markFiredAndPruneCloudDevices,
} from "@/lib/push-cloud-repo";
import { evaluateDueScheduledNotifications } from "@/lib/push-schedule-engine";

export const runtime = "nodejs";

function isAuthorizedCronRequest(req: NextRequest): boolean {
  const expected = getPushCronGateToken();
  const headerToken = req.headers.get("x-fw-cron-gate")?.trim() || "";
  const authHeader = req.headers.get("authorization")?.trim() || "";
  const bearerToken = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : "";
  const candidate = headerToken || bearerToken;
  if (!candidate) return false;

  const a = Buffer.from(candidate, "utf8");
  const b = Buffer.from(expected, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

async function runCronDispatch(req: NextRequest): Promise<NextResponse> {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { configured } = configureWebPush();
  if (!configured) {
    return NextResponse.json(
      { error: "VAPID non configuré." },
      { status: 500 }
    );
  }

  const devices = await listCloudPushDevices();
  const nowMs = Date.now();
  let notificationsSent = 0;
  const firedUpdates: Array<{ deviceId: string; firedKeys: string[] }> = [];
  const deadDeviceIds: string[] = [];

  for (const device of devices) {
    const dueList = evaluateDueScheduledNotifications({
      nowMs,
      timezone: device.timezone,
      spec: device.scheduleSpec,
      firedKeys: device.firedKeys,
    });

    if (dueList.length === 0) continue;

    const nextFired = [...device.firedKeys];
    let deviceDied = false;

    for (const item of dueList) {
      try {
        await webpush.sendNotification(
          device.subscription,
          JSON.stringify({
            title: item.title,
            body: item.body,
            tag: item.tag,
            url: item.url,
          }),
          { TTL: 900 }
        );
        notificationsSent += 1;
        nextFired.push(item.key);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const statusCode =
          typeof err === "object" && err !== null && "statusCode" in err
            ? Number((err as { statusCode?: unknown }).statusCode)
            : 0;
        if (
          statusCode === 404 ||
          statusCode === 410 ||
          msg.includes("410") ||
          msg.includes("404")
        ) {
          deviceDied = true;
          deadDeviceIds.push(device.deviceId);
          pushSubscriptions.delete(device.subscription.endpoint);
          break;
        }
      }
    }

    if (!deviceDied && nextFired.length > device.firedKeys.length) {
      firedUpdates.push({
        deviceId: device.deviceId,
        firedKeys: nextFired.slice(-80),
      });
    }
  }

  await markFiredAndPruneCloudDevices({
    firedUpdates,
    deadDeviceIds,
  });

  return NextResponse.json({
    ok: true,
    checkedDevices: devices.length,
    notificationsSent,
    prunedDevices: deadDeviceIds.length,
  });
}

export async function POST(req: NextRequest) {
  return runCronDispatch(req);
}

export async function GET(req: NextRequest) {
  return runCronDispatch(req);
}

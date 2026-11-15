import type { PushSubscription } from "web-push";
import {
  computeDeviceId,
  decryptPushSubscription,
  encryptPushSubscription,
  getSupabaseRpcGateToken,
  pushSubscriptions,
} from "@/lib/push-store";
import { PushScheduleSpec, sanitizePushScheduleSpec } from "@/lib/push-schedule-engine";

export interface StoredCloudPushDevice {
  deviceId: string;
  subscription: PushSubscription;
  timezone: string;
  scheduleSpec: PushScheduleSpec;
  firedKeys: string[];
}

interface SupabaseRpcDeviceRow {
  device_id: string;
  encrypted_subscription: string;
  timezone: string;
  schedule_spec: unknown;
  fired_keys: unknown;
}

function getSupabaseRestConfig(): { url: string; anonKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, "") || "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "";
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export function isCloudPushConfigured(): boolean {
  return getSupabaseRestConfig() !== null;
}

async function callSupabaseRpc<T>(fnName: string, body: Record<string, unknown>): Promise<T> {
  const cfg = getSupabaseRestConfig();
  if (!cfg) {
    throw new Error("SUPABASE_NOT_CONFIGURED");
  }
  const res = await fetch(`${cfg.url}/rest/v1/rpc/${fnName}`, {
    method: "POST",
    headers: {
      apikey: cfg.anonKey,
      Authorization: `Bearer ${cfg.anonKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`SUPABASE_RPC_${fnName}_HTTP_${res.status}:${errText.slice(0, 180)}`);
  }
  return (await res.json()) as T;
}

export async function upsertCloudPushDevice(input: {
  subscription: PushSubscription;
  timezone?: string;
  scheduleSpec?: unknown;
}): Promise<{ persistedCloud: boolean; deviceId: string }> {
  const deviceId = computeDeviceId(input.subscription.endpoint);
  pushSubscriptions.set(input.subscription.endpoint, input.subscription);

  if (!isCloudPushConfigured()) {
    return { persistedCloud: false, deviceId };
  }

  const safeTz =
    typeof input.timezone === "string" && input.timezone.trim()
      ? input.timezone.trim().slice(0, 64)
      : "Europe/Brussels";
  const safeSpec = sanitizePushScheduleSpec(input.scheduleSpec);
  const encryptedSub = encryptPushSubscription(input.subscription);

  await callSupabaseRpc("fw_upsert_push_device", {
    p_gate: getSupabaseRpcGateToken(),
    p_device_id: deviceId,
    p_encrypted_sub: encryptedSub,
    p_timezone: safeTz,
    p_schedule: safeSpec,
  });

  return { persistedCloud: true, deviceId };
}

export async function listCloudPushDevices(): Promise<StoredCloudPushDevice[]> {
  if (!isCloudPushConfigured()) {
    return [];
  }

  const rows = await callSupabaseRpc<SupabaseRpcDeviceRow[]>("fw_list_push_devices", {
    p_gate: getSupabaseRpcGateToken(),
  });
  if (!Array.isArray(rows)) return [];

  const devices: StoredCloudPushDevice[] = [];
  for (const row of rows) {
    try {
      const subscription = decryptPushSubscription(row.encrypted_subscription);
      pushSubscriptions.set(subscription.endpoint, subscription);
      devices.push({
        deviceId: row.device_id,
        subscription,
        timezone: row.timezone || "Europe/Brussels",
        scheduleSpec: sanitizePushScheduleSpec(row.schedule_spec),
        firedKeys: Array.isArray(row.fired_keys)
          ? row.fired_keys.map((k) => String(k))
          : [],
      });
    } catch {
      // Ignorer une entrée ancienne devenue illisible après rotation manuelle
    }
  }
  return devices;
}

export async function markFiredAndPruneCloudDevices(input: {
  firedUpdates: Array<{ deviceId: string; firedKeys: string[] }>;
  deadDeviceIds: string[];
}): Promise<{ updated: number; pruned: number }> {
  if (!isCloudPushConfigured()) {
    return { updated: 0, pruned: 0 };
  }
  if (input.firedUpdates.length === 0 && input.deadDeviceIds.length === 0) {
    return { updated: 0, pruned: 0 };
  }

  const res = await callSupabaseRpc<{ updated?: number; pruned?: number }>(
    "fw_mark_fired_and_prune",
    {
      p_gate: getSupabaseRpcGateToken(),
      p_fired_updates: input.firedUpdates.map((u) => ({
        device_id: u.deviceId,
        fired_keys: u.firedKeys.slice(-80),
      })),
      p_dead_device_ids: input.deadDeviceIds,
    }
  );
  return {
    updated: Number(res?.updated || 0),
    pruned: Number(res?.pruned || 0),
  };
}

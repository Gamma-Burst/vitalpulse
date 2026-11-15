import { createECDH, randomBytes } from "crypto";
import { describe, expect, it } from "vitest";
import {
  computeDeviceId,
  decryptPushSubscription,
  deriveDeterministicVapidKeys,
  encryptPushSubscription,
  webpush,
} from "@/lib/push-store";
import {
  evaluateDueScheduledNotifications,
  PushScheduleSpec,
} from "@/lib/push-schedule-engine";
import type { PushSubscription } from "web-push";

function createSampleSubscription(): PushSubscription {
  const clientEcdh = createECDH("prime256v1");
  clientEcdh.generateKeys();
  return {
    endpoint: "https://fcm.googleapis.com/fcm/send/sample-device-token-12345",
    expirationTime: null,
    keys: {
      p256dh: clientEcdh.getPublicKey(undefined, "uncompressed").toString("base64url"),
      auth: randomBytes(16).toString("base64url"),
    },
  };
}

function makeSampleSchedule(overrides?: Partial<PushScheduleSpec>): PushScheduleSpec {
  return {
    fasting: {
      enabled: true,
      protocolId: "16_8",
      protocolBadge: "16:8",
      dailyScheduleEnabled: true,
      eatingWindowStartHm: "12:00",
      eatHours: 8,
      fastHours: 16,
      activeEndIso: null,
      plannedStartIso: null,
    },
    quietHours: {
      start: "22:30",
      end: "07:30",
    },
    reminders: [
      {
        id: "chal-steps-8000",
        title: "Cap des 8000 pas",
        targetValue: 8000,
        unit: "pas",
        reminderTime: "18:30",
        completedToday: false,
      },
      {
        id: "chal-night-ignored",
        title: "Rappel nocturne",
        targetValue: 1,
        unit: "session",
        reminderTime: "23:15",
        completedToday: false,
      },
    ],
    ...overrides,
  };
}

describe("Cloud scheduled Web Push crypto & schedule evaluator", () => {
  it("derives deterministic valid P-256 VAPID keys accepted by web-push", () => {
    const a1 = deriveDeterministicVapidKeys("test-secret-alpha-2026");
    const a2 = deriveDeterministicVapidKeys("test-secret-alpha-2026");
    const b1 = deriveDeterministicVapidKeys("test-secret-beta-2026");

    expect(a1).toEqual(a2);
    expect(a1.publicKey).not.toBe(b1.publicKey);
    expect(a1.privateKey).not.toBe(b1.privateKey);

    const pubBytes = Buffer.from(a1.publicKey, "base64url");
    const privBytes = Buffer.from(a1.privateKey, "base64url");
    expect(pubBytes.length).toBe(65);
    expect(pubBytes[0]).toBe(0x04);
    expect(privBytes.length).toBe(32);

    const sub = createSampleSubscription();
    const reqDetails = webpush.generateRequestDetails(
      sub,
      JSON.stringify({ title: "Test FolloWeight", body: "Ping" }),
      {
        vapidDetails: {
          subject: "mailto:contact@followeight.com",
          publicKey: a1.publicKey,
          privateKey: a1.privateKey,
        },
      }
    );

    expect(reqDetails.endpoint).toBe(sub.endpoint);
    expect(reqDetails.headers.Authorization).toMatch(/^vapid /i);
  });

  it("encrypts/decrypts PushSubscription with AES-256-GCM and rejects tampering", () => {
    const secret = "unit-test-hmac-secret-for-gcm";
    const sub = createSampleSubscription();

    const id1 = computeDeviceId(sub.endpoint);
    const id2 = computeDeviceId(`  ${sub.endpoint}  `);
    expect(id1).toBe(id2);
    expect(id1).toMatch(/^[0-9a-f]{64}$/);

    const encrypted = encryptPushSubscription(sub, secret);
    expect(encrypted.startsWith("v1.")).toBe(true);
    expect(decryptPushSubscription(encrypted, secret)).toEqual(sub);

    const parts = encrypted.split(".");
    const badTagChar = parts[2][0] === "A" ? "B" : "A";
    const tampered = [parts[0], parts[1], badTagChar + parts[2].slice(1), parts[3]].join(".");
    expect(() => decryptPushSubscription(tampered, secret)).toThrow();
  });

  it("triggers daily 16:8 eating open (12:00) and fast resume (20:00) in Europe/Brussels with idempotency", () => {
    const spec = makeSampleSchedule({ reminders: [] });

    // 11:59 CET -> must never fire early
    const early = evaluateDueScheduledNotifications({
      nowMs: Date.parse("2026-11-15T10:59:00Z"),
      timezone: "Europe/Brussels",
      spec,
      firedKeys: [],
    });
    expect(early).toEqual([]);

    // 12:00:10 CET -> eating window opens
    const atOpen = evaluateDueScheduledNotifications({
      nowMs: Date.parse("2026-11-15T11:00:10Z"),
      timezone: "Europe/Brussels",
      spec,
      firedKeys: [],
    });
    expect(atOpen).toHaveLength(1);
    expect(atOpen[0].key).toBe("fast-eat-open:2026-11-15:12:00");
    expect(atOpen[0].tag).toBe("fw-fast-open-2026-11-15");

    // 12:05 CET -> still matches forward tolerance if missed earlier, suppressed once recorded
    const retryOpen = evaluateDueScheduledNotifications({
      nowMs: Date.parse("2026-11-15T11:05:00Z"),
      timezone: "Europe/Brussels",
      spec,
      firedKeys: [],
    });
    expect(retryOpen).toHaveLength(1);
    expect(retryOpen[0].key).toBe("fast-eat-open:2026-11-15:12:00");

    const alreadyFiredOpen = evaluateDueScheduledNotifications({
      nowMs: Date.parse("2026-11-15T11:05:00Z"),
      timezone: "Europe/Brussels",
      spec,
      firedKeys: ["fast-eat-open:2026-11-15:12:00"],
    });
    expect(alreadyFiredOpen).toEqual([]);

    // 20:00:05 CET -> fasting resume notification
    const atClose = evaluateDueScheduledNotifications({
      nowMs: Date.parse("2026-11-15T19:00:05Z"),
      timezone: "Europe/Brussels",
      spec,
      firedKeys: ["fast-eat-open:2026-11-15:12:00"],
    });
    expect(atClose).toHaveLength(1);
    expect(atClose[0].key).toBe("fast-close:2026-11-15:20:00");
    expect(atClose[0].tag).toBe("fw-fast-close-2026-11-15");
  });

  it("fires daytime goal reminders when incomplete, skips completedToday and suppresses overnight quietHours", () => {
    const spec = makeSampleSchedule();

    // 18:31 CET -> daytime reminder fires when completedToday is false
    const dueGoal = evaluateDueScheduledNotifications({
      nowMs: Date.parse("2026-11-15T17:31:00Z"),
      timezone: "Europe/Brussels",
      spec,
      firedKeys: [],
    });
    expect(dueGoal).toHaveLength(1);
    expect(dueGoal[0].key).toBe("rem:chal-steps-8000:2026-11-15:18:30");

    // Completed today -> suppressed even at exact scheduled minute
    const completedSpec = makeSampleSchedule({
      reminders: [
        {
          ...spec.reminders[0],
          completedToday: true,
        },
        spec.reminders[1],
      ],
    });
    const skippedCompleted = evaluateDueScheduledNotifications({
      nowMs: Date.parse("2026-11-15T17:31:00Z"),
      timezone: "Europe/Brussels",
      spec: completedSpec,
      firedKeys: [],
    });
    expect(skippedCompleted).toEqual([]);

    // 23:15 CET inside 22:30 -> 07:30 quietHours -> goal reminder suppressed
    const suppressedQuiet = evaluateDueScheduledNotifications({
      nowMs: Date.parse("2026-11-15T22:15:30Z"),
      timezone: "Europe/Brussels",
      spec,
      firedKeys: [],
    });
    expect(suppressedQuiet).toEqual([]);
  });
});

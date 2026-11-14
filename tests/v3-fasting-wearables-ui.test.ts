import { describe, expect, it } from "vitest";
import { computeFastingLiveStatus } from "@/lib/fasting-engine";
import {
  buildWeeklyAdherenceStrip,
  clampRingProgress,
  computeWaterWaveGeometry,
  computeWeeklyCalorieBank,
  evaluateSodiumCeilingStatus,
} from "@/lib/ui-progressive";
import {
  parseHeartRateMeasurement,
  parseWearableExportText,
} from "@/lib/wearables-bridge";
import { buildFreshUserState, migrateVitalPulseState } from "@/lib/storage-db";
import { computeDailyEnergyBalance } from "@/lib/metabolic-engine";
import { FastingConfig, UserProfile } from "@/types/vitalpulse";

const sampleProfile: UserProfile = {
  name: "Testeur v3",
  age: 34,
  sex: "male",
  heightCm: 178,
  weightKg: 80,
  targetWeightKg: 75,
  waistCm: 84,
  activityProfile: "lightly_active",
  primaryGoal: "fat_loss",
  weeklyPaceKg: -0.4,
  dailyStepGoal: 8500,
  specialMode: "standard",
  quietHours: { start: "22:00", end: "07:30" },
};

describe("fasting-engine (16:8, OMAD, scheduled & physiological phases)", () => {
  const baseFasting: FastingConfig = buildFreshUserState(sampleProfile).fasting;

  it("reports idle mode when no active or planned fast exists", () => {
    const status = computeFastingLiveStatus(
      { ...baseFasting, protocolId: "16_8", activeStartIso: null, plannedStartIso: null },
      Date.UTC(2026, 10, 14, 12, 0, 0)
    );
    expect(status.mode).toBe("idle");
    expect(status.headlineFr.length).toBeGreaterThan(3);
  });

  it("enters scheduled mode with YAZIO-style countdown when plannedStartIso is in the future", () => {
    const now = Date.UTC(2026, 10, 14, 15, 0, 0);
    const futureStart = new Date(now + 3 * 3600 * 1000).toISOString();
    const status = computeFastingLiveStatus(
      {
        ...baseFasting,
        protocolId: "20_4",
        fastHours: 20,
        eatHours: 4,
        activeStartIso: null,
        plannedStartIso: futureStart,
      },
      now
    );
    expect(status.mode).toBe("scheduled");
    expect(status.headlineFr).toContain("Préparez-vous");
  });

  it("tracks physiological phases accurately from lipolysis (14h) to autophagy_zone (22h OMAD)", () => {
    const now = Date.UTC(2026, 10, 14, 18, 0, 0);

    const lipolysisStatus = computeFastingLiveStatus(
      {
        ...baseFasting,
        protocolId: "16_8",
        fastHours: 16,
        eatHours: 8,
        activeStartIso: new Date(now - 14 * 3600 * 1000).toISOString(),
        plannedStartIso: null,
      },
      now
    );
    expect(lipolysisStatus.mode).toBe("fasting");
    expect(lipolysisStatus.currentPhase.id).toBe("lipolysis");
    expect(lipolysisStatus.progress).toBeGreaterThan(0.8);
    expect(lipolysisStatus.progress).toBeLessThan(1);

    const autophagyStatus = computeFastingLiveStatus(
      {
        ...baseFasting,
        protocolId: "omad_23_1",
        fastHours: 23,
        eatHours: 1,
        activeStartIso: new Date(now - 22 * 3600 * 1000).toISOString(),
        plannedStartIso: null,
      },
      now
    );
    expect(autophagyStatus.mode).toBe("fasting");
    expect(autophagyStatus.currentPhase.id).toBe("autophagy_zone");
  });

  it("tracks recurring OMAD daily schedule between eating_window and fasting in local time", () => {
    const omadConfig: FastingConfig = {
      ...baseFasting,
      protocolId: "omad_23_1",
      fastHours: 23,
      eatHours: 1,
      dailyScheduleEnabled: true,
      eatingWindowStartHm: "19:00",
      notificationsEnabled: true,
      activeStartIso: null,
      plannedStartIso: null,
      eatingWindowStartIso: null,
    };

    const duringMeal = new Date(2026, 10, 14, 19, 20, 0).getTime();
    const eatingLive = computeFastingLiveStatus(omadConfig, duringMeal);
    expect(eatingLive.mode).toBe("eating_window");
    expect(eatingLive.eatWindowHours).toBe(1);
    expect(eatingLive.allowedEatSummaryFr).toContain("autorisé à manger pendant 1 heure");
    expect(eatingLive.notificationPayload?.body).toContain("autorisé à manger pendant 1 heure");

    const duringFast = new Date(2026, 10, 14, 14, 0, 0).getTime();
    const fastingLive = computeFastingLiveStatus(omadConfig, duringFast);
    expect(fastingLive.mode).toBe("fasting");
    expect(fastingLive.notificationPayload?.title).toContain("jeûne");
    expect(fastingLive.endIso).toBeTruthy();
  });

  it("rolls an active 23h fast over into eating_window after fastHours elapse", () => {
    const now = new Date(2026, 10, 14, 19, 30, 0).getTime();
    const rolled = computeFastingLiveStatus(
      {
        ...baseFasting,
        protocolId: "omad_23_1",
        fastHours: 23,
        eatHours: 1,
        dailyScheduleEnabled: false,
        activeStartIso: new Date(now - 23.5 * 3600 * 1000).toISOString(),
        plannedStartIso: null,
      },
      now
    );
    expect(rolled.mode).toBe("eating_window");
    expect(rolled.headlineFr).toContain("Fenêtre repas ouverte");
    expect(rolled.allowedEatSummaryFr).toContain("autorisé à manger pendant 1 heure");
  });
});

describe("ui-progressive helpers (clamping, wave geometry, sodium & weekly bank)", () => {
  it("clamps ring progress safely between 0 and 1 even on zero or overshot targets", () => {
    expect(clampRingProgress(3200, 2000)).toBe(1);
    expect(clampRingProgress(-50, 2000)).toBe(0);
    expect(clampRingProgress(500, 0)).toBe(0);
    expect(clampRingProgress(1000, 2000)).toBeCloseTo(0.5, 2);
  });

  it("computes water wave geometry consistently across empty, half and full states", () => {
    const empty = computeWaterWaveGeometry(0, 2500);
    const half = computeWaterWaveGeometry(1250, 2500);
    const full = computeWaterWaveGeometry(3000, 2500);

    expect(empty.isEmpty).toBe(true);
    expect(empty.ratio).toBe(0);
    expect(half.ratio).toBeCloseTo(0.5, 2);
    expect(full.isFull).toBe(true);
    expect(full.ratio).toBe(1);
    expect(full.levelY).toBeLessThan(half.levelY);
    expect(half.levelY).toBeLessThan(empty.levelY);
  });

  it("evaluates sodium ceiling guard thresholds", () => {
    expect(evaluateSodiumCeilingStatus(1400, 2300)).toBe("safe");
    expect(evaluateSodiumCeilingStatus(2000, 2300)).toBe("near_limit");
    expect(evaluateSodiumCeilingStatus(2450, 2300)).toBe("exceeded");
  });

  it("builds a 7-day adherence strip and weekly calorie bank summary", () => {
    const dates = [
      "2026-11-08",
      "2026-11-09",
      "2026-11-10",
      "2026-11-11",
      "2026-11-12",
      "2026-11-13",
      "2026-11-14",
    ];
    const balances = dates.map((dateKey) =>
      computeDailyEnergyBalance({
        dateKey,
        profile: sampleProfile,
        meals: [],
        workouts: [],
      })
    );

    const strip = buildWeeklyAdherenceStrip(balances);
    expect(strip).toHaveLength(7);
    expect(strip[0].dateKey).toBe("2026-11-08");
    expect(strip[6].dayLetter.length).toBeGreaterThanOrEqual(1);

    const bank = computeWeeklyCalorieBank(balances);
    expect(bank.weeklyTargetKcal).toBeGreaterThan(10000);
    expect(typeof bank.pleasureMarginKcal).toBe("number");
    expect(bank.guidanceFr.length).toBeGreaterThan(5);
  });
});

describe("wearables-bridge parsers (BLE Heart Rate 0x180D & exports)", () => {
  it("parses both 8-bit and 16-bit Bluetooth GATT 0x2A37 heart rate packets", () => {
    const buf8 = new Uint8Array([0x00, 74]).buffer;
    expect(parseHeartRateMeasurement(new DataView(buf8))).toBe(74);

    // Flags 0x01 => UINT16 little-endian heart rate value: 272 BPM (0x10, 0x01)
    const buf16 = new Uint8Array([0x01, 0x10, 0x01]).buffer;
    expect(parseHeartRateMeasurement(new DataView(buf16))).toBe(272);
  });

  it("parses Apple Health XML and Garmin/Fitbit JSON exports gracefully", () => {
    const appleXml = `
      <HealthData>
        <Record type="HKQuantityTypeIdentifierStepCount" value="5400" />
        <Record type="HKQuantityTypeIdentifierHeartRate" value="64" />
      </HealthData>
    `;
    const parsedApple = parseWearableExportText("export.xml", appleXml);
    expect(parsedApple.steps).toBe(5400);
    expect(parsedApple.heartRateBpm).toBe(64);

    const garminJson = JSON.stringify({
      steps: 9120,
      activeKilocalories: 410,
      restingHeartRate: 58,
      weightKg: 79.4,
    });
    const parsedGarmin = parseWearableExportText("garmin_daily.json", garminJson);
    expect(parsedGarmin.steps).toBe(9120);
    expect(parsedGarmin.activeKcal).toBe(410);
    expect(parsedGarmin.heartRateBpm).toBe(58);

    const empty = parseWearableExportText("unknown.txt", "bonjour");
    expect(empty.steps).toBeUndefined();
  });
});

describe("VitalPulse storage migration v2 -> v3", () => {
  it("hydrates v3 onboarding, fasting, widgets & wearable defaults idempotently", () => {
    const fresh = buildFreshUserState(sampleProfile);
    const legacyV2 = {
      ...fresh,
      version: 2,
      onboardingCompleted: undefined,
      theme: undefined,
      fasting: undefined,
      enabledWidgets: undefined,
      wearable: undefined,
      completedMindsetDates: undefined,
    } as unknown as Parameters<typeof migrateVitalPulseState>[0];

    const v3Once = migrateVitalPulseState(legacyV2);
    expect(v3Once.version).toBe(3);
    expect(Array.isArray(v3Once.enabledWidgets)).toBe(true);
    expect(v3Once.enabledWidgets.length).toBeGreaterThan(0);
    expect(v3Once.fasting).toBeDefined();
    expect(v3Once.wearable).toBeDefined();

    const v3Twice = migrateVitalPulseState(v3Once);
    expect(v3Twice).toEqual(v3Once);
  });
});

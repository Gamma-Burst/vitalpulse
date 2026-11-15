import { describe, expect, it } from "vitest";
import {
  formatDecimalFr,
  parseDecimalInput,
  roundToDecimals,
  sanitizeDecimalDraft,
} from "@/lib/decimal-utils";
import { evaluateGoalProgress } from "@/lib/goals-celebration-engine";
import {
  computeDailyEnergyBalance,
  computeWeightTrendAndScaleDecoder,
} from "@/lib/metabolic-engine";
import {
  migrateVitalPulseState,
  sanitizeUserProfile,
  VitalPulseState,
} from "@/lib/storage-db";
import { CustomChallenge, UserProfile } from "@/types/vitalpulse";

const TODAY = "2026-11-15";

const BASE_PROFILE: UserProfile = {
  name: "Test Décimales",
  age: 38,
  sex: "male",
  heightCm: 178,
  weightKg: 82.45,
  targetWeightKg: 79.45,
  waistCm: 86.25,
  activityProfile: "lightly_active",
  primaryGoal: "fat_loss",
  weeklyPaceKg: -0.4,
  dailyStepGoal: 8500,
  specialMode: "standard",
  quietHours: { start: "22:00", end: "07:00" },
};

describe("Préservation des décimales de poids (Poids lissé EMA & profil)", () => {
  it("nettoie, parse et formate les saisies décimales point ou virgule jusqu'à 2 décimales sans troncature", () => {
    expect(sanitizeDecimalDraft("82,4")).toBe("82,4");
    expect(sanitizeDecimalDraft("82.4")).toBe("82.4");
    expect(sanitizeDecimalDraft("82,45")).toBe("82,45");
    expect(sanitizeDecimalDraft("82.45")).toBe("82.45");
    expect(sanitizeDecimalDraft("78.,5")).toBe("78,5");
    expect(sanitizeDecimalDraft("78..5")).toBe("78.5");
    expect(sanitizeDecimalDraft("78.4,5")).toBe("78.45");
    expect(sanitizeDecimalDraft("82,")).toBe("82,");
    expect(sanitizeDecimalDraft("82.")).toBe("82.");

    expect(parseDecimalInput("82,4")).toBe(82.4);
    expect(parseDecimalInput("82.4")).toBe(82.4);
    expect(parseDecimalInput("82,45")).toBe(82.45);
    expect(parseDecimalInput("82.45")).toBe(82.45);
    expect(parseDecimalInput("78.,5")).toBe(78.5);
    expect(parseDecimalInput("78..5")).toBe(78.5);
    expect(parseDecimalInput("78.4,5")).toBe(78.45);
    expect(parseDecimalInput("82")).toBe(82);
    expect(parseDecimalInput("82,")).toBe(82);

    expect(formatDecimalFr(82)).toBe("82");
    expect(formatDecimalFr(82.4)).toBe("82,4");
    expect(formatDecimalFr(82.45)).toBe("82,45");
    expect(roundToDecimals(-0.001, 2)).toBe(0);
  });

  it("conserve les poids et mensurations à 1 ou 2 décimales dans sanitizeUserProfile et migrateVitalPulseState", () => {
    const clean2Dec = sanitizeUserProfile({
      weightKg: 82.45,
      targetWeightKg: 75.25,
      waistCm: 84.35,
    });
    expect(clean2Dec.weightKg).toBe(82.45);
    expect(clean2Dec.targetWeightKg).toBe(75.25);
    expect(clean2Dec.waistCm).toBe(84.35);

    const clean1Dec = sanitizeUserProfile({
      weightKg: 82.4,
      targetWeightKg: 75.2,
    });
    expect(clean1Dec.weightKg).toBe(82.4);
    expect(clean1Dec.targetWeightKg).toBe(75.2);

    const migrated = migrateVitalPulseState({
      version: 5,
      profile: {
        weightKg: 82.45,
        targetWeightKg: 79.45,
        waistCm: 86.25,
      },
      weights: [
        {
          id: "w1",
          dateKey: TODAY,
          timestamp: `${TODAY}T07:30:00.000Z`,
          weightKg: 82.45,
          waistCm: 86.25,
        },
      ],
    } as Partial<VitalPulseState>);

    expect(migrated.profile.weightKg).toBe(82.45);
    expect(migrated.profile.targetWeightKg).toBe(79.45);
    expect(migrated.profile.waistCm).toBe(86.25);
    expect(migrated.weights[0].weightKg).toBe(82.45);
  });

  it("préserve 2 décimales dans la courbe EMA et les messages du décodeur de balance", () => {
    const bal = computeDailyEnergyBalance({
      dateKey: "2026-11-14",
      profile: BASE_PROFILE,
      meals: [],
      workouts: [],
    });

    const { trend, decoder } = computeWeightTrendAndScaleDecoder(
      [
        { id: "w1", dateKey: "2026-11-13", timestamp: "2026-11-13T07:00:00Z", weightKg: 82.45 },
        { id: "w2", dateKey: "2026-11-14", timestamp: "2026-11-14T07:00:00Z", weightKg: 82.15 },
        { id: "w3", dateKey: "2026-11-15", timestamp: "2026-11-15T07:00:00Z", weightKg: 81.85 },
      ],
      [bal]
    );

    expect(trend.map((p) => p.rawWeightKg)).toEqual([82.45, 82.15, 81.85]);
    expect(trend[2].emaWeightKg).toBeLessThan(82.45);
    expect(String(trend[2].emaWeightKg).split(".")[1]?.length).toBeGreaterThanOrEqual(1);
    expect(decoder?.headlineFr).toContain(formatDecimalFr(trend[2].emaWeightKg, 2));

    const dropRes = computeWeightTrendAndScaleDecoder(
      [
        { id: "d1", dateKey: "2026-11-08", timestamp: "2026-11-08T07:00:00Z", weightKg: 82.95 },
        { id: "d2", dateKey: "2026-11-15", timestamp: "2026-11-15T07:00:00Z", weightKg: 81.45 },
      ],
      [bal]
    );
    expect(dropRes.decoder?.likelyCause).toBe("steady_fat_loss");
    expect(dropRes.decoder?.explanationFr).toContain(
      formatDecimalFr(dropRes.trend[1].emaWeightKg, 2)
    );
  });

  it("évalue un objectif de poids cible à 2 décimales (79,45 kg) sans arrondi prématuré", () => {
    const goal: CustomChallenge = {
      id: "g-decimal-weight",
      title: "Passer sous 79,45 kg",
      description: "",
      metric: "weight_target",
      targetValue: 79.45,
      startValue: 82.45,
      direction: "at_most",
      unit: "kg",
      durationDays: 60,
      reminderTime: "08:00",
      active: true,
      completedDates: [],
      createdAt: `${TODAY}T08:00:00.000Z`,
    };

    const makeCtx = (weightKg: number) => ({
      profile: { ...BASE_PROFILE, weightKg },
      todayKey: TODAY,
      todayBalance: computeDailyEnergyBalance({
        dateKey: TODAY,
        profile: { ...BASE_PROFILE, weightKg },
        meals: [],
        workouts: [],
      }),
      meals: [],
      workouts: [],
      weights: [
        {
          id: "w-latest",
          dateKey: TODAY,
          timestamp: `${TODAY}T07:30:00.000Z`,
          weightKg,
        },
      ],
      measurements: [],
      fasting: {
        protocolId: "16_8" as const,
        fastHours: 16,
        eatHours: 8,
        activeStartIso: null,
        plannedStartIso: null,
        history: [],
      },
    });

    const almostThere = evaluateGoalProgress(goal, makeCtx(79.46));
    expect(almostThere.reachedToday).toBe(false);
    expect(almostThere.currentLabelFr).toBe("79,46 kg → cible 79,45 kg");

    const reached = evaluateGoalProgress(goal, makeCtx(79.45));
    expect(reached.reachedToday).toBe(true);
    expect(reached.progressPct).toBe(100);
    expect(reached.currentLabelFr).toBe("79,45 kg → cible 79,45 kg");
  });
});

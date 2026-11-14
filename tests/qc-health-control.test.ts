import { describe, expect, it } from "vitest";
import { computeAnthropometrics } from "@/lib/metabolic-engine";
import {
  CURRENT_STATE_VERSION,
  migrateVitalPulseState,
  sanitizeUserProfile,
  VitalPulseState,
} from "@/lib/storage-db";
import { computeWeeklyCalorieBank } from "@/lib/ui-progressive";
import { parseWearableExportText } from "@/lib/wearables-bridge";
import { DailyEnergyBalance } from "@/types/vitalpulse";

function makeMinimalDayBalance(overrides: Partial<DailyEnergyBalance>): DailyEnergyBalance {
  return {
    dateKey: "2026-11-15",
    intakeKcal: 0,
    intakeMinKcal: 0,
    intakeMaxKcal: 0,
    macros: {
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
      fiberG: 0,
      sugarG: 0,
      satFatG: 0,
      sodiumMg: 0,
    },
    micronutrients: {
      ironMg: 0,
      magnesiumMg: 0,
      calciumMg: 0,
      potassiumMg: 0,
      vitCMg: 0,
      vitDUg: 0,
    },
    avgNovaGroup: 1,
    totalGlycemicLoad: 0,
    bmrKcal: 1700,
    nonAmbulatoryNeatKcal: 260,
    rawSteps: 0,
    overlapStepsDeducted: 0,
    effectiveNeatSteps: 0,
    stepDistanceKm: 0,
    netStepsKcal: 0,
    workoutMinutes: 0,
    netWorkoutsKcal: 0,
    tefKcal: 0,
    totalExpenditureKcal: 1960,
    netBalanceKcal: -1960,
    targetIntakeKcal: 1900,
    remainingToTargetKcal: 1900,
    statusFr: "En cours",
    waterMl: 0,
    mealsCount: 0,
    ...overrides,
  };
}

describe("Health Control & QC — VitalPulse v3.3", () => {
  it("plafonne l'hydratation auto EFSA même pour 200 kg en mode cétogène (jamais 8000 mL)", () => {
    const profile = sanitizeUserProfile({
      weightKg: 200,
      heightCm: 175,
      age: 38,
      sex: "male",
      specialMode: "ketogenic",
      dailyWaterGoalMl: undefined,
    });
    const report = computeAnthropometrics(profile);
    expect(report.autoWaterMl).toBeGreaterThanOrEqual(1500);
    expect(report.autoWaterMl).toBeLessThanOrEqual(3500);
    expect(report.targets.waterMl).toBe(report.autoWaterMl);
    expect(report.targets.proteinG).toBeLessThanOrEqual(220);
  });

  it("respecte les objectifs personnalisés d'eau et de calories avec plancher clinique", () => {
    const base = sanitizeUserProfile({
      weightKg: 82,
      heightCm: 178,
      age: 34,
      sex: "male",
      dailyWaterGoalMl: 2750,
      dailyCalorieGoalOverride: 950,
    });
    const report = computeAnthropometrics(base);
    expect(report.targets.waterMl).toBe(2750);
    // La surcharge 950 kcal est refusée au profit du plancher clinique (>= 1500 chez l'homme)
    expect(report.targetIntakeKcal).toBeGreaterThanOrEqual(report.clinicalFloorKcal);

    const safeCustom = sanitizeUserProfile({
      ...base,
      dailyCalorieGoalOverride: 2350,
    });
    const customReport = computeAnthropometrics(safeCustom);
    expect(customReport.targetIntakeKcal).toBe(2350);
  });

  it("évite la fausse marge plaisir +13 300 kcal au Jour 1 sans repas complets", () => {
    const emptyWeek = Array.from({ length: 7 }, (_, i) =>
      makeMinimalDayBalance({ dateKey: `2026-11-0${i + 9}`, targetIntakeKcal: 1900 })
    );
    const bankDay1 = computeWeeklyCalorieBank(emptyWeek);
    expect(bankDay1.pleasureMarginKcal).toBe(0);
    expect(bankDay1.weeklyTargetKcal).toBeGreaterThan(10000);

    // Une journée passée réellement complète + 6 jours vides : ne crédite que ce jour complet
    const onePastComplete = emptyWeek.map((d, idx) =>
      idx === 3 ? { ...d, mealsCount: 3, intakeKcal: 1650, targetIntakeKcal: 1900 } : d
    );
    const bankPartial = computeWeeklyCalorieBank(onePastComplete);
    expect(bankPartial.pleasureMarginKcal).toBe(250);
  });

  it("remédie en migration v4 les objectifs aberrants (eau 8000 mL, pas 90000)", () => {
    const corrupted = {
      version: 3,
      profile: {
        weightKg: 80,
        dailyStepGoal: 90000,
        dailyWaterGoalMl: 8000,
        waistCm: 12,
      },
      steps: [{ dateKey: "2026-11-15", steps: 999999, source: "manual" }],
      waters: [{ dateKey: "2026-11-15", milliliters: 80000 }],
      challenges: [
        {
          id: "chal-bad-water",
          title: "Hydratation cassée",
          description: "",
          metric: "water",
          targetValue: 8000,
          unit: "mL",
          durationDays: 14,
          createdAt: "2026-11-14T10:00:00Z",
        },
        {
          id: "chal-bad-steps",
          title: "Pas cassés",
          description: "",
          metric: "steps",
          targetValue: 180000,
          unit: "pas",
          durationDays: 14,
          createdAt: "2026-11-14T10:00:00Z",
        },
      ],
    };

    const migrated = migrateVitalPulseState(corrupted as unknown as Partial<VitalPulseState>);
    expect(migrated.version).toBe(CURRENT_STATE_VERSION);
    expect(migrated.profile.dailyWaterGoalMl).toBeUndefined();
    expect(computeAnthropometrics(migrated.profile).targets.waterMl).toBeLessThanOrEqual(3500);
    expect(migrated.profile.dailyStepGoal).toBeLessThanOrEqual(30000);
    expect(migrated.profile.waistCm).toBeUndefined();
    expect(migrated.waters[0].milliliters).toBeLessThanOrEqual(10000);
    expect(migrated.steps[0].steps).toBeLessThanOrEqual(100000);

    const waterChallenge = migrated.challenges.find((c) => c.id === "chal-bad-water");
    const stepChallenge = migrated.challenges.find((c) => c.id === "chal-bad-steps");
    expect(waterChallenge?.targetValue).toBeLessThanOrEqual(4500);
    expect(stepChallenge?.targetValue).toBeLessThanOrEqual(30000);
  });

  it("empêche Number(null)===0 et la somme multi-années Apple Santé XML", () => {
    const jsonWithNulls = parseWearableExportText(
      "samsung.json",
      JSON.stringify({ steps: 6420, weightKg: null, heartRateBpm: null })
    );
    expect(jsonWithNulls.steps).toBe(6420);
    expect(jsonWithNulls.weightKg).toBeUndefined();
    expect(jsonWithNulls.heartRateBpm).toBeUndefined();

    const multiYearXml = `
      <HealthData>
        <Record type="HKQuantityTypeIdentifierStepCount" startDate="2024-05-01 08:00:00 +0100" value="11000" />
        <Record type="HKQuantityTypeIdentifierStepCount" startDate="2025-11-14 09:00:00 +0100" value="9500" />
        <Record type="HKQuantityTypeIdentifierStepCount" startDate="2026-11-15 10:15:00 +0100" value="3200" />
        <Record type="HKQuantityTypeIdentifierStepCount" startDate="2026-11-15 14:30:00 +0100" value="4150" />
        <Record type="HKQuantityTypeIdentifierBodyMass" startDate="2026-11-15 07:00:00 +0100" value="76.4" />
        <Record type="HKQuantityTypeIdentifierHeartRate" startDate="2026-11-15 12:00:00 +0100" value="62" />
      </HealthData>
    `;
    const parsedXml = parseWearableExportText("export.xml", multiYearXml);
    expect(parsedXml.steps).toBe(7350);
    expect(parsedXml.weightKg).toBe(76.4);
    expect(parsedXml.heartRateBpm).toBe(62);
  });
});

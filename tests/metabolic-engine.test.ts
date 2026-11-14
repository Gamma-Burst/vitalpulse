import { describe, expect, it } from "vitest";
import {
  computeAnthropometrics,
  computeDailyEnergyBalance,
  computeWeightTrendAndScaleDecoder,
  computeWorkoutNetCalories,
} from "@/lib/metabolic-engine";
import { analyzeMealDeterministically } from "@/data/ciqual-reference";
import { MealEntry, UserProfile, WorkoutSession } from "@/types/vitalpulse";

const baseProfile: UserProfile = {
  name: "Test",
  age: 35,
  sex: "male",
  heightCm: 178,
  weightKg: 82,
  targetWeightKg: 76,
  waistCm: 86,
  activityProfile: "lightly_active",
  primaryGoal: "fat_loss",
  weeklyPaceKg: -0.4,
  dailyStepGoal: 8500,
  specialMode: "standard",
  quietHours: { start: "22:00", end: "07:30" },
};

describe("computeAnthropometrics", () => {
  it("computes IMC, WtHR, BRI, RFM, BMR and athletic coherence properly", () => {
    const res = computeAnthropometrics(baseProfile);
    expect(res.bmi).toBeCloseTo(25.9, 1);
    expect(res.wthr).toBeCloseTo(0.48, 2);
    expect(res.bri).toBeGreaterThan(2.5);
    expect(res.bri).toBeLessThan(6.0);
    expect(res.rfmPct).toBeGreaterThan(10);
    expect(res.rfmPct).toBeLessThan(35);
    expect(res.bmrKcal).toBeGreaterThan(1650);
    expect(res.athleticCoherenceNote).toContain("Profil musclé");
    expect(res.safetyFloorApplied).toBe(false);
  });

  it("enforces clinical safety floor and minor protection", () => {
    const minor = computeAnthropometrics({ ...baseProfile, age: 16, weeklyPaceKg: -0.75 });
    expect(minor.minorSafetyLock).toBe(true);
    expect(minor.targetIntakeKcal).toBe(minor.estimatedMaintenanceKcal);

    const aggressive = computeAnthropometrics({
      ...baseProfile,
      sex: "female",
      heightCm: 158,
      weightKg: 54,
      weeklyPaceKg: -0.9,
    });
    expect(aggressive.safetyFloorApplied).toBe(true);
    expect(aggressive.targetIntakeKcal).toBeGreaterThanOrEqual(1200);
  });
});

describe("computeDailyEnergyBalance (Zero Double Counting)", () => {
  it("deducts workout overlap steps and resting metabolism from MET workouts", () => {
    const anthro = computeAnthropometrics(baseProfile);
    const netWo = computeWorkoutNetCalories(82, anthro.bmrKcal, 4.3, 20);
    expect(netWo).toBeGreaterThan(50);
    expect(netWo).toBeLessThan(130);

    const meal: MealEntry = {
      id: "m1",
      createdAt: "2026-11-14T12:00:00Z",
      dateKey: "2026-11-14",
      mealType: "lunch",
      userNotes: "Saumon 150g, riz 150g",
      plateDiameterCm: 26,
      portionEatenPct: 100,
      dishTitle: "Saumon riz",
      summaryFr: "Repas test",
      confidence: 0.9,
      analysisProvider: "ciqual-deterministic",
      caloriesCentral: 600,
      caloriesMin: 540,
      caloriesMax: 660,
      macros: {
        proteinG: 40,
        carbsG: 50,
        fatG: 20,
        fiberG: 6,
        sugarG: 2,
        satFatG: 4,
        sodiumMg: 400,
      },
      micronutrients: {
        ironMg: 2,
        magnesiumMg: 60,
        calciumMg: 40,
        potassiumMg: 500,
        vitCMg: 10,
        vitDUg: 5,
      },
      novaGroup: 1,
      glycemicLoad: 18,
      satietyScore: 85,
      healthScore: 90,
      items: [],
      smartClarifier: { oilLevel: "none", appliedOilDeltaKcal: 0, questionFr: "" },
      clinicalSources: [],
      revisions: [],
    };

    const wo: WorkoutSession = {
      id: "w1",
      dateKey: "2026-11-14",
      exerciseId: "brisk-walk-20",
      title: "Marche active 20 min",
      category: "digestive_walk",
      durationMinutes: 20,
      met: 4.3,
      netCaloriesBurned: netWo,
      estimatedStepsOverlap: 2240,
      rpe: 5,
      startedAt: "2026-11-14T13:00:00Z",
    };

    const balance = computeDailyEnergyBalance({
      dateKey: "2026-11-14",
      profile: baseProfile,
      meals: [meal],
      stepLog: {
        dateKey: "2026-11-14",
        steps: 8000,
        source: "health_connect",
        updatedAt: "2026-11-14T18:00:00Z",
      },
      workouts: [wo],
    });

    expect(balance.rawSteps).toBe(8000);
    expect(balance.overlapStepsDeducted).toBe(2240);
    expect(balance.effectiveNeatSteps).toBe(5760);
    expect(balance.tefKcal).toBe(Math.round(40 * 4 * 0.25 + 50 * 4 * 0.075 + 20 * 9 * 0.015));
    expect(balance.netBalanceKcal).toBe(600 - balance.totalExpenditureKcal);
  });
});

describe("computeWeightTrendAndScaleDecoder", () => {
  it("explains transient water weight rebound after high-sodium day", () => {
    const d1Bal = computeDailyEnergyBalance({
      dateKey: "2026-11-13",
      profile: baseProfile,
      meals: [
        {
          id: "msalt",
          createdAt: "2026-11-13T19:00:00Z",
          dateKey: "2026-11-13",
          mealType: "dinner",
          userNotes: "Sushi soja",
          plateDiameterCm: 26,
          portionEatenPct: 100,
          dishTitle: "Sushi",
          summaryFr: "",
          confidence: 0.9,
          analysisProvider: "ciqual-deterministic",
          caloriesCentral: 700,
          caloriesMin: 630,
          caloriesMax: 770,
          macros: {
            proteinG: 30,
            carbsG: 90,
            fatG: 15,
            fiberG: 4,
            sugarG: 8,
            satFatG: 3,
            sodiumMg: 2650,
          },
          micronutrients: {
            ironMg: 1, magnesiumMg: 30, calciumMg: 20, potassiumMg: 200, vitCMg: 2, vitDUg: 2,
          },
          novaGroup: 3,
          glycemicLoad: 28,
          satietyScore: 70,
          healthScore: 70,
          items: [],
          smartClarifier: { oilLevel: "none", appliedOilDeltaKcal: 0, questionFr: "" },
          clinicalSources: [],
          revisions: [],
        },
      ],
      workouts: [],
    });

    const { trend, decoder } = computeWeightTrendAndScaleDecoder(
      [
        { id: "1", dateKey: "2026-11-12", timestamp: "2026-11-12T07:00:00Z", weightKg: 82.5 },
        { id: "2", dateKey: "2026-11-13", timestamp: "2026-11-13T07:00:00Z", weightKg: 82.1 },
        { id: "3", dateKey: "2026-11-14", timestamp: "2026-11-14T07:00:00Z", weightKg: 82.7 },
      ],
      [d1Bal]
    );

    expect(trend).toHaveLength(3);
    expect(decoder?.triggered).toBe(true);
    expect(decoder?.likelyCause).toBe("sodium_water");
    expect(decoder?.headlineFr).toContain("rétention d'eau");
  });
});

describe("analyzeMealDeterministically", () => {
  it("parses French notes and respects portionEatenPct and oil", () => {
    const half = analyzeMealDeterministically({
      userNotes: "150g poulet grillé, 160g riz basmati, brocoli, 1 c.à.s d'huile d'olive",
      mealType: "lunch",
      plateDiameterCm: 26,
      portionEatenPct: 50,
    });
    const full = analyzeMealDeterministically({
      userNotes: "150g poulet grillé, 160g riz basmati, brocoli, 1 c.à.s d'huile d'olive",
      mealType: "lunch",
      plateDiameterCm: 26,
      portionEatenPct: 100,
    });
    expect(full.items.length).toBeGreaterThanOrEqual(3);
    expect(full.caloriesCentral).toBeGreaterThan(half.caloriesCentral * 1.7);
    expect(full.caloriesMin).toBeLessThan(full.caloriesCentral);
    expect(full.caloriesMax).toBeGreaterThan(full.caloriesCentral);
  });
});

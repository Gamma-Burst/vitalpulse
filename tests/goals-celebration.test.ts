import { describe, expect, it } from "vitest";
import {
  evaluateGoalProgress,
  reconcileGoalsAndCelebrations,
} from "../src/lib/goals-celebration-engine";
import { computeDailyEnergyBalance } from "../src/lib/metabolic-engine";
import { CustomChallenge, UserProfile } from "../src/types/vitalpulse";

const TODAY = "2026-11-15";

const BASE_PROFILE: UserProfile = {
  name: "Christophe Mercier",
  age: 42,
  sex: "male",
  heightCm: 178,
  weightKg: 82.0,
  targetWeightKg: 75.0,
  waistCm: 90,
  activityProfile: "active",
  primaryGoal: "fat_loss",
  weeklyPaceKg: -0.4,
  dailyStepGoal: 8500,
  specialMode: "standard",
  quietHours: { start: "22:00", end: "07:00" },
};

function makeContext(overrides?: {
  steps?: number;
  waterMl?: number;
  proteinG?: number;
  weightKg?: number;
  workoutDates?: string[];
  primaryGoal?: UserProfile["primaryGoal"];
}) {
  const profile: UserProfile = {
    ...BASE_PROFILE,
    weightKg: overrides?.weightKg ?? BASE_PROFILE.weightKg,
    primaryGoal: overrides?.primaryGoal ?? BASE_PROFILE.primaryGoal,
  };
  const meals =
    overrides?.proteinG !== undefined
      ? [
          {
            id: "m1",
            createdAt: `${TODAY}T12:30:00.000Z`,
            dateKey: TODAY,
            mealType: "lunch" as const,
            userNotes: "Repas riche en protéines",
            plateDiameterCm: 26,
            portionEatenPct: 100,
            dishTitle: "Assiette protéines",
            summaryFr: "Repas complet",
            confidence: 0.9,
            analysisProvider: "ciqual-deterministic" as const,
            caloriesCentral: 650,
            caloriesMin: 590,
            caloriesMax: 710,
            macros: {
              proteinG: overrides.proteinG,
              carbsG: 40,
              fatG: 18,
              fiberG: 8,
              sugarG: 4,
              satFatG: 4,
              sodiumMg: 450,
            },
            micronutrients: {
              ironMg: 4,
              magnesiumMg: 90,
              calciumMg: 180,
              potassiumMg: 900,
              vitCMg: 40,
              vitDUg: 5,
            },
            novaGroup: 1 as const,
            glycemicLoad: 14,
            satietyScore: 88,
            healthScore: 90,
            items: [],
            smartClarifier: {
              oilLevel: "light_1tbsp" as const,
              appliedOilDeltaKcal: 45,
              questionFr: "",
            },
            clinicalSources: ["Ciqual"],
            revisions: [],
          },
        ]
      : [];

  const workouts = (overrides?.workoutDates ?? []).map((dateKey, idx) => ({
    id: `w-${idx}`,
    dateKey,
    exerciseId: "brisk-walk-20",
    title: "Séance test",
    category: "digestive_walk" as const,
    durationMinutes: 25,
    met: 4.5,
    netCaloriesBurned: 120,
    estimatedStepsOverlap: 2000,
    rpe: 6,
    startedAt: `${dateKey}T10:00:00.000Z`,
  }));

  const weights = [
    {
      id: "wt-latest",
      dateKey: TODAY,
      timestamp: `${TODAY}T07:30:00.000Z`,
      weightKg: profile.weightKg,
    },
  ];

  const todayBalance = computeDailyEnergyBalance({
    dateKey: TODAY,
    profile,
    meals,
    stepLog: {
      dateKey: TODAY,
      steps: overrides?.steps ?? 4000,
      source: "manual",
      updatedAt: `${TODAY}T12:00:00.000Z`,
    },
    workouts,
    waterLog: {
      dateKey: TODAY,
      milliliters: overrides?.waterMl ?? 1000,
    },
  });

  return {
    profile,
    todayKey: TODAY,
    todayBalance,
    meals,
    workouts,
    weights,
    measurements: [],
    fasting: {
      protocolId: "16_8" as const,
      fastHours: 16,
      eatHours: 8,
      activeStartIso: null,
      plannedStartIso: null,
      history: [],
    },
    nowMs: Date.parse(`${TODAY}T18:00:00.000Z`),
  };
}

describe("Mes Objectifs Personnalisés & Notifications d'encouragement", () => {
  it("déclenche une notification personnalisée avec motivation quand un objectif libre est validé, sans doublon au second passage", () => {
    const customGoal: CustomChallenge = {
      id: "chal-nosoda",
      title: "Zéro soda aujourd'hui",
      description: "Remplacer par eau pétillante + citron",
      metric: "custom",
      targetValue: 1,
      unit: "journée",
      durationDays: 14,
      reminderTime: "19:00",
      active: true,
      completedDates: [TODAY],
      createdAt: `${TODAY}T08:00:00.000Z`,
      personalWhy: "Retrouver mon énergie l'après-midi",
      celebrateNotifications: true,
      notifiedKeys: [],
    };

    const ctx = makeContext();
    const first = reconcileGoalsAndCelebrations([customGoal], ctx);
    expect(first.hasStateChanges).toBe(true);
    expect(first.newlyUnlockedEvents).toHaveLength(1);
    expect(first.newlyUnlockedEvents[0].titleFr).toContain("Christophe");
    expect(first.newlyUnlockedEvents[0].titleFr).toContain("Zéro soda aujourd'hui");
    expect(first.newlyUnlockedEvents[0].bodyFr).toContain(
      "Retrouver mon énergie l'après-midi"
    );

    // Idempotence stricte au second passage : aucune alerte répétée ni boucle d'état
    const second = reconcileGoalsAndCelebrations(first.updatedChallenges, ctx);
    expect(second.hasStateChanges).toBe(false);
    expect(second.newlyUnlockedEvents).toHaveLength(0);

    // Si l'utilisateur décoche puis recoche plus tard aujourd'hui, la célébration se réarme
    const unchecked: CustomChallenge = {
      ...first.updatedChallenges[0],
      completedDates: [],
    };
    const reset = reconcileGoalsAndCelebrations([unchecked], ctx);
    expect(reset.hasStateChanges).toBe(true);
    expect(reset.updatedChallenges[0].notifiedKeys).toEqual([]);

    const rechecked: CustomChallenge = {
      ...reset.updatedChallenges[0],
      completedDates: [TODAY],
    };
    const celebratedAgain = reconcileGoalsAndCelebrations([rechecked], ctx);
    expect(celebratedAgain.newlyUnlockedEvents).toHaveLength(1);
  });

  it("valide automatiquement les objectifs de pas, eau, protéines et séances hebdo et enregistre la date du jour", () => {
    const goals: CustomChallenge[] = [
      {
        id: "g-steps",
        title: "Cap 9 000 pas",
        description: "",
        metric: "steps",
        targetValue: 9000,
        unit: "pas",
        durationDays: 14,
        reminderTime: "18:00",
        active: true,
        completedDates: [],
        createdAt: `${TODAY}T08:00:00.000Z`,
      },
      {
        id: "g-water",
        title: "2 200 mL eau",
        description: "",
        metric: "water",
        targetValue: 2200,
        unit: "mL",
        durationDays: 14,
        reminderTime: "18:00",
        active: true,
        completedDates: [],
        createdAt: `${TODAY}T08:00:00.000Z`,
      },
      {
        id: "g-protein",
        title: "120 g protéines",
        description: "",
        metric: "protein",
        targetValue: 120,
        unit: "g",
        durationDays: 14,
        reminderTime: "19:00",
        active: true,
        completedDates: [],
        createdAt: `${TODAY}T08:00:00.000Z`,
      },
      {
        id: "g-week",
        title: "3 séances / semaine",
        description: "",
        metric: "workouts_week",
        targetValue: 3,
        unit: "séances",
        durationDays: 28,
        reminderTime: "19:00",
        active: true,
        completedDates: [],
        createdAt: `${TODAY}T08:00:00.000Z`,
      },
    ];

    const ctx = makeContext({
      steps: 9450,
      waterMl: 2300,
      proteinG: 125,
      workoutDates: ["2026-11-11", "2026-11-13", TODAY],
    });

    const result = reconcileGoalsAndCelebrations(goals, ctx);
    expect(result.hasStateChanges).toBe(true);
    expect(result.newlyUnlockedEvents).toHaveLength(4);
    for (const ch of result.updatedChallenges) {
      expect(ch.completedDates).toContain(TODAY);
    }
    expect(result.evaluationsById["g-steps"].progressPct).toBe(100);
    expect(result.evaluationsById["g-week"].reachedToday).toBe(true);
  });

  it("gère les objectifs de poids cible (perte <= et prise >=) avec progression exacte et badge palier", () => {
    const lossGoal: CustomChallenge = {
      id: "g-weight-loss",
      title: "Descendre à 78 kg",
      description: "",
      metric: "weight_target",
      targetValue: 78,
      startValue: 82,
      direction: "at_most",
      unit: "kg",
      durationDays: 60,
      reminderTime: "08:00",
      active: true,
      completedDates: [],
      createdAt: `${TODAY}T08:00:00.000Z`,
    };

    const halfway = evaluateGoalProgress(lossGoal, makeContext({ weightKg: 80 }));
    expect(halfway.reachedToday).toBe(false);
    expect(halfway.progressPct).toBe(50);

    const reached = reconcileGoalsAndCelebrations(
      [lossGoal],
      makeContext({ weightKg: 77.8 })
    );
    expect(reached.newlyUnlockedEvents).toHaveLength(1);
    expect(reached.newlyUnlockedEvents[0].isMilestone).toBe(true);
    expect(reached.newlyUnlockedEvents[0].badgeFr).toContain("Palier");

    const gainGoal: CustomChallenge = {
      id: "g-weight-gain",
      title: "Monter à 85 kg",
      description: "",
      metric: "weight_target",
      targetValue: 85,
      startValue: 80,
      direction: "at_least",
      unit: "kg",
      durationDays: 60,
      reminderTime: "08:00",
      active: true,
      completedDates: [],
      createdAt: `${TODAY}T08:00:00.000Z`,
      celebrateNotifications: false,
    };

    const gainReached = reconcileGoalsAndCelebrations(
      [gainGoal],
      makeContext({ weightKg: 85.2, primaryGoal: "muscle_gain" })
    );
    expect(gainReached.evaluationsById["g-weight-gain"].reachedToday).toBe(true);
    // Notifications désactivées par l'utilisateur => zéro popup d'encouragement mais progrès enregistré
    expect(gainReached.newlyUnlockedEvents).toHaveLength(0);
  });

  it("célèbre spécialement les séries de 3+ jours et les défis bouclés sur toute leur durée", () => {
    const streakGoal: CustomChallenge = {
      id: "g-streak",
      title: "Hydratation 2 L",
      description: "",
      metric: "water",
      targetValue: 2000,
      unit: "mL",
      durationDays: 14,
      reminderTime: "19:00",
      active: true,
      completedDates: ["2026-11-12", "2026-11-13", "2026-11-14"],
      createdAt: "2026-11-12T08:00:00.000Z",
    };

    const resStreak = reconcileGoalsAndCelebrations(
      [streakGoal],
      makeContext({ waterMl: 2100 })
    );
    expect(resStreak.newlyUnlockedEvents[0].streakDays).toBe(4);
    expect(resStreak.newlyUnlockedEvents[0].titleFr).toContain("série de 4 jours");

    const finalDayGoal: CustomChallenge = {
      id: "g-complete",
      title: "Défi 7 jours pas",
      description: "",
      metric: "steps",
      targetValue: 8000,
      unit: "pas",
      durationDays: 7,
      reminderTime: "19:00",
      active: true,
      completedDates: [
        "2026-11-09",
        "2026-11-10",
        "2026-11-11",
        "2026-11-12",
        "2026-11-13",
        "2026-11-14",
      ],
      createdAt: "2026-11-09T08:00:00.000Z",
    };

    const resDone = reconcileGoalsAndCelebrations(
      [finalDayGoal],
      makeContext({ steps: 8200 })
    );
    expect(resDone.newlyUnlockedEvents[0].badgeFr).toContain("Défi 7 j bouclé");
    expect(resDone.newlyUnlockedEvents[0].titleFr).toContain("accompli sur 7 jours");
  });
});

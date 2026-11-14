import { describe, expect, it } from "vitest";
import {
  computeAnthropometrics,
  computeDailyEnergyBalance,
} from "@/lib/metabolic-engine";
import {
  EXERCISES_COMPENDIUM,
  SPORT_DISCIPLINES_CATALOG,
} from "@/data/exercises-compendium";
import { GLOSSARY_TERMS } from "@/data/glossary-terms";
import {
  activatePlanTier,
  canRunVisionScan,
  canSendFwAiMessage,
  createDefaultSubscriptionState,
  FREE_DAILY_FW_AI_LIMIT,
  FREE_DAILY_VISION_SCAN_LIMIT,
  normalizeSubscriptionForToday,
  recordFwAiMessageUsage,
  recordVisionScanUsage,
  startSevenDayFreeTrial,
} from "@/lib/billing-bridge";
import { buildDeterministicFwAiReply } from "@/lib/fw-ai-engine";
import type { UserProfile, WorkoutSession } from "@/types/vitalpulse";

const athleteProfile: UserProfile = {
  name: "Lucas",
  age: 28,
  sex: "male",
  heightCm: 180,
  weightKg: 76,
  targetWeightKg: 81,
  activityProfile: "active",
  athleticLevel: "intermediate",
  favoriteSports: ["gym_hypertrophy", "football_team", "running_trail"],
  primaryGoal: "muscle_gain",
  weeklyPaceKg: 0.25,
  dailyStepGoal: 9000,
  specialMode: "high_protein_athlete",
  quietHours: { start: "22:30", end: "07:00" },
};

describe("FolloWeight v4.0 — Sports, Prise de masse ISSN, FW AI & Abonnement FW+", () => {
  it("fournit 44 activités et 10 disciplines sportives sans double comptage sur la musculation", () => {
    expect(EXERCISES_COMPENDIUM.length).toBe(44);
    expect(SPORT_DISCIPLINES_CATALOG.length).toBe(10);

    const bench = EXERCISES_COMPENDIUM.find((e) => e.id === "gym-push-hypertrophy");
    const run = EXERCISES_COMPENDIUM.find((e) => e.id === "run-endurance-10kmh");
    expect(bench).toBeDefined();
    expect(bench?.stepsPerMinuteOverlap).toBeLessThanOrEqual(10);
    expect(run).toBeDefined();
    expect(run?.stepsPerMinuteOverlap).toBeGreaterThanOrEqual(150);
  });

  it("calibre muscle_gain (Lean Bulk ISSN) et ravitaillement dynamique sportRefuelKcal", () => {
    const anthro = computeAnthropometrics(athleteProfile);
    expect(anthro.targetIntakeKcal).toBeGreaterThan(anthro.estimatedMaintenanceKcal);
    expect(anthro.targets.proteinG).toBeGreaterThanOrEqual(140);
    expect(anthro.perMealProteinBolusG).toBeGreaterThanOrEqual(30);
    expect(anthro.workoutRefuelEligible).toBe(true);
    expect(anthro.targets.waterMl).toBeLessThanOrEqual(3500);

    const workout: WorkoutSession = {
      id: "wk-1",
      dateKey: "2026-11-15",
      exerciseId: "gym-push-hypertrophy",
      title: "Musculation Push : Pectoraux, Épaules & Triceps",
      category: "gym_hypertrophy",
      durationMinutes: 60,
      met: 5.5,
      netCaloriesBurned: 340,
      estimatedStepsOverlap: 0,
      rpe: 8,
      setsCount: 16,
      repsPerSet: 10,
      loadKg: 70,
      intensityLabel: "Soutenue",
      startedAt: "2026-11-15T18:00:00.000Z",
    };

    const balance = computeDailyEnergyBalance({
      dateKey: "2026-11-15",
      profile: athleteProfile,
      meals: [],
      stepLog: {
        dateKey: "2026-11-15",
        steps: 8000,
        source: "manual",
        updatedAt: "2026-11-15T18:00:00.000Z",
      },
      workouts: [workout],
      waterLog: {
        dateKey: "2026-11-15",
        milliliters: 2000,
      },
    });

    expect(balance.sportRefuelKcal).toBe(340);
    expect(balance.targetIntakeKcal).toBe(anthro.targetIntakeKcal + 340);
    expect(balance.targetIntakeKcal).toBeLessThanOrEqual(5500);
  });

  it("préserve fat_loss sans ravitaillement dynamique (non-régression)", () => {
    const fatLossProfile: UserProfile = {
      ...athleteProfile,
      primaryGoal: "fat_loss",
      specialMode: "standard",
      weeklyPaceKg: -0.45,
      targetWeightKg: 72,
    };
    const anthro = computeAnthropometrics(fatLossProfile);
    expect(anthro.workoutRefuelEligible).toBe(false);

    const workout: WorkoutSession = {
      id: "wk-2",
      dateKey: "2026-11-15",
      exerciseId: "football-match-five",
      title: "Football",
      category: "team_racket_combat",
      durationMinutes: 45,
      met: 8.5,
      netCaloriesBurned: 400,
      estimatedStepsOverlap: 4000,
      rpe: 8,
      startedAt: "2026-11-15T19:00:00.000Z",
    };

    const balance = computeDailyEnergyBalance({
      dateKey: "2026-11-15",
      profile: fatLossProfile,
      meals: [],
      stepLog: {
        dateKey: "2026-11-15",
        steps: 9000,
        source: "manual",
        updatedAt: "2026-11-15T19:00:00.000Z",
      },
      workouts: [workout],
      waterLog: {
        dateKey: "2026-11-15",
        milliliters: 1800,
      },
    });

    expect(balance.sportRefuelKcal).toBe(0);
    expect(balance.targetIntakeKcal).toBe(anthro.targetIntakeKcal);
  });

  it("inclut les nouveaux termes sport/hypertrophie dans le lexique", () => {
    expect(GLOSSARY_TERMS.lean_bulk).toBeDefined();
    expect(GLOSSARY_TERMS.leucine_threshold).toBeDefined();
    expect(GLOSSARY_TERMS.athletic_refuel).toBeDefined();
  });

  it("gère les quotas gratuits FW AI / Vision, le reset minuit et l'essai FW+ 7 jours", () => {
    let sub = createDefaultSubscriptionState("2026-11-15");
    expect(canSendFwAiMessage(sub, "2026-11-15").remainingToday).toBe(FREE_DAILY_FW_AI_LIMIT);
    expect(canRunVisionScan(sub, "2026-11-15").remainingToday).toBe(FREE_DAILY_VISION_SCAN_LIMIT);

    for (let i = 0; i < FREE_DAILY_FW_AI_LIMIT; i++) {
      sub = recordFwAiMessageUsage(sub, "2026-11-15");
    }
    expect(canSendFwAiMessage(sub, "2026-11-15").allowed).toBe(false);

    // Changement de journée -> remise à zéro automatique à minuit
    const nextDay = normalizeSubscriptionForToday(sub, "2026-11-16");
    expect(nextDay.fwAiMessagesUsedToday).toBe(0);
    expect(canSendFwAiMessage(nextDay, "2026-11-16").allowed).toBe(true);

    // Essai 7 jours débloque FW+ (jusqu'au plafond soft)
    const trial = startSevenDayFreeTrial(sub, "2026-11-15", 1_700_000_000_000);
    expect(canSendFwAiMessage(trial, "2026-11-15", 1_700_000_100_000).isPlus).toBe(true);

    // Pass fondateur Web
    const founder = activatePlanTier(sub, "founder_lifetime", "2026-11-15", "web_followeight");
    expect(canRunVisionScan(founder, "2026-11-15").isPlus).toBe(true);
    const scanned = recordVisionScanUsage(founder, "2026-11-15");
    expect(scanned.visionScansUsedToday).toBe(1);
  });

  it("applique les garde-fous cliniques stricts de FW AI (urgence & mineur)", () => {
    const emergency = buildDeterministicFwAiReply({
      question: "J'ai une grosse douleur thoracique depuis 10 minutes",
    });
    expect(emergency.safetyGuardTriggered).toBe(true);
    expect(emergency.replyFr).toContain("15");

    const minor = buildDeterministicFwAiReply({
      question: "Je veux faire un jeûne OMAD pour maigrir vite",
      context: {
        profile: {
          age: 15,
          sex: "male",
          weightKg: 60,
          targetWeightKg: 55,
          primaryGoal: "fat_loss",
          specialMode: "standard",
        },
        anthro: {
          bmi: 20.5,
          targetIntakeKcal: 2100,
          clinicalFloorKcal: 1800,
          estimatedMaintenanceKcal: 2100,
          perMealProteinBolusG: 30,
          minorSafetyLock: true,
          targets: {
            proteinG: 90,
            carbsG: 260,
            fatG: 70,
            fiberG: 28,
            waterMl: 2000,
            sodiumMaxMg: 2000,
          },
        },
        todayBalance: {
          intakeKcal: 1200,
          targetIntakeKcal: 2100,
          sportRefuelKcal: 0,
          remainingToTargetKcal: 900,
          activeCaloriesKcal: 180,
          workoutMinutes: 20,
          rawSteps: 5000,
          waterMl: 1200,
          macros: { proteinG: 55, carbsG: 140, fatG: 38, fiberG: 14, sodiumMg: 900 },
        },
      },
    });
    expect(minor.safetyGuardTriggered).toBe(true);
    expect(minor.replyFr).toContain("18 ans");
  });
});

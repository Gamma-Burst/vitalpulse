import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { analyzeMealDeterministically } from "@/data/ciqual-reference";
import {
  computeAnthropometrics,
  computeBmrDeficitBreakdown,
  computeDailyEnergyBalance,
  computeHenryOxfordBmr,
} from "@/lib/metabolic-engine";
import { GLOSSARY_TERMS } from "@/data/glossary-terms";
import { POST as analyzeMealPost } from "@/app/api/analyze-meal/route";
import { MealEntry, UserProfile } from "@/types/vitalpulse";

const sampleProfile: UserProfile = {
  name: "Test",
  age: 35,
  sex: "male",
  heightCm: 178,
  weightKg: 82,
  targetWeightKg: 76,
  waistCm: 86,
  activityProfile: "active",
  primaryGoal: "fat_loss",
  weeklyPaceKg: -0.5,
  dailyStepGoal: 8500,
  specialMode: "standard",
  quietHours: { start: "22:00", end: "07:30" },
};

describe("Written free meal estimation (Ciqual & API)", () => {
  it("parses 'deux oeuf dur et des bacon en morceau' accurately with realistic calories", () => {
    const res = analyzeMealDeterministically({
      userNotes: "deux oeuf dur et des bacon en morceau",
      mealType: "breakfast",
      plateDiameterCm: 26,
      portionEatenPct: 100,
    });

    const ids = res.items.map((it) => it.ciqualMatch);
    expect(ids).toContain("ciq-oeuf");
    expect(ids).toContain("ciq-bacon");
    expect(ids).not.toContain("ciq-plat-prepare-generique");

    const eggItem = res.items.find((it) => it.ciqualMatch === "ciq-oeuf");
    const baconItem = res.items.find((it) => it.ciqualMatch === "ciq-bacon");
    expect(eggItem?.grams).toBe(110); // 2 * 55 g
    expect(baconItem?.grams).toBe(45);

    expect(res.caloriesCentral).toBeGreaterThanOrEqual(210);
    expect(res.caloriesCentral).toBeLessThanOrEqual(330);
    expect(res.caloriesMin).toBeLessThan(res.caloriesCentral);
    expect(res.caloriesMax).toBeGreaterThan(res.caloriesCentral);
    expect(res.macros.proteinG).toBeGreaterThanOrEqual(18);
  });

  it("avoids false double matches ('pomme de terre' vs 'pomme', 'filet de bacon' vs 'bacon')", () => {
    const res = analyzeMealDeterministically({
      userNotes: "filet de bacon maigre, pomme de terre 180g, haricots verts",
      mealType: "dinner",
      plateDiameterCm: 26,
      portionEatenPct: 100,
    });
    const ids = res.items.map((it) => it.ciqualMatch);
    expect(ids).toContain("ciq-filet-bacon-maigre");
    expect(ids).not.toContain("ciq-bacon");
    expect(ids).toContain("ciq-pomme-terre");
    expect(ids).not.toContain("ciq-pomme");
    expect(ids).toContain("ciq-haricots-verts");
  });

  it("supports French counts and household units without image", () => {
    const res = analyzeMealDeterministically({
      userNotes: "3 oeufs au plat et 2 tranches de pain complet",
      mealType: "breakfast",
      plateDiameterCm: 26,
      portionEatenPct: 100,
    });
    const egg = res.items.find((it) => it.ciqualMatch === "ciq-oeuf");
    const bread = res.items.find((it) => it.ciqualMatch === "ciq-pain-complet");
    expect(egg?.grams).toBe(165);
    expect(bread?.grams).toBe(80);
  });

  it("never gates written meal analysis on Vision quota in /api/analyze-meal", async () => {
    const req = new NextRequest("https://followeight.com/api/analyze-meal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entryMode: "text",
        userNotes: "deux oeuf dur et des bacon en morceau",
        mealType: "breakfast",
        plateDiameterCm: 26,
        portionEatenPct: 100,
        allowVisionAi: false,
      }),
    });
    const res = await analyzeMealPost(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(["ciqual-deterministic", "openai-text"]).toContain(json.analysisProvider);
    expect(json.caloriesCentral).toBeGreaterThanOrEqual(180);
    expect(json.caloriesCentral).toBeLessThanOrEqual(420);
  });
});

describe("BMR & scientific deficit breakdown (EFSA / Mifflin-St Jeor / ANSES / NIH)", () => {
  it("computes Henry/Oxford EFSA BMR close to Mifflin-St Jeor across profiles", () => {
    const anthro = computeAnthropometrics(sampleProfile);
    const henry = computeHenryOxfordBmr("male", 82, 178, 35);
    expect(anthro.bmrHenryKcal).toBe(henry);
    expect(Math.abs(anthro.bmrKcal - henry)).toBeLessThan(120);
    expect(anthro.sources.some((s) => s.includes("EFSA"))).toBe(true);
    expect(anthro.sources.some((s) => s.includes("NIH"))).toBe(true);
  });

  it("classifies healthy above-BMR deficit vs sub-BMR intake properly", () => {
    const optimal = computeBmrDeficitBreakdown({
      bmrKcal: 1750,
      totalExpenditureKcal: 2450,
      intakeKcal: 1950,
    });
    expect(optimal.zoneId).toBe("sweet_spot_deficit");
    expect(optimal.balanceVsBmrKcal).toBe(200);
    expect(optimal.netDeficitTotalKcal).toBe(-500);
    expect(optimal.bmrSharePct).toBe(71);
    expect(optimal.palObserved).toBe(1.4);

    const subBmr = computeBmrDeficitBreakdown({
      bmrKcal: 1750,
      totalExpenditureKcal: 2450,
      intakeKcal: 1200,
    });
    expect(subBmr.zoneId).toBe("below_bmr");
    expect(subBmr.balanceVsBmrKcal).toBe(-550);
    expect(subBmr.netDeficitTotalKcal).toBe(-1250);
  });

  it("populates optional BMR gap & activity breakdown on computeDailyEnergyBalance", () => {
    const anthro = computeAnthropometrics(sampleProfile);
    const mockMeal: MealEntry = {
      id: "m1",
      createdAt: "2026-11-15T08:00:00Z",
      dateKey: "2026-11-15",
      mealType: "breakfast",
      userNotes: "deux oeuf dur et des bacon en morceau",
      plateDiameterCm: 26,
      portionEatenPct: 100,
      dishTitle: "Œuf · Bacon",
      summaryFr: "test",
      confidence: 0.85,
      analysisProvider: "ciqual-deterministic",
      caloriesCentral: 1850,
      caloriesMin: 1700,
      caloriesMax: 2000,
      macros: { proteinG: 110, carbsG: 160, fatG: 75, fiberG: 20, sugarG: 15, satFatG: 18, sodiumMg: 1200 },
      micronutrients: { ironMg: 8, magnesiumMg: 200, calciumMg: 500, potassiumMg: 2000, vitCMg: 50, vitDUg: 4 },
      novaGroup: 2,
      glycemicLoad: 12,
      satietyScore: 80,
      healthScore: 82,
      items: [],
      smartClarifier: { oilLevel: "none", appliedOilDeltaKcal: 0, questionFr: "" },
      clinicalSources: [],
      revisions: [],
    };
    const bal = computeDailyEnergyBalance({
      dateKey: "2026-11-15",
      profile: sampleProfile,
      stepLog: {
        dateKey: "2026-11-15",
        steps: 8000,
        source: "manual",
        updatedAt: "2026-11-15T18:00:00Z",
      },
      meals: [mockMeal],
      workouts: [],
    });
    expect(bal.bmrKcal).toBe(anthro.bmrKcal);
    expect(bal.activityAboveBmrKcal).toBe(bal.totalExpenditureKcal - bal.bmrKcal);
    expect(bal.balanceVsBmrKcal).toBe(bal.intakeKcal - bal.bmrKcal);
    expect(bal.bmrSharePct).toBeGreaterThan(50);
    expect(GLOSSARY_TERMS.bmr.simpleFr).toContain("EFSA");
    expect(GLOSSARY_TERMS.net_balance.simpleFr).toContain("Métabolisme de base");
  });
});

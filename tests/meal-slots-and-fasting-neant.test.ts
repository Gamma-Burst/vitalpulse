import { describe, expect, it } from "vitest";
import { analyzeMealDeterministically } from "@/data/ciqual-reference";
import {
  getDefaultActiveMealSlot,
  getFastingMealSlotStatuses,
} from "@/lib/fasting-engine";
import { FastingConfig } from "@/types/vitalpulse";

function makeConfig(
  protocolId: FastingConfig["protocolId"],
  fastHours: number,
  eatHours: number,
  eatingWindowStartHm?: string
): FastingConfig {
  return {
    protocolId,
    fastHours,
    eatHours,
    eatingWindowStartHm,
    dailyScheduleEnabled: protocolId !== "none",
    activeStartIso: null,
    plannedStartIso: null,
    history: [],
  };
}

describe("Fasting-aware meal slots ('Néant' on skipped meals)", () => {
  it("marks breakfast as Néant in standard 16:8 (12:00–20:00) and defaults open slot to lunch", () => {
    const cfg = makeConfig("16_8", 16, 8, "12:00");
    const statuses = getFastingMealSlotStatuses(cfg);

    expect(statuses.breakfast.isFastedSlot).toBe(true);
    expect(statuses.breakfast.pillBadgeFr).toContain("Néant");
    expect(statuses.breakfast.reasonFr).toContain("16:8");
    expect(statuses.breakfast.reasonFr).toContain("0 kcal");
    expect(statuses.lunch.isFastedSlot).toBe(false);
    expect(statuses.snack.isFastedSlot).toBe(false);
    expect(statuses.dinner.isFastedSlot).toBe(false);

    const morningMs = new Date(2026, 10, 15, 9, 0, 0).getTime();
    expect(getDefaultActiveMealSlot(cfg, undefined, morningMs)).toBe("lunch");
  });

  it("marks dinner as Néant when 16:8 starts early at 08:00 (08:00–16:00)", () => {
    const cfg = makeConfig("16_8", 16, 8, "08:00");
    const statuses = getFastingMealSlotStatuses(cfg);

    expect(statuses.breakfast.isFastedSlot).toBe(false);
    expect(statuses.lunch.isFastedSlot).toBe(false);
    expect(statuses.snack.isFastedSlot).toBe(false);
    expect(statuses.dinner.isFastedSlot).toBe(true);
  });

  it("marks breakfast and lunch as Néant in 20:4 (17:00–21:00)", () => {
    const cfg = makeConfig("20_4", 20, 4, "17:00");
    const statuses = getFastingMealSlotStatuses(cfg);

    expect(statuses.breakfast.isFastedSlot).toBe(true);
    expect(statuses.lunch.isFastedSlot).toBe(true);
    expect(statuses.snack.isFastedSlot).toBe(false);
    expect(statuses.dinner.isFastedSlot).toBe(false);
  });

  it("keeps only dinner open in OMAD 23:1 (19:00–20:00)", () => {
    const cfg = makeConfig("omad_23_1", 23, 1, "19:00");
    const statuses = getFastingMealSlotStatuses(cfg);

    expect(statuses.breakfast.isFastedSlot).toBe(true);
    expect(statuses.lunch.isFastedSlot).toBe(true);
    expect(statuses.snack.isFastedSlot).toBe(true);
    expect(statuses.dinner.isFastedSlot).toBe(false);
    expect(getDefaultActiveMealSlot(cfg, undefined, new Date(2026, 10, 15, 13, 0, 0).getTime())).toBe(
      "dinner"
    );
  });

  it("leaves all slots open when protocolId is none and falls back to preferredFasting if configured", () => {
    const noneStatuses = getFastingMealSlotStatuses(makeConfig("none", 0, 24));
    expect(Object.values(noneStatuses).every((s) => !s.isFastedSlot)).toBe(true);

    const fallbackStatuses = getFastingMealSlotStatuses(undefined, "16_8");
    expect(fallbackStatuses.breakfast.isFastedSlot).toBe(true);
    expect(fallbackStatuses.lunch.isFastedSlot).toBe(false);
  });
});

describe("Belgian/French written foods from user video", () => {
  it("parses '1 tartine demi gris' + '4 tranches de salami à l'ail' without matching onion/garlic", () => {
    const res = analyzeMealDeterministically({
      userNotes: "1 tartine demi gris\n4 tranches de salami à l'ail",
      mealType: "lunch",
      plateDiameterCm: 26,
      portionEatenPct: 100,
    });

    const ids = res.items.map((it) => it.ciqualMatch);
    expect(ids).toContain("ciq-pain-gris");
    expect(ids).toContain("ciq-salami-saucisson");
    expect(ids).not.toContain("ciq-oignon");
    expect(ids).not.toContain("ciq-plat-prepare-generique");

    const bread = res.items.find((it) => it.ciqualMatch === "ciq-pain-gris");
    const salami = res.items.find((it) => it.ciqualMatch === "ciq-salami-saucisson");
    expect(bread?.grams).toBe(35);
    expect(salami?.grams).toBe(60);
    expect(res.caloriesCentral).toBeGreaterThanOrEqual(250);
    expect(res.caloriesCentral).toBeLessThanOrEqual(320);
  });
});

import { describe, expect, it } from "vitest";
import {
  buildNormalizedBase100Series,
  computeBodyComposition,
  computeNavyBodyFatPct,
} from "@/lib/body-composition";
import {
  convertBloodMarkerToCanonical,
  evaluateBloodPanelDeterministically,
  parseFrenchBloodReportText,
} from "@/lib/blood-panel-engine";
import { buildFreshUserState, migrateVitalPulseState } from "@/lib/storage-db";
import type { BodyMeasurementEntry, UserProfile } from "@/types/vitalpulse";

const MALE_PROFILE: UserProfile = {
  name: "Marc",
  age: 40,
  sex: "male",
  heightCm: 178,
  weightKg: 82,
  targetWeightKg: 76,
  waistCm: 92,
  activityProfile: "active",
  primaryGoal: "fat_loss",
  weeklyPaceKg: -0.4,
  dailyStepGoal: 8500,
  specialMode: "standard",
  quietHours: { start: "22:30", end: "07:00" },
  isDemoProfile: false,
};

const FEMALE_PROFILE: UserProfile = {
  ...MALE_PROFILE,
  name: "Claire",
  age: 36,
  sex: "female",
  heightCm: 165,
  weightKg: 66,
  targetWeightKg: 62,
  waistCm: 78,
};

describe("Body composition & anthropometric measurements", () => {
  it("computes US Navy body fat % accurately for male and female and rejects invalid geometry", () => {
    const maleBf = computeNavyBodyFatPct({
      sex: "male",
      heightCm: 178,
      waistCm: 90,
      neckCm: 39,
    });
    expect(maleBf).not.toBeNull();
    expect(maleBf!).toBeGreaterThan(14);
    expect(maleBf!).toBeLessThan(26);

    const femaleBf = computeNavyBodyFatPct({
      sex: FEMALE_PROFILE.sex,
      heightCm: FEMALE_PROFILE.heightCm,
      waistCm: 76,
      hipsCm: 98,
      neckCm: 33,
    });
    expect(femaleBf).not.toBeNull();
    expect(femaleBf!).toBeGreaterThan(18);
    expect(femaleBf!).toBeLessThan(32);

    const invalidMale = computeNavyBodyFatPct({
      sex: "male",
      heightCm: 178,
      waistCm: 42,
      neckCm: 45,
    });
    expect(invalidMale).toBeNull();
  });

  it("detects body recomposition when weight is stable and waist shrinks >= 1.5 cm, and computes cm lost & Base 100 series", () => {
    const entries: BodyMeasurementEntry[] = [
      {
        id: "m1",
        dateKey: "2026-10-01",
        createdAt: "2026-10-01T08:00:00.000Z",
        weightKg: 82.0,
        neckCm: 39,
        chestCm: 102,
        waistCm: 94.0,
        hipsCm: 101.0,
        armCm: 35.0,
        thighCm: 58.0,
        calfCm: 38.0,
      },
      {
        id: "m2",
        dateKey: "2026-10-29",
        createdAt: "2026-10-29T08:00:00.000Z",
        weightKg: 81.6,
        neckCm: 39,
        chestCm: 101.5,
        waistCm: 91.5,
        hipsCm: 99.5,
        armCm: 35.2,
        thighCm: 57.5,
        calfCm: 38.0,
      },
    ];

    const summary = computeBodyComposition({
      profile: MALE_PROFILE,
      measurements: entries,
    });

    expect(summary.recompositionDetected).toBe(true);
    expect(summary.recompositionBannerFr).toContain("Recomposition");
    expect(summary.totalCmLostFromStart).toBeCloseTo(4.8, 1);
    expect(summary.whr).not.toBeNull();
    expect(summary.wthr).not.toBeNull();

    const series = buildNormalizedBase100Series(entries, MALE_PROFILE);
    expect(series).toHaveLength(2);
    expect(series[0].weightIdx).toBe(100);
    expect(series[0].waistIdx).toBe(100);
    expect(series[0].bodyFatIdx).toBe(100);
    expect(series[1].waistIdx!).toBeLessThan(100);
    expect(series[1].bodyFatIdx!).toBeLessThan(100);
  });
});

describe("Blood panel conversions, parser & clinical evaluation", () => {
  it("converts SI / US / FR units accurately into French canonical units", () => {
    const glu = convertBloodMarkerToCanonical("fastingGlucose", 5.551, "mmol/L");
    expect(glu.unit).toBe("g/L");
    expect(glu.value).toBeCloseTo(1.0, 2);

    const gluMg = convertBloodMarkerToCanonical("fastingGlucose", 90, "mg/dL");
    expect(gluMg.unit).toBe("g/L");
    expect(gluMg.value).toBeCloseTo(0.9, 2);

    const chol = convertBloodMarkerToCanonical("ldlCholesterol", 2.586, "mmol/L");
    expect(chol.unit).toBe("g/L");
    expect(chol.value).toBeCloseTo(1.0, 2);

    const tg = convertBloodMarkerToCanonical("triglycerides", 1.129, "mmol/L");
    expect(tg.unit).toBe("g/L");
    expect(tg.value).toBeCloseTo(1.0, 2);

    const creat = convertBloodMarkerToCanonical("creatinine", 88.4, "µmol/L");
    expect(creat.unit).toBe("mg/L");
    expect(creat.value).toBeCloseTo(10.0, 1);

    const hba1c = convertBloodMarkerToCanonical("hba1c", 39, "mmol/mol");
    expect(hba1c.unit).toBe("%");
    expect(hba1c.value).toBeCloseTo(5.72, 1);
  });

  it("parses French lab report text with decimal commas and units", () => {
    const raw =
      "Glycémie à jeun : 0,94 g/L ; HbA1c 5,4 % ; LDL 1,15 g/L ; Triglycérides 1,10 g/L ; Créatinine 9,0 mg/L ; ALAT 24 UI/L ; ASAT 22 UI/L ; Plaquettes 250 G/L";
    const parsed = parseFrenchBloodReportText(raw);
    expect(parsed.length).toBeGreaterThanOrEqual(8);

    const map = new Map(parsed.map((m) => [m.key, m]));
    expect(map.get("fastingGlucose")?.rawValue).toBeCloseTo(0.94, 2);
    expect(map.get("hba1c")?.rawValue).toBeCloseTo(5.4, 1);
    expect(map.get("ldlCholesterol")?.rawValue).toBeCloseTo(1.15, 2);
    expect(map.get("creatinine")?.rawValue).toBeCloseTo(9.0, 1);
    expect(map.get("platelets")?.rawValue).toBe(250);
  });

  it("computes HOMA-IR, CKD-EPI 2021, FIB-4 and triggers KDIGO renal guard below eGFR 60", () => {
    const analysis = evaluateBloodPanelDeterministically({
      age: 62,
      sex: "female",
      context: { fasting: true, pregnant: false },
      markers: [
        { key: "fastingGlucose", rawValue: 1.0, unit: "g/L" },
        { key: "fastingInsulin", rawValue: 12, unit: "mUI/L" },
        { key: "hdlCholesterol", rawValue: 0.55, unit: "g/L" },
        { key: "triglycerides", rawValue: 1.4, unit: "g/L" },
        { key: "creatinine", rawValue: 15.0, unit: "mg/L" },
        { key: "alat", rawValue: 24, unit: "UI/L" },
        { key: "asat", rawValue: 26, unit: "UI/L" },
        { key: "platelets", rawValue: 220, unit: "G/L" },
      ],
    });

    const homa = analysis.derivedMetrics.find((d) => d.id === "homa_ir");
    const egfr = analysis.derivedMetrics.find((d) => d.id === "egfr_ckdepi_2021");
    const fib4 = analysis.derivedMetrics.find((d) => d.id === "fib4");

    expect(homa).toBeDefined();
    expect(homa!.value).toBeGreaterThan(2.5);
    expect(egfr).toBeDefined();
    expect(egfr!.value).toBeLessThan(60);
    expect(analysis.renalProteinGuardTriggered).toBe(true);
    expect(fib4).toBeDefined();
  });

  it("enforces non-fasting guard, detects critical flags, and locks automation during pregnancy", () => {
    const nonFasting = evaluateBloodPanelDeterministically({
      age: 40,
      sex: "male",
      context: { fasting: false, pregnant: false },
      markers: [
        { key: "triglycerides", rawValue: 2.3, unit: "g/L" },
        { key: "fastingGlucose", rawValue: 1.15, unit: "g/L" },
      ],
    });

    expect(
      nonFasting.evaluatedMarkers.every((m) => m.status === "uninterpretable_non_fasting")
    ).toBe(true);
    expect(nonFasting.derivedMetrics.some((d) => d.id === "tg_hdl_ratio")).toBe(false);

    const criticalPanel = evaluateBloodPanelDeterministically({
      age: 45,
      sex: "male",
      context: { fasting: true, pregnant: false },
      markers: [
        { key: "platelets", rawValue: 38, unit: "G/L" },
        { key: "hemoglobin", rawValue: 7.4, unit: "g/dL" },
        { key: "creatinine", rawValue: 35, unit: "mg/L" },
      ],
    });
    expect(criticalPanel.criticalFlags.length).toBeGreaterThanOrEqual(2);
    expect(criticalPanel.evaluatedMarkers.some((m) => m.status === "critical")).toBe(true);

    const pregnancyPanel = evaluateBloodPanelDeterministically({
      age: 30,
      sex: "female",
      context: { fasting: true, pregnant: true },
      markers: [
        { key: "ferritin", rawValue: 18, unit: "ng/mL" },
        { key: "hemoglobin", rawValue: 11.1, unit: "g/dL" },
      ],
    });
    expect(pregnancyPanel.summaryFr).toContain("grossesse");
    expect(pregnancyPanel.derivedMetrics).toHaveLength(0);
    expect(pregnancyPanel.criticalFlags).toHaveLength(0);
  });
});

describe("VitalPulse storage migration v1 -> v2", () => {
  it("migrates a v1 state cleanly and stays idempotent", () => {
    const base = buildFreshUserState(MALE_PROFILE);
    const legacy = {
      ...base,
      measurements: undefined,
      bloodPanels: undefined,
      bodyPhotoMetas: undefined,
    } as unknown as Parameters<typeof migrateVitalPulseState>[0];

    const v2Once = migrateVitalPulseState(legacy);
    expect(Array.isArray(v2Once.measurements)).toBe(true);
    expect(Array.isArray(v2Once.bloodPanels)).toBe(true);
    expect(Array.isArray(v2Once.bodyPhotoMetas)).toBe(true);

    const v2Twice = migrateVitalPulseState(v2Once);
    expect(v2Twice).toEqual(v2Once);
  });
});

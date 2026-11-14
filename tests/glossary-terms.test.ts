import { describe, expect, it } from "vitest";
import { BIOMARKER_CATALOG } from "@/lib/blood-panel-engine";
import { FASTING_PHASES } from "@/lib/fasting-engine";
import {
  GLOSSARY_TERMS,
  getGlossaryEntry,
  resolveBloodGlossaryId,
  resolveFastingPhaseGlossaryId,
  searchGlossaryTerms,
} from "@/data/glossary-terms";

describe("Lexique Santé VitalPulse (v3.2 — Bulles ? sans jargon)", () => {
  it("contient au moins 55 définitions vulgarisées complètes avec exemple et repère", () => {
    const entries = Object.values(GLOSSARY_TERMS);
    expect(entries.length).toBeGreaterThanOrEqual(55);

    for (const entry of entries) {
      expect(entry.titleFr.trim().length).toBeGreaterThanOrEqual(3);
      expect(entry.shortTagFr.trim().length).toBeGreaterThanOrEqual(3);
      expect(entry.simpleFr.trim().length).toBeGreaterThanOrEqual(35);
      expect(entry.exampleFr.trim().length).toBeGreaterThanOrEqual(25);
      expect(entry.benchmarkFr.trim().length).toBeGreaterThanOrEqual(20);
      expect(entry.keywords.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("explique clairement le poids lissé EMA cité en exemple par l'utilisateur", () => {
    const ema = getGlossaryEntry("weight_ema");
    expect(ema.titleFr).toContain("Poids lissé EMA");
    expect(ema.simpleFr.toLowerCase()).toContain("eau");
    expect(ema.exampleFr.length).toBeGreaterThan(30);
  });

  it("recherche instantanément sans tenir compte des accents ni de la casse", () => {
    const emaResults = searchGlossaryTerms("ema");
    expect(emaResults[0]?.id).toBe("weight_ema");

    const plainResults = searchGlossaryTerms("poids lisse");
    expect(plainResults[0]?.id).toBe("weight_ema");

    const ketoResults = searchGlossaryTerms("cetogene");
    expect(ketoResults.some((item) => item.id === "diet_ketogenic")).toBe(true);

    const omadFiltered = searchGlossaryTerms("omad", "jeune_metabolisme");
    expect(omadFiltered.some((item) => item.id === "fasting_omad")).toBe(true);
  });

  it("couvre 100 % des 20 biomarqueurs de BIOMARKER_CATALOG et des 5 ratios dérivés", () => {
    const biomarkerKeys = Object.keys(BIOMARKER_CATALOG);
    expect(biomarkerKeys.length).toBe(20);

    for (const key of biomarkerKeys) {
      const id = resolveBloodGlossaryId(key);
      expect(id).not.toBeNull();
      expect(GLOSSARY_TERMS[id!]).toBeDefined();
    }

    const derivedIds = ["homa_ir", "non_hdl", "tg_hdl_ratio", "egfr_ckdepi_2021", "fib4"];
    for (const dId of derivedIds) {
      const id = resolveBloodGlossaryId(dId);
      expect(id).not.toBeNull();
      expect(GLOSSARY_TERMS[id!]).toBeDefined();
    }
  });

  it("couvre 100 % des 6 phases physiologiques du jeûne", () => {
    expect(FASTING_PHASES.length).toBe(6);
    for (const phase of FASTING_PHASES) {
      const id = resolveFastingPhaseGlossaryId(phase.id);
      expect(GLOSSARY_TERMS[id]).toBeDefined();
    }
  });
});

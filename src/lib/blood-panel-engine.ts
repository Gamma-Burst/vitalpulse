import {
  BloodBiomarkerKey,
  BloodDerivedMetric,
  BloodMarkerEvaluation,
  BloodMarkerInput,
  BloodMarkerStatus,
  BloodPanelAnalysis,
  BloodPanelContext,
  Sex,
} from "@/types/vitalpulse";

export interface BiomarkerDefinition {
  key: BloodBiomarkerKey;
  labelFr: string;
  category: "glycemie" | "lipides" | "foie_rein" | "statut_global";
  canonicalUnit: string;
  supportedUnits: string[];
  fastingSensitive?: boolean;
  refRangeLabel: (sex: Sex) => string;
  optimalRangeLabel: string;
  sourceRef: string;
}

export const BIOMARKER_CATALOG: Record<BloodBiomarkerKey, BiomarkerDefinition> = {
  fastingGlucose: {
    key: "fastingGlucose",
    labelFr: "Glycémie à jeun",
    category: "glycemie",
    canonicalUnit: "g/L",
    supportedUnits: ["g/L", "mmol/L", "mg/dL"],
    fastingSensitive: true,
    refRangeLabel: () => "0,70 – 1,09 g/L (3,9 – 6,1 mmol/L)",
    optimalRangeLabel: "0,75 – 0,94 g/L",
    sourceRef: "ADA Standards of Care 2025 / HAS Diabète",
  },
  hba1c: {
    key: "hba1c",
    labelFr: "Hémoglobine glyquée (HbA1c)",
    category: "glycemie",
    canonicalUnit: "%",
    supportedUnits: ["%", "mmol/mol"],
    refRangeLabel: () => "< 5,7 % (39 mmol/mol)",
    optimalRangeLabel: "4,8 – 5,4 %",
    sourceRef: "ADA / HAS — Prévention métabolique",
  },
  fastingInsulin: {
    key: "fastingInsulin",
    labelFr: "Insulinémie à jeun",
    category: "glycemie",
    canonicalUnit: "mUI/L",
    supportedUnits: ["mUI/L", "µUI/mL", "pmol/L"],
    fastingSensitive: true,
    refRangeLabel: () => "2,6 – 24,9 mUI/L",
    optimalRangeLabel: "3 – 8 mUI/L",
    sourceRef: "Matthews et al. (HOMA-IR) / Santé Métabolique",
  },
  totalCholesterol: {
    key: "totalCholesterol",
    labelFr: "Cholestérol total",
    category: "lipides",
    canonicalUnit: "g/L",
    supportedUnits: ["g/L", "mmol/L", "mg/dL"],
    refRangeLabel: () => "< 2,00 g/L (5,2 mmol/L)",
    optimalRangeLabel: "1,50 – 1,90 g/L",
    sourceRef: "ESC/EAS Dyslipidaemias Guidelines",
  },
  hdlCholesterol: {
    key: "hdlCholesterol",
    labelFr: "Cholestérol HDL",
    category: "lipides",
    canonicalUnit: "g/L",
    supportedUnits: ["g/L", "mmol/L", "mg/dL"],
    refRangeLabel: (sex) => (sex === "male" ? "≥ 0,40 g/L" : "≥ 0,50 g/L"),
    optimalRangeLabel: "≥ 0,55 g/L",
    sourceRef: "ESC/EAS Guidelines",
  },
  ldlCholesterol: {
    key: "ldlCholesterol",
    labelFr: "Cholestérol LDL",
    category: "lipides",
    canonicalUnit: "g/L",
    supportedUnits: ["g/L", "mmol/L", "mg/dL"],
    fastingSensitive: true,
    refRangeLabel: () => "< 1,60 g/L (risque faible) / < 1,15 g/L (modéré)",
    optimalRangeLabel: "< 1,00 g/L",
    sourceRef: "ESC/EAS & HAS — Prévention Cardiovasculaire",
  },
  triglycerides: {
    key: "triglycerides",
    labelFr: "Triglycérides",
    category: "lipides",
    canonicalUnit: "g/L",
    supportedUnits: ["g/L", "mmol/L", "mg/dL"],
    fastingSensitive: true,
    refRangeLabel: () => "< 1,50 g/L (< 1,7 mmol/L)",
    optimalRangeLabel: "< 1,00 g/L",
    sourceRef: "ESC/EAS & Endocrine Society",
  },
  apob: {
    key: "apob",
    labelFr: "Apolipoprotéine B (ApoB)",
    category: "lipides",
    canonicalUnit: "g/L",
    supportedUnits: ["g/L", "mg/dL"],
    refRangeLabel: () => "< 1,00 g/L",
    optimalRangeLabel: "< 0,80 g/L",
    sourceRef: "ESC/EAS Consensus ApoB",
  },
  creatinine: {
    key: "creatinine",
    labelFr: "Créatinine sérique",
    category: "foie_rein",
    canonicalUnit: "mg/L",
    supportedUnits: ["mg/L", "µmol/L", "mg/dL"],
    refRangeLabel: (sex) => (sex === "male" ? "7,0 – 13,0 mg/L" : "5,5 – 11,0 mg/L"),
    optimalRangeLabel: "Calculée via DFG CKD-EPI 2021 ≥ 90 mL/min",
    sourceRef: "KDIGO 2024 Chronic Kidney Disease Guideline",
  },
  alat: {
    key: "alat",
    labelFr: "Transaminases ALAT (SGPT)",
    category: "foie_rein",
    canonicalUnit: "UI/L",
    supportedUnits: ["UI/L"],
    refRangeLabel: (sex) => (sex === "male" ? "< 41 UI/L" : "< 33 UI/L"),
    optimalRangeLabel: "< 25 UI/L",
    sourceRef: "EASL / AASLD MASLD Metabolic Liver",
  },
  asat: {
    key: "asat",
    labelFr: "Transaminases ASAT (SGOT)",
    category: "foie_rein",
    canonicalUnit: "UI/L",
    supportedUnits: ["UI/L"],
    refRangeLabel: (sex) => (sex === "male" ? "< 40 UI/L" : "< 32 UI/L"),
    optimalRangeLabel: "< 25 UI/L",
    sourceRef: "EASL / FIB-4",
  },
  ggt: {
    key: "ggt",
    labelFr: "Gamma-GT",
    category: "foie_rein",
    canonicalUnit: "UI/L",
    supportedUnits: ["UI/L"],
    refRangeLabel: (sex) => (sex === "male" ? "< 55 UI/L" : "< 38 UI/L"),
    optimalRangeLabel: "< 25 UI/L",
    sourceRef: "EASL Metabolic Health",
  },
  platelets: {
    key: "platelets",
    labelFr: "Plaquettes",
    category: "foie_rein",
    canonicalUnit: "G/L",
    supportedUnits: ["G/L", "10^9/L"],
    refRangeLabel: () => "150 – 400 G/L",
    optimalRangeLabel: "180 – 350 G/L",
    sourceRef: "Société Française d'Hématologie / FIB-4",
  },
  ferritin: {
    key: "ferritin",
    labelFr: "Ferritine",
    category: "statut_global",
    canonicalUnit: "ng/mL",
    supportedUnits: ["ng/mL", "µg/L"],
    refRangeLabel: (sex) => (sex === "male" ? "30 – 300 ng/mL" : "15 – 150 ng/mL"),
    optimalRangeLabel: "50 – 150 ng/mL",
    sourceRef: "OMS / HAS Carence Martiale",
  },
  tsh: {
    key: "tsh",
    labelFr: "TSH ultra-sensible",
    category: "statut_global",
    canonicalUnit: "mUI/L",
    supportedUnits: ["mUI/L", "µUI/mL"],
    refRangeLabel: () => "0,40 – 4,00 mUI/L",
    optimalRangeLabel: "0,80 – 2,50 mUI/L",
    sourceRef: "HAS — Exploration Thyroïdienne",
  },
  crpUs: {
    key: "crpUs",
    labelFr: "CRP ultra-sensible (inflammation)",
    category: "statut_global",
    canonicalUnit: "mg/L",
    supportedUnits: ["mg/L"],
    refRangeLabel: () => "< 5,0 mg/L",
    optimalRangeLabel: "< 1,0 mg/L",
    sourceRef: "AHA/CDC Inflammatory Risk",
  },
  vitD: {
    key: "vitD",
    labelFr: "Vitamine D (25-OH-D)",
    category: "statut_global",
    canonicalUnit: "ng/mL",
    supportedUnits: ["ng/mL", "nmol/L"],
    refRangeLabel: () => "20 – 60 ng/mL (50 – 150 nmol/L)",
    optimalRangeLabel: "30 – 50 ng/mL",
    sourceRef: "GRIO / Endocrine Society",
  },
  vitB12: {
    key: "vitB12",
    labelFr: "Vitamine B12",
    category: "statut_global",
    canonicalUnit: "pg/mL",
    supportedUnits: ["pg/mL", "pmol/L"],
    refRangeLabel: () => "200 – 900 pg/mL",
    optimalRangeLabel: "350 – 750 pg/mL",
    sourceRef: "HAS / EFSA",
  },
  hemoglobin: {
    key: "hemoglobin",
    labelFr: "Hémoglobine",
    category: "statut_global",
    canonicalUnit: "g/dL",
    supportedUnits: ["g/dL", "g/L"],
    refRangeLabel: (sex) => (sex === "male" ? "13,0 – 17,5 g/dL" : "12,0 – 16,0 g/dL"),
    optimalRangeLabel: "Dans la norme selon sexe",
    sourceRef: "OMS Anémie",
  },
  uricAcid: {
    key: "uricAcid",
    labelFr: "Acide urique",
    category: "foie_rein",
    canonicalUnit: "mg/L",
    supportedUnits: ["mg/L", "µmol/L"],
    refRangeLabel: (sex) => (sex === "male" ? "35 – 70 mg/L" : "25 – 60 mg/L"),
    optimalRangeLabel: "< 60 mg/L",
    sourceRef: "EULAR / HAS Goutte",
  },
};

/**
 * Conversion exacte en unité canonique française (g/L, mg/L, %, UI/L, G/L, etc.)
 */
export function convertBloodMarkerToCanonical(
  key: BloodBiomarkerKey,
  rawValue: number,
  rawUnit?: string
): { value: number; unit: string } {
  const unit = (rawUnit || BIOMARKER_CATALOG[key].canonicalUnit).trim().toLowerCase();

  switch (key) {
    case "fastingGlucose": {
      if (unit.includes("mmol")) return { value: +(rawValue / 5.551).toFixed(3), unit: "g/L" };
      if (unit.includes("mg/dl") || (unit === "" && rawValue > 20))
        return { value: +(rawValue / 100).toFixed(3), unit: "g/L" };
      return { value: +rawValue.toFixed(3), unit: "g/L" };
    }
    case "hba1c": {
      if (unit.includes("mmol") || rawValue > 20)
        return { value: +(0.09148 * rawValue + 2.152).toFixed(2), unit: "%" };
      return { value: +rawValue.toFixed(2), unit: "%" };
    }
    case "fastingInsulin": {
      if (unit.includes("pmol")) return { value: +(rawValue / 6.945).toFixed(2), unit: "mUI/L" };
      return { value: +rawValue.toFixed(2), unit: "mUI/L" };
    }
    case "totalCholesterol":
    case "hdlCholesterol":
    case "ldlCholesterol": {
      if (unit.includes("mmol")) return { value: +(rawValue / 2.586).toFixed(3), unit: "g/L" };
      if (unit.includes("mg/dl") || rawValue > 20)
        return { value: +(rawValue / 100).toFixed(3), unit: "g/L" };
      return { value: +rawValue.toFixed(3), unit: "g/L" };
    }
    case "triglycerides": {
      if (unit.includes("mmol")) return { value: +(rawValue / 1.129).toFixed(3), unit: "g/L" };
      if (unit.includes("mg/dl") || rawValue > 25)
        return { value: +(rawValue / 100).toFixed(3), unit: "g/L" };
      return { value: +rawValue.toFixed(3), unit: "g/L" };
    }
    case "apob": {
      if (unit.includes("mg/dl") || rawValue > 10)
        return { value: +(rawValue / 100).toFixed(2), unit: "g/L" };
      return { value: +rawValue.toFixed(2), unit: "g/L" };
    }
    case "creatinine": {
      if (unit.includes("µmol") || unit.includes("umol") || rawValue > 30)
        return { value: +(rawValue / 8.84).toFixed(2), unit: "mg/L" };
      if (unit.includes("mg/dl")) return { value: +(rawValue * 10).toFixed(2), unit: "mg/L" };
      return { value: +rawValue.toFixed(2), unit: "mg/L" };
    }
    case "vitD": {
      if (unit.includes("nmol")) return { value: +(rawValue / 2.496).toFixed(1), unit: "ng/mL" };
      return { value: +rawValue.toFixed(1), unit: "ng/mL" };
    }
    case "vitB12": {
      if (unit.includes("pmol")) return { value: +(rawValue / 0.738).toFixed(0), unit: "pg/mL" };
      return { value: +rawValue.toFixed(0), unit: "pg/mL" };
    }
    case "hemoglobin": {
      if (unit.includes("g/l") && !unit.includes("g/dl") && rawValue > 30)
        return { value: +(rawValue / 10).toFixed(1), unit: "g/dL" };
      return { value: +rawValue.toFixed(1), unit: "g/dL" };
    }
    case "uricAcid": {
      if (unit.includes("µmol") || unit.includes("umol") || rawValue > 150)
        return { value: +(rawValue / 5.948).toFixed(1), unit: "mg/L" };
      return { value: +rawValue.toFixed(1), unit: "mg/L" };
    }
    default:
      return { value: +rawValue.toFixed(2), unit: BIOMARKER_CATALOG[key].canonicalUnit };
  }
}

function evaluateSingleMarker(params: {
  input: BloodMarkerInput;
  sex: Sex;
  fasting: boolean;
}): {
  evaluation: BloodMarkerEvaluation;
  criticalFlag: string | null;
  nutritionTip: string | null;
  exerciseTip: string | null;
} {
  const { input, sex, fasting } = params;
  const def = BIOMARKER_CATALOG[input.key];
  const { value, unit } = convertBloodMarkerToCanonical(input.key, input.rawValue, input.unit);
  const displayInput = `${String(input.rawValue).replace(".", ",")} ${input.unit}`;

  if (def.fastingSensitive && !fasting && (input.key === "fastingGlucose" || input.key === "fastingInsulin" || input.key === "triglycerides")) {
    return {
      evaluation: {
        key: input.key,
        labelFr: def.labelFr,
        category: def.category,
        canonicalValue: value,
        canonicalUnit: unit,
        displayInput,
        refRangeLabel: def.refRangeLabel(sex),
        optimalRangeLabel: def.optimalRangeLabel,
        status: "uninterpretable_non_fasting",
        explanationFr: "Prélèvement non à jeun : ce marqueur varie fortement après un repas. Comparez uniquement sur une prise à jeun (8–12 h).",
        nutritionActionFr: "Refaites le contrôle à jeun avant d'ajuster vos apports.",
        exerciseActionFr: "Poursuivez une activité régulière (marche 10 min après les repas).",
        sourceRef: def.sourceRef,
      },
      criticalFlag: null,
      nutritionTip: null,
      exerciseTip: null,
    };
  }

  let status: BloodMarkerStatus = "normal";
  let explanationFr = `Valeur dans l'intervalle de référence (${def.refRangeLabel(sex)}).`;
  let nutritionActionFr = "Maintenez une alimentation peu transformée (NOVA 1–2) riche en fibres.";
  let exerciseActionFr = "Conservez 150–300 min d'activité hebdomadaire + 2 séances de renforcement.";
  let criticalFlag: string | null = null;
  let nutritionTip: string | null = null;
  let exerciseTip: string | null = null;

  switch (input.key) {
    case "fastingGlucose": {
      if (value < 0.54 || value >= 3.0) {
        status = "critical";
        explanationFr = `Glycémie sévèrement anormale (${value.toFixed(2)} g/L) nécessitant un avis médical rapide aujourd'hui.`;
        criticalFlag = `Glycémie critique (${value.toFixed(2)} g/L) — contacter un médecin sans délai.`;
      } else if (value >= 1.26) {
        status = "high_priority";
        explanationFr = `Glycémie élevée (≥ 1,26 g/L — seuil diagnostique ADA à recontrôler avec votre médecin).`;
        nutritionActionFr = "Privilégiez les repas à charge glycémique basse, 30 g+ de fibres/jour et protéines au petit-déjeuner.";
        exerciseActionFr = "Activez les « Marches digestives 10 min » juste après les repas riches en glucides (baisse directe du pic glycémique).";
        nutritionTip = nutritionActionFr;
        exerciseTip = exerciseActionFr;
      } else if (value >= 1.0) {
        status = "watch";
        explanationFr = `Zone de vigilance glycémique (1,00–1,25 g/L). Souvent très réversible avec fibres et mouvement post-repas.`;
        nutritionActionFr = "Ajoutez des légumes riches en fibres avant les féculents et limitez les sucres liquides.";
        exerciseActionFr = "10 min de marche post-prandiale + pics VILPA pour améliorer la sensibilité à l'insuline.";
        nutritionTip = nutritionActionFr;
        exerciseTip = exerciseActionFr;
      } else if (value >= 0.75 && value <= 0.94) {
        status = "optimal";
        explanationFr = `Glycémie à jeun dans la zone métabolique optimale (${value.toFixed(2)} g/L).`;
      }
      break;
    }
    case "hba1c": {
      if (value >= 6.5) {
        status = "high_priority";
        explanationFr = `HbA1c ≥ 6,5 % (${value.toFixed(1)} %) : reflète votre glycémie moyenne sur 3 mois, à revoir avec votre médecin.`;
        nutritionActionFr = "Ciblez une perte douce de poids (-5 à -7 %) si applicable et répartissez les glucides complexes avec fibres.";
        exerciseActionFr = "Combinez marche après repas + renforcement musculaire (le muscle capte le glucose sans insuline).";
        nutritionTip = nutritionActionFr;
        exerciseTip = exerciseActionFr;
      } else if (value >= 5.7) {
        status = "watch";
        explanationFr = `Zone de pré-diabète ADA (5,7 – 6,4 %). Excellente marge de réversibilité hygiéno-diététique.`;
        nutritionActionFr = "Remplacez les produits NOVA 4 par légumineuses, céréales complètes et oméga-3.";
        exerciseActionFr = "Objectif ≥ 8 000 pas/jour + 2 séances hebdomadaires de renforcement.";
        nutritionTip = nutritionActionFr;
        exerciseTip = exerciseActionFr;
      } else if (value >= 4.8 && value <= 5.4) {
        status = "optimal";
        explanationFr = `HbA1c optimale (${value.toFixed(1)} %) témoignant d'un excellent lissage glycémique sur 90 jours.`;
      }
      break;
    }
    case "fastingInsulin": {
      if (value > 15) {
        status = "high_priority";
        explanationFr = `Insulinémie à jeun élevée (${value.toFixed(1)} mUI/L), signe fréquent d'insulino-résistance compensatoire.`;
        nutritionActionFr = "Structurez 2 à 3 vrais repas rassasiants sans grignotage sucré, avec ≥ 1,6 g/kg de protéines.";
        exerciseActionFr = "Contraction musculaire régulière (squats au poids du corps, escaliers VILPA).";
        nutritionTip = nutritionActionFr;
      } else if (value > 9) {
        status = "watch";
        explanationFr = `Insulinémie modérément haute (> 9 mUI/L). Surveiller avec HOMA-IR et tour de taille.`;
      } else if (value >= 3 && value <= 8) {
        status = "optimal";
        explanationFr = `Sensibilité à l'insuline optimale (${value.toFixed(1)} mUI/L).`;
      }
      break;
    }
    case "ldlCholesterol": {
      if (value >= 1.9) {
        status = "high_priority";
        explanationFr = `LDL très élevé (≥ 1,90 g/L). Recommandation ESC/EAS : avis médical rapide (dépistage hypercholestérolémie familiale).`;
        criticalFlag = `LDL très élevé (${value.toFixed(2)} g/L ≥ 1,90 g/L) — consultation médicale recommandée.`;
        nutritionActionFr = "Réduisez graisses saturées (< 10 % kcal), ajoutez flocons d'avoine (3 g bêta-glucanes/j), légumineuses et noix.";
        nutritionTip = nutritionActionFr;
      } else if (value >= 1.3) {
        status = "watch";
        explanationFr = `LDL modérément élevé (${value.toFixed(2)} g/L). À interpréter selon votre risque global avec le médecin.`;
        nutritionActionFr = "Enrichissez en fibres solubles (psyllium, avoine, pommes, lentilles) et remplacez beurre/charcuteries par huile d'olive/colza.";
        exerciseActionFr = "Endurance douce régulière (marche rapide, vélo 150+ min/semaine).";
        nutritionTip = nutritionActionFr;
      } else if (value < 1.0) {
        status = "optimal";
        explanationFr = `LDL bas protecteur (< 1,00 g/L).`;
      }
      break;
    }
    case "hdlCholesterol": {
      const lowLimit = sex === "male" ? 0.4 : 0.5;
      if (value < lowLimit) {
        status = "watch";
        explanationFr = `HDL bas (< ${lowLimit.toFixed(2)} g/L). L'activité aérobie et les graisses mono-insaturées aident à le soutenir.`;
        nutritionActionFr = "Huile d'olive vierge, poissons gras (saumon/maquereau 2×/semaine), avocat, suppression des acides gras trans.";
        exerciseActionFr = "Marche active 30 min/j ou 3 pics VILPA/jour (très efficace sur le bilan HDL/TG).";
        exerciseTip = exerciseActionFr;
      } else if (value >= 0.55) {
        status = "optimal";
        explanationFr = `HDL protecteur (${value.toFixed(2)} g/L).`;
      }
      break;
    }
    case "triglycerides": {
      if (value >= 8.85) {
        status = "critical";
        explanationFr = `Hypertriglycéridémie sévère (${value.toFixed(2)} g/L ≥ 10 mmol/L) exposant à un risque de pancréatite — avis médical urgent.`;
        criticalFlag = `Triglycérides critiques (${value.toFixed(2)} g/L) — consulter rapidement un médecin.`;
      } else if (value >= 1.5) {
        status = "watch";
        explanationFr = `Triglycérides au-dessus de 1,50 g/L : très sensibles aux sucres ajoutés, à l'alcool et au surplus énergétique.`;
        nutritionActionFr = "Coupez boissons sucrées/jus et alcool, augmentez oméga-3 (saumon, sardines, noix) et fibres.";
        exerciseActionFr = "Activez les 8 000+ pas quotidiens : le muscle consomme les triglycérides circulants.";
        nutritionTip = nutritionActionFr;
        exerciseTip = exerciseActionFr;
      } else if (value < 1.0) {
        status = "optimal";
        explanationFr = `Triglycérides excellents (< 1,00 g/L), signe d'un bon métabolisme lipidique.`;
      }
      break;
    }
    case "platelets": {
      if (value < 50) {
        status = "critical";
        criticalFlag = `Plaquettes très basses (${value} G/L < 50 G/L) — avis médical le jour même.`;
        explanationFr = `Thrombopénie marquée (< 50 G/L) à signaler immédiatement à un médecin.`;
      } else if (value < 150 || value > 450) {
        status = "watch";
        explanationFr = `Plaquettes hors intervalle classique (150–400 G/L).`;
      } else {
        status = "optimal";
      }
      break;
    }
    case "hemoglobin": {
      if (value < 8.0) {
        status = "critical";
        criticalFlag = `Hémoglobine critique (${value} g/dL < 8 g/dL) — avis médical urgent.`;
        explanationFr = `Anémie sévère (< 8 g/dL) nécessitant une évaluation médicale le jour même.`;
      } else if ((sex === "male" && value < 13.0) || (sex === "female" && value < 12.0)) {
        status = "watch";
        explanationFr = `Hémoglobine un peu basse selon le seuil OMS (${def.refRangeLabel(sex)}).`;
        nutritionActionFr = "Vérifiez la ferritine et la B12 avec votre médecin ; associez sources de fer + vitamine C (poivron, agrumes).";
        nutritionTip = nutritionActionFr;
      } else {
        status = "optimal";
      }
      break;
    }
    case "ferritin": {
      const lowLimit = sex === "male" ? 30 : 20;
      if (value < lowLimit) {
        status = "watch";
        explanationFr = `Réserves en fer basses (${value} ng/mL) : cause fréquente de fatigue et d'essoufflement à l'effort.`;
        nutritionActionFr = "Associez bœuf/sardines/lentilles avec vitamine C (citron/persil) et évitez le thé/café juste pendant le repas.";
        nutritionTip = nutritionActionFr;
      } else if (value > 350) {
        status = "watch";
        explanationFr = `Ferritine élevée (> 350 ng/mL) : peut refléter une inflammation (à croiser avec la CRP) ou une surcharge.`;
      } else if (value >= 50 && value <= 150) {
        status = "optimal";
        explanationFr = `Réserves en fer optimales (${value} ng/mL).`;
      }
      break;
    }
    case "vitD": {
      if (value < 20) {
        status = "watch";
        explanationFr = `Déficit en vitamine D (${value} ng/mL < 20). Impacte immunité, os et récupération musculaire.`;
        nutritionActionFr = "Poissons gras (saumon/maquereau) et avis médical pour éventuelle supplémentation adaptée.";
        nutritionTip = nutritionActionFr;
      } else if (value >= 30 && value <= 55) {
        status = "optimal";
        explanationFr = `Statut optimal en vitamine D (${value} ng/mL).`;
      }
      break;
    }
    case "crpUs": {
      if (value >= 10) {
        status = "high_priority";
        explanationFr = `CRP élevée (${value} mg/L) : inflammation active ou infection récente — à interpréter avec un médecin.`;
      } else if (value >= 3) {
        status = "watch";
        explanationFr = `Inflammation de bas grade modérée (${value} mg/L).`;
        nutritionActionFr = "Alimentation anti-inflammatoire : petits poissons gras, huile d'olive vierge, fruits rouges, zéro NOVA 4.";
      } else if (value < 1.0) {
        status = "optimal";
        explanationFr = `CRP-us très basse (< 1 mg/L), signe d'un faible bruit inflammatoire.`;
      }
      break;
    }
    case "tsh": {
      if (value < 0.2 || value > 8.0) {
        status = "high_priority";
        explanationFr = `TSH nettement hors norme (${value} mUI/L) : exploration thyroïdienne à prévoir avec votre médecin.`;
      } else if (value < 0.4 || value > 4.0) {
        status = "watch";
        explanationFr = `TSH légèrement décalée de la norme laboratoire (0,4–4,0 mUI/L).`;
      } else if (value >= 0.8 && value <= 2.5) {
        status = "optimal";
        explanationFr = `Fonction thyroïdienne TSH optimale (${value} mUI/L).`;
      }
      break;
    }
    case "alat":
    case "asat": {
      const limit = input.key === "alat" ? (sex === "male" ? 41 : 33) : sex === "male" ? 40 : 32;
      if (value > limit * 2.5) {
        status = "high_priority";
        explanationFr = `${def.labelFr} nettement élevée (${value} UI/L) — à vérifier avec un médecin (hépatique ou effort musculaire très intense récent).`;
      } else if (value > limit) {
        status = "watch";
        explanationFr = `${def.labelFr} légèrement au-dessus de la norme (${value} UI/L). Note : une séance de musculation intense dans les 48 h précédentes peut les élever temporairement.`;
        nutritionActionFr = "Réduisez sucres rapides/fructose et alcool ; ciblez une perte progressive de graisse viscérale.";
      } else if (value <= 25) {
        status = "optimal";
      }
      break;
    }
    default:
      break;
  }

  return {
    evaluation: {
      key: input.key,
      labelFr: def.labelFr,
      category: def.category,
      canonicalValue: value,
      canonicalUnit: unit,
      displayInput,
      refRangeLabel: def.refRangeLabel(sex),
      optimalRangeLabel: def.optimalRangeLabel,
      status,
      explanationFr,
      nutritionActionFr,
      exerciseActionFr,
      sourceRef: def.sourceRef,
    },
    criticalFlag,
    nutritionTip,
    exerciseTip,
  };
}

/**
 * Évalue de façon 100 % déterministe un bilan sanguin complet + calculs dérivés cliniques.
 */
export function evaluateBloodPanelDeterministically(params: {
  markers: BloodMarkerInput[];
  context: BloodPanelContext;
  age: number;
  sex: Sex;
  provider?: "openai-assisted" | "clinical-deterministic";
}): BloodPanelAnalysis {
  const { markers, context, age, sex, provider = "clinical-deterministic" } = params;

  if (context.pregnant) {
    return {
      overallScore: 100,
      criticalFlags: [],
      renalProteinGuardTriggered: false,
      summaryFr:
        "Mode grossesse activé : les normes biologiques usuelles sont modifiées pendant la grossesse (hémodilution, lipides physiologiques, ferritine). VitalPulse verrouille l'interprétation automatisée et vous invite à confier ces résultats à votre sage-femme ou médecin.",
      evaluatedMarkers: markers.map((m) => ({
        key: m.key,
        labelFr: BIOMARKER_CATALOG[m.key].labelFr,
        category: BIOMARKER_CATALOG[m.key].category,
        canonicalValue: convertBloodMarkerToCanonical(m.key, m.rawValue, m.unit).value,
        canonicalUnit: convertBloodMarkerToCanonical(m.key, m.rawValue, m.unit).unit,
        displayInput: `${String(m.rawValue).replace(".", ",")} ${m.unit}`,
        refRangeLabel: "Normes spécifiques grossesse / trimestre",
        optimalRangeLabel: "Selon avis obstétrical",
        status: "normal",
        explanationFr: "Valeur conservée dans votre historique. Suivi spécifique grossesse requis.",
        nutritionActionFr: "Suivez les recommandations nutritionnelles prénatales personnalisées.",
        exerciseActionFr: "Activité douce adaptée validée avec votre professionnel de santé.",
        sourceRef: "HAS / CNGOF Suivi Grossesse",
      })),
      derivedMetrics: [],
      priorityNutritionTips: [],
      priorityExerciseTips: [],
      doctorQuestions: [
        "Ces résultats sont-ils dans la norme attendue pour mon trimestre actuel ?",
      ],
      provider,
    };
  }

  const canonicalMap = new Map<BloodBiomarkerKey, number>();
  const evaluatedMarkers: BloodMarkerEvaluation[] = [];
  const criticalFlags: string[] = [];
  const nutritionSet = new Set<string>();
  const exerciseSet = new Set<string>();

  for (const m of markers) {
    if (!BIOMARKER_CATALOG[m.key] || !Number.isFinite(m.rawValue) || m.rawValue <= 0) continue;
    const conv = convertBloodMarkerToCanonical(m.key, m.rawValue, m.unit);
    canonicalMap.set(m.key, conv.value);
    const res = evaluateSingleMarker({ input: m, sex, fasting: context.fasting });
    evaluatedMarkers.push(res.evaluation);
    if (res.criticalFlag) criticalFlags.push(res.criticalFlag);
    if (res.nutritionTip) nutritionSet.add(res.nutritionTip);
    if (res.exerciseTip) exerciseSet.add(res.exerciseTip);
  }

  const derivedMetrics: BloodDerivedMetric[] = [];
  let renalProteinGuardTriggered = false;

  // 1. HOMA-IR (à jeun uniquement)
  const gluGL = canonicalMap.get("fastingGlucose");
  const ins = canonicalMap.get("fastingInsulin");
  if (context.fasting && gluGL !== undefined && ins !== undefined) {
    const gluMmol = gluGL * 5.551;
    const homa = +((gluMmol * ins) / 22.5).toFixed(2);
    const homaStatus = homa < 1.8 ? "optimal" : homa <= 2.5 ? "normal" : homa <= 3.5 ? "watch" : "high_priority";
    derivedMetrics.push({
      id: "homa_ir",
      labelFr: "Indice HOMA-IR (Sensibilité insuline)",
      value: homa,
      unit: "ratio",
      status: homaStatus,
      interpretationFr:
        homa < 1.8
          ? "Excellente sensibilité à l'insuline (< 1,8)."
          : homa <= 2.5
            ? "Zone acceptable — la marche après repas aide à l'améliorer."
            : "Résistance à l'insuline probable (> 2,5). Les fibres et la marche digestive sont prioritaires.",
      sourceRef: "Matthews et al., Diabetologia",
    });
  }

  // 2. Non-HDL Cholestérol
  const tc = canonicalMap.get("totalCholesterol");
  const hdl = canonicalMap.get("hdlCholesterol");
  if (tc !== undefined && hdl !== undefined && tc > hdl) {
    const nonHdl = +(tc - hdl).toFixed(2);
    const nhStatus = nonHdl < 1.3 ? "optimal" : nonHdl < 1.6 ? "normal" : nonHdl < 1.9 ? "watch" : "high_priority";
    derivedMetrics.push({
      id: "non_hdl",
      labelFr: "Cholestérol non-HDL",
      value: nonHdl,
      unit: "g/L",
      status: nhStatus,
      interpretationFr:
        nonHdl < 1.3
          ? "Cible optimale (< 1,30 g/L ESC/EAS) de particules athérogènes."
          : "Particules athérogènes modérément élevées (cible usuelle < 1,30 g/L en prévention primaire).",
      sourceRef: "ESC/EAS Guidelines",
    });
  }

  // 3. Ratio TG / HDL (à jeun)
  const tg = canonicalMap.get("triglycerides");
  if (context.fasting && tg !== undefined && hdl !== undefined && hdl > 0.1) {
    const ratio = +(tg / hdl).toFixed(2);
    const tgStatus = ratio < 2.0 ? "optimal" : ratio <= 3.0 ? "watch" : "high_priority";
    derivedMetrics.push({
      id: "tg_hdl_ratio",
      labelFr: "Ratio TG / HDL (massique g/L)",
      value: ratio,
      unit: "ratio",
      status: tgStatus,
      interpretationFr:
        ratio < 2.0
          ? "Profil métabolique très favorable (< 2,0 en convention g/L)."
          : "Ratio élevé suggérant un excès de triglycérides post-glucidiques / lipogenèse.",
      sourceRef: "EAS / EFLM Consensus",
    });
  }

  // 4. DFG CKD-EPI 2021 (sans facteur ethnique)
  const creatMgL = canonicalMap.get("creatinine");
  if (creatMgL !== undefined && age >= 18) {
    const scrMgDl = creatMgL / 10;
    const kappa = sex === "female" ? 0.7 : 0.9;
    const alpha = sex === "female" ? (scrMgDl <= 0.7 ? -0.241 : -1.2) : scrMgDl <= 0.9 ? -0.302 : -1.2;
    const sexMult = sex === "female" ? 1.012 : 1.0;
    const egfr = Math.round(
      142 *
        Math.pow(Math.min(scrMgDl / kappa, 1), alpha) *
        Math.pow(Math.max(scrMgDl / kappa, 1), -1.2) *
        Math.pow(0.9938, age) *
        sexMult
    );
    if (egfr < 60) renalProteinGuardTriggered = true;
    if (egfr < 30) {
      criticalFlags.push(`DFG estimé < 30 mL/min/1,73m² (${egfr}) — avis néphrologique/médical rapide.`);
    }
    derivedMetrics.push({
      id: "egfr_ckdepi_2021",
      labelFr: "DFG estimé (CKD-EPI 2021)",
      value: egfr,
      unit: "mL/min/1,73m²",
      status: egfr >= 90 ? "optimal" : egfr >= 60 ? "normal" : egfr >= 45 ? "watch" : "high_priority",
      interpretationFr:
        egfr >= 90
          ? "Filtration rénale estimée normale/optimale (≥ 90)."
          : egfr >= 60
            ? "Filtration légèrement modérée (60–89) — hydratation régulière conseillée."
            : "Filtration < 60 (KDIGO) : VitalPulse conseille de valider votre cible protéique (~0,8 g/kg/j) avec votre médecin.",
      sourceRef: "CKD-EPI 2021 / KDIGO 2024",
    });
  }

  // 5. FIB-4 (âge >= 35, ASAT, ALAT, Plaquettes)
  const asat = canonicalMap.get("asat");
  const alat = canonicalMap.get("alat");
  const plt = canonicalMap.get("platelets");
  if (age >= 35 && asat && alat && plt && alat > 0 && plt > 0) {
    const fib4 = +((age * asat) / (plt * Math.sqrt(alat))).toFixed(2);
    derivedMetrics.push({
      id: "fib4",
      labelFr: "Score hépatique FIB-4",
      value: fib4,
      unit: "score",
      status: fib4 < 1.3 ? "optimal" : fib4 <= 2.67 ? "watch" : "high_priority",
      interpretationFr:
        fib4 < 1.3
          ? "Risque faible de fibrose hépatique (< 1,30 EASL)."
          : "Score intermédiaire/élevé (≥ 1,30) : à discuter avec votre médecin (échographie / évaluation MASLD).",
      sourceRef: "EASL / EASD / EASO MASLD Guideline 2024",
    });
  }

  // Score global pédagogique (0..100)
  let score = 92;
  for (const ev of evaluatedMarkers) {
    if (ev.status === "critical") score -= 30;
    else if (ev.status === "high_priority") score -= 14;
    else if (ev.status === "watch") score -= 7;
    else if (ev.status === "optimal") score += 1;
  }
  const overallScore = Math.max(15, Math.min(100, Math.round(score)));

  const priorityNutritionTips =
    nutritionSet.size > 0
      ? Array.from(nutritionSet).slice(0, 4)
      : ["Maintenez vos apports en fibres (28–32 g/j ANSES) et privilégiez les aliments peu transformés (NOVA 1–2)."];
  const priorityExerciseTips =
    exerciseSet.size > 0
      ? Array.from(exerciseSet).slice(0, 3)
      : ["Marche digestive de 10 min après le repas principal + objectif pas quotidiens."];

  const doctorQuestions: string[] = [];
  if (evaluatedMarkers.some((e) => e.status === "high_priority" || e.status === "critical" || e.status === "watch")) {
    const flagged = evaluatedMarkers
      .filter((e) => e.status === "critical" || e.status === "high_priority" || e.status === "watch")
      .map((e) => e.labelFr)
      .slice(0, 3);
    doctorQuestions.push(`Au vu de mon profil global, quel objectif cible recommandez-vous pour : ${flagged.join(", ")} ?`);
  }
  if (renalProteinGuardTriggered) {
    doctorQuestions.push("Mon DFG estimé étant < 60, quel apport maximal quotidien en protéines et potassium dois-je viser ?");
  }
  doctorQuestions.push("À quel délai souhaitez-vous recontrôler ces marqueurs biologiques ?");

  const watchOrHighCount = evaluatedMarkers.filter(
    (e) => e.status === "watch" || e.status === "high_priority" || e.status === "critical"
  ).length;

  const summaryFr =
    criticalFlags.length > 0
      ? `Attention : ${criticalFlags.length} alerte(s) prioritaire(s) détectée(s) sur ${evaluatedMarkers.length} marqueur(s) analysé(s). Contactez votre médecin sans attendre.`
      : watchOrHighCount === 0
        ? `Très bon équilibre biologique global sur ${evaluatedMarkers.length} marqueur(s) analysé(s) (${derivedMetrics.length} indice(s) calculé(s)).`
        : `${evaluatedMarkers.length} marqueur(s) et ${derivedMetrics.length} indice(s) calculé(s) : ${watchOrHighCount} point(s) d'attention avec actions nutrition et exercices personnalisées.`;

  return {
    overallScore,
    criticalFlags,
    renalProteinGuardTriggered,
    summaryFr,
    evaluatedMarkers,
    derivedMetrics,
    priorityNutritionTips,
    priorityExerciseTips,
    doctorQuestions,
    provider,
  };
}

/**
 * Parseur déterministe français pour extraire des biomarqueurs depuis un compte-rendu collé
 * (virgule ou point décimal acceptés, insensible à la casse et aux accents).
 */
export function parseFrenchBloodReportText(rawText: string): BloodMarkerInput[] {
  if (!rawText || rawText.trim().length < 4) return [];
  const normalized = rawText
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  const patterns: { key: BloodBiomarkerKey; regex: RegExp; defaultUnit: string }[] = [
    { key: "fastingGlucose", regex: /glycem(?:ie)?[^0-9]{0,28}(\d+(?:[.,]\d+)?)\s*(g\/l|mmol\/l|mg\/dl)?/, defaultUnit: "g/L" },
    { key: "hba1c", regex: /hba1c[^0-9]{0,28}(\d+(?:[.,]\d+)?)\s*(%|mmol\/mol)?/, defaultUnit: "%" },
    { key: "fastingInsulin", regex: /insulin(?:e|emie)?[^0-9]{0,28}(\d+(?:[.,]\d+)?)\s*(mui\/l|pmol\/l|uui\/ml)?/, defaultUnit: "mUI/L" },
    { key: "totalCholesterol", regex: /cholesterol\s+total[^0-9]{0,28}(\d+(?:[.,]\d+)?)\s*(g\/l|mmol\/l|mg\/dl)?/, defaultUnit: "g/L" },
    { key: "hdlCholesterol", regex: /(?:cholesterol\s+)?hdl[^0-9]{0,24}(\d+(?:[.,]\d+)?)\s*(g\/l|mmol\/l|mg\/dl)?/, defaultUnit: "g/L" },
    { key: "ldlCholesterol", regex: /(?:cholesterol\s+)?ldl[^0-9]{0,24}(\d+(?:[.,]\d+)?)\s*(g\/l|mmol\/l|mg\/dl)?/, defaultUnit: "g/L" },
    { key: "triglycerides", regex: /triglycerid(?:es?)?[^0-9]{0,28}(\d+(?:[.,]\d+)?)\s*(g\/l|mmol\/l|mg\/dl)?/, defaultUnit: "g/L" },
    { key: "creatinine", regex: /creatinin(?:e|emie)?[^0-9]{0,28}(\d+(?:[.,]\d+)?)\s*(mg\/l|umol\/l|µmol\/l|mg\/dl)?/, defaultUnit: "mg/L" },
    { key: "alat", regex: /alat[^0-9]{0,20}(\d+(?:[.,]\d+)?)\s*(ui\/l)?/, defaultUnit: "UI/L" },
    { key: "asat", regex: /asat[^0-9]{0,20}(\d+(?:[.,]\d+)?)\s*(ui\/l)?/, defaultUnit: "UI/L" },
    { key: "ggt", regex: /(?:gamma\s*-?\s*gt|ggt)[^0-9]{0,20}(\d+(?:[.,]\d+)?)\s*(ui\/l)?/, defaultUnit: "UI/L" },
    { key: "platelets", regex: /plaquett(?:es?)?[^0-9]{0,20}(\d+(?:[.,]\d+)?)\s*(g\/l)?/, defaultUnit: "G/L" },
    { key: "ferritin", regex: /ferritin(?:e|emie)?[^0-9]{0,24}(\d+(?:[.,]\d+)?)\s*(ng\/ml|ug\/l)?/, defaultUnit: "ng/mL" },
    { key: "tsh", regex: /\btsh\b[^0-9]{0,24}(\d+(?:[.,]\d+)?)\s*(mui\/l|uui\/ml)?/, defaultUnit: "mUI/L" },
    { key: "crpUs", regex: /\bcrp(?:\s*-?\s*us)?\b[^0-9]{0,24}(\d+(?:[.,]\d+)?)\s*(mg\/l)?/, defaultUnit: "mg/L" },
    { key: "vitD", regex: /vit(?:amine)?\s*d[^0-9]{0,24}(\d+(?:[.,]\d+)?)\s*(ng\/ml|nmol\/l)?/, defaultUnit: "ng/mL" },
    { key: "hemoglobin", regex: /hemoglobin(?:e)?[^0-9]{0,24}(\d+(?:[.,]\d+)?)\s*(g\/dl|g\/l)?/, defaultUnit: "g/dL" },
  ];

  const found: BloodMarkerInput[] = [];
  for (const p of patterns) {
    const m = normalized.match(p.regex);
    if (!m) continue;
    const val = Number(m[1].replace(",", "."));
    if (!Number.isFinite(val) || val <= 0) continue;
    found.push({
      key: p.key,
      rawValue: val,
      unit: m[2] ? m[2].replace("u", "µ") : p.defaultUnit,
    });
  }
  return found;
}

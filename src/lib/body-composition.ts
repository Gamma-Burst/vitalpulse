import {
  BodyCompositionSummary,
  BodyMeasurementEntry,
  Sex,
  UserProfile,
  WeightEntry,
} from "@/types/vitalpulse";
import { resolveEffectiveAge } from "@/lib/metabolic-engine";

export type MeasurementSiteKey =
  | "waistCm"
  | "hipsCm"
  | "chestCm"
  | "shouldersCm"
  | "neckCm"
  | "thighCm"
  | "armCm"
  | "calfCm";

export const MEASUREMENT_SITE_META: {
  key: MeasurementSiteKey;
  label: string;
  shortLabel: string;
  protocolTip: string;
  color: string;
}[] = [
  {
    key: "waistCm",
    label: "Tour de taille",
    shortLabel: "Taille",
    protocolTip: "Au nombril (repère US Navy) ou à mi-distance côtes/hanches, le matin après expiration douce sans rentrer le ventre.",
    color: "#34D399",
  },
  {
    key: "hipsCm",
    label: "Tour de hanches",
    shortLabel: "Hanches",
    protocolTip: "À l'endroit le plus large des fessiers, pieds joints, ruban bien horizontal.",
    color: "#38BDF8",
  },
  {
    key: "chestCm",
    label: "Tour de poitrine",
    shortLabel: "Poitrine",
    protocolTip: "Sous les aisselles, au niveau des mamelons / pointe du sternum, respiration neutre.",
    color: "#A78BFA",
  },
  {
    key: "shouldersCm",
    label: "Tour d'épaules",
    shortLabel: "Épaules",
    protocolTip: "Bras relâchés le long du corps, autour de la largeur maximale des deltoïdes.",
    color: "#FBBF24",
  },
  {
    key: "neckCm",
    label: "Tour de cou",
    shortLabel: "Cou",
    protocolTip: "Sous la pomme d'Adam, tête droite, ruban légèrement incliné vers l'avant (indispensable au % graisse US Navy).",
    color: "#F472B6",
  },
  {
    key: "thighCm",
    label: "Tour de cuisse",
    shortLabel: "Cuisse",
    protocolTip: "À mi-cuisse (toujours la même jambe, même hauteur), quadriceps détendu.",
    color: "#FB923C",
  },
  {
    key: "armCm",
    label: "Tour de bras",
    shortLabel: "Bras",
    protocolTip: "À mi-distance épaule-coude, bras relâché ou fléchi de façon identique à chaque mesure.",
    color: "#2DD4BF",
  },
  {
    key: "calfCm",
    label: "Tour de mollet",
    shortLabel: "Mollet",
    protocolTip: "Au point le plus large du mollet, appui égal sur les deux pieds.",
    color: "#94A3B8",
  },
];

/**
 * Formule officielle US Navy (Hodgdon & Beckett, 1984) en centimètres :
 * - Homme : D = 1.0324 - 0.19077 * log10(waist - neck) + 0.15456 * log10(height)
 * - Femme : D = 1.29579 - 0.35004 * log10(waist + hips - neck) + 0.22100 * log10(height)
 * - % Gras = 495 / D - 450
 */
export function computeNavyBodyFatPct(params: {
  sex: Sex;
  heightCm: number;
  waistCm?: number;
  neckCm?: number;
  hipsCm?: number;
}): number | null {
  const { sex, heightCm, waistCm, neckCm, hipsCm } = params;
  if (!heightCm || heightCm < 110 || !waistCm || !neckCm || waistCm <= 40 || neckCm <= 20) {
    return null;
  }

  let density: number;
  if (sex === "male") {
    const diff = waistCm - neckCm;
    if (diff <= 5) return null;
    density = 1.0324 - 0.19077 * Math.log10(diff) + 0.15456 * Math.log10(heightCm);
  } else {
    if (!hipsCm || hipsCm <= 50) return null;
    const sumDiff = waistCm + hipsCm - neckCm;
    if (sumDiff <= 10) return null;
    density = 1.29579 - 0.35004 * Math.log10(sumDiff) + 0.221 * Math.log10(heightCm);
  }

  if (!Number.isFinite(density) || density <= 0.85) return null;
  const pct = 495 / density - 450;
  if (!Number.isFinite(pct) || pct < 3 || pct > 65) return null;
  return +pct.toFixed(1);
}

/**
 * Synthèse complète de composition corporelle & recomposition :
 * croise US Navy + RFM (Woolcott 2018) + WHR (OMS) + WtHR (NICE/HAS) + FFMI.
 */
export function computeBodyComposition(params: {
  profile: UserProfile;
  measurements: BodyMeasurementEntry[];
  weights?: WeightEntry[];
}): BodyCompositionSummary {
  const { profile, measurements, weights = [] } = params;
  const sorted = [...measurements].sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  const first = sorted[0];
  const latest = sorted[sorted.length - 1];

  const waistCm = latest?.waistCm ?? profile.waistCm;
  const neckCm = latest?.neckCm;
  const hipsCm = latest?.hipsCm;

  const sortedWeights = [...weights].sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  const currentWeight = latest?.weightKg ?? sortedWeights[sortedWeights.length - 1]?.weightKg ?? profile.weightKg;
  const startWeight = first?.weightKg ?? sortedWeights[0]?.weightKg ?? currentWeight;

  const navyBodyFatPct = computeNavyBodyFatPct({
    sex: profile.sex,
    heightCm: profile.heightCm,
    waistCm,
    neckCm,
    hipsCm,
  });

  // RFM (Woolcott & Bergman 2018) ou Deurenberg en repli
  let rfmPct: number;
  if (waistCm && waistCm > 40) {
    const rawRfm =
      profile.sex === "male"
        ? 64 - 20 * (profile.heightCm / waistCm)
        : 76 - 20 * (profile.heightCm / waistCm);
    rfmPct = +Math.max(5, Math.min(60, rawRfm)).toFixed(1);
  } else {
    const hM = Math.max(1.2, profile.heightCm / 100);
    const bmi = currentWeight / (hM * hM);
    const sexFlag = profile.sex === "male" ? 1 : 0;
    const effectiveAge = resolveEffectiveAge(profile);
    rfmPct = +Math.max(6, Math.min(58, 1.2 * bmi + 0.23 * effectiveAge - 10.8 * sexFlag - 5.4)).toFixed(1);
  }

  const centralPct =
    navyBodyFatPct !== null ? +((navyBodyFatPct + rfmPct) / 2).toFixed(1) : rfmPct;
  const bodyFatRangeMinPct =
    navyBodyFatPct !== null
      ? +Math.max(4, Math.min(navyBodyFatPct, rfmPct) - 1.2).toFixed(1)
      : +Math.max(4, rfmPct - 2.0).toFixed(1);
  const bodyFatRangeMaxPct =
    navyBodyFatPct !== null
      ? +Math.min(65, Math.max(navyBodyFatPct, rfmPct) + 1.2).toFixed(1)
      : +Math.min(65, rfmPct + 2.0).toFixed(1);

  const fatMassKg = +((currentWeight * centralPct) / 100).toFixed(1);
  const leanMassKg = +Math.max(20, currentWeight - fatMassKg).toFixed(1);
  const heightM = Math.max(1.2, profile.heightCm / 100);
  const ffmi = +(leanMassKg / (heightM * heightM)).toFixed(1);

  const wthr = waistCm && waistCm > 40 ? +(waistCm / profile.heightCm).toFixed(2) : null;
  const whr = waistCm && hipsCm && hipsCm > 50 ? +(waistCm / hipsCm).toFixed(2) : null;

  let whrStatusFr: string | null = null;
  if (whr !== null) {
    const threshold = profile.sex === "male" ? 0.9 : 0.85;
    whrStatusFr =
      whr < threshold
        ? `Optimal (< ${threshold.toFixed(2)} OMS)`
        : `Adiposité abdominale accrue (≥ ${threshold.toFixed(2)} OMS)`;
  }

  // Somme des cm gagnés sur les zones de silhouette clés
  const lossSites: MeasurementSiteKey[] = ["waistCm", "hipsCm", "chestCm", "thighCm", "armCm", "calfCm"];
  let totalCmLostFromStart = 0;
  if (first && latest && first.id !== latest.id) {
    for (const s of lossSites) {
      const startVal = first[s];
      const endVal = latest[s];
      if (typeof startVal === "number" && typeof endVal === "number") {
        totalCmLostFromStart += startVal - endVal;
      }
    }
  }
  totalCmLostFromStart = +totalCmLostFromStart.toFixed(1);

  // Détecteur de Recomposition Corporelle (poids quasi stable mais tour de taille en baisse >= 1.5 cm)
  const weightDelta = +(currentWeight - startWeight).toFixed(1);
  const waistDelta =
    first?.waistCm && latest?.waistCm ? +(latest.waistCm - first.waistCm).toFixed(1) : null;

  let recompositionDetected = false;
  let recompositionBannerFr: string | null = null;
  if (waistDelta !== null && waistDelta <= -1.5 && Math.abs(weightDelta) <= 0.9) {
    recompositionDetected = true;
    recompositionBannerFr = `Recomposition corporelle détectée : votre poids est stable (${weightDelta >= 0 ? "+" : ""}${weightDelta} kg) mais votre tour de taille a baissé de ${Math.abs(waistDelta)} cm — vous perdez du tissu adipeux tout en préservant/construisant votre masse maigre.`;
  } else if (waistDelta !== null && waistDelta <= -2.0) {
    recompositionDetected = true;
    recompositionBannerFr = `Excellente dynamique viscérale : -${Math.abs(waistDelta)} cm de tour de taille et ${totalCmLostFromStart >= 0 ? `-${totalCmLostFromStart}` : `+${Math.abs(totalCmLostFromStart)}`} cm cumulés sur vos mensurations.`;
  }

  return {
    navyBodyFatPct,
    rfmPct,
    bodyFatRangeMinPct,
    bodyFatRangeMaxPct,
    fatMassKg,
    leanMassKg,
    ffmi,
    whr,
    whrStatusFr,
    wthr,
    totalCmLostFromStart,
    recompositionDetected,
    recompositionBannerFr,
  };
}

export interface NormalizedBase100Point {
  dateKey: string;
  weightIdx: number | null;
  waistIdx: number | null;
  bodyFatIdx: number | null;
}

/**
 * Construit les séries normalisées Base 100 (point 1 = 100.0) afin de comparer
 * visuellement Poids (kg), Tour de taille (cm) et % Masse grasse sur un seul repère.
 */
export function buildNormalizedBase100Series(
  measurements: BodyMeasurementEntry[],
  profile: UserProfile
): NormalizedBase100Point[] {
  const sorted = [...measurements].sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  if (sorted.length === 0) return [];

  let baseWeight: number | null = null;
  let baseWaist: number | null = null;
  let baseFat: number | null = null;

  return sorted.map((m) => {
    const weight = m.weightKg ?? null;
    const waist = m.waistCm ?? null;
    const navy = computeNavyBodyFatPct({
      sex: profile.sex,
      heightCm: profile.heightCm,
      waistCm: m.waistCm,
      neckCm: m.neckCm,
      hipsCm: m.hipsCm,
    });
    const rfm =
      waist && waist > 40
        ? +(
            profile.sex === "male"
              ? 64 - 20 * (profile.heightCm / waist)
              : 76 - 20 * (profile.heightCm / waist)
          ).toFixed(1)
        : null;
    const fat = navy ?? rfm;

    if (baseWeight === null && weight !== null) baseWeight = weight;
    if (baseWaist === null && waist !== null) baseWaist = waist;
    if (baseFat === null && fat !== null) baseFat = fat;

    return {
      dateKey: m.dateKey,
      weightIdx: weight !== null && baseWeight ? +((weight / baseWeight) * 100).toFixed(1) : null,
      waistIdx: waist !== null && baseWaist ? +((waist / baseWaist) * 100).toFixed(1) : null,
      bodyFatIdx: fat !== null && baseFat ? +((fat / baseFat) * 100).toFixed(1) : null,
    };
  });
}

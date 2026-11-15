import {
  ActivityProfile,
  AnthropometricReport,
  DailyEnergyBalance,
  DailyStepLog,
  MealEntry,
  ScaleDecoderInsight,
  UserProfile,
  WaterLog,
  WeightEntry,
  WeightTrendPoint,
  WorkoutSession,
} from "@/types/vitalpulse";
import { formatDecimalFr } from "@/lib/decimal-utils";

const ACTIVITY_NEAT_FACTORS: Record<ActivityProfile, number> = {
  sedentary: 0.12,
  lightly_active: 0.16,
  active: 0.21,
  very_active: 0.27,
};

const ACTIVITY_MAINTENANCE_MULTIPLIERS: Record<ActivityProfile, number> = {
  sedentary: 1.28,
  lightly_active: 1.42,
  active: 1.58,
  very_active: 1.75,
};

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Calcule l'âge exact en années révolues à partir d'une date ISO YYYY-MM-DD.
 * Retourne null si la date est invalide, future ou hors plage humaine [10..110].
 */
export function computeAgeFromBirthDate(
  birthDateIso?: string | null,
  referenceDate: Date = new Date()
): number | null {
  if (typeof birthDateIso !== "string") return null;
  const trimmed = birthDateIso.trim();
  const match = ISO_DATE_RE.exec(trimmed);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  const refYear = referenceDate.getFullYear();
  const refMonth = referenceDate.getMonth() + 1;
  const refDay = referenceDate.getDate();

  let age = refYear - year;
  if (refMonth < month || (refMonth === month && refDay < day)) {
    age -= 1;
  }
  if (age < 10 || age > 110) return null;
  return age;
}

export function isValidBirthDateIso(
  birthDateIso?: string | null,
  referenceDate: Date = new Date()
): birthDateIso is string {
  return computeAgeFromBirthDate(birthDateIso, referenceDate) !== null;
}

/**
 * Résout l'âge effectif d'un profil (priorité à la date de naissance si valide).
 */
export function resolveEffectiveAge(
  profile: { age?: number; birthDate?: string } | null | undefined,
  referenceDate: Date = new Date()
): number {
  const fromDob = computeAgeFromBirthDate(profile?.birthDate, referenceDate);
  if (fromDob !== null) return fromDob;
  const rawAge = profile?.age;
  return Math.max(10, Math.min(110, typeof rawAge === "number" && Number.isFinite(rawAge) ? Math.round(rawAge) : 35));
}

export function formatBirthDateFr(birthDateIso?: string | null): string | null {
  if (!isValidBirthDateIso(birthDateIso)) return null;
  const match = ISO_DATE_RE.exec(birthDateIso.trim());
  if (!match) return null;
  const dt = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(dt);
}

/**
 * Calcule le bilan anthropométrique complet :
 * - IMC (OMS)
 * - Ratio Tour de taille / Taille WtHR (HAS / NICE CG189 : seuil 0.50)
 * - Body Roundness Index BRI (Thomas et al. / JAMA Network Open 2024)
 * - Relative Fat Mass RFM % (Woolcott & Bergman 2018)
 * - BMR Mifflin-St Jeor + plancher de sécurité médicale
 */
export function computeAnthropometrics(profile: UserProfile): AnthropometricReport {
  const safeHeightCm = Math.max(
    120,
    Math.min(230, Number.isFinite(profile.heightCm) ? profile.heightCm : 170)
  );
  const heightM = safeHeightCm / 100;
  const weightKg = Math.max(
    30,
    Math.min(250, Number.isFinite(profile.weightKg) ? profile.weightKg : 75)
  );
  const age = resolveEffectiveAge(profile);

  const bmi = +(weightKg / (heightM * heightM)).toFixed(1);
  let bmiCategoryFr = "Corpulence normale (OMS)";
  if (bmi < 18.5) bmiCategoryFr = "Insuffisance pondérale (OMS)";
  else if (bmi < 25) bmiCategoryFr = "Corpulence normale (OMS)";
  else if (bmi < 30) bmiCategoryFr = "Surpoids pondéral (OMS)";
  else if (bmi < 35) bmiCategoryFr = "Obésité modérée Classe I (OMS)";
  else bmiCategoryFr = "Obésité élevée Classe II+ (OMS)";

  const waistCm =
    profile.waistCm &&
    Number.isFinite(profile.waistCm) &&
    profile.waistCm >= 42 &&
    profile.waistCm <= 190
      ? profile.waistCm
      : null;
  const wthr = waistCm ? +(waistCm / safeHeightCm).toFixed(2) : null;

  let wthrStatusFr: string | null = null;
  if (wthr !== null) {
    if (wthr < 0.4) wthrStatusFr = "Très bas (< 0,40) — à surveiller";
    else if (wthr < 0.5) wthrStatusFr = "Zone métabolique saine (< 0,50 NICE/HAS)";
    else if (wthr < 0.6) wthrStatusFr = "Vigilance graisse viscérale (0,50–0,59)";
    else wthrStatusFr = "Risque cardiométabolique accru (≥ 0,60)";
  }

  let bri: number | null = null;
  let briCategoryFr: string | null = null;
  if (waistCm !== null) {
    const waistM = waistCm / 100;
    const ratio = waistM / (Math.PI * heightM);
    const inner = Math.max(0, 1 - ratio * ratio);
    bri = +(364.2 - 365.5 * Math.sqrt(inner)).toFixed(2);
    if (bri < 3.4) briCategoryFr = "BRI bas / minceur centrale";
    else if (bri <= 5.4) briCategoryFr = "BRI optimal (risque minimal — JAMA 2024)";
    else if (bri <= 6.9) briCategoryFr = "BRI modérément élevé (adiposité abdominale)";
    else briCategoryFr = "BRI élevé (suivi tour de taille conseillé)";
  }

  let rfmPct: number;
  let rfmMethodLabel: string;
  if (waistCm !== null) {
    const rawRfm =
      profile.sex === "male"
        ? 64 - 20 * (safeHeightCm / waistCm)
        : 76 - 20 * (safeHeightCm / waistCm);
    rfmPct = +Math.max(5, Math.min(60, rawRfm)).toFixed(1);
    rfmMethodLabel = "RFM validé (Woolcott 2018 — taille + tour de taille)";
  } else {
    const sexFlag = profile.sex === "male" ? 1 : 0;
    const rawDeurenberg = 1.2 * bmi + 0.23 * age - 10.8 * sexFlag - 5.4;
    rfmPct = +Math.max(6, Math.min(58, rawDeurenberg)).toFixed(1);
    rfmMethodLabel = "Estimation Deurenberg (ajoutez votre tour de taille pour le vrai RFM/BRI)";
  }

  let athleticCoherenceNote: string | null = null;
  if (bmi >= 25 && bmi < 29.8 && wthr !== null && wthr < 0.5) {
    athleticCoherenceNote =
      "Profil musclé / athlétique détecté : votre IMC dépasse 25 mais votre ratio tour de taille / taille (< 0,50) prouve une faible graisse viscérale.";
  }

  // Mifflin-St Jeor (1990)
  const bmrRaw =
    10 * weightKg + 6.25 * safeHeightCm - 5 * age + (profile.sex === "male" ? 5 : -161);
  const bmrKcal = Math.max(950, Math.round(bmrRaw));
  const estimatedMaintenanceKcal = Math.round(
    bmrKcal * ACTIVITY_MAINTENANCE_MULTIPLIERS[profile.activityProfile]
  );

  // Garde-fou mineur & plancher calorique clinique
  const minorSafetyLock = age < 18;
  const paceDeltaKcal = minorSafetyLock ? 0 : Math.round((profile.weeklyPaceKg * 7700) / 7);
  const uncappedTarget = estimatedMaintenanceKcal + paceDeltaKcal;
  const clinicalFloor = Math.max(
    profile.sex === "male" ? 1500 : 1200,
    Math.round(bmrKcal * 0.85)
  );
  const autoTargetIntakeKcal = minorSafetyLock
    ? estimatedMaintenanceKcal
    : Math.max(
        clinicalFloor,
        Math.min(
          estimatedMaintenanceKcal +
            (profile.primaryGoal === "muscle_gain" || profile.primaryGoal === "athletic_performance"
              ? 750
              : 600),
          uncappedTarget
        )
      );
  const hasCalorieOverride =
    !minorSafetyLock &&
    typeof profile.dailyCalorieGoalOverride === "number" &&
    Number.isFinite(profile.dailyCalorieGoalOverride);
  const targetIntakeKcal = hasCalorieOverride
    ? Math.max(clinicalFloor, Math.min(5500, Math.round(profile.dailyCalorieGoalOverride!)))
    : autoTargetIntakeKcal;
  const safetyFloorApplied =
    !minorSafetyLock &&
    (hasCalorieOverride
      ? profile.dailyCalorieGoalOverride! < clinicalFloor
      : uncappedTarget < clinicalFloor);

  const idealBmi25Kg = 25 * heightM * heightM;
  const baseReferenceMass =
    (profile.primaryGoal === "fat_loss" || profile.primaryGoal === "rebalancing") &&
    profile.targetWeightKg < weightKg
      ? Math.max(45, (weightKg + Math.max(35, profile.targetWeightKg)) / 2)
      : weightKg;
  const espenAdjustedKg = idealBmi25Kg + 0.4 * Math.max(0, weightKg - idealBmi25Kg);
  const referenceMass =
    weightKg > idealBmi25Kg * 1.2
      ? Math.min(baseReferenceMass, espenAdjustedKg)
      : baseReferenceMass;

  let proteinG: number;
  let fatG: number;
  let carbsG: number;
  let fiberG: number;
  // Hydratation EFSA : ~20 % provient des aliments et le tissu adipeux (> IMC 25) est peu hydraté
  const hydrationRefKg =
    weightKg <= idealBmi25Kg
      ? weightKg
      : idealBmi25Kg + 0.25 * (weightKg - idealBmi25Kg);
  const mlPerKg = profile.specialMode === "ketogenic" && !minorSafetyLock ? 33 : 30;
  const athleticWaterBonusMl =
    profile.athleticLevel === "athlete" || profile.primaryGoal === "athletic_performance"
      ? 400
      : profile.athleticLevel === "intermediate"
        ? 250
        : profile.athleticLevel === "recreational"
          ? 150
          : 0;
  const rawAutoWaterMl =
    Math.round((hydrationRefKg * mlPerKg + athleticWaterBonusMl) / 50) * 50;
  const autoWaterMl = Math.max(1500, Math.min(3500, rawAutoWaterMl));
  const waterMl =
    typeof profile.dailyWaterGoalMl === "number" && Number.isFinite(profile.dailyWaterGoalMl)
      ? Math.max(1000, Math.min(4500, Math.round(profile.dailyWaterGoalMl)))
      : autoWaterMl;
  const isAthleticSodiumProfile =
    profile.primaryGoal === "athletic_performance" ||
    profile.specialMode === "high_protein_athlete" ||
    profile.athleticLevel === "athlete";
  let sodiumMaxMg =
    profile.specialMode === "cardio_low_sodium"
      ? 1500
      : isAthleticSodiumProfile
        ? 2400
        : 2000; // OMS < 5g sel/j (hors compensation sudorale sportive)

  if (profile.specialMode === "ketogenic" && !minorSafetyLock) {
    proteinG = Math.max(50, Math.min(220, Math.round(referenceMass * 1.65)));
    carbsG = Math.max(20, Math.min(35, Math.round((targetIntakeKcal * 0.06) / 4)));
    fatG = Math.max(
      50,
      Math.round(Math.max(360, targetIntakeKcal - proteinG * 4 - carbsG * 4) / 9)
    );
    fiberG = profile.sex === "male" ? 26 : 24;
    sodiumMaxMg = 2300;
  } else if (profile.specialMode === "rebalancing" || profile.primaryGoal === "rebalancing") {
    proteinG = Math.max(50, Math.min(220, Math.round(referenceMass * 1.6)));
    fatG = Math.max(45, Math.round((targetIntakeKcal * 0.3) / 9));
    carbsG = Math.round(Math.max(200, targetIntakeKcal - proteinG * 4 - fatG * 9) / 4);
    fiberG = profile.sex === "male" ? 34 : 30;
  } else if (
    profile.primaryGoal === "muscle_gain" ||
    profile.specialMode === "high_protein_athlete"
  ) {
    const proteinPerKg =
      profile.athleticLevel === "athlete" || profile.athleticLevel === "intermediate"
        ? 2.0
        : profile.athleticLevel === "recreational"
          ? 1.9
          : 1.85;
    proteinG = Math.max(60, Math.min(240, Math.round(referenceMass * proteinPerKg)));
    const fatFloorG = Math.max(45, Math.round(referenceMass * 0.85));
    fatG = Math.max(fatFloorG, Math.round((targetIntakeKcal * 0.27) / 9));
    carbsG = Math.round(Math.max(240, targetIntakeKcal - proteinG * 4 - fatG * 9) / 4);
    fiberG = profile.sex === "male" ? 34 : 30;
  } else if (profile.primaryGoal === "athletic_performance") {
    const proteinPerKg = profile.athleticLevel === "athlete" ? 1.85 : 1.7;
    proteinG = Math.max(60, Math.min(230, Math.round(referenceMass * proteinPerKg)));
    const fatFloorG = Math.max(45, Math.round(referenceMass * 0.8));
    fatG = Math.max(fatFloorG, Math.round((targetIntakeKcal * 0.25) / 9));
    carbsG = Math.round(Math.max(280, targetIntakeKcal - proteinG * 4 - fatG * 9) / 4);
    fiberG = profile.sex === "male" ? 32 : 28;
  } else {
    const proteinPerKg =
      profile.specialMode === "glp1_muscle_guard" || profile.primaryGoal === "recomposition"
        ? 1.85
        : profile.primaryGoal === "fat_loss"
          ? 1.75
          : 1.55;

    proteinG = Math.max(50, Math.min(220, Math.round(referenceMass * proteinPerKg)));
    fatG = Math.max(45, Math.round((targetIntakeKcal * 0.28) / 9));
    const remainingCarbsKcal = Math.max(200, targetIntakeKcal - proteinG * 4 - fatG * 9);
    carbsG = Math.round(remainingCarbsKcal / 4);
    fiberG = profile.sex === "male" ? 32 : 28; // ANSES repère ~30g/j
  }

  const perMealProteinBolusG = Math.max(20, Math.min(55, Math.round(proteinG / 4)));
  const workoutRefuelEligible =
    !minorSafetyLock &&
    !hasCalorieOverride &&
    (profile.primaryGoal === "muscle_gain" || profile.primaryGoal === "athletic_performance");

  const sources = [
    "OMS — Classification IMC & Sodium (< 2 000 mg/j)",
    "NICE CG189 (2022) & HAS — Ratio Tour de Taille / Taille (< 0,50)",
    "JAMA Network Open (2024) — Body Roundness Index (BRI)",
    "ANSES & ESPEN — Apports Protéiques & Fibres (30 g/j)",
    "EFSA — Hydratation ajustée & Mifflin-St Jeor",
  ];
  if (
    profile.primaryGoal === "muscle_gain" ||
    profile.primaryGoal === "athletic_performance" ||
    profile.specialMode === "high_protein_athlete" ||
    profile.athleticLevel === "intermediate" ||
    profile.athleticLevel === "athlete"
  ) {
    sources.push("ISSN (Jäger et al., 2017) & Morton et al. (2018) — Hypertrophie (1,8–2,0 g/kg) & Performance");
  }

  return {
    bmi,
    bmiCategoryFr,
    wthr,
    wthrStatusFr,
    bri,
    briCategoryFr,
    rfmPct,
    rfmMethodLabel,
    athleticCoherenceNote,
    bmrKcal,
    estimatedMaintenanceKcal,
    autoTargetIntakeKcal,
    targetIntakeKcal,
    clinicalFloorKcal: clinicalFloor,
    safetyFloorApplied,
    minorSafetyLock,
    autoWaterMl,
    perMealProteinBolusG,
    workoutRefuelEligible,
    targets: {
      proteinG,
      carbsG,
      fatG,
      fiberG,
      waterMl,
      sodiumMaxMg,
    },
    sources,
  };
}

/**
 * Calcule la dépense NETTE d'une séance au-dessus du métabolisme de repos (MET - 1),
 * selon la convention du Compendium of Physical Activities 2024.
 */
export function computeWorkoutNetCalories(
  weightKg: number,
  bmrKcal: number,
  met: number,
  durationMinutes: number
): number {
  const perMinuteGross = (3.5 * weightKg * met) / 200;
  const perMinuteRest = bmrKcal / 1440;
  return Math.max(1, Math.round(durationMinutes * Math.max(0, perMinuteGross - perMinuteRest)));
}

/**
 * Bilan énergétique quotidien complet ZÉRO DOUBLE COMPTAGE :
 * Total Dépensé = BMR + NEAT postural + Pas hors-séance dédupliqués + Exercices nets + Digestion TEF
 */
export function computeDailyEnergyBalance(params: {
  dateKey: string;
  profile: UserProfile;
  meals: MealEntry[];
  stepLog?: DailyStepLog;
  workouts: WorkoutSession[];
  waterLog?: WaterLog;
}): DailyEnergyBalance {
  const { dateKey, profile, meals, stepLog, workouts, waterLog } = params;
  const anthro = computeAnthropometrics(profile);

  const dayMeals = meals.filter((m) => m.dateKey === dateKey);
  const dayWorkouts = workouts.filter((w) => w.dateKey === dateKey);

  let intakeKcal = 0;
  let intakeMinKcal = 0;
  let intakeMaxKcal = 0;
  let novaWeightedSum = 0;
  let totalGlycemicLoad = 0;

  const macros = {
    proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0, sugarG: 0, satFatG: 0, sodiumMg: 0,
  };
  const micronutrients = {
    ironMg: 0, magnesiumMg: 0, calciumMg: 0, potassiumMg: 0, vitCMg: 0, vitDUg: 0,
  };

  for (const m of dayMeals) {
    intakeKcal += m.caloriesCentral;
    intakeMinKcal += m.caloriesMin;
    intakeMaxKcal += m.caloriesMax;
    novaWeightedSum += m.novaGroup * Math.max(1, m.caloriesCentral);
    totalGlycemicLoad += m.glycemicLoad;

    macros.proteinG += m.macros.proteinG;
    macros.carbsG += m.macros.carbsG;
    macros.fatG += m.macros.fatG;
    macros.fiberG += m.macros.fiberG;
    macros.sugarG += m.macros.sugarG;
    macros.satFatG += m.macros.satFatG;
    macros.sodiumMg += m.macros.sodiumMg;

    micronutrients.ironMg += m.micronutrients.ironMg;
    micronutrients.magnesiumMg += m.micronutrients.magnesiumMg;
    micronutrients.calciumMg += m.micronutrients.calciumMg;
    micronutrients.potassiumMg += m.micronutrients.potassiumMg;
    micronutrients.vitCMg += m.micronutrients.vitCMg;
    micronutrients.vitDUg += m.micronutrients.vitDUg;
  }

  // Arrondis propres
  macros.proteinG = +macros.proteinG.toFixed(1);
  macros.carbsG = +macros.carbsG.toFixed(1);
  macros.fatG = +macros.fatG.toFixed(1);
  macros.fiberG = +macros.fiberG.toFixed(1);
  macros.sugarG = +macros.sugarG.toFixed(1);
  macros.satFatG = +macros.satFatG.toFixed(1);
  macros.sodiumMg = Math.round(macros.sodiumMg);

  micronutrients.ironMg = +micronutrients.ironMg.toFixed(1);
  micronutrients.magnesiumMg = +micronutrients.magnesiumMg.toFixed(1);
  micronutrients.calciumMg = +micronutrients.calciumMg.toFixed(1);
  micronutrients.potassiumMg = +micronutrients.potassiumMg.toFixed(1);
  micronutrients.vitCMg = +micronutrients.vitCMg.toFixed(1);
  micronutrients.vitDUg = +micronutrients.vitDUg.toFixed(1);

  const avgNovaGroup =
    intakeKcal > 0 ? +(novaWeightedSum / intakeKcal).toFixed(1) : 1;

  // TEF différencié par macronutriment (25% protéines, 7.5% glucides, 1.5% lipides)
  const tefKcal = Math.round(
    macros.proteinG * 4 * 0.25 +
      macros.carbsG * 4 * 0.075 +
      macros.fatG * 9 * 0.015
  );

  // Déduplication stricte des pas inclus dans des séances enregistrées
  const rawSteps = Math.max(0, Math.min(100000, Math.round(stepLog?.steps ?? 0)));
  let overlapStepsDeducted = 0;
  let workoutMinutes = 0;
  let netWorkoutsKcal = 0;

  for (const w of dayWorkouts) {
    workoutMinutes += w.durationMinutes;
    netWorkoutsKcal += w.netCaloriesBurned;
    overlapStepsDeducted += w.estimatedStepsOverlap;
  }

  const effectiveNeatSteps = Math.max(0, rawSteps - overlapStepsDeducted);
  const safeHeightCm = Math.max(
    120,
    Math.min(230, Number.isFinite(profile.heightCm) ? profile.heightCm : 170)
  );
  const safeWeightKg = Math.max(
    30,
    Math.min(250, Number.isFinite(profile.weightKg) ? profile.weightKg : 75)
  );
  const strideM = (safeHeightCm / 100) * 0.415;
  const stepDistanceKm = +((rawSteps * strideM) / 1000).toFixed(2);
  const netStepsKcal = Math.round(effectiveNeatSteps * 0.04 * (safeWeightKg / 70));

  const nonAmbulatoryNeatKcal = Math.round(
    anthro.bmrKcal * ACTIVITY_NEAT_FACTORS[profile.activityProfile]
  );

  const totalExpenditureKcal =
    anthro.bmrKcal +
    nonAmbulatoryNeatKcal +
    netStepsKcal +
    netWorkoutsKcal +
    tefKcal;

  const netBalanceKcal = intakeKcal - totalExpenditureKcal;
  const sportRefuelKcal = anthro.workoutRefuelEligible ? netWorkoutsKcal : 0;
  const effectiveTargetIntakeKcal = Math.min(5500, anthro.targetIntakeKcal + sportRefuelKcal);
  const remainingToTargetKcal = effectiveTargetIntakeKcal - intakeKcal;

  let statusFr = "Équilibre neutre";
  if (intakeKcal === 0) {
    statusFr = "Aucun repas enregistré ce jour";
  } else if (profile.primaryGoal === "muscle_gain") {
    if (netBalanceKcal < -100) {
      statusFr = "En déficit malgré l'objectif Prise de masse — ajoutez une collation protéinée";
    } else if (netBalanceKcal <= 120) {
      statusFr = "Maintien musculaire — léger appoint conseillé pour construire du muscle";
    } else if (netBalanceKcal <= 500) {
      statusFr = "Surplus propre optimal (anabolisme musculaire ISSN)";
    } else {
      statusFr = "Surplus élevé — surveillez l'excédent pour limiter le stockage adipeux";
    }
  } else if (profile.primaryGoal === "athletic_performance") {
    if (netBalanceKcal < -250) {
      statusFr = "Sous-ravitaillement sportif — rechargez en glucides & protéines";
    } else if (netBalanceKcal <= 250) {
      statusFr = "Disponibilité énergétique optimale (performance & récupération)";
    } else {
      statusFr = "Recharge glycogénique haute";
    }
  } else if (netBalanceKcal <= -750) {
    statusFr = "Déficit fort — veillez aux protéines & récupération";
  } else if (netBalanceKcal <= -180) {
    statusFr = "Déficit modéré optimal (perte de gras durable)";
  } else if (netBalanceKcal < 180) {
    statusFr = "Zone de maintien / recomposition";
  } else {
    statusFr = "Surplus énergétique";
  }

  return {
    dateKey,
    intakeKcal,
    intakeMinKcal,
    intakeMaxKcal,
    macros,
    micronutrients,
    avgNovaGroup,
    totalGlycemicLoad: +totalGlycemicLoad.toFixed(1),
    bmrKcal: anthro.bmrKcal,
    nonAmbulatoryNeatKcal,
    rawSteps,
    overlapStepsDeducted,
    effectiveNeatSteps,
    stepDistanceKm,
    netStepsKcal,
    workoutMinutes,
    netWorkoutsKcal,
    sportRefuelKcal,
    tefKcal,
    totalExpenditureKcal,
    netBalanceKcal,
    targetIntakeKcal: effectiveTargetIntakeKcal,
    remainingToTargetKcal,
    statusFr,
    waterMl: Math.max(0, Math.min(10000, Math.round(waterLog?.milliliters ?? 0))),
    mealsCount: dayMeals.length,
  };
}

/**
 * Lissage EMA adapté aux pesées irrégulières (Codex) + Décodeur de Balance (Claude)
 */
export function computeWeightTrendAndScaleDecoder(
  weights: WeightEntry[],
  dailyBalances: DailyEnergyBalance[]
): { trend: WeightTrendPoint[]; decoder: ScaleDecoderInsight | null } {
  if (weights.length === 0) return { trend: [], decoder: null };

  // Agréger les doublons journaliers par moyenne puis trier par date croissante
  const byDay = new Map<string, number[]>();
  for (const w of weights) {
    const arr = byDay.get(w.dateKey) ?? [];
    arr.push(w.weightKg);
    byDay.set(w.dateKey, arr);
  }

  const sortedDays = Array.from(byDay.entries())
    .map(([dateKey, vals]) => ({
      dateKey,
      rawWeightKg: +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2),
    }))
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey));

  const halfLifeDays = 7;
  const trend: WeightTrendPoint[] = [];
  let prevEma = sortedDays[0].rawWeightKg;
  let prevDateMs = new Date(`${sortedDays[0].dateKey}T12:00:00Z`).getTime();
  const startEma = prevEma;

  for (let i = 0; i < sortedDays.length; i++) {
    const cur = sortedDays[i];
    const curDateMs = new Date(`${cur.dateKey}T12:00:00Z`).getTime();
    const deltaDays = Math.max(1, Math.round((curDateMs - prevDateMs) / 86400000));
    const alpha = i === 0 ? 1 : 1 - Math.pow(2, -deltaDays / halfLifeDays);
    const ema = i === 0 ? cur.rawWeightKg : +(alpha * cur.rawWeightKg + (1 - alpha) * prevEma).toFixed(2);
    trend.push({
      dateKey: cur.dateKey,
      rawWeightKg: cur.rawWeightKg,
      emaWeightKg: ema,
      deltaFromStartKg: +(ema - startEma).toFixed(2),
    });
    prevEma = ema;
    prevDateMs = curDateMs;
  }

  if (trend.length < 2) return { trend, decoder: null };

  const last = trend[trend.length - 1];
  const prev = trend[trend.length - 2];
  const deltaKg = +(last.rawWeightKg - prev.rawWeightKg).toFixed(2);
  const prevDayBalance = dailyBalances.find((d) => d.dateKey === prev.dateKey);

  if (deltaKg >= 0.35 && prevDayBalance) {
    if (prevDayBalance.macros.sodiumMg >= 2100) {
      return {
        trend,
        decoder: {
          triggered: true,
          likelyCause: "sodium_water",
          deltaKg,
          headlineFr: `Décodeur de Balance : +${formatDecimalFr(deltaKg, 2)} kg = rétention d'eau probable, PAS de graisse`,
          explanationFr: `Hier vous avez consommé ${prevDayBalance.macros.sodiumMg} mg de sodium (au-dessus du seuil de 2 000 mg) avec un bilan de ${prevDayBalance.netBalanceKcal} kcal. Il est physiquement impossible de stocker ${formatDecimalFr(deltaKg, 2)} kg de graisse en 24 h : votre tendance lissée reste fiable.`,
        },
      };
    }
    if (prevDayBalance.macros.carbsG >= 210 || prevDayBalance.netBalanceKcal <= 0) {
      return {
        trend,
        decoder: {
          triggered: true,
          likelyCause: "glycogen_water",
          deltaKg,
          headlineFr: `Décodeur de Balance : rebond hydrique de +${formatDecimalFr(deltaKg, 2)} kg expliqué`,
          explanationFr: `Chaque gramme de glycogène musculaire stocké après un repas glucidique (${Math.round(prevDayBalance.macros.carbsG)} g hier) lie ~3 g d'eau. Votre tendance de fond (EMA 7j) est à ${formatDecimalFr(last.emaWeightKg, 2)} kg — continuez sereinement.`,
        },
      };
    }
  }

  const totalDelta = last.deltaFromStartKg;
  if (totalDelta <= -0.25) {
    return {
      trend,
      decoder: {
        triggered: false,
        likelyCause: "steady_fat_loss",
        deltaKg: totalDelta,
        headlineFr: `Tendance de fond solide : ${formatDecimalFr(totalDelta, 2)} kg sur la courbe lissée`,
        explanationFr: `Votre courbe lissée (EMA 7j : ${formatDecimalFr(last.emaWeightKg, 2)} kg) confirme une perte réelle au-delà des fluctuations quotidiennes d'hydratation.`,
      },
    };
  }

  return {
    trend,
    decoder: {
      triggered: false,
      likelyCause: "surplus_trend",
      deltaKg: totalDelta,
      headlineFr: `Courbe lissée stable (${formatDecimalFr(last.emaWeightKg, 2)} kg)`,
      explanationFr: "Comparez toujours la courbe lissée (EMA) sur 7 à 14 jours plutôt qu'une pesée isolée.",
    },
  };
}

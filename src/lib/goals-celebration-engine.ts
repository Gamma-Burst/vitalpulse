import {
  BodyMeasurementEntry,
  ChallengeMetric,
  CustomChallenge,
  DailyEnergyBalance,
  FastingConfig,
  MealEntry,
  UserProfile,
  WeightEntry,
  WorkoutSession,
} from "@/types/vitalpulse";
import { formatDecimalFr } from "@/lib/decimal-utils";

export interface GoalMetricSpec {
  metric: ChallengeMetric;
  labelFr: string;
  shortLabelFr: string;
  mode: "auto" | "manual";
  isMilestone: boolean;
  defaultTarget: number;
  defaultUnit: string;
  min: number;
  max: number;
  decimal?: boolean;
  descriptionHintFr: string;
}

export const GOAL_METRIC_CATALOG: Record<ChallengeMetric, GoalMetricSpec> = {
  steps: {
    metric: "steps",
    labelFr: "Pas quotidiens (suivi auto)",
    shortLabelFr: "Pas",
    mode: "auto",
    isMilestone: false,
    defaultTarget: 8500,
    defaultUnit: "pas",
    min: 500,
    max: 50000,
    descriptionHintFr: "Atteint automatiquement dès que vos pas du jour atteignent la cible.",
  },
  water: {
    metric: "water",
    labelFr: "Hydratation / jour (suivi auto)",
    shortLabelFr: "Eau",
    mode: "auto",
    isMilestone: false,
    defaultTarget: 2200,
    defaultUnit: "mL",
    min: 500,
    max: 5000,
    descriptionHintFr: "Atteint dès que vos ajouts d'eau quotidiens valident ce volume.",
  },
  protein: {
    metric: "protein",
    labelFr: "Protéines / jour (suivi auto)",
    shortLabelFr: "Protéines",
    mode: "auto",
    isMilestone: false,
    defaultTarget: 120,
    defaultUnit: "g",
    min: 20,
    max: 350,
    descriptionHintFr: "Additionne les protéines de vos repas scannés ou saisis aujourd'hui.",
  },
  fiber: {
    metric: "fiber",
    labelFr: "Fibres / jour (suivi auto)",
    shortLabelFr: "Fibres",
    mode: "auto",
    isMilestone: false,
    defaultTarget: 28,
    defaultUnit: "g",
    min: 5,
    max: 120,
    descriptionHintFr: "Suit automatiquement vos apports quotidiens en fibres.",
  },
  workout_minutes: {
    metric: "workout_minutes",
    labelFr: "Sport aujourd'hui en min (suivi auto)",
    shortLabelFr: "Sport / jour",
    mode: "auto",
    isMilestone: false,
    defaultTarget: 25,
    defaultUnit: "min",
    min: 5,
    max: 300,
    descriptionHintFr: "Validé dès que vos séances du jour atteignent cette durée.",
  },
  workouts_week: {
    metric: "workouts_week",
    labelFr: "Séances de sport sur 7 jours (suivi auto)",
    shortLabelFr: "Séances / 7j",
    mode: "auto",
    isMilestone: false,
    defaultTarget: 3,
    defaultUnit: "séances",
    min: 1,
    max: 21,
    descriptionHintFr: "Compte vos séances enregistrées sur les 7 derniers jours.",
  },
  fasting_hours: {
    metric: "fasting_hours",
    labelFr: "Durée de jeûne (suivi auto)",
    shortLabelFr: "Jeûne",
    mode: "auto",
    isMilestone: false,
    defaultTarget: 16,
    defaultUnit: "h",
    min: 8,
    max: 72,
    decimal: true,
    descriptionHintFr: "Validé dès qu'un jeûne terminé aujourd'hui ou en cours atteint cette durée.",
  },
  calories_target: {
    metric: "calories_target",
    labelFr: "Budget calories maîtrisé / jour (suivi auto)",
    shortLabelFr: "Budget kcal",
    mode: "auto",
    isMilestone: false,
    defaultTarget: 2000,
    defaultUnit: "kcal max",
    min: 900,
    max: 6000,
    descriptionHintFr: "Validé dès 2 repas enregistrés si le total reste sous ce plafond.",
  },
  weight_target: {
    metric: "weight_target",
    labelFr: "Palier de poids cible (suivi auto)",
    shortLabelFr: "Poids cible",
    mode: "auto",
    isMilestone: true,
    defaultTarget: 75,
    defaultUnit: "kg",
    min: 35,
    max: 250,
    decimal: true,
    descriptionHintFr: "Félicitation spéciale dès que votre pesée atteint ce poids cible.",
  },
  waist_target: {
    metric: "waist_target",
    labelFr: "Tour de taille cible (suivi auto)",
    shortLabelFr: "Tour taille",
    mode: "auto",
    isMilestone: true,
    defaultTarget: 84,
    defaultUnit: "cm",
    min: 50,
    max: 200,
    decimal: true,
    descriptionHintFr: "Félicitation spéciale dès que votre mesure de taille atteint cette cible.",
  },
  no_nova4: {
    metric: "no_nova4",
    labelFr: "Journée sans ultra-transformé NOVA 4 (auto ou 1 clic)",
    shortLabelFr: "Zéro NOVA 4",
    mode: "manual",
    isMilestone: false,
    defaultTarget: 1,
    defaultUnit: "journée",
    min: 1,
    max: 1,
    descriptionHintFr: "Auto si ≥ 2 repas saisis sans NOVA 4, ou validation manuelle en 1 clic.",
  },
  custom: {
    metric: "custom",
    labelFr: "Habitude ou défi libre (validation 1 clic)",
    shortLabelFr: "Perso",
    mode: "manual",
    isMilestone: false,
    defaultTarget: 1,
    defaultUnit: "validation",
    min: 1,
    max: 999,
    descriptionHintFr: "Ex : 0 soda aujourd'hui, 10 min d'étirements, dormir 8h, cuisiner maison.",
  },
};

export interface GoalEvaluationContext {
  profile: UserProfile;
  todayKey: string;
  todayBalance: DailyEnergyBalance;
  meals: MealEntry[];
  workouts: WorkoutSession[];
  weights: WeightEntry[];
  measurements: BodyMeasurementEntry[];
  fasting: FastingConfig;
  nowMs?: number;
}

export interface GoalEvaluationSnapshot {
  challengeId: string;
  metric: ChallengeMetric;
  mode: "auto" | "manual";
  isMilestoneMetric: boolean;
  reachedToday: boolean;
  progressPct: number;
  currentValue: number;
  targetValue: number;
  currentLabelFr: string;
  streakDays: number;
  totalCompletedDays: number;
}

export interface GoalCelebrationEvent {
  key: string;
  goalId: string;
  goalTitle: string;
  badgeFr: string;
  titleFr: string;
  bodyFr: string;
  streakDays: number;
  isMilestone: boolean;
}

export interface GoalReconciliationResult {
  updatedChallenges: CustomChallenge[];
  hasStateChanges: boolean;
  evaluationsById: Record<string, GoalEvaluationSnapshot>;
  newlyUnlockedEvents: GoalCelebrationEvent[];
}

function shiftUtcDateKey(dateKey: string, deltaDays: number): string {
  const parts = dateKey.split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) {
    return dateKey;
  }
  const [y, m, d] = parts;
  const ms = Date.UTC(y, m - 1, d + deltaDays);
  return new Date(ms).toISOString().slice(0, 10);
}

export function computeStreakDays(completedDates: string[], todayKey: string): number {
  if (!completedDates.length) return 0;
  const set = new Set(completedDates);
  const startOffset = set.has(todayKey) ? 0 : set.has(shiftUtcDateKey(todayKey, -1)) ? -1 : null;
  if (startOffset === null) return 0;

  let streak = 0;
  let cursor = startOffset;
  while (set.has(shiftUtcDateKey(todayKey, cursor))) {
    streak += 1;
    cursor -= 1;
    if (streak > 365) break;
  }
  return streak;
}

function getLatestWeightKg(weights: WeightEntry[], fallbackWeightKg: number): number {
  if (!weights.length) return fallbackWeightKg;
  const sorted = [...weights].sort((a, b) => {
    const byDate = b.dateKey.localeCompare(a.dateKey);
    if (byDate !== 0) return byDate;
    return b.timestamp.localeCompare(a.timestamp);
  });
  return sorted[0]?.weightKg ?? fallbackWeightKg;
}

function getLatestWaistCm(
  measurements: BodyMeasurementEntry[],
  weights: WeightEntry[],
  fallbackWaistCm?: number
): number | null {
  const mWithWaist = measurements
    .filter((m) => typeof m.waistCm === "number" && Number.isFinite(m.waistCm) && m.waistCm > 0)
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  if (mWithWaist[0]?.waistCm) return mWithWaist[0].waistCm;

  const wWithWaist = weights
    .filter((w) => typeof w.waistCm === "number" && Number.isFinite(w.waistCm) && w.waistCm > 0)
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  if (wWithWaist[0]?.waistCm) return wWithWaist[0].waistCm;

  return typeof fallbackWaistCm === "number" && fallbackWaistCm > 0 ? fallbackWaistCm : null;
}

function resolveWeightDirection(challenge: CustomChallenge, profile: UserProfile): "at_least" | "at_most" {
  if (challenge.direction === "at_least" || challenge.direction === "at_most") {
    return challenge.direction;
  }
  if (typeof challenge.startValue === "number" && Number.isFinite(challenge.startValue)) {
    return challenge.targetValue > challenge.startValue ? "at_least" : "at_most";
  }
  return profile.primaryGoal === "muscle_gain" ? "at_least" : "at_most";
}

function countWorkoutsLast7Days(workouts: WorkoutSession[], todayKey: string): number {
  const cutoffKey = shiftUtcDateKey(todayKey, -6);
  return workouts.filter((w) => w.dateKey >= cutoffKey && w.dateKey <= todayKey).length;
}

function getTodayBestFastingHours(fasting: FastingConfig, todayKey: string, nowMs: number): number {
  let maxHours = 0;
  for (const record of fasting.history || []) {
    const endKey = typeof record.endIso === "string" ? record.endIso.slice(0, 10) : "";
    if (endKey === todayKey && Number.isFinite(record.durationHours)) {
      maxHours = Math.max(maxHours, record.durationHours);
    }
  }
  if (fasting.activeStartIso) {
    const startMs = Date.parse(fasting.activeStartIso);
    if (Number.isFinite(startMs) && nowMs > startMs) {
      const activeHours = (nowMs - startMs) / 3600000;
      maxHours = Math.max(maxHours, activeHours);
    }
  }
  return Math.round(maxHours * 10) / 10;
}

export function evaluateGoalProgress(
  challenge: CustomChallenge,
  ctx: GoalEvaluationContext
): GoalEvaluationSnapshot {
  const spec = GOAL_METRIC_CATALOG[challenge.metric] ?? GOAL_METRIC_CATALOG.custom;
  const target = Math.max(0.1, Number.isFinite(challenge.targetValue) ? challenge.targetValue : spec.defaultTarget);
  const completedDates = Array.isArray(challenge.completedDates) ? challenge.completedDates : [];
  const manualCheckedToday = completedDates.includes(ctx.todayKey);
  const nowMs = ctx.nowMs ?? Date.now();

  let currentValue = manualCheckedToday ? target : 0;
  let reachedToday = manualCheckedToday;
  let progressPct = manualCheckedToday ? 100 : 0;
  let currentLabelFr = manualCheckedToday ? "Validé aujourd'hui" : "À valider aujourd'hui";

  switch (challenge.metric) {
    case "steps": {
      currentValue = Math.max(0, Math.round(ctx.todayBalance.rawSteps));
      reachedToday = currentValue >= target;
      progressPct = Math.min(100, Math.round((currentValue / target) * 100));
      currentLabelFr = `${currentValue.toLocaleString("fr-FR")} / ${Math.round(target).toLocaleString("fr-FR")} ${challenge.unit || "pas"}`;
      break;
    }
    case "water": {
      currentValue = Math.max(0, Math.round(ctx.todayBalance.waterMl));
      reachedToday = currentValue >= target;
      progressPct = Math.min(100, Math.round((currentValue / target) * 100));
      currentLabelFr = `${currentValue.toLocaleString("fr-FR")} / ${Math.round(target).toLocaleString("fr-FR")} ${challenge.unit || "mL"}`;
      break;
    }
    case "protein": {
      currentValue = Math.max(0, Math.round(ctx.todayBalance.macros.proteinG));
      reachedToday = currentValue >= target;
      progressPct = Math.min(100, Math.round((currentValue / target) * 100));
      currentLabelFr = `${currentValue} / ${Math.round(target)} ${challenge.unit || "g"}`;
      break;
    }
    case "fiber": {
      currentValue = Math.max(0, Math.round(ctx.todayBalance.macros.fiberG));
      reachedToday = currentValue >= target;
      progressPct = Math.min(100, Math.round((currentValue / target) * 100));
      currentLabelFr = `${currentValue} / ${Math.round(target)} ${challenge.unit || "g"}`;
      break;
    }
    case "workout_minutes": {
      currentValue = Math.max(0, Math.round(ctx.todayBalance.workoutMinutes));
      reachedToday = currentValue >= target;
      progressPct = Math.min(100, Math.round((currentValue / target) * 100));
      currentLabelFr = `${currentValue} / ${Math.round(target)} ${challenge.unit || "min"}`;
      break;
    }
    case "workouts_week": {
      currentValue = countWorkoutsLast7Days(ctx.workouts, ctx.todayKey);
      reachedToday = currentValue >= target;
      progressPct = Math.min(100, Math.round((currentValue / target) * 100));
      currentLabelFr = `${currentValue} / ${Math.round(target)} ${challenge.unit || "séances"} (7 j)`;
      break;
    }
    case "fasting_hours": {
      currentValue = getTodayBestFastingHours(ctx.fasting, ctx.todayKey, nowMs);
      reachedToday = currentValue >= target;
      progressPct = Math.min(100, Math.round((currentValue / target) * 100));
      currentLabelFr = `${currentValue} / ${target} ${challenge.unit || "h"}`;
      break;
    }
    case "calories_target": {
      currentValue = Math.max(0, Math.round(ctx.todayBalance.intakeKcal));
      const hasEnoughMeals = ctx.todayBalance.mealsCount >= 2 && currentValue > 0;
      reachedToday = manualCheckedToday || (hasEnoughMeals && currentValue <= target);
      progressPct = reachedToday
        ? 100
        : currentValue === 0
          ? 0
          : Math.min(95, Math.round((ctx.todayBalance.mealsCount / 3) * 75));
      currentLabelFr = `${currentValue} kcal (${ctx.todayBalance.mealsCount} repas · max ${Math.round(target)})`;
      break;
    }
    case "no_nova4": {
      const todayMeals = ctx.meals.filter((m) => m.dateKey === ctx.todayKey);
      const cleanAuto =
        todayMeals.length >= 2 && todayMeals.every((m) => (m.novaGroup ?? 1) < 4);
      reachedToday = manualCheckedToday || cleanAuto;
      currentValue = reachedToday ? 1 : 0;
      progressPct = reachedToday ? 100 : todayMeals.length === 1 ? 50 : 0;
      currentLabelFr = reachedToday
        ? "Aucun ultra-transformé NOVA 4 aujourd'hui"
        : todayMeals.some((m) => m.novaGroup === 4)
          ? "1 produit NOVA 4 repéré · À ajuster"
          : `${todayMeals.length}/2 repas saisis ou validation 1 clic`;
      break;
    }
    case "weight_target": {
      const latestKg = getLatestWeightKg(ctx.weights, ctx.profile.weightKg);
      const direction = resolveWeightDirection(challenge, ctx.profile);
      currentValue = latestKg;
      reachedToday =
        direction === "at_most" ? latestKg <= target : latestKg >= target;
      const startKg =
        typeof challenge.startValue === "number" &&
        Number.isFinite(challenge.startValue) &&
        Math.abs(challenge.startValue - target) >= 0.2
          ? challenge.startValue
          : null;
      if (reachedToday) {
        progressPct = 100;
      } else if (startKg !== null) {
        const totalDelta = Math.abs(startKg - target);
        const doneDelta =
          direction === "at_most" ? startKg - latestKg : latestKg - startKg;
        progressPct = Math.max(0, Math.min(99, Math.round((doneDelta / totalDelta) * 100)));
      } else {
        const ratio = Math.min(latestKg, target) / Math.max(latestKg, target);
        progressPct = Math.min(95, Math.max(5, Math.round(ratio * 100)));
      }
      currentLabelFr = `${formatDecimalFr(latestKg)} kg → cible ${formatDecimalFr(target)} kg`;
      break;
    }
    case "waist_target": {
      const latestWaist = getLatestWaistCm(
        ctx.measurements,
        ctx.weights,
        ctx.profile.waistCm
      );
      currentValue = latestWaist ?? 0;
      reachedToday = latestWaist !== null && latestWaist <= target;
      if (reachedToday) {
        progressPct = 100;
      } else if (latestWaist !== null) {
        const startCm =
          typeof challenge.startValue === "number" &&
          Number.isFinite(challenge.startValue) &&
          challenge.startValue > target
            ? challenge.startValue
            : latestWaist + 4;
        const done = Math.max(0, startCm - latestWaist);
        const span = Math.max(1, startCm - target);
        progressPct = Math.max(5, Math.min(99, Math.round((done / span) * 100)));
      } else {
        progressPct = 0;
      }
      currentLabelFr =
        latestWaist !== null
          ? `${formatDecimalFr(latestWaist)} cm → cible ≤ ${formatDecimalFr(target)} cm`
          : `Ajoutez votre tour de taille dans Corps (cible ≤ ${target.toFixed(1)} cm)`;
      break;
    }
    case "custom":
    default: {
      currentValue = manualCheckedToday ? target : 0;
      reachedToday = manualCheckedToday;
      progressPct = manualCheckedToday ? 100 : 0;
      currentLabelFr = manualCheckedToday
        ? `Validé aujourd'hui (${challenge.targetValue} ${challenge.unit || ""})`.trim()
        : `À valider (${challenge.targetValue} ${challenge.unit || "objectif"})`.trim();
      break;
    }
  }

  return {
    challengeId: challenge.id,
    metric: challenge.metric,
    mode: spec.mode,
    isMilestoneMetric: spec.isMilestone,
    reachedToday,
    progressPct,
    currentValue,
    targetValue: target,
    currentLabelFr,
    streakDays: computeStreakDays(completedDates, ctx.todayKey),
    totalCompletedDays: completedDates.length,
  };
}

function buildEncouragementMessage(params: {
  challenge: CustomChallenge;
  snapshot: GoalEvaluationSnapshot;
  firstName: string;
}): { badgeFr: string; titleFr: string; bodyFr: string } {
  const { challenge, snapshot, firstName } = params;
  const who = firstName ? ` ${firstName}` : "";
  const whyPart = challenge.personalWhy?.trim()
    ? ` Rappelez-vous pourquoi vous le faites : « ${challenge.personalWhy.trim()} ».`
    : "";

  if (snapshot.isMilestoneMetric) {
    return {
      badgeFr: "Palier majeur atteint",
      titleFr: `🎉 Félicitations${who} ! Palier validé : ${challenge.title}`,
      bodyFr: `Vous venez d'atteindre ${snapshot.currentLabelFr}. Votre constance porte ses fruits — soyez fier(ère) de cette avancée et continuez avec la même régularité !${whyPart}`,
    };
  }

  if (snapshot.totalCompletedDays >= challenge.durationDays) {
    return {
      badgeFr: `Défi ${challenge.durationDays} j bouclé`,
      titleFr: `🏆 Bravo${who} ! Objectif accompli sur ${challenge.durationDays} jours : ${challenge.title}`,
      bodyFr: `Vous avez tenu le cap pendant toute la durée de votre défi (${snapshot.totalCompletedDays}/${challenge.durationDays} jours validés). C'est une vraie victoire d'habitude durable !${whyPart}`,
    };
  }

  if (snapshot.streakDays >= 3) {
    return {
      badgeFr: `Série de ${snapshot.streakDays} jours`,
      titleFr: `🔥 Magnifique série de ${snapshot.streakDays} jours${who} : ${challenge.title}`,
      bodyFr: `Objectif du jour validé (${snapshot.currentLabelFr}) ! ${snapshot.streakDays} jours d'affilée sans lâcher : vous ancrez une habitude solide qui fait toute la différence.${whyPart}`,
    };
  }

  const opener =
    challenge.metric === "steps"
      ? `Cap dépassé aujourd'hui (${snapshot.currentLabelFr}) : votre métabolisme et votre énergie vous remercient !`
      : challenge.metric === "water"
        ? `Hydratation validée (${snapshot.currentLabelFr}) : parfait pour l'énergie, la satiété et la récupération.`
        : challenge.metric === "protein"
          ? `Quota protéines atteint (${snapshot.currentLabelFr}) : idéal pour préserver vos muscles et calmer les fringales.`
          : challenge.metric === "workout_minutes" || challenge.metric === "workouts_week"
            ? `Séance validée (${snapshot.currentLabelFr}) : chaque entraînement renforce votre santé sur le long terme !`
            : `Objectif du jour validé (${snapshot.currentLabelFr}) !`;

  return {
    badgeFr: "Objectif du jour atteint",
    titleFr: `🏆 Bravo${who} ! Objectif atteint : ${challenge.title}`,
    bodyFr: `${opener} Continuez sur cette belle lancée !${whyPart}`,
  };
}

export function reconcileGoalsAndCelebrations(
  challenges: CustomChallenge[],
  ctx: GoalEvaluationContext
): GoalReconciliationResult {
  const evaluationsById: Record<string, GoalEvaluationSnapshot> = {};
  const newlyUnlockedEvents: GoalCelebrationEvent[] = [];
  const updatedChallenges: CustomChallenge[] = [];
  let hasStateChanges = false;
  const firstName = ctx.profile.name?.trim().split(/\s+/)[0] || "";

  for (const ch of challenges) {
    const initialSnapshot = evaluateGoalProgress(ch, ctx);
    const spec = GOAL_METRIC_CATALOG[ch.metric] ?? GOAL_METRIC_CATALOG.custom;
    const prevCompleted = Array.isArray(ch.completedDates) ? ch.completedDates : [];
    const prevNotified = Array.isArray(ch.notifiedKeys) ? ch.notifiedKeys : [];

    let nextCompleted = prevCompleted;
    let nextNotified = prevNotified;
    let itemChanged = false;

    const primaryKey = spec.isMilestone
      ? `goal:${ch.id}:milestone:${initialSnapshot.targetValue}`
      : `goal:${ch.id}:daily:${ctx.todayKey}`;

    if (ch.active && initialSnapshot.reachedToday) {
      if (!prevCompleted.includes(ctx.todayKey)) {
        nextCompleted = [...prevCompleted, ctx.todayKey].slice(-180);
        itemChanged = true;
      }

      const effectiveSnapshot: GoalEvaluationSnapshot = itemChanged
        ? {
            ...initialSnapshot,
            streakDays: computeStreakDays(nextCompleted, ctx.todayKey),
            totalCompletedDays: nextCompleted.length,
          }
        : initialSnapshot;
      evaluationsById[ch.id] = effectiveSnapshot;

      if (ch.celebrateNotifications !== false && !prevNotified.includes(primaryKey)) {
        nextNotified = [...prevNotified, primaryKey].slice(-120);
        itemChanged = true;

        const copy = buildEncouragementMessage({
          challenge: ch,
          snapshot: effectiveSnapshot,
          firstName,
        });
        newlyUnlockedEvents.push({
          key: primaryKey,
          goalId: ch.id,
          goalTitle: ch.title,
          badgeFr: copy.badgeFr,
          titleFr: copy.titleFr,
          bodyFr: copy.bodyFr,
          streakDays: effectiveSnapshot.streakDays,
          isMilestone: spec.isMilestone,
        });
      }
    } else {
      evaluationsById[ch.id] = initialSnapshot;
      // Si l'utilisateur décoche un défi manuel du jour, réarmer la notification du jour
      if (!initialSnapshot.reachedToday && spec.mode === "manual" && prevNotified.includes(primaryKey)) {
        nextNotified = prevNotified.filter((k) => k !== primaryKey);
        itemChanged = true;
      }
    }

    if (itemChanged) {
      hasStateChanges = true;
      updatedChallenges.push({
        ...ch,
        completedDates: nextCompleted,
        notifiedKeys: nextNotified,
      });
    } else {
      updatedChallenges.push(ch);
    }
  }

  return {
    updatedChallenges,
    hasStateChanges,
    evaluationsById,
    newlyUnlockedEvents,
  };
}

export function buildTestEncouragementEvent(
  profileName?: string,
  goalTitle?: string
): GoalCelebrationEvent {
  const firstName = profileName?.trim().split(/\s+/)[0] || "";
  const who = firstName ? ` ${firstName}` : "";
  const label = goalTitle?.trim() || "Votre objectif quotidien";
  return {
    key: `goal-test-${Date.now()}`,
    goalId: "test",
    goalTitle: label,
    badgeFr: "Aperçu encouragement",
    titleFr: `🎉 Bravo${who} ! Objectif atteint : ${label}`,
    bodyFr:
      "C'est exactement ce message de félicitations (et cette notification téléphone) que vous recevrez dès qu'un de vos objectifs personnels est validé. Continuez comme ça !",
    streakDays: 3,
    isMilestone: false,
  };
}

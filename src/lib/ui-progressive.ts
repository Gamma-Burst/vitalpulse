import { DailyEnergyBalance } from "@/types/vitalpulse";

export function clampRingProgress(value: number, target: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(target) || target <= 0 || value <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(1, value / target));
}

export interface WaterWaveGeometry {
  ratio: number;
  levelY: number;
  waveAmplitude: number;
  isEmpty: boolean;
  isFull: boolean;
}

/**
 * Calcule la hauteur de remplissage et l'amplitude sinusoïdale dans un viewBox 64x64 (disque r=23).
 */
export function computeWaterWaveGeometry(waterMl: number, targetMl: number): WaterWaveGeometry {
  const ratio = clampRingProgress(waterMl, targetMl);
  const levelY = +(55 - 46 * ratio).toFixed(2);
  const isEmpty = ratio <= 0.01;
  const isFull = ratio >= 0.99;
  const waveAmplitude =
    isEmpty || isFull ? 0 : +Math.min(2.2, 46 * ratio, 46 * (1 - ratio)).toFixed(2);

  return {
    ratio,
    levelY,
    waveAmplitude,
    isEmpty,
    isFull,
  };
}

export interface WeeklyDayStripItem {
  dateKey: string;
  dayLetter: string;
  progress: number;
  state: "optimal" | "gentle" | "logged" | "empty";
}

const WEEKDAY_LETTERS = ["D", "L", "M", "M", "J", "V", "S"];

export function buildWeeklyAdherenceStrip(balances: DailyEnergyBalance[]): WeeklyDayStripItem[] {
  return balances.slice(-7).map((b) => {
    const [y, m, d] = b.dateKey.split("-").map(Number);
    const dt = y && m && d ? new Date(y, m - 1, d) : new Date();
    const dayLetter = WEEKDAY_LETTERS[dt.getDay()] ?? "J";
    const hasActivityOrMeal = b.mealsCount > 0 || b.rawSteps > 1500;
    const target = Math.max(1200, b.targetIntakeKcal || 2000);
    const progress = clampRingProgress(b.intakeKcal, target);

    let state: WeeklyDayStripItem["state"] = "empty";
    if (!hasActivityOrMeal) {
      state = "empty";
    } else if (b.intakeKcal > 0 && Math.abs(b.intakeKcal - target) <= target * 0.16) {
      state = "optimal";
    } else if (b.intakeKcal > target * 1.16) {
      // Approche bienveillante Gentler Streak : pas de sanction visuelle rouge
      state = "gentle";
    } else {
      state = "logged";
    }

    return {
      dateKey: b.dateKey,
      dayLetter,
      progress,
      state,
    };
  });
}

export type SodiumCeilingStatus = "safe" | "near_limit" | "exceeded";

export function evaluateSodiumCeilingStatus(
  sodiumMg: number,
  maxMg: number = 2000
): SodiumCeilingStatus {
  if (!Number.isFinite(sodiumMg) || sodiumMg <= 0) return "safe";
  if (sodiumMg > maxMg) return "exceeded";
  if (sodiumMg >= maxMg * 0.85) return "near_limit";
  return "safe";
}

export interface WeeklyCalorieBankReport {
  daysCount: number;
  weeklyIntakeKcal: number;
  weeklyTargetKcal: number;
  weeklyExpenditureKcal: number;
  pleasureMarginKcal: number;
  netBalanceKcal: number;
  guidanceFr: string;
}

/**
 * Inspiré du Secret du Poids : budget énergétique hebdomadaire pour compenser sans culpabilité.
 */
export function computeWeeklyCalorieBank(balances: DailyEnergyBalance[]): WeeklyCalorieBankReport {
  const recent = balances.slice(-7);
  const weeklyIntakeKcal = Math.round(recent.reduce((acc, b) => acc + b.intakeKcal, 0));
  const weeklyTargetKcal = Math.round(
    recent.reduce((acc, b) => acc + (b.targetIntakeKcal || 1900), 0)
  );
  const weeklyExpenditureKcal = Math.round(
    recent.reduce((acc, b) => acc + b.totalExpenditureKcal, 0)
  );
  const netBalanceKcal = weeklyIntakeKcal - weeklyExpenditureKcal;
  const pleasureMarginKcal = Math.round(weeklyTargetKcal - weeklyIntakeKcal);

  const guidanceFr =
    pleasureMarginKcal >= 250
      ? `Marge souple de +${pleasureMarginKcal} kcal disponible cette semaine pour un repas plaisir sans sortir de votre trajectoire.`
      : pleasureMarginKcal >= -250
        ? "Équilibre parfait sur 7 jours : vous êtes pile dans votre budget énergétique."
        : `Léger dépassement hebdo (${Math.abs(pleasureMarginKcal)} kcal) — lissable très facilement avec +2 000 pas/j ou 150 kcal plus léger sur 3 jours.`;

  return {
    daysCount: recent.length,
    weeklyIntakeKcal,
    weeklyTargetKcal,
    weeklyExpenditureKcal,
    pleasureMarginKcal,
    netBalanceKcal,
    guidanceFr,
  };
}

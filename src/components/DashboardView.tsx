"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  Camera,
  Check,
  ChefHat,
  ChevronRight,
  Droplets,
  FlaskConical,
  Image as ImageIcon,
  Ruler,
  ScanBarcode,
  SlidersHorizontal,
  Sparkles,
  Watch,
} from "lucide-react";
import {
  AnthropometricReport,
  BloodPanelEntry,
  BodyMeasurementEntry,
  DailyEnergyBalance,
  DashboardWidgetId,
  FastingConfig,
  MealEntry,
  ScaleDecoderInsight,
  UserProfile,
  WearableSyncState,
  WeightTrendPoint,
} from "@/types/vitalpulse";
import type { BodyLabSubTab } from "@/components/BodyLabView";
import { EnergyActivityChart } from "@/components/EnergyActivityChart";
import { DetailSheet } from "@/components/ui/DetailSheet";
import { InfoTip } from "@/components/ui/InfoTip";
import { HeroEnergyOrb, LiveTileIcon } from "@/components/ui/LiveMetricVisuals";
import {
  computeFastingLiveStatus,
  formatAllowedDurationFr,
  formatClockHm,
} from "@/lib/fasting-engine";
import {
  buildWeeklyAdherenceStrip,
  clampRingProgress,
  computeWeeklyCalorieBank,
  evaluateSodiumCeilingStatus,
} from "@/lib/ui-progressive";
import { getTodayMindsetLesson } from "@/data/mindset-lessons";
import { triggerLightHaptic } from "@/lib/native-bridge";

export type DashboardTabTarget =
  | "dashboard"
  | "scanner"
  | "fridge"
  | "activity"
  | "fasting"
  | "bodylab"
  | "profile"
  | "medical";

export interface DashboardViewProps {
  profile: UserProfile;
  anthro: AnthropometricReport;
  todayBalance: DailyEnergyBalance;
  recentBalances: DailyEnergyBalance[];
  weightTrend: WeightTrendPoint[];
  scaleDecoder: ScaleDecoderInsight | null;
  mealsWithPhotos: MealEntry[];
  rangeDays: 7 | 14 | 30;
  onRangeChange: (days: 7 | 14 | 30) => void;
  onAddWater: (ml: number) => void;
  onQuickLogWeight: (weightKg: number, waistCm?: number) => void;
  onNavigateTab: (tab: DashboardTabTarget, subTab?: BodyLabSubTab) => void;
  onSelectMealToInspect: (mealId: string) => void;
  onSwitchToRealProfile: () => void;
  latestMeasurement?: BodyMeasurementEntry | null;
  latestBloodPanel?: BloodPanelEntry | null;
  photosCount?: number;
  fasting?: FastingConfig;
  enabledWidgets?: DashboardWidgetId[];
  wearable?: WearableSyncState;
  completedMindsetDates?: string[];
  onToggleWidget?: (id: DashboardWidgetId) => void;
  onOpenWearables?: () => void;
  onOpenBarcode?: () => void;
  onToggleMindsetToday?: () => void;
  onNavigateFasting?: () => void;
  onSetWaterToday?: (ml: number) => void;
  onUpdateProfilePatch?: (patch: Partial<UserProfile>) => void;
  onUpdateTodaySteps?: (steps: number) => void;
}

type ActiveSheetKind =
  | null
  | "energy"
  | "fasting"
  | "hydration"
  | "steps_watch"
  | "weight_ema"
  | "barcode_meals"
  | "body_blood"
  | "micronutrients"
  | "weekly_bank"
  | "mindset_coach"
  | "widgets_config";

const WIDGET_LABELS: Record<DashboardWidgetId, string> = {
  fasting: "Jeûne & OMAD",
  hydration: "Hydratation",
  steps_watch: "Pas & Montre",
  weight_ema: "Poids lissé EMA",
  barcode_meals: "Assiettes & Scan",
  body_blood: "Corps & Sang",
  micronutrients: "Micronutriments",
  weekly_bank: "Banque 7 jours",
  mindset_coach: "Leçon du jour",
};

const DEFAULT_FALLBACK_WIDGETS: DashboardWidgetId[] = [
  "fasting",
  "hydration",
  "steps_watch",
  "weight_ema",
  "barcode_meals",
  "body_blood",
  "micronutrients",
  "weekly_bank",
  "mindset_coach",
];

export function DashboardView({
  profile,
  anthro,
  todayBalance,
  recentBalances,
  weightTrend,
  scaleDecoder,
  mealsWithPhotos,
  rangeDays,
  onRangeChange,
  onAddWater,
  onQuickLogWeight,
  onNavigateTab,
  onSelectMealToInspect,
  onSwitchToRealProfile,
  latestMeasurement = null,
  latestBloodPanel = null,
  photosCount = 0,
  fasting,
  enabledWidgets = DEFAULT_FALLBACK_WIDGETS,
  wearable,
  completedMindsetDates = [],
  onToggleWidget,
  onOpenWearables,
  onOpenBarcode,
  onToggleMindsetToday,
  onNavigateFasting,
  onSetWaterToday,
  onUpdateProfilePatch,
  onUpdateTodaySteps,
}: DashboardViewProps) {
  const shouldReduceMotion = useReducedMotion();
  const [sheet, setSheet] = useState<ActiveSheetKind>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [waterGoalDraft, setWaterGoalDraft] = useState<string>(
    String(profile.dailyWaterGoalMl ?? anthro.targets.waterMl)
  );
  const [stepGoalDraft, setStepGoalDraft] = useState<string>(String(profile.dailyStepGoal));
  const [todayStepsDraft, setTodayStepsDraft] = useState<string>(String(todayBalance.rawSteps));
  const [calorieGoalDraft, setCalorieGoalDraft] = useState<string>(
    String(profile.dailyCalorieGoalOverride ?? anthro.targetIntakeKcal)
  );
  const [sheetFeedback, setSheetFeedback] = useState<string | null>(null);

  useEffect(() => {
    setWaterGoalDraft(String(profile.dailyWaterGoalMl ?? anthro.targets.waterMl));
  }, [profile.dailyWaterGoalMl, anthro.targets.waterMl]);

  useEffect(() => {
    setStepGoalDraft(String(profile.dailyStepGoal));
  }, [profile.dailyStepGoal]);

  useEffect(() => {
    setTodayStepsDraft(String(todayBalance.rawSteps));
  }, [todayBalance.rawSteps]);

  useEffect(() => {
    setCalorieGoalDraft(String(profile.dailyCalorieGoalOverride ?? anthro.targetIntakeKcal));
  }, [profile.dailyCalorieGoalOverride, anthro.targetIntakeKcal]);

  useEffect(() => {
    if (!sheet) setSheetFeedback(null);
  }, [sheet]);

  useEffect(() => {
    if (!fasting || fasting.protocolId === "none") return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [fasting]);

  const weeklyStrip = useMemo(
    () => buildWeeklyAdherenceStrip(recentBalances),
    [recentBalances]
  );

  const weeklyBank = useMemo(
    () => computeWeeklyCalorieBank(recentBalances),
    [recentBalances]
  );

  const fastingLive = useMemo(
    () => (fasting ? computeFastingLiveStatus(fasting, nowMs) : null),
    [fasting, nowMs]
  );

  const dietBadge = useMemo(() => {
    if (profile.specialMode === "ketogenic") {
      return { label: "Cétogène (Keto)", cls: "border-emerald-400/35 bg-emerald-500/15 text-emerald-300" };
    }
    if (profile.specialMode === "rebalancing" || profile.primaryGoal === "rebalancing") {
      return { label: "Rééquilibrage", cls: "border-sky-400/35 bg-sky-500/15 text-sky-300" };
    }
    if (profile.specialMode === "glp1_muscle_guard") {
      return { label: "GLP-1 Protection", cls: "border-violet-400/35 bg-violet-500/15 text-violet-300" };
    }
    if (profile.specialMode === "glycemic_shield") {
      return { label: "Bouclier glycémique", cls: "border-amber-400/35 bg-amber-500/15 text-amber-300" };
    }
    if (profile.specialMode === "cardio_low_sodium") {
      return { label: "Cardio <1500mg Na", cls: "border-rose-400/35 bg-rose-500/15 text-rose-300" };
    }
    return null;
  }, [profile.primaryGoal, profile.specialMode]);

  const todayLesson = useMemo(
    () => getTodayMindsetLesson(todayBalance.dateKey),
    [todayBalance.dateKey]
  );
  const lessonDoneToday = completedMindsetDates.includes(todayBalance.dateKey);

  const sodiumStatus = evaluateSodiumCeilingStatus(
    todayBalance.macros.sodiumMg,
    anthro.targets.sodiumMaxMg
  );

  const activeBurnedKcal = todayBalance.netStepsKcal + todayBalance.netWorkoutsKcal;
  const visibleWidgets =
    enabledWidgets.length > 0 ? enabledWidgets : DEFAULT_FALLBACK_WIDGETS;

  const hasSafetyFlags =
    Boolean(latestBloodPanel?.analysis.criticalFlags?.length) ||
    Boolean(latestBloodPanel?.analysis.renalProteinGuardTriggered) ||
    anthro.safetyFloorApplied;

  const avgStats = useMemo(() => {
    const calDays = recentBalances.filter((b) => b.intakeKcal > 0);
    const stepDays = recentBalances.filter((b) => b.rawSteps > 0);
    const splitAvg = (
      arr: DailyEnergyBalance[],
      fn: (b: DailyEnergyBalance) => number
    ) => {
      if (arr.length === 0) return { prev: null as number | null, curr: null as number | null };
      if (arr.length === 1) {
        return { prev: null as number | null, curr: Math.round(fn(arr[0])) };
      }
      const half = Math.floor(arr.length / 2);
      const prevPeriod = arr.slice(0, half);
      const currPeriod = arr.slice(half);
      const avg = (list: DailyEnergyBalance[]) =>
        Math.round(list.reduce((s, b) => s + fn(b), 0) / list.length);
      return { prev: avg(prevPeriod), curr: avg(currPeriod) };
    };
    const cal = splitAvg(calDays, (b) => b.intakeKcal);
    const steps = splitAvg(stepDays, (b) => b.rawSteps);
    return {
      avgCalPrev: cal.prev,
      avgCalCurr: cal.curr,
      avgStepsPrev: steps.prev,
      avgStepsCurr: steps.curr,
    };
  }, [recentBalances]);

  function openSheet(next: ActiveSheetKind) {
    triggerLightHaptic();
    setSheet(next);
  }

  return (
    <div className="space-y-4">
      {/* Bannière Mode Démo discrète */}
      {profile.isDemoProfile && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-400/35 bg-amber-500/10 px-4 py-2.5 text-xs">
          <div className="flex items-center gap-2 text-amber-200">
            <Sparkles className="h-4 w-4 text-amber-300 shrink-0" />
            <span>
              <strong>Mode Démo actif</strong> · Exemples biologiques et repas préchargés.
            </span>
          </div>
          <button
            type="button"
            onClick={onSwitchToRealProfile}
            className="rounded-full bg-amber-400 px-3 py-1 text-[11px] font-extrabold text-slate-950 hover:bg-amber-300"
          >
            Créer mon vrai profil
          </button>
        </div>
      )}

      {/* Alerte clinique permanente si biomarqueur critique / KDIGO / plancher calorique */}
      {hasSafetyFlags && (
        <div className="rounded-2xl border border-rose-400/45 bg-rose-500/15 px-4 py-3 text-xs text-rose-100">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-rose-300 shrink-0 mt-0.5" />
              <div className="space-y-1">
                {latestBloodPanel?.analysis.criticalFlags?.map((flag, i) => (
                  <p key={i} className="font-bold">
                    {flag}
                  </p>
                ))}
                {latestBloodPanel?.analysis.renalProteinGuardTriggered && (
                  <p className="font-semibold">
                    Garde rénale KDIGO active : vérifiez votre apport protéique avec votre médecin avant de viser une cible élevée.
                  </p>
                )}
                {anthro.safetyFloorApplied && (
                  <p>
                    Plancher calorique clinique actif ({anthro.targetIntakeKcal} kcal/j minimum pour préserver votre métabolisme).
                  </p>
                )}
              </div>
            </div>
            {latestBloodPanel && (
              <button
                type="button"
                onClick={() => onNavigateTab("bodylab", "blood")}
                className="rounded-full border border-rose-300/40 px-3 py-1 text-[11px] font-bold text-rose-100 hover:bg-rose-500/20"
              >
                Voir bilan sanguin →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Bandeau supérieur épuré : Salutation + Ruban 7 jours + Config Widgets */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-medium text-slate-400">
              Bonjour <strong className="text-white">{profile.name}</strong> · IMC {anthro.bmi}
              <InfoTip term="bmi" />
            </p>
            {dietBadge && (
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${dietBadge.cls}`}
              >
                {dietBadge.label}
              </span>
            )}
          </div>
          <div className="mt-1.5 flex items-center gap-1.5" aria-label="Régularité 7 derniers jours">
            {weeklyStrip.map((day) => {
              const dotClass =
                day.state === "optimal"
                  ? "bg-emerald-400 text-slate-950"
                  : day.state === "gentle"
                    ? "bg-amber-400/80 text-slate-950"
                    : day.state === "logged"
                      ? "bg-cyan-400/80 text-slate-950"
                      : "bg-slate-500/20 text-slate-400";
              return (
                <span
                  key={day.dateKey}
                  title={`${day.dateKey}`}
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-extrabold ${dotClass}`}
                >
                  {day.dayLetter}
                </span>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={() => openSheet("widgets_config")}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-500/25 bg-slate-500/10 px-3.5 py-1.5 text-xs font-bold text-slate-200 hover:border-emerald-400/40"
        >
          <SlidersHorizontal className="h-3.5 w-3.5 text-emerald-400" />
          Widgets ({visibleWidgets.length})
        </button>
      </div>

      {/* Bandeau temps réel Jeûne / Fenêtre repas autorisée */}
      {fasting && fasting.protocolId !== "none" && fastingLive && (
        <div
          className={`flex flex-wrap items-center justify-between gap-3 rounded-3xl border px-4 py-3 transition-all ${
            fastingLive.mode === "eating_window"
              ? "border-emerald-400/45 bg-emerald-500/12 shadow-[0_0_24px_rgba(16,185,129,0.16)]"
              : fastingLive.mode === "fasting"
                ? "border-amber-400/40 bg-amber-500/10"
                : "border-cyan-400/35 bg-cyan-500/10"
          }`}
        >
          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                  fastingLive.mode === "eating_window"
                    ? "bg-emerald-400/20 text-emerald-200"
                    : fastingLive.mode === "fasting"
                      ? "bg-amber-400/20 text-amber-200"
                      : "bg-cyan-400/20 text-cyan-200"
                }`}
              >
                {fastingLive.mode === "eating_window"
                  ? `Autorisé à manger · ${fastingLive.protocol.badge}`
                  : fastingLive.mode === "fasting"
                    ? `En période de jeûne · ${fastingLive.protocol.badge}`
                    : fastingLive.mode === "scheduled"
                      ? `Jeûne planifié · ${fastingLive.protocol.badge}`
                      : `${fastingLive.protocol.badge} prêt`}
              </span>
              <InfoTip term="fasting_omad" />
              {fasting.dailyScheduleEnabled && fasting.eatingWindowStartHm && (
                <span className="text-[11px] font-medium text-slate-300">
                  Cycle quotidien · repas à {fasting.eatingWindowStartHm}
                </span>
              )}
            </div>
            <p className="text-sm font-extrabold text-white">
              {fastingLive.mode === "eating_window"
                ? `Vous êtes autorisé à manger pendant ${formatAllowedDurationFr(
                    fastingLive.eatWindowHours
                  )} · reste ${fastingLive.countdownHms}`
                : fastingLive.mode === "fasting"
                  ? `${fastingLive.currentPhase.titleFr} (${fastingLive.currentPhase.shortBadge}) · encore ${fastingLive.countdownHms}`
                  : fastingLive.mode === "scheduled"
                    ? `${fastingLive.headlineFr} · début dans ${fastingLive.countdownHms}`
                    : "Activez le cycle automatique ou démarrez votre minuteur"}
            </p>
            <p className="text-[11px] text-slate-300">
              {fastingLive.mode === "eating_window"
                ? `Fin de fenêtre repas / reprise du jeûne à ${
                    fastingLive.endIso ? formatClockHm(fastingLive.endIso) : "--:--"
                  }`
                : fastingLive.mode === "fasting"
                  ? `Vous serez autorisé à manger à ${
                      fastingLive.endIso ? formatClockHm(fastingLive.endIso) : "--:--"
                    } pendant ${formatAllowedDurationFr(fastingLive.eatWindowHours)}`
                  : fastingLive.currentPhase.physiologicalSummaryFr}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (onNavigateFasting) onNavigateFasting();
              else onNavigateTab("fasting");
            }}
            className="shrink-0 rounded-2xl border border-white/15 bg-slate-900/80 px-3.5 py-2 text-xs font-bold text-white hover:border-emerald-400/50 hover:text-emerald-200"
          >
            Minuteur &amp; cycle →
          </button>
        </div>
      )}

      {/* HERO ENERGIE LEAN : 1 Orbe + 3 chiffres + 3 barres macro -> clic = DetailSheet complet */}
      <motion.section
        initial={shouldReduceMotion ? undefined : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <button
          type="button"
          onClick={() => openSheet("energy")}
          className="vp-card-accent group w-full rounded-3xl p-4 sm:p-6 text-left transition hover:border-emerald-400/50 active:scale-[0.995]"
        >
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:justify-between">
            <HeroEnergyOrb
              consumedKcal={todayBalance.intakeKcal}
              targetKcal={anthro.targetIntakeKcal}
              burnedKcal={activeBurnedKcal}
              size={156}
            />

            <div className="w-full flex-1 space-y-4">
              <div className="grid grid-cols-3 gap-2 text-center sm:text-left">
                <div>
                  <p className="text-[11px] text-slate-400">Mangé</p>
                  <p className="font-display text-lg font-extrabold text-white tabular-nums">
                    {todayBalance.intakeKcal}{" "}
                    <span className="text-[11px] font-normal text-slate-400">kcal</span>
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400">Bougé</p>
                  <p className="font-display text-lg font-extrabold text-emerald-300 tabular-nums">
                    +{activeBurnedKcal}{" "}
                    <span className="text-[11px] font-normal text-slate-400">kcal</span>
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400">
                    Bilan net <InfoTip term="net_balance" />
                  </p>
                  <p
                    className={`font-display text-lg font-extrabold tabular-nums ${
                      todayBalance.netBalanceKcal <= 0 ? "text-cyan-300" : "text-amber-300"
                    }`}
                  >
                    {todayBalance.netBalanceKcal > 0
                      ? `+${todayBalance.netBalanceKcal}`
                      : todayBalance.netBalanceKcal}
                  </p>
                </div>
              </div>

              {/* 3 Barres Macro GPU scaleX */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  {
                    label: "Protéines",
                    val: todayBalance.macros.proteinG,
                    target: anthro.targets.proteinG,
                    color: "bg-emerald-400",
                  },
                  {
                    label: "Glucides",
                    val: todayBalance.macros.carbsG,
                    target: anthro.targets.carbsG,
                    color: "bg-cyan-400",
                  },
                  {
                    label: "Lipides",
                    val: todayBalance.macros.fatG,
                    target: anthro.targets.fatG,
                    color: "bg-amber-400",
                  },
                ].map((macro) => {
                  const pct = clampRingProgress(macro.val, macro.target);
                  return (
                    <div key={macro.label}>
                      <div className="flex justify-between text-[11px] tabular-nums">
                        <span className="text-slate-400">{macro.label}</span>
                        <span className="font-bold text-white">{Math.round(macro.val)} g</span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-500/20">
                        <div
                          className={`vp-gpu-bar h-full w-full rounded-full ${macro.color}`}
                          style={{ transform: `scaleX(${Math.max(0.04, pct)})` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>
                  {todayBalance.mealsCount} repas · Cible {anthro.targetIntakeKcal} kcal/j
                </span>
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-300 group-hover:translate-x-0.5 transition">
                  Courbes &amp; détails
                  <ChevronRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </div>
          </div>
        </button>
      </motion.section>

      {/* Raccourcis rapides Photo / Code-barres / Frigo (1 ligne compacte) */}
      <div className="grid grid-cols-3 gap-2.5">
        <button
          type="button"
          onClick={() => {
            triggerLightHaptic();
            onNavigateTab("scanner");
          }}
          className="vp-card flex items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-xs font-bold text-white hover:border-emerald-400/40"
        >
          <Camera className="h-4 w-4 text-emerald-400" />
          <span className="truncate">Photo Plat</span>
        </button>

        <button
          type="button"
          onClick={() => {
            triggerLightHaptic();
            if (onOpenBarcode) onOpenBarcode();
            else onNavigateTab("scanner");
          }}
          className="vp-card flex items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-xs font-bold text-white hover:border-amber-400/40"
        >
          <ScanBarcode className="h-4 w-4 text-amber-300" />
          <span className="truncate">Code-barres</span>
        </button>

        <button
          type="button"
          onClick={() => {
            triggerLightHaptic();
            onNavigateTab("fridge");
          }}
          className="vp-card flex items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-xs font-bold text-white hover:border-cyan-400/40"
        >
          <ChefHat className="h-4 w-4 text-cyan-300" />
          <span className="truncate">Photo Frigo</span>
        </button>
      </div>

      {/* GRILLE BENTO DES WIDGETS PERSONNALISABLES (Lean : 1 icône animée + 1 chiffre clé) */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {visibleWidgets.includes("fasting") && (
          <button
            type="button"
            onClick={() => openSheet("fasting")}
            className={`vp-card flex flex-col justify-between gap-2.5 rounded-3xl p-4 text-left ${
              fastingLive?.mode === "eating_window"
                ? "border-emerald-400/50 hover:border-emerald-400/75"
                : "hover:border-amber-400/45"
            }`}
          >
            <div className="flex w-full items-start justify-between gap-2">
              <LiveTileIcon
                kind="fasting"
                ratio={fastingLive?.progress ?? 0.25}
                active={fastingLive?.mode === "fasting" || fastingLive?.mode === "eating_window"}
              />
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                  fastingLive?.mode === "eating_window"
                    ? "border-emerald-400/35 bg-emerald-500/15 text-emerald-300"
                    : "border-amber-400/30 bg-amber-500/15 text-amber-300"
                }`}
              >
                {fastingLive?.protocol.badge || "16:8"}
              </span>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400">
                {fastingLive?.mode === "eating_window"
                  ? "Fenêtre repas ouverte"
                  : fastingLive?.mode === "fasting"
                    ? "Jeûne en cours"
                    : "Jeûne & OMAD"}
                <InfoTip term="fasting_omad" />
              </p>
              <p className="font-display text-lg font-extrabold text-white tabular-nums">
                {fastingLive?.mode === "fasting" || fastingLive?.mode === "eating_window"
                  ? fastingLive.countdownHms
                  : fastingLive?.mode === "scheduled"
                    ? "Planifié"
                    : "Prêt"}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-slate-400">
                {fastingLive?.mode === "eating_window"
                  ? `Autorisé ${formatAllowedDurationFr(fastingLive.eatWindowHours)}`
                  : fastingLive?.mode === "fasting"
                    ? `${fastingLive.currentPhase.titleFr} · repas ${
                        fastingLive.endIso ? formatClockHm(fastingLive.endIso) : ""
                      }`
                    : "Chrono & 6 phases"}
              </p>
            </div>
          </button>
        )}

        {visibleWidgets.includes("hydration") && (
          <div className="vp-card flex flex-col justify-between gap-2 rounded-3xl p-4">
            <button
              type="button"
              onClick={() => openSheet("hydration")}
              className="flex flex-col items-start gap-2.5 text-left"
            >
              <div className="flex w-full items-start justify-between gap-2">
                <LiveTileIcon
                  kind="hydration"
                  ratio={clampRingProgress(todayBalance.waterMl, anthro.targets.waterMl)}
                />
                <span className="text-[11px] font-bold text-sky-300 tabular-nums">
                  {Math.round(
                    clampRingProgress(todayBalance.waterMl, anthro.targets.waterMl) * 100
                  )}{" "}
                  %
                </span>
              </div>
              <div>
                <p className="flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                  <span>Hydratation</span>
                  <InfoTip term="hydration_efsa" />
                </p>
                <p className="font-display text-lg font-extrabold text-white tabular-nums">
                  {todayBalance.waterMl} mL
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  Cible {anthro.targets.waterMl} mL
                </p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => {
                triggerLightHaptic();
                onAddWater(250);
              }}
              className="w-full rounded-xl bg-sky-500/15 py-1.5 text-xs font-bold text-sky-300 border border-sky-400/30 hover:bg-sky-500/25"
            >
              +250 mL
            </button>
          </div>
        )}

        {visibleWidgets.includes("steps_watch") && (
          <button
            type="button"
            onClick={() => openSheet("steps_watch")}
            className="vp-card flex flex-col justify-between gap-2.5 rounded-3xl p-4 text-left hover:border-emerald-400/45"
          >
            <div className="flex w-full items-start justify-between gap-2">
              <LiveTileIcon
                kind="steps_watch"
                ratio={clampRingProgress(todayBalance.rawSteps, profile.dailyStepGoal)}
              />
              {wearable?.lastHeartRateBpm ? (
                <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold text-rose-300 tabular-nums">
                  {wearable.lastHeartRateBpm} BPM
                </span>
              ) : (
                <Watch className="h-4 w-4 text-slate-400" />
              )}
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400">Pas &amp; Montre</p>
              <p className="font-display text-lg font-extrabold text-white tabular-nums">
                {todayBalance.rawSteps.toLocaleString("fr-FR")}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-slate-400">
                Objectif {profile.dailyStepGoal.toLocaleString("fr-FR")} ·{" "}
                {todayBalance.stepDistanceKm} km
              </p>
            </div>
          </button>
        )}

        {visibleWidgets.includes("weight_ema") && (
          <button
            type="button"
            onClick={() => openSheet("weight_ema")}
            className="vp-card flex flex-col justify-between gap-2.5 rounded-3xl p-4 text-left hover:border-cyan-400/45"
          >
            <div className="flex w-full items-start justify-between gap-2">
              <LiveTileIcon kind="weight_ema" />
              <span className="text-[11px] font-bold text-cyan-300 tabular-nums">
                Cible {profile.targetWeightKg} kg
              </span>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400">
                Poids lissé EMA <InfoTip term="weight_ema" />
              </p>
              <p className="font-display text-lg font-extrabold text-white tabular-nums">
                {profile.weightKg} kg
              </p>
              <p className="mt-0.5 truncate text-[11px] text-slate-400">
                {scaleDecoder?.triggered ? scaleDecoder.headlineFr : "Courbe anti-yo-yo"}
              </p>
            </div>
          </button>
        )}

        {visibleWidgets.includes("barcode_meals") && (
          <button
            type="button"
            onClick={() => openSheet("barcode_meals")}
            className="vp-card flex flex-col justify-between gap-2.5 rounded-3xl p-4 text-left hover:border-amber-400/45"
          >
            <div className="flex w-full items-start justify-between gap-2">
              <LiveTileIcon kind="barcode_meals" />
              <span className="rounded-full bg-slate-500/15 px-2 py-0.5 text-[10px] font-bold text-slate-300 tabular-nums">
                {mealsWithPhotos.length} photos
              </span>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400">Assiettes &amp; Scan</p>
              <p className="font-display text-lg font-extrabold text-white tabular-nums">
                {todayBalance.mealsCount} repas
              </p>
              <p className="mt-0.5 truncate text-[11px] text-slate-400">
                Galerie plats + code-barres
              </p>
            </div>
          </button>
        )}

        {visibleWidgets.includes("body_blood") && (
          <button
            type="button"
            onClick={() => openSheet("body_blood")}
            className="vp-card flex flex-col justify-between gap-2.5 rounded-3xl p-4 text-left hover:border-rose-400/45"
          >
            <div className="flex w-full items-start justify-between gap-2">
              <LiveTileIcon kind="body_blood" />
              <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold text-rose-300 tabular-nums">
                {latestBloodPanel ? `${latestBloodPanel.analysis.overallScore}/100` : `${photosCount} photos`}
              </span>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400">Corps &amp; Sang</p>
              <p className="font-display text-lg font-extrabold text-white tabular-nums">
                {latestMeasurement?.waistCm
                  ? `${latestMeasurement.waistCm} cm`
                  : `IMC ${anthro.bmi}`}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-slate-400">
                Mensurations, bilan &amp; évolution
              </p>
            </div>
          </button>
        )}

        {visibleWidgets.includes("micronutrients") && (
          <button
            type="button"
            onClick={() => openSheet("micronutrients")}
            className="vp-card flex flex-col justify-between gap-2.5 rounded-3xl p-4 text-left hover:border-violet-400/45"
          >
            <div className="flex w-full items-start justify-between gap-2">
              <LiveTileIcon
                kind="micronutrients"
                ratio={clampRingProgress(
                  todayBalance.macros.fiberG,
                  anthro.targets.fiberG
                )}
              />
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  sodiumStatus === "exceeded"
                    ? "bg-rose-500/20 text-rose-300"
                    : sodiumStatus === "near_limit"
                      ? "bg-amber-500/20 text-amber-300"
                      : "bg-emerald-500/15 text-emerald-300"
                }`}
              >
                {sodiumStatus === "exceeded"
                  ? "Sel élevé"
                  : sodiumStatus === "near_limit"
                    ? "Sel proche"
                    : "Sel OK"}
              </span>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400">
                Micronutriments <InfoTip term="sodium_oms" />
              </p>
              <p className="font-display text-lg font-extrabold text-white tabular-nums">
                {Math.round(todayBalance.macros.fiberG)} / {anthro.targets.fiberG} g
              </p>
              <p className="mt-0.5 truncate text-[11px] text-slate-400">
                Fibres, Fer, Mg, Vit D &amp; Sodium
              </p>
            </div>
          </button>
        )}

        {visibleWidgets.includes("weekly_bank") && (
          <button
            type="button"
            onClick={() => openSheet("weekly_bank")}
            className="vp-card flex flex-col justify-between gap-2.5 rounded-3xl p-4 text-left hover:border-emerald-400/45"
          >
            <div className="flex w-full items-start justify-between gap-2">
              <LiveTileIcon kind="weekly_bank" />
              <span className="text-[10px] font-bold text-slate-400">7 jours</span>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400">
                Banque hebdo <InfoTip term="weekly_bank" />
              </p>
              <p className="font-display text-lg font-extrabold text-white tabular-nums">
                {weeklyBank.pleasureMarginKcal >= 0 ? "+" : ""}
                {weeklyBank.pleasureMarginKcal} kcal
              </p>
              <p className="mt-0.5 truncate text-[11px] text-slate-400">
                Marge plaisir &amp; équilibre
              </p>
            </div>
          </button>
        )}

        {visibleWidgets.includes("mindset_coach") && (
          <button
            type="button"
            onClick={() => openSheet("mindset_coach")}
            className="vp-card flex flex-col justify-between gap-2.5 rounded-3xl p-4 text-left hover:border-amber-400/45"
          >
            <div className="flex w-full items-start justify-between gap-2">
              <LiveTileIcon kind="mindset_coach" />
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                {lessonDoneToday ? "Lu ✓" : todayLesson.durationLabel}
              </span>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400">Déclic du jour</p>
              <p className="line-clamp-2 text-xs font-bold leading-snug text-white">
                {todayLesson.titleFr}
              </p>
            </div>
          </button>
        )}
      </div>

      {/* SHEET 1 : Énergie & Graphique complet */}
      <DetailSheet
        open={sheet === "energy"}
        onClose={() => setSheet(null)}
        title="Bilan énergétique & tendances"
        subtitle="Calibré Mifflin-St Jeor + ANSES + dépenses réelles sans double comptage"
        size="xl"
      >
        <div className="space-y-5">
          <EnergyActivityChart
            balances={recentBalances}
            weightTrend={weightTrend}
            scaleDecoder={scaleDecoder}
            currentWeightKg={profile.weightKg}
            currentWaistCm={profile.waistCm}
            rangeDays={rangeDays}
            onRangeChange={onRangeChange}
            onQuickLogWeight={onQuickLogWeight}
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-500/20 bg-slate-500/10 p-4 text-xs">
              <p className="font-bold text-white">Moyenne apports sur {rangeDays} j</p>
              <p className="mt-1 font-display text-xl font-extrabold text-emerald-300 tabular-nums">
                {avgStats.avgCalCurr !== null ? `${avgStats.avgCalCurr} kcal/j` : "—"}
              </p>
              <p className="mt-0.5 text-slate-400">
                Période précédente :{" "}
                {avgStats.avgCalPrev !== null
                  ? `${avgStats.avgCalPrev} kcal/j`
                  : "en attente de données (< 2 j)"}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-500/20 bg-slate-500/10 p-4 text-xs">
              <p className="font-bold text-white">Moyenne pas sur {rangeDays} j</p>
              <p className="mt-1 font-display text-xl font-extrabold text-cyan-300 tabular-nums">
                {avgStats.avgStepsCurr !== null
                  ? `${avgStats.avgStepsCurr.toLocaleString("fr-FR")} pas/j`
                  : "—"}
              </p>
              <p className="mt-0.5 text-slate-400">
                Période précédente :{" "}
                {avgStats.avgStepsPrev !== null
                  ? `${avgStats.avgStepsPrev.toLocaleString("fr-FR")} pas/j`
                  : "en attente de données (< 2 j)"}
              </p>
            </div>
          </div>

          {onUpdateProfilePatch && (
            <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/5 p-4 text-xs space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-bold text-white">Cible calorique quotidienne</p>
                  <p className="text-[11px] text-slate-400">
                    Calcul automatique : {anthro.autoTargetIntakeKcal} kcal/j · Plancher clinique :{" "}
                    {anthro.clinicalFloorKcal} kcal/j
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onUpdateProfilePatch({ dailyCalorieGoalOverride: undefined });
                    setCalorieGoalDraft(String(anthro.autoTargetIntakeKcal));
                    setSheetFeedback(
                      `Cible calorique remise en mode Auto (${anthro.autoTargetIntakeKcal} kcal/j).`
                    );
                  }}
                  className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold ${
                    profile.dailyCalorieGoalOverride === undefined
                      ? "border-emerald-400 bg-emerald-500/20 text-emerald-200"
                      : "border-slate-600 text-slate-300 hover:border-emerald-400"
                  }`}
                >
                  Auto ({anthro.autoTargetIntakeKcal} kcal)
                </button>
              </div>
              {anthro.minorSafetyLock ? (
                <p className="text-[11px] text-amber-300">
                  Mode sécurité mineur activé : l&apos;objectif calorique reste calculé automatiquement pour protéger la croissance.
                </p>
              ) : (
                <form
                  className="flex flex-wrap items-center gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const parsed = Number(calorieGoalDraft);
                    const minAllowed = Math.max(1200, anthro.clinicalFloorKcal);
                    const clamped = Math.max(
                      minAllowed,
                      Math.min(
                        4500,
                        Math.round(
                          Number.isFinite(parsed) && parsed > 0
                            ? parsed
                            : anthro.autoTargetIntakeKcal
                        )
                      )
                    );
                    onUpdateProfilePatch({ dailyCalorieGoalOverride: clamped });
                    setCalorieGoalDraft(String(clamped));
                    setSheetFeedback(`Cible calorique enregistrée : ${clamped} kcal/j.`);
                  }}
                >
                  <input
                    type="text"
                    inputMode="numeric"
                    aria-label="Cible calorique personnalisée en kcal"
                    value={calorieGoalDraft}
                    onChange={(e) => setCalorieGoalDraft(e.target.value.replace(/[^\d]/g, ""))}
                    className="w-28 rounded-xl border border-slate-600 bg-slate-950 px-3 py-2 font-bold text-white tabular-nums"
                  />
                  <span className="text-slate-400">
                    kcal/j (min {Math.max(1200, anthro.clinicalFloorKcal)})
                  </span>
                  <button
                    type="submit"
                    className="ml-auto rounded-xl bg-emerald-500 px-3.5 py-2 font-extrabold text-slate-950 hover:bg-emerald-400"
                  >
                    Appliquer
                  </button>
                </form>
              )}
              {sheetFeedback && (
                <p className="text-[11px] font-semibold text-emerald-300">{sheetFeedback}</p>
              )}
            </div>
          )}
        </div>
      </DetailSheet>

      {/* SHEET 2 : Jeûne aperçu */}
      <DetailSheet
        open={sheet === "fasting"}
        onClose={() => setSheet(null)}
        title="Jeûne intermittent & OMAD"
        subtitle={fastingLive?.protocol.title || "Protocole 16:8"}
        size="md"
      >
        <div className="space-y-4">
          <div
            className={`rounded-2xl border p-4 ${
              fastingLive?.mode === "eating_window"
                ? "border-emerald-400/40 bg-emerald-500/12"
                : "border-amber-400/30 bg-amber-500/10"
            }`}
          >
            <p
              className={`text-xs font-semibold ${
                fastingLive?.mode === "eating_window" ? "text-emerald-300" : "text-amber-300"
              }`}
            >
              {fastingLive?.headlineFr || "Prêt"}
            </p>
            <p className="mt-1 font-display text-3xl font-extrabold text-white tabular-nums">
              {fastingLive?.countdownHms || "16:00:00"}
            </p>
            <p className="mt-1 text-xs text-slate-300">
              {fastingLive?.mode === "eating_window"
                ? `Vous êtes autorisé à manger pendant ${formatAllowedDurationFr(
                    fastingLive.eatWindowHours
                  )} (reprise du jeûne à ${
                    fastingLive.endIso ? formatClockHm(fastingLive.endIso) : "--:--"
                  }).`
                : fastingLive?.mode === "fasting"
                  ? `Prochain repas à ${
                      fastingLive.endIso ? formatClockHm(fastingLive.endIso) : "--:--"
                    } pendant ${formatAllowedDurationFr(fastingLive.eatWindowHours)}. ${
                      fastingLive.currentPhase.physiologicalSummaryFr
                    }`
                  : fastingLive?.currentPhase.physiologicalSummaryFr}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSheet(null);
              if (onNavigateFasting) onNavigateFasting();
              else onNavigateTab("fasting");
            }}
            className="w-full rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-extrabold text-slate-950 hover:bg-emerald-400"
          >
            Ouvrir le minuteur &amp; les 6 phases →
          </button>
        </div>
      </DetailSheet>

      {/* SHEET 3 : Hydratation */}
      <DetailSheet
        open={sheet === "hydration"}
        onClose={() => setSheet(null)}
        title="Hydratation quotidienne"
        subtitle="Boissons EFSA ajustées (1 500–3 500 mL/j) ou cible personnalisée"
        icon={<Droplets className="h-5 w-5 text-sky-300" />}
        size="md"
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-sky-400/30 bg-sky-500/10 p-4 text-center">
            <p className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-sky-200">
              <span>Objectif du jour</span>
              <InfoTip term="hydration_efsa" />
            </p>
            <p className="mt-1 font-display text-3xl font-extrabold text-white tabular-nums">
              {todayBalance.waterMl} / {anthro.targets.waterMl} mL
            </p>
            <p className="mt-1 text-xs text-sky-200">
              {profile.dailyWaterGoalMl
                ? `Cible personnalisée (${profile.dailyWaterGoalMl} mL · Auto EFSA : ${anthro.autoWaterMl} mL)`
                : `Calcul Auto EFSA ajusté : ${anthro.autoWaterMl} mL/j hors eau des aliments.`}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[250, 500, 750].map((ml) => (
              <button
                key={ml}
                type="button"
                onClick={() => {
                  triggerLightHaptic();
                  onAddWater(ml);
                }}
                className="rounded-2xl border border-sky-400/35 bg-sky-500/15 py-3 text-sm font-bold text-sky-200 hover:bg-sky-500/25"
              >
                +{ml} mL
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={todayBalance.waterMl <= 0}
              onClick={() => {
                triggerLightHaptic();
                if (onSetWaterToday) {
                  onSetWaterToday(Math.max(0, todayBalance.waterMl - 250));
                } else {
                  onAddWater(-250);
                }
              }}
              className="rounded-2xl border border-slate-600/50 bg-slate-800/60 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-700/60 disabled:opacity-40"
            >
              -250 mL (Corriger)
            </button>
            <button
              type="button"
              disabled={todayBalance.waterMl <= 0}
              onClick={() => {
                triggerLightHaptic();
                if (onSetWaterToday) {
                  onSetWaterToday(0);
                } else {
                  onAddWater(-todayBalance.waterMl);
                }
              }}
              className="rounded-2xl border border-rose-400/30 bg-rose-500/10 py-2.5 text-xs font-bold text-rose-200 hover:bg-rose-500/20 disabled:opacity-40"
            >
              Réinitialiser (0 mL)
            </button>
          </div>

          {onUpdateProfilePatch && (
            <div className="space-y-2.5 rounded-2xl border border-slate-500/25 bg-slate-500/10 p-3.5 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-white">
                  Modifier l&apos;objectif eau / jour
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onUpdateProfilePatch({ dailyWaterGoalMl: undefined });
                    setWaterGoalDraft(String(anthro.autoWaterMl));
                    setSheetFeedback(`Mode Auto EFSA activé (${anthro.autoWaterMl} mL/j).`);
                  }}
                  className={`rounded-lg border px-2 py-0.5 text-[11px] font-bold ${
                    profile.dailyWaterGoalMl === undefined
                      ? "border-sky-400 bg-sky-500/20 text-sky-200"
                      : "border-slate-600 text-slate-300 hover:border-sky-400"
                  }`}
                >
                  Auto ({anthro.autoWaterMl} mL)
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[1500, 2000, 2500, 3000].map((ml) => (
                  <button
                    key={ml}
                    type="button"
                    onClick={() => {
                      onUpdateProfilePatch({ dailyWaterGoalMl: ml });
                      setWaterGoalDraft(String(ml));
                      setSheetFeedback(`Objectif eau mis à jour : ${ml} mL/j.`);
                    }}
                    className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold tabular-nums ${
                      anthro.targets.waterMl === ml
                        ? "border-sky-400 bg-sky-500/25 text-sky-100"
                        : "border-slate-700 bg-slate-900/60 text-slate-300 hover:border-sky-400/50"
                    }`}
                  >
                    {ml} mL
                  </button>
                ))}
              </div>
              <form
                className="flex items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const parsed = Number(waterGoalDraft);
                  const clamped = Math.max(
                    1000,
                    Math.min(4500, Math.round(Number.isFinite(parsed) && parsed > 0 ? parsed : anthro.autoWaterMl))
                  );
                  onUpdateProfilePatch({ dailyWaterGoalMl: clamped });
                  setWaterGoalDraft(String(clamped));
                  setSheetFeedback(`Objectif eau enregistré : ${clamped} mL/j.`);
                }}
              >
                <input
                  type="text"
                  inputMode="numeric"
                  aria-label="Objectif quotidien eau en millilitres"
                  value={waterGoalDraft}
                  onChange={(e) => setWaterGoalDraft(e.target.value.replace(/[^\d]/g, ""))}
                  className="w-28 rounded-xl border border-slate-600 bg-slate-950 px-3 py-2 text-xs font-bold text-white tabular-nums"
                />
                <span className="text-slate-400">mL/j (1 000–4 500)</span>
                <button
                  type="submit"
                  className="ml-auto rounded-xl bg-sky-500 px-3.5 py-2 text-xs font-extrabold text-slate-950 hover:bg-sky-400"
                >
                  Appliquer
                </button>
              </form>
              {Number(waterGoalDraft) > 3500 && (
                <p className="text-[11px] text-amber-300">
                  Au-delà de 3 500 mL/j hors effort prolongé ou forte chaleur, attention au risque de dilution du sodium (hyponatrémie).
                </p>
              )}
              {sheetFeedback && (
                <p className="text-[11px] font-semibold text-emerald-300">{sheetFeedback}</p>
              )}
            </div>
          )}
        </div>
      </DetailSheet>

      {/* SHEET 4 : Pas & Montre */}
      <DetailSheet
        open={sheet === "steps_watch"}
        onClose={() => setSheet(null)}
        title="Activité, Pas & Montre connectée"
        subtitle="Podomètre, objectif quotidien & synchronisation wearable"
        icon={<Watch className="h-5 w-5 text-emerald-300" />}
        size="md"
      >
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-slate-500/10 p-3.5">
              <p className="text-slate-400">Pas aujourd&apos;hui</p>
              <p className="font-display text-2xl font-extrabold text-white tabular-nums">
                {todayBalance.rawSteps.toLocaleString("fr-FR")}
              </p>
              <p className="text-emerald-300">
                Objectif {profile.dailyStepGoal.toLocaleString("fr-FR")} · {todayBalance.stepDistanceKm} km
              </p>
            </div>
            <div className="rounded-2xl bg-slate-500/10 p-3.5">
              <p className="text-slate-400">Dépense mouvement</p>
              <p className="font-display text-2xl font-extrabold text-emerald-300 tabular-nums">
                +{activeBurnedKcal} kcal
              </p>
              <p className="text-slate-400">{todayBalance.workoutMinutes} min de séance</p>
            </div>
          </div>

          {onUpdateTodaySteps && (
            <div className="space-y-2 rounded-2xl border border-slate-500/25 bg-slate-500/10 p-3.5">
              <span className="block font-bold text-white">Ajuster mes pas d&apos;aujourd&apos;hui</span>
              <div className="flex flex-wrap items-center gap-2">
                {[500, 1000, 2500].map((inc) => (
                  <button
                    key={inc}
                    type="button"
                    onClick={() => {
                      const next = Math.min(100000, todayBalance.rawSteps + inc);
                      onUpdateTodaySteps(next);
                      setTodayStepsDraft(String(next));
                      setSheetFeedback(`Pas du jour : ${next.toLocaleString("fr-FR")}.`);
                    }}
                    className="rounded-xl border border-slate-600 bg-slate-900/70 px-2.5 py-1.5 font-bold text-slate-200 hover:border-emerald-400 tabular-nums"
                  >
                    +{inc}
                  </button>
                ))}
                <form
                  className="ml-auto flex items-center gap-1.5"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const val = Math.max(0, Math.min(100000, Math.round(Number(todayStepsDraft) || 0)));
                    onUpdateTodaySteps(val);
                    setTodayStepsDraft(String(val));
                    setSheetFeedback(`Pas du jour enregistrés : ${val.toLocaleString("fr-FR")}.`);
                  }}
                >
                  <input
                    type="text"
                    inputMode="numeric"
                    aria-label="Nombre exact de pas aujourd'hui"
                    value={todayStepsDraft}
                    onChange={(e) => setTodayStepsDraft(e.target.value.replace(/[^\d]/g, ""))}
                    className="w-24 rounded-xl border border-slate-600 bg-slate-950 px-2.5 py-1.5 text-white tabular-nums"
                  />
                  <button
                    type="submit"
                    className="rounded-xl bg-emerald-500 px-3 py-1.5 font-bold text-slate-950 hover:bg-emerald-400"
                  >
                    OK
                  </button>
                </form>
              </div>
            </div>
          )}

          {onUpdateProfilePatch && (
            <div className="space-y-2 rounded-2xl border border-emerald-400/25 bg-emerald-500/5 p-3.5">
              <span className="block font-bold text-white">
                Modifier mon objectif quotidien de pas (1 500–30 000)
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[5000, 7500, 8000, 10000, 12000].map((goal) => (
                  <button
                    key={goal}
                    type="button"
                    onClick={() => {
                      onUpdateProfilePatch({ dailyStepGoal: goal });
                      setStepGoalDraft(String(goal));
                      setSheetFeedback(`Objectif pas défini sur ${goal.toLocaleString("fr-FR")} pas/j.`);
                    }}
                    className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold tabular-nums ${
                      profile.dailyStepGoal === goal
                        ? "border-emerald-400 bg-emerald-500/25 text-emerald-200"
                        : "border-slate-700 bg-slate-900/60 text-slate-300 hover:border-emerald-400/50"
                    }`}
                  >
                    {goal.toLocaleString("fr-FR")}
                  </button>
                ))}
              </div>
              <form
                className="flex items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const parsed = Number(stepGoalDraft);
                  const clamped = Math.max(
                    1500,
                    Math.min(30000, Math.round(Number.isFinite(parsed) && parsed > 0 ? parsed : profile.dailyStepGoal))
                  );
                  onUpdateProfilePatch({ dailyStepGoal: clamped });
                  setStepGoalDraft(String(clamped));
                  setSheetFeedback(`Objectif pas mis à jour : ${clamped.toLocaleString("fr-FR")} pas/j.`);
                }}
              >
                <input
                  type="text"
                  inputMode="numeric"
                  aria-label="Objectif quotidien de pas"
                  value={stepGoalDraft}
                  onChange={(e) => setStepGoalDraft(e.target.value.replace(/[^\d]/g, ""))}
                  className="w-28 rounded-xl border border-slate-600 bg-slate-950 px-3 py-2 font-bold text-white tabular-nums"
                />
                <span className="text-slate-400">pas / jour</span>
                <button
                  type="submit"
                  className="ml-auto rounded-xl bg-emerald-500 px-3.5 py-2 font-extrabold text-slate-950 hover:bg-emerald-400"
                >
                  Appliquer
                </button>
              </form>
              {sheetFeedback && (
                <p className="text-[11px] font-semibold text-emerald-300">{sheetFeedback}</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {onOpenWearables && (
              <button
                type="button"
                onClick={() => {
                  setSheet(null);
                  onOpenWearables();
                }}
                className="rounded-2xl bg-cyan-500 px-4 py-3 text-xs font-extrabold text-slate-950 hover:bg-cyan-400"
              >
                Connecter / Importer ma montre
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setSheet(null);
                onNavigateTab("activity");
              }}
              className="rounded-2xl bg-emerald-500 px-4 py-3 text-xs font-extrabold text-slate-950 hover:bg-emerald-400"
            >
              Ouvrir coach exercices →
            </button>
          </div>
        </div>
      </DetailSheet>

      {/* SHEET 5 : Poids EMA */}
      <DetailSheet
        open={sheet === "weight_ema"}
        onClose={() => setSheet(null)}
        title="Courbe de poids lissée EMA"
        subtitle="Décodeur eau / glycogène / graisse réelle"
        size="xl"
      >
        <EnergyActivityChart
          balances={recentBalances}
          weightTrend={weightTrend}
          scaleDecoder={scaleDecoder}
          currentWeightKg={profile.weightKg}
          currentWaistCm={profile.waistCm}
          rangeDays={rangeDays}
          onRangeChange={onRangeChange}
          onQuickLogWeight={onQuickLogWeight}
        />
      </DetailSheet>

      {/* SHEET 6 : Assiettes, Photos & Code-barres */}
      <DetailSheet
        open={sheet === "barcode_meals"}
        onClose={() => setSheet(null)}
        title="Assiettes, Galerie Photo & Code-Barres"
        subtitle="Appuyez sur une photo pour réviser les ingrédients ou portions"
        size="lg"
      >
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setSheet(null);
                onNavigateTab("scanner");
              }}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-500 px-4 py-2.5 text-xs font-extrabold text-slate-950"
            >
              <Camera className="h-4 w-4" />
              Photographier un plat
            </button>
            {onOpenBarcode && (
              <button
                type="button"
                onClick={() => {
                  setSheet(null);
                  onOpenBarcode();
                }}
                className="inline-flex items-center gap-1.5 rounded-2xl bg-amber-500 px-4 py-2.5 text-xs font-extrabold text-slate-950"
              >
                <ScanBarcode className="h-4 w-4" />
                Scanner un code-barres
              </button>
            )}
          </div>

          {mealsWithPhotos.length === 0 ? (
            <p className="rounded-2xl border border-slate-500/20 bg-slate-500/10 p-4 text-xs text-slate-300">
              Aucune photo de plat enregistrée pour le moment.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {mealsWithPhotos.slice(0, 6).map((meal) => (
                <button
                  key={meal.id}
                  type="button"
                  onClick={() => {
                    setSheet(null);
                    onSelectMealToInspect(meal.id);
                  }}
                  className="flex items-center gap-3 rounded-2xl border border-slate-500/20 bg-slate-500/10 p-2.5 text-left hover:border-emerald-400/50"
                >
                  <img
                    src={meal.photoDataUrl}
                    alt={meal.dishTitle}
                    className="h-16 w-16 rounded-xl object-cover shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-white">{meal.dishTitle}</p>
                    <p className="text-[11px] font-bold text-emerald-300 tabular-nums">
                      {meal.caloriesCentral} kcal · {meal.macros.proteinG}g prot
                    </p>
                    <p className="text-[10px] text-slate-400">{meal.dateKey}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </DetailSheet>

      {/* SHEET 7 : Corps & Sang */}
      <DetailSheet
        open={sheet === "body_blood"}
        onClose={() => setSheet(null)}
        title="Silhouette, Mensurations & Bilan Sanguin"
        subtitle="Accédez à vos 3 laboratoires spécialisés"
        size="md"
      >
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => {
              setSheet(null);
              onNavigateTab("bodylab", "measurements");
            }}
            className="flex w-full items-center justify-between rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-left"
          >
            <div>
              <p className="flex items-center gap-2 text-sm font-bold text-white">
                <Ruler className="h-4 w-4 text-emerald-300" />
                Mensurations &amp; Courbe Base 100
              </p>
              <p className="mt-0.5 text-xs text-slate-300">
                {latestMeasurement?.waistCm
                  ? `Dernier tour de taille : ${latestMeasurement.waistCm} cm`
                  : "Enregistrer vos mensurations (cm)"}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400" />
          </button>

          <button
            type="button"
            onClick={() => {
              setSheet(null);
              onNavigateTab("bodylab", "blood");
            }}
            className="flex w-full items-center justify-between rounded-2xl border border-sky-400/30 bg-sky-500/10 p-4 text-left"
          >
            <div>
              <p className="flex items-center gap-2 text-sm font-bold text-white">
                <FlaskConical className="h-4 w-4 text-sky-300" />
                Analyse de Bilan Sanguin (FR/SI)
              </p>
              <p className="mt-0.5 text-xs text-slate-300">
                {latestBloodPanel
                  ? `Score ${latestBloodPanel.analysis.overallScore}/100 · ${latestBloodPanel.analysis.evaluatedMarkers.length} marqueurs`
                  : "Photo d'ordonnance ou saisie biomarqueurs"}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400" />
          </button>

          <button
            type="button"
            onClick={() => {
              setSheet(null);
              onNavigateTab("bodylab", "photos");
            }}
            className="flex w-full items-center justify-between rounded-2xl border border-violet-400/30 bg-violet-500/10 p-4 text-left"
          >
            <div>
              <p className="flex items-center gap-2 text-sm font-bold text-white">
                <ImageIcon className="h-4 w-4 text-violet-300" />
                Photos Avant / Après ({photosCount})
              </p>
              <p className="mt-0.5 text-xs text-slate-300">
                Stockage local chiffré sans serveur · floutage visage optionnel
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400" />
          </button>
        </div>
      </DetailSheet>

      {/* SHEET 8 : Micronutriments (Cronometer) */}
      <DetailSheet
        open={sheet === "micronutrients"}
        onClose={() => setSheet(null)}
        title="Micronutriments & Plafond Sodium"
        subtitle="Vitamines, minéraux, fibres (ANSES) et plafond sel (OMS)"
        size="md"
      >
        <div className="space-y-3 text-xs">
          {[
            { label: "Fibres", val: todayBalance.macros.fiberG, target: anthro.targets.fiberG, unit: "g", color: "bg-emerald-400" },
            { label: "Sodium (plafond max)", val: todayBalance.macros.sodiumMg, target: anthro.targets.sodiumMaxMg, unit: "mg", color: sodiumStatus === "exceeded" ? "bg-rose-400" : "bg-amber-400" },
            { label: "Fer", val: todayBalance.micronutrients.ironMg, target: profile.sex === "female" ? 16 : 11, unit: "mg", color: "bg-rose-400" },
            { label: "Magnésium", val: todayBalance.micronutrients.magnesiumMg, target: 380, unit: "mg", color: "bg-violet-400" },
            { label: "Calcium", val: todayBalance.micronutrients.calciumMg, target: 950, unit: "mg", color: "bg-cyan-400" },
            { label: "Potassium", val: todayBalance.micronutrients.potassiumMg, target: 3500, unit: "mg", color: "bg-teal-400" },
            { label: "Vitamine C", val: todayBalance.micronutrients.vitCMg, target: 110, unit: "mg", color: "bg-amber-300" },
            { label: "Vitamine D", val: todayBalance.micronutrients.vitDUg, target: 15, unit: "µg", color: "bg-yellow-300" },
          ].map((m) => {
            const pct = clampRingProgress(m.val, m.target);
            return (
              <div key={m.label} className="rounded-xl bg-slate-500/10 p-3">
                <div className="flex justify-between font-bold tabular-nums">
                  <span className="text-white">
                    {m.label}
                    {m.label.startsWith("Sodium") && <InfoTip term="sodium_oms" />}
                  </span>
                  <span className="text-slate-300">
                    {Number(m.val.toFixed(1))} / {m.target} {m.unit}
                  </span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-500/20">
                  <div
                    className={`vp-gpu-bar h-full w-full rounded-full ${m.color}`}
                    style={{ transform: `scaleX(${Math.max(0.03, pct)})` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </DetailSheet>

      {/* SHEET 9 : Banque 7 jours (Le Secret du Poids) */}
      <DetailSheet
        open={sheet === "weekly_bank"}
        onClose={() => setSheet(null)}
        title="Banque calorique sur 7 jours"
        subtitle="Lisser les repas festifs sans jamais culpabiliser"
        size="md"
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-center">
            <p className="text-xs text-slate-300">
              Marge hebdomadaire actuelle <InfoTip term="weekly_bank" />
            </p>
            <p className="mt-1 font-display text-3xl font-extrabold text-emerald-300 tabular-nums">
              {weeklyBank.pleasureMarginKcal >= 0 ? "+" : ""}
              {weeklyBank.pleasureMarginKcal} kcal
            </p>
            <p className="mt-2 text-xs leading-relaxed text-slate-200">
              {weeklyBank.guidanceFr}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl bg-slate-500/10 p-3">
              <p className="text-slate-400">Consommé (7 j)</p>
              <p className="font-bold text-white tabular-nums">
                {weeklyBank.weeklyIntakeKcal.toLocaleString("fr-FR")} kcal
              </p>
            </div>
            <div className="rounded-xl bg-slate-500/10 p-3">
              <p className="text-slate-400">Budget cible (7 j)</p>
              <p className="font-bold text-white tabular-nums">
                {weeklyBank.weeklyTargetKcal.toLocaleString("fr-FR")} kcal
              </p>
            </div>
          </div>
        </div>
      </DetailSheet>

      {/* SHEET 10 : Leçon Mindset du jour (Noom) */}
      <DetailSheet
        open={sheet === "mindset_coach"}
        onClose={() => setSheet(null)}
        title={todayLesson.titleFr}
        subtitle={`${todayLesson.tagFr} · Lecture ${todayLesson.durationLabel}`}
        size="md"
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm leading-relaxed text-slate-100">
            {todayLesson.insightFr}
          </div>
          <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-xs">
            <p className="font-bold text-emerald-300">Action concrète aujourd&apos;hui</p>
            <p className="mt-1 text-slate-200">{todayLesson.actionFr}</p>
            <p className="mt-2 text-[10px] text-slate-400">Réf. : {todayLesson.scienceRef}</p>
          </div>
          {onToggleMindsetToday && (
            <button
              type="button"
              onClick={() => {
                triggerLightHaptic();
                onToggleMindsetToday();
              }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-extrabold text-slate-950 hover:bg-emerald-400"
            >
              <Check className="h-4 w-4" />
              {lessonDoneToday ? "Marquée comme lue ✓" : "Valider la leçon du jour"}
            </button>
          )}
        </div>
      </DetailSheet>

      {/* SHEET 11 : Personnaliser Widgets */}
      <DetailSheet
        open={sheet === "widgets_config"}
        onClose={() => setSheet(null)}
        title="Personnaliser vos widgets"
        subtitle="Affichez uniquement les indicateurs essentiels sur l'accueil"
        size="md"
      >
        <div className="space-y-2">
          {(Object.keys(WIDGET_LABELS) as DashboardWidgetId[]).map((id) => {
            const active = visibleWidgets.includes(id);
            return (
              <button
                key={id}
                type="button"
                disabled={!onToggleWidget}
                onClick={() => {
                  triggerLightHaptic();
                  onToggleWidget?.(id);
                }}
                className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-xs font-bold transition ${
                  active
                    ? "border-emerald-400 bg-emerald-500/15 text-white"
                    : "border-slate-500/20 bg-slate-500/5 text-slate-400"
                }`}
              >
                <span>{WIDGET_LABELS[id]}</span>
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                    active
                      ? "border-emerald-400 bg-emerald-500 text-slate-950"
                      : "border-slate-500/40"
                  }`}
                >
                  {active ? <Check className="h-3 w-3" /> : null}
                </span>
              </button>
            );
          })}
        </div>
      </DetailSheet>
    </div>
  );
}

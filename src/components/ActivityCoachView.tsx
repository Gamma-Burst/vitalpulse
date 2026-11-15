"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Dumbbell,
  Flame,
  Footprints,
  HeartHandshake,
  Play,
  Plus,
  Search,
  Sparkles,
  Square,
  Timer,
  Trophy,
} from "lucide-react";
import {
  EXERCISES_COMPENDIUM,
  SPORT_DISCIPLINES_CATALOG,
} from "@/data/exercises-compendium";
import { computeAnthropometrics, computeWorkoutNetCalories } from "@/lib/metabolic-engine";
import { detectPlatformCapabilities } from "@/lib/native-bridge";
import { getExerciseVisualSpec, MUSCLE_LABELS_FR } from "@/lib/exercise-biomechanics";
import { ExerciseVisualStage } from "@/components/coach/ExerciseVisualStage";
import { MiniExerciseAvatar } from "@/components/coach/MiniExerciseAvatar";
import { DetailSheet } from "@/components/ui/DetailSheet";
import { InfoTip } from "@/components/ui/InfoTip";
import {
  DailyEnergyBalance,
  ExerciseCategory,
  ExerciseDefinition,
  StepSource,
  UserProfile,
  WorkoutSession,
} from "@/types/vitalpulse";

interface ActivityCoachViewProps {
  profile: UserProfile;
  bmrKcal: number;
  todayBalance: DailyEnergyBalance;
  recentBalances: DailyEnergyBalance[];
  todayWorkouts: WorkoutSession[];
  difficultDayDates: string[];
  onUpdateSteps: (steps: number, source: StepSource) => void;
  onLogWorkout: (session: WorkoutSession) => void;
  onActivateDifficultDay: (dateKey: string) => void;
  onUpdateStepGoal?: (goal: number) => void;
}

const CATEGORIES: { id: "all" | ExerciseCategory; label: string }[] = [
  { id: "all", label: `Tous (${EXERCISES_COMPENDIUM.length})` },
  { id: "gym_hypertrophy", label: "🏋️ Musculation & Masse" },
  { id: "endurance_cardio", label: "🏃 Course, Vélo & Natation" },
  { id: "team_racket_combat", label: "⚽ Sports Co, Raquettes & Combat" },
  { id: "sos_2min", label: "SOS 2 min" },
  { id: "vilpa", label: "VILPA Express" },
  { id: "home_cardio_no_jump", label: "Cardio Sans Sauts" },
  { id: "strength_tone", label: "Renfo & Muscle" },
  { id: "digestive_walk", label: "Marche" },
  { id: "desk_mobility", label: "Mobilité & Bureau" },
];

const INTENSITY_PRESETS: Array<{
  label: "Modérée" | "Soutenue" | "Compétition";
  mult: number;
  defaultRpe: number;
}> = [
  { label: "Modérée", mult: 0.88, defaultRpe: 5 },
  { label: "Soutenue", mult: 1.0, defaultRpe: 7 },
  { label: "Compétition", mult: 1.15, defaultRpe: 9 },
];

export function ActivityCoachView({
  profile,
  bmrKcal,
  todayBalance,
  recentBalances,
  todayWorkouts,
  difficultDayDates,
  onUpdateSteps,
  onLogWorkout,
  onActivateDifficultDay,
  onUpdateStepGoal,
}: ActivityCoachViewProps) {
  const [category, setCategory] = useState<"all" | ExerciseCategory>("all");
  const [manualStepsInput, setManualStepsInput] = useState(String(todayBalance.rawSteps));
  const [stepGoalDraft, setStepGoalDraft] = useState(String(profile.dailyStepGoal));
  const [showGoalEditor, setShowGoalEditor] = useState(false);
  const [showManualSteps, setShowManualSteps] = useState(false);
  const [pedometerLive, setPedometerLive] = useState(false);
  const [caps, setCaps] = useState(() => detectPlatformCapabilities());

  useEffect(() => {
    if (!showGoalEditor) {
      setStepGoalDraft(String(profile.dailyStepGoal));
    }
  }, [profile.dailyStepGoal, showGoalEditor]);

  useEffect(() => {
    if (!showManualSteps) {
      setManualStepsInput(String(todayBalance.rawSteps));
    }
  }, [todayBalance.rawSteps, showManualSteps]);

  // Lecteur d'exercice actif
  const [activeExercise, setActiveExercise] = useState<ExerciseDefinition | null>(null);
  const [selectedMoveIndex, setSelectedMoveIndex] = useState(0);
  const [customMinutes, setCustomMinutes] = useState(10);
  const [minutesDraft, setMinutesDraft] = useState("10");
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [rpe, setRpe] = useState(6);
  const [intensityLabel, setIntensityLabel] = useState<"Modérée" | "Soutenue" | "Compétition">(
    "Soutenue"
  );
  const [setsDraft, setSetsDraft] = useState("14");
  const [repsDraft, setRepsDraft] = useState("10");
  const [loadDraft, setLoadDraft] = useState("40");
  const [searchQuery, setSearchQuery] = useState("");
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [playerSheetOpen, setPlayerSheetOpen] = useState(false);

  useEffect(() => {
    setCaps(detectPlatformCapabilities());
  }, []);

  // Podomètre navigateur par accéléromètre (DeviceMotionEvent)
  useEffect(() => {
    if (!pedometerLive || typeof window === "undefined") return;
    let lastPeakAt = 0;
    let currentSteps = todayBalance.rawSteps;

    const handler = (ev: DeviceMotionEvent) => {
      const acc = ev.accelerationIncludingGravity;
      if (!acc) return;
      const mag = Math.sqrt((acc.x || 0) ** 2 + (acc.y || 0) ** 2 + (acc.z || 0) ** 2);
      const now = Date.now();
      if (mag > 12.2 && now - lastPeakAt > 360) {
        lastPeakAt = now;
        currentSteps += 1;
        onUpdateSteps(currentSteps, "web_motion_sensor");
      }
    };

    window.addEventListener("devicemotion", handler);
    return () => window.removeEventListener("devicemotion", handler);
  }, [pedometerLive, todayBalance.rawSteps, onUpdateSteps]);

  // Compte à rebours de la séance active
  useEffect(() => {
    if (secondsLeft === null || secondsLeft <= 0) return;
    const t = setInterval(() => {
      setSecondsLeft((s) => (s !== null && s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [secondsLeft]);

  const activeDaysLast7 = recentBalances
    .slice(-7)
    .filter(
      (b) =>
        b.workoutMinutes > 0 ||
        b.rawSteps >= Math.max(5000, Math.round(profile.dailyStepGoal * 0.75)) ||
        difficultDayDates.includes(b.dateKey)
    ).length;

  const isDifficultToday = difficultDayDates.includes(todayBalance.dateKey);
  const stepPct = Math.min(
    100,
    Math.round((todayBalance.rawSteps / Math.max(1000, profile.dailyStepGoal)) * 100)
  );

  const anthro = useMemo(() => computeAnthropometrics(profile), [profile]);
  const weeklyWorkoutMinutes = useMemo(
    () => recentBalances.slice(-7).reduce((acc, b) => acc + b.workoutMinutes, 0),
    [recentBalances]
  );
  const showAthleticBanner =
    profile.primaryGoal === "muscle_gain" ||
    profile.primaryGoal === "athletic_performance" ||
    profile.specialMode === "high_protein_athlete" ||
    profile.athleticLevel === "intermediate" ||
    profile.athleticLevel === "athlete" ||
    (profile.favoriteSports?.length ?? 0) > 0;

  const favoriteSportIds = useMemo(
    () => profile.favoriteSports ?? [],
    [profile.favoriteSports]
  );

  const filteredExercises = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return EXERCISES_COMPENDIUM.filter((e) => {
      if (category !== "all" && e.category !== category) return false;
      if (onlyFavorites && favoriteSportIds.length > 0) {
        if (!e.sportTag || !favoriteSportIds.includes(e.sportTag)) return false;
      }
      if (q) {
        const spec = getExerciseVisualSpec(e);
        const musclesFr = spec.movements
          .flatMap((m) => [...m.primaryMuscles, ...m.secondaryMuscles])
          .map((m) => MUSCLE_LABELS_FR[m] ?? m)
          .join(" ");
        const moveLabels = spec.movements.map((m) => m.labelFr).join(" ");
        const hay =
          `${e.title} ${e.targetMuscles} ${e.equipment} ${e.difficulty} ${e.instructions.join(" ")} ${moveLabels} ${musclesFr}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [category, onlyFavorites, favoriteSportIds, searchQuery]);

  const currentIntensityMult =
    INTENSITY_PRESETS.find((p) => p.label === intensityLabel)?.mult ?? 1.0;

  function startExercisePlayer(ex: ExerciseDefinition, moveIdx?: number) {
    const spec = getExerciseVisualSpec(ex);
    const q = searchQuery.trim().toLowerCase();
    const matchingIdx = q
      ? spec.movements.findIndex((m) => m.labelFr.toLowerCase().includes(q))
      : -1;
    const resolvedIdx =
      typeof moveIdx === "number"
        ? Math.max(0, Math.min(spec.movements.length - 1, moveIdx))
        : matchingIdx >= 0
          ? matchingIdx
          : 0;
    setActiveExercise(ex);
    setSelectedMoveIndex(resolvedIdx);
    setCustomMinutes(ex.defaultMinutes);
    setMinutesDraft(String(ex.defaultMinutes));
    setSecondsLeft(ex.defaultMinutes * 60);
    setIntensityLabel(ex.difficulty === "Intense" ? "Compétition" : "Soutenue");
    setRpe(
      ex.difficulty === "Très facile"
        ? 4
        : ex.difficulty === "Modéré"
          ? 6
          : ex.difficulty === "Tonique"
            ? 7
            : 8
    );
    setSetsDraft("14");
    setRepsDraft("10");
    setLoadDraft("40");
    setPlayerSheetOpen(true);
  }

  function finishAndLogExercise(
    ex: ExerciseDefinition,
    mins: number,
    options?: { useIntensity?: boolean; includeTonnage?: boolean }
  ) {
    const safeMins = Math.max(2, Math.min(240, Math.round(mins || ex.defaultMinutes)));
    const mult = options?.useIntensity ? currentIntensityMult : 1.0;
    const effectiveMet = +(ex.met * mult).toFixed(2);
    const netKcal = computeWorkoutNetCalories(profile.weightKg, bmrKcal, effectiveMet, safeMins);
    const overlapSteps = Math.round(ex.stepsPerMinuteOverlap * safeMins);
    const parsedSets = options?.includeTonnage ? Math.round(Number(setsDraft)) : NaN;
    const parsedReps = options?.includeTonnage ? Math.round(Number(repsDraft)) : NaN;
    const parsedLoad = options?.includeTonnage ? Number(loadDraft) : NaN;
    const session: WorkoutSession = {
      id: `wo-${Date.now()}`,
      dateKey: todayBalance.dateKey,
      exerciseId: ex.id,
      title: ex.title,
      category: ex.category,
      durationMinutes: safeMins,
      met: effectiveMet,
      netCaloriesBurned: netKcal,
      estimatedStepsOverlap: overlapSteps,
      rpe,
      startedAt: new Date().toISOString(),
      ...(options?.useIntensity ? { intensityLabel } : {}),
      ...(options?.includeTonnage && Number.isFinite(parsedSets) && parsedSets > 0
        ? { setsCount: Math.min(60, parsedSets) }
        : {}),
      ...(options?.includeTonnage && Number.isFinite(parsedReps) && parsedReps > 0
        ? { repsPerSet: Math.min(100, parsedReps) }
        : {}),
      ...(options?.includeTonnage && Number.isFinite(parsedLoad) && parsedLoad >= 0
        ? { loadKg: Math.min(400, +parsedLoad.toFixed(1)) }
        : {}),
    };
    onLogWorkout(session);
    setActiveExercise(null);
    setSecondsLeft(null);
    setPlayerSheetOpen(false);
    setToast(
      `Bravo ! "${ex.title}" (${safeMins} min) enregistré : +${netKcal} kcal nets dépensés.`
    );
    setTimeout(() => setToast(null), 4500);
  }

  return (
    <div className="space-y-5">
      {showAthleticBanner && (
        <div className="vp-card-accent p-4 sm:p-5 border-amber-400/35 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-300" />
              <h2 className="text-sm sm:text-base font-bold text-white">
                Coaching Sportif &amp; Hypertrophie
                {profile.primaryGoal === "muscle_gain" && (
                  <span className="ml-2 text-[11px] font-semibold text-emerald-300">
                    Lean Bulk <InfoTip term="lean_bulk" />
                  </span>
                )}
              </h2>
            </div>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/35 text-amber-200 font-semibold">
              Volume 7j : {weeklyWorkoutMinutes} min
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            <div className="rounded-xl bg-slate-900/75 border border-slate-700/60 p-3">
              <p className="text-[11px] text-slate-400">
                Bolus protéines / prise <InfoTip term="leucine_threshold" />
              </p>
              <p className="font-bold text-emerald-300 mt-0.5 tabular-nums">
                4 × {anthro.perMealProteinBolusG} g / repas
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Cible jour : {anthro.targets.proteinG} g (ISSN)
              </p>
            </div>
            <div className="rounded-xl bg-slate-900/75 border border-slate-700/60 p-3">
              <p className="text-[11px] text-slate-400">
                Ravitaillement sport <InfoTip term="athletic_refuel" />
              </p>
              <p className="font-bold text-sky-300 mt-0.5 tabular-nums">
                {anthro.workoutRefuelEligible
                  ? `+${todayBalance.sportRefuelKcal} kcal recréditées`
                  : `${todayBalance.targetIntakeKcal} kcal cibles`}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {anthro.workoutRefuelEligible
                  ? `Budget total jour : ${todayBalance.targetIntakeKcal} kcal`
                  : "Passez en Prise de masse ou Performance pour auto-recréditer"}
              </p>
            </div>
            <div className="rounded-xl bg-slate-900/75 border border-slate-700/60 p-3">
              <p className="text-[11px] text-slate-400">Sports favoris configurés</p>
              <p className="font-bold text-white mt-0.5 truncate">
                {favoriteSportIds.length > 0
                  ? favoriteSportIds
                      .slice(0, 3)
                      .map((id) => {
                        const s = SPORT_DISCIPLINES_CATALOG.find((x) => x.id === id);
                        return s ? `${s.emoji} ${s.label.split("&")[0].trim()}` : id;
                      })
                      .join(" · ")
                  : "Tous sports disponibles"}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Modifiable dans Profil &amp; Paramètres
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Podomètre & Suivi des pas */}
      <div className="vp-card-accent p-4 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <Footprints className="w-5 h-5 text-sky-400" />
              Podomètre &amp; Dépense de marche sans double comptage
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              {caps.isCapacitorNative
                ? "Mode Android Natif détecté : prêt pour synchronisation Health Connect."
                : "Suivi Web/PWA : utilisez le podomètre capteur en direct lors d'une marche ou ajustez votre total du jour."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPedometerLive((v) => !v)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              pedometerLive
                ? "bg-rose-500 text-white"
                : "bg-sky-500 hover:bg-sky-400 text-slate-950"
            }`}
          >
            {pedometerLive ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {pedometerLive ? "Capteur marche actif (Stop)" : "Démarrer podomètre capteur"}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <div className="md:col-span-2 space-y-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-bold text-white tabular-nums">
                  {todayBalance.rawSteps.toLocaleString("fr-FR")}{" "}
                  <span className="text-sm font-normal text-slate-400">
                    / {profile.dailyStepGoal.toLocaleString("fr-FR")} pas ({stepPct}%)
                  </span>
                </span>
                {onUpdateStepGoal && (
                  <button
                    type="button"
                    onClick={() => setShowGoalEditor((v) => !v)}
                    className="rounded-lg border border-sky-400/35 bg-sky-500/10 px-2 py-0.5 text-[11px] font-semibold text-sky-300 hover:bg-sky-500/20"
                  >
                    {showGoalEditor ? "Fermer objectif" : "Modifier objectif"}
                  </button>
                )}
              </div>
              <span className="text-xs font-semibold text-emerald-300 tabular-nums">
                {todayBalance.stepDistanceKm} km · +{todayBalance.netStepsKcal} kcal nets
              </span>
            </div>
            {showGoalEditor && onUpdateStepGoal && (
              <div className="rounded-xl border border-sky-400/30 bg-slate-950/70 p-3 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-sky-200">
                    Objectif quotidien personnalisé (1 500 – 30 000 pas/j)
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[5000, 7500, 8000, 10000, 12000].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          if (document.activeElement instanceof HTMLElement) {
                            document.activeElement.blur();
                          }
                          onUpdateStepGoal(preset);
                          setStepGoalDraft(String(preset));
                          setShowGoalEditor(false);
                          setToast(`Objectif mis à jour : ${preset.toLocaleString("fr-FR")} pas/j`);
                          setTimeout(() => setToast(null), 2500);
                        }}
                        className={`rounded-lg border px-2 py-1 text-[11px] font-bold tabular-nums ${
                          profile.dailyStepGoal === preset
                            ? "border-emerald-400 bg-emerald-500/20 text-emerald-200"
                            : "border-slate-700 bg-slate-900 text-slate-300 hover:border-sky-400"
                        }`}
                      >
                        {preset.toLocaleString("fr-FR")}
                      </button>
                    ))}
                  </div>
                </div>
                <form
                  className="flex items-center gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (document.activeElement instanceof HTMLElement) {
                      document.activeElement.blur();
                    }
                    const parsed = Number(stepGoalDraft.replace(/\s+/g, ""));
                    const clamped = Math.max(
                      1500,
                      Math.min(
                        30000,
                        Math.round(Number.isFinite(parsed) && parsed > 0 ? parsed : profile.dailyStepGoal)
                      )
                    );
                    onUpdateStepGoal(clamped);
                    setStepGoalDraft(String(clamped));
                    setShowGoalEditor(false);
                    setToast(`Objectif mis à jour : ${clamped.toLocaleString("fr-FR")} pas/j`);
                    setTimeout(() => setToast(null), 2500);
                  }}
                >
                  <input
                    type="text"
                    inputMode="numeric"
                    value={stepGoalDraft}
                    onChange={(e) => setStepGoalDraft(e.target.value.replace(/[^\d]/g, ""))}
                    aria-label="Objectif quotidien de pas"
                    className="w-28 rounded-xl bg-slate-900 border border-slate-700 px-2.5 py-1.5 text-xs text-white tabular-nums"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-xl bg-sky-500 text-slate-950 font-bold text-xs hover:bg-sky-400"
                  >
                    Enregistrer objectif
                  </button>
                </form>
              </div>
            )}
            <div className="h-3 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
              <div
                className="vp-gpu-bar h-full w-full bg-gradient-to-r from-sky-400 to-emerald-400"
                style={{ transform: `scaleX(${Math.max(0.02, stepPct / 100)})` }}
              />
            </div>
            <p className="text-[11px] text-slate-400">
              Déduplication anti-gonflement <InfoTip term="neat_dedup" /> :{" "}
              <strong className="text-slate-200">
                {todayBalance.effectiveNeatSteps.toLocaleString("fr-FR")} pas hors-séance
              </strong>{" "}
              ({todayBalance.overlapStepsDeducted.toLocaleString("fr-FR")} pas inclus dans vos séances déjà déduits).
            </p>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowManualSteps((v) => !v)}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-300 hover:border-sky-400"
            >
              {showManualSteps ? "Masquer saisie manuelle ▲" : "Ajuster les pas manuellement ▾"}
            </button>
            {showManualSteps && (
            <div className="flex flex-wrap items-center gap-2">
            {[500, 1000, 2500].map((inc) => (
              <button
                key={inc}
                type="button"
                onClick={() =>
                  onUpdateSteps(Math.min(100000, todayBalance.rawSteps + inc), "manual")
                }
                className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-sky-400 text-xs text-white tabular-nums"
              >
                <Plus className="w-3 h-3" /> {inc}
              </button>
            ))}
            <form
              className="flex items-center gap-1.5"
              onSubmit={(e) => {
                e.preventDefault();
                if (document.activeElement instanceof HTMLElement) {
                  document.activeElement.blur();
                }
                const val = Math.max(0, Math.min(100000, Math.round(Number(manualStepsInput) || 0)));
                onUpdateSteps(val, "manual");
                setManualStepsInput(String(val));
                setShowManualSteps(false);
                setToast(`Pas du jour enregistrés : ${val.toLocaleString("fr-FR")}`);
                setTimeout(() => setToast(null), 2500);
              }}
            >
              <input
                type="text"
                inputMode="numeric"
                value={manualStepsInput}
                onChange={(e) => setManualStepsInput(e.target.value.replace(/[^\d]/g, ""))}
                aria-label="Total pas du jour"
                className="w-24 rounded-xl bg-slate-950 border border-slate-700 px-2.5 py-2 text-xs text-white tabular-nums"
              />
              <button
                type="submit"
                className="px-3 py-2 rounded-xl bg-emerald-500 text-slate-950 font-semibold text-xs"
              >
                OK
              </button>
            </form>
            </div>
            )}
          </div>
        </div>
      </div>

      {/* Anti-Perte de Motivation & Série Souple 4j/7 */}
      <div className="vp-card p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 border-violet-500/30">
        <div className="flex items-start gap-3">
          <HeartHandshake className="w-6 h-6 text-violet-400 shrink-0 mt-0.5" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-white">
                Série Souple : {activeDaysLast7} / 7 jours actifs cette semaine
              </h3>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-200">
                {activeDaysLast7 >= 4 ? "Semaine validée (≥ 4j/7)" : "Objectif doux : 4j/7 · Ne jamais rater 2 fois"}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Fatigué ou débordé aujourd&apos;hui ? Le mode &laquo;&nbsp;Journée difficile&nbsp;&raquo; protège votre série avec seulement 2 minutes de mouvement doux, sans culpabilité.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            onActivateDifficultDay(todayBalance.dateKey);
            setCategory("sos_2min");
            startExercisePlayer(EXERCISES_COMPENDIUM[0]);
          }}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition shrink-0 ${
            isDifficultToday
              ? "bg-emerald-500/20 border border-emerald-400/40 text-emerald-300"
              : "bg-violet-500 hover:bg-violet-400 text-slate-950"
          }`}
        >
          {isDifficultToday
            ? "Série protégée aujourd'hui — Relancer 2 min"
            : "Journée difficile ? Mode Sauvetage 2 min"}
        </button>
      </div>

      {toast && (
        <div className="rounded-xl bg-emerald-500/20 border border-emerald-400/40 p-3 text-xs text-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {toast}
        </div>
      )}

      {/* Bannière persistante si minuteur réduit */}
      {activeExercise && !playerSheetOpen && (
        <div className="vp-card-accent flex items-center justify-between gap-3 rounded-2xl p-3.5 text-xs">
          <div className="flex items-center gap-2.5">
            <Timer className="h-4 w-4 text-emerald-400 animate-pulse shrink-0" />
            <div>
              <p className="font-bold text-white">{activeExercise.title}</p>
              <p className="text-emerald-300 tabular-nums">
                Minuteur en cours :{" "}
                {secondsLeft !== null
                  ? `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`
                  : `${customMinutes}:00`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPlayerSheetOpen(true)}
            className="rounded-xl bg-emerald-500 px-3 py-2 font-bold text-slate-950"
          >
            Ouvrir la séance
          </button>
        </div>
      )}

      {/* Lecteur Guidé d'Exercice Actif dans DetailSheet */}
      <DetailSheet
        open={Boolean(activeExercise) && playerSheetOpen}
        onClose={() => setPlayerSheetOpen(false)}
        title={activeExercise?.title || "Séance guidée"}
        subtitle={
          activeExercise
            ? `${activeExercise.met} MET (Compendium 2024) · vous pouvez réduire ce tiroir, le minuteur continue`
            : undefined
        }
        size="lg"
      >
      {activeExercise && (
        <div className="space-y-4">
          <ExerciseVisualStage
            key={`${activeExercise.id}-${selectedMoveIndex}`}
            exercise={activeExercise}
            initialMoveIndex={selectedMoveIndex}
          />
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs text-slate-300">{activeExercise.antiDemotivationTip}</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-emerald-300 tabular-nums">
                {secondsLeft !== null
                  ? `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`
                  : `${customMinutes}:00`}
              </div>
              <span className="text-xs text-slate-400">
                ≈ +
                {computeWorkoutNetCalories(
                  profile.weightKg,
                  bmrKcal,
                  +(activeExercise.met * currentIntensityMult).toFixed(2),
                  customMinutes
                )}{" "}
                kcal nets pour {profile.weightKg} kg
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl bg-slate-900/90 p-3.5 text-xs space-y-2">
              <strong className="text-white block">Déroulé étape par étape :</strong>
              <ul className="list-disc pl-4 space-y-1.5 text-slate-300">
                {activeExercise.instructions.map((ins, idx) => (
                  <li key={idx}>{ins}</li>
                ))}
              </ul>
              <p className="text-[11px] text-slate-400 pt-1">
                Référence : {activeExercise.scienceCitation}
              </p>
            </div>

            <div className="rounded-xl bg-slate-900/90 p-3.5 text-xs space-y-3">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <label className="text-slate-300">
                    Durée réalisée : <strong className="text-white">{customMinutes} min</strong>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    aria-label="Durée en minutes"
                    value={minutesDraft}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/[^\d]/g, "");
                      setMinutesDraft(clean);
                      const n = Number(clean);
                      if (Number.isFinite(n) && n >= 2 && n <= 240) {
                        setCustomMinutes(Math.round(n));
                        setSecondsLeft(Math.round(n) * 60);
                      }
                    }}
                    onBlur={() => {
                      const n = Math.max(2, Math.min(240, Math.round(Number(minutesDraft) || customMinutes)));
                      setCustomMinutes(n);
                      setMinutesDraft(String(n));
                      setSecondsLeft(n * 60);
                    }}
                    className="w-16 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-right text-xs font-bold text-white tabular-nums"
                  />
                </div>
                <input
                  type="range"
                  min={2}
                  max={180}
                  value={Math.min(180, customMinutes)}
                  onChange={(e) => {
                    const m = Number(e.target.value);
                    setCustomMinutes(m);
                    setMinutesDraft(String(m));
                    setSecondsLeft(m * 60);
                  }}
                  className="w-full accent-emerald-400"
                />
              </div>

              <div>
                <span className="text-slate-300 block mb-1.5">Intensité ressentie de la séance</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {INTENSITY_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setIntensityLabel(preset.label);
                        setRpe(preset.defaultRpe);
                      }}
                      className={`rounded-xl border px-2 py-1.5 text-[11px] font-bold transition ${
                        intensityLabel === preset.label
                          ? "border-emerald-400 bg-emerald-500/20 text-emerald-200"
                          : "border-slate-700 bg-slate-950/60 text-slate-300 hover:border-slate-500"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1">
                  Effort ressenti (RPE) <InfoTip term="rpe" /> : <strong className="text-white">{rpe} / 10</strong>
                </label>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={rpe}
                  onChange={(e) => setRpe(Number(e.target.value))}
                  className="w-full accent-sky-400"
                />
              </div>

              {activeExercise.category === "gym_hypertrophy" && (
                <div className="rounded-xl border border-amber-400/25 bg-amber-500/5 p-2.5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-amber-200">
                      Suivi Hypertrophie / Tonnage (optionnel)
                    </span>
                    <span className="text-[11px] font-semibold text-amber-300 tabular-nums">
                      {Math.max(
                        0,
                        Math.round(
                          (Number(setsDraft) || 0) *
                            (Number(repsDraft) || 0) *
                            (Number(loadDraft) || 0)
                        )
                      ).toLocaleString("fr-FR")}{" "}
                      kg soulevés
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block">Séries</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={setsDraft}
                        onChange={(e) => setSetsDraft(e.target.value.replace(/[^\d]/g, ""))}
                        className="mt-0.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-white tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block">Reps / série</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={repsDraft}
                        onChange={(e) => setRepsDraft(e.target.value.replace(/[^\d]/g, ""))}
                        className="mt-0.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-white tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block">Charge moy. (kg)</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={loadDraft}
                        onChange={(e) =>
                          setLoadDraft(e.target.value.replace(",", ".").replace(/[^0-9.]/g, ""))
                        }
                        className="mt-0.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-white tabular-nums"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() =>
                    finishAndLogExercise(activeExercise, customMinutes, {
                      useIntensity: true,
                      includeTonnage: activeExercise.category === "gym_hypertrophy",
                    })
                  }
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Terminer &amp; Comptabiliser
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveExercise(null);
                    setSecondsLeft(null);
                    setPlayerSheetOpen(false);
                  }}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-800 text-slate-300"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </DetailSheet>

      {/* Séances déjà effectuées aujourd'hui */}
      {todayWorkouts.length > 0 && (
        <div className="vp-card p-4 space-y-2">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Flame className="w-4 h-4 text-emerald-400" />
            Séances comptabilisées aujourd&apos;hui ({todayBalance.workoutMinutes} min · +{todayBalance.netWorkoutsKcal} kcal nets)
          </h3>
          <div className="flex flex-wrap gap-2">
            {todayWorkouts.map((w) => {
              const hasVolume =
                typeof w.setsCount === "number" &&
                typeof w.repsPerSet === "number" &&
                typeof w.loadKg === "number";
              const tonnage = hasVolume
                ? Math.round((w.setsCount ?? 0) * (w.repsPerSet ?? 0) * (w.loadKg ?? 0))
                : 0;
              return (
                <span
                  key={w.id}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-xs text-emerald-200"
                >
                  {w.title} · {w.durationMinutes} min · +{w.netCaloriesBurned} kcal
                  {hasVolume ? ` · ${w.setsCount}×${w.repsPerSet} @ ${w.loadKg}kg (${tonnage.toLocaleString("fr-FR")} kg)` : ""}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Bibliothèque complète Sports, Musculation & Activités quotidiennes */}
      <div className="vp-card p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Dumbbell className="w-5 h-5 text-emerald-400" />
              Sports, Musculation &amp; Activités quotidiennes ({EXERCISES_COMPENDIUM.length})
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Calories calculées exactement pour votre poids ({profile.weightKg} kg) avec soustraction du métabolisme de repos (MET − 1 <InfoTip term="met" />).
            </p>
          </div>

          <div className="flex w-full sm:w-auto flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Chercher sport, muscle, exercice..."
                aria-label="Rechercher un sport, muscle ou exercice"
                className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none w-full sm:w-56"
              />
            </div>
            {favoriteSportIds.length > 0 && (
              <button
                type="button"
                onClick={() => setOnlyFavorites((v) => !v)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition ${
                  onlyFavorites
                    ? "border-amber-400 bg-amber-500/20 text-amber-200"
                    : "border-slate-700 bg-slate-900 text-slate-300 hover:border-amber-400/50"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                Mes sports ({favoriteSportIds.length})
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                category === c.id
                  ? "bg-emerald-500 text-slate-950 font-semibold"
                  : "bg-slate-900 border border-slate-800 text-slate-300 hover:border-slate-600"
              }`}
            >
              {c.label}
              {c.id === "vilpa" && <InfoTip term="vilpa" />}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredExercises.map((ex) => {
            const estKcal = computeWorkoutNetCalories(
              profile.weightKg,
              bmrKcal,
              ex.met,
              ex.defaultMinutes
            );
            const visualSpec = getExerciseVisualSpec(ex);
            const diffBadgeClass =
              ex.difficulty === "Intense"
                ? "bg-rose-500/20 text-rose-200 border border-rose-400/35"
                : ex.difficulty === "Tonique"
                  ? "bg-amber-500/15 text-amber-200"
                  : "bg-slate-800 text-emerald-300";
            return (
              <div
                key={ex.id}
                className="rounded-xl bg-slate-900/90 border border-slate-800 p-4 flex flex-col justify-between gap-3 hover:border-emerald-400/40 transition"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-[11px] mb-2">
                    <span className={`px-2 py-0.5 rounded-full font-medium ${diffBadgeClass}`}>
                      {ex.difficulty} · {ex.defaultMinutes} min
                    </span>
                    <span className="text-amber-300 font-bold tabular-nums">
                      +{estKcal} kcal nets
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => startExercisePlayer(ex)}
                      aria-label={`Voir l'animation 3D pour ${ex.title}`}
                      className="shrink-0 rounded-xl bg-slate-950/90 border border-slate-800 hover:border-emerald-400/50 p-1 transition cursor-pointer"
                    >
                      <MiniExerciseAvatar exerciseId={ex.id} size={76} />
                    </button>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-white leading-snug">{ex.title}</h4>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Matériel : {ex.equipment} · {ex.targetMuscles}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 mt-2">{ex.antiDemotivationTip}</p>
                  {visualSpec.movements.length > 1 && (
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {visualSpec.movements.map((mv, idx) => (
                        <button
                          key={`${ex.id}-mv-${idx}`}
                          type="button"
                          onClick={() => startExercisePlayer(ex, idx)}
                          className="px-2 py-0.5 rounded-lg bg-slate-800/90 hover:bg-emerald-500/20 border border-slate-700 hover:border-emerald-400/40 text-[10px] font-medium text-slate-200 hover:text-emerald-200 transition"
                        >
                          {mv.labelFr}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => startExercisePlayer(ex)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium"
                  >
                    <Timer className="w-3.5 h-3.5 text-sky-400" />
                    Voir coach & Démarrer
                  </button>
                  <button
                    type="button"
                    onClick={() => finishAndLogExercise(ex, ex.defaultMinutes)}
                    className="px-3 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500 hover:text-slate-950 text-emerald-300 border border-emerald-400/30 text-xs font-semibold transition"
                  >
                    + Log {ex.defaultMinutes}m
                  </button>
                </div>
              </div>
            );
          })}
          {filteredExercises.length === 0 && (
            <div className="col-span-full rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-center text-xs text-slate-400">
              Aucun sport trouvé avec ces filtres — essayez d&apos;effacer la recherche ou de sélectionner &laquo;&nbsp;Tous&nbsp;&raquo;.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

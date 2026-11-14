"use client";

import React, { useEffect, useState } from "react";
import {
  CheckCircle2,
  Dumbbell,
  Flame,
  Footprints,
  HeartHandshake,
  Play,
  Plus,
  Square,
  Timer,
} from "lucide-react";
import { EXERCISES_COMPENDIUM } from "@/data/exercises-compendium";
import { computeWorkoutNetCalories } from "@/lib/metabolic-engine";
import { detectPlatformCapabilities } from "@/lib/native-bridge";
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
}

const CATEGORIES: { id: "all" | ExerciseCategory; label: string }[] = [
  { id: "all", label: "Tous (24)" },
  { id: "sos_2min", label: "SOS 2 min" },
  { id: "vilpa", label: "VILPA Express" },
  { id: "home_cardio_no_jump", label: "Cardio Sans Sauts" },
  { id: "strength_tone", label: "Renfo & Muscle" },
  { id: "digestive_walk", label: "Marche" },
  { id: "desk_mobility", label: "Mobilité & Bureau" },
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
}: ActivityCoachViewProps) {
  const [category, setCategory] = useState<"all" | ExerciseCategory>("all");
  const [manualStepsInput, setManualStepsInput] = useState(String(todayBalance.rawSteps));
  const [pedometerLive, setPedometerLive] = useState(false);
  const [caps, setCaps] = useState(() => detectPlatformCapabilities());

  // Lecteur d'exercice actif
  const [activeExercise, setActiveExercise] = useState<ExerciseDefinition | null>(null);
  const [customMinutes, setCustomMinutes] = useState(10);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [rpe, setRpe] = useState(6);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setCaps(detectPlatformCapabilities());
  }, []);

  useEffect(() => {
    setManualStepsInput(String(todayBalance.rawSteps));
  }, [todayBalance.rawSteps]);

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

  const filteredExercises =
    category === "all"
      ? EXERCISES_COMPENDIUM
      : EXERCISES_COMPENDIUM.filter((e) => e.category === category);

  function startExercisePlayer(ex: ExerciseDefinition) {
    setActiveExercise(ex);
    setCustomMinutes(ex.defaultMinutes);
    setSecondsLeft(ex.defaultMinutes * 60);
    setRpe(ex.difficulty === "Très facile" ? 4 : ex.difficulty === "Modéré" ? 6 : 8);
  }

  function finishAndLogExercise(ex: ExerciseDefinition, mins: number) {
    const netKcal = computeWorkoutNetCalories(profile.weightKg, bmrKcal, ex.met, mins);
    const overlapSteps = Math.round(ex.stepsPerMinuteOverlap * mins);
    const session: WorkoutSession = {
      id: `wo-${Date.now()}`,
      dateKey: todayBalance.dateKey,
      exerciseId: ex.id,
      title: ex.title,
      category: ex.category,
      durationMinutes: mins,
      met: ex.met,
      netCaloriesBurned: netKcal,
      estimatedStepsOverlap: overlapSteps,
      rpe,
      startedAt: new Date().toISOString(),
    };
    onLogWorkout(session);
    setActiveExercise(null);
    setSecondsLeft(null);
    setToast(
      `Bravo ! "${ex.title}" (${mins} min) enregistré : +${netKcal} kcal nets dépensés.`
    );
    setTimeout(() => setToast(null), 4500);
  }

  return (
    <div className="space-y-5">
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
            <div className="flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-bold text-white tabular-nums">
                {todayBalance.rawSteps.toLocaleString("fr-FR")}{" "}
                <span className="text-sm font-normal text-slate-400">
                  / {profile.dailyStepGoal.toLocaleString("fr-FR")} pas ({stepPct}%)
                </span>
              </span>
              <span className="text-xs font-semibold text-emerald-300 tabular-nums">
                {todayBalance.stepDistanceKm} km · +{todayBalance.netStepsKcal} kcal nets
              </span>
            </div>
            <div className="h-3 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-sky-400 to-emerald-400 transition-all duration-300"
                style={{ width: `${stepPct}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400">
              Déduplication anti-gonflement :{" "}
              <strong className="text-slate-200">
                {todayBalance.effectiveNeatSteps.toLocaleString("fr-FR")} pas hors-séance
              </strong>{" "}
              ({todayBalance.overlapStepsDeducted.toLocaleString("fr-FR")} pas inclus dans vos séances déjà déduits).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {[500, 1000, 2500].map((inc) => (
              <button
                key={inc}
                type="button"
                onClick={() => onUpdateSteps(todayBalance.rawSteps + inc, "manual")}
                className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-sky-400 text-xs text-white tabular-nums"
              >
                <Plus className="w-3 h-3" /> {inc}
              </button>
            ))}
            <form
              className="flex items-center gap-1.5"
              onSubmit={(e) => {
                e.preventDefault();
                const val = Math.max(0, Math.round(Number(manualStepsInput) || 0));
                onUpdateSteps(val, "manual");
              }}
            >
              <input
                type="number"
                value={manualStepsInput}
                onChange={(e) => setManualStepsInput(e.target.value)}
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

      {/* Lecteur Guidé d'Exercice Actif */}
      {activeExercise && (
        <div className="vp-card p-5 border-emerald-400/50 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <span className="text-xs text-emerald-300 font-semibold">
                Séance guidée en direct · {activeExercise.met} MET (Compendium 2024)
              </span>
              <h3 className="text-xl font-bold text-white mt-0.5">{activeExercise.title}</h3>
              <p className="text-xs text-slate-300 mt-1">{activeExercise.antiDemotivationTip}</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-emerald-300 tabular-nums">
                {secondsLeft !== null
                  ? `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`
                  : `${customMinutes}:00`}
              </div>
              <span className="text-xs text-slate-400">
                ≈ +{computeWorkoutNetCalories(profile.weightKg, bmrKcal, activeExercise.met, customMinutes)} kcal nets pour {profile.weightKg} kg
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
                <label className="text-slate-300 block mb-1">
                  Durée réalisée : <strong className="text-white">{customMinutes} min</strong>
                </label>
                <input
                  type="range"
                  min={2}
                  max={60}
                  value={customMinutes}
                  onChange={(e) => {
                    const m = Number(e.target.value);
                    setCustomMinutes(m);
                    setSecondsLeft(m * 60);
                  }}
                  className="w-full accent-emerald-400"
                />
              </div>
              <div>
                <label className="text-slate-300 block mb-1">
                  Effort ressenti (RPE) : <strong className="text-white">{rpe} / 10</strong>
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
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => finishAndLogExercise(activeExercise, customMinutes)}
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

      {/* Séances déjà effectuées aujourd'hui */}
      {todayWorkouts.length > 0 && (
        <div className="vp-card p-4 space-y-2">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Flame className="w-4 h-4 text-emerald-400" />
            Séances comptabilisées aujourd&apos;hui ({todayBalance.workoutMinutes} min · +{todayBalance.netWorkoutsKcal} kcal nets)
          </h3>
          <div className="flex flex-wrap gap-2">
            {todayWorkouts.map((w) => (
              <span
                key={w.id}
                className="px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-xs text-emerald-200"
              >
                {w.title} · {w.durationMinutes} min · +{w.netCaloriesBurned} kcal
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Bibliothèque complète de 24 exercices faciles chaque jour */}
      <div className="vp-card p-4 sm:p-5 space-y-4">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-emerald-400" />
            Bibliothèque de 24 exercices faciles au quotidien
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Calories calculées exactement pour votre poids ({profile.weightKg} kg) avec soustraction du métabolisme de repos (MET − 1).
          </p>
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
            return (
              <div
                key={ex.id}
                className="rounded-xl bg-slate-900/90 border border-slate-800 p-4 flex flex-col justify-between gap-3 hover:border-emerald-400/40 transition"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-[11px] mb-1">
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 text-emerald-300 font-medium">
                      {ex.difficulty} · {ex.defaultMinutes} min
                    </span>
                    <span className="text-amber-300 font-bold tabular-nums">
                      +{estKcal} kcal nets
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white leading-snug">{ex.title}</h4>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Matériel : {ex.equipment} · {ex.targetMuscles}
                  </p>
                  <p className="text-xs text-slate-300 mt-2">{ex.antiDemotivationTip}</p>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => startExercisePlayer(ex)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium"
                  >
                    <Timer className="w-3.5 h-3.5 text-sky-400" />
                    Démarrer guidé
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
        </div>
      </div>
    </div>
  );
}

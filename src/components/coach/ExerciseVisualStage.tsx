"use client";

import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Camera, Dumbbell, Pause, Play, Sparkles } from "lucide-react";
import {
  getExerciseVisualSpec,
  getFreeExerciseDbImageUrl,
  MUSCLE_LABELS_FR,
} from "@/lib/exercise-biomechanics";
import { AnatomicalMuscleMap } from "@/components/coach/AnatomicalMuscleMap";
import { MiniExerciseAvatar } from "@/components/coach/MiniExerciseAvatar";
import { ExerciseDefinition } from "@/types/vitalpulse";

const ExerciseCoach3D = dynamic(
  () => import("@/components/coach/ExerciseCoach3D").then((m) => m.ExerciseCoach3D),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-72 items-center justify-center rounded-2xl border border-slate-800 bg-slate-950 text-xs text-slate-400">
        Chargement du coach 3D interactif...
      </div>
    ),
  }
);

type StageTab = "coach_3d" | "anatomy" | "reference_photos";

export interface ExerciseVisualStageProps {
  exercise: ExerciseDefinition;
  initialMoveIndex?: number;
}

export function ExerciseVisualStage({
  exercise,
  initialMoveIndex = 0,
}: ExerciseVisualStageProps) {
  const spec = useMemo(() => getExerciseVisualSpec(exercise), [exercise]);
  const [activeTab, setActiveTab] = useState<StageTab>("coach_3d");
  const [moveIndex, setMoveIndex] = useState(() =>
    Math.max(0, Math.min(spec.movements.length - 1, initialMoveIndex))
  );
  const [autoSequence, setAutoSequence] = useState(false);
  const [webglFailed, setWebglFailed] = useState(false);

  // Photos de référence (Start/End)
  const [photoFrame, setPhotoFrame] = useState<0 | 1>(0);
  const [photoAutoFlip, setPhotoAutoFlip] = useState(true);
  const [photoError, setPhotoError] = useState(false);

  useEffect(() => {
    setMoveIndex(Math.max(0, Math.min(spec.movements.length - 1, initialMoveIndex)));
    setPhotoError(false);
    setPhotoFrame(0);
  }, [exercise.id, initialMoveIndex, spec.movements.length]);

  useEffect(() => {
    setPhotoError(false);
    setPhotoFrame(0);
  }, [moveIndex]);

  useEffect(() => {
    if (!autoSequence || spec.movements.length <= 1) return;
    const t = setInterval(() => {
      setMoveIndex((prev) => (prev + 1) % spec.movements.length);
    }, 6500);
    return () => clearInterval(t);
  }, [autoSequence, spec.movements.length]);

  const currentMove = spec.movements[moveIndex] ?? spec.movements[0];

  useEffect(() => {
    if (activeTab !== "reference_photos" || !photoAutoFlip || !currentMove.freeExerciseDbId) {
      return;
    }
    const t = setInterval(() => {
      setPhotoFrame((f) => (f === 0 ? 1 : 0));
    }, 1150);
    return () => clearInterval(t);
  }, [activeTab, photoAutoFlip, currentMove.freeExerciseDbId]);

  return (
    <div className="space-y-3">
      {/* Onglets visuels : Coach 3D / Anatomie / Photos */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="grid w-full grid-cols-3 rounded-xl border border-slate-800 bg-slate-900/90 p-1 text-xs sm:inline-flex sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab("coach_3d")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-semibold transition ${
              activeTab === "coach_3d"
                ? "bg-emerald-500 text-slate-950"
                : "text-slate-300 hover:text-white"
            }`}
          >
            <Dumbbell className="h-3.5 w-3.5" />
            Coach 3D Animé
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("anatomy")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-semibold transition ${
              activeTab === "anatomy"
                ? "bg-emerald-500 text-slate-950"
                : "text-slate-300 hover:text-white"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Anatomie Muscles
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("reference_photos")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-semibold transition ${
              activeTab === "reference_photos"
                ? "bg-emerald-500 text-slate-950"
                : "text-slate-300 hover:text-white"
            }`}
          >
            <Camera className="h-3.5 w-3.5" />
            Photos Démo
            {currentMove.freeExerciseDbId && (
              <span className="ml-0.5 rounded-full bg-sky-500/20 px-1.5 py-0 text-[10px] text-sky-300">
                HD
              </span>
            )}
          </button>
        </div>

        {spec.movements.length > 1 && (
          <button
            type="button"
            onClick={() => setAutoSequence((v) => !v)}
            className={`rounded-xl border px-2.5 py-1 text-[11px] font-semibold transition ${
              autoSequence
                ? "border-emerald-400 bg-emerald-500/20 text-emerald-200"
                : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500"
            }`}
          >
            {autoSequence ? "Enchaînement auto : ON" : "Auto-enchaîner"}
          </button>
        )}
      </div>

      {/* Sélecteur de sous-mouvements pour circuits / séances multi-exercices */}
      {spec.movements.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {spec.movements.map((m, idx) => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                setAutoSequence(false);
                setMoveIndex(idx);
              }}
              className={`rounded-xl border px-2.5 py-1 text-[11px] font-semibold transition ${
                idx === moveIndex
                  ? "border-emerald-400 bg-emerald-500/20 text-emerald-200"
                  : "border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-600"
              }`}
            >
              {m.labelFr}
            </button>
          ))}
        </div>
      )}

      {/* Scène active */}
      {activeTab === "coach_3d" && (
        <div>
          {!webglFailed ? (
            <ExerciseCoach3D
              move={currentMove}
              onWebGLUnavailable={() => setWebglFailed(true)}
            />
          ) : (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <MiniExerciseAvatar
                exerciseId={exercise.id}
                moveOverride={currentMove}
                size={220}
              />
              <p className="text-xs font-semibold text-emerald-300">
                {currentMove.breathingCue.concentric}
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === "anatomy" && (
        <AnatomicalMuscleMap
          primaryMuscles={currentMove.primaryMuscles}
          secondaryMuscles={currentMove.secondaryMuscles}
        />
      )}

      {activeTab === "reference_photos" && (
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3.5 space-y-3">
          {currentMove.freeExerciseDbId && !photoError ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoAutoFlip(false);
                      setPhotoFrame(0);
                    }}
                    className={`rounded-lg px-2.5 py-1 font-semibold ${
                      photoFrame === 0
                        ? "bg-sky-500 text-slate-950"
                        : "bg-slate-800 text-slate-300"
                    }`}
                  >
                    Position A (Départ)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoAutoFlip(false);
                      setPhotoFrame(1);
                    }}
                    className={`rounded-lg px-2.5 py-1 font-semibold ${
                      photoFrame === 1
                        ? "bg-emerald-500 text-slate-950"
                        : "bg-slate-800 text-slate-300"
                    }`}
                  >
                    Position B (Effort)
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setPhotoAutoFlip((v) => !v)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-slate-200"
                >
                  {photoAutoFlip ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                  {photoAutoFlip ? "Boucle auto" : "Fixe"}
                </button>
              </div>

              <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getFreeExerciseDbImageUrl(currentMove.freeExerciseDbId, photoFrame)}
                  alt={`${currentMove.labelFr} — position ${photoFrame === 0 ? "départ" : "effort"}`}
                  onError={() => setPhotoError(true)}
                  className="mx-auto max-h-64 w-full object-contain bg-white"
                />
                <span className="absolute bottom-2 right-2 rounded-full bg-slate-950/85 px-2.5 py-0.5 text-[10px] font-bold text-white">
                  {photoFrame === 0 ? "Position A — Préparation" : "Position B — Contraction"}
                </span>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 py-3 text-center">
              <MiniExerciseAvatar
                exerciseId={exercise.id}
                moveOverride={currentMove}
                size={180}
              />
              <p className="max-w-md text-xs text-slate-300">
                {photoError
                  ? "Mode hors-ligne actif : le mannequin biomécanique local prend le relais automatiquement sans connexion."
                  : "Pour ce sport ou mouvement spécifique, utilisez l'onglet Coach 3D Animé à 360° qui reproduit la gestuelle complète."}
              </p>
            </div>
          )}

          <p className="text-[10px] text-slate-500">
            Sources ouvertes : Free-Exercise-DB (Domaine Public / Unlicense) &amp; poses mobilité Desk-Break (Licence MIT).
          </p>
        </div>
      )}

      {/* Points de posture clés & muscles sollicités */}
      <div className="rounded-xl border border-slate-800/80 bg-slate-900/70 p-3 space-y-2 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold text-slate-400 mr-1">Cibles :</span>
          {currentMove.primaryMuscles.map((m) => (
            <span
              key={m}
              className="rounded-md bg-emerald-500/15 border border-emerald-400/30 px-2 py-0.5 text-[11px] font-semibold text-emerald-200"
            >
              {MUSCLE_LABELS_FR[m]}
            </span>
          ))}
          {currentMove.secondaryMuscles.slice(0, 2).map((m) => (
            <span
              key={m}
              className="rounded-md bg-sky-500/10 border border-sky-400/25 px-2 py-0.5 text-[11px] text-sky-200"
            >
              {MUSCLE_LABELS_FR[m]}
            </span>
          ))}
        </div>

        <ul className="space-y-1 text-[11px] text-slate-300">
          {currentMove.postureTips.map((tip, i) => (
            <li key={i} className="flex items-start gap-1.5">
              <span className="text-emerald-400 font-bold">•</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

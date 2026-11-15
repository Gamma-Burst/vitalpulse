"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  Check,
  ChefHat,
  Clock,
  Crown,
  Lock,
  Play,
  PlusCircle,
  Sparkles,
  Upload,
} from "lucide-react";
import {
  FridgeIngredient,
  FridgeScanSession,
  MealEntry,
  PrimaryGoal,
  SpecialMode,
  StepByStepRecipe,
  SubscriptionState,
} from "@/types/vitalpulse";
import { canRunVisionScan } from "@/lib/billing-bridge";
import { compressImageFile } from "@/lib/native-bridge";

interface FridgeChefViewProps {
  remainingKcal: number;
  rawRemainingKcal?: number;
  remainingProteinG: number;
  remainingFiberG: number;
  specialMode: SpecialMode;
  primaryGoal?: PrimaryGoal;
  todayDateKey: string;
  historyScans: FridgeScanSession[];
  subscription: SubscriptionState;
  onRecordVisionScan: () => void;
  onOpenSubscriptionModal: (reason?: string) => void;
  onSaveFridgeScan: (session: FridgeScanSession) => void;
  onLogRecipeAsMeal: (meal: MealEntry) => void;
}

function playKitchenChime() {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.65);
  } catch {
    // ignore WebAudio restrictions
  }
}

export function FridgeChefView({
  remainingKcal,
  rawRemainingKcal,
  remainingProteinG,
  remainingFiberG,
  specialMode,
  primaryGoal,
  todayDateKey,
  historyScans,
  subscription,
  onRecordVisionScan,
  onOpenSubscriptionModal,
  onSaveFridgeScan,
  onLogRecipeAsMeal,
}: FridgeChefViewProps) {
  const camRef = useRef<HTMLInputElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const visionQuota = useMemo(
    () => canRunVisionScan(subscription, todayDateKey),
    [subscription, todayDateKey]
  );

  const [photoDataUrl, setPhotoDataUrl] = useState("");
  const [userNotes, setUserNotes] = useState("");
  const [maxMinutes, setMaxMinutes] = useState(20);
  const [loading, setLoading] = useState(false);

  const [ingredients, setIngredients] = useState<FridgeIngredient[]>(
    historyScans[0]?.detectedIngredients ?? []
  );
  const [recipes, setRecipes] = useState<StepByStepRecipe[]>(
    historyScans[0]?.recipes ?? []
  );

  // Mode cuisine pas à pas
  const [activeRecipeId, setActiveRecipeId] = useState<string | null>(null);
  const [checkedSteps, setCheckedSteps] = useState<Record<string, boolean>>({});
  const [timerRemainingSec, setTimerRemainingSec] = useState<number | null>(null);
  const [timerLabel, setTimerLabel] = useState("");
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [loggedToast, setLoggedToast] = useState<string | null>(null);

  useEffect(() => {
    if (timerRemainingSec === null) return;
    if (timerRemainingSec <= 0) {
      playKitchenChime();
      setTimerRemainingSec(null);
      return;
    }
    const id = setInterval(() => {
      setTimerRemainingSec((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearInterval(id);
  }, [timerRemainingSec]);

  async function toggleWakeLock() {
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    try {
      if (!wakeLockActive) {
        const nav = navigator as unknown as {
          wakeLock: { request: (type: "screen") => Promise<{ release: () => Promise<void> }> };
        };
        await nav.wakeLock.request("screen");
        setWakeLockActive(true);
      } else {
        setWakeLockActive(false);
      }
    } catch {
      setWakeLockActive(false);
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImageFile(file, 1080);
    setPhotoDataUrl(compressed);
  }

  async function analyzeFridge() {
    const hasPhoto = Boolean(photoDataUrl);
    if (hasPhoto && !visionQuota.allowed) {
      onOpenSubscriptionModal(
        visionQuota.isPlus
          ? "Limite quotidienne de sécurité atteinte pour aujourd'hui."
          : "Vos 5 scans photo IA de découverte ont été utilisés ! Activez vos 7 jours d'essai gratuit FolloWeight Plus (FW+) pour photographier votre frigo et vos assiettes en illimité — la saisie texte de vos ingrédients ci-dessous reste 100 % gratuite et sans pub."
      );
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/analyze-fridge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: photoDataUrl || undefined,
          userNotes:
            userNotes ||
            "Œufs, courgettes, tomates, filets de poulet, riz basmati, yaourt grec",
          remainingKcal,
          remainingProteinG,
          remainingFiberG,
          maxMinutes,
          specialMode,
          primaryGoal,
          allowVisionAi: hasPhoto ? visionQuota.allowed : visionQuota.isPlus,
          licenseToken: subscription.licenseToken,
        }),
      });
      if (!res.ok) return;
      const json = await res.json();
      if (hasPhoto && json.provider === "openai-vision") {
        onRecordVisionScan();
      }
      setIngredients(json.detectedIngredients || []);
      setRecipes(json.recipes || []);
      setActiveRecipeId(json.recipes?.[0]?.id ?? null);

      onSaveFridgeScan({
        id: `fridge-${Date.now()}`,
        createdAt: new Date().toISOString(),
        photoDataUrl: photoDataUrl || undefined,
        userNotes,
        detectedIngredients: json.detectedIngredients || [],
        recipes: json.recipes || [],
        provider: json.provider || "ciqual-deterministic",
      });
    } finally {
      setLoading(false);
    }
  }

  function handleLogRecipe(rec: StepByStepRecipe) {
    const now = new Date().toISOString();
    const meal: MealEntry = {
      id: `meal-recipe-${Date.now()}`,
      createdAt: now,
      dateKey: todayDateKey,
      mealType: "dinner",
      userNotes: `Recette cuisinée : ${rec.title}`,
      plateDiameterCm: 26,
      portionEatenPct: 100,
      dishTitle: rec.title,
      summaryFr: rec.whyItFitsToday,
      confidence: 0.9,
      analysisProvider: "ciqual-deterministic",
      caloriesCentral: rec.caloriesPerServing,
      caloriesMin: Math.round(rec.caloriesPerServing * 0.9),
      caloriesMax: Math.round(rec.caloriesPerServing * 1.1),
      macros: rec.macros,
      micronutrients: {
        ironMg: 2.5,
        magnesiumMg: 75,
        calciumMg: 120,
        potassiumMg: 620,
        vitCMg: 32,
        vitDUg: 1.5,
      },
      novaGroup: rec.novaGroup,
      glycemicLoad: rec.glycemicLoad,
      satietyScore: 90,
      healthScore: 92,
      items: [],
      smartClarifier: {
        oilLevel: "light_1tbsp",
        appliedOilDeltaKcal: 45,
        questionFr: "Huile de cuisson incluse",
      },
      clinicalSources: ["Recette calibrée ANSES Ciqual · Ferme ta journée"],
      revisions: [],
    };
    onLogRecipeAsMeal(meal);
    setLoggedToast(`1 portion de "${rec.title}" (${rec.caloriesPerServing} kcal) ajoutée au journal !`);
    setTimeout(() => setLoggedToast(null), 4000);
  }

  return (
    <div className="space-y-5">
      <div className="vp-card-accent p-4 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <ChefHat className="w-5 h-5 text-emerald-400" />
              Frigo → Recettes faciles étape par étape
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              Prenez en photo votre frigo ou vos aliments : les recettes s&apos;adaptent automatiquement à ce qu&apos;il vous reste à manger aujourd&apos;hui (&laquo;&nbsp;Ferme ta journée&nbsp;&raquo;).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenSubscriptionModal()}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition ${
                visionQuota.isPlus
                  ? "border-amber-400/40 bg-amber-500/15 text-amber-200"
                  : visionQuota.allowed
                    ? "border-emerald-400/35 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25"
                    : "border-rose-400/40 bg-rose-500/15 text-rose-200 hover:bg-rose-500/25"
              }`}
            >
              {visionQuota.isPlus ? (
                <>
                  <Crown className="w-3.5 h-3.5" />
                  FW+ Scans Illimités
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Découverte : {visionQuota.remaining}/{visionQuota.limit} scans photo · FW+
                </>
              )}
            </button>
            <div className="rounded-xl bg-slate-950/70 border border-emerald-400/30 px-3 py-2 text-xs text-right">
              {rawRemainingKcal !== undefined && rawRemainingKcal <= 0 ? (
                <>
                  <span className="text-amber-300 block font-semibold">
                    Objectif calorique atteint
                  </span>
                  <strong className="text-emerald-300 tabular-nums">
                    Idée légère suggérée (~250 kcal)
                  </strong>
                </>
              ) : (
                <>
                  <span className="text-slate-400 block">Budget restant aujourd&apos;hui</span>
                  <strong className="text-emerald-300 tabular-nums">
                    {Math.max(200, remainingKcal)} kcal ·{" "}
                    {Math.max(15, Math.round(remainingProteinG))} g protéines
                  </strong>
                </>
              )}
            </div>
          </div>
        </div>

        {!visionQuota.isPlus && !visionQuota.allowed && (
          <div className="rounded-xl border border-emerald-400/35 bg-emerald-500/10 p-3 flex flex-wrap items-center justify-between gap-2.5 text-xs">
            <div className="text-slate-200">
              <strong className="text-emerald-300">
                Pack découverte épuisé ({visionQuota.limit}/{visionQuota.limit} scans photo IA) :
              </strong>{" "}
              débloquez l&apos;analyse photo de votre frigo en illimité avec 7 jours gratuits, ou saisissez vos ingrédients par texte ci-dessous gratuitement sans pub.
            </div>
            <button
              type="button"
              onClick={() =>
                onOpenSubscriptionModal(
                  "Vos 5 scans photo IA de découverte ont été utilisés ! Activez vos 7 jours d'essai gratuit FolloWeight Plus (FW+) pour photographier votre frigo et vos assiettes en illimité — la saisie texte de vos ingrédients ci-dessous reste 100 % gratuite et sans pub."
                )
              }
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-extrabold text-slate-950 hover:bg-emerald-400 shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Essayer FW+ 7 jours gratuits (Scans photo illimités)
            </button>
          </div>
        )}

        <input
          ref={camRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFile}
        />
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
        />

        <div className="rounded-2xl border border-dashed border-emerald-400/35 bg-slate-950/60 p-4 flex flex-col items-center gap-3">
          {photoDataUrl ? (
            <div className="w-full max-w-md space-y-2 text-center">
              <img
                src={photoDataUrl}
                alt="Contenu du frigo"
                className="w-full max-h-56 object-cover rounded-xl border border-slate-700"
              />
              <button
                type="button"
                onClick={() => setPhotoDataUrl("")}
                className="text-xs text-slate-400 hover:text-white"
              >
                Retirer la photo
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap justify-center gap-3 py-2">
              <button
                type="button"
                onClick={() => camRef.current?.click()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs sm:text-sm"
              >
                <Camera className="w-4 h-4" />
                Photographier mon frigo
              </button>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 text-white border border-slate-700 text-xs sm:text-sm"
              >
                <Upload className="w-4 h-4" />
                Choisir une photo
              </button>
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-emerald-300 mb-1">
            Aliments cachés, restes ou contraintes (en dessous de la photo) :
          </label>
          <textarea
            rows={2}
            value={userNotes}
            onChange={(e) => setUserNotes(e.target.value)}
            placeholder="Ex : j'ai aussi du riz basmati, 3 œufs, des courgettes à finir vite, envie d'un dîner rapide en 15 min..."
            className="w-full rounded-xl bg-slate-950 border border-slate-700 p-3 text-sm text-white placeholder:text-slate-500"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="text-xs text-slate-300 flex items-center gap-2">
            Temps max :
            <select
              value={maxMinutes}
              onChange={(e) => setMaxMinutes(Number(e.target.value))}
              className="rounded-lg bg-slate-900 border border-slate-700 px-2.5 py-1.5 text-white"
            >
              <option value={10}>10 min express</option>
              <option value={20}>20 min facile</option>
              <option value={30}>30 min complet</option>
            </select>
          </label>

          <button
            type="button"
            onClick={() => void analyzeFridge()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm"
          >
            <Sparkles className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Génération des recettes..." : "Trouver 3 recettes anti-gaspi sur mesure"}
          </button>
        </div>
      </div>

      {loggedToast && (
        <div className="rounded-xl bg-emerald-500/20 border border-emerald-400/40 p-3 text-xs text-emerald-200 flex items-center gap-2">
          <Check className="w-4 h-4" />
          {loggedToast}
        </div>
      )}

      {/* Minuteur actif en bandeau */}
      {timerRemainingSec !== null && (
        <div className="sticky top-2 z-30 rounded-2xl bg-amber-500 text-slate-950 p-3.5 shadow-xl flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-sm">
            <Clock className="w-5 h-5 animate-pulse" />
            <span>
              Minuteur ({timerLabel}) : {Math.floor(timerRemainingSec / 60)}:
              {String(timerRemainingSec % 60).padStart(2, "0")}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setTimerRemainingSec(null)}
            className="px-3 py-1 rounded-lg bg-slate-950 text-white text-xs font-semibold"
          >
            Arrêter
          </button>
        </div>
      )}

      {/* Ingrédients détectés */}
      {ingredients.length > 0 && (
        <div className="vp-card p-4 space-y-2">
          <h3 className="text-sm font-semibold text-white">Ingrédients repérés dans votre frigo</h3>
          <div className="flex flex-wrap gap-2">
            {ingredients.map((ing, i) => (
              <span
                key={`${ing.name}-${i}`}
                className={`px-3 py-1.5 rounded-full text-xs border ${
                  ing.urgency === "use_soon"
                    ? "bg-amber-500/15 border-amber-400/40 text-amber-200"
                    : "bg-slate-900 border-slate-700 text-slate-200"
                }`}
              >
                {ing.name} ({ing.quantityLabel})
                {ing.urgency === "use_soon" ? " · À utiliser vite" : ""}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Liste des 3 Recettes Étape par Étape */}
      {recipes.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-bold text-white">
              Recettes recommandées pour votre journée ({recipes.length})
            </h3>
            <button
              type="button"
              onClick={() => void toggleWakeLock()}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs border ${
                wakeLockActive
                  ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-300"
                  : "bg-slate-900 border-slate-700 text-slate-300"
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              {wakeLockActive ? "Écran maintenu allumé" : "Garder écran allumé (cuisine)"}
            </button>
          </div>

          {recipes.map((rec) => {
            const isOpen = activeRecipeId === rec.id || recipes.length === 1;
            return (
              <div key={rec.id} className="vp-card p-4 sm:p-5 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h4 className="text-base sm:text-lg font-bold text-white">{rec.title}</h4>
                    <p className="text-xs text-emerald-300 mt-1">{rec.whyItFitsToday}</p>
                    <div className="flex flex-wrap gap-3 text-xs text-slate-400 mt-2">
                      <span>⏱ {rec.prepMinutes + rec.cookMinutes} min</span>
                      <span>🔥 {rec.caloriesPerServing} kcal / portion</span>
                      <span>💪 {rec.macros.proteinG}g prot · 🌾 {rec.macros.fiberG}g fibres</span>
                      <span>NOVA {rec.novaGroup}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveRecipeId(isOpen ? null : rec.id)}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium"
                    >
                      {isOpen ? "Masquer étapes" : "Voir étapes & minuteurs"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLogRecipe(rec)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold"
                    >
                      <PlusCircle className="w-4 h-4" />
                      J&apos;ai mangé 1 portion
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="pt-3 border-t border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="rounded-xl bg-slate-900/70 p-3 text-xs space-y-1.5">
                      <strong className="text-white block mb-1">Ingrédients (1 portion) :</strong>
                      <ul className="list-disc pl-4 space-y-1 text-slate-300">
                        {rec.ingredients.map((ing, k) => (
                          <li key={k}>{ing}</li>
                        ))}
                      </ul>
                      <p className="text-[11px] text-sky-300 pt-2">{rec.clinicalNote}</p>
                    </div>

                    <div className="md:col-span-2 space-y-2">
                      <strong className="text-xs text-white block">
                        Préparation pas à pas (cochez au fur et à mesure) :
                      </strong>
                      {rec.steps.map((st) => {
                        const key = `${rec.id}-${st.stepNumber}`;
                        const done = Boolean(checkedSteps[key]);
                        return (
                          <div
                            key={key}
                            className={`rounded-xl p-3 border text-xs flex flex-col gap-2 transition ${
                              done
                                ? "bg-emerald-500/10 border-emerald-400/30 text-slate-300"
                                : "bg-slate-900/90 border-slate-800 text-white"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <button
                                type="button"
                                onClick={() =>
                                  setCheckedSteps((prev) => ({ ...prev, [key]: !done }))
                                }
                                className="flex items-start gap-2.5 text-left"
                              >
                                <span
                                  className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 border ${
                                    done
                                      ? "bg-emerald-500 border-emerald-400 text-slate-950"
                                      : "border-slate-600 text-slate-400"
                                  }`}
                                >
                                  {done ? <Check className="w-3.5 h-3.5" /> : st.stepNumber}
                                </span>
                                <span className={done ? "line-through opacity-75" : ""}>
                                  {st.instruction}
                                </span>
                              </button>
                              {st.timerSeconds && st.timerSeconds > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTimerLabel(`Étape ${st.stepNumber}`);
                                    setTimerRemainingSec(st.timerSeconds!);
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-400/30 shrink-0 font-semibold"
                                >
                                  <Play className="w-3 h-3" />
                                  {Math.round(st.timerSeconds / 60)} min
                                </button>
                              )}
                            </div>
                            {st.tip && (
                              <p className="text-[11px] text-emerald-300/90 pl-7">
                                Astuce chef santé : {st.tip}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

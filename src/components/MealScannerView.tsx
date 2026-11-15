"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  CheckCircle2,
  Columns,
  Crown,
  Edit3,
  History,
  RefreshCw,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import {
  AnalysisRevision,
  MealEntry,
  MealType,
  OilLevel,
  PrimaryGoal,
  SpecialMode,
  SubscriptionState,
} from "@/types/vitalpulse";
import { canRunVisionScan } from "@/lib/billing-bridge";
import { compressImageFile } from "@/lib/native-bridge";
import { applyOilClarifierDelta } from "@/data/ciqual-reference";
import { InfoTip } from "@/components/ui/InfoTip";

interface MealScannerViewProps {
  meals: MealEntry[];
  todayDateKey: string;
  specialMode: SpecialMode;
  primaryGoal?: PrimaryGoal;
  highlightedMealId?: string | null;
  subscription: SubscriptionState;
  onRecordVisionScan: () => void;
  onOpenSubscriptionModal: (reason?: string) => void;
  onSaveMeal: (meal: MealEntry) => void;
  onUpdateMeal: (meal: MealEntry) => void;
  onDeleteMeal: (mealId: string) => void;
  onOpenBarcode?: () => void;
}

function generateSampleRasterPlate(kind: "salmon" | "pasta" | "salad"): {
  dataUrl: string;
  notes: string;
  mealType: MealType;
} {
  if (typeof document === "undefined") {
    return { dataUrl: "", notes: "", mealType: "lunch" };
  }
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#172026";
    ctx.fillRect(0, 0, 640, 480);
    ctx.fillStyle = "#e2e8f0";
    ctx.beginPath();
    ctx.arc(320, 240, 178, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 4;
    ctx.stroke();

    if (kind === "salmon") {
      ctx.fillStyle = "#fb7185";
      ctx.fillRect(195, 160, 130, 82);
      ctx.fillStyle = "#fde68a";
      ctx.beginPath();
      ctx.arc(390, 200, 56, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#22c55e";
      ctx.beginPath();
      ctx.arc(310, 315, 58, 0, Math.PI * 2);
      ctx.fill();
    } else if (kind === "pasta") {
      ctx.fillStyle = "#fbbf24";
      ctx.beginPath();
      ctx.arc(320, 240, 110, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(320, 225, 52, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#92400e";
      ctx.fillRect(280, 205, 80, 40);
    } else {
      ctx.fillStyle = "#4ade80";
      ctx.beginPath();
      ctx.arc(320, 240, 120, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(250, 185, 55, 42);
      ctx.fillStyle = "#d97706";
      ctx.beginPath();
      ctx.arc(365, 255, 42, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  if (kind === "salmon") {
    return {
      dataUrl,
      notes: "Pavé de saumon 150g grillé, quinoa 150g, brocoli vapeur, 1 c.à.s d'huile d'olive",
      mealType: "lunch",
    };
  }
  if (kind === "pasta") {
    return {
      dataUrl,
      notes: "Pâtes bolognaise maison 220g, bœuf 120g, parmesan 20g, assiette 26cm",
      mealType: "dinner",
    };
  }
  return {
    dataUrl,
    notes: "Salade pois chiches 150g, feta 40g, demi avocat, tomates cerises, filet d'huile",
    mealType: "lunch",
  };
}

export function MealScannerView({
  meals,
  todayDateKey,
  specialMode,
  primaryGoal,
  highlightedMealId,
  subscription,
  onRecordVisionScan,
  onOpenSubscriptionModal,
  onSaveMeal,
  onUpdateMeal,
  onDeleteMeal,
  onOpenBarcode,
}: MealScannerViewProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const visionQuota = useMemo(
    () => canRunVisionScan(subscription, todayDateKey),
    [subscription, todayDateKey]
  );

  const [photoDataUrl, setPhotoDataUrl] = useState<string>("");
  const [userNotes, setUserNotes] = useState<string>("");
  const [mealType, setMealType] = useState<MealType>("lunch");
  const [plateDiameterCm, setPlateDiameterCm] = useState<number>(26);
  const [portionEatenPct, setPortionEatenPct] = useState<number>(100);
  const [analyzing, setAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [draftResult, setDraftResult] = useState<Omit<MealEntry, "id" | "createdAt" | "dateKey" | "revisions"> | null>(null);
  const [savedToast, setSavedToast] = useState<string | null>(null);

  // Historique, révision & comparateur
  const [selectedMeal, setSelectedMeal] = useState<MealEntry | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [showSamples, setShowSamples] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [itemGramDrafts, setItemGramDrafts] = useState<Record<number, string>>({});
  const hasDraftResult = draftResult !== null;
  const draftDishTitle = draftResult?.dishTitle ?? "";

  useEffect(() => {
    setItemGramDrafts({});
  }, [hasDraftResult, draftDishTitle]);

  useEffect(() => {
    if (highlightedMealId) {
      const found = meals.find((m) => m.id === highlightedMealId);
      if (found) {
        setSelectedMeal(found);
        setEditNotes(found.userNotes || "");
      }
    }
  }, [highlightedMealId, meals]);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    const compressed = await compressImageFile(file, 1080);
    setPhotoDataUrl(compressed);
  }

  async function runAnalysis(overrideOil?: OilLevel) {
    if (!photoDataUrl && !userNotes.trim()) {
      setErrorMsg("Ajoutez une photo de votre plat ou décrivez-le dans la zone de texte en dessous.");
      return;
    }
    const hasPhoto = Boolean(photoDataUrl);
    if (hasPhoto && !visionQuota.allowed) {
      onOpenSubscriptionModal(
        visionQuota.isPlus
          ? "Limite quotidienne de sécurité atteinte pour aujourd'hui."
          : "Vos 5 scans photo IA de découverte ont été utilisés ! Activez vos 7 jours d'essai gratuit FolloWeight Plus (FW+) pour scanner vos assiettes et votre frigo en illimité — le lecteur code-barres EAN et la saisie texte restent 100 % gratuits et sans pub."
      );
      return;
    }
    setAnalyzing(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/analyze-meal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: photoDataUrl || undefined,
          userNotes,
          plateDiameterCm,
          portionEatenPct,
          mealType,
          specialMode,
          primaryGoal,
          oilLevel: overrideOil,
          allowVisionAi: hasPhoto ? visionQuota.allowed : visionQuota.isPlus,
          licenseToken: subscription.licenseToken,
        }),
      });
      if (!res.ok) throw new Error("Erreur d'analyse serveur");
      const json = await res.json();
      if (hasPhoto && json.analysisProvider === "openai-vision") {
        onRecordVisionScan();
      }
      setDraftResult({
        mealType,
        photoDataUrl: photoDataUrl || undefined,
        userNotes,
        plateDiameterCm,
        portionEatenPct,
        ...json,
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Analyse impossible.");
    } finally {
      setAnalyzing(false);
    }
  }

  function applyQuickOilAdjustment(newLevel: OilLevel) {
    if (!draftResult) return;
    const oldDelta = draftResult.smartClarifier.appliedOilDeltaKcal || 0;
    const newDelta = Math.round(applyOilClarifierDelta(newLevel) * (portionEatenPct / 100));
    const diffKcal = newDelta - oldDelta;
    const diffFatG = +(diffKcal / 9).toFixed(1);
    setDraftResult({
      ...draftResult,
      caloriesCentral: Math.max(20, draftResult.caloriesCentral + diffKcal),
      caloriesMin: Math.max(10, draftResult.caloriesMin + diffKcal),
      caloriesMax: Math.max(30, draftResult.caloriesMax + diffKcal),
      macros: {
        ...draftResult.macros,
        fatG: Math.max(0, +(draftResult.macros.fatG + diffFatG).toFixed(1)),
      },
      smartClarifier: {
        ...draftResult.smartClarifier,
        oilLevel: newLevel,
        appliedOilDeltaKcal: newDelta,
      },
    });
  }

  function updateDraftItemGrams(idx: number, newGrams: number) {
    if (!draftResult || !draftResult.items[idx]) return;
    const target = draftResult.items[idx];
    const ratio = newGrams / Math.max(1, target.grams);
    const updatedItems = draftResult.items.map((it, i) =>
      i !== idx
        ? it
        : {
            ...it,
            grams: newGrams,
            kcal: Math.round(it.kcal * ratio),
            proteinG: +(it.proteinG * ratio).toFixed(1),
            carbsG: +(it.carbsG * ratio).toFixed(1),
            fatG: +(it.fatG * ratio).toFixed(1),
            fiberG: +(it.fiberG * ratio).toFixed(1),
            sodiumMg: Math.round(it.sodiumMg * ratio),
          }
    );
    const deltaKcal = updatedItems[idx].kcal - target.kcal;
    const deltaP = updatedItems[idx].proteinG - target.proteinG;
    const deltaC = updatedItems[idx].carbsG - target.carbsG;
    const deltaF = updatedItems[idx].fatG - target.fatG;
    const deltaFib = updatedItems[idx].fiberG - target.fiberG;
    const deltaSod = updatedItems[idx].sodiumMg - target.sodiumMg;

    setDraftResult({
      ...draftResult,
      items: updatedItems,
      caloriesCentral: Math.max(10, draftResult.caloriesCentral + deltaKcal),
      caloriesMin: Math.max(10, draftResult.caloriesMin + deltaKcal),
      caloriesMax: Math.max(20, draftResult.caloriesMax + deltaKcal),
      macros: {
        ...draftResult.macros,
        proteinG: Math.max(0, +(draftResult.macros.proteinG + deltaP).toFixed(1)),
        carbsG: Math.max(0, +(draftResult.macros.carbsG + deltaC).toFixed(1)),
        fatG: Math.max(0, +(draftResult.macros.fatG + deltaF).toFixed(1)),
        fiberG: Math.max(0, +(draftResult.macros.fiberG + deltaFib).toFixed(1)),
        sodiumMg: Math.max(0, draftResult.macros.sodiumMg + deltaSod),
      },
    });
  }

  function saveDraftToJournal() {
    if (!draftResult) return;
    const nowIso = new Date().toISOString();
    const newMeal: MealEntry = {
      id: `meal-${Date.now()}`,
      createdAt: nowIso,
      dateKey: todayDateKey,
      ...draftResult,
      revisions: [
        {
          revisionId: `rev-${Date.now()}`,
          createdAt: nowIso,
          userNotes: draftResult.userNotes,
          plateDiameterCm: draftResult.plateDiameterCm,
          portionEatenPct: draftResult.portionEatenPct,
          oilLevel: draftResult.smartClarifier.oilLevel,
          caloriesCentral: draftResult.caloriesCentral,
          caloriesMin: draftResult.caloriesMin,
          caloriesMax: draftResult.caloriesMax,
          macros: draftResult.macros,
          summaryFr: draftResult.summaryFr,
        },
      ],
    };
    onSaveMeal(newMeal);
    setSavedToast(`"${newMeal.dishTitle}" enregistré dans votre journal & galerie photo !`);
    setDraftResult(null);
    setPhotoDataUrl("");
    setUserNotes("");
    setTimeout(() => setSavedToast(null), 4000);
  }

  async function handleReanalyzeSavedMeal() {
    if (!selectedMeal) return;
    const hasSavedPhoto = Boolean(selectedMeal.photoDataUrl);
    if (hasSavedPhoto && !visionQuota.allowed) {
      onOpenSubscriptionModal(
        visionQuota.isPlus
          ? "Limite quotidienne de sécurité atteinte pour aujourd'hui."
          : "Vos 5 scans photo IA de découverte ont été utilisés ! Activez vos 7 jours d'essai gratuit FolloWeight Plus (FW+) pour ré-analyser vos photos en illimité — vous pouvez aussi modifier vos notes texte sans photo."
      );
      return;
    }
    setReanalyzing(true);
    try {
      const res = await fetch("/api/analyze-meal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: selectedMeal.photoDataUrl || undefined,
          userNotes: editNotes,
          plateDiameterCm: selectedMeal.plateDiameterCm,
          portionEatenPct: selectedMeal.portionEatenPct,
          mealType: selectedMeal.mealType,
          specialMode,
          allowVisionAi: hasSavedPhoto ? visionQuota.allowed : visionQuota.isPlus,
          licenseToken: subscription.licenseToken,
        }),
      });
      if (!res.ok) return;
      const json = await res.json();
      if (hasSavedPhoto && json.analysisProvider === "openai-vision") {
        onRecordVisionScan();
      }
      const newRev: AnalysisRevision = {
        revisionId: `rev-${Date.now()}`,
        createdAt: new Date().toISOString(),
        userNotes: editNotes,
        plateDiameterCm: selectedMeal.plateDiameterCm,
        portionEatenPct: selectedMeal.portionEatenPct,
        oilLevel: json.smartClarifier?.oilLevel || "light_1tbsp",
        caloriesCentral: json.caloriesCentral,
        caloriesMin: json.caloriesMin,
        caloriesMax: json.caloriesMax,
        macros: json.macros,
        summaryFr: json.summaryFr,
      };
      const updated: MealEntry = {
        ...selectedMeal,
        ...json,
        userNotes: editNotes,
        revisions: [...(selectedMeal.revisions || []), newRev],
      };
      onUpdateMeal(updated);
      setSelectedMeal(updated);
    } finally {
      setReanalyzing(false);
    }
  }

  function toggleCompare(id: string) {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  }

  const comparedMeals = compareIds
    .map((id) => meals.find((m) => m.id === id))
    .filter((x): x is MealEntry => Boolean(x));

  const photoMeals = meals.filter((m) => m.photoDataUrl || m.items.length > 0 || !m.id.includes("summary"));

  return (
    <div className="space-y-6">
      {/* Zone Capture Photo + Textbox en dessous */}
      <div className="vp-card-accent p-4 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <Camera className="w-5 h-5 text-emerald-400" />
              Scanner un plat préparé (Photo + Précisions texte)
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              La Vision détecte les aliments et votre zone de texte juste en dessous corrige les huiles, sauces, poids et cuissons invisibles.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => onOpenSubscriptionModal()}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
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
            {onOpenBarcode && (
              <button
                type="button"
                onClick={onOpenBarcode}
                className="px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-bold hover:bg-amber-500/30"
              >
                Code-barres EAN
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowSamples((v) => !v)}
              className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700 text-xs text-slate-300 hover:border-emerald-400/50"
            >
              {showSamples ? "Masquer exemples ▲" : "Exemples démo ▾"}
            </button>
          </div>
        </div>

        {!visionQuota.isPlus && !visionQuota.allowed && (
          <div className="rounded-xl border border-emerald-400/35 bg-emerald-500/10 p-3 flex flex-wrap items-center justify-between gap-2.5 text-xs">
            <div className="text-slate-200">
              <strong className="text-emerald-300">
                Pack découverte épuisé ({visionQuota.limit}/{visionQuota.limit} scans photo IA) :
              </strong>{" "}
              débloquez les scans photo illimités avec 7 jours gratuits, ou utilisez le scan code-barres EAN et la saisie texte gratuits sans pub.
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  onOpenSubscriptionModal(
                    "Vos 5 scans photo IA de découverte ont été utilisés ! Activez vos 7 jours d'essai gratuit FolloWeight Plus (FW+) pour scanner vos assiettes et votre frigo en illimité — le lecteur code-barres EAN et la saisie texte restent 100 % gratuits et sans pub."
                  )
                }
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-extrabold text-slate-950 hover:bg-emerald-400"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Essayer FW+ 7 jours gratuits (Scans photo illimités)
              </button>
              {onOpenBarcode && (
                <button
                  type="button"
                  onClick={onOpenBarcode}
                  className="rounded-xl border border-amber-400/40 bg-amber-500/15 px-3 py-1.5 text-xs font-bold text-amber-200 hover:bg-amber-500/25"
                >
                  Code-barres EAN gratuit illimité
                </button>
              )}
            </div>
          </div>
        )}

        {showSamples && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {(["salmon", "pasta", "salad"] as const).map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => {
                  const s = generateSampleRasterPlate(sample);
                  setPhotoDataUrl(s.dataUrl);
                  setUserNotes(s.notes);
                  setMealType(s.mealType);
                  setDraftResult(null);
                  setShowSamples(false);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900/90 border border-slate-700 hover:border-emerald-400/60 text-[11px] text-slate-200 transition"
              >
                Essai {sample === "salmon" ? "Saumon" : sample === "pasta" ? "Pâtes" : "Bowl"}
              </button>
            ))}
          </div>
        )}

        {/* Inputs caméra / galerie */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileSelect}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />

        <div className="rounded-2xl border border-dashed border-emerald-400/35 bg-slate-950/60 p-4 flex flex-col items-center justify-center gap-3">
          {photoDataUrl ? (
            <div className="w-full max-w-md space-y-2">
              <img
                src={photoDataUrl}
                alt="Aperçu du plat à analyser"
                className="w-full max-h-64 object-cover rounded-xl border border-slate-700"
              />
              <div className="flex justify-center gap-2">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs text-white"
                >
                  Reprendre photo
                </button>
                <button
                  type="button"
                  onClick={() => setPhotoDataUrl("")}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 text-xs text-slate-400"
                >
                  Retirer l&apos;image
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-center gap-3 py-3">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs sm:text-sm transition"
              >
                <Camera className="w-4 h-4" />
                Prendre une photo du plat
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs sm:text-sm border border-slate-700 transition"
              >
                <Upload className="w-4 h-4" />
                Importer depuis galerie
              </button>
            </div>
          )}
        </div>

        {/* TEXTBOX EN DESSOUS DE LA PHOTO */}
        <div className="space-y-1.5">
          <label
            htmlFor="meal-user-notes"
            className="block text-xs font-semibold text-emerald-300"
          >
            Informations supplémentaires sur le plat (en dessous de la photo) :
          </label>
          <textarea
            id="meal-user-notes"
            rows={3}
            value={userNotes}
            onChange={(e) => setUserNotes(e.target.value)}
            placeholder="Ex : cuit avec 1 c.à.s d'huile d'olive, crème légère dans la sauce, 150 g de poulet, j'ai mangé les 3/4 de l'assiette..."
            className="w-full rounded-xl bg-slate-950/90 border border-slate-700 focus:border-emerald-400 outline-none p-3 text-sm text-white placeholder:text-slate-500"
          />
        </div>

        {/* Paramètres d'échelle & repas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="text-slate-400 block mb-1">Moment du repas</label>
            <select
              value={mealType}
              onChange={(e) => setMealType(e.target.value as MealType)}
              className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-white"
            >
              <option value="breakfast">Petit-déjeuner</option>
              <option value="lunch">Déjeuner</option>
              <option value="snack">Collation / Goûter</option>
              <option value="dinner">Dîner</option>
            </select>
          </div>
          <div>
            <label className="text-slate-400 block mb-1">
              Taille assiette : <strong className="text-white">{plateDiameterCm} cm</strong>
            </label>
            <input
              type="range"
              min={20}
              max={32}
              value={plateDiameterCm}
              onChange={(e) => setPlateDiameterCm(Number(e.target.value))}
              className="w-full accent-emerald-400"
            />
          </div>
          <div>
            <label className="text-slate-400 block mb-1">
              Portion mangée : <strong className="text-white">{portionEatenPct}%</strong>
            </label>
            <input
              type="range"
              min={25}
              max={150}
              step={5}
              value={portionEatenPct}
              onChange={(e) => setPortionEatenPct(Number(e.target.value))}
              className="w-full accent-emerald-400"
            />
          </div>
        </div>

        {errorMsg && (
          <div className="rounded-xl bg-rose-500/15 border border-rose-400/40 p-3 text-xs text-rose-200">
            {errorMsg}
          </div>
        )}
        {savedToast && (
          <div className="rounded-xl bg-emerald-500/20 border border-emerald-400/40 p-3 text-xs text-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {savedToast}
          </div>
        )}

        <button
          type="button"
          onClick={() => void runAnalysis()}
          disabled={analyzing}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition disabled:opacity-60"
        >
          <Sparkles className={`w-4 h-4 ${analyzing ? "animate-spin" : ""}`} />
          {analyzing ? "Analyse Vision + Ciqual en cours..." : "Analyser les calories, macros & santé"}
        </button>
      </div>

      {/* Résultat complet de l'analyse en cours */}
      {draftResult && (
        <div className="vp-card p-4 sm:p-6 space-y-4 border-emerald-500/40">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <span className="text-[11px] uppercase tracking-wide text-emerald-300 font-semibold">
                {draftResult.analysisProvider === "openai-vision"
                  ? "OpenAI Vision + Ancrage ANSES Ciqual"
                  : "Calcul déterministe ANSES Ciqual"} · Confiance {Math.round(draftResult.confidence * 100)}%
              </span>
              <h3 className="text-xl font-bold text-white mt-0.5">{draftResult.dishTitle}</h3>
              <p className="text-xs text-slate-300 mt-1">{draftResult.summaryFr}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-emerald-300 tabular-nums">
                {draftResult.caloriesCentral} kcal
              </div>
              <div className="text-xs text-slate-400 tabular-nums">
                Fourchette honnête : {draftResult.caloriesMin} – {draftResult.caloriesMax} kcal
              </div>
            </div>
          </div>

          {/* Clarificateur rapide 1-clic (Huiles & Sauces invisibles) */}
          <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3 space-y-2">
            <p className="text-xs font-medium text-sky-200">
              {draftResult.smartClarifier.questionFr}
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { id: "none" as const, label: "Aucune / Vapeur (0 kcal)" },
                { id: "light_1tbsp" as const, label: "1 c.à.s huile / filet (+110 kcal)" },
                { id: "rich_restaurant" as const, label: "Sauce / resto riche (+230 kcal)" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => applyQuickOilAdjustment(opt.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    draftResult.smartClarifier.oilLevel === opt.id
                      ? "bg-emerald-500 text-slate-950 font-semibold"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Macros & Scores Santé */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 text-center text-xs">
            <div className="rounded-xl bg-slate-900 p-2.5">
              <span className="text-slate-400 block">Protéines</span>
              <strong className="text-sm text-emerald-300">{draftResult.macros.proteinG} g</strong>
            </div>
            <div className="rounded-xl bg-slate-900 p-2.5">
              <span className="text-slate-400 block">Glucides</span>
              <strong className="text-sm text-sky-300">{draftResult.macros.carbsG} g</strong>
            </div>
            <div className="rounded-xl bg-slate-900 p-2.5">
              <span className="text-slate-400 block">Lipides</span>
              <strong className="text-sm text-amber-300">{draftResult.macros.fatG} g</strong>
            </div>
            <div className="rounded-xl bg-slate-900 p-2.5">
              <span className="text-slate-400 block">Fibres</span>
              <strong className="text-sm text-lime-300">{draftResult.macros.fiberG} g</strong>
            </div>
            <div className="rounded-xl bg-slate-900 p-2.5">
              <span className="text-slate-400 block">
                Sodium <InfoTip term="sodium_oms" />
              </span>
              <strong className="text-sm text-rose-300">{draftResult.macros.sodiumMg} mg</strong>
            </div>
            <div className="rounded-xl bg-slate-900 p-2.5">
              <span className="text-slate-400 block">
                NOVA <InfoTip term="nova" /> · CG <InfoTip term="glycemic_load" />
              </span>
              <strong className="text-sm text-white">
                {draftResult.novaGroup} · {draftResult.glycemicLoad}
              </strong>
            </div>
          </div>

          {/* Micronutriments */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-[11px] text-slate-300 bg-slate-900/50 rounded-xl p-3">
            <span>Fer : <strong>{draftResult.micronutrients.ironMg} mg</strong></span>
            <span>Magnésium : <strong>{draftResult.micronutrients.magnesiumMg} mg</strong></span>
            <span>Calcium : <strong>{draftResult.micronutrients.calciumMg} mg</strong></span>
            <span>Potassium : <strong>{draftResult.micronutrients.potassiumMg} mg</strong></span>
            <span>Vit. C : <strong>{draftResult.micronutrients.vitCMg} mg</strong></span>
            <span>Vit. D : <strong>{draftResult.micronutrients.vitDUg} µg</strong></span>
          </div>

          {/* Détail ingrédients éditable */}
          {draftResult.items.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-300">
                Ingrédients détectés (ajustez les grammes si vous connaissez le poids exact) :
              </p>
              <div className="space-y-1.5">
                {draftResult.items.map((item, idx) => (
                  <div
                    key={`${item.name}-${idx}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-900/80 px-3 py-2 text-xs"
                  >
                    <span className="text-white font-medium">{item.name}</span>
                    <div className="flex items-center gap-3">
                      <label className="inline-flex items-center gap-1 text-slate-400">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={itemGramDrafts[idx] ?? String(item.grams)}
                          onChange={(e) => {
                            const cleaned = e.target.value.replace(/[^\d]/g, "");
                            setItemGramDrafts((prev) => ({ ...prev, [idx]: cleaned }));
                            if (!cleaned) return;
                            const n = Number.parseInt(cleaned, 10);
                            if (Number.isFinite(n) && n >= 5) {
                              updateDraftItemGrams(idx, Math.min(1500, n));
                            }
                          }}
                          onBlur={() => {
                            const raw = itemGramDrafts[idx];
                            setItemGramDrafts((prev) => {
                              const next = { ...prev };
                              delete next[idx];
                              return next;
                            });
                            if (raw === undefined) return;
                            const n = Number.parseInt(raw, 10);
                            if (!Number.isFinite(n)) return;
                            updateDraftItemGrams(idx, Math.min(1500, Math.max(5, n)));
                          }}
                          className="w-16 rounded bg-slate-950 border border-slate-700 px-2 py-1 text-white text-right tabular-nums"
                        />
                        g
                      </label>
                      <span className="text-emerald-300 font-semibold w-16 text-right tabular-nums">
                        {item.kcal} kcal
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <span className="text-[11px] text-slate-400">
              Satiété <InfoTip term="satiety_score" /> : {draftResult.satietyScore}/100 · Score Santé : {draftResult.healthScore}/100
            </span>
            <button
              type="button"
              onClick={saveDraftToJournal}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition"
            >
              <CheckCircle2 className="w-4 h-4" />
              Enregistrer dans le journal &amp; la galerie photo
            </button>
          </div>
        </div>
      )}

      {/* Comparateur Côte-à-Côte de 2 plats */}
      {comparedMeals.length === 2 && (
        <div className="vp-card p-4 sm:p-5 border-sky-500/40 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Columns className="w-4 h-4 text-sky-400" />
              Comparateur côte à côte de 2 repas
            </h3>
            <button
              type="button"
              onClick={() => setCompareIds([])}
              className="text-xs text-slate-400 hover:text-white"
            >
              Effacer sélection
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {comparedMeals.map((m) => (
              <div key={m.id} className="rounded-xl bg-slate-900/90 border border-slate-800 p-3 space-y-2">
                {m.photoDataUrl && (
                  <img
                    src={m.photoDataUrl}
                    alt={m.dishTitle}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                )}
                <div className="font-bold text-sm text-white">{m.dishTitle}</div>
                <div className="grid grid-cols-2 gap-1.5 text-slate-300">
                  <span>Calories : <strong className="text-amber-300">{m.caloriesCentral} kcal</strong></span>
                  <span>Protéines : <strong className="text-emerald-300">{m.macros.proteinG} g</strong></span>
                  <span>Fibres : <strong className="text-lime-300">{m.macros.fiberG} g</strong></span>
                  <span>Sodium : <strong>{m.macros.sodiumMg} mg</strong></span>
                  <span>NOVA : <strong>{m.novaGroup}/4</strong></span>
                  <span>Charge Glyc. : <strong>{m.glycemicLoad}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Historique permanent des photos & ré-analyses (repliable pour garder une vue épurée) */}
      <div className="vp-card p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className="text-base sm:text-lg font-semibold text-white flex items-center gap-2 text-left"
          >
            <History className="w-5 h-5 text-emerald-400" />
            <span>Historique permanent des photos ({photoMeals.length})</span>
            <span className="text-xs font-medium text-emerald-300">
              {showHistory || comparedMeals.length > 0 ? "▲ Réduire" : "▾ Déplier"}
            </span>
          </button>
          <span className="text-xs text-slate-400">
            Cochez 2 plats pour les comparer côte à côte
          </span>
        </div>

        {(showHistory || comparedMeals.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {photoMeals.map((meal) => {
            const isComp = compareIds.includes(meal.id);
            return (
              <div
                key={meal.id}
                className={`rounded-xl bg-slate-900/85 border transition overflow-hidden flex flex-col justify-between ${
                  isComp ? "border-sky-400" : "border-slate-800"
                }`}
              >
                <div>
                  {meal.photoDataUrl && (
                    <img
                      src={meal.photoDataUrl}
                      alt={meal.dishTitle}
                      onClick={() => {
                        setSelectedMeal(meal);
                        setEditNotes(meal.userNotes || "");
                      }}
                      className="w-full h-36 object-cover cursor-pointer"
                    />
                  )}
                  <div className="p-3 text-xs space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <strong className="text-white text-sm leading-tight">{meal.dishTitle}</strong>
                      <span className="text-emerald-300 font-bold tabular-nums shrink-0">
                        {meal.caloriesCentral} kcal
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">{meal.dateKey}</p>
                    {meal.userNotes && (
                      <p className="text-[11px] text-slate-300 bg-slate-950/70 rounded p-2 line-clamp-2">
                        {meal.userNotes}
                      </p>
                    )}
                    <div className="flex justify-between text-[11px] text-slate-400 pt-1">
                      <span>P {meal.macros.proteinG}g · F {meal.macros.fiberG}g</span>
                      <span>NOVA {meal.novaGroup} · Santé {meal.healthScore}/100</span>
                    </div>
                  </div>
                </div>
                <div className="px-3 pb-3 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => toggleCompare(meal.id)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium ${
                      isComp ? "bg-sky-500 text-slate-950" : "bg-slate-800 text-slate-300"
                    }`}
                  >
                    {isComp ? "Sélectionné" : "Comparer"}
                  </button>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMeal(meal);
                        setEditNotes(meal.userNotes || "");
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-white"
                    >
                      <Edit3 className="w-3 h-3" /> Réviser
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteMeal(meal.id)}
                      aria-label="Supprimer repas"
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        )}
      </div>

      {/* Modale d'édition & ré-analyse de photo archivée */}
      {selectedMeal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedMeal(null)}
        >
          <div
            className="vp-card max-w-xl w-full max-h-[90vh] overflow-y-auto p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {selectedMeal.photoDataUrl && (
              <img
                src={selectedMeal.photoDataUrl}
                alt={selectedMeal.dishTitle}
                className="w-full max-h-60 object-cover rounded-xl"
              />
            )}
            <div className="flex justify-between items-start gap-2">
              <div>
                <h4 className="text-lg font-bold text-white">{selectedMeal.dishTitle}</h4>
                <p className="text-xs text-slate-400">{selectedMeal.summaryFr}</p>
              </div>
              <span className="text-lg font-bold text-emerald-300 tabular-nums shrink-0">
                {selectedMeal.caloriesCentral} kcal
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-emerald-300 mb-1">
                Modifier les précisions texte &amp; ré-analyser le plat :
              </label>
              <textarea
                rows={3}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 p-3 text-xs text-white"
              />
            </div>

            {selectedMeal.revisions?.length > 0 && (
              <div className="text-[11px] text-slate-400 space-y-1">
                <strong className="text-slate-300">Historique des révisions ({selectedMeal.revisions.length}) :</strong>
                {selectedMeal.revisions.map((r, i) => (
                  <div key={r.revisionId} className="bg-slate-900 rounded p-2">
                    #{i + 1} · {r.caloriesCentral} kcal — {r.userNotes || "Sans note"}
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedMeal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-200"
              >
                Fermer
              </button>
              <button
                type="button"
                onClick={() => void handleReanalyzeSavedMeal()}
                disabled={reanalyzing}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${reanalyzing ? "animate-spin" : ""}`} />
                {reanalyzing ? "Ré-analyse..." : "Ré-analyser (Nouvelle révision)"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

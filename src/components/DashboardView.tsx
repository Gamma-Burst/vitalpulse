"use client";

import React, { useState } from "react";
import {
  Activity,
  AlertTriangle,
  Camera,
  Droplets,
  Flame,
  FlaskConical,
  Footprints,
  Image as ImageIcon,
  Plus,
  Ruler,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import {
  AnthropometricReport,
  BloodPanelEntry,
  BodyMeasurementEntry,
  DailyEnergyBalance,
  MealEntry,
  ScaleDecoderInsight,
  UserProfile,
  WeightTrendPoint,
} from "@/types/vitalpulse";
import { EnergyActivityChart } from "@/components/EnergyActivityChart";

interface DashboardViewProps {
  profile: UserProfile;
  anthro: AnthropometricReport;
  todayBalance: DailyEnergyBalance;
  recentBalances: DailyEnergyBalance[];
  weightTrend: WeightTrendPoint[];
  scaleDecoder: ScaleDecoderInsight | null;
  mealsWithPhotos: MealEntry[];
  rangeDays: 7 | 14 | 30;
  onRangeChange: (d: 7 | 14 | 30) => void;
  onAddWater: (ml: number) => void;
  onQuickLogWeight: (kg: number, waistCm?: number) => void;
  onNavigateTab: (
    tab: "scanner" | "fridge" | "activity" | "bodylab" | "profile" | "medical",
    subTab?: "measurements" | "blood" | "photos"
  ) => void;
  onSelectMealToInspect: (mealId: string) => void;
  onSwitchToRealProfile: () => void;
  latestMeasurement?: BodyMeasurementEntry | null;
  latestBloodPanel?: BloodPanelEntry | null;
  photosCount?: number;
}

function ProgressBar({
  label,
  value,
  target,
  unit,
  colorClass,
}: {
  label: string;
  value: number;
  target: number;
  unit: string;
  colorClass: string;
}) {
  const pct = Math.min(100, Math.round((value / Math.max(1, target)) * 100));
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-300 font-medium">{label}</span>
        <span className="text-slate-200 tabular-nums">
          <strong>{Math.round(value)}</strong> / {target} {unit}
        </span>
      </div>
      <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${colorClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

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
}: DashboardViewProps) {
  const [inspectPhotoMeal, setInspectPhotoMeal] = useState<MealEntry | null>(null);

  const validDays = recentBalances.filter((b) => b.intakeKcal > 0);
  const half = Math.max(1, Math.floor(validDays.length / 2));
  const prevPeriod = validDays.slice(0, half);
  const currPeriod = validDays.slice(half);

  const avg = (arr: DailyEnergyBalance[], fn: (b: DailyEnergyBalance) => number) =>
    arr.length ? Math.round(arr.reduce((s, b) => s + fn(b), 0) / arr.length) : 0;

  const avgCalCurr = avg(currPeriod, (b) => b.intakeKcal);
  const avgCalPrev = avg(prevPeriod, (b) => b.intakeKcal);
  const avgStepsCurr = avg(currPeriod, (b) => b.rawSteps);
  const avgStepsPrev = avg(prevPeriod, (b) => b.rawSteps);
  const avgProtCurr = avg(currPeriod, (b) => b.macros.proteinG);
  const cumulativeNetKcal = validDays.reduce((s, b) => s + b.netBalanceKcal, 0);
  const theoreticalFatDeltaKg = +(cumulativeNetKcal / 7700).toFixed(2);

  const isDeficit = todayBalance.netBalanceKcal <= 0;

  return (
    <div className="space-y-5">
      {profile.isDemoProfile && (
        <div className="rounded-2xl border border-amber-400/35 bg-amber-500/10 p-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 text-xs text-amber-100">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong>Mode Découverte (7 jours d&apos;exemple chargés)</strong> — explorez les graphiques comparatifs et les photos analysées, puis démarrez avec vos vraies mesures dès que vous êtes prêt.
            </div>
          </div>
          <button
            type="button"
            onClick={onSwitchToRealProfile}
            className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-xs transition shrink-0"
          >
            Démarrer mon vrai profil
          </button>
        </div>
      )}

      {/* Carte Équation Énergétique du Jour */}
      <div className="vp-card-accent p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-300 bg-emerald-500/15 px-2.5 py-1 rounded-full">
              <Sparkles className="w-3.5 h-3.5" />
              Bilan énergétique en temps réel · {todayBalance.dateKey}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mt-2 tabular-nums">
              {todayBalance.netBalanceKcal > 0
                ? `+${todayBalance.netBalanceKcal}`
                : todayBalance.netBalanceKcal}{" "}
              kcal{" "}
              <span className="text-sm sm:text-base font-medium text-emerald-300">
                ({isDeficit ? "Déficit" : "Surplus"} aujourd&apos;hui)
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">{todayBalance.statusFr}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onNavigateTab("scanner")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs sm:text-sm transition"
            >
              <Camera className="w-4 h-4" />
              Photo d&apos;un plat
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab("fridge")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs sm:text-sm border border-slate-700 transition"
            >
              Frigo → Recettes
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab("bodylab", "measurements")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 font-medium text-xs sm:text-sm border border-emerald-500/30 transition"
            >
              <Ruler className="w-4 h-4" />
              Corps &amp; Bilans
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
          <div className="rounded-xl bg-slate-950/60 border border-slate-800/80 p-3">
            <span className="text-xs text-slate-400">Mangé ce jour</span>
            <p className="text-lg font-bold text-amber-300 tabular-nums mt-0.5">
              {todayBalance.intakeKcal} kcal
            </p>
            <span className="text-[11px] text-slate-400">
              Reste cible : {todayBalance.remainingToTargetKcal} kcal ({todayBalance.mealsCount} repas)
            </span>
          </div>

          <div className="rounded-xl bg-slate-950/60 border border-slate-800/80 p-3">
            <span className="text-xs text-slate-400">Dépense totale réelle</span>
            <p className="text-lg font-bold text-emerald-300 tabular-nums mt-0.5">
              {todayBalance.totalExpenditureKcal} kcal
            </p>
            <span className="text-[11px] text-slate-400">
              BMR {todayBalance.bmrKcal} + Mouv. {todayBalance.netStepsKcal + todayBalance.netWorkoutsKcal + todayBalance.nonAmbulatoryNeatKcal} + TEF {todayBalance.tefKcal}
            </span>
          </div>

          <div className="rounded-xl bg-slate-950/60 border border-slate-800/80 p-3">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Footprints className="w-3.5 h-3.5 text-sky-400" />
              Pas du jour
            </span>
            <p className="text-lg font-bold text-sky-300 tabular-nums mt-0.5">
              {todayBalance.rawSteps.toLocaleString("fr-FR")}
            </p>
            <span className="text-[11px] text-slate-400">
              {todayBalance.stepDistanceKm} km · {todayBalance.netStepsKcal} kcal nets (hors séance)
            </span>
          </div>

          <div className="rounded-xl bg-slate-950/60 border border-slate-800/80 p-3">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-violet-400" />
              Vrai Bilan Corporel
            </span>
            <p className="text-lg font-bold text-white tabular-nums mt-0.5">
              IMC {anthro.bmi} {anthro.bri ? `· BRI ${anthro.bri}` : ""}
            </p>
            <button
              type="button"
              onClick={() => onNavigateTab("profile")}
              className="text-[11px] text-emerald-400 hover:underline mt-0.5"
            >
              {anthro.wthr ? `Ratio taille ${anthro.wthr} (<0,50 sain)` : "Voir bilan complet →"}
            </button>
          </div>
        </div>

        {/* Macros, Fibres, Sodium & Hydratation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5 pt-4 border-t border-slate-800/80">
          <div className="space-y-2.5">
            <ProgressBar
              label="Protéines (préservation musculaire)"
              value={todayBalance.macros.proteinG}
              target={anthro.targets.proteinG}
              unit="g"
              colorClass="bg-emerald-400"
            />
            <ProgressBar
              label="Glucides"
              value={todayBalance.macros.carbsG}
              target={anthro.targets.carbsG}
              unit="g"
              colorClass="bg-sky-400"
            />
            <ProgressBar
              label="Lipides"
              value={todayBalance.macros.fatG}
              target={anthro.targets.fatG}
              unit="g"
              colorClass="bg-amber-400"
            />
          </div>

          <div className="space-y-2.5">
            <ProgressBar
              label="Fibres ANSES (microbiote & satiété)"
              value={todayBalance.macros.fiberG}
              target={anthro.targets.fiberG}
              unit="g"
              colorClass="bg-lime-400"
            />
            <ProgressBar
              label={`Sodium OMS (seuil ${anthro.targets.sodiumMaxMg} mg)`}
              value={todayBalance.macros.sodiumMg}
              target={anthro.targets.sodiumMaxMg}
              unit="mg"
              colorClass={
                todayBalance.macros.sodiumMg > anthro.targets.sodiumMaxMg
                  ? "bg-rose-400"
                  : "bg-teal-400"
              }
            />
            <div className="flex items-center justify-between gap-2 pt-1">
              <div className="flex-1">
                <ProgressBar
                  label="Hydratation EFSA"
                  value={todayBalance.waterMl}
                  target={anthro.targets.waterMl}
                  unit="mL"
                  colorClass="bg-cyan-400"
                />
              </div>
              <button
                type="button"
                onClick={() => onAddWater(250)}
                className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/30 text-cyan-200 text-xs font-semibold shrink-0"
              >
                <Droplets className="w-3.5 h-3.5" />
                <Plus className="w-3 h-3" /> 250 mL
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Graphique Activité + Calories + Courbe Poids EMA */}
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

      {/* Tendances comparatives */}
      <div className="vp-card p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            Tendances comparatives ({rangeDays} derniers jours)
          </h3>
          <span className="text-xs text-slate-400">
            Cumul bilan :{" "}
            <strong className={cumulativeNetKcal <= 0 ? "text-emerald-400" : "text-amber-300"}>
              {cumulativeNetKcal > 0 ? `+${cumulativeNetKcal}` : cumulativeNetKcal} kcal (≈{" "}
              {theoreticalFatDeltaKg > 0 ? `+${theoreticalFatDeltaKg}` : theoreticalFatDeltaKg} kg)
            </strong>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-3">
            <span className="text-slate-400">Moyenne apports récents</span>
            <p className="text-base font-bold text-white tabular-nums mt-1">{avgCalCurr} kcal/j</p>
            <span className="text-[11px] text-slate-400">
              Période préc. : {avgCalPrev} kcal/j ({avgCalCurr - avgCalPrev >= 0 ? "+" : ""}
              {avgCalCurr - avgCalPrev})
            </span>
          </div>
          <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-3">
            <span className="text-slate-400">Moyenne pas / jour</span>
            <p className="text-base font-bold text-sky-300 tabular-nums mt-1">
              {avgStepsCurr.toLocaleString("fr-FR")} pas
            </p>
            <span className="text-[11px] text-slate-400">
              Période préc. : {avgStepsPrev.toLocaleString("fr-FR")} pas
            </span>
          </div>
          <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-3">
            <span className="text-slate-400">Protéines moyennes</span>
            <p className="text-base font-bold text-emerald-300 tabular-nums mt-1">
              {avgProtCurr} g/j
            </p>
            <span className="text-[11px] text-slate-400">
              Soit {(avgProtCurr / Math.max(40, profile.weightKg)).toFixed(2)} g/kg
            </span>
          </div>
          <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-3">
            <span className="text-slate-400">Qualité NOVA &amp; Glycémie</span>
            <p className="text-base font-bold text-lime-300 tabular-nums mt-1">
              NOVA {todayBalance.avgNovaGroup} · CG {todayBalance.totalGlycemicLoad}
            </p>
            <span className="text-[11px] text-slate-400">
              Cible NOVA idéal ≤ 2,0 (peu transformé)
            </span>
          </div>
        </div>
      </div>

      {/* Accès rapide Corps, Bilan Sanguin & Photos Avant/Après */}
      <div className="vp-card p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
              <Ruler className="w-5 h-5 text-emerald-400" />
              Silhouette, Bilan Sanguin &amp; Transformation
            </h3>
            <p className="text-xs text-slate-400">
              Mensurations multi-sites, analyse biologique avec unités FR/SI et comparateur photo local sécurisé
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab("bodylab", "measurements")}
            className="text-xs text-emerald-400 hover:underline font-medium"
          >
            Ouvrir l&apos;espace Corps &amp; Bilans →
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => onNavigateTab("bodylab", "measurements")}
            className="text-left rounded-xl bg-slate-950/70 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/40 p-3.5 transition"
          >
            <div className="flex items-center justify-between text-xs text-emerald-300 font-semibold">
              <span className="inline-flex items-center gap-1.5">
                <Ruler className="w-4 h-4" />
                Mensurations &amp; Graph
              </span>
              <span>{latestMeasurement ? latestMeasurement.dateKey : "Nouveau"}</span>
            </div>
            <p className="text-sm font-bold text-white mt-1.5 tabular-nums">
              {latestMeasurement?.waistCm
                ? `Taille ${latestMeasurement.waistCm} cm · Hanches ${latestMeasurement.hipsCm ?? "--"} cm`
                : "Enregistrer vos mesures (cm)"}
            </p>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              Tableau comparatif complet &amp; courbe Base 100
            </span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab("bodylab", "blood")}
            className="text-left rounded-xl bg-slate-950/70 hover:bg-slate-900 border border-slate-800 hover:border-sky-500/40 p-3.5 transition"
          >
            <div className="flex items-center justify-between text-xs text-sky-300 font-semibold">
              <span className="inline-flex items-center gap-1.5">
                <FlaskConical className="w-4 h-4" />
                Bilan Sanguin
              </span>
              <span>{latestBloodPanel ? `${latestBloodPanel.analysis.overallScore}/100` : "Prêt"}</span>
            </div>
            <p className="text-sm font-bold text-white mt-1.5">
              {latestBloodPanel
                ? `${latestBloodPanel.analysis.evaluatedMarkers.length} marqueurs (${latestBloodPanel.dateKey})`
                : "Coller un bilan ou photo d'ordonnance"}
            </p>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              Normes labo, cibles prévention &amp; CKD-EPI / HOMA-IR / FIB-4
            </span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab("bodylab", "photos")}
            className="text-left rounded-xl bg-slate-950/70 hover:bg-slate-900 border border-slate-800 hover:border-violet-500/40 p-3.5 transition"
          >
            <div className="flex items-center justify-between text-xs text-violet-300 font-semibold">
              <span className="inline-flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4" />
                Photos Avant / Après
              </span>
              <span>{photosCount} photo{photosCount > 1 ? "s" : ""}</span>
            </div>
            <p className="text-sm font-bold text-white mt-1.5">
              {photosCount >= 2 ? "Curseur Avant/Après & Ghost" : "Suivre l'évolution visuelle"}
            </p>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              100 % local sans EXIF, flou visage &amp; mode discret
            </span>
          </button>
        </div>
      </div>

      {/* Photos analysées visibles directement dans le dashboard */}
      <div className="vp-card p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-400" />
              Derniers plats photographiés &amp; analysés
            </h3>
            <p className="text-xs text-slate-400">
              Cliquez sur une photo pour relire l&apos;analyse complète, modifier les notes ou comparer deux plats
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab("scanner")}
            className="text-xs text-emerald-400 hover:underline font-medium"
          >
            Tout voir &amp; comparer →
          </button>
        </div>

        {mealsWithPhotos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 p-6 text-center text-xs text-slate-400">
            Aucune photo enregistrée pour l&apos;instant. Prenez votre prochain repas en photo dans &laquo;&nbsp;Scanner Plat&nbsp;&raquo;.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {mealsWithPhotos.slice(0, 4).map((meal) => (
              <div
                key={meal.id}
                onClick={() => setInspectPhotoMeal(meal)}
                className="cursor-pointer group rounded-xl overflow-hidden bg-slate-900/90 border border-slate-800 hover:border-emerald-400/50 transition"
              >
                {meal.photoDataUrl && (
                  <img
                    src={meal.photoDataUrl}
                    alt={meal.dishTitle}
                    className="w-full h-36 object-cover group-hover:scale-[1.02] transition"
                  />
                )}
                <div className="p-3 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-white truncate">{meal.dishTitle}</span>
                    <span className="text-emerald-400 font-bold tabular-nums shrink-0">
                      {meal.caloriesCentral} kcal
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                    {meal.userNotes || meal.summaryFr}
                  </p>
                  <div className="flex items-center justify-between mt-2 text-[11px] text-slate-400">
                    <span>
                      P {meal.macros.proteinG}g · G {meal.macros.carbsG}g · L {meal.macros.fatG}g
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                      NOVA {meal.novaGroup}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {inspectPhotoMeal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setInspectPhotoMeal(null)}
        >
          <div
            className="vp-card max-w-lg w-full overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {inspectPhotoMeal.photoDataUrl && (
              <img
                src={inspectPhotoMeal.photoDataUrl}
                alt={inspectPhotoMeal.dishTitle}
                className="w-full max-h-64 object-cover"
              />
            )}
            <div className="p-5 space-y-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-lg font-bold text-white">{inspectPhotoMeal.dishTitle}</h4>
                  <p className="text-xs text-slate-400">{inspectPhotoMeal.dateKey}</p>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold tabular-nums">
                  {inspectPhotoMeal.caloriesCentral} kcal ({inspectPhotoMeal.caloriesMin}–
                  {inspectPhotoMeal.caloriesMax})
                </span>
              </div>
              <p className="text-xs text-slate-300">{inspectPhotoMeal.summaryFr}</p>
              {inspectPhotoMeal.userNotes && (
                <div className="rounded-lg bg-slate-900 p-2.5 text-xs text-slate-300 border border-slate-800">
                  <strong>Vos précisions :</strong> {inspectPhotoMeal.userNotes}
                </div>
              )}
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="rounded-lg bg-slate-900 p-2">
                  <span className="text-slate-400 block">Protéines</span>
                  <strong className="text-emerald-300">{inspectPhotoMeal.macros.proteinG} g</strong>
                </div>
                <div className="rounded-lg bg-slate-900 p-2">
                  <span className="text-slate-400 block">Glucides</span>
                  <strong className="text-sky-300">{inspectPhotoMeal.macros.carbsG} g</strong>
                </div>
                <div className="rounded-lg bg-slate-900 p-2">
                  <span className="text-slate-400 block">Lipides</span>
                  <strong className="text-amber-300">{inspectPhotoMeal.macros.fatG} g</strong>
                </div>
                <div className="rounded-lg bg-slate-900 p-2">
                  <span className="text-slate-400 block">Fibres</span>
                  <strong className="text-lime-300">{inspectPhotoMeal.macros.fiberG} g</strong>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setInspectPhotoMeal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-medium"
                >
                  Fermer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const id = inspectPhotoMeal.id;
                    setInspectPhotoMeal(null);
                    onSelectMealToInspect(id);
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-semibold"
                >
                  Modifier / Ré-analyser
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

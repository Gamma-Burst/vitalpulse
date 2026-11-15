"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Award,
  Bell,
  BellRing,
  CheckCircle2,
  Info,
  Moon,
  PlusCircle,
  RotateCcw,
  Sun,
  Trash2,
  UserCheck,
} from "lucide-react";
import {
  ActivityProfile,
  AnthropometricReport,
  AthleticLevel,
  ChallengeMetric,
  CustomChallenge,
  DailyEnergyBalance,
  PrimaryGoal,
  Sex,
  SpecialMode,
  SportDisciplineId,
  UserProfile,
} from "@/types/vitalpulse";
import { SPORT_DISCIPLINES_CATALOG } from "@/data/exercises-compendium";
import { subscribeBrowserToPush, requestFastingNotificationPermission } from "@/lib/native-bridge";
import { GOAL_METRIC_CATALOG, GoalEvaluationSnapshot } from "@/lib/goals-celebration-engine";
import { DetailSheet } from "@/components/ui/DetailSheet";
import { InfoTip } from "@/components/ui/InfoTip";
import { BirthDateField } from "@/components/ui/BirthDateField";
import {
  formatBirthDateFr,
  isValidBirthDateIso,
  resolveEffectiveAge,
} from "@/lib/metabolic-engine";
import {
  formatDecimalFr,
  parseDecimalInput,
  roundToDecimals,
  sanitizeDecimalDraft,
} from "@/lib/decimal-utils";

interface ProfileChallengesViewProps {
  profile: UserProfile;
  anthro: AnthropometricReport;
  todayBalance: DailyEnergyBalance;
  challenges: CustomChallenge[];
  goalEvaluations?: Record<string, GoalEvaluationSnapshot>;
  onOpenGoalsModal?: () => void;
  onSaveProfile: (next: UserProfile) => void;
  onAddChallenge: (c: CustomChallenge) => void;
  onToggleChallengeToday: (challengeId: string) => void;
  onDeleteChallenge: (challengeId: string) => void;
  onStartFreshWithProfile: (next: UserProfile) => void;
  onResetDemo: () => void;
  onReopenOnboarding?: () => void;
  onSavedReturnHome?: (messageFr: string) => void;
  theme?: "dark" | "light";
  onChangeTheme?: (next: "dark" | "light") => void;
}

export function ProfileChallengesView({
  profile,
  anthro,
  todayBalance,
  challenges,
  goalEvaluations = {},
  onOpenGoalsModal,
  onSaveProfile,
  onAddChallenge,
  onToggleChallengeToday,
  onDeleteChallenge,
  onStartFreshWithProfile,
  onResetDemo,
  onReopenOnboarding,
  onSavedReturnHome,
  theme = "dark",
  onChangeTheme,
}: ProfileChallengesViewProps) {
  const [form, setForm] = useState<UserProfile>(profile);
  const [heightDraft, setHeightDraft] = useState<string>(String(profile.heightCm));
  const [weightDraft, setWeightDraft] = useState<string>(formatDecimalFr(profile.weightKg));
  const [targetWeightDraft, setTargetWeightDraft] = useState<string>(
    formatDecimalFr(profile.targetWeightKg)
  );
  const [waistDraft, setWaistDraft] = useState<string>(
    profile.waistCm ? formatDecimalFr(profile.waistCm) : ""
  );
  const [stepGoalDraft, setStepGoalDraft] = useState<string>(String(profile.dailyStepGoal));
  const [waterGoalDraft, setWaterGoalDraft] = useState<string>(
    String(profile.dailyWaterGoalMl ?? anthro.autoWaterMl)
  );
  const [calorieOverrideDraft, setCalorieOverrideDraft] = useState<string>(
    String(profile.dailyCalorieGoalOverride ?? anthro.autoTargetIntakeKcal)
  );
  const [waterAuto, setWaterAuto] = useState<boolean>(profile.dailyWaterGoalMl === undefined);
  const [calorieAuto, setCalorieAuto] = useState<boolean>(
    profile.dailyCalorieGoalOverride === undefined
  );

  const [showSources, setShowSources] = useState(false);
  const [profileSavedMsg, setProfileSavedMsg] = useState<string | null>(null);
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);
  const [challengeSheetOpen, setChallengeSheetOpen] = useState(false);

  const syncDraftsFromProfile = (source: UserProfile) => {
    setForm(source);
    setHeightDraft(String(source.heightCm));
    setWeightDraft(formatDecimalFr(source.weightKg));
    setTargetWeightDraft(formatDecimalFr(source.targetWeightKg));
    setWaistDraft(source.waistCm ? formatDecimalFr(source.waistCm) : "");
    setStepGoalDraft(String(source.dailyStepGoal));
    setWaterGoalDraft(String(source.dailyWaterGoalMl ?? anthro.autoWaterMl));
    setCalorieOverrideDraft(
      String(source.dailyCalorieGoalOverride ?? anthro.autoTargetIntakeKcal)
    );
    setWaterAuto(source.dailyWaterGoalMl === undefined);
    setCalorieAuto(source.dailyCalorieGoalOverride === undefined);
  };

  const parseDraftNum = (
    raw: string,
    min: number,
    max: number,
    decimal: boolean,
    fallback: number
  ) => {
    const trimmed = raw.trim();
    const parsed = decimal ? parseDecimalInput(trimmed, 2) : Number(trimmed);
    if (trimmed === "" || parsed === undefined || !Number.isFinite(parsed)) return fallback;
    const bounded = Math.max(min, Math.min(max, parsed));
    return decimal ? roundToDecimals(bounded, 2) : Math.round(bounded);
  };

  const handleSubmitProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    const minKcal = Math.max(1200, anthro.clinicalFloorKcal);
    const waistTrimmed = waistDraft.trim();
    const finalWaist =
      waistTrimmed === ""
        ? undefined
        : parseDraftNum(waistTrimmed, 42, 190, true, form.waistCm ?? 80);

    const validDob = isValidBirthDateIso(form.birthDate) ? form.birthDate : undefined;
    const finalProfile: UserProfile = {
      ...form,
      name: form.name.trim() || profile.name,
      age: resolveEffectiveAge({ age: form.age, birthDate: validDob }),
      birthDate: validDob,
      heightCm: parseDraftNum(heightDraft, 120, 230, false, form.heightCm),
      weightKg: parseDraftNum(weightDraft, 30, 280, true, form.weightKg),
      targetWeightKg: parseDraftNum(targetWeightDraft, 35, 250, true, form.targetWeightKg),
      waistCm: finalWaist,
      dailyStepGoal: parseDraftNum(stepGoalDraft, 1500, 30000, false, form.dailyStepGoal),
      dailyWaterGoalMl: waterAuto
        ? undefined
        : parseDraftNum(
            waterGoalDraft,
            1000,
            4500,
            false,
            form.dailyWaterGoalMl ?? anthro.autoWaterMl
          ),
      dailyCalorieGoalOverride:
        anthro.minorSafetyLock || calorieAuto
          ? undefined
          : parseDraftNum(
              calorieOverrideDraft,
              minKcal,
              5500,
              false,
              form.dailyCalorieGoalOverride ?? anthro.autoTargetIntakeKcal
            ),
      isDemoProfile: false,
    };

    onSaveProfile(finalProfile);
    setProfileSavedMsg("Profil & calculs métaboliques mis à jour !");
    setProfileSheetOpen(false);
    setTimeout(() => setProfileSavedMsg(null), 3500);
    onSavedReturnHome?.("Profil & objectifs enregistrés avec succès !");
  };

  useEffect(() => {
    if (profileSheetOpen) return;
    setForm(profile);
    setHeightDraft(String(profile.heightCm));
    setWeightDraft(formatDecimalFr(profile.weightKg));
    setTargetWeightDraft(formatDecimalFr(profile.targetWeightKg));
    setWaistDraft(profile.waistCm ? formatDecimalFr(profile.waistCm) : "");
    setStepGoalDraft(String(profile.dailyStepGoal));
    setWaterGoalDraft(String(profile.dailyWaterGoalMl ?? anthro.autoWaterMl));
    setCalorieOverrideDraft(
      String(profile.dailyCalorieGoalOverride ?? anthro.autoTargetIntakeKcal)
    );
    setWaterAuto(profile.dailyWaterGoalMl === undefined);
    setCalorieAuto(profile.dailyCalorieGoalOverride === undefined);
  }, [
    profile.age,
    profile.birthDate,
    profile.heightCm,
    profile.weightKg,
    profile.targetWeightKg,
    profile.waistCm,
    profile.dailyStepGoal,
    profile.dailyWaterGoalMl,
    profile.dailyCalorieGoalOverride,
    profile.name,
    profile.primaryGoal,
    profile.specialMode,
    profile.activityProfile,
    profile.sex,
    anthro.autoWaterMl,
    anthro.autoTargetIntakeKcal,
    profile,
    profileSheetOpen,
  ]);

  // Web Push
  const [pushStatus, setPushStatus] = useState<string | null>(null);
  const [pushSubscription, setPushSubscription] = useState<PushSubscription | null>(null);

  // Nouveau challenge personnalisé
  const [chTitle, setChTitle] = useState("");
  const [chDesc, setChDesc] = useState("");
  const [chMetric, setChMetric] = useState<ChallengeMetric>("steps");
  const [chTarget, setChTarget] = useState(8000);
  const [chTargetDraft, setChTargetDraft] = useState("8000");
  const [chUnit, setChUnit] = useState("pas");
  const [chDays, setChDays] = useState(14);
  const [chDaysDraft, setChDaysDraft] = useState("14");

  function bindNumericDraft(
    setDraft: React.Dispatch<React.SetStateAction<string>>,
    min: number,
    max: number,
    decimal: boolean,
    onValid: (val: number) => void,
    fallback: number,
    onDirty?: () => void
  ) {
    return {
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        onDirty?.();
        const filtered = decimal
          ? sanitizeDecimalDraft(e.target.value)
          : e.target.value.replace(/[^\d]/g, "");
        setDraft(filtered);
        if (!filtered || filtered === "." || filtered === ",") return;
        const parsed = decimal ? parseDecimalInput(filtered, 2) : Number(filtered);
        if (
          parsed !== undefined &&
          Number.isFinite(parsed) &&
          parsed >= min &&
          parsed <= max
        ) {
          onValid(decimal ? roundToDecimals(parsed, 2) : Math.round(parsed));
        }
      },
      onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
        const trimmed = e.target.value.trim();
        const parsed = decimal ? parseDecimalInput(trimmed, 2) : Number(trimmed);
        const clamped =
          trimmed !== "" && parsed !== undefined && Number.isFinite(parsed)
            ? Math.min(
                max,
                Math.max(min, decimal ? roundToDecimals(parsed, 2) : Math.round(parsed))
              )
            : fallback;
        onValid(clamped);
        setDraft(decimal ? formatDecimalFr(clamped) : String(clamped));
      },
    };
  }
  const [chTime, setChTime] = useState("18:30");

  async function handleEnablePush() {
    try {
      const pkRes = await fetch("/api/push/public-key");
      const pkJson = await pkRes.json();
      if (!pkJson.publicKey) {
        setPushStatus("Clé VAPID publique absente.");
        return;
      }
      const sub = await subscribeBrowserToPush(pkJson.publicKey);
      setPushSubscription(sub);
      setPushStatus("Notifications Push activées sur cet appareil !");
    } catch (err) {
      setPushStatus(err instanceof Error ? err.message : "Activation Push impossible.");
    }
  }

  async function handleSendTestPush() {
    try {
      const res = await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: pushSubscription?.toJSON?.(),
          title: "FolloWeight · Rappel Challenge",
          body: `Encore ${Math.max(0, form.dailyStepGoal - todayBalance.rawSteps)} pas ou 2 min d'exercice pour valider votre objectif du jour !`,
          url: "/",
        }),
      });
      const json = await res.json();
      if (json.sent > 0) {
        setPushStatus("Notification Push réelle envoyée avec succès via VAPID !");
      } else if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification("FolloWeight · Rappel Challenge", {
          body: `Objectif du jour : ${todayBalance.rawSteps} / ${form.dailyStepGoal} pas.`,
          icon: "/icons/icon-192.png",
        });
        setPushStatus("Notification locale affichée sur cet appareil.");
      } else {
        setPushStatus(json.message || "Activez d'abord les notifications Push ci-dessus.");
      }
    } catch {
      setPushStatus("Impossible de joindre le service Push.");
    }
  }

  function handleCreateChallenge(e: React.FormEvent) {
    e.preventDefault();
    if (!chTitle.trim()) return;
    void requestFastingNotificationPermission();
    const spec = GOAL_METRIC_CATALOG[chMetric] ?? GOAL_METRIC_CATALOG.custom;
    const item: CustomChallenge = {
      id: `chal-${Date.now()}`,
      title: chTitle.trim(),
      description: chDesc.trim() || `Objectif : ${chTarget} ${chUnit}`,
      metric: chMetric,
      targetValue: Math.max(1, chTarget),
      unit: chUnit || spec.defaultUnit,
      durationDays: Math.max(1, chDays),
      reminderTime: chTime,
      active: true,
      completedDates: [],
      createdAt: new Date().toISOString(),
      personalWhy: chDesc.trim() || undefined,
      celebrateNotifications: true,
      notifiedKeys: [],
      startValue: chMetric === "weight_target" ? form.weightKg : undefined,
      direction:
        chMetric === "weight_target"
          ? chTarget <= form.weightKg
            ? "at_most"
            : "at_least"
          : chMetric === "waist_target" || chMetric === "calories_target"
            ? "at_most"
            : undefined,
    };
    onAddChallenge(item);
    setChTitle("");
    setChDesc("");
    setChallengeSheetOpen(false);
  }

  return (
    <div className="space-y-6">
      {/* Vrai Bilan Corporel (IMC + WtHR + BRI + RFM + TDEE) */}
      <div className="vp-card-accent p-4 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-400" />
              Vrai Bilan Corporel &amp; Métabolique
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Ne vous fiez plus uniquement à l&apos;IMC brut : FolloWeight croise IMC OMS, Ratio Tour de taille / Taille, Body Roundness Index (JAMA 2024) et Masse Grasse Relative (RFM).
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowSources((s) => !s)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-sky-300"
          >
            <Info className="w-3.5 h-3.5" />
            {showSources ? "Masquer sources" : "Pourquoi ces calculs ?"}
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-3">
            <span className="text-slate-400">
              IMC Officiel (OMS) <InfoTip term="bmi" />
            </span>
            <p className="text-2xl font-bold text-white tabular-nums mt-0.5">{anthro.bmi}</p>
            <span className="text-[11px] text-emerald-300">{anthro.bmiCategoryFr}</span>
          </div>

          <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-3">
            <span className="text-slate-400">
              Ratio Taille / Hauteur (WtHR) <InfoTip term="wthr" />
            </span>
            <p className="text-2xl font-bold text-sky-300 tabular-nums mt-0.5">
              {anthro.wthr !== null ? anthro.wthr : "—"}
            </p>
            <span className="text-[11px] text-slate-300">
              {anthro.wthrStatusFr ?? "Saisissez le tour de taille (seuil < 0,50)"}
            </span>
          </div>

          <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-3">
            <span className="text-slate-400">
              Body Roundness Index (BRI) <InfoTip term="bri" />
            </span>
            <p className="text-2xl font-bold text-emerald-300 tabular-nums mt-0.5">
              {anthro.bri !== null ? anthro.bri : "—"}
            </p>
            <span className="text-[11px] text-slate-300">
              {anthro.briCategoryFr ?? "Optimal entre 3,4 et 5,4 (JAMA 2024)"}
            </span>
          </div>

          <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-3">
            <span className="text-slate-400">
              Masse Grasse Estimée (RFM) <InfoTip term="rfm" />
            </span>
            <p className="text-2xl font-bold text-amber-300 tabular-nums mt-0.5">
              {anthro.rfmPct} %
            </p>
            <span className="text-[11px] text-slate-400">{anthro.rfmMethodLabel}</span>
          </div>
        </div>

        {anthro.athleticCoherenceNote && (
          <div className="rounded-xl bg-emerald-500/15 border border-emerald-400/35 p-3 text-xs text-emerald-100">
            <strong>Analyse croisée morphologique :</strong> {anthro.athleticCoherenceNote}
          </div>
        )}

        <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-3.5 grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
          <div>
            <span className="text-slate-400 block">
              Métabolisme de repos (BMR) <InfoTip term="bmr" />
            </span>
            <strong className="text-white text-sm">{anthro.bmrKcal} kcal/j</strong>
          </div>
          <div>
            <span className="text-slate-400 block">
              Maintien estimé (TDEE) <InfoTip term="tdee" />
            </span>
            <strong className="text-sky-300 text-sm">{anthro.estimatedMaintenanceKcal} kcal/j</strong>
          </div>
          <div>
            <span className="text-slate-400 block">Cible calorique journalière</span>
            <strong className="text-emerald-300 text-sm">{anthro.targetIntakeKcal} kcal/j</strong>
          </div>
          <div>
            <span className="text-slate-400 block">
              Protéines / Fibres cibles <InfoTip term="leucine_threshold" />
            </span>
            <strong className="text-white text-sm">
              {anthro.targets.proteinG} g / {anthro.targets.fiberG} g
            </strong>
            <span className="block text-[10px] text-emerald-300/90 mt-0.5">
              Bolus ~{anthro.perMealProteinBolusG} g × 4 repas
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">
              Eau / Sodium max <InfoTip term="sodium_oms" />
            </span>
            <strong className="text-cyan-300 text-sm">
              {(anthro.targets.waterMl / 1000).toFixed(1)} L / {anthro.targets.sodiumMaxMg} mg
            </strong>
          </div>
        </div>

        {(anthro.safetyFloorApplied || anthro.minorSafetyLock) && (
          <div className="rounded-xl bg-amber-500/15 border border-amber-400/35 p-3 text-xs text-amber-100">
            <strong>Garde-fou médical actif :</strong>{" "}
            {anthro.minorSafetyLock
              ? "Mode déficit désactivé automatiquement pour les moins de 18 ans."
              : "Plancher calorique minimal appliqué afin de préserver votre métabolisme et votre masse maigre."}
          </div>
        )}

        {showSources && (
          <div className="rounded-xl bg-slate-900 p-3.5 text-xs text-slate-300 space-y-1">
            <strong className="text-white">Référentiels scientifiques utilisés :</strong>
            <ul className="list-disc pl-4 space-y-1">
              {anthro.sources.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {onChangeTheme && (
        <div className="vp-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white">
              Apparence de l&apos;interface
            </h3>
            <p className="text-xs text-slate-400">
              Choisissez entre le mode sombre Obsidienne ou le mode clair Porcelaine haute lisibilité.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onChangeTheme("dark")}
              className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition ${
                theme === "dark"
                  ? "border-emerald-400 bg-emerald-500 text-slate-950"
                  : "border-slate-700 bg-slate-900 text-slate-300"
              }`}
            >
              <Moon className="h-3.5 w-3.5" />
              Sombre
            </button>
            <button
              type="button"
              onClick={() => onChangeTheme("light")}
              className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition ${
                theme === "light"
                  ? "border-emerald-500 bg-emerald-500 text-slate-950"
                  : "border-slate-700 bg-slate-900 text-slate-300"
              }`}
            >
              <Sun className="h-3.5 w-3.5" />
              Clair
            </button>
          </div>
        </div>
      )}

      {/* Carte concise Profil + Drawer d'édition */}
      <div className="vp-card p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white">
              Profil : {profile.name} ({resolveEffectiveAge(profile)} ans · {profile.heightCm} cm · {formatDecimalFr(profile.weightKg)} kg)
            </h3>
            <p className="text-xs text-slate-400">
              {formatBirthDateFr(profile.birthDate)
                ? `Né(e) le ${formatBirthDateFr(profile.birthDate)} · `
                : ""}
              Cible {formatDecimalFr(profile.targetWeightKg)} kg · {profile.dailyStepGoal} pas/j
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                syncDraftsFromProfile(profile);
                setProfileSheetOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
            >
              Modifier mes mesures / objectifs
            </button>
            {onReopenOnboarding && (
              <button
                type="button"
                onClick={onReopenOnboarding}
                className="px-3 py-2 rounded-xl bg-amber-500/15 border border-amber-400/35 text-amber-200 text-xs font-semibold hover:bg-amber-500/25"
              >
                Relancer le questionnaire d&apos;accueil
              </button>
            )}
            <button
              type="button"
              onClick={() => onStartFreshWithProfile(form)}
              className="px-3 py-2 rounded-xl bg-sky-500/20 border border-sky-400/35 text-sky-200 text-xs font-medium hover:bg-sky-500/30"
            >
              Démarrer à zéro avec ce profil réel
            </button>
            <button
              type="button"
              onClick={onResetDemo}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs"
            >
              <RotateCcw className="w-3 h-3" /> Démo 7j
            </button>
          </div>
        </div>
        {profileSavedMsg && (
          <div className="rounded-xl bg-emerald-500/20 border border-emerald-400/40 p-2.5 text-xs text-emerald-200">
            {profileSavedMsg}
          </div>
        )}
      </div>

      <DetailSheet
        open={profileSheetOpen}
        onClose={() => setProfileSheetOpen(false)}
        title="Paramètres biométriques & objectifs"
        subtitle="Calibrage instantané de votre IMC, BMR et macros"
        size="lg"
      >
      <form className="space-y-4" onSubmit={handleSubmitProfile}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <label className="space-y-1">
            <span className="text-slate-400 block">Prénom / Profil</span>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white"
            />
          </label>
          <div className="sm:col-span-2">
            <BirthDateField
              birthDate={form.birthDate}
              age={form.age}
              onChange={({ birthDate, age }) =>
                setForm((prev) => ({ ...prev, birthDate, age }))
              }
            />
          </div>
          <label className="space-y-1">
            <span className="text-slate-400 block">Sexe biologique (BMR/RFM)</span>
            <select
              value={form.sex}
              onChange={(e) => setForm({ ...form, sex: e.target.value as Sex })}
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white"
            >
              <option value="male">Homme</option>
              <option value="female">Femme</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-slate-400 block">Taille (cm)</span>
            <input
              type="text"
              inputMode="numeric"
              value={heightDraft}
              {...bindNumericDraft(
                setHeightDraft,
                120,
                230,
                false,
                (heightCm) => setForm((prev) => ({ ...prev, heightCm })),
                form.heightCm
              )}
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white"
            />
          </label>

          <label className="space-y-1">
            <span className="text-slate-400 block">Poids actuel (kg)</span>
            <input
              type="text"
              inputMode="decimal"
              value={weightDraft}
              {...bindNumericDraft(
                setWeightDraft,
                30,
                280,
                true,
                (weightKg) => setForm((prev) => ({ ...prev, weightKg })),
                form.weightKg
              )}
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white"
            />
          </label>
          <label className="space-y-1">
            <span className="text-slate-400 block">Poids souhaité (kg)</span>
            <input
              type="text"
              inputMode="decimal"
              value={targetWeightDraft}
              {...bindNumericDraft(
                setTargetWeightDraft,
                35,
                250,
                true,
                (targetWeightKg) => setForm((prev) => ({ ...prev, targetWeightKg })),
                form.targetWeightKg
              )}
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white"
            />
          </label>
          <label className="space-y-1">
            <span className="text-slate-400 block">Tour de taille au nombril (cm)</span>
            <input
              type="text"
              inputMode="decimal"
              value={waistDraft}
              onChange={(e) => {
                const clean = sanitizeDecimalDraft(e.target.value);
                setWaistDraft(clean);
                if (clean.trim() === "") {
                  setForm((prev) => ({ ...prev, waistCm: undefined }));
                  return;
                }
                const n = parseDecimalInput(clean, 2);
                if (n !== undefined && n >= 42 && n <= 190) {
                  setForm((prev) => ({ ...prev, waistCm: n }));
                }
              }}
              onBlur={() => {
                if (waistDraft.trim() === "") {
                  setWaistDraft("");
                  setForm((prev) => ({ ...prev, waistCm: undefined }));
                  return;
                }
                const n = parseDecimalInput(waistDraft, 2);
                const fallback = form.waistCm ?? 82;
                const clamped =
                  n !== undefined
                    ? roundToDecimals(Math.max(42, Math.min(190, n)), 2)
                    : fallback;
                setWaistDraft(formatDecimalFr(clamped));
                setForm((prev) => ({ ...prev, waistCm: clamped }));
              }}
              placeholder="Optionnel (42–190 cm)"
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white tabular-nums"
            />
          </label>
          <label className="space-y-1">
            <span className="text-slate-400 block">Objectif de pas / jour</span>
            <input
              type="text"
              inputMode="numeric"
              value={stepGoalDraft}
              {...bindNumericDraft(
                setStepGoalDraft,
                1500,
                30000,
                false,
                (dailyStepGoal) => setForm((prev) => ({ ...prev, dailyStepGoal })),
                form.dailyStepGoal
              )}
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white tabular-nums"
            />
          </label>

          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-400">
                Objectif eau / jour (mL) <InfoTip term="hydration_efsa" />
              </span>
              <button
                type="button"
                onClick={() => {
                  setWaterAuto(true);
                  setForm((prev) => ({ ...prev, dailyWaterGoalMl: undefined }));
                  setWaterGoalDraft(String(anthro.autoWaterMl));
                }}
                className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold border ${
                  waterAuto
                    ? "border-sky-400 bg-sky-500/20 text-sky-200"
                    : "border-slate-700 text-slate-400 hover:border-sky-400"
                }`}
              >
                Auto ({anthro.autoWaterMl} mL)
              </button>
            </div>
            <input
              type="text"
              inputMode="numeric"
              value={waterGoalDraft}
              {...bindNumericDraft(
                setWaterGoalDraft,
                1000,
                4500,
                false,
                (dailyWaterGoalMl) => {
                  setWaterAuto(false);
                  setForm((prev) => ({ ...prev, dailyWaterGoalMl }));
                },
                form.dailyWaterGoalMl ?? anthro.autoWaterMl,
                () => setWaterAuto(false)
              )}
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white tabular-nums"
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-400">Cible calorique / jour (kcal)</span>
              <button
                type="button"
                onClick={() => {
                  setCalorieAuto(true);
                  setForm((prev) => ({ ...prev, dailyCalorieGoalOverride: undefined }));
                  setCalorieOverrideDraft(String(anthro.autoTargetIntakeKcal));
                }}
                className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold border ${
                  calorieAuto
                    ? "border-emerald-400 bg-emerald-500/20 text-emerald-200"
                    : "border-slate-700 text-slate-400 hover:border-emerald-400"
                }`}
              >
                Auto ({anthro.autoTargetIntakeKcal})
              </button>
            </div>
            <input
              type="text"
              inputMode="numeric"
              disabled={anthro.minorSafetyLock}
              value={calorieOverrideDraft}
              {...bindNumericDraft(
                setCalorieOverrideDraft,
                Math.max(1200, anthro.clinicalFloorKcal),
                5500,
                false,
                (dailyCalorieGoalOverride) => {
                  setCalorieAuto(false);
                  setForm((prev) => ({ ...prev, dailyCalorieGoalOverride }));
                },
                form.dailyCalorieGoalOverride ?? anthro.autoTargetIntakeKcal,
                () => setCalorieAuto(false)
              )}
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white tabular-nums disabled:opacity-50"
            />
            <span className="block text-[10px] text-slate-500">
              Plancher clinique protégé : {anthro.clinicalFloorKcal} kcal/j
            </span>
          </div>

          <label className="space-y-1">
            <span className="text-slate-400 block">Activité hors séances</span>
            <select
              value={form.activityProfile}
              onChange={(e) =>
                setForm({ ...form, activityProfile: e.target.value as ActivityProfile })
              }
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white"
            >
              <option value="sedentary">Sédentaire (bureau)</option>
              <option value="lightly_active">Légèrement actif</option>
              <option value="active">Actif (debout / déplacements)</option>
              <option value="very_active">Très actif</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-slate-400 block">Objectif principal</span>
            <select
              value={form.primaryGoal}
              onChange={(e) => {
                const nextGoal = e.target.value as PrimaryGoal;
                setForm((prev) => {
                  let nextPace = prev.weeklyPaceKg;
                  if (nextGoal === "maintenance" || nextGoal === "athletic_performance") {
                    nextPace = 0;
                  } else if (nextGoal === "muscle_gain") {
                    nextPace = Math.max(0.1, Math.min(0.4, Math.abs(prev.weeklyPaceKg) || 0.25));
                  } else {
                    nextPace = -Math.max(0.2, Math.min(0.75, Math.abs(prev.weeklyPaceKg) || 0.4));
                  }
                  return { ...prev, primaryGoal: nextGoal, weeklyPaceKg: +nextPace.toFixed(2) };
                });
              }}
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white"
            >
              <option value="fat_loss">Perte de masse grasse</option>
              <option value="rebalancing">Rééquilibrage alimentaire</option>
              <option value="recomposition">Recomposition (muscle + taille)</option>
              <option value="maintenance">Maintien &amp; Vitalité</option>
              <option value="muscle_gain">Prise de masse propre (Lean Bulk)</option>
              <option value="athletic_performance">Performance sportive &amp; Endurance</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-slate-400 block">
              Rythme hebdo visé ({form.weeklyPaceKg > 0 ? `+${form.weeklyPaceKg}` : form.weeklyPaceKg} kg/sem){" "}
              {form.primaryGoal === "muscle_gain" && <InfoTip term="lean_bulk" />}
            </span>
            <input
              type="range"
              disabled={form.primaryGoal === "maintenance" || form.primaryGoal === "athletic_performance"}
              min={form.primaryGoal === "muscle_gain" ? 0.05 : -0.75}
              max={form.primaryGoal === "muscle_gain" ? 0.45 : form.primaryGoal === "maintenance" || form.primaryGoal === "athletic_performance" ? 0 : -0.1}
              step={0.05}
              value={form.weeklyPaceKg}
              onChange={(e) => setForm({ ...form, weeklyPaceKg: Number(e.target.value) })}
              className="w-full accent-emerald-400 mt-2 disabled:opacity-40"
            />
          </label>
          <label className="space-y-1">
            <span className="text-slate-400 block">
              Accompagnement clinique dédié{" "}
              <InfoTip
                term={
                  form.specialMode === "ketogenic"
                    ? "diet_ketogenic"
                    : form.specialMode === "glycemic_shield"
                      ? "diet_glycemic_shield"
                      : form.specialMode === "glp1_muscle_guard"
                        ? "diet_glp1"
                        : form.specialMode === "high_protein_athlete"
                          ? "leucine_threshold"
                          : "diet_rebalancing"
                }
              />
            </span>
            <select
              value={form.specialMode}
              onChange={(e) => setForm({ ...form, specialMode: e.target.value as SpecialMode })}
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white"
            >
              <option value="standard">Standard équilibré</option>
              <option value="rebalancing">Rééquilibrage alimentaire</option>
              <option value="ketogenic">Cétogène (Keto · glucides &le; 35 g/j)</option>
              <option value="high_protein_athlete">Sportif / Prise de masse (2,0 g/kg prot.)</option>
              <option value="glp1_muscle_guard">GLP-1 (Protection muscle &amp; fibres)</option>
              <option value="glycemic_shield">Bouclier glycémique (CG basse)</option>
              <option value="cardio_low_sodium">Cardio &amp; Sel maîtrisé (&lt;1500 mg)</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-slate-400 block">Niveau sportif</span>
            <select
              value={form.athleticLevel || "recreational"}
              onChange={(e) =>
                setForm({ ...form, athleticLevel: e.target.value as AthleticLevel })
              }
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white"
            >
              <option value="beginner">Débutant / Reprise</option>
              <option value="recreational">Loisir régulier (1–3 séances/sem)</option>
              <option value="intermediate">Sportif confirmé (4–6 séances/sem)</option>
              <option value="athlete">Athlète / Haute intensité</option>
            </select>
          </label>
        </div>

        {/* Disciplines sportives préférées */}
        <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-950/60 p-3 text-xs">
          <span className="block font-semibold text-slate-300">
            Sports pratiqués ({(form.favoriteSports || []).length} sélectionné{(form.favoriteSports || []).length > 1 ? "s" : ""})
          </span>
          <div className="flex flex-wrap gap-1.5">
            {SPORT_DISCIPLINES_CATALOG.map((disc) => {
              const current = form.favoriteSports || [];
              const active = current.includes(disc.id);
              return (
                <button
                  key={disc.id}
                  type="button"
                  onClick={() => {
                    const next: SportDisciplineId[] = active
                      ? current.filter((x) => x !== disc.id)
                      : [...current, disc.id];
                    setForm({ ...form, favoriteSports: next });
                  }}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                    active
                      ? "border-emerald-400 bg-emerald-500/20 text-emerald-200"
                      : "border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-500"
                  }`}
                >
                  {disc.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sécurité femme enceinte */}
        {form.sex === "female" && (
          <label className="flex items-start gap-2.5 rounded-2xl border border-sky-400/30 bg-sky-500/10 p-3 text-xs text-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(form.pregnant)}
              onChange={(e) => setForm({ ...form, pregnant: e.target.checked })}
              className="mt-0.5 accent-emerald-400"
            />
            <span>
              <strong className="text-sky-200">Grossesse en cours</strong> — FolloWeight désactive par sécurité tout objectif de déficit calorique, le jeûne strict et le régime cétogène.
            </span>
          </label>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            Heures silencieuses Push :
            <input
              type="time"
              value={form.quietHours.start}
              onChange={(e) =>
                setForm({ ...form, quietHours: { ...form.quietHours, start: e.target.value } })
              }
              className="rounded bg-slate-950 border border-slate-700 px-2 py-1 text-white"
            />
            →
            <input
              type="time"
              value={form.quietHours.end}
              onChange={(e) =>
                setForm({ ...form, quietHours: { ...form.quietHours, end: e.target.value } })
              }
              className="rounded bg-slate-950 border border-slate-700 px-2 py-1 text-white"
            />
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm"
          >
            Enregistrer mon profil
          </button>
        </div>
      </form>
      </DetailSheet>

      {/* Notifications Push & Challenges Personnalisés */}
      <div className="vp-card p-4 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <BellRing className="w-5 h-5 text-amber-400" />
              Challenges personnalisés &amp; Rappels Push
            </h3>
            <p className="text-xs text-slate-400">
              Créez vos propres défis ou suivez les challenges recommandés avec notifications Push Web &amp; Android (respectant vos heures silencieuses).
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {onOpenGoalsModal && (
              <button
                type="button"
                onClick={onOpenGoalsModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Gérer objectifs &amp; félicitations
              </button>
            )}
            <button
              type="button"
              onClick={() => void handleEnablePush()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs"
            >
              <Bell className="w-3.5 h-3.5" />
              Activer Push sur cet appareil
            </button>
            <button
              type="button"
              onClick={() => void handleSendTestPush()}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium border border-slate-700"
            >
              Tester rappel Push maintenant
            </button>
          </div>
        </div>

        {pushStatus && (
          <div className="rounded-xl bg-sky-500/15 border border-sky-400/35 p-3 text-xs text-sky-200">
            {pushStatus}
          </div>
        )}

        {/* Liste des challenges */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {challenges.map((ch) => {
            const evalSnap = goalEvaluations[ch.id];
            const doneToday = ch.completedDates.includes(todayBalance.dateKey);
            let currentTodayVal = 0;
            if (ch.metric === "steps") currentTodayVal = todayBalance.rawSteps;
            else if (ch.metric === "protein") currentTodayVal = Math.round(todayBalance.macros.proteinG);
            else if (ch.metric === "fiber") currentTodayVal = Math.round(todayBalance.macros.fiberG);
            else if (ch.metric === "water") currentTodayVal = todayBalance.waterMl;
            else if (ch.metric === "workout_minutes") currentTodayVal = todayBalance.workoutMinutes;

            const autoReached =
              ch.metric !== "custom" &&
              ch.metric !== "no_nova4" &&
              currentTodayVal >= ch.targetValue;
            const isDone = evalSnap?.reachedToday ?? (doneToday || autoReached);

            return (
              <div
                key={ch.id}
                className={`rounded-xl p-4 border text-xs space-y-2 ${
                  isDone
                    ? "bg-emerald-500/10 border-emerald-400/35"
                    : "bg-slate-900/85 border-slate-800"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-amber-400" />
                      {ch.title}
                    </h4>
                    <p className="text-slate-400 mt-0.5">{ch.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteChallenge(ch.id)}
                    aria-label="Supprimer challenge"
                    className="text-slate-500 hover:text-rose-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <span className="text-slate-300 tabular-nums">
                    {evalSnap
                      ? evalSnap.currentLabelFr
                      : ch.metric !== "custom" && ch.metric !== "no_nova4"
                        ? `Aujourd'hui : ${currentTodayVal} / ${ch.targetValue} ${ch.unit}`
                        : `Cible : ${ch.targetValue} ${ch.unit}`}{" "}
                    · Rappel {ch.reminderTime} · {ch.completedDates.length}/{ch.durationDays} j
                  </span>
                  <button
                    type="button"
                    onClick={() => onToggleChallengeToday(ch.id)}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg font-semibold ${
                      isDone
                        ? "bg-emerald-500 text-slate-950"
                        : "bg-slate-800 text-slate-200 hover:bg-slate-700"
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {isDone ? "Validé aujourd'hui" : "Valider"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setChallengeSheetOpen(true)}
          className="inline-flex items-center gap-2 rounded-2xl border border-emerald-400/35 bg-emerald-500/15 px-4 py-2.5 text-xs font-bold text-emerald-200 hover:bg-emerald-500/25"
        >
          <PlusCircle className="w-4 h-4" />
          + Créer un nouveau challenge ou rappel personnalisé
        </button>

        {/* Modale création challenge */}
        <DetailSheet
          open={challengeSheetOpen}
          onClose={() => setChallengeSheetOpen(false)}
          title="Nouveau challenge & rappel Push"
          subtitle="Définissez votre objectif quotidien et l'heure du rappel"
          size="md"
        >
        <form
          onSubmit={handleCreateChallenge}
          className="space-y-3"
        >
          <strong className="text-xs text-emerald-300 flex items-center gap-1.5">
            <PlusCircle className="w-4 h-4" />
            Créer un nouveau challenge ou rappel d&apos;objectif personnalisé :
          </strong>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            <input
              type="text"
              value={chTitle}
              onChange={(e) => setChTitle(e.target.value)}
              placeholder="Titre (ex : 10 min marche après déjeuner)"
              className="rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white"
            />
            <input
              type="text"
              value={chDesc}
              onChange={(e) => setChDesc(e.target.value)}
              placeholder="Motivation / détail"
              className="rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white"
            />
            <select
              value={chMetric}
              onChange={(e) => {
                const m = e.target.value as ChallengeMetric;
                setChMetric(m);
                const spec = GOAL_METRIC_CATALOG[m] ?? GOAL_METRIC_CATALOG.custom;
                let nextVal = spec.defaultTarget;
                const nextUnit = spec.defaultUnit;
                if (m === "steps") nextVal = form.dailyStepGoal || 8000;
                else if (m === "water") nextVal = anthro.targets.waterMl;
                else if (m === "protein") nextVal = anthro.targets.proteinG;
                else if (m === "fiber") nextVal = anthro.targets.fiberG;
                else if (m === "calories_target") nextVal = anthro.targetIntakeKcal;
                else if (m === "weight_target") nextVal = form.targetWeightKg;
                else if (m === "workout_minutes") nextVal = 15;
                setChTarget(nextVal);
                setChTargetDraft(String(nextVal));
                setChUnit(nextUnit);
              }}
              className="rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white"
            >
              {(Object.keys(GOAL_METRIC_CATALOG) as ChallengeMetric[]).map((k) => (
                <option key={k} value={k}>
                  {GOAL_METRIC_CATALOG[k].labelFr}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            <label className="text-slate-400">
              Cible :
              <input
                type="text"
                inputMode={GOAL_METRIC_CATALOG[chMetric].decimal ? "decimal" : "numeric"}
                value={chTargetDraft}
                {...bindNumericDraft(
                  setChTargetDraft,
                  GOAL_METRIC_CATALOG[chMetric].min,
                  GOAL_METRIC_CATALOG[chMetric].max,
                  Boolean(GOAL_METRIC_CATALOG[chMetric].decimal),
                  setChTarget,
                  chTarget
                )}
                className="ml-1.5 w-20 rounded-lg bg-slate-950 border border-slate-700 px-2 py-1.5 text-white"
              />
            </label>
            <input
              type="text"
              value={chUnit}
              onChange={(e) => setChUnit(e.target.value)}
              placeholder="Unité"
              className="w-24 rounded-lg bg-slate-950 border border-slate-700 px-2 py-1.5 text-white"
            />
            <label className="text-slate-400">
              Durée (j) :
              <input
                type="text"
                inputMode="numeric"
                value={chDaysDraft}
                {...bindNumericDraft(
                  setChDaysDraft,
                  1,
                  90,
                  false,
                  setChDays,
                  chDays
                )}
                className="ml-1.5 w-20 rounded-lg bg-slate-950 border border-slate-700 px-2 py-1.5 text-white"
              />
            </label>
            <label className="text-slate-400">
              Rappel Push :
              <input
                type="time"
                value={chTime}
                onChange={(e) => setChTime(e.target.value)}
                className="ml-1.5 rounded-lg bg-slate-950 border border-slate-700 px-2 py-1.5 text-white"
              />
            </label>
            <button
              type="submit"
              className="ml-auto px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold"
            >
              Ajouter challenge
            </button>
          </div>
        </form>
        </DetailSheet>
      </div>

      {/* Informations légales & RGPD Play Store */}
      <div className="vp-card p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="space-y-0.5">
          <h4 className="font-bold text-white">Confidentialité, Conditions &amp; Données RGPD</h4>
          <p className="text-[11px] text-slate-400">
            Vos mesures, pesées et photos restent stockées localement sur votre appareil.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/privacy"
            className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 font-semibold text-slate-200 hover:border-emerald-400"
          >
            Confidentialité
          </Link>
          <Link
            href="/terms"
            className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 font-semibold text-slate-200 hover:border-emerald-400"
          >
            Conditions (CGU/CGV)
          </Link>
          <Link
            href="/delete-account"
            className="rounded-xl border border-rose-400/35 bg-rose-500/15 px-3 py-1.5 font-semibold text-rose-200 hover:bg-rose-500/25"
          >
            Effacer mes données
          </Link>
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  HeartPulse,
  LayoutGrid,
  Sparkles,
  Watch,
} from "lucide-react";
import {
  ActivityProfile,
  AthleticLevel,
  DashboardWidgetId,
  FastingProtocolId,
  PrimaryGoal,
  Sex,
  SpecialMode,
  SportDisciplineId,
  UserProfile,
  WearableEcosystem,
  WearableSyncState,
} from "@/types/vitalpulse";
import { SPORT_DISCIPLINES_CATALOG } from "@/data/exercises-compendium";
import { InfoTip } from "@/components/ui/InfoTip";
import { BirthDateField } from "@/components/ui/BirthDateField";
import { computeAnthropometrics, isValidBirthDateIso, resolveEffectiveAge } from "@/lib/metabolic-engine";
import {
  FASTING_PROTOCOLS,
  formatAllowedDurationFr,
  getDefaultEatingStartHm,
  getProtocolSpec,
} from "@/lib/fasting-engine";
import { isAppleTouchDevice, WEARABLE_ECOSYSTEMS } from "@/lib/wearables-bridge";
import {
  requestFastingNotificationPermission,
  triggerLightHaptic,
} from "@/lib/native-bridge";
import { blurActiveEditableElement, scrollViewportToTop } from "@/lib/scroll-utils";
import type { GlossaryTermId } from "@/data/glossary-terms";

export interface OnboardingWizardProps {
  initialProfile: UserProfile;
  initialWidgets: DashboardWidgetId[];
  initialWearable: WearableSyncState;
  onCompleteFresh: (payload: {
    profile: UserProfile;
    fastingProtocol: FastingProtocolId;
    eatingWindowStartHm: string;
    fastingNotifications: boolean;
    enabledWidgets: DashboardWidgetId[];
    wearableEcosystem: WearableEcosystem;
  }) => void;
  onSkipDemo: () => void;
}

const GOALS: Array<{ id: PrimaryGoal; label: string; desc: string }> = [
  { id: "fat_loss", label: "Perte de gras durable", desc: "Déficit maîtrisé & protection musculaire" },
  {
    id: "rebalancing",
    label: "Rééquilibrage alimentaire",
    desc: "Manger mieux durablement, satiété & perte douce sans privation",
  },
  { id: "recomposition", label: "Recomposition", desc: "Affiner la taille tout en tonifiant" },
  {
    id: "muscle_gain",
    label: "Prise de masse musculaire (Lean Bulk)",
    desc: "Surplus propre + 1,85–2,0 g/kg de protéines pour bâtir du muscle sec",
  },
  {
    id: "athletic_performance",
    label: "Performance sportive & Cardio",
    desc: "Énergie optimale, recharge glycogène & suivi multi-sports",
  },
  { id: "maintenance", label: "Équilibre & énergie", desc: "Stabiliser le poids & la glycémie" },
];

const DIET_APPROACHES: Array<{ id: SpecialMode; label: string; desc: string }> = [
  {
    id: "rebalancing",
    label: "Rééquilibrage alimentaire",
    desc: "Assiette équilibrée NOVA 1-2, fibres & plaisir préservé",
  },
  {
    id: "high_protein_athlete",
    label: "Nutrition Sportive & Hypertrophie",
    desc: "Protéines ISSN en 4 prises + glucides pour l'entraînement",
  },
  {
    id: "ketogenic",
    label: "Cétogène (Keto)",
    desc: "Très pauvre en glucides (~30 g/j max), lipides sains & cétose",
  },
  {
    id: "glycemic_shield",
    label: "IG Bas / Bouclier glycémique",
    desc: "Limiter les pics de sucre et fringales",
  },
  {
    id: "standard",
    label: "Classique / Flexible",
    desc: "Répartition souple au quotidien",
  },
];

const ATHLETIC_LEVEL_OPTIONS: Array<{
  id: AthleticLevel;
  label: string;
  desc: string;
  suggestedActivity: ActivityProfile;
}> = [
  { id: "beginner", label: "Débutant / Reprise", desc: "0–1 séance/sem", suggestedActivity: "sedentary" },
  { id: "recreational", label: "Régulier (Loisir)", desc: "1–2 séances/sem", suggestedActivity: "lightly_active" },
  { id: "intermediate", label: "Confirmé / Muscu", desc: "3–4 séances/sem", suggestedActivity: "active" },
  { id: "athlete", label: "Athlète / Intensif", desc: "5+ séances/sem", suggestedActivity: "very_active" },
];

function sanitizeIntInput(raw: string): string {
  return raw.replace(/[^0-9]/g, "");
}

function sanitizeDecimalInput(raw: string): string {
  const cleaned = raw.replace(",", ".").replace(/[^0-9.]/g, "");
  const parts = cleaned.split(".");
  return parts.length <= 2 ? cleaned : `${parts[0]}.${parts.slice(1).join("")}`;
}

function parseBoundedNumber(
  raw: string,
  fallback: number,
  min: number,
  max: number
): number {
  const trimmed = raw.trim();
  if (!trimmed) return fallback;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function computeWindowEndHm(startHm: string, durationHours: number): string {
  const [hStr, mStr] = (startHm || "12:00").split(":");
  const startMinutes = (Number(hStr) || 0) * 60 + (Number(mStr) || 0);
  const totalMinutes = (startMinutes + Math.round(durationHours * 60)) % (24 * 60);
  const hh = Math.floor((totalMinutes + 24 * 60) % (24 * 60) / 60);
  const mm = ((totalMinutes % 60) + 60) % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

const WIDGET_CATALOG: Array<{ id: DashboardWidgetId; title: string; subtitle: string }> = [
  { id: "fasting", title: "Jeûne / OMAD", subtitle: "Arc chrono & phases cellulaires" },
  { id: "hydration", title: "Hydratation", subtitle: "Vague animée & ajout +250 mL" },
  { id: "steps_watch", title: "Pas & Montre", subtitle: "Objectif pas + cardio connecté" },
  { id: "weight_ema", title: "Poids lissé EMA", subtitle: "Vraie tendance sans effet yo-yo" },
  { id: "barcode_meals", title: "Assiette & Scan", subtitle: "Photos, macros & code-barres" },
  { id: "body_blood", title: "Corps & Sang", subtitle: "Mensurations & bilan sanguin" },
  { id: "micronutrients", title: "Micronutriments", subtitle: "Fer, Magnésium, Vit D, Fibres" },
  { id: "weekly_bank", title: "Banque 7 jours", subtitle: "Marge plaisir sans culpabilité" },
  { id: "mindset_coach", title: "Leçon du jour", subtitle: "30 s de psychologie nutrition" },
];

export function OnboardingWizard({
  initialProfile,
  initialWidgets,
  initialWearable,
  onCompleteFresh,
  onSkipDemo,
}: OnboardingWizardProps) {
  const shouldReduceMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [step, setStep] = useState(0);
  const [name, setName] = useState(
    initialProfile.isDemoProfile ? "Mon profil" : initialProfile.name || "Mon profil"
  );
  const [sex, setSex] = useState<Sex>(initialProfile.sex || "male");
  const [birthDateInput, setBirthDateInput] = useState<string | undefined>(
    isValidBirthDateIso(initialProfile.birthDate) ? initialProfile.birthDate : undefined
  );
  const [ageNumber, setAgeNumber] = useState<number>(() => resolveEffectiveAge(initialProfile));
  const [heightInput, setHeightInput] = useState<string>(String(initialProfile.heightCm || 175));
  const [weightInput, setWeightInput] = useState<string>(String(initialProfile.weightKg || 78));
  const [targetWeightInput, setTargetWeightInput] = useState<string>(
    String(initialProfile.targetWeightKg || 72)
  );
  const [waistCm, setWaistCm] = useState<string>(
    initialProfile.waistCm ? String(initialProfile.waistCm) : ""
  );
  const [primaryGoal, setPrimaryGoal] = useState<PrimaryGoal>(
    initialProfile.primaryGoal || "fat_loss"
  );
  const [specialMode, setSpecialMode] = useState<SpecialMode>(
    initialProfile.specialMode || "standard"
  );
  const [weeklyPaceKg, setWeeklyPaceKg] = useState<number>(initialProfile.weeklyPaceKg ?? -0.4);
  const [activityProfile, setActivityProfile] = useState<ActivityProfile>(
    initialProfile.activityProfile || "lightly_active"
  );
  const [athleticLevel, setAthleticLevel] = useState<AthleticLevel>(
    initialProfile.athleticLevel || "recreational"
  );
  const [favoriteSports, setFavoriteSports] = useState<SportDisciplineId[]>(
    initialProfile.favoriteSports || []
  );
  const [dailyStepGoal, setDailyStepGoal] = useState<number>(
    initialProfile.dailyStepGoal || 8000
  );
  const [stepGoalDraft, setStepGoalDraft] = useState<string>(
    String(initialProfile.dailyStepGoal || 8000)
  );
  const [dailyWaterGoalMl, setDailyWaterGoalMl] = useState<number | undefined>(
    initialProfile.dailyWaterGoalMl
  );
  const [waterGoalDraft, setWaterGoalDraft] = useState<string>(
    initialProfile.dailyWaterGoalMl ? String(initialProfile.dailyWaterGoalMl) : ""
  );
  const [fastingProtocol, setFastingProtocol] = useState<FastingProtocolId>(
    initialProfile.preferredFasting || "16_8"
  );
  const [eatingWindowStartHm, setEatingWindowStartHm] = useState<string>(() =>
    getDefaultEatingStartHm(initialProfile.preferredFasting || "16_8")
  );
  const [fastingNotifications, setFastingNotifications] = useState<boolean>(true);
  const [wearableEcosystem, setWearableEcosystem] = useState<WearableEcosystem>(
    initialWearable.ecosystem || "samsung_health"
  );

  useEffect(() => {
    if (
      isAppleTouchDevice() &&
      !initialWearable.lastSyncAt &&
      (!initialWearable.ecosystem || initialWearable.ecosystem === "samsung_health")
    ) {
      setWearableEcosystem("apple_watch");
    }
  }, [initialWearable.ecosystem, initialWearable.lastSyncAt]);

  useEffect(() => {
    blurActiveEditableElement();
    scrollViewportToTop({ container: containerRef.current, smooth: false });
  }, [step]);
  const [enabledWidgets, setEnabledWidgets] = useState<DashboardWidgetId[]>(
    initialWidgets.length > 0
      ? initialWidgets
      : ["fasting", "hydration", "steps_watch", "weight_ema", "barcode_meals", "body_blood"]
  );

  const previewProfile: UserProfile = useMemo(
    () => {
      const parsedWaist = Number(waistCm.replace(",", "."));
      return {
        ...initialProfile,
        name: name.trim() || "Mon profil",
        sex,
        age: resolveEffectiveAge({ age: ageNumber, birthDate: birthDateInput }),
        ...(isValidBirthDateIso(birthDateInput) ? { birthDate: birthDateInput } : {}),
        heightCm: Math.round(parseBoundedNumber(heightInput, initialProfile.heightCm || 175, 120, 230)),
        weightKg: parseBoundedNumber(weightInput, initialProfile.weightKg || 78, 35, 250),
        targetWeightKg: parseBoundedNumber(
          targetWeightInput,
          initialProfile.targetWeightKg || 72,
          35,
          250
        ),
        waistCm:
          Number.isFinite(parsedWaist) && parsedWaist >= 42 && parsedWaist <= 190
            ? +parsedWaist.toFixed(1)
            : undefined,
        primaryGoal,
        specialMode,
        weeklyPaceKg:
          primaryGoal === "maintenance" || primaryGoal === "athletic_performance"
            ? 0
            : primaryGoal === "muscle_gain"
              ? Math.abs(weeklyPaceKg) || 0.25
              : -Math.abs(weeklyPaceKg || 0.4),
        activityProfile,
        athleticLevel,
        favoriteSports: favoriteSports.length > 0 ? favoriteSports : undefined,
        dailyStepGoal: Math.max(1500, Math.min(30000, Math.round(dailyStepGoal || 8000))),
        dailyWaterGoalMl:
          typeof dailyWaterGoalMl === "number" && Number.isFinite(dailyWaterGoalMl)
            ? Math.max(1000, Math.min(4500, Math.round(dailyWaterGoalMl)))
            : undefined,
        preferredFasting: fastingProtocol,
        onboardingCompleted: true,
        isDemoProfile: false,
      };
    },
    [
      initialProfile,
      name,
      sex,
      birthDateInput,
      ageNumber,
      heightInput,
      weightInput,
      targetWeightInput,
      waistCm,
      primaryGoal,
      specialMode,
      weeklyPaceKg,
      activityProfile,
      athleticLevel,
      favoriteSports,
      dailyStepGoal,
      dailyWaterGoalMl,
      fastingProtocol,
    ]
  );

  const metrics = useMemo(() => computeAnthropometrics(previewProfile), [previewProfile]);
  const fastingBlockedByClinical = previewProfile.age < 18 || metrics.bmi < 18.5;

  function toggleWidget(id: DashboardWidgetId) {
    triggerLightHaptic();
    setEnabledWidgets((prev) => {
      if (prev.includes(id)) {
        if (prev.length <= 2) return prev;
        return prev.filter((item) => item !== id);
      }
      return [...prev, id];
    });
  }

  function handleFinish() {
    blurActiveEditableElement();
    triggerLightHaptic();
    const effectiveProtocol = fastingBlockedByClinical ? "none" : fastingProtocol;
    if (effectiveProtocol !== "none" && fastingNotifications) {
      void requestFastingNotificationPermission();
    }
    onCompleteFresh({
      profile: {
        ...previewProfile,
        preferredFasting: effectiveProtocol,
      },
      fastingProtocol: effectiveProtocol,
      eatingWindowStartHm,
      fastingNotifications,
      enabledWidgets,
      wearableEcosystem,
    });
  }

  const stepsMeta = [
    { label: "Objectif", icon: Sparkles },
    { label: "Morphologie", icon: HeartPulse },
    { label: "Rythme & Jeûne", icon: Clock },
    { label: "Montre", icon: Watch },
    { label: "Widgets", icon: LayoutGrid },
  ];

  return (
    <div
      ref={containerRef}
      className="vp-onboarding fixed inset-0 z-50 flex flex-col overflow-y-auto bg-[var(--vp-bg)] px-4 py-5 text-[var(--vp-text)]"
    >
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-between gap-5">
        <div>
          {/* Barre supérieure */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <p className="font-display text-sm font-extrabold tracking-tight text-white">
                  FolloWeight · Configuration rapide
                </p>
                <p className="text-[11px] text-slate-400">
                  Étape {step + 1} sur 5 · {stepsMeta[step].label}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                blurActiveEditableElement();
                triggerLightHaptic();
                onSkipDemo();
              }}
              className="rounded-full border border-slate-500/30 bg-slate-500/10 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-500/20"
            >
              Passer → Explorer la démo
            </button>
          </div>

          {/* Barre de progression GPU scaleX */}
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-500/20">
            <div
              className="vp-gpu-bar h-full w-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400"
              style={{ transform: `scaleX(${(step + 1) / 5})` }}
            />
          </div>
        </div>

        {/* Contenu d'étape */}
        <motion.div
          key={step}
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="vp-card rounded-3xl p-5 sm:p-6"
        >
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <h1 className="font-display text-2xl font-extrabold text-white">
                  Quel est votre cap principal ?
                </h1>
                <p className="mt-1 text-sm text-slate-400">
                  FolloWeight calibre vos calories, protéines, pas, sports et jeûne sur des repères médicaux réels (Mifflin-St Jeor, OMS, ANSES, ISSN).
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Votre prénom ou pseudo
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex. Camille"
                  className="mt-1.5 w-full rounded-2xl border border-slate-500/25 bg-slate-900/60 px-4 py-3 text-sm text-white focus:border-emerald-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {GOALS.map((g) => {
                  const active = primaryGoal === g.id;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => {
                        triggerLightHaptic();
                        setPrimaryGoal(g.id);
                        if (g.id === "rebalancing") {
                          if (specialMode === "standard") setSpecialMode("rebalancing");
                          setWeeklyPaceKg(-0.25);
                        } else if (g.id === "muscle_gain") {
                          setSpecialMode("high_protein_athlete");
                          setWeeklyPaceKg(0.25);
                          const currentW = parseBoundedNumber(weightInput, 75, 35, 250);
                          const targetW = parseBoundedNumber(targetWeightInput, 75, 35, 250);
                          if (targetW <= currentW) {
                            setTargetWeightInput(String(Math.min(250, +(currentW + 4).toFixed(1))));
                          }
                        } else if (g.id === "athletic_performance") {
                          setSpecialMode("high_protein_athlete");
                          setWeeklyPaceKg(0);
                        }
                      }}
                      className={`rounded-2xl border p-3.5 text-left transition ${
                        active
                          ? "border-emerald-400 bg-emerald-500/15"
                          : "border-slate-500/20 bg-slate-500/5 hover:border-slate-400/40"
                      }`}
                    >
                      <p className="text-sm font-bold text-white">{g.label}</p>
                      <p className="mt-0.5 text-xs text-slate-400">{g.desc}</p>
                    </button>
                  );
                })}
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Approche alimentaire souhaitée
                </label>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {DIET_APPROACHES.map((d) => {
                    const active = specialMode === d.id;
                    const dietTip: GlossaryTermId | null =
                      d.id === "rebalancing"
                        ? "diet_rebalancing"
                        : d.id === "high_protein_athlete"
                          ? "leucine_threshold"
                          : d.id === "ketogenic"
                            ? "diet_ketogenic"
                            : d.id === "glycemic_shield"
                              ? "diet_glycemic_shield"
                              : d.id === "glp1_muscle_guard"
                                ? "diet_glp1"
                                : null;
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => {
                          triggerLightHaptic();
                          setSpecialMode(d.id);
                        }}
                        className={`rounded-2xl border p-3 text-left transition ${
                          active
                            ? "border-cyan-400 bg-cyan-500/15"
                            : "border-slate-500/20 bg-slate-500/5 hover:border-slate-400/40"
                        }`}
                      >
                        <p className="text-xs font-bold text-white">
                          {d.label}
                          {dietTip && <InfoTip term={dietTip} />}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-400">{d.desc}</p>
                      </button>
                    );
                  })}
                </div>

                {specialMode === "ketogenic" && (
                  <div className="mt-2.5 rounded-2xl border border-amber-400/35 bg-amber-500/10 p-3 text-[11px] leading-relaxed text-amber-100">
                    <strong>Mode Cétogène activé :</strong> glucides plafonnés autour de 25–35 g/j, hydratation ajustée (environ 33 mL/kg normalisé, plafonnée à 3 500 mL) et recettes frigo adaptées. Avis médical indispensable en cas de grossesse, diabète traité (insuline / iSGLT2) ou insuffisance rénale/hépatique.
                  </div>
                )}
              </div>

              {primaryGoal !== "maintenance" && primaryGoal !== "athletic_performance" && (
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {primaryGoal === "muscle_gain" ? (
                      <>
                        Cadence Lean Bulk (Prise de masse propre) <InfoTip term="lean_bulk" />
                      </>
                    ) : (
                      "Rythme hebdomadaire souhaité"
                    )}
                  </label>
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {(primaryGoal === "muscle_gain"
                      ? [
                          { val: 0.15, label: "Sec (+0,15 kg/sem)" },
                          { val: 0.25, label: "Idéal (+0,25 kg/sem)" },
                          { val: 0.35, label: "Soutenu (+0,35 kg)" },
                        ]
                      : [
                          { val: 0.25, label: "Doux (~0,25 kg/sem)" },
                          { val: 0.4, label: "Équilibré (~0,4 kg)" },
                          { val: 0.6, label: "Soutenu (~0,6 kg)" },
                        ]
                    ).map((pace) => {
                      const active = Math.abs(Math.abs(weeklyPaceKg) - pace.val) < 0.05;
                      return (
                        <button
                          key={pace.val}
                          type="button"
                          onClick={() => {
                            triggerLightHaptic();
                            setWeeklyPaceKg(primaryGoal === "muscle_gain" ? pace.val : -pace.val);
                          }}
                          className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
                            active
                              ? "border-emerald-400 bg-emerald-500/20 text-emerald-300"
                              : "border-slate-500/25 bg-slate-500/5 text-slate-300"
                          }`}
                        >
                          {pace.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h2 className="font-display text-2xl font-extrabold text-white">
                  Vos mesures de départ
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Calcul instantané de votre vrai IMC, ratio tour de taille / taille et budget calorique sûr.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                <div>
                  <label className="text-xs text-slate-400">Profil biologique</label>
                  <div className="mt-1 grid grid-cols-2 gap-1.5">
                    {(
                      [
                        { id: "male", label: "Homme" },
                        { id: "female", label: "Femme" },
                      ] as const
                    ).map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSex(s.id)}
                        className={`rounded-xl border py-2 text-xs font-bold ${
                          sex === s.id
                            ? "border-emerald-400 bg-emerald-500/20 text-emerald-300"
                            : "border-slate-500/25 text-slate-300"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <BirthDateField
                    birthDate={birthDateInput}
                    age={ageNumber}
                    compact
                    onChange={({ birthDate, age }) => {
                      setBirthDateInput(birthDate);
                      setAgeNumber(age);
                    }}
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400">Taille (cm)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={heightInput}
                    onChange={(e) => setHeightInput(sanitizeIntInput(e.target.value))}
                    onBlur={() => {
                      if (heightInput.trim()) {
                        setHeightInput(
                          String(Math.round(parseBoundedNumber(heightInput, 175, 120, 230)))
                        );
                      }
                    }}
                    placeholder="175"
                    className="mt-1 w-full rounded-xl border border-slate-500/25 bg-slate-900/60 px-3 py-2 text-sm text-white tabular-nums"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400">Poids actuel (kg)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={weightInput}
                    onChange={(e) => setWeightInput(sanitizeDecimalInput(e.target.value))}
                    onBlur={() => {
                      if (weightInput.trim()) {
                        setWeightInput(String(parseBoundedNumber(weightInput, 78, 35, 250)));
                      }
                    }}
                    placeholder="78"
                    className="mt-1 w-full rounded-xl border border-slate-500/25 bg-slate-900/60 px-3 py-2 text-sm text-white tabular-nums"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400">Objectif poids (kg)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={targetWeightInput}
                    onChange={(e) => setTargetWeightInput(sanitizeDecimalInput(e.target.value))}
                    onBlur={() => {
                      if (targetWeightInput.trim()) {
                        setTargetWeightInput(
                          String(parseBoundedNumber(targetWeightInput, 72, 35, 250))
                        );
                      }
                    }}
                    placeholder="Ex. 70"
                    className="mt-1 w-full rounded-xl border border-slate-500/25 bg-slate-900/60 px-3 py-2 text-sm text-white tabular-nums"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400">Tour de taille (cm, option)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="Ex. 84"
                    value={waistCm}
                    onChange={(e) => setWaistCm(sanitizeDecimalInput(e.target.value))}
                    onBlur={() => {
                      if (!waistCm.trim()) return;
                      const parsed = Number(waistCm.replace(",", "."));
                      if (Number.isFinite(parsed)) {
                        setWaistCm(String(+Math.max(42, Math.min(190, parsed)).toFixed(1)));
                      } else {
                        setWaistCm("");
                      }
                    }}
                    className="mt-1 w-full rounded-xl border border-slate-500/25 bg-slate-900/60 px-3 py-2 text-sm text-white tabular-nums"
                  />
                </div>
              </div>

              {/* Aperçu clinique instantané */}
              <div className="vp-card-accent rounded-2xl p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
                      Bilan calculé en direct
                    </p>
                    <p className="mt-0.5 text-sm font-bold text-white">
                      IMC réel : {metrics.bmi} · {metrics.bmiCategoryFr} <InfoTip term="bmi" />
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-xl font-extrabold text-emerald-300 tabular-nums">
                      {metrics.targetIntakeKcal} kcal/j <InfoTip term="tdee" />
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Prot. {metrics.targets.proteinG} g · Eau {metrics.targets.waterMl} mL
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="font-display text-2xl font-extrabold text-white">
                  Activité & Rythme alimentaire
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Choisissez votre niveau de mouvement quotidien et si vous souhaitez activer un protocole de jeûne intermittent ou OMAD.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { id: "sedentary", label: "Sédentaire / Bureau" },
                    { id: "lightly_active", label: "Actif léger" },
                    { id: "active", label: "Actif régulier" },
                    { id: "very_active", label: "Très actif / Sportif" },
                  ] as const
                ).map((act) => (
                  <button
                    key={act.id}
                    type="button"
                    onClick={() => setActivityProfile(act.id)}
                    className={`rounded-xl border px-3 py-2.5 text-left text-xs font-bold ${
                      activityProfile === act.id
                        ? "border-emerald-400 bg-emerald-500/20 text-emerald-300"
                        : "border-slate-500/25 text-slate-300"
                    }`}
                  >
                    {act.label}
                  </button>
                ))}
              </div>

              <div className="space-y-2 rounded-2xl border border-amber-400/20 bg-amber-500/5 p-3.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-200">
                  Niveau sportif &amp; Sports pratiqués
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {ATHLETIC_LEVEL_OPTIONS.map((lvl) => {
                    const active = athleticLevel === lvl.id;
                    return (
                      <button
                        key={lvl.id}
                        type="button"
                        onClick={() => {
                          triggerLightHaptic();
                          setAthleticLevel(lvl.id);
                          setActivityProfile(lvl.suggestedActivity);
                        }}
                        className={`rounded-xl border px-3 py-2 text-left text-xs transition ${
                          active
                            ? "border-amber-400 bg-amber-500/20 text-white"
                            : "border-slate-500/25 bg-slate-900/40 text-slate-300 hover:border-amber-400/40"
                        }`}
                      >
                        <p className="font-bold">{lvl.label}</p>
                        <p className="text-[10px] text-slate-400">{lvl.desc}</p>
                      </button>
                    );
                  })}
                </div>

                <div>
                  <p className="text-[11px] font-semibold text-slate-300 mb-1.5">
                    Vos sports (sélection multiple — filtre votre bibliothèque)
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {SPORT_DISCIPLINES_CATALOG.map((sp) => {
                      const picked = favoriteSports.includes(sp.id);
                      return (
                        <button
                          key={sp.id}
                          type="button"
                          onClick={() => {
                            triggerLightHaptic();
                            setFavoriteSports((prev) =>
                              prev.includes(sp.id)
                                ? prev.filter((x) => x !== sp.id)
                                : [...prev, sp.id]
                            );
                          }}
                          className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                            picked
                              ? "border-emerald-400 bg-emerald-500/20 text-emerald-200"
                              : "border-slate-600/60 bg-slate-900/50 text-slate-300 hover:border-slate-400"
                          }`}
                        >
                          {sp.emoji} {sp.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="space-y-2 rounded-2xl border border-slate-500/20 bg-slate-900/40 p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-slate-300">
                    Objectif de pas quotidien :{" "}
                    <span className="font-bold text-white tabular-nums">
                      {dailyStepGoal.toLocaleString("fr-FR")} pas/j
                    </span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    aria-label="Objectif de pas quotidien"
                    value={stepGoalDraft}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^\d]/g, "");
                      setStepGoalDraft(raw);
                      if (!raw) return;
                      const parsed = Number(raw);
                      if (Number.isFinite(parsed) && parsed > 0) {
                        setDailyStepGoal(Math.min(30000, parsed));
                      }
                    }}
                    onBlur={() => {
                      const parsed = Number(stepGoalDraft);
                      const clamped = Math.max(
                        1500,
                        Math.min(
                          30000,
                          Math.round(Number.isFinite(parsed) && parsed > 0 ? parsed : dailyStepGoal || 8000)
                        )
                      );
                      setDailyStepGoal(clamped);
                      setStepGoalDraft(String(clamped));
                    }}
                    className="w-24 rounded-lg border border-slate-600 bg-slate-950 px-2.5 py-1 text-right text-xs font-bold text-white tabular-nums"
                  />
                </div>
                <input
                  type="range"
                  min={2500}
                  max={16000}
                  step={500}
                  value={Math.max(2500, Math.min(16000, dailyStepGoal))}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    setDailyStepGoal(next);
                    setStepGoalDraft(String(next));
                  }}
                  className="w-full accent-emerald-400"
                />
                <div className="flex flex-wrap gap-1.5">
                  {[5000, 7500, 8000, 10000, 12000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setDailyStepGoal(preset);
                        setStepGoalDraft(String(preset));
                      }}
                      className={`rounded-lg border px-2 py-1 text-[11px] font-bold tabular-nums ${
                        dailyStepGoal === preset
                          ? "border-emerald-400 bg-emerald-500/20 text-emerald-200"
                          : "border-slate-700 text-slate-400 hover:border-emerald-400/50"
                      }`}
                    >
                      {preset.toLocaleString("fr-FR")}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 rounded-2xl border border-sky-400/25 bg-sky-500/5 p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-300">
                    Hydratation quotidienne cible <InfoTip term="hydration_efsa" /> :{" "}
                    <strong className="text-sky-300 tabular-nums">
                      {metrics.targets.waterMl} mL/j
                    </strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setDailyWaterGoalMl(undefined);
                      setWaterGoalDraft("");
                    }}
                    className={`rounded-lg border px-2 py-0.5 text-[11px] font-bold ${
                      dailyWaterGoalMl === undefined
                        ? "border-sky-400 bg-sky-500/20 text-sky-200"
                        : "border-slate-700 text-slate-400 hover:border-sky-400"
                    }`}
                  >
                    Auto EFSA ({metrics.autoWaterMl} mL)
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {[1500, 2000, 2500, 3000].map((ml) => (
                    <button
                      key={ml}
                      type="button"
                      onClick={() => {
                        setDailyWaterGoalMl(ml);
                        setWaterGoalDraft(String(ml));
                      }}
                      className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold tabular-nums ${
                        dailyWaterGoalMl === ml
                          ? "border-sky-400 bg-sky-500/25 text-sky-100"
                          : "border-slate-700 text-slate-300 hover:border-sky-400/50"
                      }`}
                    >
                      {ml} mL
                    </button>
                  ))}
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder={`Auto ${metrics.autoWaterMl}`}
                    aria-label="Objectif eau quotidien en millilitres"
                    value={waterGoalDraft}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/[^\d]/g, "");
                      setWaterGoalDraft(clean);
                      if (!clean) {
                        setDailyWaterGoalMl(undefined);
                        return;
                      }
                      const n = Number(clean);
                      if (n >= 1000 && n <= 4500) {
                        setDailyWaterGoalMl(Math.round(n));
                      }
                    }}
                    onBlur={() => {
                      if (!waterGoalDraft.trim()) {
                        setDailyWaterGoalMl(undefined);
                        return;
                      }
                      const n = Number(waterGoalDraft);
                      const clamped = Math.max(1000, Math.min(4500, Math.round(n || metrics.autoWaterMl)));
                      setDailyWaterGoalMl(clamped);
                      setWaterGoalDraft(String(clamped));
                    }}
                    className="w-24 rounded-lg border border-slate-600 bg-slate-950 px-2.5 py-1 text-right text-xs font-bold text-white tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Protocole repas / Jeûne intermittent <InfoTip term="fasting_omad" />
                </label>
                {fastingBlockedByClinical ? (
                  <div className="mt-2 rounded-2xl border border-amber-400/40 bg-amber-500/10 p-3 text-xs text-amber-200">
                    Par sécurité médicale (âge &lt; 18 ans ou IMC &lt; 18,5), FolloWeight désactive le jeûne prolongé et garde des repas réguliers équilibrés.
                  </div>
                ) : (
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <button
                      type="button"
                      onClick={() => {
                        triggerLightHaptic();
                        setFastingProtocol("none");
                      }}
                      className={`rounded-xl border p-2.5 text-left text-xs ${
                        fastingProtocol === "none"
                          ? "border-emerald-400 bg-emerald-500/20"
                          : "border-slate-500/20"
                      }`}
                    >
                      <p className="font-bold text-white">Sans jeûne</p>
                      <p className="text-[11px] text-slate-400">Repas classiques</p>
                    </button>
                    {FASTING_PROTOCOLS.filter((p) =>
                      ["12_12", "14_10", "16_8", "18_6", "20_4", "omad_23_1"].includes(p.id)
                    ).map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          triggerLightHaptic();
                          setFastingProtocol(p.id);
                          setEatingWindowStartHm(getDefaultEatingStartHm(p.id));
                        }}
                        className={`rounded-xl border p-2.5 text-left text-xs ${
                          fastingProtocol === p.id
                            ? "border-emerald-400 bg-emerald-500/20"
                            : "border-slate-500/20"
                        }`}
                      >
                        <p className="font-bold text-white">
                          {p.title}
                          {p.id === "omad_23_1" && <InfoTip term="fasting_omad" />}
                        </p>
                        <p className="text-[11px] text-slate-400">{p.levelFr}</p>
                      </button>
                    ))}
                  </div>
                )}

                {!fastingBlockedByClinical && fastingProtocol !== "none" && (() => {
                  const selectedSpec = getProtocolSpec(fastingProtocol);
                  const endHm = computeWindowEndHm(eatingWindowStartHm, selectedSpec.eatHours);
                  return (
                    <div className="mt-3 space-y-3 rounded-2xl border border-emerald-400/35 bg-emerald-500/10 p-3.5 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label className="font-bold text-white">
                          Heure d&apos;ouverture de votre fenêtre repas
                        </label>
                        <input
                          type="time"
                          value={eatingWindowStartHm}
                          onChange={(e) => setEatingWindowStartHm(e.target.value)}
                          className="rounded-xl border border-slate-500/35 bg-slate-900/80 px-3 py-1.5 text-xs font-bold text-white tabular-nums"
                        />
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { label: "Midi 12:00", hm: "12:00" },
                          { label: "16:00", hm: "16:00" },
                          { label: "Soir 19:00", hm: "19:00" },
                        ].map((preset) => (
                          <button
                            key={preset.hm}
                            type="button"
                            onClick={() => setEatingWindowStartHm(preset.hm)}
                            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                              eatingWindowStartHm === preset.hm
                                ? "border-emerald-400 bg-emerald-500/25 text-emerald-200"
                                : "border-slate-500/25 text-slate-300"
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>

                      <p className="leading-relaxed text-slate-100">
                        🍽️ Vous êtes autorisé à manger de{" "}
                        <strong className="text-emerald-300">
                          {eatingWindowStartHm} à {endHm}
                        </strong>{" "}
                        ({formatAllowedDurationFr(selectedSpec.eatHours)}) · ⏳ En période de jeûne le reste du temps ({selectedSpec.fastHours} h).
                      </p>

                      <button
                        type="button"
                        onClick={() => {
                          triggerLightHaptic();
                          setFastingNotifications((v) => !v);
                        }}
                        className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left transition ${
                          fastingNotifications
                            ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-100"
                            : "border-slate-500/25 bg-slate-900/40 text-slate-300"
                        }`}
                      >
                        <span className="text-[11px] font-semibold leading-snug">
                          M&apos;envoyer une notification quand ma fenêtre repas s&apos;ouvre (&laquo; Vous êtes autorisé à manger... &raquo;) et quand le jeûne reprend
                        </span>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                            fastingNotifications
                              ? "bg-emerald-400 text-slate-950"
                              : "bg-slate-700 text-slate-300"
                          }`}
                        >
                          {fastingNotifications ? "Activé" : "Désactivé"}
                        </span>
                      </button>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h2 className="font-display text-2xl font-extrabold text-white">
                  Montre connectée & Capteurs
                </h2>
                  <p className="mt-1 text-sm text-slate-400">
                  Choisissez votre écosystème principal. Sur iPhone / Apple Watch (où Apple bloque Web Bluetooth), FolloWeight synchronise sans erreur par capture IA des Anneaux Forme, Raccourci iOS 1-clic ou import export.zip / XML. Sur Android / PC, vous pouvez aussi connecter un capteur cardio Bluetooth LE en direct.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {WEARABLE_ECOSYSTEMS.map((eco) => {
                  const active = wearableEcosystem === eco.id;
                  return (
                    <button
                      key={eco.id}
                      type="button"
                      onClick={() => {
                        triggerLightHaptic();
                        setWearableEcosystem(eco.id);
                      }}
                      className={`rounded-2xl border p-3 text-left transition ${
                        active
                          ? "border-emerald-400 bg-emerald-500/15"
                          : "border-slate-500/20 bg-slate-500/5 hover:border-slate-400/40"
                      }`}
                    >
                      <p className="text-xs font-bold text-white">{eco.name}</p>
                      <p className="mt-0.5 text-[11px] text-slate-400">{eco.platformNote}</p>
                    </button>
                  );
                })}
              </div>

              {wearableEcosystem === "apple_watch" && (
                <div className="rounded-2xl border border-rose-400/35 bg-rose-500/10 p-3 text-xs text-rose-100">
                  <p className="font-bold text-white">
                    Apple Watch prête sans erreur Bluetooth iOS
                  </p>
                  <p className="mt-1 text-slate-300">
                    Une fois dans l&apos;application (bouton Montre), synchronisez en 1 clic par capture photo de vos Anneaux Forme, via le Raccourci iOS ou en important <code>export.zip</code> depuis Apple Santé.
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={() => setWearableEcosystem("none")}
                className={`w-full rounded-xl border px-3 py-2 text-xs font-semibold ${
                  wearableEcosystem === "none"
                    ? "border-emerald-400 bg-emerald-500/15 text-emerald-300"
                    : "border-slate-500/20 text-slate-400"
                }`}
              >
                Utiliser uniquement mon téléphone / saisie manuelle pour le moment
              </button>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h2 className="font-display text-2xl font-extrabold text-white">
                  Vos widgets sur l&apos;accueil
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Une interface épurée : gardez uniquement les tuiles qui comptent pour vous (modifiables à tout moment).
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {WIDGET_CATALOG.map((w) => {
                  const active = enabledWidgets.includes(w.id);
                  return (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => toggleWidget(w.id)}
                      className={`flex items-center justify-between gap-2 rounded-2xl border p-3 text-left transition ${
                        active
                          ? "border-emerald-400 bg-emerald-500/15"
                          : "border-slate-500/20 bg-slate-500/5 opacity-70"
                      }`}
                    >
                      <div>
                        <p className="text-xs font-bold text-white">{w.title}</p>
                        <p className="text-[11px] text-slate-400">{w.subtitle}</p>
                      </div>
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                          active
                            ? "border-emerald-400 bg-emerald-500 text-slate-950"
                            : "border-slate-500/40"
                        }`}
                      >
                        {active ? <Check className="h-3.5 w-3.5" /> : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>

        {/* Navigation bas */}
        <div className="flex items-center justify-between gap-3 vp-safe-pb">
          <button
            type="button"
            disabled={step === 0}
            onClick={() => {
              triggerLightHaptic();
              setStep((s) => Math.max(0, s - 1));
            }}
            className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-500/25 px-4 py-3 text-sm font-semibold text-slate-300 disabled:opacity-35"
          >
            <ChevronLeft className="h-4 w-4" />
            Retour
          </button>

          {step < 4 ? (
            <button
              type="button"
              onClick={() => {
                triggerLightHaptic();
                setStep((s) => Math.min(4, s + 1));
              }}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-500 px-6 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/25 hover:bg-emerald-400"
            >
              Continuer
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-6 py-3 text-sm font-extrabold text-slate-950 shadow-lg shadow-emerald-500/30 hover:bg-emerald-400"
            >
              <Check className="h-4 w-4" />
              Lancer mon espace FolloWeight
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

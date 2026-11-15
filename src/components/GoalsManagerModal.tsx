"use client";

import React, { useEffect, useState } from "react";
import {
  Bell,
  BellOff,
  CheckCircle2,
  Flame,
  Plus,
  Sparkles,
  Trash2,
  Trophy,
} from "lucide-react";
import {
  AnthropometricReport,
  ChallengeMetric,
  CustomChallenge,
  UserProfile,
} from "@/types/vitalpulse";
import {
  GOAL_METRIC_CATALOG,
  GoalCelebrationEvent,
  GoalEvaluationSnapshot,
  buildTestEncouragementEvent,
} from "@/lib/goals-celebration-engine";
import {
  getNotificationPermissionState,
  requestFastingNotificationPermission,
  sendGoalCelebrationNotification,
  subscribeBrowserToPush,
  triggerLightHaptic,
} from "@/lib/native-bridge";
import { DetailSheet } from "@/components/ui/DetailSheet";

export interface GoalsManagerModalProps {
  open: boolean;
  onClose: () => void;
  profile: UserProfile;
  anthro: AnthropometricReport;
  challenges: CustomChallenge[];
  evaluationsById: Record<string, GoalEvaluationSnapshot>;
  onAddGoal: (goal: CustomChallenge) => void;
  onToggleGoalToday: (goalId: string) => void;
  onToggleGoalNotification: (goalId: string) => void;
  onDeleteGoal: (goalId: string) => void;
  onPreviewCelebration: (ev: GoalCelebrationEvent) => void;
}

interface PresetGoalTemplate {
  id: string;
  labelFr: string;
  title: string;
  metric: ChallengeMetric;
  getTarget: (profile: UserProfile, anthro: AnthropometricReport) => number;
  unit: string;
  durationDays: number;
  why: string;
}

const PRESET_GOALS: PresetGoalTemplate[] = [
  {
    id: "preset-steps",
    labelFr: "10 000 pas / j",
    title: "Marcher 10 000 pas",
    metric: "steps",
    getTarget: () => 10000,
    unit: "pas",
    durationDays: 21,
    why: "Booster mon énergie et ma dépense quotidienne",
  },
  {
    id: "preset-water",
    labelFr: "Boire 2 500 mL",
    title: "Boire 2 500 mL d'eau",
    metric: "water",
    getTarget: (_, anthro) => Math.max(2000, anthro.targets.waterMl),
    unit: "mL",
    durationDays: 14,
    why: "Garder une vraie hydratation toute la journée",
  },
  {
    id: "preset-weight",
    labelFr: "Mon poids cible",
    title: "Atteindre mon poids cible",
    metric: "weight_target",
    getTarget: (profile) => profile.targetWeightKg,
    unit: "kg",
    durationDays: 60,
    why: "Me sentir léger(ère) et en pleine forme durablement",
  },
  {
    id: "preset-workouts",
    labelFr: "3 séances / sem",
    title: "3 séances de sport par semaine",
    metric: "workouts_week",
    getTarget: () => 3,
    unit: "séances",
    durationDays: 28,
    why: "Gagner en tonicité et préserver ma masse musculaire",
  },
  {
    id: "preset-protein",
    labelFr: "Protéines cibles",
    title: "Boucler mon quota protéines",
    metric: "protein",
    getTarget: (_, anthro) => anthro.targets.proteinG,
    unit: "g",
    durationDays: 14,
    why: "Calmer les fringales et protéger mes muscles",
  },
  {
    id: "preset-nosoda",
    labelFr: "0 soda / sucre ajouté",
    title: "Journée 0 soda & boissons sucrées",
    metric: "custom",
    getTarget: () => 1,
    unit: "journée",
    durationDays: 14,
    why: "Retrouver un palais léger et stabiliser ma glycémie",
  },
];

export function GoalsManagerModal({
  open,
  onClose,
  profile,
  anthro,
  challenges,
  evaluationsById,
  onAddGoal,
  onToggleGoalToday,
  onToggleGoalNotification,
  onDeleteGoal,
  onPreviewCelebration,
}: GoalsManagerModalProps) {
  const [notifPerm, setNotifPerm] = useState<
    "granted" | "denied" | "default" | "unsupported"
  >("default");
  const [notifFeedback, setNotifFeedback] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [metric, setMetric] = useState<ChallengeMetric>("steps");
  const [targetDraft, setTargetDraft] = useState(
    String(profile.dailyStepGoal || 8500)
  );
  const [unit, setUnit] = useState("pas");
  const [durationDays, setDurationDays] = useState<number>(14);
  const [personalWhy, setPersonalWhy] = useState("");
  const [celebrateEnabled, setCelebrateEnabled] = useState(true);
  const [direction, setDirection] = useState<"at_least" | "at_most">("at_least");

  useEffect(() => {
    if (!open) return;
    setNotifPerm(getNotificationPermissionState());
    setNotifFeedback(null);
  }, [open]);

  function applyMetricDefaults(nextMetric: ChallengeMetric) {
    setMetric(nextMetric);
    const spec = GOAL_METRIC_CATALOG[nextMetric];
    let defaultVal = spec.defaultTarget;
    let nextDir: "at_least" | "at_most" = "at_least";

    if (nextMetric === "steps") defaultVal = profile.dailyStepGoal || 8500;
    else if (nextMetric === "water") defaultVal = anthro.targets.waterMl;
    else if (nextMetric === "protein") defaultVal = anthro.targets.proteinG;
    else if (nextMetric === "fiber") defaultVal = anthro.targets.fiberG;
    else if (nextMetric === "calories_target") {
      defaultVal = anthro.targetIntakeKcal;
      nextDir = "at_most";
    } else if (nextMetric === "weight_target") {
      defaultVal = profile.targetWeightKg;
      nextDir = profile.targetWeightKg <= profile.weightKg ? "at_most" : "at_least";
    } else if (nextMetric === "waist_target") {
      defaultVal = Math.max(
        60,
        Math.round(((profile.waistCm ?? 90) - 4) * 10) / 10
      );
      nextDir = "at_most";
    }

    setTargetDraft(String(defaultVal));
    setUnit(spec.defaultUnit);
    setDirection(nextDir);
  }

  function applyPreset(preset: PresetGoalTemplate) {
    triggerLightHaptic();
    const val = preset.getTarget(profile, anthro);
    setTitle(preset.title);
    setMetric(preset.metric);
    setTargetDraft(String(val));
    setUnit(preset.unit);
    setDurationDays(preset.durationDays);
    setPersonalWhy(preset.why);
    if (preset.metric === "weight_target") {
      setDirection(val <= profile.weightKg ? "at_most" : "at_least");
    } else if (preset.metric === "calories_target" || preset.metric === "waist_target") {
      setDirection("at_most");
    } else {
      setDirection("at_least");
    }
  }

  async function handleEnableNotifications() {
    triggerLightHaptic();
    const granted = await requestFastingNotificationPermission();
    setNotifPerm(getNotificationPermissionState());
    if (granted) {
      setNotifFeedback(
        "Notifications activées ! Vous recevrez vos félicitations dès qu'un objectif est atteint."
      );
      try {
        const pkRes = await fetch("/api/push/public-key");
        const pkJson = await pkRes.json();
        if (pkJson?.publicKey) {
          await subscribeBrowserToPush(pkJson.publicKey);
        }
      } catch {
        // Push VAPID optionnel si hors ligne; Notification SW locale reste active
      }
    } else {
      setNotifFeedback(
        "Permission bloquée ou refusée dans le navigateur : les félicitations continueront de s'afficher directement dans l'app."
      );
    }
  }

  async function handleTestEncouragement() {
    triggerLightHaptic();
    if (getNotificationPermissionState() === "default") {
      await handleEnableNotifications();
    }
    const sampleTitle =
      title.trim() ||
      challenges.find((c) => c.active)?.title ||
      "Mon objectif santé";
    const ev = buildTestEncouragementEvent(profile.name, sampleTitle);
    const osDelivered = await sendGoalCelebrationNotification({
      key: ev.key,
      title: ev.titleFr,
      body: ev.bodyFr,
    });
    onPreviewCelebration(ev);
    setNotifFeedback(
      osDelivered
        ? "Notification téléphone ET bannière d'encouragement déclenchées !"
        : "Bannière d'encouragement affichée en haut de l'écran (activez les notifs système pour la recevoir aussi hors de l'app)."
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) return;

    const spec = GOAL_METRIC_CATALOG[metric];
    const parsedTarget = Number(targetDraft.replace(",", "."));
    const clampedTarget = Number.isFinite(parsedTarget)
      ? Math.min(
          spec.max,
          Math.max(
            spec.min,
            spec.decimal ? Math.round(parsedTarget * 10) / 10 : Math.round(parsedTarget)
          )
        )
      : spec.defaultTarget;

    if (celebrateEnabled && getNotificationPermissionState() === "default") {
      await requestFastingNotificationPermission();
      setNotifPerm(getNotificationPermissionState());
    }

    const startValue =
      metric === "weight_target"
        ? profile.weightKg
        : metric === "waist_target"
          ? profile.waistCm
          : undefined;

    const newGoal: CustomChallenge = {
      id: `chal-${Date.now()}`,
      title: cleanTitle,
      description: personalWhy.trim() || spec.descriptionHintFr,
      metric,
      targetValue: clampedTarget,
      unit: unit.trim() || spec.defaultUnit,
      durationDays: Math.max(1, Math.min(365, durationDays)),
      reminderTime: "19:00",
      active: true,
      completedDates: [],
      createdAt: new Date().toISOString(),
      direction:
        metric === "weight_target" || metric === "waist_target" || metric === "calories_target"
          ? direction
          : undefined,
      startValue,
      personalWhy: personalWhy.trim() || undefined,
      celebrateNotifications: celebrateEnabled,
      notifiedKeys: [],
    };

    triggerLightHaptic();
    onAddGoal(newGoal);
    setTitle("");
    setPersonalWhy("");
    setNotifFeedback(
      `Objectif « ${newGoal.title} » ajouté ! Vous serez félicité(e) dès qu'il est atteint.`
    );
  }

  const activeCount = challenges.filter((c) => c.active).length;
  const reachedCount = challenges.filter(
    (c) => c.active && evaluationsById[c.id]?.reachedToday
  ).length;
  const currentSpec = GOAL_METRIC_CATALOG[metric];

  return (
    <DetailSheet
      open={open}
      onClose={onClose}
      title="Mes Objectifs & Encouragements"
      subtitle="Définissez vos propres objectifs et recevez une notification de félicitations dès qu'ils sont atteints"
      size="lg"
    >
      <div className="space-y-5">
        {/* Statut des notifications de félicitations */}
        <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <Bell className="h-4 w-4 text-emerald-300" />
              <span>
                Notifications de félicitations :{" "}
                <strong
                  className={
                    notifPerm === "granted"
                      ? "text-emerald-300"
                      : notifPerm === "denied"
                        ? "text-rose-300"
                        : "text-amber-300"
                  }
                >
                  {notifPerm === "granted"
                    ? "Activées sur cet appareil ✓"
                    : notifPerm === "denied"
                      ? "Bloquées par le navigateur"
                      : notifPerm === "unsupported"
                        ? "Bannière intégrée active"
                        : "À autoriser (1 clic)"}
                </strong>
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {notifPerm !== "granted" && notifPerm !== "unsupported" && (
                <button
                  type="button"
                  onClick={() => void handleEnableNotifications()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-400"
                >
                  <Bell className="h-3.5 w-3.5" />
                  Activer les notifications
                </button>
              )}
              <button
                type="button"
                onClick={() => void handleTestEncouragement()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-400/40 bg-amber-500/15 px-3 py-1.5 text-xs font-bold text-amber-200 hover:bg-amber-500/25"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Tester une félicitation 🎉
              </button>
            </div>
          </div>

          {notifFeedback && (
            <p className="rounded-xl border border-emerald-400/30 bg-slate-900/60 px-3 py-2 text-xs text-emerald-200">
              {notifFeedback}
            </p>
          )}
        </div>

        {/* Création rapide de son propre objectif */}
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="rounded-2xl border border-slate-500/25 bg-slate-500/10 p-4 space-y-3"
        >
          <div className="flex items-center justify-between gap-2">
            <h4 className="flex items-center gap-2 text-sm font-bold text-white">
              <Plus className="h-4 w-4 text-emerald-300" />
              Ajouter mon propre objectif
            </h4>
            <span className="text-[11px] font-semibold text-emerald-300">
              100 % gratuit
            </span>
          </div>

          {/* Idées rapides en 1 clic */}
          <div className="flex flex-wrap gap-1.5">
            {PRESET_GOALS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset)}
                className="rounded-full border border-slate-500/30 bg-slate-900/70 px-2.5 py-1 text-[11px] font-semibold text-slate-200 hover:border-emerald-400/50 hover:text-emerald-200"
              >
                + {preset.labelFr}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 text-xs">
            <label className="space-y-1">
              <span className="block text-[11px] font-semibold text-slate-300">
                Nom de votre objectif *
              </span>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex : Passer sous les 78 kg / 10 000 pas / 0 soda"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              />
            </label>

            <label className="space-y-1">
              <span className="block text-[11px] font-semibold text-slate-300">
                Comment le mesurer ?
              </span>
              <select
                value={metric}
                onChange={(e) =>
                  applyMetricDefaults(e.target.value as ChallengeMetric)
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              >
                {(Object.keys(GOAL_METRIC_CATALOG) as ChallengeMetric[]).map(
                  (key) => (
                    <option key={key} value={key}>
                      {GOAL_METRIC_CATALOG[key].labelFr}
                    </option>
                  )
                )}
              </select>
            </label>
          </div>

          <p className="text-[11px] text-slate-400">
            {currentSpec.descriptionHintFr}
          </p>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 text-xs">
            <label className="space-y-1">
              <span className="block text-[11px] font-semibold text-slate-300">
                Cible
              </span>
              <input
                type="text"
                inputMode={currentSpec.decimal ? "decimal" : "numeric"}
                value={targetDraft}
                onChange={(e) => setTargetDraft(e.target.value)}
                disabled={metric === "no_nova4"}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white disabled:opacity-50"
              />
            </label>

            <label className="space-y-1">
              <span className="block text-[11px] font-semibold text-slate-300">
                Unité
              </span>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              />
            </label>

            <label className="space-y-1">
              <span className="block text-[11px] font-semibold text-slate-300">
                Horizon (jours)
              </span>
              <select
                value={durationDays}
                onChange={(e) => setDurationDays(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              >
                <option value={7}>7 jours</option>
                <option value={14}>14 jours</option>
                <option value={21}>21 jours</option>
                <option value={30}>30 jours</option>
                <option value={60}>60 jours</option>
                <option value={90}>90 jours</option>
              </select>
            </label>

            {metric === "weight_target" ? (
              <label className="space-y-1">
                <span className="block text-[11px] font-semibold text-slate-300">
                  Direction
                </span>
                <select
                  value={direction}
                  onChange={(e) =>
                    setDirection(e.target.value as "at_least" | "at_most")
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                >
                  <option value="at_most">Atteindre ≤ cible</option>
                  <option value="at_least">Atteindre ≥ cible</option>
                </select>
              </label>
            ) : (
              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full rounded-xl bg-emerald-500 px-3 py-2 text-xs font-extrabold text-slate-950 hover:bg-emerald-400"
                >
                  + Créer l&apos;objectif
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs">
            <input
              type="text"
              value={personalWhy}
              onChange={(e) => setPersonalWhy(e.target.value)}
              placeholder="Ma motivation perso (optionnel — rappelée quand vous réussissez)"
              className="min-w-[220px] flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            />
            <label className="inline-flex items-center gap-2 text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={celebrateEnabled}
                onChange={(e) => setCelebrateEnabled(e.target.checked)}
                className="h-4 w-4 rounded accent-emerald-500"
              />
              <span>M&apos;encourager par notification</span>
            </label>
            {metric === "weight_target" && (
              <button
                type="submit"
                className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-extrabold text-slate-950 hover:bg-emerald-400"
              >
                + Créer l&apos;objectif
              </button>
            )}
          </div>
        </form>

        {/* Liste des objectifs actifs et progression */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="flex items-center gap-2 text-sm font-bold text-white">
              <Trophy className="h-4 w-4 text-amber-300" />
              Mes objectifs actifs ({reachedCount}/{activeCount} atteints)
            </h4>
          </div>

          {challenges.length === 0 ? (
            <div className="rounded-2xl border border-slate-500/20 bg-slate-500/5 p-4 text-xs text-slate-400">
              Aucun objectif créé pour l&apos;instant. Choisissez un modèle rapide ci-dessus ou écrivez le vôtre !
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {challenges.map((ch) => {
                const snap = evaluationsById[ch.id];
                const reached = snap?.reachedToday ?? ch.completedDates.length > 0;
                const pct = snap?.progressPct ?? (reached ? 100 : 0);
                const notifyOn = ch.celebrateNotifications !== false;
                return (
                  <div
                    key={ch.id}
                    className={`rounded-2xl border p-3.5 text-xs space-y-2.5 transition ${
                      reached
                        ? "border-emerald-400/45 bg-emerald-500/10"
                        : "border-slate-500/25 bg-slate-900/75"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 text-sm font-bold text-white">
                          <Trophy
                            className={`h-4 w-4 shrink-0 ${
                              reached ? "text-emerald-300" : "text-amber-300"
                            }`}
                          />
                          <span className="truncate">{ch.title}</span>
                        </p>
                        {ch.personalWhy && (
                          <p className="mt-0.5 text-[11px] italic text-slate-300">
                            « {ch.personalWhy} »
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            triggerLightHaptic();
                            onToggleGoalNotification(ch.id);
                          }}
                          title={
                            notifyOn
                              ? "Notifications de félicitations activées"
                              : "Notifications de félicitations coupées"
                          }
                          aria-label="Basculer notification de félicitations"
                          className={`rounded-lg p-1.5 ${
                            notifyOn
                              ? "text-emerald-300 hover:bg-emerald-500/15"
                              : "text-slate-500 hover:bg-slate-800"
                          }`}
                        >
                          {notifyOn ? (
                            <Bell className="h-3.5 w-3.5" />
                          ) : (
                            <BellOff className="h-3.5 w-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            triggerLightHaptic();
                            onDeleteGoal(ch.id);
                          }}
                          aria-label={`Supprimer ${ch.title}`}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-500/15 hover:text-rose-300"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Barre de progression */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-slate-300 tabular-nums">
                        <span>{snap?.currentLabelFr ?? `${ch.targetValue} ${ch.unit}`}</span>
                        <span className="font-bold text-emerald-300">{pct} %</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            reached ? "bg-emerald-400" : "bg-amber-400"
                          }`}
                          style={{ width: `${Math.max(4, Math.min(100, pct))}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                      <span className="inline-flex items-center gap-2 text-[11px] text-slate-300 tabular-nums">
                        {snap && snap.streakDays > 0 && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/15 px-2 py-0.5 font-bold text-amber-300">
                            <Flame className="h-3 w-3" />
                            {snap.streakDays} j
                          </span>
                        )}
                        <span>
                          {ch.completedDates.length}/{ch.durationDays} j validés
                        </span>
                      </span>

                      <button
                        type="button"
                        onClick={() => {
                          triggerLightHaptic();
                          onToggleGoalToday(ch.id);
                        }}
                        className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 font-bold transition ${
                          reached
                            ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                            : "border border-slate-600 bg-slate-800 text-white hover:border-emerald-400"
                        }`}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {reached ? "Objectif atteint ✓" : "Valider aujourd'hui"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DetailSheet>
  );
}

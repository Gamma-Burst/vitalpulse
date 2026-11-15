"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BellRing,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Flame,
  History,
  Info,
  Play,
  Square,
  Utensils,
} from "lucide-react";
import {
  FastingConfig,
  FastingProtocolId,
  UserProfile,
} from "@/types/vitalpulse";
import {
  computeFastingLiveStatus,
  FASTING_PHASES,
  FASTING_PROTOCOLS,
  FASTING_SAFETY_CONTRAINDICATIONS,
  formatAllowedDurationFr,
  formatClockHm,
  formatFrenchShortDateTime,
  getDefaultEatingStartHm,
  getProtocolSpec,
} from "@/lib/fasting-engine";
import { resolveEffectiveAge } from "@/lib/metabolic-engine";
import { FastingHorseshoeArc } from "@/components/ui/LiveMetricVisuals";
import { DetailSheet } from "@/components/ui/DetailSheet";
import { InfoTip } from "@/components/ui/InfoTip";
import { resolveFastingPhaseGlossaryId } from "@/data/glossary-terms";
import {
  getNotificationPermissionState,
  requestFastingNotificationPermission,
  sendFastingTransitionAlert,
  syncPushScheduleEverywhere,
  triggerLightHaptic,
} from "@/lib/native-bridge";
import {
  buildPushScheduleSpecFromState,
  PushScheduleSpec,
} from "@/lib/push-schedule-engine";
import { formatDateKey } from "@/lib/storage-db";

export interface FastingViewProps {
  fasting: FastingConfig;
  profile: UserProfile;
  bmi: number;
  pushScheduleSpec?: PushScheduleSpec | null;
  onUpdateFasting: (next: FastingConfig) => void;
}

function toDatetimeLocalValue(iso: string | null): string {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function FastingView({
  fasting,
  profile,
  bmi,
  pushScheduleSpec = null,
  onUpdateFasting,
}: FastingViewProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [protocolSheetOpen, setProtocolSheetOpen] = useState(false);
  const [startSheetOpen, setStartSheetOpen] = useState(false);
  const [safetyOpen, setSafetyOpen] = useState(false);
  const [notifPerm, setNotifPerm] = useState<
    "granted" | "denied" | "default" | "unsupported"
  >("default");
  const [pushSyncMsg, setPushSyncMsg] = useState<string | null>(null);
  const [draftDateTime, setDraftDateTime] = useState(() =>
    toDatetimeLocalValue(fasting.activeStartIso || fasting.plannedStartIso)
  );

  useEffect(() => {
    setNotifPerm(getNotificationPermissionState());
  }, []);

  function resolveEffectiveSchedule(nextFasting: FastingConfig): PushScheduleSpec {
    const built = buildPushScheduleSpecFromState({
      fasting: nextFasting,
      profile,
      challenges: [],
      todayKey: formatDateKey(new Date()),
    });
    if (!pushScheduleSpec) return built;
    return {
      ...pushScheduleSpec,
      fasting: built.fasting,
    };
  }

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const live = useMemo(
    () => computeFastingLiveStatus(fasting, nowMs),
    [fasting, nowMs]
  );

  const clinicalWarning = resolveEffectiveAge(profile) < 18 || bmi < 18.5;

  function selectProtocol(id: FastingProtocolId, customHours?: number) {
    triggerLightHaptic();
    const spec = getProtocolSpec(id);
    const fastHours =
      id === "custom" ? customHours ?? fasting.fastHours ?? 16 : spec.fastHours;
    const eatHours = Math.max(0, 24 - fastHours);
    const supportsDailyCycle = id !== "none" && id !== "5_2" && id !== "custom";
    onUpdateFasting({
      ...fasting,
      protocolId: id,
      fastHours,
      eatHours,
      dailyScheduleEnabled:
        id === "none" ? false : supportsDailyCycle ? true : fasting.dailyScheduleEnabled,
      eatingWindowStartHm: fasting.eatingWindowStartHm || getDefaultEatingStartHm(id),
    });
  }

  function handleStartNow() {
    triggerLightHaptic();
    onUpdateFasting({
      ...fasting,
      protocolId: fasting.protocolId === "none" ? "16_8" : fasting.protocolId,
      activeStartIso: new Date().toISOString(),
      plannedStartIso: null,
      eatingWindowStartIso: null,
    });
  }

  function handleScheduleTomorrowEvening() {
    triggerLightHaptic();
    const t = new Date();
    t.setDate(t.getDate() + 1);
    t.setHours(18, 0, 0, 0);
    onUpdateFasting({
      ...fasting,
      protocolId: fasting.protocolId === "none" ? "20_4" : fasting.protocolId,
      fastHours: fasting.protocolId === "none" ? 20 : fasting.fastHours,
      eatHours: fasting.protocolId === "none" ? 4 : fasting.eatHours,
      activeStartIso: null,
      plannedStartIso: t.toISOString(),
    });
  }

  function handleCancelOrFinish() {
    triggerLightHaptic();
    if (live.mode === "fasting" && live.startIso) {
      const elapsedH = live.elapsedHours;
      const historyNext =
        elapsedH >= 1
          ? [
              {
                id: `fast-${Date.now()}`,
                protocolId: fasting.protocolId,
                startIso: live.startIso,
                endIso: new Date(nowMs).toISOString(),
                durationHours: elapsedH,
                targetHours: live.targetHours,
              },
              ...(fasting.history || []),
            ].slice(0, 20)
          : fasting.history;
      onUpdateFasting({
        ...fasting,
        activeStartIso: null,
        plannedStartIso: null,
        history: historyNext,
      });
      return;
    }

    onUpdateFasting({
      ...fasting,
      activeStartIso: null,
      plannedStartIso: null,
    });
  }

  function applyEditedStart() {
    if (!draftDateTime) return;
    const parsed = new Date(draftDateTime);
    if (Number.isNaN(parsed.getTime())) return;
    triggerLightHaptic();
    if (parsed.getTime() > Date.now()) {
      onUpdateFasting({
        ...fasting,
        activeStartIso: null,
        plannedStartIso: parsed.toISOString(),
      });
    } else {
      onUpdateFasting({
        ...fasting,
        activeStartIso: parsed.toISOString(),
        plannedStartIso: null,
      });
    }
    setStartSheetOpen(false);
  }

  const startCaption = live.startIso
    ? formatFrenchShortDateTime(live.startIso, nowMs)
    : "À définir";
  const endCaption = live.endIso
    ? formatFrenchShortDateTime(live.endIso, nowMs)
    : `+${live.targetHours} h`;

  return (
    <div className="space-y-5">
      {/* Alerte clinique toujours visible si profil à risque */}
      {clinicalWarning && (
        <div className="rounded-2xl border border-rose-400/50 bg-rose-500/15 p-4 text-xs text-rose-100">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-300 mt-0.5" />
            <div>
              <p className="font-bold">Précaution médicale prioritaire</p>
              <p className="mt-0.5 leading-relaxed">
                Votre âge (&lt; 18 ans) ou votre IMC ({bmi}) contre-indique le jeûne prolongé ou OMAD. Privilégiez des repas réguliers et demandez un avis médical.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Carte centrale type YAZIO revisitée */}
      <section className="vp-card rounded-3xl px-5 py-6 text-center sm:px-8">
        <h2 className="font-display text-2xl font-extrabold tracking-tight text-white">
          {live.headlineFr}
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          {live.mode === "eating_window"
            ? `${live.allowedEatSummaryFr} · reprise du jeûne à ${
                live.endIso ? formatClockHm(live.endIso) : "--:--"
              }`
            : live.mode === "fasting"
              ? `Phase actuelle : ${live.currentPhase.titleFr} (${live.currentPhase.shortBadge}) · Repas à ${
                  live.endIso ? formatClockHm(live.endIso) : "--:--"
                }`
              : live.mode === "scheduled"
                ? "Votre fenêtre de jeûne démarrera automatiquement à l'heure planifiée"
                : `${live.protocol.title} · ${live.protocol.subtitle}`}
        </p>

        <div className="mt-4">
          <FastingHorseshoeArc
            progressPct={Math.round(live.progress * 100)}
            status={
              live.mode === "eating_window"
                ? "eating_window"
                : live.mode === "fasting"
                  ? "fasting"
                  : live.mode === "scheduled"
                    ? "scheduled"
                    : "idle"
            }
            eyebrow={live.countdownLabelFr}
            countdownText={live.countdownHms}
            protocolLabel={
              fasting.protocolId === "custom"
                ? `${live.targetHours}:${Math.max(0, 24 - live.targetHours)}`
                : live.protocol.badge
            }
            onEditProtocol={() => setProtocolSheetOpen(true)}
            phaseIcon={
              live.mode === "scheduled" || live.mode === "eating_window" ? "fork" : "flame"
            }
            startCaption={startCaption}
            startActionLabel={live.mode === "eating_window" ? "Ouverture" : "Début"}
            onEditStart={() => {
              setDraftDateTime(
                toDatetimeLocalValue(live.startIso || new Date().toISOString())
              );
              setStartSheetOpen(true);
            }}
            endCaption={endCaption}
            endLabel={live.mode === "eating_window" ? "Fin repas" : "Fin"}
          />
        </div>

        {/* Bouton pilule principal */}
        <div className="mx-auto mt-6 flex max-w-sm flex-col gap-2.5">
          {live.mode === "idle" ? (
            <>
              <button
                type="button"
                onClick={handleStartNow}
                className="vp-keep-dark inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-6 py-3.5 text-sm font-extrabold text-white shadow-lg ring-1 ring-white/15 hover:bg-slate-800 dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400"
              >
                <Play className="h-4 w-4 fill-current" />
                Commencer le jeûne ({live.protocol.badge})
              </button>
              <button
                type="button"
                onClick={handleScheduleTomorrowEvening}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-500/30 bg-slate-500/10 px-5 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-500/20"
              >
                <CalendarClock className="h-3.5 w-3.5" />
                Planifier demain 18:00 (style YAZIO)
              </button>
            </>
          ) : live.mode === "scheduled" ? (
            <>
              <button
                type="button"
                onClick={handleCancelOrFinish}
                className="vp-keep-dark inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-6 py-3.5 text-sm font-extrabold text-white shadow-lg ring-1 ring-white/15 hover:bg-slate-800"
              >
                Annuler le plan
              </button>
              <button
                type="button"
                onClick={handleStartNow}
                className="inline-flex w-full items-center justify-center gap-1.5 text-xs font-semibold text-emerald-400 hover:underline"
              >
                <Play className="h-3.5 w-3.5" />
                Démarrer tout de suite maintenant
              </button>
            </>
          ) : live.mode === "eating_window" ? (
            <button
              type="button"
              onClick={handleStartNow}
              className="vp-keep-dark inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-500 px-6 py-3.5 text-sm font-extrabold text-slate-950 shadow-lg hover:bg-emerald-400"
            >
              <Square className="h-4 w-4 fill-current" />
              Terminer mon repas &amp; reprendre le jeûne maintenant
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleCancelOrFinish}
                className="vp-keep-dark inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-6 py-3.5 text-sm font-extrabold text-white shadow-lg ring-1 ring-white/15 hover:bg-slate-800"
              >
                <Square className="h-4 w-4 fill-current" />
                Terminer le jeûne ({live.elapsedHours.toFixed(1)} h accomplies)
              </button>
              {live.eatWindowHours > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    triggerLightHaptic();
                    onUpdateFasting({
                      ...fasting,
                      activeStartIso: null,
                      plannedStartIso: null,
                      eatingWindowStartIso: new Date().toISOString(),
                    });
                  }}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-emerald-400/35 bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/20"
                >
                  Ouvrir ma fenêtre repas maintenant (
                  {formatAllowedDurationFr(live.eatWindowHours)})
                </button>
              )}
            </div>
          )}
        </div>

        {/* Cycle quotidien & Notifications automatiques Repas / Jeûne */}
        {fasting.protocolId !== "none" && fasting.protocolId !== "5_2" && (
          <div className="mx-auto mt-5 max-w-xl rounded-2xl border border-white/10 bg-slate-950/65 p-4 text-left space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-extrabold text-white">
                  Cycle quotidien &amp; Alertes Repas / Jeûne <InfoTip term="fasting_omad" />
                </p>
                <p className="text-[11px] text-slate-400">
                  Vous êtes autorisé à manger pendant{" "}
                  <strong className="text-emerald-300">
                    {formatAllowedDurationFr(live.eatWindowHours)}
                  </strong>{" "}
                  chaque jour à l&apos;heure choisie
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  triggerLightHaptic();
                  const nextEnabled = !fasting.dailyScheduleEnabled;
                  onUpdateFasting({
                    ...fasting,
                    dailyScheduleEnabled: nextEnabled,
                    eatingWindowStartHm:
                      fasting.eatingWindowStartHm || getDefaultEatingStartHm(fasting.protocolId),
                    ...(nextEnabled
                      ? { activeStartIso: null, plannedStartIso: null, eatingWindowStartIso: null }
                      : {}),
                  });
                }}
                className={`rounded-full px-3 py-1 text-[11px] font-bold transition-all ${
                  fasting.dailyScheduleEnabled
                    ? "bg-emerald-500 text-slate-950"
                    : "border border-white/15 bg-slate-900 text-slate-300"
                }`}
              >
                {fasting.dailyScheduleEnabled ? "Cycle auto : ACTIF" : "Activer le cycle"}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="text-[11px] text-slate-300">
                Début fenêtre repas :
                <input
                  type="time"
                  value={
                    fasting.eatingWindowStartHm || getDefaultEatingStartHm(fasting.protocolId)
                  }
                  onChange={(e) =>
                    onUpdateFasting({
                      ...fasting,
                      dailyScheduleEnabled: true,
                      eatingWindowStartHm: e.target.value,
                      activeStartIso: null,
                      plannedStartIso: null,
                      eatingWindowStartIso: null,
                    })
                  }
                  className="ml-2 rounded-lg border border-white/15 bg-slate-900 px-2.5 py-1 text-xs font-bold text-white"
                />
              </label>
              {["12:00", "16:00", "18:00", "19:00"].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() =>
                    onUpdateFasting({
                      ...fasting,
                      dailyScheduleEnabled: true,
                      eatingWindowStartHm: preset,
                      activeStartIso: null,
                      plannedStartIso: null,
                      eatingWindowStartIso: null,
                    })
                  }
                  className={`rounded-lg border px-2 py-1 text-[11px] font-bold ${
                    (fasting.eatingWindowStartHm || getDefaultEatingStartHm(fasting.protocolId)) ===
                    preset
                      ? "border-emerald-400/60 bg-emerald-500/20 text-emerald-200"
                      : "border-white/10 bg-slate-900/70 text-slate-300 hover:border-white/25"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>

            <div className="space-y-2 border-t border-white/10 pt-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-xs text-slate-200">
                  <input
                    type="checkbox"
                    checked={fasting.notificationsEnabled !== false}
                    onChange={async (e) => {
                      const enabled = e.target.checked;
                      const nextFasting: FastingConfig = {
                        ...fasting,
                        notificationsEnabled: enabled,
                      };
                      onUpdateFasting(nextFasting);
                      if (enabled) {
                        const res = await syncPushScheduleEverywhere(
                          resolveEffectiveSchedule(nextFasting),
                          { promptPermission: true }
                        );
                        setNotifPerm(getNotificationPermissionState());
                        const startHm =
                          nextFasting.eatingWindowStartHm ||
                          getDefaultEatingStartHm(nextFasting.protocolId);
                        setPushSyncMsg(
                          res.synced
                            ? `Push écran verrouillé activé (repas à ${startHm} synchronisés dans le cloud) !`
                            : res.reason ?? null
                        );
                      } else {
                        void syncPushScheduleEverywhere(resolveEffectiveSchedule(nextFasting), {
                          promptPermission: false,
                        });
                        setPushSyncMsg("Rappels de jeûne désactivés.");
                      }
                    }}
                    className="h-4 w-4 accent-emerald-500"
                  />
                  Me notifier à l&apos;ouverture repas et reprise du jeûne
                </label>

                <div className="flex flex-wrap items-center gap-2">
                  {notifPerm !== "granted" ? (
                    <button
                      type="button"
                      onClick={async () => {
                        triggerLightHaptic();
                        const nextFasting: FastingConfig = {
                          ...fasting,
                          notificationsEnabled: true,
                        };
                        if (fasting.notificationsEnabled === false) {
                          onUpdateFasting(nextFasting);
                        }
                        const res = await syncPushScheduleEverywhere(
                          resolveEffectiveSchedule(nextFasting),
                          { promptPermission: true }
                        );
                        setNotifPerm(getNotificationPermissionState());
                        const startHm =
                          nextFasting.eatingWindowStartHm ||
                          getDefaultEatingStartHm(nextFasting.protocolId);
                        setPushSyncMsg(
                          res.synced
                            ? `Push écran verrouillé activé (repas à ${startHm} synchronisés dans le cloud) !`
                            : res.reason ?? null
                        );
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/45 bg-emerald-500/20 px-3 py-1.5 text-[11px] font-bold text-emerald-200 hover:bg-emerald-500/30"
                    >
                      <BellRing className="h-3.5 w-3.5" />
                      Activer Push écran verrouillé
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={async () => {
                        triggerLightHaptic();
                        const res = await syncPushScheduleEverywhere(
                          resolveEffectiveSchedule(fasting),
                          { promptPermission: false }
                        );
                        setPushSyncMsg(
                          res.synced
                            ? "Rappels écran verrouillé re-synchronisés dans le cloud ✓"
                            : res.reason ?? null
                        );
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/35 bg-emerald-500/15 px-3 py-1.5 text-[11px] font-bold text-emerald-300 hover:bg-emerald-500/25"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Push écran verrouillé actif ✓
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={async () => {
                      triggerLightHaptic();
                      await requestFastingNotificationPermission();
                      setNotifPerm(getNotificationPermissionState());
                      const startHm =
                        fasting.eatingWindowStartHm || getDefaultEatingStartHm(fasting.protocolId);
                      await sendFastingTransitionAlert({
                        key: `test-${Date.now()}`,
                        title: `FolloWeight · Fenêtre repas (${live.protocol.badge})`,
                        body: `Vous êtes autorisé à manger pendant ${formatAllowedDurationFr(
                          live.eatWindowHours
                        )} (démarrage réglé à ${startHm}).`,
                      });
                    }}
                    className="rounded-xl border border-amber-400/35 bg-amber-500/15 px-3 py-1.5 text-[11px] font-bold text-amber-200 hover:bg-amber-500/25"
                  >
                    Tester l&apos;alerte repas
                  </button>
                </div>
              </div>

              {pushSyncMsg && (
                <p className="text-[11px] font-medium text-emerald-300/90">{pushSyncMsg}</p>
              )}
            </div>
          </div>
        )}

        {/* Sélecteur rapide des protocoles populaires */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-1.5">
          {FASTING_PROTOCOLS.map((p) => {
            const active = fasting.protocolId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => selectProtocol(p.id)}
                className={`rounded-full border px-3 py-1 text-xs font-bold transition ${
                  active
                    ? "border-amber-400 bg-amber-500/20 text-amber-300"
                    : "border-slate-500/25 bg-slate-500/5 text-slate-300 hover:border-slate-400/50"
                }`}
              >
                {p.badge}
                {p.id === "omad_23_1" && <InfoTip term="fasting_omad" />}
              </button>
            );
          })}
        </div>

        {/* Avertissement spécifique OMAD / 20:4 */}
        {live.protocol.cautionFr && (
          <div className="mx-auto mt-4 max-w-lg rounded-2xl border border-amber-400/35 bg-amber-500/10 px-4 py-3 text-left text-xs text-amber-200">
            <p className="flex items-center gap-1.5 font-bold">
              <Utensils className="h-3.5 w-3.5" />
              Conseil nutritionnel {live.protocol.title}
            </p>
            <p className="mt-1 leading-relaxed">{live.protocol.cautionFr}</p>
          </div>
        )}
      </section>

      {/* Votre progression & 6 Phases Physiologiques */}
      <section className="vp-card rounded-3xl p-5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="font-display text-lg font-bold text-white">
              Votre progression biologique
            </h3>
            <p className="text-xs text-slate-400">
              Ce qu&apos;il se passe heure par heure dans votre corps
            </p>
          </div>
          {live.mode === "fasting" && live.nextPhase ? (
            <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] font-bold text-emerald-300 border border-emerald-500/30">
              Prochain cap : {live.hoursUntilNextPhase} h
            </span>
          ) : null}
        </div>

        <div className="mt-4 space-y-2.5">
          {FASTING_PHASES.map((phase) => {
            const isCurrent =
              live.mode === "fasting" && live.currentPhase.id === phase.id;
            const isDone =
              live.mode === "fasting" &&
              phase.maxHours !== null &&
              live.elapsedHours >= phase.maxHours;

            return (
              <div
                key={phase.id}
                className={`rounded-2xl border p-3.5 transition ${
                  isCurrent
                    ? "border-emerald-400/60 bg-emerald-500/10"
                    : isDone
                      ? "border-slate-500/20 bg-slate-500/5 opacity-80"
                      : "border-slate-500/15 bg-slate-500/5"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span
                      className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-950 font-bold"
                      style={{ backgroundColor: phase.accentColor }}
                    >
                      {isDone ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <Flame className="h-4 w-4" />
                      )}
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold text-white">
                          {phase.titleFr}
                          <InfoTip term={resolveFastingPhaseGlossaryId(phase.id)} />
                        </p>
                        <span className="rounded-full border border-slate-500/25 px-2 py-0.5 text-[10px] font-semibold text-slate-300 tabular-nums">
                          {phase.shortBadge}
                        </span>
                        {isCurrent && (
                          <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                            En cours
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-slate-300">
                        {phase.physiologicalSummaryFr}
                      </p>
                      <p className="mt-1 text-[11px] font-medium text-emerald-300">
                        Astuce : {phase.bodyTipFr}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Accordéon sécurité & historique */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <section className="vp-card rounded-3xl p-4">
          <button
            type="button"
            onClick={() => setSafetyOpen((v) => !v)}
            className="flex w-full items-center justify-between gap-2 text-left"
          >
            <span className="flex items-center gap-2 text-xs font-bold text-white">
              <Info className="h-4 w-4 text-amber-300" />
              Contre-indications médicales du jeûne
            </span>
            <ChevronDown
              className={`h-4 w-4 text-slate-400 transition ${
                safetyOpen ? "rotate-180" : ""
              }`}
            />
          </button>
          {safetyOpen && (
            <ul className="mt-3 space-y-1.5 border-t border-slate-500/15 pt-3 text-xs text-slate-300">
              {FASTING_SAFETY_CONTRAINDICATIONS.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-amber-300">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="vp-card rounded-3xl p-4">
          <div className="flex items-center gap-2 text-xs font-bold text-white">
            <History className="h-4 w-4 text-cyan-300" />
            Derniers jeûnes enregistrés ({fasting.history.length})
          </div>
          {fasting.history.length === 0 ? (
            <p className="mt-2 text-xs text-slate-400">
              Aucun jeûne terminé enregistré pour le moment. Votre progression apparaîtra ici.
            </p>
          ) : (
            <div className="mt-2 space-y-1.5">
              {fasting.history.slice(0, 4).map((h) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between rounded-xl bg-slate-500/10 px-3 py-2 text-xs"
                >
                  <span className="font-semibold text-white">
                    {getProtocolSpec(h.protocolId).badge} ·{" "}
                    {formatFrenchShortDateTime(h.startIso, nowMs)}
                  </span>
                  <span className="font-bold text-emerald-300 tabular-nums">
                    {h.durationHours} h / {h.targetHours} h
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Sheet choix protocole détaillé */}
      <DetailSheet
        open={protocolSheetOpen}
        onClose={() => setProtocolSheetOpen(false)}
        title="Choisir un protocole"
        subtitle="12:12 doux jusqu'à 20:4 Warrior, OMAD 23:1 ou 5:2"
        size="md"
      >
        <div className="space-y-2.5">
          {FASTING_PROTOCOLS.map((p) => {
            const active = fasting.protocolId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  selectProtocol(p.id);
                  if (p.id !== "custom") setProtocolSheetOpen(false);
                }}
                className={`w-full rounded-2xl border p-3.5 text-left transition ${
                  active
                    ? "border-amber-400 bg-amber-500/15"
                    : "border-slate-500/20 bg-slate-500/5 hover:border-slate-400/40"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-white">{p.title}</span>
                  <span className="rounded-full bg-slate-500/20 px-2.5 py-0.5 text-[11px] font-bold text-slate-200">
                    {p.levelFr}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-amber-300">{p.subtitle}</p>
                <p className="mt-1 text-xs text-slate-300">{p.benefitFr}</p>
              </button>
            );
          })}

          {fasting.protocolId === "custom" && (
            <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4">
              <label className="text-xs font-bold text-white">
                Durée libre : {fasting.fastHours} h de jeûne
              </label>
              <input
                type="range"
                min={12}
                max={36}
                step={1}
                value={fasting.fastHours}
                onChange={(e) => selectProtocol("custom", Number(e.target.value))}
                className="mt-2 w-full accent-emerald-400"
              />
            </div>
          )}
        </div>
      </DetailSheet>

      {/* Sheet modifier date/heure de début */}
      <DetailSheet
        open={startSheetOpen}
        onClose={() => setStartSheetOpen(false)}
        title="Ajuster l'heure de début"
        subtitle="Rétro-démarrer ou planifier votre prochain jeûne"
        size="md"
      >
        <div className="space-y-4">
          <label className="block text-xs font-semibold text-slate-300">
            Date et heure de début souhaitées
          </label>
          <input
            type="datetime-local"
            value={draftDateTime}
            onChange={(e) => setDraftDateTime(e.target.value)}
            className="w-full rounded-2xl border border-slate-500/30 bg-slate-900/70 px-4 py-3 text-sm text-white"
          />
          <button
            type="button"
            onClick={applyEditedStart}
            className="w-full rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-emerald-400"
          >
            Valider cette heure
          </button>
        </div>
      </DetailSheet>
    </div>
  );
}

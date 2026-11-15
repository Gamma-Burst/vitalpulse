"use client";

import React, { useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Crown,
  ExternalLink,
  Flag,
  Globe,
  Send,
  ShieldAlert,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  AnthropometricReport,
  BloodPanelEntry,
  DailyEnergyBalance,
  FastingConfig,
  FwAiMessage,
  SubscriptionState,
  UserProfile,
  WeightTrendPoint,
} from "@/types/vitalpulse";
import {
  canSendFwAiMessage,
  canUseLiveWebSearch,
} from "@/lib/billing-bridge";
import { computeFastingLiveStatus } from "@/lib/fasting-engine";
import { FolloWeightLogo } from "@/components/ui/FolloWeightLogo";
import type { FwAiContextPayload } from "@/lib/fw-ai-engine";
import { resolveEffectiveAge } from "@/lib/metabolic-engine";

interface FwAiCoachViewProps {
  profile: UserProfile;
  anthro: AnthropometricReport;
  todayBalance: DailyEnergyBalance;
  fasting: FastingConfig;
  weightTrend: WeightTrendPoint[];
  latestBloodPanel: BloodPanelEntry | null;
  messages: FwAiMessage[];
  subscription: SubscriptionState;
  todayKey: string;
  onAppendMessages: (
    userMsg: FwAiMessage,
    assistantMsg: FwAiMessage,
    incrementQuota: boolean,
    webSearchUsed?: boolean
  ) => void;
  onClearConversation: () => void;
  onOpenSubscriptionModal: (reason?: string) => void;
}

export function FwAiCoachView({
  profile,
  anthro,
  todayBalance,
  fasting,
  weightTrend,
  latestBloodPanel,
  messages,
  subscription,
  todayKey,
  onAppendMessages,
  onClearConversation,
  onOpenSubscriptionModal,
}: FwAiCoachViewProps) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [reportedIds, setReportedIds] = useState<string[]>([]);
  const [reportNotice, setReportNotice] = useState<string | null>(null);
  const listBottomRef = useRef<HTMLDivElement | null>(null);

  const quota = useMemo(
    () => canSendFwAiMessage(subscription, todayKey),
    [subscription, todayKey]
  );
  const webQuota = useMemo(
    () => canUseLiveWebSearch(subscription, todayKey),
    [subscription, todayKey]
  );

  const fastingLive = useMemo(() => computeFastingLiveStatus(fasting), [fasting]);

  const contextPayload: FwAiContextPayload = useMemo(() => {
    const latestTrend = weightTrend[weightTrend.length - 1];
    const weekAgoTrend = weightTrend[Math.max(0, weightTrend.length - 7)];
    return {
      profile: {
        name: profile.name,
        age: resolveEffectiveAge(profile),
        birthDate: profile.birthDate,
        sex: profile.sex,
        weightKg: profile.weightKg,
        targetWeightKg: profile.targetWeightKg,
        primaryGoal: profile.primaryGoal,
        specialMode: profile.specialMode,
        athleticLevel: profile.athleticLevel,
        favoriteSports: profile.favoriteSports,
        pregnant: profile.pregnant,
      },
      anthro: {
        bmi: anthro.bmi,
        wthr: anthro.wthr,
        targetIntakeKcal: anthro.targetIntakeKcal,
        clinicalFloorKcal: anthro.clinicalFloorKcal,
        estimatedMaintenanceKcal: anthro.estimatedMaintenanceKcal,
        perMealProteinBolusG: anthro.perMealProteinBolusG,
        minorSafetyLock: anthro.minorSafetyLock,
        targets: anthro.targets,
      },
      todayBalance: {
        intakeKcal: todayBalance.intakeKcal,
        targetIntakeKcal: todayBalance.targetIntakeKcal,
        sportRefuelKcal: todayBalance.sportRefuelKcal,
        remainingToTargetKcal: todayBalance.remainingToTargetKcal,
        activeCaloriesKcal:
          todayBalance.netWorkoutsKcal + todayBalance.netStepsKcal,
        workoutMinutes: todayBalance.workoutMinutes,
        rawSteps: todayBalance.rawSteps,
        waterMl: todayBalance.waterMl,
        macros: {
          proteinG: todayBalance.macros.proteinG,
          carbsG: todayBalance.macros.carbsG,
          fatG: todayBalance.macros.fatG,
          fiberG: todayBalance.macros.fiberG,
          sodiumMg: todayBalance.macros.sodiumMg,
        },
      },
      fasting: {
        protocolId: fasting.protocolId,
        mode: fastingLive.mode,
        eatWindowHours: fastingLive.eatWindowHours,
        countdownHms: fastingLive.countdownHms,
      },
      weightTrend: latestTrend
        ? {
            currentRawKg: latestTrend.rawWeightKg,
            currentEmaKg: latestTrend.emaWeightKg,
            delta7dKg: weekAgoTrend
              ? +(latestTrend.emaWeightKg - weekAgoTrend.emaWeightKg).toFixed(2)
              : 0,
          }
        : undefined,
      latestBloodPanel: latestBloodPanel
        ? {
            overallScore: latestBloodPanel.analysis.overallScore,
            renalProteinGuardTriggered:
              latestBloodPanel.analysis.renalProteinGuardTriggered,
            criticalFlags: latestBloodPanel.analysis.criticalFlags,
          }
        : undefined,
    };
  }, [profile, anthro, todayBalance, fasting.protocolId, fastingLive, weightTrend, latestBloodPanel]);

  const quickPrompts = useMemo(() => {
    const prompts: string[] = [
      "Analyse ma journée (calories, protéines, sport)",
      "Pourquoi mon poids varie d'un jour à l'autre ?",
    ];
    if (
      profile.primaryGoal === "muscle_gain" ||
      profile.primaryGoal === "athletic_performance" ||
      profile.specialMode === "high_protein_athlete"
    ) {
      prompts.unshift("Quel repas post-entraînement pour optimiser mes protéines ?");
    } else if (profile.specialMode === "ketogenic") {
      prompts.unshift("Idée de dîner cétogène (< 10 g glucides) ce soir");
    } else if (fasting.protocolId === "omad_23_1" || fasting.protocolId === "20_4") {
      prompts.unshift("Comment gérer ma fenêtre OMAD / 20:4 sans coup de fatigue ?");
    } else {
      prompts.unshift("Que manger ce soir selon mon budget restant ?");
    }
    if (latestBloodPanel) {
      prompts.push("Explique mon dernier bilan sanguin simplement");
    }
    return prompts.slice(0, 4);
  }, [profile.primaryGoal, profile.specialMode, fasting.protocolId, latestBloodPanel]);

  async function sendQuestion(rawText: string) {
    const question = rawText.trim();
    if (!question || loading) return;

    if (!quota.allowed) {
      onOpenSubscriptionModal(
        quota.isPlus
          ? "Limite de sécurité personnelle quotidienne atteinte pour aujourd'hui."
          : `Vos ${FREE_LIMIT_LABEL} questions gratuites FW AI d'aujourd'hui ont été utilisées (remise à zéro à minuit). La saisie code EAN, le jeûne et vos courbes restent illimités !`
      );
      return;
    }

    setErrorMsg(null);
    setLoading(true);
    setInput("");

    const userMsg: FwAiMessage = {
      id: `fw-u-${Date.now()}`,
      role: "user",
      content: question,
      createdAt: new Date().toISOString(),
    };

    try {
      const res = await fetch("/api/fw-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          context: contextPayload,
          licenseToken: subscription.licenseToken,
          allowWebSearch: webQuota.allowed,
          history: messages.slice(-6).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });
      if (!res.ok) {
        throw new Error("FW AI n'a pas pu répondre (votre question gratuite n'a pas été décomptée).");
      }
      const data = await res.json();
      const usedWeb = Boolean(data.webSearchUsed);
      const assistantMsg: FwAiMessage = {
        id: `fw-a-${Date.now()}`,
        role: "assistant",
        content: String(data.replyFr || "Réponse indisponible."),
        createdAt: new Date().toISOString(),
        provider: data.provider || "clinical-deterministic",
        quickActions: Array.isArray(data.quickActions) ? data.quickActions : [],
        webSearchUsed: usedWeb,
        sources: Array.isArray(data.sources) ? data.sources : [],
      };
      onAppendMessages(userMsg, assistantMsg, !data.safetyGuardTriggered, usedWeb);
      setTimeout(() => listBottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Erreur réseau : votre question n'a pas été décomptée."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* En-tête FW AI + Quota transparent + Conformité */}
      <div className="vp-card-accent p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <FolloWeightLogo size={42} showWordmark={false} />
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-white flex flex-wrap items-center gap-2">
              Coach FW AI
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/35 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-200">
                <Globe className="h-3 w-3 shrink-0" />
                IA Connectée · Web & Temps Réel
              </span>
            </h2>
            <p className="text-xs text-slate-300">
              Branché sur vos vraies données : {todayBalance.intakeKcal}/{todayBalance.targetIntakeKcal} kcal ·{" "}
              {Math.round(todayBalance.macros.proteinG)}/{anthro.targets.proteinG} g prot. ·{" "}
              {todayBalance.workoutMinutes} min sport
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenSubscriptionModal()}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition ${
              quota.isPlus
                ? "border-amber-400/40 bg-amber-500/15 text-amber-200"
                : "border-emerald-400/35 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25"
            }`}
          >
            {quota.isPlus ? (
              <>
                <Crown className="h-3.5 w-3.5" />
                FW+ Illimité
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                Gratuit : {quota.remainingToday}/{quota.limitToday} questions · Passer à FW+
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onClearConversation}
            title="Nouvelle conversation"
            className="inline-flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Vider
          </button>
        </div>
      </div>

      {/* Transparence AI Act & Médical */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/75 px-3.5 py-2 text-[11px] text-slate-400 flex items-center gap-2">
        <ShieldAlert className="h-4 w-4 text-sky-400 shrink-0" />
        <span>
          Vous échangez avec <strong>FW AI</strong> (IA FolloWeight connectée au Web en temps réel). Aucun
          diagnostic ni prescription médicale ; tous vos calculs corporels restent déterministes sur votre appareil.
        </span>
      </div>

      {/* Puces rapides contextuelles */}
      <div className="flex flex-wrap gap-2">
        {quickPrompts.map((p) => (
          <button
            key={p}
            type="button"
            disabled={loading}
            onClick={() => void sendQuestion(p)}
            className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-50"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Fil de discussion */}
      <div className="vp-card p-3.5 sm:p-5 space-y-3 max-h-[54vh] overflow-y-auto">
        {messages.map((m) => {
          const isUser = m.role === "user";
          const reported = reportedIds.includes(m.id);
          return (
            <div
              key={m.id}
              className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-[90%] sm:max-w-[80%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed ${
                  isUser
                    ? "bg-emerald-500 text-slate-950 font-semibold"
                    : "border border-slate-700/80 bg-slate-900/90 text-slate-100"
                }`}
              >
                <p className="whitespace-pre-line">{m.content}</p>

                {!isUser && (m.webSearchUsed || (m.sources?.length ?? 0) > 0 || m.provider === "openai-fw-ai") && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {m.webSearchUsed || (m.sources?.length ?? 0) > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-sky-400/35 bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold text-sky-300">
                        🌐 Recherche Web temps réel
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/35 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                        ⚡ IA Cloud FolloWeight
                      </span>
                    )}
                    {m.sources && m.sources.length > 0 && (
                      <>
                        {m.sources.map((s) => (
                          <a
                            key={s.url}
                            href={s.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={s.title}
                            className="inline-flex items-center gap-1 rounded-full border border-sky-400/35 bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium text-sky-300 hover:border-sky-400 transition max-w-full"
                          >
                            <span className="truncate max-w-[180px]">{s.domain}</span>
                            <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                          </a>
                        ))}
                      </>
                    )}
                  </div>
                )}

                {!isUser && (
                  <div className="mt-2 pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-1.5">
                      {(m.quickActions || []).map((qa) => (
                        <button
                          key={qa}
                          type="button"
                          disabled={loading}
                          onClick={() => void sendQuestion(qa)}
                          className="rounded-lg border border-slate-700 bg-slate-950/70 px-2 py-1 text-[10px] text-emerald-300 hover:border-emerald-400"
                        >
                          {qa}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      disabled={reported}
                      onClick={() => {
                        setReportedIds((prev) =>
                          prev.includes(m.id) ? prev : [...prev, m.id]
                        );
                        setReportNotice(
                          "Signalement transmis à l'équipe FolloWeight — merci."
                        );
                        void fetch("/api/ai-reports", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            messageId: m.id,
                            excerpt: m.content.slice(0, 500),
                            reason: "user_flag_in_chat",
                            provider: m.provider,
                          }),
                        }).catch(() => {});
                      }}
                      className="inline-flex items-center gap-1 text-[10px] text-slate-500 hover:text-amber-300 disabled:text-amber-300"
                    >
                      <Flag className="h-3 w-3" />
                      {reported ? "Signalé" : "Signaler"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-start">
            <div className="rounded-2xl border border-slate-700/80 bg-slate-900/80 px-3.5 py-2.5 text-xs text-emerald-300 animate-pulse">
              FW AI analyse vos métriques du jour...
            </div>
          </div>
        )}

        <div ref={listBottomRef} />
      </div>

      {reportNotice && (
        <div className="rounded-xl border border-emerald-400/35 bg-emerald-500/15 p-2.5 text-xs text-emerald-200 flex items-center justify-between gap-2">
          <span>{reportNotice}</span>
          <button
            type="button"
            onClick={() => setReportNotice(null)}
            className="text-[11px] underline"
          >
            Fermer
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="rounded-xl border border-amber-400/35 bg-amber-500/15 p-3 text-xs text-amber-100 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Formulaire envoi */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void sendQuestion(input);
        }}
        className="flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ex: Calories d'un Big Mac, étude créatine, ou analyse ma journée…"
          className="flex-1 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-500 px-4 py-3 text-xs sm:text-sm font-extrabold text-slate-950 hover:bg-emerald-400 disabled:opacity-45"
        >
          <Send className="h-4 w-4" />
          Envoyer
        </button>
      </form>
    </div>
  );
}

const FREE_LIMIT_LABEL = 5;

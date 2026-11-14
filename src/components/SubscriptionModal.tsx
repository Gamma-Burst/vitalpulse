"use client";

import React from "react";
import { Check, Crown, ShieldCheck, Sparkles } from "lucide-react";
import { SubscriptionState, SubscriptionTier } from "@/types/vitalpulse";
import {
  FOLLOWEIGHT_PLANS,
  FREE_DAILY_FW_AI_LIMIT,
  FREE_DAILY_VISION_SCAN_LIMIT,
  isFwPlusActive,
} from "@/lib/billing-bridge";
import { DetailSheet } from "@/components/ui/DetailSheet";
import { FolloWeightLogo } from "@/components/ui/FolloWeightLogo";

interface SubscriptionModalProps {
  open: boolean;
  onClose: () => void;
  subscription: SubscriptionState;
  todayKey: string;
  triggerReasonFr?: string | null;
  onActivateTrial: () => void;
  onSelectPlanPreview: (tier: SubscriptionTier) => void;
}

export function SubscriptionModal({
  open,
  onClose,
  subscription,
  todayKey,
  triggerReasonFr,
  onActivateTrial,
  onSelectPlanPreview,
}: SubscriptionModalProps) {
  const plusActive = isFwPlusActive(subscription);
  const aiUsed = subscription.dailyAiDateKey === todayKey ? subscription.fwAiMessagesUsedToday : 0;
  const visionUsed = subscription.dailyAiDateKey === todayKey ? subscription.visionScansUsedToday : 0;

  return (
    <DetailSheet
      open={open}
      onClose={onClose}
      title="FolloWeight Essentiel vs FolloWeight Plus (FW+)"
      subtitle="Gratuit ultra-généreux sans pub · Abonnement transparent pour l'IA illimitée"
      size="lg"
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-3.5">
          <div className="flex items-center gap-3">
            <FolloWeightLogo size={40} showWordmark={false} />
            <div>
              <div className="flex items-center gap-2">
                <strong className="text-sm font-bold text-white">
                  Statut actuel :{" "}
                  {plusActive ? (
                    <span className="text-emerald-300">
                      FolloWeight Plus ({subscription.tier === "pro_trial" ? "Essai 7j" : subscription.tier === "founder_lifetime" ? "Fondateur 5 ans" : "Actif"})
                    </span>
                  ) : (
                    <span className="text-slate-200">Gratuit à vie (0 €)</span>
                  )}
                </strong>
              </div>
              <p className="text-xs text-slate-300">
                Aujourd&apos;hui : {aiUsed}/{plusActive ? "80" : FREE_DAILY_FW_AI_LIMIT} questions FW AI ·{" "}
                {visionUsed}/{plusActive ? "80" : FREE_DAILY_VISION_SCAN_LIMIT} scans photo IA
              </p>
            </div>
          </div>

          {!plusActive && (
            <button
              type="button"
              onClick={() => {
                onActivateTrial();
                onClose();
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-extrabold text-slate-950 hover:bg-emerald-400"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Essayer FW+ 7 jours gratuits
            </button>
          )}
        </div>

        {triggerReasonFr && (
          <div className="rounded-xl border border-amber-400/35 bg-amber-500/15 p-3 text-xs text-amber-100">
            {triggerReasonFr}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {FOLLOWEIGHT_PLANS.map((plan) => {
            const isCurrent =
              subscription.tier === plan.id ||
              (plan.id === "pro_annual" && subscription.tier === "pro_trial");
            return (
              <div
                key={plan.id}
                className={`rounded-2xl border p-4 flex flex-col justify-between space-y-3 ${
                  plan.recommended
                    ? "border-emerald-400/50 bg-emerald-500/10"
                    : "border-slate-700/80 bg-slate-950/75"
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        plan.recommended
                          ? "bg-emerald-500 text-slate-950"
                          : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      {plan.badgeFr}
                    </span>
                    <span className="text-[10px] text-slate-400">{plan.channelFr}</span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                      {plan.id !== "free" && <Crown className="h-4 w-4 text-amber-300" />}
                      {plan.nameFr}
                    </h4>
                    <p className="font-display text-xl font-extrabold text-emerald-300 mt-1">
                      {plan.priceLabelFr}
                    </p>
                    {plan.subPriceLabelFr && (
                      <p className="text-[11px] text-slate-300">{plan.subPriceLabelFr}</p>
                    )}
                  </div>

                  <ul className="space-y-1.5 text-xs text-slate-300 pt-1">
                    {plan.highlightsFr.map((item) => (
                      <li key={item} className="flex items-start gap-1.5">
                        <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-2">
                  {plan.id === "free" ? (
                    <button
                      type="button"
                      onClick={() => {
                        onSelectPlanPreview("free");
                        onClose();
                      }}
                      className="w-full rounded-xl border border-slate-600 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-slate-800"
                    >
                      Continuer gratuitement (0 €)
                    </button>
                  ) : plan.id === "pro_annual" ? (
                    <button
                      type="button"
                      onClick={() => {
                        onActivateTrial();
                        onClose();
                      }}
                      className="w-full rounded-xl bg-emerald-500 px-3 py-2 text-xs font-extrabold text-slate-950 hover:bg-emerald-400"
                    >
                      {isCurrent ? "Essai / Annuel FW+ activé" : "Commencer 7j gratuits · puis 29,99 €/an"}
                    </button>
                  ) : plan.id === "pro_monthly" ? (
                    <button
                      type="button"
                      onClick={() => {
                        onSelectPlanPreview("pro_monthly");
                        onClose();
                      }}
                      className="w-full rounded-xl border border-emerald-400/35 bg-emerald-500/15 px-3 py-2 text-xs font-bold text-emerald-200 hover:bg-emerald-500/25"
                    >
                      {isCurrent ? "Formule mensuelle active" : "Tester aperçu 4,99 € / mois"}
                    </button>
                  ) : (
                    <div className="space-y-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectPlanPreview("founder_lifetime");
                          onClose();
                        }}
                        className="w-full rounded-xl border border-amber-400/40 bg-amber-500/15 px-3 py-2 text-xs font-bold text-amber-200 hover:bg-amber-500/25"
                      >
                        {isCurrent ? "Pass Fondateur reconnu" : "Simuler Pass Fondateur followeight.com"}
                      </button>
                      <p className="text-[10px] text-slate-400 text-center">
                        Achat direct sur followeight.com synchronisé via votre compte (Play Store sans redirection).
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-[11px] text-slate-300 flex items-start gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>
            <strong>Transparence Play Store &amp; Confidentialité :</strong> Le scan code-barres,
            votre courbe de poids lissée EMA, vos mensurations, vos photos locales, le minuteur
            OMAD/Jeûne et les 44 activités restent 100 % gratuits et sans publicité. Souscription
            Android gérée par <strong>Google Play Billing (RevenueCat `fw_plus`)</strong> avec
            rappel J-2 avant facturation et résiliation en 2 clics.
          </span>
        </div>
      </div>
    </DetailSheet>
  );
}

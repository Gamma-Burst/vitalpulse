"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Check,
  Crown,
  ExternalLink,
  KeyRound,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { SubscriptionState, SubscriptionTier } from "@/types/vitalpulse";
import {
  FREE_DAILY_FW_AI_LIMIT,
  FREE_DAILY_VISION_SCAN_LIMIT,
  getPlansForPlatform,
  isFwPlusActive,
  isNativeAndroidStoreBuild,
  openWebBillingPortal,
  purchaseAndroidRevenueCatPlan,
  restoreAndroidRevenueCatPurchases,
  restoreEntitlementByTokenOrEmail,
  startWebStripeCheckout,
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
  onUpdateSubscription?: (next: SubscriptionState) => void;
}

interface BillingStatusPayload {
  stripeConfigured: boolean;
  revenueCatAndroidConfigured: boolean;
}

export function SubscriptionModal({
  open,
  onClose,
  subscription,
  todayKey,
  triggerReasonFr,
  onActivateTrial,
  onSelectPlanPreview,
  onUpdateSubscription,
}: SubscriptionModalProps) {
  // Démarre en mode Play-safe jusqu'au montage client pour éviter tout flash Stripe dans WebView Android
  const [mounted, setMounted] = useState(false);
  const [isNativeAndroid, setIsNativeAndroid] = useState(true);
  const [serverStatus, setServerStatus] = useState<BillingStatusPayload | null>(null);
  const [busyTier, setBusyTier] = useState<SubscriptionTier | "restore" | "portal" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [showRestoreBox, setShowRestoreBox] = useState(false);
  const [restoreInput, setRestoreInput] = useState(subscription.customerEmail || "");

  useEffect(() => {
    setMounted(true);
    setIsNativeAndroid(isNativeAndroidStoreBuild());
  }, []);

  useEffect(() => {
    if (!open) return;
    setActionError(null);
    setActionSuccess(null);
    let active = true;
    void fetch("/api/billing/status", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data) return;
        setServerStatus({
          stripeConfigured: Boolean(data.stripeConfigured),
          revenueCatAndroidConfigured: Boolean(data.revenueCatAndroidConfigured),
        });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [open]);

  const plusActive = isFwPlusActive(subscription);
  const aiUsed =
    subscription.dailyAiDateKey === todayKey ? subscription.fwAiMessagesUsedToday : 0;
  const visionUsed =
    subscription.dailyAiDateKey === todayKey ? subscription.visionScansUsedToday : 0;

  const visiblePlans = useMemo(
    () => getPlansForPlatform(!mounted ? true : isNativeAndroid),
    [mounted, isNativeAndroid]
  );

  const stripeLive = Boolean(!isNativeAndroid && serverStatus?.stripeConfigured);
  const rcAndroidLive = Boolean(isNativeAndroid && serverStatus?.revenueCatAndroidConfigured);

  function applyUpdatedSubscription(patch: Partial<SubscriptionState>, successMsg: string) {
    if (onUpdateSubscription) {
      onUpdateSubscription({
        ...subscription,
        ...patch,
      });
    } else if (patch.tier) {
      onSelectPlanPreview(patch.tier);
    }
    setActionSuccess(successMsg);
  }

  async function handlePaidAction(tier: "pro_annual" | "pro_monthly" | "founder_lifetime") {
    setActionError(null);
    setActionSuccess(null);

    if (isNativeAndroid) {
      if (tier === "founder_lifetime") return;
      if (!rcAndroidLive) {
        if (tier === "pro_annual") {
          onActivateTrial();
        } else {
          onSelectPlanPreview(tier);
        }
        onClose();
        return;
      }
      setBusyTier(tier);
      const res = await purchaseAndroidRevenueCatPlan(tier);
      setBusyTier(null);
      if (!res.ok) {
        if (res.mode !== "cancelled" && res.error) {
          setActionError(res.error);
        }
        return;
      }
      applyUpdatedSubscription(
        {
          tier: res.tier ?? tier,
          source: "google_play",
          renewsAtIso: res.renewsAtIso ?? null,
          trialEndsAtIso: res.trialEndsAtIso ?? null,
          licenseToken: res.licenseToken ?? subscription.licenseToken,
        },
        "Abonnement FolloWeight Plus (FW+) activé via Google Play !"
      );
      return;
    }

    if (!stripeLive) {
      if (tier === "pro_annual") {
        onActivateTrial();
      } else {
        onSelectPlanPreview(tier);
      }
      onClose();
      return;
    }

    setBusyTier(tier);
    const res = await startWebStripeCheckout(tier, subscription.customerEmail);
    setBusyTier(null);
    if (!res.ok || !res.checkoutUrl) {
      setActionError(res.error || "Impossible d'ouvrir le paiement sécurisé.");
      return;
    }
    window.location.href = res.checkoutUrl;
  }

  async function handleRestore() {
    setActionError(null);
    setActionSuccess(null);
    setBusyTier("restore");

    if (isNativeAndroid && rcAndroidLive && !restoreInput.trim().startsWith("FWPLUS.")) {
      const rcRes = await restoreAndroidRevenueCatPurchases();
      if (rcRes.ok && rcRes.tier) {
        setBusyTier(null);
        applyUpdatedSubscription(
          {
            tier: rcRes.tier,
            source: "google_play",
            renewsAtIso: rcRes.renewsAtIso ?? null,
          },
          "Achats Google Play restaurés avec succès !"
        );
        return;
      }
    }

    const trimmed = restoreInput.trim();
    if (!trimmed) {
      setBusyTier(null);
      setActionError(
        isNativeAndroid
          ? "Aucun achat Google Play actif détecté. Saisissez un code FWPLUS si vous en possédez un."
          : "Saisissez votre e-mail d'achat ou votre code FWPLUS."
      );
      return;
    }

    const res = await restoreEntitlementByTokenOrEmail(
      trimmed.startsWith("FWPLUS.") ? { token: trimmed } : { email: trimmed }
    );
    setBusyTier(null);
    if (!res.ok || !res.tier) {
      setActionError(res.error || "Aucun abonnement actif trouvé.");
      return;
    }
    applyUpdatedSubscription(
      {
        tier: res.tier,
        source: res.source ?? "web_followeight",
        licenseToken: res.licenseToken,
        renewsAtIso: res.renewsAtIso ?? null,
        trialEndsAtIso: res.trialEndsAtIso ?? null,
        customerEmail: res.customerEmail,
        stripeCustomerId: res.stripeCustomerId,
      },
      "Votre accès FolloWeight Plus (FW+) a été restauré sur cet appareil !"
    );
  }

  async function handleOpenPortal() {
    setActionError(null);
    setBusyTier("portal");
    const res = await openWebBillingPortal({
      customerId: subscription.stripeCustomerId,
      licenseToken: subscription.licenseToken,
      email: subscription.customerEmail,
    });
    setBusyTier(null);
    if (!res.ok || !res.url) {
      setActionError(res.error || "Portail de gestion indisponible.");
      return;
    }
    window.location.href = res.url;
  }

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
              <div className="flex flex-wrap items-center gap-2">
                <strong className="text-sm font-bold text-white">
                  Statut actuel :{" "}
                  {plusActive ? (
                    <span className="text-emerald-300">
                      FolloWeight Plus (
                      {subscription.tier === "pro_trial"
                        ? "Essai 7j"
                        : subscription.tier === "founder_lifetime"
                          ? "Fondateur 5 ans"
                          : subscription.tier === "pro_monthly"
                            ? "Mensuel"
                            : "Annuel"}
                      )
                    </span>
                  ) : (
                    <span className="text-slate-200">Gratuit à vie (0 €)</span>
                  )}
                </strong>
                {mounted &&
                  ((isNativeAndroid && !rcAndroidLive) ||
                    (!isNativeAndroid && !stripeLive)) && (
                    <span className="rounded-full border border-sky-400/35 bg-sky-500/15 px-2 py-0.5 text-[10px] font-bold text-sky-200">
                      Aperçu pré-lancement (aucun débit bancaire)
                    </span>
                  )}
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
              disabled={busyTier !== null}
              onClick={() => void handlePaidAction("pro_annual")}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-extrabold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {busyTier === "pro_annual"
                ? "Connexion..."
                : "Essayer FW+ 7 jours gratuits"}
            </button>
          )}
        </div>

        {triggerReasonFr && (
          <div className="rounded-xl border border-amber-400/35 bg-amber-500/15 p-3 text-xs text-amber-100">
            {triggerReasonFr}
          </div>
        )}

        {actionError && (
          <div className="rounded-xl border border-rose-400/40 bg-rose-500/15 p-3 text-xs text-rose-100">
            {actionError}
          </div>
        )}

        {actionSuccess && (
          <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/15 p-3 text-xs text-emerald-100">
            {actionSuccess}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {visiblePlans.map((plan) => {
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

                <div className="pt-2 space-y-1.5">
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
                    <>
                      <button
                        type="button"
                        disabled={busyTier !== null}
                        onClick={() => void handlePaidAction("pro_annual")}
                        className="w-full rounded-xl bg-emerald-500 px-3 py-2 text-xs font-extrabold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
                      >
                        {busyTier === "pro_annual"
                          ? "Ouverture..."
                          : isCurrent
                            ? "Essai / Annuel FW+ actif"
                            : "Commencer 7j gratuits · puis 29,99 €/an"}
                      </button>
                      {isNativeAndroid && (
                        <p className="text-[10px] text-slate-400 leading-snug">
                          7 jours gratuits, puis 29,99 €/an (soit 2,49 €/mois). Renouvellement automatique sauf résiliation au moins 24 h avant la fin de l&apos;essai dans Google Play.
                        </p>
                      )}
                    </>
                  ) : plan.id === "pro_monthly" ? (
                    <button
                      type="button"
                      disabled={busyTier !== null}
                      onClick={() => void handlePaidAction("pro_monthly")}
                      className="w-full rounded-xl border border-emerald-400/35 bg-emerald-500/15 px-3 py-2 text-xs font-bold text-emerald-200 hover:bg-emerald-500/25 disabled:opacity-50"
                    >
                      {busyTier === "pro_monthly"
                        ? "Ouverture..."
                        : isCurrent
                          ? "Formule mensuelle active"
                          : stripeLive || rcAndroidLive
                            ? "Choisir 4,99 € / mois"
                            : "Tester aperçu 4,99 € / mois"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={busyTier !== null}
                      onClick={() => void handlePaidAction("founder_lifetime")}
                      className="w-full rounded-xl border border-amber-400/40 bg-amber-500/15 px-3 py-2 text-xs font-bold text-amber-200 hover:bg-amber-500/25 disabled:opacity-50"
                    >
                      {busyTier === "founder_lifetime"
                        ? "Ouverture..."
                        : isCurrent
                          ? "Pass Fondateur reconnu"
                          : stripeLive
                            ? "Pass Fondateur 5 ans · 69,90 €"
                            : "Aperçu Pass Fondateur 5 ans"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Actions de restauration / gestion d'abonnement */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 space-y-2.5 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {isNativeAndroid && rcAndroidLive && (
                <button
                  type="button"
                  disabled={busyTier !== null}
                  onClick={() => void handleRestore()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-slate-200 hover:border-emerald-400"
                >
                  <RefreshCw className="h-3.5 w-3.5 text-emerald-400" />
                  Restaurer mes achats Google Play
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowRestoreBox((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-slate-200 hover:border-emerald-400"
              >
                <KeyRound className="h-3.5 w-3.5 text-emerald-400" />
                {isNativeAndroid
                  ? "Activer un code d'accès FWPLUS"
                  : "Restaurer par e-mail ou code FWPLUS"}
              </button>
            </div>

            {!isNativeAndroid && stripeLive && (subscription.stripeCustomerId || subscription.customerEmail) && (
              <button
                type="button"
                disabled={busyTier !== null}
                onClick={() => void handleOpenPortal()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-sky-400/35 bg-sky-500/15 px-3 py-1.5 text-[11px] font-semibold text-sky-200 hover:bg-sky-500/25"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Gérer / Résilier en 3 clics
              </button>
            )}
          </div>

          {showRestoreBox && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <input
                type="text"
                value={restoreInput}
                onChange={(e) => setRestoreInput(e.target.value)}
                placeholder={
                  isNativeAndroid
                    ? "Collez votre code d'accès FWPLUS...."
                    : "E-mail utilisé ou code FWPLUS...."
                }
                className="flex-1 min-w-[200px] rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white placeholder:text-slate-500"
              />
              <button
                type="button"
                disabled={busyTier === "restore"}
                onClick={() => void handleRestore()}
                className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
              >
                {busyTier === "restore" ? "Vérification..." : "Valider"}
              </button>
            </div>
          )}

          {subscription.licenseToken && !isNativeAndroid && (
            <div className="rounded-lg border border-emerald-400/25 bg-emerald-500/10 p-2 text-[10px] text-emerald-200 break-all">
              <strong>Votre code portable FW+ :</strong> {subscription.licenseToken}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-[11px] text-slate-300 space-y-2">
          <div className="flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              <strong>Transparence &amp; Confidentialité :</strong> Le scan code-barres, votre
              courbe de poids lissée EMA, vos mensurations, vos photos locales, le minuteur
              OMAD/Jeûne et les 44 activités restent 100 % gratuits et sans publicité.
              {isNativeAndroid
                ? " Abonnement géré de manière sécurisée par Google Play avec résiliation en 2 clics."
                : " Résiliation instantanée sans engagement depuis votre espace client."}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 pl-6 text-[10px] text-slate-400">
            <Link href="/privacy" onClick={onClose} className="underline hover:text-emerald-300">
              Politique de confidentialité
            </Link>
            <span>·</span>
            <Link href="/terms" onClick={onClose} className="underline hover:text-emerald-300">
              Conditions &amp; Avertissement Santé
            </Link>
            <span>·</span>
            <Link href="/delete-account" onClick={onClose} className="underline hover:text-emerald-300">
              Supprimer mes données
            </Link>
          </div>
        </div>
      </div>
    </DetailSheet>
  );
}

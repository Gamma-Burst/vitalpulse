"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MotionConfig } from "framer-motion";
import {
  Activity,
  BookOpen,
  Camera,
  ChefHat,
  Clock,
  Crown,
  Download,
  Footprints,
  HelpCircle,
  LayoutDashboard,
  Moon,
  Plus,
  Ruler,
  ScanBarcode,
  Sparkles,
  Sun,
  Trophy,
  UserCheck,
  Watch,
} from "lucide-react";
import {
  computeAnthropometrics,
  computeDailyEnergyBalance,
  computeWeightTrendAndScaleDecoder,
} from "@/lib/metabolic-engine";
import { roundToDecimals } from "@/lib/decimal-utils";
import {
  buildFreshUserState,
  deleteBodyPhotoDataUrl,
  formatDateKey,
  getRecentDateKeys,
  loadVitalPulseState,
  sanitizeUserProfile,
  saveVitalPulseState,
  VitalPulseState,
} from "@/lib/storage-db";
import { buildDemoSeedState } from "@/data/demo-seed";
import {
  computeFastingLiveStatus,
  formatAllowedDurationFr,
  formatClockHm,
  getDefaultEatingStartHm,
  getProtocolSpec,
} from "@/lib/fasting-engine";
import {
  getNotificationPermissionState,
  requestFastingNotificationPermission,
  scheduleServiceWorkerFastingAlert,
  sendFastingTransitionAlert,
  sendGoalCelebrationNotification,
  triggerLightHaptic,
} from "@/lib/native-bridge";
import {
  GoalCelebrationEvent,
  reconcileGoalsAndCelebrations,
} from "@/lib/goals-celebration-engine";
import { GoalsManagerModal } from "@/components/GoalsManagerModal";
import { DashboardView, DashboardTabTarget } from "@/components/DashboardView";
import { MealScannerView } from "@/components/MealScannerView";
import { FridgeChefView } from "@/components/FridgeChefView";
import { ActivityCoachView } from "@/components/ActivityCoachView";
import { BodyLabSubTab, BodyLabView } from "@/components/BodyLabView";
import { ProfileChallengesView } from "@/components/ProfileChallengesView";
import { MedicalHubView } from "@/components/MedicalHubView";
import { FastingView } from "@/components/FastingView";
import { OnboardingWizard } from "@/components/OnboardingWizard";
import { BarcodeScannerModal } from "@/components/BarcodeScannerModal";
import { WearablesSyncSheet } from "@/components/WearablesSyncSheet";
import { QuickActionSheet } from "@/components/ui/QuickActionSheet";
import { FolloWeightLogo } from "@/components/ui/FolloWeightLogo";
import { FwAiCoachView } from "@/components/FwAiCoachView";
import { SubscriptionModal } from "@/components/SubscriptionModal";
import {
  activatePlanTier,
  isFwPlusActive,
  recordFwAiMessageUsage,
  recordVisionScanUsage,
  recordWebSearchUsage,
  startSevenDayFreeTrial,
  verifyWebCheckoutSession,
} from "@/lib/billing-bridge";
import { GlossaryPortalHost, openGlossaryCatalog } from "@/components/ui/InfoTip";
import { parseAppleWatchSyncParams } from "@/lib/wearables-bridge";
import { blurActiveEditableElement, scrollViewportToTop } from "@/lib/scroll-utils";
import {
  BloodPanelEntry,
  BodyMeasurementEntry,
  BodyPhotoMeta,
  CustomChallenge,
  DashboardWidgetId,
  FastingConfig,
  FastingProtocolId,
  FridgeScanSession,
  MealEntry,
  StepSource,
  SubscriptionTier,
  UserProfile,
  WearableEcosystem,
  WorkoutSession,
} from "@/types/vitalpulse";

type TabId = DashboardTabTarget;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const TABS: {
  id: TabId;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "dashboard", label: "Dashboard", shortLabel: "Accueil", icon: LayoutDashboard },
  { id: "fw_ai", label: "Coach FW AI", shortLabel: "FW AI", icon: Sparkles },
  { id: "scanner", label: "Scanner Plat", shortLabel: "Plat", icon: Camera },
  { id: "fridge", label: "Frigo & Recettes", shortLabel: "Frigo", icon: ChefHat },
  { id: "fasting", label: "Jeûne & OMAD", shortLabel: "Jeûne", icon: Clock },
  { id: "activity", label: "Pas & Exercices", shortLabel: "Bouger", icon: Footprints },
  { id: "bodylab", label: "Corps & Bilans", shortLabel: "Corps", icon: Ruler },
  { id: "profile", label: "Profil, IMC & Push", shortLabel: "Profil", icon: UserCheck },
  { id: "medical", label: "Veille Médicale", shortLabel: "Science", icon: BookOpen },
];

export default function VitalPulseApp() {
  const [state, setState] = useState<VitalPulseState | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [scannerEntryMode, setScannerEntryMode] = useState<"photo" | "text">("photo");
  const [bodyLabSubTab, setBodyLabSubTab] = useState<BodyLabSubTab>("measurements");
  const [rangeDays, setRangeDays] = useState<7 | 14 | 30>(7);
  const [highlightedMealId, setHighlightedMealId] = useState<string | null>(null);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [showOnboardingOverride, setShowOnboardingOverride] = useState(false);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [barcodeOpen, setBarcodeOpen] = useState(false);
  const [wearablesOpen, setWearablesOpen] = useState(false);
  const [goalsModalOpen, setGoalsModalOpen] = useState(false);
  const [goalCelebrationBanner, setGoalCelebrationBanner] =
    useState<GoalCelebrationEvent | null>(null);
  const dispatchedGoalAlertKeysRef = useRef<Set<string>>(new Set());
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);
  const [subscriptionReasonFr, setSubscriptionReasonFr] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const savedNoticeTimerRef = useRef<number | null>(null);

  const notifySavedAndScrollHome = useCallback((messageFr: string) => {
    blurActiveEditableElement();
    setSavedNotice(messageFr);
    if (savedNoticeTimerRef.current !== null) {
      window.clearTimeout(savedNoticeTimerRef.current);
    }
    savedNoticeTimerRef.current = window.setTimeout(() => {
      setSavedNotice(null);
      savedNoticeTimerRef.current = null;
    }, 4000);
    scrollViewportToTop({ smooth: true });
  }, []);

  useEffect(() => {
    return () => {
      if (savedNoticeTimerRef.current !== null) {
        window.clearTimeout(savedNoticeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    void loadVitalPulseState().then((loaded) => {
      if (!mounted) return;
      if (typeof window !== "undefined") {
        const awSnap = parseAppleWatchSyncParams(
          window.location.search,
          window.location.hash
        );
        if (awSnap) {
          const curDayKey = formatDateKey();
          let nextSteps = loaded.steps;
          if (awSnap.steps !== undefined) {
            const exists = loaded.steps.some((s) => s.dateKey === curDayKey);
            nextSteps = exists
              ? loaded.steps.map((s) =>
                  s.dateKey === curDayKey
                    ? {
                        ...s,
                        steps: awSnap.steps!,
                        source: "health_connect",
                        updatedAt: new Date().toISOString(),
                      }
                    : s
                )
              : [
                  ...loaded.steps,
                  {
                    dateKey: curDayKey,
                    steps: awSnap.steps,
                    source: "health_connect",
                    updatedAt: new Date().toISOString(),
                  },
                ];
          }
          const updated: VitalPulseState = {
            ...loaded,
            steps: nextSteps,
            profile:
              awSnap.weightKg !== undefined
                ? { ...loaded.profile, weightKg: awSnap.weightKg }
                : loaded.profile,
            wearable: {
              ...loaded.wearable,
              ecosystem: "apple_watch",
              deviceName: awSnap.sourceLabel,
              lastSyncAt: new Date().toISOString(),
              lastHeartRateBpm:
                awSnap.heartRateBpm ?? loaded.wearable.lastHeartRateBpm,
              syncedStepsToday:
                awSnap.steps ?? loaded.wearable.syncedStepsToday,
              syncedActiveKcalToday:
                awSnap.activeKcal ?? loaded.wearable.syncedActiveKcalToday,
              syncedExerciseMinutesToday:
                awSnap.exerciseMinutes ??
                loaded.wearable.syncedExerciseMinutesToday,
            },
          };
          void saveVitalPulseState(updated);
          setState(updated);

          try {
            const cleanedUrl = new URL(window.location.href);
            for (const k of [
              "aw_sync",
              "steps",
              "pas",
              "kcal",
              "activeKcal",
              "bpm",
              "hr",
              "weight",
              "poids",
              "ex",
              "exercise",
              "source",
            ]) {
              cleanedUrl.searchParams.delete(k);
            }
            if (cleanedUrl.hash.includes("aw_sync=")) {
              cleanedUrl.hash = "";
            }
            window.history.replaceState(
              null,
              "",
              `${cleanedUrl.pathname}${cleanedUrl.search}${cleanedUrl.hash}`
            );
          } catch {
            // ignore URL rewrite errors
          }

          const msgParts: string[] = [];
          if (awSnap.steps !== undefined) msgParts.push(`${awSnap.steps} pas`);
          if (awSnap.activeKcal !== undefined) msgParts.push(`${awSnap.activeKcal} kcal`);
          if (awSnap.heartRateBpm !== undefined) msgParts.push(`${awSnap.heartRateBpm} BPM`);
          if (awSnap.weightKg !== undefined) msgParts.push(`${awSnap.weightKg} kg`);
          notifySavedAndScrollHome(
            `Apple Watch synchronisée (${msgParts.join(" · ") || "données du jour"}) !`
          );
          return;
        }

        try {
          const urlObj = new URL(window.location.href);
          const tabParam = urlObj.searchParams.get("tab") as TabId | null;
          if (tabParam && TABS.some((t) => t.id === tabParam)) {
            setActiveTab(tabParam);
          }
          const sessionId = urlObj.searchParams.get("billing_session_id");
          if (sessionId && sessionId.startsWith("cs_")) {
            setState(loaded);
            void verifyWebCheckoutSession(sessionId).then((verified) => {
              if (!mounted) return;
              if (verified.ok && verified.tier) {
                commitState((prev) => ({
                  ...prev,
                  subscription: {
                    ...prev.subscription,
                    tier: verified.tier!,
                    source: "web_followeight",
                    trialEndsAtIso: verified.trialEndsAtIso ?? null,
                    renewsAtIso: verified.renewsAtIso ?? null,
                    licenseToken:
                      verified.licenseToken ?? prev.subscription.licenseToken,
                    customerEmail:
                      verified.customerEmail ?? prev.subscription.customerEmail,
                    stripeCustomerId:
                      verified.stripeCustomerId ??
                      prev.subscription.stripeCustomerId,
                  },
                }));
                notifySavedAndScrollHome(
                  "Abonnement FolloWeight Plus (FW+) activé et synchronisé !"
                );
              }
            });
            urlObj.searchParams.delete("billing_session_id");
            urlObj.searchParams.delete("billing_cancel");
            window.history.replaceState(
              null,
              "",
              `${urlObj.pathname}${urlObj.search}${urlObj.hash}`
            );
            return;
          }
        } catch {
          // ignore URL parsing errors
        }
      }
      setState(loaded);
    });

    if (typeof window !== "undefined") {
      try {
        const savedTheme = window.localStorage.getItem("vitalpulse_theme");
        if (savedTheme === "light" || savedTheme === "dark") {
          setTheme(savedTheme);
        }
      } catch {
        // ignore storage errors
      }
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("/sw.js").catch(() => {});
      }
      const onBeforeInstall = (e: Event) => {
        e.preventDefault();
        setInstallPrompt(e as BeforeInstallPromptEvent);
      };
      window.addEventListener("beforeinstallprompt", onBeforeInstall);
      return () => {
        mounted = false;
        window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      };
    }
    return () => {
      mounted = false;
    };
  }, [notifySavedAndScrollHome]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle("dark", theme === "dark");
    try {
      window.localStorage.setItem("vitalpulse_theme", theme);
    } catch {
      // ignore storage errors
    }
  }, [theme]);

  useEffect(() => {
    scrollViewportToTop({ smooth: false });
  }, [activeTab]);

  function commitState(updater: (prev: VitalPulseState) => VitalPulseState) {
    setState((prev) => {
      if (!prev) return prev;
      const next = updater(prev);
      void saveVitalPulseState(next);
      return next;
    });
  }

  const todayKey = formatDateKey();

  const anthro = useMemo(() => {
    if (!state) return null;
    return computeAnthropometrics(state.profile);
  }, [state]);

  const recentBalances = useMemo(() => {
    if (!state) return [];
    const keys = getRecentDateKeys(rangeDays);
    return keys.map((dateKey) =>
      computeDailyEnergyBalance({
        dateKey,
        profile: state.profile,
        meals: state.meals,
        stepLog: state.steps.find((s) => s.dateKey === dateKey),
        workouts: state.workouts,
        waterLog: state.waters.find((w) => w.dateKey === dateKey),
      })
    );
  }, [state, rangeDays]);

  const todayBalance = useMemo(() => {
    if (!state) return null;
    return computeDailyEnergyBalance({
      dateKey: todayKey,
      profile: state.profile,
      meals: state.meals,
      stepLog: state.steps.find((s) => s.dateKey === todayKey),
      workouts: state.workouts,
      waterLog: state.waters.find((w) => w.dateKey === todayKey),
    });
  }, [state, todayKey]);

  const { trend: weightTrend, decoder: scaleDecoder } = useMemo(() => {
    if (!state) return { trend: [], decoder: null };
    return computeWeightTrendAndScaleDecoder(state.weights, recentBalances);
  }, [state, recentBalances]);

  const latestMeasurement = useMemo(() => {
    if (!state || state.measurements.length === 0) return null;
    return [...state.measurements].sort((a, b) => b.dateKey.localeCompare(a.dateKey))[0];
  }, [state]);

  const latestBloodPanel = useMemo(() => {
    if (!state || state.bloodPanels.length === 0) return null;
    return [...state.bloodPanels].sort((a, b) => b.dateKey.localeCompare(a.dateKey))[0];
  }, [state]);

  const [fastingBannerAlert, setFastingBannerAlert] = useState<{
    key: string;
    title: string;
    body: string;
  } | null>(null);

  const fastingCfg = state?.fasting;

  useEffect(() => {
    if (!fastingCfg || fastingCfg.protocolId === "none") return;
    if (fastingCfg.notificationsEnabled === false) return;

    const checkTransition = () => {
      const live = computeFastingLiveStatus(fastingCfg, Date.now());
      const payload = live.notificationPayload;

      if (live.endIso) {
        const endMs = Date.parse(live.endIso);
        const delayMs = endMs - Date.now();
        if (Number.isFinite(delayMs) && delayMs > 2000 && delayMs <= 24 * 3600 * 1000) {
          const isFastNow = live.mode === "fasting";
          const eatDuration = formatAllowedDurationFr(live.eatWindowHours);
          scheduleServiceWorkerFastingAlert({
            delayMs,
            key: `auto-end:${fastingCfg.protocolId}:${live.endIso}`,
            title: isFastNow
              ? `Fenêtre repas ouverte · ${live.protocol.badge}`
              : `Reprise du jeûne · ${live.protocol.badge}`,
            body: isFastNow
              ? `Vous êtes autorisé à manger pendant ${eatDuration} (jusqu'à ${formatClockHm(
                  endMs + live.eatWindowHours * 3600 * 1000
                )}).`
              : `Votre fenêtre repas de ${eatDuration} est terminée. Reprise du jeûne maintenant.`,
          });
        }
      }

      if (!payload || payload.key === fastingCfg.lastNotifiedTransitionKey) return;

      setFastingBannerAlert(payload);
      void sendFastingTransitionAlert(payload);

      setState((prev) => {
        if (!prev || prev.fasting.lastNotifiedTransitionKey === payload.key) return prev;
        const next = {
          ...prev,
          fasting: {
            ...prev.fasting,
            lastNotifiedTransitionKey: payload.key,
          },
        };
        void saveVitalPulseState(next);
        return next;
      });
    };

    checkTransition();
    const timer = window.setInterval(checkTransition, 15000);
    const onVisible = () => {
      if (document.visibilityState === "visible") checkTransition();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [fastingCfg]);

  const goalReconciliation = useMemo(() => {
    if (!state || !todayBalance) return null;
    return reconcileGoalsAndCelebrations(state.challenges, {
      profile: state.profile,
      todayKey,
      todayBalance,
      meals: state.meals,
      workouts: state.workouts,
      weights: state.weights,
      measurements: state.measurements,
      fasting: state.fasting,
    });
  }, [state, todayBalance, todayKey]);

  useEffect(() => {
    if (!goalReconciliation || !goalReconciliation.hasStateChanges) return;

    const freshEvents = goalReconciliation.newlyUnlockedEvents.filter(
      (ev) => !dispatchedGoalAlertKeysRef.current.has(ev.key)
    );
    for (const ev of freshEvents) {
      dispatchedGoalAlertKeysRef.current.add(ev.key);
      void sendGoalCelebrationNotification({
        key: ev.key,
        title: ev.titleFr,
        body: ev.bodyFr,
      });
    }
    if (freshEvents.length > 0) {
      setGoalCelebrationBanner(freshEvents[freshEvents.length - 1]);
    }

    setState((prev) => {
      if (!prev) return prev;
      const updatesById = new Map(
        goalReconciliation.updatedChallenges.map((c) => [c.id, c])
      );
      const nextChallenges = prev.challenges.map((c) => updatesById.get(c.id) ?? c);
      const changed = nextChallenges.some((c, i) => c !== prev.challenges[i]);
      if (!changed) return prev;
      const next = { ...prev, challenges: nextChallenges };
      void saveVitalPulseState(next);
      return next;
    });
  }, [goalReconciliation]);

  if (!state || !anthro || !todayBalance) {
    return (
      <div className="min-h-screen bg-[var(--vp-bg)] flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3 text-slate-300">
          <Activity className="w-8 h-8 text-emerald-400 animate-pulse" />
          <p className="text-sm font-medium">Chargement de FolloWeight...</p>
        </div>
        <section className="sr-only" aria-label="Présentation FolloWeight">
          <h1>
            FolloWeight — Coach Nutrition, Sport, Jeûne Intermittent et Métabolisme IA sans publicité
          </h1>
          <p>
            FolloWeight (followeight.com) aide à piloter votre alimentation, votre poids lissé EMA,
            votre jeûne intermittent OMAD ou 16:8 et vos entraînements sportifs à partir de repères
            scientifiques ANSES Ciqual, EFSA, OMS et PubMed, sans aucune publicité tierce.
          </p>
          <h2>Analyse photo de repas, frigo et code-barres EAN</h2>
          <p>
            Estimez calories, protéines, glucides, lipides, fibres, sodium et degré de
            transformation NOVA (1 à 4) depuis une photo, une recette frigo ou un code-barres
            OpenFoodFacts avec détection de magasin en FolloWeight Plus.
          </p>
          <h2>Bilan corporel IMC, BRI, TDEE et objectifs personnalisés</h2>
          <p>
            Suivez votre dépense énergétique réelle, vos mensurations, vos bilans sanguins et vos
            objectifs personnels (pas, hydratation, poids cible, séances hebdomadaires) avec
            notifications de félicitations dès que chaque palier est atteint.
          </p>
          <nav aria-label="Liens légaux FolloWeight">
            <a href="/privacy">Politique de confidentialité</a>
            <a href="/terms">Conditions d&apos;utilisation et tarifs</a>
            <a href="/delete-account">Supprimer mes données</a>
          </nav>
        </section>
      </div>
    );
  }

  const mealsWithPhotos = [...state.meals]
    .filter((m) => Boolean(m.photoDataUrl))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const todayWorkouts = state.workouts.filter((w) => w.dateKey === todayKey);

  function updateProfilePatch(patch: Partial<UserProfile>) {
    commitState((prev) => {
      const nextProfile = sanitizeUserProfile({ ...prev.profile, ...patch });
      const goalChanged = nextProfile.dailyStepGoal !== prev.profile.dailyStepGoal;
      const nextChallenges = goalChanged
        ? prev.challenges.map((c) =>
            c.id === "chal-steps-8000" || c.id === "chal-steps-8500"
              ? {
                  ...c,
                  title: `Cap des ${nextProfile.dailyStepGoal} pas / jour`,
                  targetValue: nextProfile.dailyStepGoal,
                }
              : c
          )
        : prev.challenges;
      return {
        ...prev,
        profile: nextProfile,
        challenges: nextChallenges,
      };
    });
  }

  function updateTodaySteps(steps: number, source: StepSource = "manual") {
    const safeSteps = Math.max(0, Math.min(100000, Math.round(steps)));
    commitState((prev) => {
      const exists = prev.steps.some((s) => s.dateKey === todayKey);
      const nextSteps = exists
        ? prev.steps.map((s) =>
            s.dateKey === todayKey
              ? { ...s, steps: safeSteps, source, updatedAt: new Date().toISOString() }
              : s
          )
        : [
            ...prev.steps,
            { dateKey: todayKey, steps: safeSteps, source, updatedAt: new Date().toISOString() },
          ];
      return { ...prev, steps: nextSteps };
    });
  }

  function setWaterTodayMl(ml: number) {
    const clamped = Math.max(0, Math.min(10000, Math.round(ml)));
    commitState((prev) => {
      const exists = prev.waters.find((w) => w.dateKey === todayKey);
      const nextWaters = exists
        ? prev.waters.map((w) =>
            w.dateKey === todayKey ? { ...w, milliliters: clamped } : w
          )
        : [...prev.waters, { dateKey: todayKey, milliliters: clamped }];
      return { ...prev, waters: nextWaters };
    });
  }

  function addWaterMl(ml: number) {
    commitState((prev) => {
      const exists = prev.waters.find((w) => w.dateKey === todayKey);
      const nextWaters = exists
        ? prev.waters.map((w) =>
            w.dateKey === todayKey
              ? { ...w, milliliters: Math.max(0, Math.min(10000, w.milliliters + ml)) }
              : w
          )
        : [
            ...prev.waters,
            { dateKey: todayKey, milliliters: Math.max(0, Math.min(10000, ml)) },
          ];
      return { ...prev, waters: nextWaters };
    });
  }

  function toggleChallengeToday(id: string) {
    commitState((prev) => ({
      ...prev,
      challenges: prev.challenges.map((c) => {
        if (c.id !== id) return c;
        const exists = c.completedDates.includes(todayKey);
        return {
          ...c,
          completedDates: exists
            ? c.completedDates.filter((d) => d !== todayKey)
            : [...c.completedDates, todayKey],
        };
      }),
    }));
  }

  function toggleChallengeNotification(id: string) {
    commitState((prev) => ({
      ...prev,
      challenges: prev.challenges.map((c) =>
        c.id === id
          ? {
              ...c,
              celebrateNotifications: c.celebrateNotifications === false,
            }
          : c
      ),
    }));
  }

  function handleOnboardingCompleteFresh(payload: {
    profile: UserProfile;
    fastingProtocol: FastingProtocolId;
    eatingWindowStartHm: string;
    fastingNotifications: boolean;
    enabledWidgets: DashboardWidgetId[];
    wearableEcosystem: WearableEcosystem;
  }) {
    const spec = getProtocolSpec(payload.fastingProtocol);
    const fresh = buildFreshUserState(
      {
        ...payload.profile,
        onboardingCompleted: true,
        preferredFasting: payload.fastingProtocol,
      },
      {
        enabledWidgets: payload.enabledWidgets,
        wearable: { ecosystem: payload.wearableEcosystem },
      }
    );
    const initialFasting = {
      protocolId: payload.fastingProtocol,
      fastHours: spec.fastHours,
      eatHours: spec.eatHours,
      eatingWindowStartHm:
        payload.eatingWindowStartHm || getDefaultEatingStartHm(payload.fastingProtocol),
      dailyScheduleEnabled:
        payload.fastingProtocol !== "none" && payload.fastingProtocol !== "5_2",
      notificationsEnabled: payload.fastingNotifications,
      activeStartIso: null,
      plannedStartIso: null,
      eatingWindowStartIso: null,
      lastNotifiedTransitionKey: null as string | null,
      history: [],
      safetyAck: true,
    };
    const initialLive = computeFastingLiveStatus(initialFasting, Date.now());
    initialFasting.lastNotifiedTransitionKey = initialLive.notificationPayload?.key ?? null;
    fresh.fasting = initialFasting;
    setState(fresh);
    void saveVitalPulseState(fresh);
    setShowOnboardingOverride(false);
    setActiveTab("dashboard");
    notifySavedAndScrollHome("Profil configuré — bienvenue dans votre espace FolloWeight !");
    scrollViewportToTop({ smooth: false });
  }

  function handleOnboardingSkipDemo() {
    commitState((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        onboardingCompleted: true,
      },
    }));
    setShowOnboardingOverride(false);
    setActiveTab("dashboard");
    scrollViewportToTop({ smooth: false });
  }

  const showOnboardingWizard =
    !state.profile.onboardingCompleted || showOnboardingOverride;

  const isPlateTab = activeTab === "scanner" || activeTab === "fridge";

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen max-w-[100vw] overflow-x-clip bg-[var(--vp-bg)] text-[var(--vp-text)] vp-main-pb lg:flex">
        {showOnboardingWizard && (
          <OnboardingWizard
            initialProfile={state.profile}
            initialWidgets={state.enabledWidgets}
            initialWearable={state.wearable}
            onCompleteFresh={handleOnboardingCompleteFresh}
            onSkipDemo={handleOnboardingSkipDemo}
          />
        )}

        {/* Sidebar Desktop */}
        <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 border-r border-slate-500/15 bg-[var(--vp-surface)] p-4 justify-between sticky top-0 h-screen">
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-2 px-1">
              <FolloWeightLogo size={38} subtitle="Web & Android v4" />
              <button
                type="button"
                onClick={() => {
                  triggerLightHaptic();
                  setTheme((t) => (t === "dark" ? "light" : "dark"));
                }}
                aria-label="Changer thème clair ou sombre"
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-500/25 bg-slate-500/10 text-slate-300 hover:border-emerald-400/40"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            </div>

            <nav className="space-y-1">
              {TABS.map((t) => {
                const Icon = t.icon;
                const active = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      triggerLightHaptic();
                      setActiveTab(t.id);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                      active
                        ? "bg-emerald-500 text-slate-950 font-semibold"
                        : "text-slate-300 hover:bg-slate-500/10"
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="space-y-2 pt-2 border-t border-slate-500/15">
              <button
                type="button"
                onClick={() => {
                  triggerLightHaptic();
                  setQuickActionsOpen(true);
                }}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500/15 border border-emerald-400/35 px-3 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/25"
              >
                <Plus className="h-4 w-4" />
                Action rapide
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerLightHaptic();
                  setGoalsModalOpen(true);
                }}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-amber-400/35 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-200 hover:bg-amber-500/20"
              >
                <Trophy className="h-4 w-4 text-amber-300" />
                Mes Objectifs
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerLightHaptic();
                  setWearablesOpen(true);
                }}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-500/25 bg-slate-500/10 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-cyan-400/40"
              >
                <Watch className="h-4 w-4 text-cyan-300" />
                Montre &amp; Capteurs
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerLightHaptic();
                  openGlossaryCatalog();
                }}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-200 hover:border-cyan-300/50 hover:bg-cyan-500/20"
              >
                <HelpCircle className="h-4 w-4 text-cyan-300" />
                Lexique Santé (?)
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerLightHaptic();
                  setSubscriptionReasonFr(null);
                  setSubscriptionOpen(true);
                }}
                className={`w-full flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition ${
                  isFwPlusActive(state.subscription)
                    ? "border-amber-400/45 bg-amber-500/15 text-amber-200"
                    : "border-emerald-400/35 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20"
                }`}
              >
                <Crown className="h-4 w-4 text-amber-300" />
                {isFwPlusActive(state.subscription) ? "FW+ Actif" : "FolloWeight Plus (FW+)"}
              </button>
            </div>
          </div>

          <div className="rounded-xl bg-slate-500/10 border border-slate-500/20 p-3 text-xs space-y-2">
            <div className="flex justify-between text-slate-300">
              <span className="font-semibold">{state.profile.name}</span>
              <strong className="text-emerald-300">{state.profile.weightKg} kg</strong>
            </div>
            <div className="text-[11px] text-slate-400">
              Cible : {anthro.targetIntakeKcal} kcal/j · {state.profile.dailyStepGoal} pas
            </div>
            {installPrompt && (
              <button
                type="button"
                onClick={() => void installPrompt.prompt()}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-semibold"
              >
                <Download className="w-3.5 h-3.5" />
                Installer l&apos;app
              </button>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Topbar Mobile Épurée */}
          <header className="lg:hidden sticky top-0 z-30 bg-[var(--vp-surface-glass)] backdrop-blur-md border-b border-slate-500/15 px-3 py-2 flex items-center justify-between gap-2">
            <FolloWeightLogo size={28} showWordmark={true} subtitle="" compactMobileWordmark />

            <div className="flex items-center gap-1.5 shrink-0">
              {installPrompt && (
                <button
                  type="button"
                  onClick={() => void installPrompt.prompt()}
                  className="inline-flex items-center gap-1 px-2 py-1.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-[11px]"
                >
                  <Download className="w-3 h-3" />
                  App
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  triggerLightHaptic();
                  setWearablesOpen(true);
                }}
                aria-label="Montres & Capteurs"
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-500/25 bg-slate-500/10 text-cyan-300"
              >
                <Watch className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerLightHaptic();
                  setActiveTab("profile");
                }}
                aria-label="Profil & Défis"
                className={`flex h-8 w-8 items-center justify-center rounded-xl border ${
                  activeTab === "profile"
                    ? "border-emerald-400 bg-emerald-500/20 text-emerald-300"
                    : "border-slate-500/25 bg-slate-500/10 text-slate-300"
                }`}
              >
                <UserCheck className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerLightHaptic();
                  openGlossaryCatalog();
                }}
                aria-label="Lexique Santé sans jargon"
                title="Lexique Santé : comprendre tous les termes"
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-cyan-400/35 bg-cyan-500/15 text-cyan-200 transition hover:bg-cyan-500/25"
              >
                <HelpCircle className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerLightHaptic();
                  setTheme((t) => (t === "dark" ? "light" : "dark"));
                }}
                aria-label="Basculer thème clair ou sombre"
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-500/25 bg-slate-500/10 text-amber-300"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            </div>
          </header>

          {/* Segmented Sub-Nav mobile quand sur Scanner / Frigo */}
          {isPlateTab && (
            <div className="lg:hidden px-4 pt-3">
              <div className="grid grid-cols-4 gap-1 rounded-2xl border border-slate-500/20 bg-slate-500/10 p-1 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setScannerEntryMode("text");
                    setActiveTab("scanner");
                  }}
                  className={`rounded-xl py-2 px-1 transition ${
                    activeTab === "scanner" && scannerEntryMode === "text"
                      ? "bg-emerald-500 text-slate-950"
                      : "text-emerald-300"
                  }`}
                >
                  Par écrit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setScannerEntryMode("photo");
                    setActiveTab("scanner");
                  }}
                  className={`rounded-xl py-2 px-1 transition ${
                    activeTab === "scanner" && scannerEntryMode === "photo"
                      ? "bg-emerald-500 text-slate-950"
                      : "text-slate-300"
                  }`}
                >
                  Photo Plat
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("fridge")}
                  className={`rounded-xl py-2 px-1 transition ${
                    activeTab === "fridge"
                      ? "bg-emerald-500 text-slate-950"
                      : "text-slate-300"
                  }`}
                >
                  Frigo
                </button>
                <button
                  type="button"
                  onClick={() => setBarcodeOpen(true)}
                  className="inline-flex items-center justify-center gap-1 rounded-xl py-2 px-1 text-amber-300 hover:bg-amber-500/15"
                >
                  <ScanBarcode className="h-3.5 w-3.5" />
                  EAN
                </button>
              </div>
            </div>
          )}

          <main className="max-w-6xl mx-auto p-4 sm:p-6">
            {savedNotice && (
              <div
                role="status"
                aria-live="polite"
                className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-emerald-400/50 bg-emerald-500/15 px-4 py-3 text-xs font-semibold text-emerald-100 shadow-lg"
              >
                <span>✓ {savedNotice}</span>
                <button
                  type="button"
                  onClick={() => setSavedNotice(null)}
                  className="rounded-lg border border-emerald-400/35 px-2 py-0.5 text-[11px] font-bold text-emerald-200 hover:bg-emerald-500/20"
                >
                  OK
                </button>
              </div>
            )}
            {goalCelebrationBanner && (
              <div
                role="status"
                aria-live="polite"
                className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-400/55 bg-gradient-to-r from-emerald-500/20 via-amber-500/15 to-emerald-500/20 px-4 py-3.5 text-xs shadow-lg"
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/40">
                    <Trophy className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="inline-block rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-200">
                      {goalCelebrationBanner.badgeFr}
                    </span>
                    <p className="mt-1 font-extrabold text-white text-sm">
                      {goalCelebrationBanner.titleFr}
                    </p>
                    <p className="mt-0.5 text-slate-100 leading-relaxed">
                      {goalCelebrationBanner.bodyFr}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {getNotificationPermissionState() === "default" && (
                    <button
                      type="button"
                      onClick={() => void requestFastingNotificationPermission()}
                      className="rounded-xl border border-emerald-400/45 bg-emerald-500/20 px-3 py-1.5 font-bold text-emerald-200 hover:bg-emerald-500/30"
                    >
                      Activer notifs 🔔
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setGoalsModalOpen(true);
                      setGoalCelebrationBanner(null);
                    }}
                    className="rounded-xl bg-amber-400 px-3 py-1.5 font-extrabold text-slate-950 hover:bg-amber-300"
                  >
                    Mes objectifs
                  </button>
                  <button
                    type="button"
                    onClick={() => setGoalCelebrationBanner(null)}
                    className="rounded-xl border border-white/20 px-2.5 py-1.5 font-semibold text-slate-200 hover:bg-white/10"
                  >
                    Merci !
                  </button>
                </div>
              </div>
            )}
            {fastingBannerAlert && (
              <div
                role="status"
                aria-live="polite"
                className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-400/50 bg-emerald-500/15 px-4 py-3 text-xs shadow-lg"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-extrabold text-emerald-200">{fastingBannerAlert.title}</p>
                  <p className="mt-0.5 text-slate-100">{fastingBannerAlert.body}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("fasting");
                      setFastingBannerAlert(null);
                    }}
                    className="rounded-xl bg-emerald-500 px-3 py-1.5 font-bold text-slate-950 hover:bg-emerald-400"
                  >
                    Voir minuteur
                  </button>
                  <button
                    type="button"
                    onClick={() => setFastingBannerAlert(null)}
                    className="rounded-xl border border-white/15 px-2.5 py-1.5 font-semibold text-slate-200 hover:bg-white/10"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            )}
            {activeTab === "dashboard" && (
              <DashboardView
                profile={state.profile}
                anthro={anthro}
                todayBalance={todayBalance}
                recentBalances={recentBalances}
                weightTrend={weightTrend}
                scaleDecoder={scaleDecoder}
                mealsWithPhotos={mealsWithPhotos}
                rangeDays={rangeDays}
                onRangeChange={setRangeDays}
                onAddWater={addWaterMl}
                onQuickLogWeight={(weightKg, waistCm) => {
                  const safeKg = roundToDecimals(weightKg, 2);
                  const safeWaist =
                    waistCm !== undefined ? roundToDecimals(waistCm, 2) : undefined;
                  commitState((prev) => ({
                    ...prev,
                    profile: {
                      ...prev.profile,
                      weightKg: safeKg,
                      waistCm: safeWaist ?? prev.profile.waistCm,
                    },
                    weights: [
                      ...prev.weights,
                      {
                        id: `wt-${Date.now()}`,
                        dateKey: todayKey,
                        timestamp: new Date().toISOString(),
                        weightKg: safeKg,
                        waistCm: safeWaist,
                      },
                    ],
                  }));
                  scrollViewportToTop({ smooth: true });
                }}
                onNavigateTab={(tab, subTab) => {
                  if (subTab) setBodyLabSubTab(subTab);
                  setActiveTab(tab);
                }}
                onSelectMealToInspect={(mealId) => {
                  setHighlightedMealId(mealId);
                  setActiveTab("scanner");
                }}
                onSwitchToRealProfile={() => setShowOnboardingOverride(true)}
                latestMeasurement={latestMeasurement}
                latestBloodPanel={latestBloodPanel}
                photosCount={state.bodyPhotoMetas.length}
                fasting={state.fasting}
                enabledWidgets={state.enabledWidgets}
                wearable={state.wearable}
                completedMindsetDates={state.completedMindsetDates}
                onToggleWidget={(id) =>
                  commitState((prev) => {
                    const exists = prev.enabledWidgets.includes(id);
                    if (exists && prev.enabledWidgets.length <= 2) return prev;
                    const next = exists
                      ? prev.enabledWidgets.filter((w) => w !== id)
                      : [...prev.enabledWidgets, id];
                    return { ...prev, enabledWidgets: next };
                  })
                }
                onOpenWearables={() => setWearablesOpen(true)}
                onOpenBarcode={() => setBarcodeOpen(true)}
                onToggleMindsetToday={() =>
                  commitState((prev) => {
                    const exists = prev.completedMindsetDates.includes(todayKey);
                    return {
                      ...prev,
                      completedMindsetDates: exists
                        ? prev.completedMindsetDates
                        : [...prev.completedMindsetDates, todayKey],
                    };
                  })
                }
                onNavigateFasting={() => setActiveTab("fasting")}
                onSetWaterToday={setWaterTodayMl}
                onUpdateProfilePatch={updateProfilePatch}
                onUpdateTodaySteps={(steps: number) => updateTodaySteps(steps, "manual")}
                onNotifySaved={notifySavedAndScrollHome}
                challenges={state.challenges}
                goalEvaluations={goalReconciliation?.evaluationsById}
                onOpenGoalsModal={() => setGoalsModalOpen(true)}
                onToggleChallengeToday={toggleChallengeToday}
                onSaveMeal={(meal: MealEntry) =>
                  commitState((prev) => ({ ...prev, meals: [meal, ...prev.meals] }))
                }
                onOpenWrittenMeal={() => {
                  setScannerEntryMode("text");
                  setActiveTab("scanner");
                }}
              />
            )}

            {activeTab === "scanner" && (
              <MealScannerView
                meals={state.meals}
                todayDateKey={todayKey}
                specialMode={state.profile.specialMode}
                primaryGoal={state.profile.primaryGoal}
                highlightedMealId={highlightedMealId}
                entryMode={scannerEntryMode}
                bmrKcal={anthro.bmrKcal}
                todayIntakeKcal={todayBalance.intakeKcal}
                totalExpenditureKcal={todayBalance.totalExpenditureKcal}
                subscription={state.subscription}
                onRecordVisionScan={() =>
                  commitState((prev) => ({
                    ...prev,
                    subscription: recordVisionScanUsage(prev.subscription, todayKey),
                  }))
                }
                onOpenSubscriptionModal={(reason) => {
                  setSubscriptionReasonFr(reason ?? null);
                  setSubscriptionOpen(true);
                }}
                onOpenBarcode={() => setBarcodeOpen(true)}
                onSaveMeal={(meal: MealEntry) => {
                  commitState((prev) => ({ ...prev, meals: [meal, ...prev.meals] }));
                  scrollViewportToTop({ smooth: true });
                }}
                onUpdateMeal={(updated: MealEntry) =>
                  commitState((prev) => ({
                    ...prev,
                    meals: prev.meals.map((m) => (m.id === updated.id ? updated : m)),
                  }))
                }
                onDeleteMeal={(mealId: string) =>
                  commitState((prev) => ({
                    ...prev,
                    meals: prev.meals.filter((m) => m.id !== mealId),
                  }))
                }
              />
            )}

            {activeTab === "fridge" && (
              <FridgeChefView
                remainingKcal={Math.max(250, todayBalance.remainingToTargetKcal)}
                rawRemainingKcal={todayBalance.remainingToTargetKcal}
                remainingProteinG={Math.max(20, anthro.targets.proteinG - todayBalance.macros.proteinG)}
                remainingFiberG={Math.max(5, anthro.targets.fiberG - todayBalance.macros.fiberG)}
                specialMode={state.profile.specialMode}
                primaryGoal={state.profile.primaryGoal}
                todayDateKey={todayKey}
                historyScans={state.fridgeScans}
                subscription={state.subscription}
                onRecordVisionScan={() =>
                  commitState((prev) => ({
                    ...prev,
                    subscription: recordVisionScanUsage(prev.subscription, todayKey),
                  }))
                }
                onOpenSubscriptionModal={(reason) => {
                  setSubscriptionReasonFr(reason ?? null);
                  setSubscriptionOpen(true);
                }}
                onSaveFridgeScan={(scan: FridgeScanSession) =>
                  commitState((prev) => ({
                    ...prev,
                    fridgeScans: [scan, ...prev.fridgeScans.slice(0, 9)],
                  }))
                }
                onLogRecipeAsMeal={(meal: MealEntry) => {
                  commitState((prev) => ({ ...prev, meals: [meal, ...prev.meals] }));
                  scrollViewportToTop({ smooth: true });
                }}
              />
            )}

            {activeTab === "fasting" && (
              <FastingView
                fasting={state.fasting}
                profile={state.profile}
                bmi={anthro.bmi}
                onUpdateFasting={(nextFasting: FastingConfig) =>
                  commitState((prev) => ({ ...prev, fasting: nextFasting }))
                }
              />
            )}

            {activeTab === "activity" && (
              <ActivityCoachView
                profile={state.profile}
                bmrKcal={anthro.bmrKcal}
                todayBalance={todayBalance}
                recentBalances={recentBalances}
                todayWorkouts={todayWorkouts}
                difficultDayDates={state.difficultDayDates}
                onUpdateSteps={updateTodaySteps}
                onUpdateStepGoal={(goal: number) => updateProfilePatch({ dailyStepGoal: goal })}
                onLogWorkout={(session: WorkoutSession) =>
                  commitState((prev) => ({
                    ...prev,
                    workouts: [session, ...prev.workouts],
                  }))
                }
                onActivateDifficultDay={(dateKey: string) =>
                  commitState((prev) => ({
                    ...prev,
                    difficultDayDates: prev.difficultDayDates.includes(dateKey)
                      ? prev.difficultDayDates
                      : [...prev.difficultDayDates, dateKey],
                  }))
                }
              />
            )}

            {activeTab === "profile" && (
              <ProfileChallengesView
                profile={state.profile}
                anthro={anthro}
                todayBalance={todayBalance}
                challenges={state.challenges}
                goalEvaluations={goalReconciliation?.evaluationsById}
                onOpenGoalsModal={() => setGoalsModalOpen(true)}
                theme={theme}
                onChangeTheme={setTheme}
                onReopenOnboarding={() => setShowOnboardingOverride(true)}
                onSaveProfile={(nextProfile: UserProfile) => updateProfilePatch(nextProfile)}
                onSavedReturnHome={(msg: string) => {
                  setActiveTab("dashboard");
                  notifySavedAndScrollHome(msg);
                }}
                onAddChallenge={(c: CustomChallenge) =>
                  commitState((prev) => ({ ...prev, challenges: [c, ...prev.challenges] }))
                }
                onToggleChallengeToday={toggleChallengeToday}
                onDeleteChallenge={(id: string) =>
                  commitState((prev) => ({
                    ...prev,
                    challenges: prev.challenges.filter((c) => c.id !== id),
                  }))
                }
                onStartFreshWithProfile={(nextProfile: UserProfile) => {
                  const fresh = buildFreshUserState({
                    ...nextProfile,
                    onboardingCompleted: true,
                  });
                  setState(fresh);
                  void saveVitalPulseState(fresh);
                  setActiveTab("dashboard");
                  scrollViewportToTop({ smooth: false });
                }}
                onResetDemo={() => {
                  const demo = buildDemoSeedState();
                  demo.profile.onboardingCompleted = true;
                  setState(demo);
                  void saveVitalPulseState(demo);
                  scrollViewportToTop({ smooth: false });
                }}
              />
            )}

            {activeTab === "bodylab" && (
              <BodyLabView
                profile={state.profile}
                todayDateKey={todayKey}
                weights={state.weights}
                measurements={state.measurements}
                bloodPanels={state.bloodPanels}
                bodyPhotoMetas={state.bodyPhotoMetas}
                initialSubTab={bodyLabSubTab}
                onSaveMeasurement={(entry: BodyMeasurementEntry) => {
                  commitState((prev) => {
                    const filtered = prev.measurements.filter((m) => m.id !== entry.id);
                    const nextMeasurements = [...filtered, entry].sort((a, b) =>
                      a.dateKey.localeCompare(b.dateKey)
                    );
                    const latest = nextMeasurements[nextMeasurements.length - 1];
                    const nextWeights =
                      typeof entry.weightKg === "number"
                        ? [
                            ...prev.weights,
                            {
                              id: `wt-m-${entry.id}`,
                              dateKey: entry.dateKey,
                              timestamp: entry.createdAt,
                              weightKg: entry.weightKg,
                              waistCm: entry.waistCm,
                            },
                          ]
                        : prev.weights;
                    return {
                      ...prev,
                      profile: {
                        ...prev.profile,
                        weightKg: latest?.weightKg ?? prev.profile.weightKg,
                        waistCm: latest?.waistCm ?? prev.profile.waistCm,
                      },
                      measurements: nextMeasurements,
                      weights: nextWeights,
                    };
                  });
                  scrollViewportToTop({ smooth: true });
                }}
                onDeleteMeasurement={(id: string) =>
                  commitState((prev) => ({
                    ...prev,
                    measurements: prev.measurements.filter((m) => m.id !== id),
                  }))
                }
                onSaveBloodPanel={(panel: BloodPanelEntry) => {
                  commitState((prev) => {
                    const filtered = prev.bloodPanels.filter((b) => b.id !== panel.id);
                    return {
                      ...prev,
                      bloodPanels: [...filtered, panel].sort((a, b) =>
                        a.dateKey.localeCompare(b.dateKey)
                      ),
                    };
                  });
                  scrollViewportToTop({ smooth: true });
                }}
                onDeleteBloodPanel={(id: string) =>
                  commitState((prev) => ({
                    ...prev,
                    bloodPanels: prev.bloodPanels.filter((b) => b.id !== id),
                  }))
                }
                onSaveBodyPhotoMeta={(meta: BodyPhotoMeta) =>
                  commitState((prev) => ({
                    ...prev,
                    bodyPhotoMetas: [
                      ...prev.bodyPhotoMetas.filter((p) => p.id !== meta.id),
                      meta,
                    ].sort((a, b) => a.dateKey.localeCompare(b.dateKey)),
                  }))
                }
                onDeleteBodyPhotoMeta={(id: string) => {
                  void deleteBodyPhotoDataUrl(id);
                  commitState((prev) => ({
                    ...prev,
                    bodyPhotoMetas: prev.bodyPhotoMetas.filter((p) => p.id !== id),
                  }));
                }}
              />
            )}

            {activeTab === "medical" && <MedicalHubView />}

            {activeTab === "fw_ai" && (
              <FwAiCoachView
                profile={state.profile}
                anthro={anthro}
                todayBalance={todayBalance}
                fasting={state.fasting}
                weightTrend={weightTrend}
                latestBloodPanel={latestBloodPanel}
                messages={state.fwAiMessages}
                subscription={state.subscription}
                todayKey={todayKey}
                onAppendMessages={(
                  userMsg,
                  assistantMsg,
                  incrementQuota,
                  webSearchUsed
                ) =>
                  commitState((prev) => {
                    let nextSub = incrementQuota
                      ? recordFwAiMessageUsage(prev.subscription, todayKey)
                      : prev.subscription;
                    if (webSearchUsed) {
                      nextSub = recordWebSearchUsage(nextSub, todayKey);
                    }
                    return {
                      ...prev,
                      fwAiMessages: [...prev.fwAiMessages, userMsg, assistantMsg].slice(-60),
                      subscription: nextSub,
                    };
                  })
                }
                onClearConversation={() =>
                  commitState((prev) => ({
                    ...prev,
                    fwAiMessages: prev.fwAiMessages.slice(0, 1),
                  }))
                }
                onOpenSubscriptionModal={(reason) => {
                  setSubscriptionReasonFr(reason ?? null);
                  setSubscriptionOpen(true);
                }}
              />
            )}
          </main>
        </div>

        {/* Dock flottant 5 slots Mobile (Accueil · Assiette · ＋ · Jeûne · Corps) */}
        <nav
          aria-label="Navigation principale"
          className="vp-glass-dock vp-safe-pb lg:hidden fixed bottom-2 inset-x-3 z-40 rounded-3xl grid grid-cols-5 items-center px-1.5 py-1.5"
        >
          <button
            type="button"
            onClick={() => {
              triggerLightHaptic();
              setActiveTab("dashboard");
            }}
            className={`flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-2xl text-[10px] font-semibold min-h-[44px] ${
              activeTab === "dashboard" ? "text-emerald-400" : "text-slate-400"
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Accueil</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerLightHaptic();
              setActiveTab("scanner");
            }}
            className={`flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-2xl text-[10px] font-semibold min-h-[44px] ${
              isPlateTab ? "text-emerald-400" : "text-slate-400"
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Assiette</span>
          </button>

          <button
            type="button"
            aria-label="Actions rapides"
            onClick={() => {
              triggerLightHaptic();
              setQuickActionsOpen(true);
            }}
            className="mx-auto -mt-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/35 ring-4 ring-[var(--vp-bg)] active:scale-95 transition"
          >
            <Plus className="h-6 w-6 stroke-[2.6]" />
          </button>

          <button
            type="button"
            onClick={() => {
              triggerLightHaptic();
              setActiveTab("fasting");
            }}
            className={`flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-2xl text-[10px] font-semibold min-h-[44px] ${
              activeTab === "fasting" ? "text-amber-300" : "text-slate-400"
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Jeûne</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerLightHaptic();
              setActiveTab("bodylab");
            }}
            className={`flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-2xl text-[10px] font-semibold min-h-[44px] ${
              activeTab === "bodylab" ? "text-emerald-400" : "text-slate-400"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Corps</span>
          </button>
        </nav>

        {/* Modales globales v3 */}
        <QuickActionSheet
          open={quickActionsOpen}
          onClose={() => setQuickActionsOpen(false)}
          onScanMeal={() => {
            setScannerEntryMode("photo");
            setActiveTab("scanner");
          }}
          onWriteMeal={() => {
            setScannerEntryMode("text");
            setActiveTab("scanner");
          }}
          onScanBarcode={() => setBarcodeOpen(true)}
          onOpenFridge={() => setActiveTab("fridge")}
          onOpenFasting={() => setActiveTab("fasting")}
          onAddWater250={() => addWaterMl(250)}
          onOpenWearables={() => setWearablesOpen(true)}
          onOpenGoals={() => setGoalsModalOpen(true)}
          onOpenFwAi={() => setActiveTab("fw_ai")}
          onOpenActivity={() => setActiveTab("activity")}
          onOpenMedical={() => setActiveTab("medical")}
          onOpenGlossary={() => openGlossaryCatalog()}
          waterTodayMl={todayBalance.waterMl}
        />

        <GoalsManagerModal
          open={goalsModalOpen}
          onClose={() => setGoalsModalOpen(false)}
          profile={state.profile}
          anthro={anthro}
          challenges={state.challenges}
          evaluationsById={goalReconciliation?.evaluationsById ?? {}}
          onAddGoal={(goal) =>
            commitState((prev) => ({ ...prev, challenges: [goal, ...prev.challenges] }))
          }
          onToggleGoalToday={toggleChallengeToday}
          onToggleGoalNotification={toggleChallengeNotification}
          onDeleteGoal={(id) =>
            commitState((prev) => ({
              ...prev,
              challenges: prev.challenges.filter((c) => c.id !== id),
            }))
          }
          onPreviewCelebration={(ev) => setGoalCelebrationBanner(ev)}
        />

        <BarcodeScannerModal
          open={barcodeOpen}
          onClose={() => setBarcodeOpen(false)}
          dateKey={todayKey}
          subscription={state.subscription}
          onOpenSubscriptionModal={(reason) => {
            setSubscriptionReasonFr(reason ?? null);
            setSubscriptionOpen(true);
          }}
          onAddMeal={(meal) =>
            commitState((prev) => ({ ...prev, meals: [meal, ...prev.meals] }))
          }
        />

        <WearablesSyncSheet
          open={wearablesOpen}
          onClose={() => setWearablesOpen(false)}
          wearable={state.wearable}
          onApplySync={(patch) =>
            commitState((prev) => {
              let nextSteps = prev.steps;
              if (
                typeof patch.stepsToday === "number" &&
                Number.isFinite(patch.stepsToday) &&
                patch.stepsToday >= 0
              ) {
                const safeSteps = Math.max(0, Math.min(100000, Math.round(patch.stepsToday)));
                const exists = prev.steps.some((s) => s.dateKey === todayKey);
                nextSteps = exists
                  ? prev.steps.map((s) =>
                      s.dateKey === todayKey
                        ? {
                            ...s,
                            steps: safeSteps,
                            source: "health_connect",
                            updatedAt: new Date().toISOString(),
                          }
                        : s
                    )
                  : [
                      ...prev.steps,
                      {
                        dateKey: todayKey,
                        steps: safeSteps,
                        source: "health_connect",
                        updatedAt: new Date().toISOString(),
                      },
                    ];
              }
              const validWeight =
                typeof patch.weightKg === "number" &&
                Number.isFinite(patch.weightKg) &&
                patch.weightKg >= 30 &&
                patch.weightKg <= 250
                  ? +patch.weightKg.toFixed(2)
                  : undefined;
              return {
                ...prev,
                wearable: patch.wearable,
                steps: nextSteps,
                profile:
                  validWeight !== undefined
                    ? { ...prev.profile, weightKg: validWeight }
                    : prev.profile,
              };
            })
          }
        />

        <SubscriptionModal
          open={subscriptionOpen}
          onClose={() => setSubscriptionOpen(false)}
          subscription={state.subscription}
          todayKey={todayKey}
          triggerReasonFr={subscriptionReasonFr}
          onActivateTrial={() =>
            commitState((prev) => ({
              ...prev,
              subscription: startSevenDayFreeTrial(prev.subscription, todayKey),
            }))
          }
          onSelectPlanPreview={(tier: SubscriptionTier) =>
            commitState((prev) => ({
              ...prev,
              subscription: activatePlanTier(prev.subscription, tier, todayKey),
            }))
          }
          onUpdateSubscription={(nextSub) =>
            commitState((prev) => ({
              ...prev,
              subscription: nextSub,
            }))
          }
        />

        <GlossaryPortalHost />
      </div>
    </MotionConfig>
  );
}

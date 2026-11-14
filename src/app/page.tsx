"use client";

import React, { useEffect, useMemo, useState } from "react";
import { MotionConfig } from "framer-motion";
import {
  Activity,
  BookOpen,
  Camera,
  ChefHat,
  Clock,
  Download,
  Footprints,
  LayoutDashboard,
  Moon,
  Plus,
  Ruler,
  ScanBarcode,
  Sparkles,
  Sun,
  UserCheck,
  Watch,
} from "lucide-react";
import {
  computeAnthropometrics,
  computeDailyEnergyBalance,
  computeWeightTrendAndScaleDecoder,
} from "@/lib/metabolic-engine";
import {
  buildFreshUserState,
  deleteBodyPhotoDataUrl,
  formatDateKey,
  getRecentDateKeys,
  loadVitalPulseState,
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
  scheduleServiceWorkerFastingAlert,
  sendFastingTransitionAlert,
  triggerLightHaptic,
} from "@/lib/native-bridge";
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
  const [bodyLabSubTab, setBodyLabSubTab] = useState<BodyLabSubTab>("measurements");
  const [rangeDays, setRangeDays] = useState<7 | 14 | 30>(7);
  const [highlightedMealId, setHighlightedMealId] = useState<string | null>(null);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [showOnboardingOverride, setShowOnboardingOverride] = useState(false);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [barcodeOpen, setBarcodeOpen] = useState(false);
  const [wearablesOpen, setWearablesOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    void loadVitalPulseState().then((loaded) => {
      if (mounted) setState(loaded);
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
  }, []);

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

  if (!state || !anthro || !todayBalance) {
    return (
      <div className="min-h-screen bg-[var(--vp-bg)] flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3 text-slate-300">
          <Activity className="w-8 h-8 text-emerald-400 animate-pulse" />
          <p className="text-sm font-medium">Chargement de VitalPulse...</p>
        </div>
      </div>
    );
  }

  const mealsWithPhotos = [...state.meals]
    .filter((m) => Boolean(m.photoDataUrl))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const todayWorkouts = state.workouts.filter((w) => w.dateKey === todayKey);

  function addWaterMl(ml: number) {
    commitState((prev) => {
      const exists = prev.waters.find((w) => w.dateKey === todayKey);
      const nextWaters = exists
        ? prev.waters.map((w) =>
            w.dateKey === todayKey ? { ...w, milliliters: w.milliliters + ml } : w
          )
        : [...prev.waters, { dateKey: todayKey, milliliters: ml }];
      return { ...prev, waters: nextWaters };
    });
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
  }

  const showOnboardingWizard =
    !state.profile.onboardingCompleted || showOnboardingOverride;

  const isPlateTab = activeTab === "scanner" || activeTab === "fridge";

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-[var(--vp-bg)] text-[var(--vp-text)] vp-main-pb lg:flex">
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
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h1 className="font-display text-base font-extrabold text-white leading-tight">
                    VitalPulse
                  </h1>
                  <span className="text-[11px] text-emerald-400">Web &amp; Android v3</span>
                </div>
              </div>
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
                  setWearablesOpen(true);
                }}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-500/25 bg-slate-500/10 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-cyan-400/40"
              >
                <Watch className="h-4 w-4 text-cyan-300" />
                Montre &amp; Capteurs
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
          <header className="lg:hidden sticky top-0 z-30 bg-[var(--vp-surface-glass)] backdrop-blur-md border-b border-slate-500/15 px-3.5 py-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-400" />
              <span className="font-display font-extrabold text-white text-base">VitalPulse</span>
            </div>

            <div className="flex items-center gap-1.5">
              {installPrompt && (
                <button
                  type="button"
                  onClick={() => void installPrompt.prompt()}
                  className="inline-flex items-center gap-1 px-2 py-1.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-[11px]"
                >
                  <Download className="w-3 h-3" />
                  PWA
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
                  setActiveTab("activity");
                }}
                aria-label="Bouger & Exercices"
                className={`flex h-8 w-8 items-center justify-center rounded-xl border ${
                  activeTab === "activity"
                    ? "border-emerald-400 bg-emerald-500/20 text-emerald-300"
                    : "border-slate-500/25 bg-slate-500/10 text-slate-300"
                }`}
              >
                <Footprints className="h-4 w-4" />
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
                  setActiveTab("medical");
                }}
                aria-label="Veille Médicale"
                className={`flex h-8 w-8 items-center justify-center rounded-xl border ${
                  activeTab === "medical"
                    ? "border-emerald-400 bg-emerald-500/20 text-emerald-300"
                    : "border-slate-500/25 bg-slate-500/10 text-slate-300"
                }`}
              >
                <BookOpen className="h-4 w-4" />
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
              <div className="grid grid-cols-3 gap-1.5 rounded-2xl border border-slate-500/20 bg-slate-500/10 p-1 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setActiveTab("scanner")}
                  className={`rounded-xl py-2 transition ${
                    activeTab === "scanner"
                      ? "bg-emerald-500 text-slate-950"
                      : "text-slate-300"
                  }`}
                >
                  Photo Plat
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("fridge")}
                  className={`rounded-xl py-2 transition ${
                    activeTab === "fridge"
                      ? "bg-emerald-500 text-slate-950"
                      : "text-slate-300"
                  }`}
                >
                  Photo Frigo
                </button>
                <button
                  type="button"
                  onClick={() => setBarcodeOpen(true)}
                  className="inline-flex items-center justify-center gap-1 rounded-xl py-2 text-amber-300 hover:bg-amber-500/15"
                >
                  <ScanBarcode className="h-3.5 w-3.5" />
                  EAN
                </button>
              </div>
            </div>
          )}

          <main className="max-w-6xl mx-auto p-4 sm:p-6">
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
                onQuickLogWeight={(weightKg, waistCm) =>
                  commitState((prev) => ({
                    ...prev,
                    profile: {
                      ...prev.profile,
                      weightKg,
                      waistCm: waistCm ?? prev.profile.waistCm,
                    },
                    weights: [
                      ...prev.weights,
                      {
                        id: `wt-${Date.now()}`,
                        dateKey: todayKey,
                        timestamp: new Date().toISOString(),
                        weightKg,
                        waistCm,
                      },
                    ],
                  }))
                }
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
              />
            )}

            {activeTab === "scanner" && (
              <MealScannerView
                meals={state.meals}
                todayDateKey={todayKey}
                specialMode={state.profile.specialMode}
                highlightedMealId={highlightedMealId}
                onOpenBarcode={() => setBarcodeOpen(true)}
                onSaveMeal={(meal: MealEntry) =>
                  commitState((prev) => ({ ...prev, meals: [meal, ...prev.meals] }))
                }
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
                remainingProteinG={Math.max(20, anthro.targets.proteinG - todayBalance.macros.proteinG)}
                remainingFiberG={Math.max(5, anthro.targets.fiberG - todayBalance.macros.fiberG)}
                specialMode={state.profile.specialMode}
                todayDateKey={todayKey}
                historyScans={state.fridgeScans}
                onSaveFridgeScan={(scan: FridgeScanSession) =>
                  commitState((prev) => ({
                    ...prev,
                    fridgeScans: [scan, ...prev.fridgeScans.slice(0, 9)],
                  }))
                }
                onLogRecipeAsMeal={(meal: MealEntry) =>
                  commitState((prev) => ({ ...prev, meals: [meal, ...prev.meals] }))
                }
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
                onUpdateSteps={(steps: number, source: StepSource) =>
                  commitState((prev) => {
                    const exists = prev.steps.some((s) => s.dateKey === todayKey);
                    const nextSteps = exists
                      ? prev.steps.map((s) =>
                          s.dateKey === todayKey
                            ? { ...s, steps, source, updatedAt: new Date().toISOString() }
                            : s
                        )
                      : [
                          ...prev.steps,
                          { dateKey: todayKey, steps, source, updatedAt: new Date().toISOString() },
                        ];
                    return { ...prev, steps: nextSteps };
                  })
                }
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
                onReopenOnboarding={() => setShowOnboardingOverride(true)}
                onSaveProfile={(nextProfile: UserProfile) =>
                  commitState((prev) => ({ ...prev, profile: nextProfile }))
                }
                onAddChallenge={(c: CustomChallenge) =>
                  commitState((prev) => ({ ...prev, challenges: [c, ...prev.challenges] }))
                }
                onToggleChallengeToday={(id: string) =>
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
                  }))
                }
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
                }}
                onResetDemo={() => {
                  const demo = buildDemoSeedState();
                  demo.profile.onboardingCompleted = true;
                  setState(demo);
                  void saveVitalPulseState(demo);
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
                onSaveMeasurement={(entry: BodyMeasurementEntry) =>
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
                  })
                }
                onDeleteMeasurement={(id: string) =>
                  commitState((prev) => ({
                    ...prev,
                    measurements: prev.measurements.filter((m) => m.id !== id),
                  }))
                }
                onSaveBloodPanel={(panel: BloodPanelEntry) =>
                  commitState((prev) => {
                    const filtered = prev.bloodPanels.filter((b) => b.id !== panel.id);
                    return {
                      ...prev,
                      bloodPanels: [...filtered, panel].sort((a, b) =>
                        a.dateKey.localeCompare(b.dateKey)
                      ),
                    };
                  })
                }
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
          onScanMeal={() => setActiveTab("scanner")}
          onScanBarcode={() => setBarcodeOpen(true)}
          onOpenFridge={() => setActiveTab("fridge")}
          onOpenFasting={() => setActiveTab("fasting")}
          onAddWater250={() => addWaterMl(250)}
          onOpenWearables={() => setWearablesOpen(true)}
          waterTodayMl={todayBalance.waterMl}
        />

        <BarcodeScannerModal
          open={barcodeOpen}
          onClose={() => setBarcodeOpen(false)}
          dateKey={todayKey}
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
              if (typeof patch.stepsToday === "number") {
                const exists = prev.steps.some((s) => s.dateKey === todayKey);
                nextSteps = exists
                  ? prev.steps.map((s) =>
                      s.dateKey === todayKey
                        ? {
                            ...s,
                            steps: patch.stepsToday!,
                            source: "health_connect",
                            updatedAt: new Date().toISOString(),
                          }
                        : s
                    )
                  : [
                      ...prev.steps,
                      {
                        dateKey: todayKey,
                        steps: patch.stepsToday!,
                        source: "health_connect",
                        updatedAt: new Date().toISOString(),
                      },
                    ];
              }
              return {
                ...prev,
                wearable: patch.wearable,
                steps: nextSteps,
                profile:
                  typeof patch.weightKg === "number"
                    ? { ...prev.profile, weightKg: patch.weightKg }
                    : prev.profile,
              };
            })
          }
        />
      </div>
    </MotionConfig>
  );
}

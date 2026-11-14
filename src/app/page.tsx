"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BookOpen,
  Camera,
  ChefHat,
  Download,
  Footprints,
  LayoutDashboard,
  Ruler,
  UserCheck,
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
import { DashboardView } from "@/components/DashboardView";
import { MealScannerView } from "@/components/MealScannerView";
import { FridgeChefView } from "@/components/FridgeChefView";
import { ActivityCoachView } from "@/components/ActivityCoachView";
import { BodyLabSubTab, BodyLabView } from "@/components/BodyLabView";
import { ProfileChallengesView } from "@/components/ProfileChallengesView";
import { MedicalHubView } from "@/components/MedicalHubView";
import {
  BloodPanelEntry,
  BodyMeasurementEntry,
  BodyPhotoMeta,
  CustomChallenge,
  FridgeScanSession,
  MealEntry,
  StepSource,
  UserProfile,
  WorkoutSession,
} from "@/types/vitalpulse";

type TabId = "dashboard" | "scanner" | "fridge" | "activity" | "bodylab" | "profile" | "medical";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const TABS: { id: TabId; label: string; shortLabel: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "dashboard", label: "Dashboard", shortLabel: "Accueil", icon: LayoutDashboard },
  { id: "scanner", label: "Scanner Plat", shortLabel: "Plat", icon: Camera },
  { id: "fridge", label: "Frigo & Recettes", shortLabel: "Frigo", icon: ChefHat },
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

  useEffect(() => {
    let mounted = true;
    void loadVitalPulseState().then((loaded) => {
      if (mounted) setState(loaded);
    });

    if (typeof window !== "undefined") {
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

  if (!state || !anthro || !todayBalance) {
    return (
      <div className="min-h-screen bg-[#0B1215] flex items-center justify-center p-6">
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

  return (
    <div className="min-h-screen bg-[#0B1215] text-slate-100 pb-24 lg:pb-8 lg:flex">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 border-r border-slate-800/80 bg-[#080E11] p-4 justify-between sticky top-0 h-screen">
        <div className="space-y-6">
          <div className="flex items-center gap-2.5 px-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center">
              <Activity className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white leading-tight">VitalPulse</h1>
              <span className="text-[11px] text-emerald-300">Web PWA &amp; Android</span>
            </div>
          </div>

          <nav className="space-y-1">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                    active
                      ? "bg-emerald-500 text-slate-950 font-semibold"
                      : "text-slate-300 hover:bg-slate-900 hover:text-white"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3 text-xs space-y-2">
          <div className="flex justify-between text-slate-300">
            <span>{state.profile.name}</span>
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
        {/* Topbar Mobile */}
        <header className="lg:hidden sticky top-0 z-30 bg-[#0B1215]/95 backdrop-blur border-b border-slate-800/80 px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            <span className="font-bold text-white text-base">VitalPulse</span>
          </div>
          <div className="flex items-center gap-2">
            {installPrompt && (
              <button
                type="button"
                onClick={() => void installPrompt.prompt()}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs"
              >
                <Download className="w-3.5 h-3.5" />
                Installer
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveTab("medical")}
              aria-label="Veille Médicale"
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-medium transition ${
                activeTab === "medical"
                  ? "bg-emerald-500/20 border-emerald-400 text-emerald-300"
                  : "bg-slate-900 border-slate-700 text-slate-300"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Science
            </button>
            <span className="text-xs px-2.5 py-1 rounded-full bg-slate-900 border border-slate-700 text-emerald-300 font-semibold tabular-nums">
              {todayBalance.netBalanceKcal > 0
                ? `+${todayBalance.netBalanceKcal}`
                : todayBalance.netBalanceKcal}{" "}
              kcal
            </span>
          </div>
        </header>

        <main className="max-w-6xl mx-auto p-4 sm:p-6">
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
              onAddWater={(ml) =>
                commitState((prev) => {
                  const exists = prev.waters.find((w) => w.dateKey === todayKey);
                  const nextWaters = exists
                    ? prev.waters.map((w) =>
                        w.dateKey === todayKey ? { ...w, milliliters: w.milliliters + ml } : w
                      )
                    : [...prev.waters, { dateKey: todayKey, milliliters: ml }];
                  return { ...prev, waters: nextWaters };
                })
              }
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
              onSwitchToRealProfile={() => {
                setActiveTab("profile");
              }}
              latestMeasurement={latestMeasurement}
              latestBloodPanel={latestBloodPanel}
              photosCount={state.bodyPhotoMetas.length}
            />
          )}

          {activeTab === "scanner" && (
            <MealScannerView
              meals={state.meals}
              todayDateKey={todayKey}
              specialMode={state.profile.specialMode}
              highlightedMealId={highlightedMealId}
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
                const fresh = buildFreshUserState(nextProfile);
                setState(fresh);
                void saveVitalPulseState(fresh);
                setActiveTab("dashboard");
              }}
              onResetDemo={() => {
                const demo = buildDemoSeedState();
                setState(demo);
                void saveVitalPulseState(demo);
              }}
            />
          )}

          {activeTab === "bodylab" && (
            <BodyLabView
              key={bodyLabSubTab}
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
                  bodyPhotoMetas: [...prev.bodyPhotoMetas.filter((p) => p.id !== meta.id), meta].sort(
                    (a, b) => a.dateKey.localeCompare(b.dateKey)
                  ),
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

      {/* Bottom Tab Navigation Mobile */}
      <nav
        aria-label="Navigation principale mobile"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-[#080E11]/95 backdrop-blur border-t border-slate-800 grid grid-cols-6 px-1 py-1.5"
      >
        {TABS.filter((t) => t.id !== "medical").map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-xl text-[10px] font-medium min-h-[44px] ${
                active ? "text-emerald-400 bg-emerald-500/10" : "text-slate-400"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="truncate max-w-full px-0.5">{t.shortLabel}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

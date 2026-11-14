import {
  CustomChallenge,
  DailyStepLog,
  FridgeScanSession,
  MealEntry,
  UserProfile,
  WaterLog,
  WeightEntry,
  WorkoutSession,
} from "@/types/vitalpulse";
import { buildDemoSeedState } from "@/data/demo-seed";

export interface VitalPulseState {
  version: number;
  profile: UserProfile;
  meals: MealEntry[];
  fridgeScans: FridgeScanSession[];
  steps: DailyStepLog[];
  workouts: WorkoutSession[];
  weights: WeightEntry[];
  waters: WaterLog[];
  challenges: CustomChallenge[];
  difficultDayDates: string[];
  pushEndpoint?: string;
}

const DB_NAME = "vitalpulse_idb";
const DB_VERSION = 1;
const STORE_NAME = "app_state";
const STATE_KEY = "primary_state";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function loadVitalPulseState(): Promise<VitalPulseState> {
  if (typeof window === "undefined" || typeof indexedDB === "undefined") {
    return buildDemoSeedState();
  }
  try {
    const db = await openDb();
    const existing = await new Promise<VitalPulseState | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(STATE_KEY);
      req.onsuccess = () => resolve(req.result as VitalPulseState | undefined);
      req.onerror = () => reject(req.error);
    });
    if (existing && existing.profile) {
      return existing;
    }
    const seeded = buildDemoSeedState();
    await saveVitalPulseState(seeded);
    return seeded;
  } catch {
    return buildDemoSeedState();
  }
}

export async function saveVitalPulseState(state: VitalPulseState): Promise<void> {
  if (typeof window === "undefined" || typeof indexedDB === "undefined") return;
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(state, STATE_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("IndexedDB save warning:", err);
  }
}

export function formatDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getRecentDateKeys(days: number, endDate: Date = new Date()): string[] {
  const keys: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(endDate);
    d.setDate(d.getDate() - i);
    keys.push(formatDateKey(d));
  }
  return keys;
}

export function buildFreshUserState(profile: UserProfile): VitalPulseState {
  const todayKey = formatDateKey();
  return {
    version: 1,
    profile: { ...profile, isDemoProfile: false },
    meals: [],
    fridgeScans: [],
    steps: [{ dateKey: todayKey, steps: 0, source: "manual", updatedAt: new Date().toISOString() }],
    workouts: [],
    weights: [
      {
        id: `w-init-${todayKey}`,
        dateKey: todayKey,
        timestamp: new Date().toISOString(),
        weightKg: profile.weightKg,
        waistCm: profile.waistCm,
        note: "Mesure initiale de départ",
      },
    ],
    waters: [{ dateKey: todayKey, milliliters: 0 }],
    challenges: [
      {
        id: "chal-steps-8000",
        title: "Cap des 8 000 pas / jour",
        description: "Marche cumulée quotidienne (hors double comptage)",
        metric: "steps",
        targetValue: profile.dailyStepGoal || 8000,
        unit: "pas",
        durationDays: 14,
        reminderTime: "18:00",
        active: true,
        completedDates: [],
        createdAt: new Date().toISOString(),
      },
      {
        id: "chal-protein-guard",
        title: "Bouclier Protéines & Satiété",
        description: "Préserver la masse musculaire et éviter les fringales",
        metric: "protein",
        targetValue: Math.round(profile.weightKg * 1.6),
        unit: "g",
        durationDays: 14,
        reminderTime: "19:30",
        active: true,
        completedDates: [],
        createdAt: new Date().toISOString(),
      },
    ],
    difficultDayDates: [],
  };
}

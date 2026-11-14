import {
  BloodPanelEntry,
  BodyMeasurementEntry,
  BodyPhotoMeta,
  CustomChallenge,
  DailyStepLog,
  FridgeScanSession,
  MealEntry,
  UserProfile,
  WaterLog,
  WeightEntry,
  WorkoutSession,
} from "@/types/vitalpulse";
import { buildDemoSeedState, DEMO_BODY_PHOTOS } from "@/data/demo-seed";

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
  measurements: BodyMeasurementEntry[];
  bloodPanels: BloodPanelEntry[];
  bodyPhotoMetas: BodyPhotoMeta[];
  pushEndpoint?: string;
}

const DB_NAME = "vitalpulse_idb";
const DB_VERSION = 2;
const STORE_NAME = "app_state";
const PHOTO_STORE_NAME = "body_photos";
const STATE_KEY = "primary_state";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
      if (!db.objectStoreNames.contains(PHOTO_STORE_NAME)) {
        db.createObjectStore(PHOTO_STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Migration pure et idempotente v1 -> v2 (Codex) :
 * conserve toutes les données existantes et initialise mensurations, bilans et métadonnées photo.
 */
export function migrateVitalPulseState(raw: Partial<VitalPulseState>): VitalPulseState {
  const existingWeights = Array.isArray(raw.weights) ? raw.weights : [];
  const migratedMeasurements: BodyMeasurementEntry[] = Array.isArray(raw.measurements)
    ? raw.measurements
    : existingWeights
        .filter((w) => typeof w.waistCm === "number" || typeof w.weightKg === "number")
        .map((w) => ({
          id: `bm-mig-${w.id}`,
          dateKey: w.dateKey,
          createdAt: w.timestamp || new Date().toISOString(),
          weightKg: w.weightKg,
          waistCm: w.waistCm,
          note: w.note,
        }));

  return {
    version: 2,
    profile: raw.profile as UserProfile,
    meals: Array.isArray(raw.meals) ? raw.meals : [],
    fridgeScans: Array.isArray(raw.fridgeScans) ? raw.fridgeScans : [],
    steps: Array.isArray(raw.steps) ? raw.steps : [],
    workouts: Array.isArray(raw.workouts) ? raw.workouts : [],
    weights: existingWeights,
    waters: Array.isArray(raw.waters) ? raw.waters : [],
    challenges: Array.isArray(raw.challenges) ? raw.challenges : [],
    difficultDayDates: Array.isArray(raw.difficultDayDates) ? raw.difficultDayDates : [],
    measurements: migratedMeasurements,
    bloodPanels: Array.isArray(raw.bloodPanels) ? raw.bloodPanels : [],
    bodyPhotoMetas: Array.isArray(raw.bodyPhotoMetas) ? raw.bodyPhotoMetas : [],
    pushEndpoint: raw.pushEndpoint,
  };
}

export async function loadVitalPulseState(): Promise<VitalPulseState> {
  if (typeof window === "undefined" || typeof indexedDB === "undefined") {
    return buildDemoSeedState();
  }
  try {
    const db = await openDb();
    const existing = await new Promise<Partial<VitalPulseState> | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(STATE_KEY);
      req.onsuccess = () => resolve(req.result as Partial<VitalPulseState> | undefined);
      req.onerror = () => reject(req.error);
    });
    if (existing && existing.profile) {
      const migrated = migrateVitalPulseState(existing);
      if ((existing.version ?? 1) < 2) {
        await saveVitalPulseState(migrated);
      }
      return migrated;
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
      store.put({ ...state, version: 2 }, STATE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("IndexedDB save warning:", err);
  }
}

/**
 * Stockage 100 % local des photos d'évolution corporelle (jamais transmises au serveur).
 */
export async function saveBodyPhotoDataUrl(photoId: string, dataUrl: string): Promise<void> {
  if (typeof window === "undefined" || typeof indexedDB === "undefined") return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(PHOTO_STORE_NAME, "readwrite");
    tx.objectStore(PHOTO_STORE_NAME).put(dataUrl, photoId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadBodyPhotoDataUrl(photoId: string): Promise<string | null> {
  if (typeof window === "undefined" || typeof indexedDB === "undefined") {
    return DEMO_BODY_PHOTOS[photoId] ?? null;
  }
  try {
    const db = await openDb();
    const stored = await new Promise<string | undefined>((resolve, reject) => {
      const tx = db.transaction(PHOTO_STORE_NAME, "readonly");
      const req = tx.objectStore(PHOTO_STORE_NAME).get(photoId);
      req.onsuccess = () => resolve(req.result as string | undefined);
      req.onerror = () => reject(req.error);
    });
    if (stored) return stored;
    return DEMO_BODY_PHOTOS[photoId] ?? null;
  } catch {
    return DEMO_BODY_PHOTOS[photoId] ?? null;
  }
}

export async function deleteBodyPhotoDataUrl(photoId: string): Promise<void> {
  if (typeof window === "undefined" || typeof indexedDB === "undefined") return;
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(PHOTO_STORE_NAME, "readwrite");
      tx.objectStore(PHOTO_STORE_NAME).delete(photoId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // noop
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
    version: 2,
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
    measurements: [
      {
        id: `bm-init-${todayKey}`,
        dateKey: todayKey,
        createdAt: new Date().toISOString(),
        weightKg: profile.weightKg,
        waistCm: profile.waistCm,
        note: "Mesure initiale de départ",
      },
    ],
    bloodPanels: [],
    bodyPhotoMetas: [],
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

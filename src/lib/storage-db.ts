import {
  ActivityProfile,
  AthleticLevel,
  BloodPanelEntry,
  BodyMeasurementEntry,
  BodyPhotoMeta,
  CustomChallenge,
  DailyStepLog,
  DashboardWidgetId,
  FastingConfig,
  FridgeScanSession,
  FwAiMessage,
  MealEntry,
  PrimaryGoal,
  SpecialMode,
  SportDisciplineId,
  SubscriptionState,
  UserProfile,
  WaterLog,
  WearableSyncState,
  WeightEntry,
  WorkoutSession,
} from "@/types/vitalpulse";
import { buildDemoSeedState, DEMO_BODY_PHOTOS } from "@/data/demo-seed";
import { SPORT_DISCIPLINES_CATALOG } from "@/data/exercises-compendium";
import { createDefaultSubscriptionState, normalizeSubscriptionForToday } from "@/lib/billing-bridge";
import { getProtocolSpec } from "@/lib/fasting-engine";
import {
  computeAgeFromBirthDate,
  computeAnthropometrics,
  isValidBirthDateIso,
} from "@/lib/metabolic-engine";

export const CURRENT_STATE_VERSION = 5;

const VALID_ACTIVITY_PROFILES = new Set<ActivityProfile>([
  "sedentary",
  "lightly_active",
  "active",
  "very_active",
]);
const VALID_ATHLETIC_LEVELS = new Set<AthleticLevel>([
  "beginner",
  "recreational",
  "intermediate",
  "athlete",
]);
const VALID_PRIMARY_GOALS = new Set<PrimaryGoal>([
  "fat_loss",
  "rebalancing",
  "recomposition",
  "maintenance",
  "muscle_gain",
  "athletic_performance",
]);
const VALID_SPECIAL_MODES = new Set<SpecialMode>([
  "standard",
  "rebalancing",
  "ketogenic",
  "high_protein_athlete",
  "glp1_muscle_guard",
  "glycemic_shield",
  "cardio_low_sodium",
]);
const VALID_SPORT_IDS = new Set<SportDisciplineId>(
  SPORT_DISCIPLINES_CATALOG.map((s) => s.id)
);

function clampNum(val: unknown, min: number, max: number, fallback: number, decimals = 0): number {
  const num = typeof val === "number" ? val : Number(val);
  if (!Number.isFinite(num)) return fallback;
  const clamped = Math.max(min, Math.min(max, num));
  return decimals > 0 ? +clamped.toFixed(decimals) : Math.round(clamped);
}

/**
 * Normalise et sécurise les paramètres biométriques et objectifs utilisateur (QC v5).
 */
export function sanitizeUserProfile(raw?: Partial<UserProfile>): UserProfile {
  const activityProfile: ActivityProfile =
    raw?.activityProfile && VALID_ACTIVITY_PROFILES.has(raw.activityProfile)
      ? raw.activityProfile
      : "lightly_active";
  const primaryGoal: PrimaryGoal =
    raw?.primaryGoal && VALID_PRIMARY_GOALS.has(raw.primaryGoal)
      ? raw.primaryGoal
      : "fat_loss";
  const specialMode: SpecialMode =
    raw?.specialMode && VALID_SPECIAL_MODES.has(raw.specialMode)
      ? raw.specialMode
      : "standard";
  const athleticLevel: AthleticLevel | undefined =
    raw?.athleticLevel && VALID_ATHLETIC_LEVELS.has(raw.athleticLevel)
      ? raw.athleticLevel
      : undefined;
  const favoriteSports: SportDisciplineId[] | undefined = Array.isArray(raw?.favoriteSports)
    ? Array.from(
        new Set(
          raw.favoriteSports.filter((s): s is SportDisciplineId => VALID_SPORT_IDS.has(s))
        )
      ).slice(0, 10)
    : undefined;

  const validBirthDate = isValidBirthDateIso(raw?.birthDate)
    ? raw!.birthDate!.trim()
    : undefined;
  const computedBirthAge = validBirthDate
    ? computeAgeFromBirthDate(validBirthDate)
    : null;

  const base: UserProfile = {
    name: typeof raw?.name === "string" && raw.name.trim() ? raw.name.trim() : "Mon profil",
    age: clampNum(computedBirthAge ?? raw?.age, 12, 105, 34),
    ...(validBirthDate ? { birthDate: validBirthDate } : {}),
    sex: raw?.sex === "female" ? "female" : "male",
    heightCm: clampNum(raw?.heightCm, 120, 230, 175),
    weightKg: clampNum(raw?.weightKg, 30, 250, 78, 1),
    targetWeightKg: clampNum(raw?.targetWeightKg, 35, 250, 72, 1),
    activityProfile,
    ...(athleticLevel ? { athleticLevel } : {}),
    ...(favoriteSports && favoriteSports.length > 0 ? { favoriteSports } : {}),
    primaryGoal,
    weeklyPaceKg: clampNum(raw?.weeklyPaceKg, -1.0, 0.5, -0.4, 2),
    dailyStepGoal: clampNum(raw?.dailyStepGoal, 1500, 30000, 8000),
    specialMode,
    quietHours:
      raw?.quietHours && typeof raw.quietHours.start === "string" && typeof raw.quietHours.end === "string"
        ? raw.quietHours
        : { start: "22:30", end: "07:00" },
    ...(typeof raw?.isDemoProfile === "boolean" ? { isDemoProfile: raw.isDemoProfile } : {}),
    ...(typeof raw?.onboardingCompleted === "boolean"
      ? { onboardingCompleted: raw.onboardingCompleted }
      : {}),
    ...(raw?.preferredFasting ? { preferredFasting: raw.preferredFasting } : {}),
  };

  if (raw?.waistCm !== undefined && Number.isFinite(Number(raw.waistCm))) {
    const w = Number(raw.waistCm);
    if (w >= 42 && w <= 190) {
      base.waistCm = +w.toFixed(1);
    }
  }

  if (raw?.dailyWaterGoalMl !== undefined && Number.isFinite(Number(raw.dailyWaterGoalMl))) {
    const waterGoal = Math.round(Number(raw.dailyWaterGoalMl));
    // Toute ancienne cible aberrante (ex. 8000 mL) revient automatiquement en calcul EFSA sûr
    if (waterGoal >= 1000 && waterGoal <= 4500) {
      base.dailyWaterGoalMl = waterGoal;
    }
  }

  if (
    raw?.dailyCalorieGoalOverride !== undefined &&
    Number.isFinite(Number(raw.dailyCalorieGoalOverride))
  ) {
    const calGoal = Math.round(Number(raw.dailyCalorieGoalOverride));
    if (calGoal >= 1200 && calGoal <= 5500) {
      base.dailyCalorieGoalOverride = calGoal;
    }
  }

  return base;
}

export const DEFAULT_ENABLED_WIDGETS: DashboardWidgetId[] = [
  "fasting",
  "hydration",
  "steps_watch",
  "weight_ema",
  "barcode_meals",
  "body_blood",
];

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
  fasting: FastingConfig;
  enabledWidgets: DashboardWidgetId[];
  wearable: WearableSyncState;
  completedMindsetDates: string[];
  fwAiMessages: FwAiMessage[];
  subscription: SubscriptionState;
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

  const defaultFasting: FastingConfig = {
    protocolId: "16_8",
    fastHours: 16,
    eatHours: 8,
    activeStartIso: null,
    plannedStartIso: null,
    history: [],
  };

  const profile = sanitizeUserProfile(raw.profile);
  const anthro = computeAnthropometrics(profile);

  const sanitizedSteps: DailyStepLog[] = (Array.isArray(raw.steps) ? raw.steps : []).map((s) => ({
    ...s,
    steps: clampNum(s?.steps, 0, 100000, 0),
  }));

  const sanitizedWaters: WaterLog[] = (Array.isArray(raw.waters) ? raw.waters : []).map((w) => ({
    ...w,
    milliliters: clampNum(w?.milliliters, 0, 10000, 0),
  }));

  const sanitizedChallenges: CustomChallenge[] = (
    Array.isArray(raw.challenges) ? raw.challenges : []
  ).map((c) => {
    if (c.metric === "water" && (!Number.isFinite(c.targetValue) || c.targetValue > 4500 || c.targetValue < 500)) {
      return {
        ...c,
        targetValue: anthro.targets.waterMl,
        unit: "mL",
        title: c.title.replace(/8\s?000\s*ml/gi, `${anthro.targets.waterMl} mL`),
      };
    }
    if (c.metric === "steps" && (!Number.isFinite(c.targetValue) || c.targetValue > 50000 || c.targetValue < 500)) {
      return {
        ...c,
        targetValue: profile.dailyStepGoal,
        unit: c.unit || "pas",
      };
    }
    return c;
  });

  const todayKey = formatDateKey();
  const defaultFwAiWelcome: FwAiMessage = {
    id: "fw-ai-welcome",
    role: "assistant",
    content: `Bonjour ${profile.name} ! Je suis FW AI, votre coach FolloWeight. Je lis vos vrais chiffres du jour (calories, protéines, pas, jeûne et sport) pour vous proposer le prochain bon choix sans calcul compliqué. Vous disposez de 5 questions gratuites chaque jour !`,
    createdAt: new Date().toISOString(),
    provider: "clinical-deterministic",
    quickActions: [
      "Analyse ma journée (calories, protéines, sport)",
      "Quel dîner me conseilles-tu ce soir ?",
      "Comment progresser sans perdre de muscle ?",
    ],
  };

  return {
    version: CURRENT_STATE_VERSION,
    profile,
    meals: Array.isArray(raw.meals) ? raw.meals : [],
    fridgeScans: Array.isArray(raw.fridgeScans) ? raw.fridgeScans : [],
    steps: sanitizedSteps,
    workouts: Array.isArray(raw.workouts) ? raw.workouts : [],
    weights: existingWeights,
    waters: sanitizedWaters,
    challenges: sanitizedChallenges,
    difficultDayDates: Array.isArray(raw.difficultDayDates) ? raw.difficultDayDates : [],
    measurements: migratedMeasurements,
    bloodPanels: Array.isArray(raw.bloodPanels) ? raw.bloodPanels : [],
    bodyPhotoMetas: Array.isArray(raw.bodyPhotoMetas) ? raw.bodyPhotoMetas : [],
    fasting:
      raw.fasting && typeof raw.fasting === "object"
        ? {
            ...defaultFasting,
            ...raw.fasting,
            history: Array.isArray(raw.fasting.history) ? raw.fasting.history : [],
          }
        : defaultFasting,
    enabledWidgets:
      Array.isArray(raw.enabledWidgets) && raw.enabledWidgets.length > 0
        ? raw.enabledWidgets
        : [...DEFAULT_ENABLED_WIDGETS],
    wearable:
      raw.wearable && typeof raw.wearable === "object"
        ? raw.wearable
        : { ecosystem: "none" },
    completedMindsetDates: Array.isArray(raw.completedMindsetDates)
      ? raw.completedMindsetDates
      : [],
    fwAiMessages:
      Array.isArray(raw.fwAiMessages) && raw.fwAiMessages.length > 0
        ? raw.fwAiMessages
        : [defaultFwAiWelcome],
    subscription: raw.subscription
      ? normalizeSubscriptionForToday(raw.subscription, todayKey)
      : createDefaultSubscriptionState(todayKey),
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
      if ((existing.version ?? 1) < CURRENT_STATE_VERSION) {
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
      store.put({ ...state, version: CURRENT_STATE_VERSION }, STATE_KEY);
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

export function buildFreshUserState(
  profile: UserProfile,
  options?: {
    enabledWidgets?: DashboardWidgetId[];
    wearable?: WearableSyncState;
  }
): VitalPulseState {
  const todayKey = formatDateKey();
  const cleanProfile = sanitizeUserProfile({
    ...profile,
    isDemoProfile: false,
    onboardingCompleted: true,
  });
  const anthro = computeAnthropometrics(cleanProfile);
  const protoSpec = getProtocolSpec(cleanProfile.preferredFasting ?? "16_8");
  return {
    version: CURRENT_STATE_VERSION,
    profile: cleanProfile,
    meals: [],
    fridgeScans: [],
    steps: [{ dateKey: todayKey, steps: 0, source: "manual", updatedAt: new Date().toISOString() }],
    workouts: [],
    weights: [
      {
        id: `w-init-${todayKey}`,
        dateKey: todayKey,
        timestamp: new Date().toISOString(),
        weightKg: cleanProfile.weightKg,
        waistCm: cleanProfile.waistCm,
        note: "Mesure initiale de départ",
      },
    ],
    waters: [{ dateKey: todayKey, milliliters: 0 }],
    measurements: [
      {
        id: `bm-init-${todayKey}`,
        dateKey: todayKey,
        createdAt: new Date().toISOString(),
        weightKg: cleanProfile.weightKg,
        waistCm: cleanProfile.waistCm,
        note: "Mesure initiale de départ",
      },
    ],
    bloodPanels: [],
    bodyPhotoMetas: [],
    fasting: {
      protocolId: cleanProfile.preferredFasting ?? "16_8",
      fastHours: protoSpec.fastHours,
      eatHours: protoSpec.eatHours,
      activeStartIso: null,
      plannedStartIso: null,
      history: [],
    },
    enabledWidgets:
      options?.enabledWidgets && options.enabledWidgets.length > 0
        ? options.enabledWidgets
        : [...DEFAULT_ENABLED_WIDGETS],
    wearable: options?.wearable ?? { ecosystem: "none" },
    completedMindsetDates: [],
    fwAiMessages: [
      {
        id: `fw-ai-init-${todayKey}`,
        role: "assistant",
        content: `Bienvenue ${cleanProfile.name} sur FolloWeight ! Je suis FW AI. Je connais votre cible (${anthro.targetIntakeKcal} kcal/j, ${anthro.targets.proteinG} g de protéines) et je m'adapte à vos séances sportives et à votre jeûne. Posez-moi votre première question !`,
        createdAt: new Date().toISOString(),
        provider: "clinical-deterministic",
        quickActions: [
          "Analyse mes objectifs de départ",
          "Que manger au prochain repas ?",
          "Comment optimiser ma semaine sport ?",
        ],
      },
    ],
    subscription: createDefaultSubscriptionState(todayKey),
    challenges: [
      {
        id: "chal-steps-8000",
        title: `Cap des ${cleanProfile.dailyStepGoal.toLocaleString("fr-FR")} pas / jour`,
        description: "Marche cumulée quotidienne (hors double comptage)",
        metric: "steps",
        targetValue: cleanProfile.dailyStepGoal,
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
        targetValue: anthro.targets.proteinG,
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

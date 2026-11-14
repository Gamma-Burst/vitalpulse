export type Sex = "male" | "female";

export type ActivityProfile = "sedentary" | "lightly_active" | "active" | "very_active";

export type PrimaryGoal = "fat_loss" | "recomposition" | "maintenance" | "muscle_gain";

export type SpecialMode =
  | "standard"
  | "glp1_muscle_guard"
  | "glycemic_shield"
  | "cardio_low_sodium";

export interface QuietHours {
  start: string; // HH:mm
  end: string; // HH:mm
}

export interface UserProfile {
  name: string;
  age: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  targetWeightKg: number;
  waistCm?: number;
  activityProfile: ActivityProfile;
  primaryGoal: PrimaryGoal;
  weeklyPaceKg: number; // e.g. -0.4 kg/week
  dailyStepGoal: number;
  specialMode: SpecialMode;
  quietHours: QuietHours;
  isDemoProfile?: boolean;
}

export interface MacroTotals {
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  sugarG: number;
  satFatG: number;
  sodiumMg: number;
}

export interface MicroTotals {
  ironMg: number;
  magnesiumMg: number;
  calciumMg: number;
  potassiumMg: number;
  vitCMg: number;
  vitDUg: number;
}

export interface MealFoodItem {
  name: string;
  grams: number;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  sodiumMg: number;
  ciqualMatch?: string;
}

export type OilLevel = "none" | "light_1tbsp" | "rich_restaurant";
export type MealType = "breakfast" | "lunch" | "snack" | "dinner";

export interface SmartClarifier {
  oilLevel: OilLevel;
  appliedOilDeltaKcal: number;
  questionFr: string;
}

export interface AnalysisRevision {
  revisionId: string;
  createdAt: string;
  userNotes: string;
  plateDiameterCm: number;
  portionEatenPct: number;
  oilLevel: OilLevel;
  caloriesCentral: number;
  caloriesMin: number;
  caloriesMax: number;
  macros: MacroTotals;
  summaryFr: string;
}

export interface MealEntry {
  id: string;
  createdAt: string;
  dateKey: string; // YYYY-MM-DD
  mealType: MealType;
  photoDataUrl?: string;
  userNotes: string;
  plateDiameterCm: number;
  portionEatenPct: number; // 25..150
  dishTitle: string;
  summaryFr: string;
  confidence: number; // 0..1
  analysisProvider: "openai-vision" | "ciqual-deterministic";
  caloriesCentral: number;
  caloriesMin: number;
  caloriesMax: number;
  macros: MacroTotals;
  micronutrients: MicroTotals;
  novaGroup: 1 | 2 | 3 | 4;
  glycemicLoad: number;
  satietyScore: number; // 0..100
  healthScore: number; // 0..100
  items: MealFoodItem[];
  smartClarifier: SmartClarifier;
  clinicalSources: string[];
  revisions: AnalysisRevision[];
}

export interface FridgeIngredient {
  name: string;
  quantityLabel: string;
  urgency: "use_soon" | "fresh" | "pantry";
  category: string;
}

export interface RecipeStep {
  stepNumber: number;
  instruction: string;
  timerSeconds?: number;
  tip?: string;
}

export interface StepByStepRecipe {
  id: string;
  title: string;
  prepMinutes: number;
  cookMinutes: number;
  servings: number;
  caloriesPerServing: number;
  macros: MacroTotals;
  novaGroup: 1 | 2 | 3 | 4;
  glycemicLoad: number;
  whyItFitsToday: string;
  ingredients: string[];
  steps: RecipeStep[];
  clinicalNote: string;
}

export interface FridgeScanSession {
  id: string;
  createdAt: string;
  photoDataUrl?: string;
  userNotes: string;
  detectedIngredients: FridgeIngredient[];
  recipes: StepByStepRecipe[];
  provider: "openai-vision" | "ciqual-deterministic";
}

export type StepSource = "health_connect" | "web_motion_sensor" | "manual";

export interface DailyStepLog {
  dateKey: string;
  steps: number;
  source: StepSource;
  updatedAt: string;
}

export type ExerciseCategory =
  | "sos_2min"
  | "vilpa"
  | "home_cardio_no_jump"
  | "strength_tone"
  | "desk_mobility"
  | "digestive_walk";

export interface ExerciseDefinition {
  id: string;
  title: string;
  category: ExerciseCategory;
  met: number;
  defaultMinutes: number;
  stepsPerMinuteOverlap: number;
  equipment: string;
  difficulty: "Très facile" | "Modéré" | "Tonique";
  targetMuscles: string;
  instructions: string[];
  antiDemotivationTip: string;
  scienceCitation: string;
}

export interface WorkoutSession {
  id: string;
  dateKey: string;
  exerciseId: string;
  title: string;
  category: ExerciseCategory;
  durationMinutes: number;
  met: number;
  netCaloriesBurned: number;
  estimatedStepsOverlap: number;
  rpe: number; // 1..10
  startedAt: string;
}

export interface WeightEntry {
  id: string;
  dateKey: string;
  timestamp: string;
  weightKg: number;
  waistCm?: number;
  note?: string;
}

export interface WaterLog {
  dateKey: string;
  milliliters: number;
}

export type ChallengeMetric =
  | "steps"
  | "protein"
  | "fiber"
  | "water"
  | "workout_minutes"
  | "no_nova4"
  | "custom";

export interface CustomChallenge {
  id: string;
  title: string;
  description: string;
  metric: ChallengeMetric;
  targetValue: number;
  unit: string;
  durationDays: number;
  reminderTime: string; // HH:mm
  active: boolean;
  completedDates: string[];
  createdAt: string;
}

export interface AnthropometricReport {
  bmi: number;
  bmiCategoryFr: string;
  wthr: number | null;
  wthrStatusFr: string | null;
  bri: number | null;
  briCategoryFr: string | null;
  rfmPct: number;
  rfmMethodLabel: string;
  athleticCoherenceNote: string | null;
  bmrKcal: number;
  estimatedMaintenanceKcal: number;
  targetIntakeKcal: number;
  safetyFloorApplied: boolean;
  minorSafetyLock: boolean;
  targets: {
    proteinG: number;
    carbsG: number;
    fatG: number;
    fiberG: number;
    waterMl: number;
    sodiumMaxMg: number;
  };
  sources: string[];
}

export interface DailyEnergyBalance {
  dateKey: string;
  intakeKcal: number;
  intakeMinKcal: number;
  intakeMaxKcal: number;
  macros: MacroTotals;
  micronutrients: MicroTotals;
  avgNovaGroup: number;
  totalGlycemicLoad: number;
  bmrKcal: number;
  nonAmbulatoryNeatKcal: number;
  rawSteps: number;
  overlapStepsDeducted: number;
  effectiveNeatSteps: number;
  stepDistanceKm: number;
  netStepsKcal: number;
  workoutMinutes: number;
  netWorkoutsKcal: number;
  tefKcal: number;
  totalExpenditureKcal: number;
  netBalanceKcal: number; // intake - expenditure (< 0 = deficit)
  targetIntakeKcal: number;
  remainingToTargetKcal: number;
  statusFr: string;
  waterMl: number;
  mealsCount: number;
}

export interface WeightTrendPoint {
  dateKey: string;
  rawWeightKg: number;
  emaWeightKg: number;
  deltaFromStartKg: number;
}

export interface ScaleDecoderInsight {
  triggered: boolean;
  headlineFr: string;
  explanationFr: string;
  likelyCause: "sodium_water" | "glycogen_water" | "steady_fat_loss" | "surplus_trend";
  deltaKg: number;
}

export interface MedicalEvidenceCard {
  id: string;
  topic: string;
  title: string;
  source: string;
  year: string;
  evidenceLevel: string;
  pmid?: string;
  url: string;
  summaryFr: string;
  actionableTip: string;
}

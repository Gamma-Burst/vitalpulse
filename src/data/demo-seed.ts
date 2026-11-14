import {
  BloodPanelEntry,
  BodyMeasurementEntry,
  BodyPhotoMeta,
  CustomChallenge,
  DailyStepLog,
  MealEntry,
  UserProfile,
  WaterLog,
  WeightEntry,
  WorkoutSession,
} from "@/types/vitalpulse";
import { evaluateBloodPanelDeterministically } from "@/lib/blood-panel-engine";
import type { VitalPulseState } from "@/lib/storage-db";

function makeBodySilhouetteSvgDataUrl(opts: {
  label: string;
  waistWidth: number;
  shoulderWidth: number;
  chestWidth: number;
  hipWidth: number;
  accent: string;
  weightText: string;
}): string {
  const cx = 200;
  const sw = opts.shoulderWidth;
  const cw = opts.chestWidth;
  const ww = opts.waistWidth;
  const hw = opts.hipWidth;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="560" viewBox="0 0 400 560">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#0d171c"/>
        <stop offset="100%" stop-color="#132229"/>
      </linearGradient>
      <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${opts.accent}" stop-opacity="0.45"/>
        <stop offset="100%" stop-color="#38bdf8" stop-opacity="0.25"/>
      </linearGradient>
    </defs>
    <rect width="400" height="560" fill="url(#bg)"/>
    <g stroke="#1e293b" stroke-width="1" stroke-dasharray="4 4">
      <line x1="30" y1="150" x2="370" y2="150"/>
      <line x1="30" y1="245" x2="370" y2="245"/>
      <line x1="30" y1="315" x2="370" y2="315"/>
    </g>
    <circle cx="${cx}" cy="76" r="28" fill="#1e293b" stroke="${opts.accent}" stroke-width="2"/>
    <text x="${cx}" y="80" fill="#94a3b8" font-family="system-ui,sans-serif" font-size="10" text-anchor="middle">PRIVÉ</text>
    <path d="M ${cx - 14} 104 L ${cx + 14} 104 L ${cx + sw} 135 L ${cx + sw + 18} 275 L ${cx + sw} 275 L ${cx + cw} 170 L ${cx + ww} 245 L ${cx + hw} 315 L ${cx + hw - 8} 495 L ${cx + 12} 495 L ${cx + 6} 350 L ${cx - 6} 350 L ${cx - 12} 495 L ${cx - hw + 8} 495 L ${cx - hw} 315 L ${cx - ww} 245 L ${cx - cw} 170 L ${cx - sw} 275 L ${cx - sw - 18} 275 L ${cx - sw} 135 Z" fill="url(#bodyGrad)" stroke="${opts.accent}" stroke-width="2.5" stroke-linejoin="round"/>
    <line x1="${cx - ww - 18}" y1="245" x2="${cx + ww + 18}" y2="245" stroke="#fbbf24" stroke-width="1.5" stroke-dasharray="4 3"/>
    <rect x="20" y="18" width="160" height="28" rx="14" fill="#0B1215CC" stroke="${opts.accent}" stroke-width="1"/>
    <text x="100" y="36" fill="#F8FAFC" font-family="system-ui,sans-serif" font-size="12" font-weight="700" text-anchor="middle">${opts.label}</text>
    <rect x="20" y="510" width="360" height="32" rx="10" fill="#0B1215D9"/>
    <text x="200" y="531" fill="${opts.accent}" font-family="system-ui,sans-serif" font-size="13" font-weight="700" text-anchor="middle">${opts.weightText}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const DEMO_BODY_PHOTOS: Record<string, string> = {
  "demo-photo-before": makeBodySilhouetteSvgDataUrl({
    label: "Départ · Semaine 1",
    shoulderWidth: 68,
    chestWidth: 58,
    waistWidth: 56,
    hipWidth: 60,
    accent: "#f59e0b",
    weightText: "85,2 kg · Tour de taille 92,5 cm (Démo)",
  }),
  "demo-photo-after": makeBodySilhouetteSvgDataUrl({
    label: "Aujourd'hui · Semaine 6",
    shoulderWidth: 70,
    chestWidth: 56,
    waistWidth: 46,
    hipWidth: 54,
    accent: "#34d399",
    weightText: "82,4 kg · Tour de taille 88,0 cm (-4,5 cm)",
  }),
};

function shiftDateKey(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function makePlateSvgDataUrl(opts: {
  title: string;
  bg1: string;
  bg2: string;
  mainColor: string;
  sideColor: string;
  vegColor: string;
  kcal: number;
}): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360" viewBox="0 0 480 360">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${opts.bg1}"/>
        <stop offset="100%" stop-color="${opts.bg2}"/>
      </linearGradient>
      <radialGradient id="plate" cx="50%" cy="45%" r="52%">
        <stop offset="0%" stop-color="#f8fafc"/>
        <stop offset="85%" stop-color="#e2e8f0"/>
        <stop offset="100%" stop-color="#cbd5e1"/>
      </radialGradient>
    </defs>
    <rect width="480" height="360" fill="url(#bg)"/>
    <circle cx="240" cy="180" r="142" fill="#00000044"/>
    <circle cx="240" cy="176" r="138" fill="url(#plate)"/>
    <circle cx="240" cy="176" r="112" fill="none" stroke="#cbd5e1" stroke-width="2"/>
    <ellipse cx="195" cy="155" rx="54" ry="38" fill="${opts.mainColor}" opacity="0.95"/>
    <circle cx="288" cy="148" r="42" fill="${opts.sideColor}" opacity="0.92"/>
    <circle cx="240" cy="235" r="38" fill="${opts.vegColor}" opacity="0.94"/>
    <circle cx="206" cy="222" r="22" fill="${opts.vegColor}" opacity="0.88"/>
    <circle cx="276" cy="224" r="20" fill="${opts.vegColor}" opacity="0.85"/>
    <rect x="16" y="16" width="144" height="32" rx="16" fill="#0B1215CC"/>
    <text x="88" y="37" fill="#34D399" font-family="system-ui,sans-serif" font-size="14" font-weight="700" text-anchor="middle">${opts.kcal} kcal · Ciqual</text>
    <rect x="16" y="308" width="448" height="36" rx="10" fill="#0B1215CC"/>
    <text x="30" y="331" fill="#F8FAFC" font-family="system-ui,sans-serif" font-size="14" font-weight="600">${opts.title}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function buildDemoSeedState(): VitalPulseState {
  const profile: UserProfile = {
    name: "Christophe (Démo 7j)",
    age: 38,
    sex: "male",
    heightCm: 178,
    weightKg: 82.4,
    targetWeightKg: 77.0,
    waistCm: 88,
    activityProfile: "lightly_active",
    primaryGoal: "fat_loss",
    weeklyPaceKg: -0.4,
    dailyStepGoal: 8500,
    specialMode: "standard",
    quietHours: { start: "22:00", end: "07:30" },
    isDemoProfile: true,
  };

  const d0 = shiftDateKey(0);
  const d1 = shiftDateKey(1);
  const d2 = shiftDateKey(2);
  const d3 = shiftDateKey(3);
  const d4 = shiftDateKey(4);
  const d5 = shiftDateKey(5);
  const d6 = shiftDateKey(6);

  const salmonPhoto = makePlateSvgDataUrl({
    title: "Saumon grillé, quinoa & brocoli vapeur",
    bg1: "#0f2027",
    bg2: "#203a43",
    mainColor: "#fb7185",
    sideColor: "#fde68a",
    vegColor: "#22c55e",
    kcal: 585,
  });

  const chickenPhoto = makePlateSvgDataUrl({
    title: "Poulet curry léger, riz basmati & courgettes",
    bg1: "#1a1f2e",
    bg2: "#2a2438",
    mainColor: "#f59e0b",
    sideColor: "#f8fafc",
    vegColor: "#4ade80",
    kcal: 640,
  });

  const bowlPhoto = makePlateSvgDataUrl({
    title: "Bowl méditerranéen pois chiches, feta & avocat",
    bg1: "#0b221e",
    bg2: "#163832",
    mainColor: "#d97706",
    sideColor: "#fef3c7",
    vegColor: "#16a34a",
    kcal: 520,
  });

  const omeletPhoto = makePlateSvgDataUrl({
    title: "Omelette 3 œufs aux champignons & pain complet",
    bg1: "#1f1d2b",
    bg2: "#2f2c3f",
    mainColor: "#facc15",
    sideColor: "#a16207",
    vegColor: "#a8a29e",
    kcal: 470,
  });

  const baseMicros = {
    ironMg: 4.2,
    magnesiumMg: 112,
    calciumMg: 185,
    potassiumMg: 980,
    vitCMg: 48,
    vitDUg: 3.2,
  };

  const meals: MealEntry[] = [
    {
      id: "meal-demo-today-1",
      createdAt: new Date().toISOString(),
      dateKey: d0,
      mealType: "breakfast",
      photoDataUrl: omeletPhoto,
      userNotes: "Omelette 3 œufs, champignons, 1 tranche pain complet, 1 c.à.c huile d'olive",
      plateDiameterCm: 24,
      portionEatenPct: 100,
      dishTitle: "Omelette champignons & pain complet",
      summaryFr: "Riche en protéines et choline, faible charge glycémique pour éviter le coup de fatigue à 11h.",
      confidence: 0.91,
      analysisProvider: "ciqual-deterministic",
      caloriesCentral: 470,
      caloriesMin: 420,
      caloriesMax: 520,
      macros: {
        proteinG: 28.5, carbsG: 26.0, fatG: 26.0, fiberG: 4.8, sugarG: 2.1, satFatG: 7.4, sodiumMg: 510,
      },
      micronutrients: { ...baseMicros, vitDUg: 4.1 },
      novaGroup: 1,
      glycemicLoad: 11.4,
      satietyScore: 86,
      healthScore: 89,
      items: [
        { name: "Œufs entiers (3)", grams: 180, kcal: 261, proteinG: 22.7, carbsG: 1.3, fatG: 18.5, fiberG: 0, sodiumMg: 227, ciqualMatch: "ciq-oeuf" },
        { name: "Pain complet", grams: 50, kcal: 124, proteinG: 4.6, carbsG: 21.5, fatG: 1.3, fiberG: 3.3, sodiumMg: 240, ciqualMatch: "ciq-pain-complet" },
        { name: "Champignons sautés + huile", grams: 105, kcal: 85, proteinG: 1.2, carbsG: 3.2, fatG: 6.2, fiberG: 1.5, sodiumMg: 43, ciqualMatch: "ciq-champignon" },
      ],
      smartClarifier: {
        oilLevel: "light_1tbsp",
        appliedOilDeltaKcal: 60,
        questionFr: "Matière grasse ajoutée à la poêle ?",
      },
      clinicalSources: ["ANSES Table Ciqual", "Inserm Score NOVA 1"],
      revisions: [
        {
          revisionId: "rev-1",
          createdAt: new Date().toISOString(),
          userNotes: "Omelette 3 œufs, champignons, 1 tranche pain complet",
          plateDiameterCm: 24,
          portionEatenPct: 100,
          oilLevel: "light_1tbsp",
          caloriesCentral: 470,
          caloriesMin: 420,
          caloriesMax: 520,
          macros: { proteinG: 28.5, carbsG: 26.0, fatG: 26.0, fiberG: 4.8, sugarG: 2.1, satFatG: 7.4, sodiumMg: 510 },
          summaryFr: "Analyse initiale ancrée Ciqual",
        },
      ],
    },
    {
      id: "meal-demo-today-2",
      createdAt: new Date().toISOString(),
      dateKey: d0,
      mealType: "lunch",
      photoDataUrl: salmonPhoto,
      userNotes: "Pavé de saumon 150g cuit sans sauce ajoutée, quinoa 160g, brocoli vapeur, 1 c.à.s d'huile d'olive",
      plateDiameterCm: 26,
      portionEatenPct: 100,
      dishTitle: "Saumon grillé, quinoa & brocoli vapeur",
      summaryFr: "Excellent ratio protéines / oméga-3 / fibres : très forte satiété et vitamine D naturelle.",
      confidence: 0.93,
      analysisProvider: "ciqual-deterministic",
      caloriesCentral: 585,
      caloriesMin: 525,
      caloriesMax: 645,
      macros: {
        proteinG: 44.2, carbsG: 36.1, fatG: 29.8, fiberG: 9.0, sugarG: 3.2, satFatG: 5.1, sodiumMg: 145,
      },
      micronutrients: { ...baseMicros, vitCMg: 87, vitDUg: 13.0 },
      novaGroup: 1,
      glycemicLoad: 15.2,
      satietyScore: 94,
      healthScore: 96,
      items: [
        { name: "Saumon cuit au four", grams: 150, kcal: 309, proteinG: 33.2, carbsG: 0, fatG: 19.5, fiberG: 0, sodiumMg: 92, ciqualMatch: "ciq-saumon-cuit" },
        { name: "Quinoa cuit", grams: 160, kcal: 192, proteinG: 7.0, carbsG: 31.7, fatG: 3.0, fiberG: 4.5, sodiumMg: 11, ciqualMatch: "ciq-quinoa" },
        { name: "Brocoli vapeur + filet d'huile", grams: 158, kcal: 84, proteinG: 4.0, carbsG: 4.4, fatG: 7.3, fiberG: 4.5, sodiumMg: 42, ciqualMatch: "ciq-brocoli" },
      ],
      smartClarifier: {
        oilLevel: "light_1tbsp",
        appliedOilDeltaKcal: 45,
        questionFr: "Assaisonnement ou beurre sur les brocolis ?",
      },
      clinicalSources: ["ANSES Table Ciqual", "EFSA Acides gras Oméga-3"],
      revisions: [],
    },
    {
      id: "meal-demo-d1-1",
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      dateKey: d1,
      mealType: "lunch",
      photoDataUrl: chickenPhoto,
      userNotes: "Restaurant thaï : poulet curry coco, riz basmati, sauce salée soja",
      plateDiameterCm: 28,
      portionEatenPct: 100,
      dishTitle: "Poulet curry coco & riz basmati",
      summaryFr: "Riche en protéines mais attention au sodium de la sauce soja (2 320 mg) expliquant une petite rétention d'eau.",
      confidence: 0.87,
      analysisProvider: "ciqual-deterministic",
      caloriesCentral: 640,
      caloriesMin: 560,
      caloriesMax: 730,
      macros: {
        proteinG: 46.0, carbsG: 56.0, fatG: 24.0, fiberG: 4.1, sugarG: 4.2, satFatG: 11.8, sodiumMg: 2320,
      },
      micronutrients: baseMicros,
      novaGroup: 3,
      glycemicLoad: 29.0,
      satietyScore: 81,
      healthScore: 76,
      items: [],
      smartClarifier: { oilLevel: "rich_restaurant", appliedOilDeltaKcal: 180, questionFr: "Sauce riche en lait de coco ?" },
      clinicalSources: ["ANSES Ciqual", "OMS Sodium"],
      revisions: [],
    },
    {
      id: "meal-demo-d2-1",
      createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      dateKey: d2,
      mealType: "dinner",
      photoDataUrl: bowlPhoto,
      userNotes: "Bowl pois chiches, feta 40g, demi-avocat, crudités, vinaigrette légère",
      plateDiameterCm: 26,
      portionEatenPct: 100,
      dishTitle: "Bowl méditerranéen pois chiches & feta",
      summaryFr: "Très riche en fibres prébiotiques (13,8 g) et faible charge glycémique.",
      confidence: 0.9,
      analysisProvider: "ciqual-deterministic",
      caloriesCentral: 520,
      caloriesMin: 465,
      caloriesMax: 580,
      macros: {
        proteinG: 22.0, carbsG: 39.0, fatG: 28.0, fiberG: 13.8, sugarG: 6.1, satFatG: 7.5, sodiumMg: 540,
      },
      micronutrients: { ...baseMicros, potassiumMg: 1240, magnesiumMg: 145 },
      novaGroup: 1,
      glycemicLoad: 12.1,
      satietyScore: 91,
      healthScore: 93,
      items: [],
      smartClarifier: { oilLevel: "light_1tbsp", appliedOilDeltaKcal: 90, questionFr: "Vinaigrette incluse ?" },
      clinicalSources: ["ANSES Ciqual", "NICE Fibres"],
      revisions: [],
    },
  ];

  // Compléter les jours d1..d6 pour que les graphiques hebdo soient réalistes et complets
  const historicalDayCalories = [
    { key: d1, extraKcal: 1280, p: 98, c: 165, f: 42, fib: 22, sod: 380 },
    { key: d2, extraKcal: 1390, p: 112, c: 142, f: 45, fib: 18, sod: 920 },
    { key: d3, extraKcal: 2150, p: 141, c: 192, f: 68, fib: 29, sod: 1620 },
    { key: d4, extraKcal: 1880, p: 135, c: 170, f: 58, fib: 27, sod: 1480 },
    { key: d5, extraKcal: 2560, p: 128, c: 268, f: 88, fib: 20, sod: 2150 },
    { key: d6, extraKcal: 1940, p: 138, c: 175, f: 61, fib: 31, sod: 1510 },
  ];

  for (const hd of historicalDayCalories) {
    meals.push({
      id: `meal-demo-summary-${hd.key}`,
      createdAt: new Date(`${hd.key}T19:30:00Z`).toISOString(),
      dateKey: hd.key,
      mealType: "dinner",
      userNotes: "Repas de la journée (données historiques d'exemple)",
      plateDiameterCm: 26,
      portionEatenPct: 100,
      dishTitle: "Journée alimentaire consolidée",
      summaryFr: "Série d'exemple illustrant les courbes comparatives sur 7 jours.",
      confidence: 0.88,
      analysisProvider: "ciqual-deterministic",
      caloriesCentral: hd.extraKcal,
      caloriesMin: hd.extraKcal - 110,
      caloriesMax: hd.extraKcal + 110,
      macros: {
        proteinG: hd.p, carbsG: hd.c, fatG: hd.f, fiberG: hd.fib, sugarG: 18, satFatG: 16, sodiumMg: hd.sod,
      },
      micronutrients: baseMicros,
      novaGroup: hd.key === d5 ? 3 : 2,
      glycemicLoad: 24,
      satietyScore: 80,
      healthScore: 82,
      items: [],
      smartClarifier: { oilLevel: "light_1tbsp", appliedOilDeltaKcal: 90, questionFr: "" },
      clinicalSources: ["ANSES Ciqual"],
      revisions: [],
    });
  }

  const steps: DailyStepLog[] = [
    { dateKey: d6, steps: 9400, source: "health_connect", updatedAt: new Date().toISOString() },
    { dateKey: d5, steps: 5200, source: "health_connect", updatedAt: new Date().toISOString() },
    { dateKey: d4, steps: 10300, source: "health_connect", updatedAt: new Date().toISOString() },
    { dateKey: d3, steps: 8800, source: "health_connect", updatedAt: new Date().toISOString() },
    { dateKey: d2, steps: 11200, source: "health_connect", updatedAt: new Date().toISOString() },
    { dateKey: d1, steps: 7600, source: "health_connect", updatedAt: new Date().toISOString() },
    { dateKey: d0, steps: 6150, source: "web_motion_sensor", updatedAt: new Date().toISOString() },
  ];

  const workouts: WorkoutSession[] = [
    {
      id: "wo-demo-1",
      dateKey: d6,
      exerciseId: "brisk-walk-20",
      title: "Marche active 20 min",
      category: "digestive_walk",
      durationMinutes: 20,
      met: 4.3,
      netCaloriesBurned: 92,
      estimatedStepsOverlap: 2240,
      rpe: 5,
      startedAt: new Date().toISOString(),
    },
    {
      id: "wo-demo-2",
      dateKey: d4,
      exerciseId: "strength-lower-glutes",
      title: "Renfo Jambes & Fessiers (12 min)",
      category: "strength_tone",
      durationMinutes: 12,
      met: 5.0,
      netCaloriesBurned: 68,
      estimatedStepsOverlap: 120,
      rpe: 6,
      startedAt: new Date().toISOString(),
    },
    {
      id: "wo-demo-3",
      dateKey: d2,
      exerciseId: "nojump-cardio-10",
      title: "Cardio maison sans sauts (10 min)",
      category: "home_cardio_no_jump",
      durationMinutes: 10,
      met: 4.8,
      netCaloriesBurned: 54,
      estimatedStepsOverlap: 750,
      rpe: 6,
      startedAt: new Date().toISOString(),
    },
    {
      id: "wo-demo-4",
      dateKey: d0,
      exerciseId: "digestive-walk-10",
      title: "Marche digestive post-repas (10 min)",
      category: "digestive_walk",
      durationMinutes: 10,
      met: 3.5,
      netCaloriesBurned: 35,
      estimatedStepsOverlap: 1000,
      rpe: 4,
      startedAt: new Date().toISOString(),
    },
  ];

  const weights: WeightEntry[] = [
    { id: "wt-6", dateKey: d6, timestamp: `${d6}T07:15:00Z`, weightKg: 83.2, waistCm: 89 },
    { id: "wt-5", dateKey: d5, timestamp: `${d5}T07:20:00Z`, weightKg: 83.0, waistCm: 89 },
    { id: "wt-4", dateKey: d4, timestamp: `${d4}T07:10:00Z`, weightKg: 82.8, waistCm: 88.5 },
    { id: "wt-3", dateKey: d3, timestamp: `${d3}T07:25:00Z`, weightKg: 82.6, waistCm: 88.5 },
    { id: "wt-2", dateKey: d2, timestamp: `${d2}T07:18:00Z`, weightKg: 82.3, waistCm: 88 },
    { id: "wt-1", dateKey: d1, timestamp: `${d1}T07:15:00Z`, weightKg: 82.1, waistCm: 88 },
    { id: "wt-0", dateKey: d0, timestamp: `${d0}T07:20:00Z`, weightKg: 82.6, waistCm: 88, note: "Pesée après dîner salé thaï (+0,5 kg eau)" },
  ];

  const waters: WaterLog[] = [
    { dateKey: d6, milliliters: 2250 },
    { dateKey: d5, milliliters: 1750 },
    { dateKey: d4, milliliters: 2500 },
    { dateKey: d3, milliliters: 2000 },
    { dateKey: d2, milliliters: 2400 },
    { dateKey: d1, milliliters: 1900 },
    { dateKey: d0, milliliters: 1500 },
  ];

  const challenges: CustomChallenge[] = [
    {
      id: "chal-steps-8500",
      title: "8 500 pas quotidiens",
      description: "Objectif mobilité douce + marche digestive après le déjeuner",
      metric: "steps",
      targetValue: 8500,
      unit: "pas",
      durationDays: 14,
      reminderTime: "18:00",
      active: true,
      completedDates: [d6, d4, d3, d2],
      createdAt: new Date().toISOString(),
    },
    {
      id: "chal-protein-130",
      title: "135 g de protéines / jour",
      description: "Protéger le muscle et maximiser la satiété pendant le déficit",
      metric: "protein",
      targetValue: 135,
      unit: "g",
      durationDays: 14,
      reminderTime: "19:30",
      active: true,
      completedDates: [d6, d4, d3],
      createdAt: new Date().toISOString(),
    },
    {
      id: "chal-fiber-30",
      title: "30 g de fibres ANSES",
      description: "Légumes, légumineuses ou céréales complètes à chaque repas",
      metric: "fiber",
      targetValue: 30,
      unit: "g",
      durationDays: 7,
      reminderTime: "12:30",
      active: true,
      completedDates: [d6],
      createdAt: new Date().toISOString(),
    },
  ];

  const d21 = shiftDateKey(21);
  const d42 = shiftDateKey(42);
  const d90 = shiftDateKey(90);

  const measurements: BodyMeasurementEntry[] = [
    {
      id: "bm-demo-1",
      dateKey: d42,
      createdAt: `${d42}T07:30:00.000Z`,
      weightKg: 85.2,
      neckCm: 39.5,
      shouldersCm: 117.0,
      chestCm: 104.0,
      waistCm: 92.5,
      hipsCm: 103.0,
      armCm: 35.0,
      thighCm: 60.0,
      calfCm: 38.5,
      note: "Mesure initiale de référence (à jeun)",
    },
    {
      id: "bm-demo-2",
      dateKey: shiftDateKey(28),
      createdAt: `${shiftDateKey(28)}T07:30:00.000Z`,
      weightKg: 84.1,
      neckCm: 39.3,
      shouldersCm: 117.0,
      chestCm: 103.0,
      waistCm: 90.8,
      hipsCm: 101.8,
      armCm: 34.8,
      thighCm: 59.4,
      calfCm: 38.4,
      note: "Semaine 2 — -1,7 cm au nombril",
    },
    {
      id: "bm-demo-3",
      dateKey: shiftDateKey(14),
      createdAt: `${shiftDateKey(14)}T07:30:00.000Z`,
      weightKg: 83.2,
      neckCm: 39.0,
      shouldersCm: 117.2,
      chestCm: 102.2,
      waistCm: 89.2,
      hipsCm: 100.5,
      armCm: 34.9,
      thighCm: 58.6,
      calfCm: 38.3,
      note: "Semaine 4 — recomposition taille/épaules",
    },
    {
      id: "bm-demo-4",
      dateKey: d0,
      createdAt: `${d0}T07:30:00.000Z`,
      weightKg: 82.4,
      neckCm: 38.8,
      shouldersCm: 117.5,
      chestCm: 101.5,
      waistCm: 88.0,
      hipsCm: 99.5,
      armCm: 35.0,
      thighCm: 58.0,
      calfCm: 38.2,
      note: "Semaine 6 — taille passée sous le seuil 0,50",
    },
  ];

  const oldMarkers = [
    { key: "fastingGlucose" as const, rawValue: 1.06, unit: "g/L" },
    { key: "hba1c" as const, rawValue: 5.8, unit: "%" },
    { key: "fastingInsulin" as const, rawValue: 11.4, unit: "mUI/L" },
    { key: "totalCholesterol" as const, rawValue: 2.15, unit: "g/L" },
    { key: "hdlCholesterol" as const, rawValue: 0.43, unit: "g/L" },
    { key: "ldlCholesterol" as const, rawValue: 1.38, unit: "g/L" },
    { key: "triglycerides" as const, rawValue: 1.72, unit: "g/L" },
    { key: "creatinine" as const, rawValue: 9.2, unit: "mg/L" },
    { key: "alat" as const, rawValue: 39, unit: "UI/L" },
    { key: "asat" as const, rawValue: 31, unit: "UI/L" },
    { key: "platelets" as const, rawValue: 245, unit: "G/L" },
    { key: "vitD" as const, rawValue: 19, unit: "ng/mL" },
  ];

  const newMarkers = [
    { key: "fastingGlucose" as const, rawValue: 0.91, unit: "g/L" },
    { key: "hba1c" as const, rawValue: 5.4, unit: "%" },
    { key: "fastingInsulin" as const, rawValue: 6.2, unit: "mUI/L" },
    { key: "totalCholesterol" as const, rawValue: 1.88, unit: "g/L" },
    { key: "hdlCholesterol" as const, rawValue: 0.56, unit: "g/L" },
    { key: "ldlCholesterol" as const, rawValue: 1.08, unit: "g/L" },
    { key: "triglycerides" as const, rawValue: 1.18, unit: "g/L" },
    { key: "creatinine" as const, rawValue: 8.8, unit: "mg/L" },
    { key: "alat" as const, rawValue: 24, unit: "UI/L" },
    { key: "asat" as const, rawValue: 22, unit: "UI/L" },
    { key: "platelets" as const, rawValue: 252, unit: "G/L" },
    { key: "vitD" as const, rawValue: 34, unit: "ng/mL" },
  ];

  const bloodPanels: BloodPanelEntry[] = [
    {
      id: "bp-demo-1",
      dateKey: d90,
      createdAt: `${d90}T08:15:00.000Z`,
      context: { fasting: true, pregnant: false, labName: "BioLab Exemple (Il y a 3 mois)" },
      markers: oldMarkers,
      analysis: evaluateBloodPanelDeterministically({
        markers: oldMarkers,
        context: { fasting: true, pregnant: false },
        age: profile.age,
        sex: profile.sex,
      }),
    },
    {
      id: "bp-demo-2",
      dateKey: d21,
      createdAt: `${d21}T08:10:00.000Z`,
      context: { fasting: true, pregnant: false, labName: "BioLab Exemple (Bilan actuel)" },
      markers: newMarkers,
      analysis: evaluateBloodPanelDeterministically({
        markers: newMarkers,
        context: { fasting: true, pregnant: false },
        age: profile.age,
        sex: profile.sex,
      }),
    },
  ];

  const bodyPhotoMetas: BodyPhotoMeta[] = [
    {
      id: "demo-photo-before",
      dateKey: d42,
      createdAt: `${d42}T07:35:00.000Z`,
      angle: "front",
      weightKg: 85.2,
      waistCm: 92.5,
      bodyFatPct: 21.8,
      faceBlurred: true,
      note: "Départ — photo exemple (vos vraies photos restent 100 % privées sur votre appareil)",
    },
    {
      id: "demo-photo-after",
      dateKey: d0,
      createdAt: `${d0}T07:35:00.000Z`,
      angle: "front",
      weightKg: 82.4,
      waistCm: 88.0,
      bodyFatPct: 18.6,
      faceBlurred: true,
      note: "Semaine 6 — -4,5 cm de tour de taille",
    },
  ];

  return {
    version: 2,
    profile,
    meals,
    fridgeScans: [],
    steps,
    workouts,
    weights,
    waters,
    challenges,
    difficultDayDates: [],
    measurements,
    bloodPanels,
    bodyPhotoMetas,
  };
}

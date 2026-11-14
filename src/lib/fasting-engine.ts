import { FastingConfig, FastingPhaseId, FastingProtocolId } from "@/types/vitalpulse";

export interface FastingProtocolSpec {
  id: FastingProtocolId;
  badge: string;
  title: string;
  subtitle: string;
  fastHours: number;
  eatHours: number;
  levelFr: "Doux" | "Populaire" | "Avancé" | "Expert";
  benefitFr: string;
  cautionFr?: string;
}

export const FASTING_PROTOCOLS: FastingProtocolSpec[] = [
  {
    id: "12_12",
    badge: "12:12",
    title: "Circadien 12:12",
    subtitle: "12 h de repos digestif · 12 h d'alimentation",
    fastHours: 12,
    eatHours: 12,
    levelFr: "Doux",
    benefitFr: "Resynchronise le rythme circadien sans frustration et calme les grignotages tardifs.",
  },
  {
    id: "14_10",
    badge: "14:10",
    title: "Doux 14:10",
    subtitle: "14 h de jeûne · 10 h d'alimentation",
    fastHours: 14,
    eatHours: 10,
    levelFr: "Doux",
    benefitFr: "Très bien toléré au quotidien (surtout pour débuter ou pour le confort hormonal féminin).",
  },
  {
    id: "16_8",
    badge: "16:8",
    title: "Classique 16:8",
    subtitle: "16 h de jeûne · 8 h d'alimentation",
    fastHours: 16,
    eatHours: 8,
    levelFr: "Populaire",
    benefitFr: "Le format de référence : favorise la sensibilité à l'insuline et l'oxydation des graisses tout en gardant 2 à 3 repas.",
  },
  {
    id: "18_6",
    badge: "18:6",
    title: "Intermédiaire 18:6",
    subtitle: "18 h de jeûne · 6 h d'alimentation",
    fastHours: 18,
    eatHours: 6,
    levelFr: "Avancé",
    benefitFr: "Prolonge la phase de lipolyse tout en laissant 2 repas structurés riches en protéines.",
  },
  {
    id: "20_4",
    badge: "20:4",
    title: "Warrior 20:4",
    subtitle: "20 h de jeûne · 4 h d'alimentation",
    fastHours: 20,
    eatHours: 4,
    levelFr: "Avancé",
    benefitFr: "Fenêtre resserrée idéale pour ceux qui préfèrent dîner calmement ; hydratation et fibres essentielles.",
    cautionFr: "Veillez à atteindre votre quota de protéines en 4 h pour protéger la masse musculaire.",
  },
  {
    id: "omad_23_1",
    badge: "OMAD",
    title: "OMAD 23:1",
    subtitle: "23 h de jeûne · 1 repas complet / jour",
    fastHours: 23,
    eatHours: 1,
    levelFr: "Expert",
    benefitFr: "Un seul grand repas structuré. Simplifie la journée et pousse la bascule lipidique.",
    cautionFr: "Risque élevé de manque de protéines/micronutriments si le repas unique n'est pas très dense. À éviter en mode continu sans suivi.",
  },
  {
    id: "5_2",
    badge: "5:2",
    title: "Alterné 5:2",
    subtitle: "5 j normaux · 2 j allégés (500–600 kcal)",
    fastHours: 24,
    eatHours: 0,
    levelFr: "Populaire",
    benefitFr: "Flexibilité sociale maximale : vous gardez une alimentation normale 5 jours sur 7.",
  },
  {
    id: "custom",
    badge: "Libre",
    title: "Durée libre",
    subtitle: "Choisissez votre durée (12 h à 36 h)",
    fastHours: 16,
    eatHours: 8,
    levelFr: "Avancé",
    benefitFr: "Ajustez au plus près votre heure de début et votre objectif horaire.",
  },
];

export interface FastingPhaseSpec {
  id: FastingPhaseId;
  minHours: number;
  maxHours: number | null;
  titleFr: string;
  shortBadge: string;
  physiologicalSummaryFr: string;
  bodyTipFr: string;
  accentColor: string;
}

export const FASTING_PHASES: FastingPhaseSpec[] = [
  {
    id: "digestion",
    minHours: 0,
    maxHours: 4,
    titleFr: "Digestion & Assimilation",
    shortBadge: "0–4 h",
    physiologicalSummaryFr:
      "Votre organisme absorbe les nutriments du dernier repas. L'insuline reste modérément élevée pour orienter le glucose.",
    bodyTipFr: "Évitez de grignoter : commencez simplement avec de l'eau ou une tisane non sucrée.",
    accentColor: "#FBBF24",
  },
  {
    id: "glycemic_calm",
    minHours: 4,
    maxHours: 8,
    titleFr: "Apaisement Glycémique",
    shortBadge: "4–8 h",
    physiologicalSummaryFr:
      "La glycémie se stabilise et l'insulinémie baisse nettement. Le foie mobilise ses réserves de glycogène.",
    bodyTipFr: "Une marche tranquille de 10 min aide à garder l'énergie stable sans faim.",
    accentColor: "#FB923C",
  },
  {
    id: "metabolic_switch",
    minHours: 8,
    maxHours: 12,
    titleFr: "Bascule Métabolique",
    shortBadge: "8–12 h",
    physiologicalSummaryFr:
      "Le glycogène hépatique diminue et les tissus augmentent progressivement le recours aux acides gras circulants.",
    bodyTipFr: "Buvez un grand verre d'eau (ou eau pétillante + pincée de sel si besoin le matin).",
    accentColor: "#38BDF8",
  },
  {
    id: "lipolysis",
    minHours: 12,
    maxHours: 16,
    titleFr: "Lipolyse Active (Graisses)",
    shortBadge: "12–16 h",
    physiologicalSummaryFr:
      "L'oxydation des lipides s'intensifie et les premiers corps cétoniques commencent à apparaître.",
    bodyTipFr: "Café noir ou thé nature tolérés ; écoutez vos sensations (vertige = on interrompt).",
    accentColor: "#34D399",
  },
  {
    id: "ketosis_light",
    minHours: 16,
    maxHours: 20,
    titleFr: "Cétose Légère & Clarté",
    shortBadge: "16–20 h",
    physiologicalSummaryFr:
      "Les corps cétoniques soutiennent le cerveau tandis que le catabolisme musculaire reste contenu sur le court terme.",
    bodyTipFr: "Préparez votre prochain repas autour des protéines (œufs, poisson, poulet, yaourt grec) + fibres.",
    accentColor: "#A78BFA",
  },
  {
    id: "autophagy_zone",
    minHours: 20,
    maxHours: null,
    titleFr: "Recyclage Cellulaire & Zone OMAD",
    shortBadge: "20 h+",
    physiologicalSummaryFr:
      "Fenêtre étudiée pour la baisse de mTOR et les marqueurs de renouvellement cellulaire (NEJM, Anton et al.). Hydratation et électrolytes critiques.",
    bodyTipFr: "Rompez doucement le jeûne avec des protéines digestes et des légumes avant les féculents denses.",
    accentColor: "#F472B6",
  },
];

export const FASTING_SAFETY_CONTRAINDICATIONS: string[] = [
  "Grossesse, allaitement ou projet de grossesse immédiat.",
  "Âge inférieur à 18 ans ou IMC inférieur à 18,5.",
  "Antécédents ou fragilité liée aux troubles du comportement alimentaire (TCA).",
  "Diabète traité par insuline/sulfamides ou pathologie chronique sans accord médical.",
];

export function getProtocolSpec(id: FastingProtocolId): FastingProtocolSpec {
  return FASTING_PROTOCOLS.find((p) => p.id === id) ?? FASTING_PROTOCOLS[2];
}

export function formatDurationHms(ms: number): string {
  const safeSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(safeSec / 3600);
  const m = Math.floor((safeSec % 3600) / 60);
  const s = safeSec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatFrenchShortDateTime(iso: string, nowMs: number = Date.now()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--";
  const now = new Date(nowMs);
  const todayStr = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  const tomorrow = new Date(nowMs + 86400_000);
  const tomorrowStr = `${tomorrow.getFullYear()}-${tomorrow.getMonth()}-${tomorrow.getDate()}`;
  const targetStr = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const hhmm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  if (targetStr === todayStr) return `Aujourd'hui ${hhmm}`;
  if (targetStr === tomorrowStr) return `Demain ${hhmm}`;
  const day = d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  return `${day}, ${hhmm}`;
}

export interface FastingLiveStatus {
  mode: "idle" | "scheduled" | "fasting";
  protocol: FastingProtocolSpec;
  targetHours: number;
  headlineFr: string;
  countdownLabelFr: string;
  countdownHms: string;
  progress: number; // 0..1
  elapsedHours: number;
  remainingHours: number;
  startIso: string | null;
  endIso: string | null;
  currentPhase: FastingPhaseSpec;
  nextPhase: FastingPhaseSpec | null;
  hoursUntilNextPhase: number | null;
}

export function computeFastingLiveStatus(
  config: FastingConfig,
  nowMs: number = Date.now()
): FastingLiveStatus {
  const protocol = getProtocolSpec(config.protocolId);
  const targetHours = Math.max(12, Math.min(36, config.fastHours || protocol.fastHours || 16));
  const targetMs = targetHours * 3600_000;

  let effectiveStartMs: number | null = null;
  let scheduledMs: number | null = null;

  if (config.activeStartIso) {
    const parsed = Date.parse(config.activeStartIso);
    if (Number.isFinite(parsed)) {
      effectiveStartMs = parsed;
    }
  } else if (config.plannedStartIso) {
    const parsed = Date.parse(config.plannedStartIso);
    if (Number.isFinite(parsed)) {
      if (parsed > nowMs) {
        scheduledMs = parsed;
      } else {
        // L'heure prévue est arrivée : activation automatique du jeûne
        effectiveStartMs = parsed;
      }
    }
  }

  if (scheduledMs !== null) {
    const untilStartMs = Math.max(0, scheduledMs - nowMs);
    const endIso = new Date(scheduledMs + targetMs).toISOString();
    return {
      mode: "scheduled",
      protocol,
      targetHours,
      headlineFr: "Préparez-vous à jeûner !",
      countdownLabelFr: "Débute dans",
      countdownHms: formatDurationHms(untilStartMs),
      progress: 0,
      elapsedHours: 0,
      remainingHours: targetHours,
      startIso: new Date(scheduledMs).toISOString(),
      endIso,
      currentPhase: FASTING_PHASES[0],
      nextPhase: FASTING_PHASES[1],
      hoursUntilNextPhase: 4,
    };
  }

  if (effectiveStartMs !== null) {
    const elapsedMs = Math.max(0, nowMs - effectiveStartMs);
    const elapsedHours = +(elapsedMs / 3600_000).toFixed(2);
    const remainingMs = Math.max(0, targetMs - elapsedMs);
    const progress = Math.max(0, Math.min(1, elapsedMs / targetMs));
    const endIso = new Date(effectiveStartMs + targetMs).toISOString();

    let phaseIdx = 0;
    for (let i = 0; i < FASTING_PHASES.length; i++) {
      const p = FASTING_PHASES[i];
      if (elapsedHours >= p.minHours) phaseIdx = i;
    }
    const currentPhase = FASTING_PHASES[phaseIdx];
    const nextPhase = phaseIdx + 1 < FASTING_PHASES.length ? FASTING_PHASES[phaseIdx + 1] : null;
    const hoursUntilNextPhase = nextPhase
      ? +Math.max(0, nextPhase.minHours - elapsedHours).toFixed(1)
      : null;

    return {
      mode: "fasting",
      protocol,
      targetHours,
      headlineFr: remainingMs === 0 ? "Objectif atteint !" : "Jeûne en cours",
      countdownLabelFr: remainingMs === 0 ? "Temps accompli" : "Il reste",
      countdownHms: remainingMs === 0 ? formatDurationHms(elapsedMs) : formatDurationHms(remainingMs),
      progress,
      elapsedHours,
      remainingHours: +(remainingMs / 3600_000).toFixed(2),
      startIso: new Date(effectiveStartMs).toISOString(),
      endIso,
      currentPhase,
      nextPhase,
      hoursUntilNextPhase,
    };
  }

  return {
    mode: "idle",
    protocol,
    targetHours,
    headlineFr: "Prêt quand vous l'êtes",
    countdownLabelFr: "Durée cible",
    countdownHms: formatDurationHms(targetMs),
    progress: 0,
    elapsedHours: 0,
    remainingHours: targetHours,
    startIso: null,
    endIso: null,
    currentPhase: FASTING_PHASES[0],
    nextPhase: FASTING_PHASES[1],
    hoursUntilNextPhase: 4,
  };
}

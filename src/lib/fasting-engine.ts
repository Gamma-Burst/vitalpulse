import { FastingConfig, FastingPhaseId, FastingProtocolId, MealType } from "@/types/vitalpulse";

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

export function getDefaultEatingStartHm(id: FastingProtocolId): string {
  switch (id) {
    case "omad_23_1":
      return "19:00";
    case "20_4":
      return "17:00";
    case "18_6":
      return "13:00";
    case "16_8":
      return "12:00";
    case "14_10":
      return "10:00";
    case "12_12":
      return "08:00";
    default:
      return "12:00";
  }
}

export function formatAllowedDurationFr(hours: number): string {
  if (hours <= 0) return "0 minute";
  if (hours < 1) {
    const mins = Math.max(1, Math.round(hours * 60));
    return mins === 1 ? "1 minute" : `${mins} minutes`;
  }
  if (Math.abs(hours - 1) < 0.05) return "1 heure";
  if (Number.isInteger(hours)) return `${hours} heures`;
  return `${hours.toFixed(1).replace(".0", "")} heures`;
}

export function formatClockHm(isoOrMs: string | number): string {
  const d = typeof isoOrMs === "number" ? new Date(isoOrMs) : new Date(isoOrMs);
  if (Number.isNaN(d.getTime())) return "--";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function parseHmPair(hm?: string, fallbackId: FastingProtocolId = "16_8"): { hh: number; mm: number } {
  const source = hm && /^\d{1,2}:\d{2}$/.test(hm.trim()) ? hm.trim() : getDefaultEatingStartHm(fallbackId);
  const [hStr, mStr] = source.split(":");
  return {
    hh: Math.max(0, Math.min(23, Number(hStr) || 0)),
    mm: Math.max(0, Math.min(59, Number(mStr) || 0)),
  };
}

export interface FastingLiveStatus {
  mode: "idle" | "scheduled" | "fasting" | "eating_window";
  protocol: FastingProtocolSpec;
  targetHours: number;
  eatWindowHours: number;
  headlineFr: string;
  countdownLabelFr: string;
  countdownHms: string;
  progress: number; // 0..1
  elapsedHours: number;
  remainingHours: number;
  startIso: string | null;
  endIso: string | null;
  allowedEatSummaryFr: string;
  transitionKey: string | null;
  notificationPayload: { key: string; title: string; body: string } | null;
  currentPhase: FastingPhaseSpec;
  nextPhase: FastingPhaseSpec | null;
  hoursUntilNextPhase: number | null;
}

function buildFastingActiveStatus(params: {
  fastStartMs: number;
  fastEndMs: number;
  nowMs: number;
  targetHours: number;
  eatWindowHours: number;
  protocol: FastingProtocolSpec;
}): FastingLiveStatus {
  const { fastStartMs, fastEndMs, nowMs, targetHours, eatWindowHours, protocol } = params;
  const elapsedMs = Math.max(0, nowMs - fastStartMs);
  const elapsedHours = +(elapsedMs / 3600_000).toFixed(2);
  const spanMs = Math.max(1, fastEndMs - fastStartMs);
  const remainingMs = Math.max(0, fastEndMs - nowMs);
  const progress = Math.max(0, Math.min(1, elapsedMs / spanMs));

  let phaseIdx = 0;
  for (let i = 0; i < FASTING_PHASES.length; i++) {
    if (elapsedHours >= FASTING_PHASES[i].minHours) phaseIdx = i;
  }
  const currentPhase = FASTING_PHASES[phaseIdx];
  const nextPhase = phaseIdx + 1 < FASTING_PHASES.length ? FASTING_PHASES[phaseIdx + 1] : null;
  const hoursUntilNextPhase = nextPhase
    ? +Math.max(0, nextPhase.minHours - elapsedHours).toFixed(1)
    : null;

  const nextMealClock = formatClockHm(fastEndMs);
  const eatDurationText = eatWindowHours > 0 ? formatAllowedDurationFr(eatWindowHours) : "";
  const key = `fast-${new Date(fastStartMs).toISOString().slice(0, 16)}`;

  return {
    mode: "fasting",
    protocol,
    targetHours,
    eatWindowHours,
    headlineFr: remainingMs === 0 ? "Objectif atteint !" : "Période de jeûne en cours",
    countdownLabelFr: remainingMs === 0 ? "Temps accompli" : "Il reste",
    countdownHms: remainingMs === 0 ? formatDurationHms(elapsedMs) : formatDurationHms(remainingMs),
    progress,
    elapsedHours,
    remainingHours: +(remainingMs / 3600_000).toFixed(2),
    startIso: new Date(fastStartMs).toISOString(),
    endIso: new Date(fastEndMs).toISOString(),
    allowedEatSummaryFr:
      eatWindowHours > 0
        ? `En période de jeûne (${protocol.badge}) · Prochain repas autorisé à ${nextMealClock} pendant ${eatDurationText}`
        : `En période de jeûne (${protocol.badge}) · Fin prévue à ${nextMealClock}`,
    transitionKey: key,
    notificationPayload: {
      key,
      title: `⏳ Période de jeûne démarrée (${protocol.badge})`,
      body:
        eatWindowHours > 0
          ? `Votre fenêtre repas est terminée. Période de jeûne active pour ${targetHours} h — prochain repas autorisé à ${nextMealClock} pendant ${eatDurationText}.`
          : `Période de jeûne active pour ${targetHours} h — fin prévue à ${nextMealClock}. Hydratez-vous bien.`,
    },
    currentPhase,
    nextPhase,
    hoursUntilNextPhase,
  };
}

function buildEatingWindowStatus(params: {
  eatStartMs: number;
  eatEndMs: number;
  nowMs: number;
  targetHours: number;
  eatWindowHours: number;
  protocol: FastingProtocolSpec;
}): FastingLiveStatus {
  const { eatStartMs, eatEndMs, nowMs, targetHours, eatWindowHours, protocol } = params;
  const remainingMs = Math.max(0, eatEndMs - nowMs);
  const spanMs = Math.max(1, eatEndMs - eatStartMs);
  const progress = Math.max(0, Math.min(1, (nowMs - eatStartMs) / spanMs));
  const durationLabel = formatAllowedDurationFr(eatWindowHours);
  const startClock = formatClockHm(eatStartMs);
  const endClock = formatClockHm(eatEndMs);

  const isClosingSoon = eatWindowHours >= 1 && remainingMs > 0 && remainingMs <= 15 * 60_000;
  const eatKey = `eat-${new Date(eatStartMs).toISOString().slice(0, 16)}`;
  const closingKey = `closing15m-${new Date(eatEndMs).toISOString().slice(0, 16)}`;
  const key = isClosingSoon ? closingKey : eatKey;

  const notificationPayload = isClosingSoon
    ? {
        key: closingKey,
        title: "⏰ Fin de fenêtre repas dans moins de 15 min",
        body: `Il vous reste ${Math.max(1, Math.ceil(remainingMs / 60_000))} min pour terminer votre repas et boire de l'eau avant la reprise du jeûne (${targetHours} h).`,
      }
    : {
        key: eatKey,
        title: `🍽️ Vous pouvez manger ! (${protocol.badge})`,
        body: `Vous êtes autorisé à manger pendant ${durationLabel} (jusqu'à ${endClock}). Privilégiez protéines, fibres et hydratation.`,
      };

  return {
    mode: "eating_window",
    protocol,
    targetHours,
    eatWindowHours,
    headlineFr: "Fenêtre repas ouverte — Vous pouvez manger !",
    countdownLabelFr: "Temps autorisé restant",
    countdownHms: formatDurationHms(remainingMs),
    progress,
    elapsedHours: +((nowMs - eatStartMs) / 3600_000).toFixed(2),
    remainingHours: +(remainingMs / 3600_000).toFixed(2),
    startIso: new Date(eatStartMs).toISOString(),
    endIso: new Date(eatEndMs).toISOString(),
    allowedEatSummaryFr: `Vous êtes autorisé à manger pendant ${durationLabel} (de ${startClock} à ${endClock})`,
    transitionKey: key,
    notificationPayload,
    currentPhase: FASTING_PHASES[0],
    nextPhase: null,
    hoursUntilNextPhase: null,
  };
}

export function computeFastingLiveStatus(
  config: FastingConfig,
  nowMs: number = Date.now()
): FastingLiveStatus {
  const protocol = getProtocolSpec(config.protocolId);
  const targetHours = Math.max(12, Math.min(36, config.fastHours || protocol.fastHours || 16));
  const eatWindowHours =
    config.protocolId === "5_2"
      ? 0
      : Math.max(0, config.eatHours ?? protocol.eatHours ?? Math.max(0, 24 - targetHours));
  const targetMs = targetHours * 3600_000;
  const eatMs = eatWindowHours * 3600_000;

  if (config.protocolId === "none") {
    return {
      mode: "idle",
      protocol,
      targetHours,
      eatWindowHours: 0,
      headlineFr: "Prêt quand vous l'êtes",
      countdownLabelFr: "Sans jeûne actif",
      countdownHms: "--:--:--",
      progress: 0,
      elapsedHours: 0,
      remainingHours: 0,
      startIso: null,
      endIso: null,
      allowedEatSummaryFr:
        "Aucun protocole de jeûne activé — alimentation classique sans contrainte horaire.",
      transitionKey: null,
      notificationPayload: null,
      currentPhase: FASTING_PHASES[0],
      nextPhase: FASTING_PHASES[1],
      hoursUntilNextPhase: 4,
    };
  }

  if (config.plannedStartIso) {
    const parsedPlanned = Date.parse(config.plannedStartIso);
    if (Number.isFinite(parsedPlanned) && parsedPlanned > nowMs) {
      const untilStartMs = Math.max(0, parsedPlanned - nowMs);
      const endIso = new Date(parsedPlanned + targetMs).toISOString();
      return {
        mode: "scheduled",
        protocol,
        targetHours,
        eatWindowHours,
        headlineFr: "Préparez-vous à jeûner !",
        countdownLabelFr: "Débute dans",
        countdownHms: formatDurationHms(untilStartMs),
        progress: 0,
        elapsedHours: 0,
        remainingHours: targetHours,
        startIso: new Date(parsedPlanned).toISOString(),
        endIso,
        allowedEatSummaryFr: `Début prévu à ${formatClockHm(parsedPlanned)} · Prochain repas autorisé ensuite à ${formatClockHm(parsedPlanned + targetMs)}`,
        transitionKey: null,
        notificationPayload: null,
        currentPhase: FASTING_PHASES[0],
        nextPhase: FASTING_PHASES[1],
        hoursUntilNextPhase: 4,
      };
    }
  }

  let effectiveStartMs: number | null = null;
  if (config.eatingWindowStartIso && eatMs > 0) {
    const eatStartMs = Date.parse(config.eatingWindowStartIso);
    if (Number.isFinite(eatStartMs)) {
      if (nowMs < eatStartMs + eatMs) {
        return buildEatingWindowStatus({
          eatStartMs,
          eatEndMs: eatStartMs + eatMs,
          nowMs,
          targetHours,
          eatWindowHours,
          protocol,
        });
      }
      effectiveStartMs = eatStartMs + eatMs;
    }
  }

  if (effectiveStartMs === null && config.activeStartIso) {
    const parsed = Date.parse(config.activeStartIso);
    if (Number.isFinite(parsed)) effectiveStartMs = parsed;
  } else if (effectiveStartMs === null && config.plannedStartIso) {
    const parsed = Date.parse(config.plannedStartIso);
    if (Number.isFinite(parsed) && parsed <= nowMs) effectiveStartMs = parsed;
  }

  if (effectiveStartMs !== null) {
    const elapsedMs = Math.max(0, nowMs - effectiveStartMs);
    if (elapsedMs < targetMs || eatMs <= 0) {
      return buildFastingActiveStatus({
        fastStartMs: effectiveStartMs,
        fastEndMs: effectiveStartMs + targetMs,
        nowMs,
        targetHours,
        eatWindowHours,
        protocol,
      });
    }
    const cycleMs = targetMs + eatMs;
    const cycleIndex = Math.floor(elapsedMs / cycleMs);
    const cycleOffsetMs = elapsedMs % cycleMs;
    const cycleBaseMs = effectiveStartMs + cycleIndex * cycleMs;
    if (cycleOffsetMs >= targetMs) {
      return buildEatingWindowStatus({
        eatStartMs: cycleBaseMs + targetMs,
        eatEndMs: cycleBaseMs + cycleMs,
        nowMs,
        targetHours,
        eatWindowHours,
        protocol,
      });
    }
    return buildFastingActiveStatus({
      fastStartMs: cycleBaseMs,
      fastEndMs: cycleBaseMs + targetMs,
      nowMs,
      targetHours,
      eatWindowHours,
      protocol,
    });
  }

  if (config.dailyScheduleEnabled && eatMs > 0) {
    const { hh, mm } = parseHmPair(config.eatingWindowStartHm, config.protocolId);
    const dNow = new Date(nowMs);
    const candidateToday = new Date(
      dNow.getFullYear(),
      dNow.getMonth(),
      dNow.getDate(),
      hh,
      mm,
      0,
      0
    );
    const eatStartDate =
      candidateToday.getTime() > nowMs
        ? new Date(dNow.getFullYear(), dNow.getMonth(), dNow.getDate() - 1, hh, mm, 0, 0)
        : candidateToday;
    const eatStartMs = eatStartDate.getTime();
    const eatEndMs = eatStartMs + eatMs;

    if (nowMs >= eatStartMs && nowMs < eatEndMs) {
      return buildEatingWindowStatus({
        eatStartMs,
        eatEndMs,
        nowMs,
        targetHours,
        eatWindowHours,
        protocol,
      });
    }

    const nextEatStartMs = new Date(
      eatStartDate.getFullYear(),
      eatStartDate.getMonth(),
      eatStartDate.getDate() + 1,
      hh,
      mm,
      0,
      0
    ).getTime();

    return buildFastingActiveStatus({
      fastStartMs: eatEndMs,
      fastEndMs: nextEatStartMs,
      nowMs,
      targetHours,
      eatWindowHours,
      protocol,
    });
  }

  return {
    mode: "idle",
    protocol,
    targetHours,
    eatWindowHours,
    headlineFr: "Prêt quand vous l'êtes",
    countdownLabelFr: "Durée cible",
    countdownHms: formatDurationHms(targetMs),
    progress: 0,
    elapsedHours: 0,
    remainingHours: targetHours,
    startIso: null,
    endIso: null,
    allowedEatSummaryFr:
      eatWindowHours > 0
        ? `Protocole ${protocol.badge} · ${targetHours} h de jeûne, repas autorisé pendant ${formatAllowedDurationFr(eatWindowHours)}.`
        : protocol.subtitle,
    transitionKey: null,
    notificationPayload: null,
    currentPhase: FASTING_PHASES[0],
    nextPhase: FASTING_PHASES[1],
    hoursUntilNextPhase: 4,
  };
}

export interface MealSlotFastingStatus {
  mealType: MealType;
  labelFr: string;
  shortLabelFr: string;
  isFastedSlot: boolean;
  protocolBadge: string | null;
  eatingWindowLabel: string | null;
  pillBadgeFr: string | null;
  reasonFr: string | null;
}

const MEAL_SLOT_WINDOWS: ReadonlyArray<{
  mealType: MealType;
  labelFr: string;
  shortLabelFr: string;
  startMin: number;
  endMin: number;
  midMin: number;
}> = [
  { mealType: "breakfast", labelFr: "Petit-déjeuner", shortLabelFr: "Petit-déj", startMin: 360, endMin: 645, midMin: 510 },
  { mealType: "lunch", labelFr: "Déjeuner", shortLabelFr: "Déjeuner", startMin: 660, endMin: 885, midMin: 765 },
  { mealType: "snack", labelFr: "Collation", shortLabelFr: "Collation", startMin: 900, endMin: 1065, midMin: 982 },
  { mealType: "dinner", labelFr: "Dîner", shortLabelFr: "Dîner", startMin: 1080, endMin: 1350, midMin: 1200 },
];

function padTwoDigits(n: number): string {
  return String(n).padStart(2, "0");
}

function intervalOverlapMinutes(aStart: number, aEnd: number, bStart: number, bEnd: number): number {
  return Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart));
}

function circularMinuteDistance(a: number, b: number): number {
  const diff = Math.abs(((a % 1440) + 1440) % 1440 - (((b % 1440) + 1440) % 1440));
  return Math.min(diff, 1440 - diff);
}

/**
 * Détermine quels créneaux repas (Petit-déj, Déjeuner, Collation, Dîner) sont
 * automatiquement à "Néant (0 kcal)" en fonction du protocole de jeûne actif.
 */
export function getFastingMealSlotStatuses(
  config?: FastingConfig,
  preferredFasting?: FastingProtocolId
): Record<MealType, MealSlotFastingStatus> {
  const effectiveProtocolId: FastingProtocolId =
    config?.protocolId && config.protocolId !== "none"
      ? config.protocolId
      : preferredFasting && preferredFasting !== "none"
        ? preferredFasting
        : "none";

  const makeNeutral = (): Record<MealType, MealSlotFastingStatus> => ({
    breakfast: {
      mealType: "breakfast",
      labelFr: "Petit-déjeuner",
      shortLabelFr: "Petit-déj",
      isFastedSlot: false,
      protocolBadge: null,
      eatingWindowLabel: null,
      pillBadgeFr: null,
      reasonFr: null,
    },
    lunch: {
      mealType: "lunch",
      labelFr: "Déjeuner",
      shortLabelFr: "Déjeuner",
      isFastedSlot: false,
      protocolBadge: null,
      eatingWindowLabel: null,
      pillBadgeFr: null,
      reasonFr: null,
    },
    snack: {
      mealType: "snack",
      labelFr: "Collation",
      shortLabelFr: "Collation",
      isFastedSlot: false,
      protocolBadge: null,
      eatingWindowLabel: null,
      pillBadgeFr: null,
      reasonFr: null,
    },
    dinner: {
      mealType: "dinner",
      labelFr: "Dîner",
      shortLabelFr: "Dîner",
      isFastedSlot: false,
      protocolBadge: null,
      eatingWindowLabel: null,
      pillBadgeFr: null,
      reasonFr: null,
    },
  });

  if (effectiveProtocolId === "none" || effectiveProtocolId === "5_2") {
    return makeNeutral();
  }

  const spec = getProtocolSpec(effectiveProtocolId);
  const eatHours =
    config?.eatHours !== undefined && config.eatHours > 0 ? config.eatHours : spec.eatHours;

  if (eatHours <= 0 || eatHours >= 24) {
    return makeNeutral();
  }

  const { hh, mm } = parseHmPair(config?.eatingWindowStartHm, effectiveProtocolId);
  const eatStartMin = hh * 60 + mm;
  const eatDurationMin = Math.round(eatHours * 60);
  const eatEndMin = eatStartMin + eatDurationMin;
  const endNormMin = ((eatEndMin % 1440) + 1440) % 1440;
  const eatingWindowLabel = `${padTwoDigits(hh)}:${padTwoDigits(mm)}–${padTwoDigits(Math.floor(endNormMin / 60))}:${padTwoDigits(endNormMin % 60)}`;
  const protocolBadge = spec.badge;

  const out = {} as Record<MealType, MealSlotFastingStatus>;
  let openCount = 0;

  for (const slot of MEAL_SLOT_WINDOWS) {
    const overlapToday = intervalOverlapMinutes(eatStartMin, eatEndMin, slot.startMin, slot.endMin);
    const overlapNextDay = intervalOverlapMinutes(
      eatStartMin,
      eatEndMin,
      slot.startMin + 1440,
      slot.endMin + 1440
    );
    const isFastedSlot = Math.max(overlapToday, overlapNextDay) < 20;
    if (!isFastedSlot) openCount += 1;

    out[slot.mealType] = {
      mealType: slot.mealType,
      labelFr: slot.labelFr,
      shortLabelFr: slot.shortLabelFr,
      isFastedSlot,
      protocolBadge,
      eatingWindowLabel,
      pillBadgeFr: isFastedSlot ? `Néant · ${protocolBadge}` : null,
      reasonFr: isFastedSlot
        ? `Jeûne ${protocolBadge} actif (fenêtre repas ${eatingWindowLabel}) — ${slot.labelFr} : Néant (0 kcal).`
        : null,
    };
  }

  // Sécurité pour fenêtres horaires très tardives ou atypiques : garder au moins 1 créneau ouvert
  if (openCount === 0) {
    const eatMidMin = eatStartMin + eatDurationMin / 2;
    let closest = MEAL_SLOT_WINDOWS[MEAL_SLOT_WINDOWS.length - 1];
    let bestDist = Infinity;
    for (const slot of MEAL_SLOT_WINDOWS) {
      const dist = circularMinuteDistance(eatMidMin, slot.midMin);
      if (dist < bestDist) {
        bestDist = dist;
        closest = slot;
      }
    }
    out[closest.mealType] = {
      ...out[closest.mealType],
      isFastedSlot: false,
      pillBadgeFr: null,
      reasonFr: null,
    };
  }

  return out;
}

/**
 * Sélectionne automatiquement le meilleur créneau repas par défaut à l'ouverture,
 * en évitant les créneaux marqués "Néant" par le jeûne intermittent actif.
 */
export function getDefaultActiveMealSlot(
  config?: FastingConfig,
  preferredFasting?: FastingProtocolId,
  nowMs: number = Date.now()
): MealType {
  const statuses = getFastingMealSlotStatuses(config, preferredFasting);
  const hour = new Date(nowMs).getHours();
  const natural: MealType =
    hour < 11 ? "breakfast" : hour < 15 ? "lunch" : hour < 18 ? "snack" : "dinner";

  if (!statuses[natural].isFastedSlot) {
    return natural;
  }

  const fallbackOrder: MealType[] = ["lunch", "dinner", "snack", "breakfast"];
  return fallbackOrder.find((slot) => !statuses[slot].isFastedSlot) ?? "lunch";
}

import { resolveEffectiveAge } from "@/lib/metabolic-engine";
import type { FwAiWebSource } from "@/types/vitalpulse";

export interface FwAiContextPayload {
  profile: {
    name?: string;
    age: number;
    birthDate?: string;
    sex: "male" | "female";
    weightKg: number;
    targetWeightKg: number;
    primaryGoal: string;
    specialMode: string;
    athleticLevel?: string;
    favoriteSports?: string[];
    pregnant?: boolean;
  };
  anthro: {
    bmi: number;
    wthr?: number | null;
    targetIntakeKcal: number;
    clinicalFloorKcal: number;
    estimatedMaintenanceKcal: number;
    perMealProteinBolusG: number;
    minorSafetyLock?: boolean;
    targets: {
      proteinG: number;
      carbsG: number;
      fatG: number;
      fiberG: number;
      waterMl: number;
      sodiumMaxMg: number;
    };
  };
  todayBalance: {
    intakeKcal: number;
    targetIntakeKcal: number;
    sportRefuelKcal: number;
    remainingToTargetKcal: number;
    activeCaloriesKcal: number;
    workoutMinutes: number;
    rawSteps: number;
    waterMl: number;
    macros: {
      proteinG: number;
      carbsG: number;
      fatG: number;
      fiberG: number;
      sodiumMg: number;
    };
  };
  fasting?: {
    protocolId?: string;
    mode?: string;
    eatWindowHours?: number;
    countdownHms?: string;
  };
  weightTrend?: {
    currentRawKg?: number;
    currentEmaKg?: number;
    delta7dKg?: number;
  };
  latestBloodPanel?: {
    overallScore?: number;
    renalProteinGuardTriggered?: boolean;
    criticalFlags?: string[];
  };
}

export interface FwAiReplyResult {
  replyFr: string;
  quickActions: string[];
  provider: "openai-fw-ai" | "clinical-deterministic";
  safetyGuardTriggered: boolean;
  webSearchUsed?: boolean;
  sources?: FwAiWebSource[];
}

const EMERGENCY_PATTERN =
  /(douleur thoracique|mal (a|à) la poitrine|essoufflement brutal|palpitation|evanoui|évanoui|malaise|suicid|me faire du mal|envie de mourir)/i;

const ED_DANGER_PATTERN =
  /(anorex|boulim|me faire vomir|vomir expr[eè]s|laxatif|ne rien manger|je[ûu]ner 5 jours|je[ûu]ner une semaine|moins de 800 kcal|régime 600 kcal|regime 600 kcal)/i;

/**
 * Génère une réponse déterministe FW AI ancrée sur les garde-fous cliniques
 * et les métriques réelles du jour lorsque le mode hors-ligne / secours s'applique.
 */
export function buildDeterministicFwAiReply(params: {
  question: string;
  context?: FwAiContextPayload;
}): FwAiReplyResult {
  const q = (params.question || "").trim();
  const qLower = q.toLowerCase();
  const ctx = params.context;

  // 1. Urgences médicales prioritaires (codées en dur, jamais déléguées à l'IA seule)
  if (EMERGENCY_PATTERN.test(qLower)) {
    return {
      replyFr:
        "Votre message évoque un symptôme ou une détresse nécessitant une prise en charge médicale immédiate : j'interromps le coaching nutrition/sport. Appelez le 15 (SAMU) ou le 112 en Europe, le 3114 en France (prévention du suicide), ou le 988 aux États-Unis sans attendre.",
      quickActions: [],
      provider: "clinical-deterministic",
      safetyGuardTriggered: true,
    };
  }

  // 2. Détection troubles alimentaires / restriction extrême
  if (ED_DANGER_PATTERN.test(qLower)) {
    const floor = ctx?.anthro?.clinicalFloorKcal ?? 1400;
    return {
      replyFr: `Je ne peux pas recommander de jeûne prolongé dangereux ni d'apport sous votre plancher clinique (${floor} kcal/j). FolloWeight privilégie la santé métabolique et le bien-être durable : parlez-en à un médecin ou à un diététicien, et utilisez des objectifs doux sans culpabilité.`,
      quickActions: ["Voir mon bilan d'énergie du jour", "Activer le mode Journée douce"],
      provider: "clinical-deterministic",
      safetyGuardTriggered: true,
    };
  }

  const name = ctx?.profile?.name || "vous";
  const age = resolveEffectiveAge(ctx?.profile);
  const isMinor = age < 18 || Boolean(ctx?.anthro?.minorSafetyLock);
  const isPregnant = Boolean(ctx?.profile?.pregnant);
  const renalGuard = Boolean(ctx?.latestBloodPanel?.renalProteinGuardTriggered);

  // 3. Garde-fous grossesse ou mineur si la question demande déficit / jeûne strict / céto
  if (
    (isMinor || isPregnant) &&
    /(je[ûu]ne|omad|c[eé]to|keto|maigrir vite|d[eé]ficit|s[eè]che|perdre du poids)/i.test(qLower)
  ) {
    return {
      replyFr: isPregnant
        ? "Pendant la grossesse, FolloWeight désactive tout déficit calorique, jeûne intermittent ou régime cétogène strict afin de protéger votre santé et celle du bébé. Privilégiez l'équilibre nutritionnel avec votre sage-femme ou médecin."
        : "Avant 18 ans, FolloWeight verrouille automatiquement les modes de déficit strict et le jeûne prolongé pour préserver la croissance. Concentrez-vous sur des repas complets, le sommeil et le plaisir de bouger !",
      quickActions: ["Idée repas équilibré NOVA 1-2", "Bilan hydratation & pas"],
      provider: "clinical-deterministic",
      safetyGuardTriggered: true,
    };
  }

  const targetKcal = ctx?.todayBalance?.targetIntakeKcal ?? ctx?.anthro?.targetIntakeKcal ?? 2000;
  const intakeKcal = ctx?.todayBalance?.intakeKcal ?? 0;
  const remainingKcal = ctx?.todayBalance?.remainingToTargetKcal ?? Math.max(0, targetKcal - intakeKcal);
  const targetProt = ctx?.anthro?.targets?.proteinG ?? 120;
  const protToday = Math.round(ctx?.todayBalance?.macros?.proteinG ?? 0);
  const remProt = Math.max(0, targetProt - protToday);
  const bolusProt = ctx?.anthro?.perMealProteinBolusG ?? Math.round(targetProt / 4);
  const sportRefuel = ctx?.todayBalance?.sportRefuelKcal ?? 0;
  const workoutMins = ctx?.todayBalance?.workoutMinutes ?? 0;
  const waterMl = ctx?.todayBalance?.waterMl ?? 0;
  const waterGoalMl = ctx?.anthro?.targets?.waterMl ?? 2200;
  const steps = ctx?.todayBalance?.rawSteps ?? 0;
  const goal = ctx?.profile?.primaryGoal ?? "fat_loss";
  const mode = ctx?.profile?.specialMode ?? "standard";

  // 4. Question sur stagnation / variation balance / rétention sel
  if (/(stagne|plateau|grossi|pris du poids|balance|varie|sel|sodium|rétention)/i.test(qLower)) {
    const ema = ctx?.weightTrend?.currentEmaKg;
    const rawW = ctx?.weightTrend?.currentRawKg ?? ctx?.profile?.weightKg;
    const sodium = Math.round(ctx?.todayBalance?.macros?.sodiumMg ?? 0);
    return {
      replyFr: `Pas d'inquiétude ${name} : une hausse ponctuelle de 0,3 à 1 kg sur 24–48 h vient presque toujours d'eau et de glycogène (repas un peu plus salé ou grosse séance de sport), jamais de graisse fabriquée en une nuit.${
        ema && rawW
          ? ` Votre poids brut est à ${rawW} kg contre une tendance lissée EMA à ${ema} kg.`
          : ""
      }${
        sodium > 1800
          ? ` Aujourd'hui votre sodium est déjà à ${sodium} mg : buvez tranquillement jusqu'à ~${(
              waterGoalMl / 1000
            ).toFixed(1)} L d'eau et privilégiez légumes/potassium ce soir.`
          : ` Regardez votre courbe lissée EMA sur 14 jours et votre tour de taille plutôt que la pesée isolée.`
      }`,
      quickActions: ["Que manger léger ce soir ?", "Combien d'eau me reste-t-il ?"],
      provider: "clinical-deterministic",
      safetyGuardTriggered: false,
    };
  }

  // 5. Question sur prise de masse / protéines / sport / récupération
  if (
    /(masse|muscle|muscu|prot[eé]ine|leucine|sport|entra[îi]nement|foot|course|r[eé]cup[eé]ration)/i.test(
      qLower
    ) ||
    goal === "muscle_gain" ||
    goal === "athletic_performance"
  ) {
    if (/(bilan|sang|analyse|ferritine|glyc[eé]mie|dfg)/i.test(qLower)) {
      // Laisser passer à la branche bilan sanguin ci-dessous si c'est le sujet
    } else {
      const refuelNote =
        sportRefuel > 0
          ? ` Votre séance du jour (${workoutMins} min) a automatiquement ajouté +${sportRefuel} kcal de ravitaillement à votre cible (${targetKcal} kcal).`
          : "";
      const renalNote = renalGuard
        ? " Attention : votre dernier bilan a déclenché la prudence rénale (DFG < 60), limitez l'apport protéique avec votre médecin."
        : ` Pour stimuler au mieux la synthèse musculaire sans excès, visez ~${bolusProt} g de protéines (seuil leucine) par repas ; il vous reste ~${remProt} g pour atteindre vos ${targetProt} g du jour.`;
      return {
        replyFr: `${name}, vous êtes à ${protToday}/${targetProt} g de protéines et ${intakeKcal}/${targetKcal} kcal aujourd'hui.${refuelNote}${renalNote} Action concrète : ajoutez une collation ou assiette post-effort associant 30–35 g de protéines digestes (skyr, œufs, poulet, poisson ou tofu) et des glucides complexes.`,
        quickActions: [
          "Idée repas riche en protéines",
          "Analyse ma journée complète",
        ],
        provider: "clinical-deterministic",
        safetyGuardTriggered: false,
      };
    }
  }

  // 6. Question Jeûne / OMAD
  if (/(je[ûu]ne|omad|16:8|20:4|faim|fen[eê]tre|manger)/i.test(qLower)) {
    const fastProto = ctx?.fasting?.protocolId || "16_8";
    const fastMode = ctx?.fasting?.mode || "inactive";
    return {
      replyFr: `Côté jeûne (${fastProto.replace("_", ":")}, état : ${fastMode}), les pics de faim sont souvent des vagues de ghréline qui passent en 15–20 min. Pendant le jeûne strict : eau, thé ou café noir sans sucre ni lait. À l'ouverture de votre fenêtre (${
        ctx?.fasting?.eatWindowHours ?? 8
      } h autorisées), commencez par ~${bolusProt} g de protéines et des fibres avant les féculents pour éviter tout pic de fatigue.`,
      quickActions: [
        "Que manger à l'ouverture de fenêtre ?",
        "Mes macros restantes du jour",
      ],
      provider: "clinical-deterministic",
      safetyGuardTriggered: false,
    };
  }

  // 7. Question bilan sanguin
  if (/(bilan|sang|glyc[eé]mie|cholest|trigly|ferritine|foie|dfg|cr[eé]atinine)/i.test(qLower)) {
    const score = ctx?.latestBloodPanel?.overallScore;
    return {
      replyFr: score
        ? `Votre dernier bilan enregistré affiche un score pédagogique de ${score}/100${
            renalGuard
              ? " avec une alerte de protection rénale (DFG < 60 : protéines modérées à valider avec votre médecin)"
              : ""
          }. Je peux vous aider à comprendre chaque marqueur et adapter l'assiette, mais cet échange reste éducatif et ne remplace jamais un avis médical.`
        : "Importez ou saisissez votre dernier bilan sanguin dans l'onglet Corps & Bilans : FolloWeight calcule HOMA-IR, ratio TG/HDL, non-HDL, DFG (CKD-EPI 2021) et FIB-4 pour éclairer votre prochain rendez-vous médical.",
      quickActions: [
        "Quelles aliments améliorent mon bilan ?",
        "Analyse ma journée du jour",
      ],
      provider: "clinical-deterministic",
      safetyGuardTriggered: false,
    };
  }

  // 8. Réponse générale ultra-ancrée sur les vraies métriques du jour
  const ketoTip =
    mode === "ketogenic"
      ? " En mode cétogène, gardez les glucides très bas (< 10 g) sur le prochain repas (œufs/poisson + légumes verts + huile d'olive/avocat)."
      : ` Visez ~${remProt} g de protéines sur ~${Math.max(250, remainingKcal)} kcal restantes, avec de vrais légumes riches en fibres.`;

  return {
    replyFr: `Bilan en direct pour ${name} : vous avez consommé ${intakeKcal} kcal sur une cible de ${targetKcal} kcal (${remainingKcal >= 0 ? `reste ${remainingKcal} kcal` : `surplus de ${Math.abs(remainingKcal)} kcal`}), ${protToday}/${targetProt} g de protéines, ${steps} pas et ${waterMl}/${waterGoalMl} mL d'eau.${
      sportRefuel > 0 ? ` (+${sportRefuel} kcal déjà ajoutés pour votre séance de ${workoutMins} min.)` : ""
    }${ketoTip} Action immédiate : buvez un grand verre d'eau et préparez votre prochain repas avec l'onglet Frigo !`,
    quickActions: [
      "Idée dîner adapté à mon budget restant",
      "Pourquoi le poids varie sur la balance ?",
      "Comment optimiser protéines & sport ?",
    ],
    provider: "clinical-deterministic",
    safetyGuardTriggered: false,
  };
}

/**
 * Supprime les citations Markdown injectées en ligne par OpenAI Web Search
 * (les sources cliquables étant rendues séparément sous le message).
 */
export function cleanFwAiInlineCitations(text: string): string {
  return String(text || "")
    .replace(/\s*\(\[[^\]]+\]\(https?:\/\/[^)]+\)\)/g, "")
    .replace(/\[([^\]]+)\]\(https?:\/\/[^)]+\)/g, "$1")
    .replace(/\s+([.,;:!?])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ +\n/g, "\n")
    .trim();
}

/**
 * Extrait le JSON de réponse, l'indicateur web_search_call et jusqu'à 4 sources
 * nettoyées depuis la réponse structurée OpenAI `/v1/responses`.
 */
export function extractOpenAiResponsesWebData(output: unknown): {
  rawJsonText: string;
  webSearchUsed: boolean;
  sources: FwAiWebSource[];
} {
  let rawJsonText = "";
  let webSearchUsed = false;
  const sources: FwAiWebSource[] = [];
  const seenUrls = new Set<string>();

  if (!Array.isArray(output)) {
    return { rawJsonText, webSearchUsed, sources };
  }

  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const obj = item as Record<string, unknown>;
    if (obj.type === "web_search_call") {
      webSearchUsed = true;
      continue;
    }
    if (obj.type === "message" && Array.isArray(obj.content)) {
      for (const block of obj.content) {
        if (!block || typeof block !== "object") continue;
        const b = block as Record<string, unknown>;
        if (b.type === "output_text" && typeof b.text === "string") {
          rawJsonText += b.text;
          if (Array.isArray(b.annotations)) {
            for (const ann of b.annotations) {
              if (sources.length >= 4) continue;
              if (!ann || typeof ann !== "object") continue;
              const a = ann as Record<string, unknown>;
              if (a.type !== "url_citation" || typeof a.url !== "string") continue;
              try {
                const urlObj = new URL(a.url);
                urlObj.searchParams.delete("utm_source");
                const cleanUrl = urlObj.toString();
                if (seenUrls.has(cleanUrl)) continue;
                seenUrls.add(cleanUrl);
                const domain = urlObj.hostname.replace(/^www\./i, "");
                const title =
                  typeof a.title === "string" && a.title.trim()
                    ? a.title.trim()
                    : domain;
                sources.push({ title, url: cleanUrl, domain });
              } catch {
                // Ignore les URL malformées
              }
            }
          }
        }
      }
    }
  }

  return { rawJsonText, webSearchUsed, sources };
}

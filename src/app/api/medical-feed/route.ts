import { NextRequest, NextResponse } from "next/server";
import { MedicalEvidenceCard } from "@/types/vitalpulse";

export const runtime = "nodejs";

interface TopicConfig {
  labelFr: string;
  pubmedQuery: string;
  actionableTipFr: string;
  institutionalRef: string;
}

const TOPICS: Record<string, TopicConfig> = {
  weight_loss: {
    labelFr: "Perte de poids durable & Déficit sain",
    pubmedQuery:
      '(("caloric restriction"[Title] OR "weight loss"[Title]) AND ("systematic review"[pt] OR "meta-analysis"[pt]))',
    actionableTipFr:
      "Visez un déficit modéré de 300 à 500 kcal/j avec 1,6 à 1,8 g/kg de protéines pour protéger votre métabolisme de base.",
    institutionalRef: "HAS & NICE CG189 (2022) — Suivi pondéral & tour de taille",
  },
  muscle_protein: {
    labelFr: "Protéines & Préservation musculaire",
    pubmedQuery:
      '(("protein intake"[Title] OR "resistance training"[Title]) AND "lean mass"[Title/Abstract] AND ("meta-analysis"[pt] OR "systematic review"[pt]))',
    actionableTipFr:
      "Associez 25–35 g de protéines par repas et 2 courtes séances de renforcement par semaine pour préserver vos muscles.",
    institutionalRef: "ANSES & ESPEN — Besoins protéiques en restriction énergétique",
  },
  glycemic_nova: {
    labelFr: "Aliments Ultra-Transformés (NOVA) & Glycémie",
    pubmedQuery:
      '(("ultra-processed food"[Title] OR "glycemic load"[Title]) AND ("meta-analysis"[pt] OR "randomized controlled trial"[pt]))',
    actionableTipFr:
      "Privilégiez les aliments NOVA 1–2 et marchez 10 minutes après le repas le plus glucidique pour lisser le pic glycémique.",
    institutionalRef: "Inserm / Santé Publique France — Score NOVA & Nutrition",
  },
  vilpa_exercise: {
    labelFr: "Micro-activité (VILPA) & Dépense énergétique",
    pubmedQuery:
      '(("vigorous intermittent lifestyle physical activity"[Title/Abstract] OR "postprandial walking"[Title/Abstract]) AND ("mortality"[Title/Abstract] OR "glucose"[Title/Abstract]))',
    actionableTipFr:
      "Les jours sans temps ni motivation, 3 blocs de 1 minute intense (escaliers ou marche rapide) protègent déjà le cœur.",
    institutionalRef: "Compendium of Physical Activities 2024 & Nature Medicine (VILPA)",
  },
  glp1_nutrition: {
    labelFr: "Accompagnement GLP-1 & Satiété",
    pubmedQuery:
      '(("semaglutide"[Title] OR "GLP-1"[Title]) AND ("body composition"[Title/Abstract] OR "lean mass"[Title/Abstract] OR "nutrition"[Title/Abstract]))',
    actionableTipFr:
      "Priorisez les protéines d'abord dans l'assiette, 28–32 g de fibres progressives et une hydratation régulière.",
    institutionalRef: "Recommandations cliniques nutrition & préservation masse maigre",
  },
};

const CORE_INSTITUTIONAL_CARDS: MedicalEvidenceCard[] = [
  {
    id: "ref-anses-ciqual",
    topic: "weight_loss",
    title: "Table officielle ANSES Ciqual & repères PNNS",
    source: "ANSES (France)",
    year: "2024",
    evidenceLevel: "Référentiel national officiel",
    url: "https://ciqual.anses.fr/",
    summaryFr:
      "Base officielle de composition nutritionnelle (macronutriments, fibres, sodium, vitamines et minéraux) utilisée pour ancrer chaque scan de plat.",
    actionableTip: "Repère fibres ANSES : 30 g/j pour la satiété et la santé du microbiote.",
  },
  {
    id: "ref-nice-wthr",
    topic: "weight_loss",
    title: "Ratio Tour de Taille / Taille (WtHR < 0,50) & Body Roundness Index",
    source: "NICE CG189 & JAMA Network Open",
    year: "2024",
    evidenceLevel: "Recommandation clinique & Cohorte",
    url: "https://www.nice.org.uk/guidance/cg189",
    summaryFr:
      "Maintenir un tour de taille inférieur à la moitié de la taille (WtHR < 0,50) et un BRI entre 3,4 et 5,4 reflète mieux le risque viscéral que l'IMC seul.",
    actionableTip: "Mesurez votre tour de taille au niveau du nombril une fois par semaine, le matin.",
  },
  {
    id: "ref-compendium-2024",
    topic: "vilpa_exercise",
    title: "2024 Adult Compendium of Physical Activities",
    source: "Arizona State / NIH",
    year: "2024",
    evidenceLevel: "Standard épidémiologique mondial",
    url: "https://pacompendium.com/",
    summaryFr:
      "Référentiel de > 1 100 activités physiques par MET. FolloWeight soustrait le métabolisme de repos (MET − 1) et les pas de séance pour éviter tout double comptage.",
    actionableTip: "Cumulez pas quotidiens hors-séance + courtes séances chronométrées.",
  },
  {
    id: "ref-who-sodium",
    topic: "glycemic_nova",
    title: "Recommandations OMS : Sodium (< 2 000 mg/j) & Sucres libres",
    source: "Organisation Mondiale de la Santé",
    year: "2024",
    evidenceLevel: "Directive internationale OMS",
    url: "https://www.who.int/news-room/fact-sheets/detail/salt-reduction",
    summaryFr:
      "Un dépassement ponctuel de sel explique fréquemment une hausse de +0,4 à +1 kg sur la balance le lendemain par simple rétention hydrique.",
    actionableTip: "Visez ≤ 2 000 mg de sodium (5 g de sel) et compensez par des aliments riches en potassium.",
  },
];

const cache = new Map<string, { expiresAt: number; payload: unknown }>();

export async function GET(req: NextRequest) {
  const topicParam = req.nextUrl.searchParams.get("topic") || "weight_loss";
  const cfg = TOPICS[topicParam] || TOPICS.weight_loss;

  const cached = cache.get(topicParam);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.payload);
  }

  let livePubmedCards: MedicalEvidenceCard[] = [];
  let pubmedLiveOk = false;

  try {
    const esearchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&retmax=4&sort=date&term=${encodeURIComponent(cfg.pubmedQuery)}`;
    const searchRes = await fetch(esearchUrl, { signal: AbortSignal.timeout(7000) });
    if (searchRes.ok) {
      const searchJson = await searchRes.json();
      const ids: string[] = searchJson?.esearchresult?.idlist || [];
      if (ids.length > 0) {
        const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id=${ids.join(",")}`;
        const sumRes = await fetch(summaryUrl, { signal: AbortSignal.timeout(7000) });
        if (sumRes.ok) {
          const sumJson = await sumRes.json();
          const resultObj = sumJson?.result || {};
          livePubmedCards = ids
            .map((pmid): MedicalEvidenceCard | null => {
              const doc = resultObj[pmid];
              if (!doc || !doc.title) return null;
              const pubYear = String(doc.pubdate || "").slice(0, 4) || "2025";
              const journal = String(doc.fulljournalname || doc.source || "PubMed Peer-Reviewed");
              return {
                id: `pmid-${pmid}`,
                topic: topicParam,
                title: String(doc.title).replace(/\.$/, ""),
                source: journal,
                year: pubYear,
                evidenceLevel: "Étude / Synthèse indexée PubMed",
                pmid,
                url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
                summaryFr: `Publication indexée sur NCBI PubMed (${journal}, ${pubYear}) rattachée à l'axe « ${cfg.labelFr} ».`,
                actionableTip: cfg.actionableTipFr,
              };
            })
            .filter((x): x is MedicalEvidenceCard => x !== null);
          pubmedLiveOk = livePubmedCards.length > 0;
        }
      }
    }
  } catch (err) {
    console.warn("PubMed live fetch fallback:", err);
  }

  const payload = {
    topic: topicParam,
    topicLabelFr: cfg.labelFr,
    institutionalRef: cfg.institutionalRef,
    fetchedAt: new Date().toISOString(),
    pubmedLiveOk,
    liveArticles: livePubmedCards,
    institutionalBaseline: CORE_INSTITUTIONAL_CARDS,
  };

  if (pubmedLiveOk) {
    cache.set(topicParam, { expiresAt: Date.now() + 30 * 60 * 1000, payload });
  }

  return NextResponse.json(payload);
}

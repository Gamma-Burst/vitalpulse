import type {
  BloodBiomarkerKey,
  FastingPhaseId,
  FastingProtocolId,
} from "@/types/vitalpulse";

export type GlossaryCategory =
  | "poids_corps"
  | "energie_sport"
  | "nutrition_nova"
  | "jeune_metabolisme"
  | "bilan_sanguin";

export const GLOSSARY_CATEGORY_META: Record<
  GlossaryCategory,
  { labelFr: string; badgeClass: string }
> = {
  poids_corps: {
    labelFr: "Poids & Corps",
    badgeClass: "bg-cyan-500/15 text-cyan-200 border-cyan-400/30",
  },
  energie_sport: {
    labelFr: "Énergie & Sport",
    badgeClass: "bg-amber-500/15 text-amber-200 border-amber-400/30",
  },
  nutrition_nova: {
    labelFr: "Nutrition & Régimes",
    badgeClass: "bg-emerald-500/15 text-emerald-200 border-emerald-400/30",
  },
  jeune_metabolisme: {
    labelFr: "Jeûne & Montres",
    badgeClass: "bg-violet-500/15 text-violet-200 border-violet-400/30",
  },
  bilan_sanguin: {
    labelFr: "Bilan Sanguin",
    badgeClass: "bg-rose-500/15 text-rose-200 border-rose-400/30",
  },
};

export type GlossaryTermId =
  // Poids & Corps
  | "weight_ema"
  | "scale_decoder"
  | "bmi"
  | "wthr"
  | "bri"
  | "rfm"
  | "us_navy_bf"
  | "ffmi"
  | "whr"
  | "base100_chart"
  // Énergie & Sport
  | "bmr"
  | "tdee"
  | "net_balance"
  | "tef"
  | "neat_dedup"
  | "met"
  | "rpe"
  | "vilpa"
  | "weekly_bank"
  | "lean_bulk"
  | "leucine_threshold"
  | "athletic_refuel"
  // Nutrition & Modes
  | "nova"
  | "nutriscore"
  | "glycemic_load"
  | "satiety_score"
  | "sodium_oms"
  | "hydration_efsa"
  | "diet_rebalancing"
  | "diet_ketogenic"
  | "diet_glycemic_shield"
  | "diet_glp1"
  // Jeûne, Phases & Montres
  | "fasting_12_12"
  | "fasting_14_10"
  | "fasting_16_8"
  | "fasting_18_6"
  | "fasting_20_4"
  | "fasting_omad"
  | "fasting_5_2"
  | "fasting_custom"
  | "fasting_daily_cycle"
  | "phase_digestion"
  | "phase_glycemic_calm"
  | "phase_metabolic_switch"
  | "phase_lipolysis"
  | "phase_ketosis"
  | "phase_autophagy"
  | "ble_hr_0x180d"
  // Bilan Sanguin (20 biomarqueurs + 5 ratios)
  | "blood_fastingGlucose"
  | "blood_hba1c"
  | "blood_fastingInsulin"
  | "blood_totalCholesterol"
  | "blood_hdlCholesterol"
  | "blood_ldlCholesterol"
  | "blood_triglycerides"
  | "blood_apob"
  | "blood_creatinine"
  | "blood_alat"
  | "blood_asat"
  | "blood_ggt"
  | "blood_platelets"
  | "blood_ferritin"
  | "blood_tsh"
  | "blood_crpUs"
  | "blood_vitD"
  | "blood_vitB12"
  | "blood_hemoglobin"
  | "blood_uricAcid"
  | "blood_homa_ir"
  | "blood_non_hdl"
  | "blood_tg_hdl_ratio"
  | "blood_egfr_ckdepi_2021"
  | "blood_fib4";

export interface GlossaryEntry {
  id: GlossaryTermId;
  titleFr: string;
  shortTagFr: string;
  category: GlossaryCategory;
  simpleFr: string;
  exampleFr: string;
  benchmarkFr: string;
  keywords: string[];
}

export const GLOSSARY_TERMS: Record<GlossaryTermId, GlossaryEntry> = {
  weight_ema: {
    id: "weight_ema",
    titleFr: "Poids lissé EMA (Tendance réelle)",
    shortTagFr: "Amortisseur sur 7 jours",
    category: "poids_corps",
    simpleFr:
      "C'est la vraie direction de votre poids, débarrassée des faux sauts d'eau d'un matin à l'autre. Au lieu de faire une simple moyenne, elle donne plus d'importance à vos pesées récentes qu'aux anciennes.",
    exampleFr:
      "Imaginez les amortisseurs d'une voiture : la route (votre balance du matin) a des bosses d'eau à cause d'une pizza salée (+1,1 kg le lendemain), mais l'EMA garde une trajectoire douce qui montre si vous perdez vraiment du gras.",
    benchmarkFr:
      "Regardez surtout la courbe lissée EMA plutôt que le chiffre brut d'un seul matin. Si l'EMA baisse de 0,2 à 0,7 kg par semaine, vous êtes exactement dans le bon rythme.",
    keywords: ["ema", "poids lisse", "moyenne mobile exponentielle", "tendance", "balance", "fluctuation"],
  },
  scale_decoder: {
    id: "scale_decoder",
    titleFr: "Décodeur de balance (Eau, Sel & Glycogène)",
    shortTagFr: "Anti-panique pesée",
    category: "poids_corps",
    simpleFr:
      "Un indicateur qui explique pourquoi la balance peut monter brusquement en 24 heures alors que vous n'avez pas pris de graisse. Pour fabriquer 1 kg de vraie graisse, il faudrait manger environ 7 700 kcal en trop.",
    exampleFr:
      "Un dîner un peu plus salé ou riche en pâtes retient 3 à 4 g d'eau par gramme de glucide stocké (glycogène) : +800 g sur la balance le matin = de l'eau passagère, pas du gras.",
    benchmarkFr:
      "Quand l'alerte rétention d'eau s'allume, buvez normalement, réduisez un peu le sel sur 24–48 h et observez l'EMA qui redescend toute seule.",
    keywords: ["decodeur", "retention eau", "sel", "glycogene", "prise soudaine", "balance"],
  },
  bmi: {
    id: "bmi",
    titleFr: "IMC (Indice de Masse Corporelle)",
    shortTagFr: "Poids ÷ Taille²",
    category: "poids_corps",
    simpleFr:
      "Un repère médical mondial qui compare votre poids à votre taille. Attention : l'IMC ne sait pas faire la différence entre du muscle lourd et de la graisse.",
    exampleFr:
      "Un joueur de rugby très musclé de 1,80 m et 95 kg a un IMC de « surpoids/obésité », alors que son ventre est plat : c'est pour cela qu'on le complète avec le tour de taille.",
    benchmarkFr:
      "Zone standard OMS : 18,5 à 24,9. Chez FolloWeight, regardez-le toujours en duo avec le WtHR (tour de taille / hauteur) et le % de masse grasse.",
    keywords: ["imc", "bmi", "poids taille", "oms", "corpulence"],
  },
  wthr: {
    id: "wthr",
    titleFr: "Ratio Tour de taille / Hauteur (WtHR)",
    shortTagFr: "Règle < 0,50",
    category: "poids_corps",
    simpleFr:
      "On divise votre tour de taille en centimètres par votre grandeur en centimètres. C'est l'un des meilleurs indicateurs de graisse viscérale (autour des organes), bien plus précis que l'IMC seul.",
    exampleFr:
      "Si vous mesurez 174 cm, la règle d'or est simple : votre tour de taille devrait rester sous la moitié de votre taille, soit en dessous de 87 cm.",
    benchmarkFr:
      "Sous 0,50 = zone métabolique très saine. Entre 0,50 et 0,59 = zone à surveiller. Au-dessus de 0,60 = graisse abdominale à réduire en priorité.",
    keywords: ["wthr", "tour de taille", "hauteur", "graisse viscerale", "0.5"],
  },
  bri: {
    id: "bri",
    titleFr: "BRI (Indice de Rondeur Corporelle)",
    shortTagFr: "Forme & ceinture abdominale",
    category: "poids_corps",
    simpleFr:
      "Un score géométrique moderne (Body Roundness Index) qui imagine le corps comme une ellipse à partir de la taille et du tour de taille pour estimer plus finement la graisse interne.",
    exampleFr:
      "Deux personnes de même poids et même taille auront un BRI très différent si l'une stocke surtout au niveau du ventre et l'autre de façon uniforme.",
    benchmarkFr:
      "Zone optimale souvent située entre 2,5 et 4,5 chez l'adulte. Voir votre BRI descendre confirme que votre sangle abdominale s'affine.",
    keywords: ["bri", "body roundness index", "rondeur", "ventre", "abdominale"],
  },
  rfm: {
    id: "rfm",
    titleFr: "RFM (Masse Grasse Relative Estimée)",
    shortTagFr: "% Gras sans balance spéciale",
    category: "poids_corps",
    simpleFr:
      "Une formule scientifique validée (Relative Fat Mass) qui estime votre pourcentage de graisse corporelle uniquement avec votre taille, votre tour de taille et votre sexe — plus fiable que beaucoup de balances impédancemètres.",
    exampleFr:
      "Au lieu d'être faussée par un grand verre d'eau comme une balance électrique, la formule RFM suit directement l'épaisseur de votre tour de taille.",
    benchmarkFr:
      "Repères courants : 14–22 % chez l'homme actif, 22–30 % chez la femme active. La tendance à la baisse compte plus qu'un chiffre isolé.",
    keywords: ["rfm", "masse grasse", "relative fat mass", "pourcentage gras", "body fat"],
  },
  us_navy_bf: {
    id: "us_navy_bf",
    titleFr: "% Masse Grasse US Navy (Mensurations)",
    shortTagFr: "Cou + Taille (+ Hanches)",
    category: "poids_corps",
    simpleFr:
      "Une méthode célèbre créée par la marine américaine : en comparant votre tour de taille (et de hanches chez la femme) à votre tour de cou et votre grandeur, on estime très bien la graisse et le muscle.",
    exampleFr:
      "Si votre poids reste bloqué à 78 kg mais que votre tour de taille perd 2 cm tandis que le cou ne bouge pas, la méthode US Navy prouve que vous perdez du gras et gagnez du muscle.",
    benchmarkFr:
      "Prenez les mesures le matin à jeun avec un mètre ruban souple sans serrer la peau, toujours au même endroit (au nombril).",
    keywords: ["us navy", "mensurations", "cou", "hanches", "masse grasse croisee"],
  },
  ffmi: {
    id: "ffmi",
    titleFr: "FFMI (Indice de Masse Maigre / Muscle)",
    shortTagFr: "Capital musculaire",
    category: "poids_corps",
    simpleFr:
      "Il mesure la quantité de muscles et tissus non-gras que vous portez par rapport à votre taille, un peu comme un « IMC uniquement pour le muscle ».",
    exampleFr:
      "Pendant un régime, si le FFMI reste stable ou monte légèrement pendant que la graisse descend, cela veut dire que vous ne perdez pas votre précieux muscle.",
    benchmarkFr:
      "Repères naturels courants : ~18–21 chez l'homme, ~15–18 chez la femme. Plus vous protégez vos protéines (1,4–1,8 g/kg), plus votre FFMI reste solide.",
    keywords: ["ffmi", "masse maigre", "muscle", "recomposition", "indice musculaire"],
  },
  whr: {
    id: "whr",
    titleFr: "Ratio Taille / Hanches (WHR OMS)",
    shortTagFr: "Répartition pomme / poire",
    category: "poids_corps",
    simpleFr:
      "Le rapport entre votre tour de taille et votre tour de hanches. Il montre si votre corps stocke plutôt au niveau du ventre (profil pomme) ou des hanches/cuisses (profil poire).",
    exampleFr:
      "Un tour de taille de 82 cm pour 100 cm de hanches donne un ratio de 0,82 — considéré comme protecteur.",
    benchmarkFr:
      "Seuils OMS : idéalement en dessous de 0,90 chez l'homme et 0,85 chez la femme.",
    keywords: ["whr", "taille hanches", "oms", "pomme", "poire", "silhouette"],
  },
  base100_chart: {
    id: "base100_chart",
    titleFr: "Courbe normalisée Base 100",
    shortTagFr: "Comparer kg et cm ensemble",
    category: "poids_corps",
    simpleFr:
      "Pour comparer des pommes et des poires (des kilos et des centimètres) sur le même graphique, toutes vos mesures démarrent à 100 le jour 1 : descendre à 95 veut dire -5 % depuis le départ.",
    exampleFr:
      "Votre poids passe peut-être de 100 à 97 (-3 %), pendant que votre tour de taille plonge de 100 à 93 (-7 %) : on voit d'un coup d'œil quelle zone répond le mieux.",
    benchmarkFr:
      "Idéal pour repérer une recomposition corporelle : même si la courbe Poids stagne autour de 99, une courbe Taille qui descend sous 95 est une énorme victoire.",
    keywords: ["base 100", "normalisee", "pourcentage", "graphique", "mensurations"],
  },
  bmr: {
    id: "bmr",
    titleFr: "BMR / MB (Métabolisme de base au repos)",
    shortTagFr: "Énergie vitale au repos · Mifflin-St Jeor & EFSA",
    category: "energie_sport",
    simpleFr:
      "Le nombre de calories que votre corps brûle automatiquement en 24 heures juste pour faire battre votre cœur, respirer, alimenter le cerveau et maintenir votre température à 37 °C au repos complet. Calculé via Mifflin-St Jeor (validé par l'Academy of Nutrition & Dietetics) et recoupé par l'équation d'Oxford / Henry (adoptée par l'EFSA 2013).",
    exampleFr:
      "C'est la consommation d'une voiture au point mort moteur allumé. Selon l'EFSA et l'OMS, le métabolisme de base représente 60 à 75 % de toute l'énergie dépensée dans la journée ; le reste vient des pas, du NEAT, de la digestion et du sport (facteur PAL 1,4 à 2,0).",
    benchmarkFr:
      "Selon le NIH (NIDDK) et l'ANSES, un déficit sain (-300 à -600 kcal sur la dépense totale) doit idéalement garder vos apports quotidiens au-dessus du MB afin de préserver la masse musculaire et éviter la fatigue métabolique.",
    keywords: ["bmr", "mb", "metabolisme de base", "repos", "mifflin", "efsa", "henry", "calories minimum"],
  },
  tdee: {
    id: "tdee",
    titleFr: "TDEE (Dépense totale de maintien)",
    shortTagFr: "Tout ce que vous brûlez/jour",
    category: "energie_sport",
    simpleFr:
      "C'est l'addition complète de votre métabolisme de repos (BMR) + vos pas du quotidien + vos séances de sport + l'énergie pour digérer. C'est votre vrai budget calorique de maintien.",
    exampleFr:
      "Si votre TDEE est de 2 300 kcal et que vous mangez 2 300 kcal, votre poids reste stable. À 1 850 kcal, vous créez un déficit doux de 450 kcal pour perdre du gras.",
    benchmarkFr:
      "FolloWeight ajuste votre TDEE dynamiquement chaque jour en fonction de vos vrais pas et séances enregistrés.",
    keywords: ["tdee", "depense totale", "maintien", "besoins journaliers", "calories"],
  },
  net_balance: {
    id: "net_balance",
    titleFr: "Bilan calorique net (Déficit vs Métabolisme de base)",
    shortTagFr: "Mangé − (MB + Activité)",
    category: "energie_sport",
    simpleFr:
      "La différence entre les calories que vous avez mangées aujourd'hui et votre dépense totale réelle (Métabolisme de base MB + pas + NEAT + sport + digestion). Le déficit lié au métabolisme de base montre si vos apports couvrent d'abord l'énergie vitale (MB) tout en restant en dessous de la dépense totale.",
    exampleFr:
      "Exemple NIH / ANSES : MB = 1 650 kcal, activité + pas = +550 kcal → Dépense totale = 2 200 kcal. Si vous mangez 1 750 kcal, vous couvrez votre MB (+100 kcal au-dessus du MB) tout en créant un déficit réel de -450 kcal.",
    benchmarkFr:
      "Visez un déficit entre -300 et -600 kcal sur la dépense totale (10 à 25 % sous la maintenance EFSA/ANSES), sans descendre durablement sous le MB.",
    keywords: ["bilan net", "deficit", "surplus", "metabolisme de base", "calorique", "mange depense", "nih", "anses"],
  },
  tef: {
    id: "tef",
    titleFr: "TEF (Effet thermique des aliments)",
    shortTagFr: "Calories brûlées à digérer",
    category: "energie_sport",
    simpleFr:
      "Digérer un repas demande du travail à l'estomac et à l'intestin : votre corps dépense environ 10 % des calories du repas rien que pour le découper et l'absorber (encore plus pour les protéines : ~20–25 % !).",
    exampleFr:
      "Pour 100 kcal de blanc de poulet ou œufs, votre corps dépense environ 20–25 kcal juste pour les digérer, contre seulement ~3 kcal pour de l'huile pure.",
    benchmarkFr:
      "Miser sur des protéines et des aliments peu transformés augmente naturellement votre TEF sans bouger davantage.",
    keywords: ["tef", "effet thermique", "digestion", "proteines", "thermogenese"],
  },
  neat_dedup: {
    id: "neat_dedup",
    titleFr: "Pas hors-séance (NEAT) & Anti-double comptage",
    shortTagFr: "Zéro calories comptées 2 fois",
    category: "energie_sport",
    simpleFr:
      "Le NEAT regroupe toute l'activité hors salle de sport (marcher, faire les courses, monter les escaliers). FolloWeight retire automatiquement les pas faits PENDANT une séance de marche/course enregistrée pour ne jamais gonfler vos calories brûlées.",
    exampleFr:
      "Si votre compteur indique 8 000 pas dont 3 000 pas faits pendant votre footing déjà saisi en séance, l'app ne compte les 3 000 pas qu'une seule fois !",
    benchmarkFr:
      "Le NEAT pèse souvent plus sur l'année que 2 h de sport : viser 7 000 à 9 000 pas/jour accélère nettement la perte de tour de taille.",
    keywords: ["neat", "double comptage", "dedupliques", "pas hors seance", "podometre"],
  },
  met: {
    id: "met",
    titleFr: "MET (Intensité d'un exercice)",
    shortTagFr: "1 MET = repos total",
    category: "energie_sport",
    simpleFr:
      "Une unité internationale qui mesure combien d'énergie un mouvement demande par rapport au fait d'être assis tranquille (1 MET).",
    exampleFr:
      "Marcher tranquillement = ~3,5 MET (3,5 fois l'effort du repos). Monter des escaliers d'un bon pas = ~8 MET. Courir vite = ~10 MET.",
    benchmarkFr:
      "Les activités de 3 à 6 MET (marche rapide, vélo doux) sont idéales tous les jours car elles brûlent du gras sans épuiser ni donner faim.",
    keywords: ["met", "intensite", "depense sport", "calories exercice"],
  },
  rpe: {
    id: "rpe",
    titleFr: "RPE 1–10 (Échelle d'effort ressenti)",
    shortTagFr: "Comment vous vous sentez",
    category: "energie_sport",
    simpleFr:
      "Votre note personnelle de difficulté de 1 (super facile, balade) à 10 (sprint maximal impossible à tenir). Cela permet d'adapter le calcul des calories à votre vrai essoufflement du jour.",
    exampleFr:
      "RPE 4 = vous pouvez parler en phrases complètes sans problème. RPE 7 = vous ne pouvez dire que 3 ou 4 mots avant de reprendre votre souffle.",
    benchmarkFr:
      "La plupart des séances santé gagnent à rester entre RPE 4 et RPE 7 : régularité maximale et zéro blessure.",
    keywords: ["rpe", "effort ressenti", "difficulte", "borg", "essoufflement"],
  },
  vilpa: {
    id: "vilpa",
    titleFr: "VILPA (Micro-efforts vigoureux d'1 à 2 min)",
    shortTagFr: "Mini-boosts dans la journée",
    category: "energie_sport",
    simpleFr:
      "Faire 3 ou 4 mini-efforts dynamiques d'une ou deux minutes disséminés dans la journée normale (monter deux étages d'un coup, marcher vite pour attraper le bus). Les études médicales récentes montrent un impact majeur sur le cœur.",
    exampleFr:
      "Pas besoin de tenue de sport : 90 secondes de squats au salon ou de montée d'escaliers dynamique entre deux tâches comptent comme une vraie VILPA.",
    benchmarkFr:
      "Cumuler seulement 3×1–2 min de VILPA par jour réduit fortement les risques cardiovasculaires même sans aller à la salle.",
    keywords: ["vilpa", "micro efforts", "2 min", "sos", "escaliers", "cardio rapide"],
  },
  weekly_bank: {
    id: "weekly_bank",
    titleFr: "Banque calorique hebdomadaire (7 jours)",
    shortTagFr: "Vision semaine anti-culpabilité",
    category: "energie_sport",
    simpleFr:
      "Votre corps ne remet pas le compteur à zéro à minuit : c'est la moyenne sur toute la semaine qui fait maigrir ou grossir. Cette banque calcule combien de calories il vous reste sur les 7 jours.",
    exampleFr:
      "Si vous prévoyez un resto convivial samedi (+600 kcal), manger 150 kcal de moins sur quatre autres jours garde votre total semaine pile à l'objectif !",
    benchmarkFr:
      "Un écart isolé ne gâche jamais une semaine ; évitez juste d'enchaîner 3 gros surplus sans compenser en douceur.",
    keywords: ["banque hebdo", "7 jours", "semaine", "restaurant", "budget hebdomadaire"],
  },
  lean_bulk: {
    id: "lean_bulk",
    titleFr: "Prise de masse propre (Lean Bulk ISSN)",
    shortTagFr: "Muscle sec, minimal gras",
    category: "energie_sport",
    simpleFr:
      "Au lieu de manger énormément pour grossir vite (ce qui stocke surtout du gras abdominal), le Lean Bulk ajoute un léger surplus contrôlé de +200 à +380 kcal/j (+0,15 à +0,35 kg/sem) associé à 1,85–2,0 g/kg de protéines et un entraînement progressif.",
    exampleFr:
      "Pour 2 500 kcal de maintien, viser ~2 775 kcal/j (+0,25 kg/sem) permet de bâtir des fibres musculaires solides sans devoir faire une longue sèche derrière.",
    benchmarkFr:
      "Surplus idéal prouvé par Garthe et al. & l'ISSN : +0,15 à +0,35 kg/semaine (+200 à +380 kcal/j).",
    keywords: ["lean bulk", "prise de masse", "hypertrophie", "muscle sec", "surplus propre"],
  },
  leucine_threshold: {
    id: "leucine_threshold",
    titleFr: "Bolus protéique & Seuil de leucine (~30–45 g/repas)",
    shortTagFr: "Déclencheur de synthèse musculaire",
    category: "energie_sport",
    simpleFr:
      "Le muscle réagit par impulsions : pour allumer au maximum la fabrication de nouvelles fibres (MPS), chaque repas ou collation gagne à apporter ~0,4–0,5 g/kg de protéines riches en leucine (soit ~30 à 45 g, 4 fois par jour).",
    exampleFr:
      "Pour un objectif de 160 g de protéines par jour : visez 4 prises d'environ 40 g (œufs + yaourt grec au matin, poulet/poisson midi, collation skyr ou whey après sport, dîner complet).",
    benchmarkFr:
      "Recommandation ISSN (Jäger et al., 2017) & Morton et al. (2018) : 3 à 4 bolus répartis toutes les 3–4 h.",
    keywords: ["leucine", "bolus proteique", "synthese musculaire", "mps", "whey", "repartition proteines"],
  },
  athletic_refuel: {
    id: "athletic_refuel",
    titleFr: "Ravitaillement dynamique des séances sportives",
    shortTagFr: "Énergie compensée jour J",
    category: "energie_sport",
    simpleFr:
      "Lorsque vous visez la prise de masse ou la performance sportive, dépenser 550 kcal au football ou à la salle sans manger un peu plus ce jour-là ferait basculer votre bilan en déficit ! FolloWeight récrédite automatiquement les calories nettes de votre séance sur la cible du jour.",
    exampleFr:
      "Cible de base 2 750 kcal + séance Legs de 450 kcal nettes -> budget ajusté automatiquement à 3 200 kcal ce jour-là pour préserver récupération et glycogène.",
    benchmarkFr:
      "Évite le syndrome de sous-ravitaillement sportif (RED-S / fatigue nerveuse) sans avoir à tout recalculer à la main.",
    keywords: ["ravitaillement", "refuel", "seance sport", "glycogene", "recuperation", "budget jour j"],
  },
  nova: {
    id: "nova",
    titleFr: "Classification NOVA (1 à 4)",
    shortTagFr: "Degré de transformation",
    category: "nutrition_nova",
    simpleFr:
      "Un score mondial créé par des chercheurs qui classe les aliments non pas selon leurs calories, mais selon leur fabrication industrielle : 1 = naturel brut, 4 = ultra-transformé bourré d'additifs.",
    exampleFr:
      "Une pomme ou un filet de poisson frais = NOVA 1. Un yaourt aux fruits sucré avec arômes, sirop de glucose et épaississants = NOVA 4.",
    benchmarkFr:
      "Visez ~80 % d'aliments NOVA 1–2 : à calories égales, ils calent beaucoup plus longtemps et font fondre les fringales.",
    keywords: ["nova", "ultra transforme", "additifs", "transforme", "industriel"],
  },
  nutriscore: {
    id: "nutriscore",
    titleFr: "Nutri-Score (A à E)",
    shortTagFr: "Qualité nutritionnelle / 100 g",
    category: "nutrition_nova",
    simpleFr:
      "Le logo européen officiel de A (vert foncé) à E (orange rouge) qui compare la qualité nutritionnelle pour 100 g d'un produit de supermarché : fibres, protéines et légumes contre sucres, sel et graisses saturées.",
    exampleFr:
      "Pratique pour choisir le meilleur muesli ou le meilleur plat préparé parmi deux marques voisines au rayon.",
    benchmarkFr:
      "Astuce de pro : regardez Nutri-Score ET NOVA ensemble ! Un soda « light » peut avoir un B mais être NOVA 4 ultra-transformé.",
    keywords: ["nutriscore", "nutri-score", "code barres", "openfoodfacts", "a b c d e"],
  },
  glycemic_load: {
    id: "glycemic_load",
    titleFr: "Charge Glycémique (CG)",
    shortTagFr: "Vague de sucre dans le sang",
    category: "nutrition_nova",
    simpleFr:
      "Elle mesure à quel point votre assiette entière fait monter le taux de sucre (glycémie) dans le sang, en tenant compte de la quantité réellement mangée ET des fibres/protéines qui freinent la hausse.",
    exampleFr:
      "La pastèque a un « index glycémique » élevé, mais comme elle est faite à 92 % d'eau, une tranche a une Charge Glycémique toute petite (CG ~4) !",
    benchmarkFr:
      "Repas à CG basse (< 10) ou modérée (11–19) = zéro coup de barre à 14 h ni envie de sucre dans l'après-midi.",
    keywords: ["charge glycemique", "cg", "glycemie", "sucre sang", "insuline", "coup de barre"],
  },
  satiety_score: {
    id: "satiety_score",
    titleFr: "Score de satiété (0–100)",
    shortTagFr: "Pouvoir calant du repas",
    category: "nutrition_nova",
    simpleFr:
      "Une note calculée par FolloWeight qui prédit combien d'heures ce repas va calmer votre faim, selon son volume d'eau, ses fibres, ses protéines et son absence de sucres rapides.",
    exampleFr:
      "300 kcal de yaourt grec + framboises + flocons d'avoine (Satiété ~82) calent deux fois plus longtemps que 300 kcal de brioche (Satiété ~32).",
    benchmarkFr:
      "Au-dessus de 70/100, votre repas vous aide à tenir naturellement jusqu'au prochain sans grignoter.",
    keywords: ["satiete", "faim", "calant", "fibres", "proteines"],
  },
  sodium_oms: {
    id: "sodium_oms",
    titleFr: "Sodium & Sel (Plafond OMS 2 000 mg)",
    shortTagFr: "Tension & rétention d'eau",
    category: "nutrition_nova",
    simpleFr:
      "Le sodium est la partie active du sel de cuisine (1 g de sel = ~400 mg de sodium). En excès, il fait monter la pression artérielle et force le corps à retenir de l'eau.",
    exampleFr:
      "Une seule sauce soja ou charcuterie industrielle peut déjà apporter 900 à 1 400 mg de sodium d'un coup, soit la moitié du plafond journalier !",
    benchmarkFr:
      "Plafond OMS : < 2 000 mg de sodium/jour (~5 g de sel). C'est déjà intégré dans votre jauge de micronutriments.",
    keywords: ["sodium", "sel", "oms", "tension", "retention", "2000 mg"],
  },
  hydration_efsa: {
    id: "hydration_efsa",
    titleFr: "Hydratation quotidienne (Repères EFSA)",
    shortTagFr: "Boissons hors eau des aliments",
    category: "nutrition_nova",
    simpleFr:
      "C'est le volume de boissons (eau, thé, café nature, tisanes) conseillé sur votre journée. Comme ~20 % de vos besoins hydriques viennent déjà de vos aliments et que le tissu adipeux contient très peu d'eau, la vraie cible se situe presque toujours entre 1,6 L et 2,8 L (jamais 6 à 8 L !).",
    exampleFr:
      "Pour la plupart des adultes, 6 à 10 grands verres de 250 mL répartis sur la journée suffisent. Boire 6 à 8 litres par jour sans indication médicale peut diluer dangereusement le sodium du sang (hyponatrémie).",
    benchmarkFr:
      "Repère EFSA adulte : ~1,6 à 2,6 L de boissons/jour (+ un peu plus s'il fait très chaud ou pendant un jeûne), modifiable à tout moment selon votre soif et l'avis de votre médecin.",
    keywords: ["eau", "hydratation", "efsa", "ml", "hyponatremie", "boire", "8000"],
  },
  diet_rebalancing: {
    id: "diet_rebalancing",
    titleFr: "Rééquilibrage alimentaire",
    shortTagFr: "Aucun aliment interdit (80/20)",
    category: "nutrition_nova",
    simpleFr:
      "Apprendre à composer des assiettes généreuses, riches en vrais aliments (légumes, protéines, féculents complets, bonnes graisses), sans régime strict ni frustration, en gardant une place aux plaisirs.",
    exampleFr:
      "80 % du temps des repas simples et bruts maison, 20 % du temps un restaurant, un dessert ou un apéro en toute sérénité.",
    benchmarkFr:
      "Le mode le plus durable sur 6 mois et + : idéal pour stabiliser le poids définitivement sans effet yo-yo.",
    keywords: ["reequilibrage", "durable", "80/20", "sans tabou", "equilibre"],
  },
  diet_ketogenic: {
    id: "diet_ketogenic",
    titleFr: "Alimentation Cétogène (Keto)",
    shortTagFr: "Très peu de glucides, corps cétoniques",
    category: "nutrition_nova",
    simpleFr:
      "Une alimentation très pauvre en sucres et féculents (souvent ≤ 30 à 50 g de glucides par jour), modérée en protéines et riche en bonnes graisses (avocat, huile d'olive, œufs, poissons gras, noix).",
    exampleFr:
      "Sans pain, pâtes, riz ni sucre, le foie fabrique en quelques jours des « corps cétoniques » à partir des graisses pour nourrir le cerveau et couper les envies de sucre.",
    benchmarkFr:
      "Hydratation et électrolytes (sel raisonnable, magnésium, potassium via légumes verts) essentiels les 2 premières semaines. Avis médical si diabète traité.",
    keywords: ["cetogene", "keto", "low carb", "cetose", "glucides", "lipides"],
  },
  diet_glycemic_shield: {
    id: "diet_glycemic_shield",
    titleFr: "Bouclier glycémique (Ordre & Fibres)",
    shortTagFr: "Lisser la glycémie après repas",
    category: "nutrition_nova",
    simpleFr:
      "Une stratégie simple pour empêcher les pics de sucre dans le sang : manger les légumes/fibres et protéines avant les féculents, et garder les glucides à index modéré.",
    exampleFr:
      "Commencer son repas par une petite crudité ou des légumes verts avant les pâtes réduit nettement le pic glycémique et la fatigue post-déjeuner.",
    benchmarkFr:
      "Combiné à une marche tranquille de 10 minutes après le repas, l'effet sur l'HbA1c et le tour de taille est spectaculaire.",
    keywords: ["bouclier glycemique", "pic sucre", "fibres", "ig bas", "glycemie"],
  },
  diet_glp1: {
    id: "diet_glp1",
    titleFr: "Mode Accompagnement GLP-1 (Protection Muscle)",
    shortTagFr: "Priorité protéines + renforcement",
    category: "nutrition_nova",
    simpleFr:
      "Réglage pensé pour les personnes sous traitement GLP-1 (ou très petit appétit) : quand on mange beaucoup moins, le risque est de perdre trop de muscle. FolloWeight place donc les protéines et l'hydratation au premier plan.",
    exampleFr:
      "Commencer chaque petite assiette par 25–30 g de protéines faciles à digérer (yaourt grec, œuf, poisson) avant d'être rassasié.",
    benchmarkFr:
      "Viser au moins 1,4 à 1,6 g de protéines par kilo de poids cible et 2 petites séances de renforcement doux par semaine.",
    keywords: ["glp1", "glp-1", "sarcopenie", "protection musculaire", "petit appetit"],
  },
  fasting_12_12: {
    id: "fasting_12_12",
    titleFr: "Jeûne Circadien 12:12 (Repos digestif naturel)",
    shortTagFr: "12 h repos · 12 h repas",
    category: "jeune_metabolisme",
    simpleFr:
      "Le format le plus doux : 12 heures sans manger (principalement pendant votre nuit de sommeil) et 12 heures normales pour vos repas de la journée, aligné sur l'horloge biologique.",
    exampleFr:
      "Vous terminez le dîner à 20 h et prenez votre petit-déjeuner à partir de 8 h le lendemain matin : zéro repas sauté, simplement l'arrêt des grignotages du soir.",
    benchmarkFr:
      "Idéal pour débuter sans frustration, améliorer le sommeil et calmer le reflux ou les envies sucrées devant la télévision.",
    keywords: ["12:12", "12_12", "circadien", "debutant", "doux", "repos digestif"],
  },
  fasting_14_10: {
    id: "fasting_14_10",
    titleFr: "Jeûne Doux 14:10",
    shortTagFr: "14 h jeûne · 10 h repas",
    category: "jeune_metabolisme",
    simpleFr:
      "Une pause digestive de 14 heures suivie d'une fenêtre confortable de 10 heures permettant de conserver trois vrais repas ou deux repas et une collation.",
    exampleFr:
      "Petit-déjeuner décalé à 10 h, déjeuner à midi et dîner terminé à 20 h (eau, café noir ou thé sans sucre autorisés avant 10 h).",
    benchmarkFr:
      "Souvent recommandé comme palier progressif vers le 16:8 et très apprécié pour le confort hormonal et énergétique au quotidien.",
    keywords: ["14:10", "14_10", "doux", "progressif", "10 heures"],
  },
  fasting_16_8: {
    id: "fasting_16_8",
    titleFr: "Jeûne Classique 16:8",
    shortTagFr: "16 h jeûne · 8 h repas",
    category: "jeune_metabolisme",
    simpleFr:
      "Le protocole de jeûne intermittent le plus pratiqué : 16 heures de repos digestif (nuit + matinée) et une fenêtre de 8 heures pour prendre 2 repas complets et éventuellement une collation.",
    exampleFr:
      "Vous dînez jusqu'à 20 h, buvez eau, thé ou café sans sucre le matin, puis mangez normalement entre 12 h 00 et 20 h 00 (le petit-déjeuner passe automatiquement en « Néant »).",
    benchmarkFr:
      "Atteint chaque jour la zone de lipolyse (12–16 h) tout en restant facile à tenir en famille ou au bureau.",
    keywords: ["16:8", "16_8", "classique", "leangains", "midi 20h", "lipolyse"],
  },
  fasting_18_6: {
    id: "fasting_18_6",
    titleFr: "Jeûne Intermédiaire 18:6",
    shortTagFr: "18 h jeûne · 6 h repas",
    category: "jeune_metabolisme",
    simpleFr:
      "Une version un peu plus poussée du 16:8 : 18 heures de jeûne et 6 heures pour réunir deux repas rassasiants riches en protéines, fibres et bons lipides.",
    exampleFr:
      "Premier repas à 13 h 30 ou 14 h 00 et dîner terminé à 19 h 30 ou 20 h 00, ce qui laisse deux belles heures supplémentaires en déstockage lipidique.",
    benchmarkFr:
      "À adopter seulement si le 16:8 vous semble déjà naturel sans fringale ni baisse d'énergie.",
    keywords: ["18:6", "18_6", "intermediaire", "6 heures", "deux repas"],
  },
  fasting_20_4: {
    id: "fasting_20_4",
    titleFr: "Jeûne Warrior 20:4",
    shortTagFr: "20 h jeûne · 4 h repas",
    category: "jeune_metabolisme",
    simpleFr:
      "Un format avancé comprenant 20 heures de jeûne et une fenêtre resserrée de 4 heures (souvent en fin d'après-midi / soirée) avec une entrée légère puis un repas complet.",
    exampleFr:
      "Ouverture à 16 h avec légumes croquants et protéines, suivie d'un dîner équilibré avant 20 h, puis 20 h d'hydratation non sucrée.",
    benchmarkFr:
      "Veillez impérativement à couvrir votre quota quotidien de protéines et d'eau pendant ces 4 h pour protéger vos muscles. Déconseillé aux profils fragiles.",
    keywords: ["20:4", "20_4", "warrior", "4 heures", "avance"],
  },
  fasting_omad: {
    id: "fasting_omad",
    titleFr: "Jeûne intermittent & OMAD (23:1)",
    shortTagFr: "Alterner jeûne & fenêtre repas",
    category: "jeune_metabolisme",
    simpleFr:
      "Organiser sa journée en deux temps : une période de repos digestif (eau, thé, café noir sans sucre) suivie d'une fenêtre précise où l'on prend ses repas. OMAD signifie « One Meal A Day » : 23 h de jeûne et 1 h autorisée pour un grand repas complet.",
    exampleFr:
      "En 16:8, vous mangez par exemple entre 12 h et 20 h et jeûnez de 20 h à 12 h. En OMAD 23:1 avec repas à 19 h, FolloWeight affiche un compte à rebours jusqu'à 19 h puis vous alerte quand la fenêtre d'1 h est ouverte.",
    benchmarkFr:
      "En fenêtre courte (20:4 ou OMAD), soignez les protéines, les légumes et l'hydratation sur le repas unique ; déconseillé en cas de grossesse, < 18 ans ou antécédents de TCA.",
    keywords: ["omad", "23:1", "16:8", "18:6", "20:4", "jeune intermittent", "fenetre repas", "autorise a manger"],
  },
  fasting_5_2: {
    id: "fasting_5_2",
    titleFr: "Jeûne Alterné 5:2 (5 jours normaux · 2 jours allégés)",
    shortTagFr: "5 j libres · 2 j à 500–600 kcal",
    category: "jeune_metabolisme",
    simpleFr:
      "Contrairement au 16:8 qui découpe chaque journée en heures, le 5:2 fonctionne à la semaine (méthode du Dr Michael Mosley) : vous mangez normalement 5 jours sur 7 à vos horaires habituels, et vous réduisez vos apports autour de 500 kcal (femme) à 600 kcal (homme) sur seulement 2 jours non consécutifs.",
    exampleFr:
      "Repas tout à fait classiques du mardi au mercredi et tout le week-end (petit-déjeuner et sorties compris), et deux journées légères le lundi et le jeudi composées de légumes verts, œufs ou poisson maigre et boissons non sucrées.",
    benchmarkFr:
      "Espacez toujours les 2 jours allégés (jamais 2 jours d'affilée), privilégiez la marche plutôt que le sport intense ces jours-là. Contre-indiqué si grossesse, < 18 ans, diabète traité ou antécédents de TCA.",
    keywords: ["5:2", "5_2", "cinq deux", "alterne", "mosley", "500 kcal", "600 kcal", "hebdomadaire", "2 jours"],
  },
  fasting_custom: {
    id: "fasting_custom",
    titleFr: "Jeûne Libre (Durée sur mesure 12 h à 36 h)",
    shortTagFr: "Curseur horaire personnalisé",
    category: "jeune_metabolisme",
    simpleFr:
      "Permet de régler manuellement au curseur le nombre exact d'heures de votre session de jeûne (entre 12 h et 36 h) selon vos contraintes d'emploi du temps ou d'horaires décalés.",
    exampleFr:
      "Vous travaillez de nuit ou finissez un dîner tardif à 22 h 30 : réglez 15 h de jeûne ponctuel et FolloWeight calcule automatiquement votre heure exacte de reprise.",
    benchmarkFr:
      "Au-delà de 20–24 h, hydratez-vous régulièrement avec un peu d'eau minérale et demandez un avis médical préalable.",
    keywords: ["libre", "custom", "personnalise", "curseur", "sur mesure", "horaires decales"],
  },
  fasting_daily_cycle: {
    id: "fasting_daily_cycle",
    titleFr: "Cycle quotidien & Rappels écran verrouillé",
    shortTagFr: "Ouverture repas & reprise jeûne",
    category: "jeune_metabolisme",
    simpleFr:
      "Quand le cycle quotidien est actif, FolloWeight répète automatiquement votre horaire choisi chaque jour, marque en « Néant » les repas hors fenêtre et vous envoie un rappel Push à l'ouverture des repas puis à la reprise du jeûne.",
    exampleFr:
      "En 16:8 réglé à 12:00, vous recevez une alerte à 12:00 (« Fenêtre repas ouverte jusqu'à 20:00 ») puis une seconde à 20:00 (« Reprise du jeûne »), même écran verrouillé.",
    benchmarkFr:
      "Modifiable à tout moment en 1 clic si vous décalez exceptionnellement un déjeuner ou un dîner.",
    keywords: ["cycle quotidien", "alertes repas", "ouverture fenetre", "push jeune", "12:00", "20:00"],
  },
  phase_digestion: {
    id: "phase_digestion",
    titleFr: "Phase Jeûne 0–4 h : Digestion & Assimilation",
    shortTagFr: "0 à 4 h après le repas",
    category: "jeune_metabolisme",
    simpleFr:
      "Tout juste après votre dernier repas, l'estomac et l'intestin transfèrent les nutriments dans le sang. L'insuline augmente naturellement pour ranger ce carburant dans vos muscles et votre foie.",
    exampleFr:
      "C'est le moment juste après le dîner : vous n'avez pas faim, votre corps fonctionne sur l'énergie du repas.",
    benchmarkFr:
      "Évitez juste les petits grignotages sucrés devant la télé pour ne pas relancer un nouveau cycle à zéro.",
    keywords: ["digestion", "0-4h", "phase jeune", "insuline"],
  },
  phase_glycemic_calm: {
    id: "phase_glycemic_calm",
    titleFr: "Phase Jeûne 4–8 h : Apaisement glycémique",
    shortTagFr: "4 à 8 h de jeûne",
    category: "jeune_metabolisme",
    simpleFr:
      "Le repas est digéré, le taux de sucre et d'insuline dans le sang redescend calmement. Votre foie commence à libérer doucement sa réserve d'énergie de secours (glycogène).",
    exampleFr:
      "Typiquement la première moitié de votre nuit après un dîner à 20 h.",
    benchmarkFr:
      "Buvez de l'eau ou une tisane nature si vous ressentez une envie psychologique.",
    keywords: ["apaisement glycemique", "4-8h", "glycogene", "phase jeune"],
  },
  phase_metabolic_switch: {
    id: "phase_metabolic_switch",
    titleFr: "Phase Jeûne 8–12 h : Bascule métabolique",
    shortTagFr: "8 à 12 h de jeûne",
    category: "jeune_metabolisme",
    simpleFr:
      "Le réservoir de sucre rapide du foie baisse nettement : votre organisme commence à basculer du mode « brûleur de sucre » vers le mode « brûleur de graisses ».",
    exampleFr:
      "C'est le matin au réveil si vous avez dîné à 20 h la veille (déjà 11–12 h de jeûne accomplies sans effort pendant votre sommeil !).",
    benchmarkFr:
      "Un grand verre d'eau le matin aide à réhydrater après la nuit et coupe la faim matinale.",
    keywords: ["bascule metabolique", "8-12h", "metabolic switch", "graisses"],
  },
  phase_lipolysis: {
    id: "phase_lipolysis",
    titleFr: "Phase Jeûne 12–16 h : Lipolyse active",
    shortTagFr: "Déstockage des graisses",
    category: "jeune_metabolisme",
    simpleFr:
      "« Lipolyse » veut simplement dire découpage des graisses stockées. Comme l'insuline est très basse, les cellules graisseuses ouvrent leurs réserves pour alimenter vos muscles.",
    exampleFr:
      "Les dernières heures avant le déjeuner sur un format 16:8 : beaucoup de personnes ressentent une belle clarté d'esprit à ce stade.",
    benchmarkFr:
      "Café noir, thé nature ou eau pétillante restent autorisés sans casser la lipolyse. Arrêtez immédiatement en cas de vertige.",
    keywords: ["lipolyse", "12-16h", "destockage", "graisses", "16:8"],
  },
  phase_ketosis: {
    id: "phase_ketosis",
    titleFr: "Phase Jeûne 16–20 h : Cétose légère",
    shortTagFr: "Carburant propre du cerveau",
    category: "jeune_metabolisme",
    simpleFr:
      "Votre foie transforme une petite partie des graisses libérées en « cétones », un carburant très stable apprécié par le cerveau lorsque vous jeûnez plus de 16 heures.",
    exampleFr:
      "C'est souvent pour atteindre cette sensation d'énergie régulière sans fringale que les pratiquants choisissent le 18:6 ou 20:4.",
    benchmarkFr:
      "Préparez un premier repas riche en protéines et légumes pour protéger vos muscles dès l'ouverture de la fenêtre.",
    keywords: ["cetose", "16-20h", "cetones", "clarte mentale", "18:6", "20:4"],
  },
  phase_autophagy: {
    id: "phase_autophagy",
    titleFr: "Phase Jeûne 20 h+ : Recyclage cellulaire (Autophagie)",
    shortTagFr: "Nettoyage profond (OMAD)",
    category: "jeune_metabolisme",
    simpleFr:
      "Littéralement « se nettoyer soi-même » : quand la pause digestive dépasse ~20 heures, nos cellules activent davantage leur système interne de tri et de recyclage des vieux composants usés.",
    exampleFr:
      "Comme faire tourner l'équipe d'entretien dans une usine pendant que les chaînes de livraison sont en pause.",
    benchmarkFr:
      "Hydratation indispensable à ce stade. Rompez ce long jeûne doucement avec des protéines digestes et des légumes avant tout plat très sucré.",
    keywords: ["autophagie", "recyclage cellulaire", "20h+", "omad", "mtor"],
  },
  ble_hr_0x180d: {
    id: "ble_hr_0x180d",
    titleFr: "Bluetooth Cardio Direct (GATT 0x180D)",
    shortTagFr: "Connexion montre / ceinture",
    category: "jeune_metabolisme",
    simpleFr:
      "Le standard universel Bluetooth qui permet à FolloWeight de lire votre rythme cardiaque en direct depuis une montre compatible ou une ceinture cardio (Polar, Garmin, Wahoo, Decathlon...) sans passer par un serveur cloud.",
    exampleFr:
      "En activant le mode diffusion cardio sur votre montre Garmin/Polar, FolloWeight affiche vos BPM en direct pendant votre séance.",
    benchmarkFr:
      "Les marques Samsung Health et Apple Watch nécessitent l'application mobile/pont natif ou un export manuel rapide selon le navigateur.",
    keywords: ["bluetooth", "gatt", "0x180d", "montre", "cardio", "bpm", "garmin", "samsung", "apple"],
  },
  // ---------------- BILAN SANGUIN (20 biomarqueurs + 5 ratios) ----------------
  blood_fastingGlucose: {
    id: "blood_fastingGlucose",
    titleFr: "Glycémie à jeun",
    shortTagFr: "Sucre dans le sang au réveil",
    category: "bilan_sanguin",
    simpleFr:
      "La quantité de sucre (glucose) qui circule dans votre sang après au moins 8 à 12 heures sans manger. Elle reflète la façon dont votre corps gère les sucres au repos.",
    exampleFr:
      "C'est un peu la photo instantanée du niveau d'essence dans le réservoir juste avant le petit-déjeuner.",
    benchmarkFr:
      "Zone optimale souvent entre 0,75 et 0,94 g/L (norme labo < 1,00 g/L). La marche 10 min après dîner et les fibres la font baisser vite.",
    keywords: ["glycemie", "sucre", "glucose", "a jeun", "diabete"],
  },
  blood_hba1c: {
    id: "blood_hba1c",
    titleFr: "Hémoglobine glyquée (HbA1c)",
    shortTagFr: "Mémoire sucre sur 3 mois",
    category: "bilan_sanguin",
    simpleFr:
      "Contrairement à la glycémie du matin qui varie d'un jour à l'autre, l'HbA1c mesure votre moyenne réelle de sucre sanguin sur les 2 à 3 derniers mois (via le sucre collé aux globules rouges).",
    exampleFr:
      "Impossible de « tricher » en mangeant juste une salade la veille de la prise de sang : c'est le bulletin trimestriel de votre glycémie.",
    benchmarkFr:
      "Optimal : 4,8 à 5,4 %. Entre 5,7 et 6,4 % = zone de pré-alerte (réduire boissons sucrées + marcher après repas). ≥ 6,5 % = à voir avec votre médecin.",
    keywords: ["hba1c", "hemoglobine glyquee", "3 mois", "diabete", "sucre"],
  },
  blood_fastingInsulin: {
    id: "blood_fastingInsulin",
    titleFr: "Insulinémie à jeun",
    shortTagFr: "Effort du pancréas au repos",
    category: "bilan_sanguin",
    simpleFr:
      "L'insuline est la clé qui ouvre vos cellules pour faire entrer le sucre. Même quand la glycémie paraît normale, une insuline à jeun élevée montre que votre pancréas doit forcer deux fois plus.",
    exampleFr:
      "C'est comme une porte grippée : la pièce reste propre (glycémie ok), mais il faut pousser fort pour l'ouvrir (insuline haute).",
    benchmarkFr:
      "Zone de confort métabolique idéale : souvent 3 à 8 mUI/L à jeun (à associer à la glycémie pour calculer le HOMA-IR).",
    keywords: ["insuline", "insulinemie", "resistance insuline", "pancreas", "homa"],
  },
  blood_totalCholesterol: {
    id: "blood_totalCholesterol",
    titleFr: "Cholestérol total",
    shortTagFr: "Somme LDL + HDL",
    category: "bilan_sanguin",
    simpleFr:
      "Le total de tout le cholestérol qui voyage dans votre sang, en additionnant le « transporteur vers les tissus » (LDL) et le « nettoyeur » (HDL).",
    exampleFr:
      "Un total de 2,10 g/L avec beaucoup de bon HDL protecteur n'a pas du tout la même signification que 2,10 g/L avec peu de HDL et beaucoup de LDL.",
    benchmarkFr:
      "Ne le lisez jamais seul : regardez surtout le LDL, les triglycérides et le Non-HDL pour savoir où vous en êtes.",
    keywords: ["cholesterol total", "lipides", "prise de sang"],
  },
  blood_hdlCholesterol: {
    id: "blood_hdlCholesterol",
    titleFr: "Cholestérol HDL (« Protecteur »)",
    shortTagFr: "Éboueur des artères",
    category: "bilan_sanguin",
    simpleFr:
      "On l'appelle souvent le « bon cholestérol » car ces particules ramassent le cholestérol en excès dans les artères pour le ramener vers le foie afin qu'il soit recyclé ou éliminé.",
    exampleFr:
      "Pensez au camion-poubelle qui nettoie les routes de votre circulation sanguine : ici, un chiffre plutôt haut est une bonne nouvelle.",
    benchmarkFr:
      "Repères courants : ≥ 0,40 g/L chez l'homme et ≥ 0,50 g/L chez la femme (optimal ≥ 0,55 g/L). L'activité physique régulière le fait monter.",
    keywords: ["hdl", "bon cholesterol", "lipides", "protecteur"],
  },
  blood_ldlCholesterol: {
    id: "blood_ldlCholesterol",
    titleFr: "Cholestérol LDL",
    shortTagFr: "Livreur vers les artères",
    category: "bilan_sanguin",
    simpleFr:
      "Le transporteur qui amène le cholestérol vers les cellules. Quand il circule en excès, il peut peu à peu se déposer sur les parois des artères.",
    exampleFr:
      "C'est le camion de livraison : nécessaire en petite quantité pour réparer les cellules, mais encombrant s'il crée des embouteillages.",
    benchmarkFr:
      "La cible dépend de votre risque personnel (< 1,60 g/L à faible risque, < 1,15 g/L à risque modéré, < 1,00 g/L idéal). Remplacer beurre/charcuteries par huile d'olive, noix et fibres solubles (avoine, pommes) l'aide beaucoup.",
    keywords: ["ldl", "mauvais cholesterol", "arteres", "graisses saturees"],
  },
  blood_triglycerides: {
    id: "blood_triglycerides",
    titleFr: "Triglycérides",
    shortTagFr: "Graisses liées aux sucres/alcool",
    category: "bilan_sanguin",
    simpleFr:
      "Les graisses qui circulent en réserve dans le sang. Contrairement aux idées reçues, ils montent surtout quand on mange trop de sucres rapides, de farines blanches ou qu'on boit de l'alcool — bien plus que par l'huile d'olive.",
    exampleFr:
      "Quand vous buvez des sodas ou mangez trop de féculents raffinés sans les brûler, votre foie les transforme vite en triglycérides.",
    benchmarkFr:
      "Norme < 1,50 g/L (idéal < 1,00 g/L à jeun). Ce marqueur répond en quelques semaines dès qu'on coupe les sucres liquides et qu'on marche plus !",
    keywords: ["triglycerides", "tg", "sucre", "alcool", "omega 3"],
  },
  blood_apob: {
    id: "blood_apob",
    titleFr: "Apolipoprotéine B (ApoB)",
    shortTagFr: "Compteur exact de particules",
    category: "bilan_sanguin",
    simpleFr:
      "Chaque particule de cholestérol potentiellement encrassante (LDL, VLDL...) porte exactement une protéine ApoB comme un numéro d'immatriculation. L'ApoB compte donc le nombre exact de véhicules sur la route.",
    exampleFr:
      "Encore plus précis que le seul dosage LDL pour évaluer le risque cardiovasculaire réel.",
    benchmarkFr:
      "Cible usuelle < 1,00 g/L (optimal < 0,80 g/L). Améliorée par fibres solubles, oméga-3, baisse des graisses saturées et suivi médical si besoin.",
    keywords: ["apob", "apolipoproteine b", "cardiovasculaire", "ldl"],
  },
  blood_creatinine: {
    id: "blood_creatinine",
    titleFr: "Créatinine sérique",
    shortTagFr: "Reflet du filtre rénal (& muscle)",
    category: "bilan_sanguin",
    simpleFr:
      "Un déchet naturel fabriqué tous les jours par vos muscles et filtré par vos reins dans les urines. Si le rein filtre moins vite — ou simplement si vous êtes très musclé ou déshydraté — la créatinine monte.",
    exampleFr:
      "Un bodybuilder très musclé ou quelqu'un qui vient de faire une grosse séance de jambes la veille peut avoir une créatinine un peu haute sans avoir les reins abîmés.",
    benchmarkFr:
      "À lire avec le DFG estimé (CKD-EPI 2021). Si la filtration est basse, FolloWeight protège vos reins en évitant les excès de protéines.",
    keywords: ["creatinine", "reins", "filtration", "dfg", "ckd-epi"],
  },
  blood_alat: {
    id: "blood_alat",
    titleFr: "Transaminases ALAT (SGPT)",
    shortTagFr: "Enzyme sensible du foie",
    category: "bilan_sanguin",
    simpleFr:
      "Une enzyme qui vit surtout à l'intérieur des cellules du foie. Si le foie est fatigué ou un peu engorgé par des graisses (stéatose / « foie gras » métabolique), un peu d'ALAT s'échappe dans le sang.",
    exampleFr:
      "C'est un voyant d'alerte précieux pour savoir si votre foie digère mal l'excès de sucres, de fructose industriel ou de poids.",
    benchmarkFr:
      "Idéal souvent < 25 UI/L (normes labo < 41 H / < 33 F). Perdre 5 % de poids abdominal et limiter alcool/fructose le fait baisser rapidement.",
    keywords: ["alat", "sgpt", "foie", "transaminases", "steatose", "masld"],
  },
  blood_asat: {
    id: "blood_asat",
    titleFr: "Transaminases ASAT (SGOT)",
    shortTagFr: "Enzyme foie & muscles",
    category: "bilan_sanguin",
    simpleFr:
      "Une autre enzyme proche d'ALAT, présente dans le foie mais aussi dans vos muscles ! C'est pourquoi une grosse séance de musculation la veille peut la faire monter temporairement.",
    exampleFr:
      "Si seules les ASAT montent après des courbatures intenses, c'est souvent le muscle qui récupère plutôt qu'un souci du foie.",
    benchmarkFr:
      "Normes labo < 40 H / < 32 F (optimal < 25 UI/L). Utilisée avec ALAT et plaquettes pour calculer le score hépatique FIB-4.",
    keywords: ["asat", "sgot", "foie", "transaminases", "courbatures"],
  },
  blood_ggt: {
    id: "blood_ggt",
    titleFr: "Gamma-GT (GGT)",
    shortTagFr: "Charge de détox du foie",
    category: "bilan_sanguin",
    simpleFr:
      "Une enzyme du foie et des voies biliaires très sensible à l'alcool, à certains médicaments et à l'excès de sucre/graisses dans le foie.",
    exampleFr:
      "Couper l'alcool pendant 3 à 4 semaines fait souvent chuter les Gamma-GT de façon impressionnante.",
    benchmarkFr:
      "Norme labo < 55 UI/L (H) ou < 38 UI/L (F), optimal métabolique souvent < 25 UI/L.",
    keywords: ["gamma gt", "ggt", "foie", "alcool", "biliaire"],
  },
  blood_platelets: {
    id: "blood_platelets",
    titleFr: "Plaquettes sanguines",
    shortTagFr: "Coagulation & réparation",
    category: "bilan_sanguin",
    simpleFr:
      "De minuscules cellules qui jouent le rôle de « pansements rapides » dès que vous vous coupez pour arrêter le saignement. Les médecins regardent aussi leur niveau pour évaluer la santé du foie (score FIB-4).",
    exampleFr:
      "Sans plaquettes, une petite égratignure continuerait à saigner longtemps.",
    benchmarkFr:
      "Zone normale courante : 150 à 400 G/L.",
    keywords: ["plaquettes", "coagulation", "fib-4", "sang"],
  },
  blood_ferritin: {
    id: "blood_ferritin",
    titleFr: "Ferritine (Réserves de fer)",
    shortTagFr: "Énergie & oxygène",
    category: "bilan_sanguin",
    simpleFr:
      "La protéine qui sert d'entrepôt à votre fer. Une ferritine trop basse explique souvent une grande fatigue et un essoufflement à l'effort ; trop haute, elle peut signaler une inflammation ou une surcharge.",
    exampleFr:
      "Si votre hémoglobine est encore normale mais votre ferritine à 12, c'est comme rouler sur la réserve d'essence : vous manquez déjà de punch.",
    benchmarkFr:
      "Zone de confort fréquente : 50 à 150 ng/mL. La vitamine C (poivron, agrumes) aide à absorber le fer des lentilles/viandes, tandis que le thé/café juste pendant le repas le freinent.",
    keywords: ["ferritine", "fer", "fatigue", "carence", "energie"],
  },
  blood_tsh: {
    id: "blood_tsh",
    titleFr: "TSH (Thermostat thyroïdien)",
    shortTagFr: "Chef d'orchestre métabolisme",
    category: "bilan_sanguin",
    simpleFr:
      "Une hormone envoyée par le cerveau pour piloter la thyroïde (le thermostat de votre énergie). Quand la thyroïde ralentit, le cerveau crie plus fort : la TSH monte !",
    exampleFr:
      "TSH haute + grande frilosité + poids qui ne bouge plus malgré les efforts mérite toujours d'en parler avec votre médecin.",
    benchmarkFr:
      "Norme usuelle 0,40 à 4,00 mUI/L (souvent optimale entre 0,80 et 2,50 mUI/L selon contexte clinique).",
    keywords: ["tsh", "thyroide", "metabolisme lent", "fatigue", "frilosite"],
  },
  blood_crpUs: {
    id: "blood_crpUs",
    titleFr: "CRP ultra-sensible (Inflammation)",
    shortTagFr: "Petit feu silencieux",
    category: "bilan_sanguin",
    simpleFr:
      "Un marqueur fabriqué par le foie dès qu'il y a une infection ou une petite inflammation chronique de fond dans le corps (souvent liée au manque de sommeil, au stress ou à la graisse viscérale).",
    exampleFr:
      "Un rhume ou une grippe récente peut la faire grimper temporairement en flèche : il faut refaire le point à froid.",
    benchmarkFr:
      "Optimal hors infection : < 1,0 mg/L (norme < 5,0 mg/L). Le sommeil de qualité, les oméga-3 (poissons gras, noix) et la marche la font baisser.",
    keywords: ["crp", "crp us", "inflammation", "cardiovasculaire", "recuperation"],
  },
  blood_vitD: {
    id: "blood_vitD",
    titleFr: "Vitamine D (25-OH-D)",
    shortTagFr: "Soleil, os & immunité",
    category: "bilan_sanguin",
    simpleFr:
      "Une vitamine fabriquée par votre peau au soleil, indispensable pour fixer le calcium dans les os, soutenir le tonus musculaire et défendre le système immunitaire.",
    exampleFr:
      "En Europe entre octobre et avril, presque 3 personnes sur 4 manquent de vitamine D sans soleil direct ni complémentation adaptée.",
    benchmarkFr:
      "Zone optimale souvent ciblée : 30 à 50 ng/mL (75–125 nmol/L). Parlez dosage personnalisé avec votre médecin/pharmacien avant supplémentation.",
    keywords: ["vitamine d", "soleil", "os", "immunite", "carence"],
  },
  blood_vitB12: {
    id: "blood_vitB12",
    titleFr: "Vitamine B12",
    shortTagFr: "Nerfs, mémoire & globules rouges",
    category: "bilan_sanguin",
    simpleFr:
      "Essentielle pour protéger le système nerveux, garder de l'énergie mentale et fabriquer vos globules rouges. On la trouve presque uniquement dans les produits animaux (ou aliments enrichis/compléments).",
    exampleFr:
      "Très importante à surveiller si vous êtes végétarien, végan, senior ou sous metformine/IPP.",
    benchmarkFr:
      "Norme 200–900 pg/mL (zone de confort souvent 350–750 pg/mL).",
    keywords: ["vitamine b12", "b12", "vegetarien", "vegan", "nerfs", "fatigue"],
  },
  blood_hemoglobin: {
    id: "blood_hemoglobin",
    titleFr: "Hémoglobine",
    shortTagFr: "Transport de l'oxygène",
    category: "bilan_sanguin",
    simpleFr:
      "La protéine riche en fer contenue dans vos globules rouges qui transporte l'oxygène des poumons jusqu'à vos muscles et votre cerveau.",
    exampleFr:
      "Si votre hémoglobine descend sous la norme (anémie), vous manquez de souffle dès que vous montez un escalier.",
    benchmarkFr:
      "Repères OMS : ≥ 13,0 g/dL (H) et ≥ 12,0 g/dL (F hors grossesse).",
    keywords: ["hemoglobine", "anemie", "oxygene", "globules rouges", "essoufflement"],
  },
  blood_uricAcid: {
    id: "blood_uricAcid",
    titleFr: "Acide urique",
    shortTagFr: "Articulations & hydratation",
    category: "bilan_sanguin",
    simpleFr:
      "Un résidu naturel issu de la dégradation de certaines protéines/cellules (purines) ou du fructose en excès. S'il grimpe trop haut, il peut former de petits cristaux douloureux dans les articulations (goutte).",
    exampleFr:
      "Boire beaucoup d'eau et modérer bières, sodas sucrés au fructose et abats aide les reins à l'évacuer facilement.",
    benchmarkFr:
      "Normes courantes : 35–70 mg/L (H), 25–60 mg/L (F). Lors d'une perte de poids très rapide ou au début d'un régime céto, il peut monter un peu : hydratez-vous bien.",
    keywords: ["acide urique", "goutte", "fructose", "hydratation", "articulations"],
  },
  blood_homa_ir: {
    id: "blood_homa_ir",
    titleFr: "Indice HOMA-IR (Sensibilité à l'insuline)",
    shortTagFr: "Calcul Glycémie × Insuline",
    category: "bilan_sanguin",
    simpleFr:
      "Un score calculé à partir de votre sucre à jeun et de votre insuline à jeun : il montre si vos cellules répondent bien à l'insuline ou commencent à devenir « dures d'oreille » (insulinorésistance).",
    exampleFr:
      "Plus l'indice est bas (< 1,8), plus votre corps maîtrise le sucre avec un minimum d'effort ; au-dessus de 2,5, il faut beaucoup d'insuline pour garder une glycémie calme.",
    benchmarkFr:
      "< 1,8 = sensibilité excellente. Marche après les repas, renforcement musculaire et fibres l'améliorent très vite.",
    keywords: ["homa", "homa-ir", "sensibilite insuline", "insulinoresistance"],
  },
  blood_non_hdl: {
    id: "blood_non_hdl",
    titleFr: "Cholestérol non-HDL",
    shortTagFr: "Total − Bon HDL",
    category: "bilan_sanguin",
    simpleFr:
      "On prend tout votre cholestérol et on soustrait le bon protecteur (HDL). Ce qui reste représente l'ensemble de toutes les particules capables de se déposer dans les artères (LDL + autres).",
    exampleFr:
      "Plus complet que le LDL seul quand vos triglycérides sont un peu élevés.",
    benchmarkFr:
      "Cible optimale ESC/EAS en prévention primaire : < 1,30 g/L.",
    keywords: ["non-hdl", "non hdl", "cholesterol", "arteres", "esc"],
  },
  blood_tg_hdl_ratio: {
    id: "blood_tg_hdl_ratio",
    titleFr: "Ratio TG / HDL",
    shortTagFr: "Triglycérides ÷ Bon HDL",
    category: "bilan_sanguin",
    simpleFr:
      "Un raccourci très simple entre les graisses issues des sucres (triglycérides) et le protecteur (HDL) : il donne un bon reflet de votre santé métabolique globale et de votre sensibilité à l'insuline.",
    exampleFr:
      "Avec des triglycérides à 0,90 g/L et un HDL à 0,60 g/L, le ratio vaut 1,50 : c'est excellent (< 2,0 en unités françaises g/L).",
    benchmarkFr:
      "Idéal < 2,0 (en g/L). Baisser les sucres raffinés tout en bougeant régulièrement améliore ce ratio des deux côtés !",
    keywords: ["tg/hdl", "ratio tg hdl", "triglycerides", "metabolisme"],
  },
  blood_egfr_ckdepi_2021: {
    id: "blood_egfr_ckdepi_2021",
    titleFr: "DFG estimé (CKD-EPI 2021)",
    shortTagFr: "Vitesse de filtre des reins",
    category: "bilan_sanguin",
    simpleFr:
      "Le Débit de Filtration Glomérulaire estime à quelle vitesse vos reins nettoient le sang chaque minute, calculé automatiquement avec votre créatinine, votre âge et votre sexe.",
    exampleFr:
      "Imaginez le débit d'une cafetière filtre : ≥ 90 mL/min = filtre neuf qui coule vite et sans blocage.",
    benchmarkFr:
      "≥ 90 = optimal ; 60–89 = légèrement modéré (hydratation régulière) ; < 60 = à discuter avec votre médecin avant de viser beaucoup de protéines.",
    keywords: ["dfg", "ckd-epi", "reins", "creatinine", "filtration"],
  },
  blood_fib4: {
    id: "blood_fib4",
    titleFr: "Score hépatique FIB-4",
    shortTagFr: "Souplesse du foie (Âge, ASAT, ALAT, Plaquettes)",
    category: "bilan_sanguin",
    simpleFr:
      "Une formule recommandée par les hépatologues qui croise votre âge, vos enzymes du foie et vos plaquettes pour vérifier que le foie reste souple sans cicatrice (fibrose).",
    exampleFr:
      "Permet d'avoir un premier indicateur rassurant (< 1,30) directement depuis une simple prise de sang standard.",
    benchmarkFr:
      "< 1,30 = risque faible très rassurant. Au-dessus de 1,30 après 35 ans, montrez simplement le chiffre à votre médecin traitant.",
    keywords: ["fib4", "fib-4", "foie", "fibrose", "masld"],
  },
};

export function getGlossaryEntry(id: GlossaryTermId): GlossaryEntry {
  return GLOSSARY_TERMS[id];
}

function normalizeForSearch(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function searchGlossaryTerms(
  query: string,
  category: GlossaryCategory | "all" = "all",
): GlossaryEntry[] {
  const entries = Object.values(GLOSSARY_TERMS).filter(
    (entry) => category === "all" || entry.category === category,
  );
  const q = normalizeForSearch(query);
  if (!q) return entries;

  const tokens = q.split(/\s+/).filter(Boolean);
  return entries
    .map((entry) => {
      const titleNorm = normalizeForSearch(entry.titleFr);
      const tagNorm = normalizeForSearch(entry.shortTagFr);
      const kwNorm = normalizeForSearch(entry.keywords.join(" "));
      const bodyNorm = normalizeForSearch(`${entry.simpleFr} ${entry.exampleFr} ${entry.benchmarkFr}`);

      let score = 0;
      for (const tok of tokens) {
        if (titleNorm.includes(tok)) score += 6;
        else if (kwNorm.includes(tok)) score += 4;
        else if (tagNorm.includes(tok)) score += 3;
        else if (bodyNorm.includes(tok)) score += 1;
        else return { entry, score: -1 };
      }
      return { entry, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.entry);
}

const BLOOD_KEY_TO_GLOSSARY: Record<BloodBiomarkerKey, GlossaryTermId> = {
  fastingGlucose: "blood_fastingGlucose",
  hba1c: "blood_hba1c",
  fastingInsulin: "blood_fastingInsulin",
  totalCholesterol: "blood_totalCholesterol",
  hdlCholesterol: "blood_hdlCholesterol",
  ldlCholesterol: "blood_ldlCholesterol",
  triglycerides: "blood_triglycerides",
  apob: "blood_apob",
  creatinine: "blood_creatinine",
  alat: "blood_alat",
  asat: "blood_asat",
  ggt: "blood_ggt",
  platelets: "blood_platelets",
  ferritin: "blood_ferritin",
  tsh: "blood_tsh",
  crpUs: "blood_crpUs",
  vitD: "blood_vitD",
  vitB12: "blood_vitB12",
  hemoglobin: "blood_hemoglobin",
  uricAcid: "blood_uricAcid",
};

const BLOOD_DERIVED_TO_GLOSSARY: Record<string, GlossaryTermId> = {
  homa_ir: "blood_homa_ir",
  non_hdl: "blood_non_hdl",
  tg_hdl_ratio: "blood_tg_hdl_ratio",
  egfr_ckdepi_2021: "blood_egfr_ckdepi_2021",
  fib4: "blood_fib4",
};

export function resolveBloodGlossaryId(keyOrDerivedId: BloodBiomarkerKey | string): GlossaryTermId | null {
  if (keyOrDerivedId in BLOOD_KEY_TO_GLOSSARY) {
    return BLOOD_KEY_TO_GLOSSARY[keyOrDerivedId as BloodBiomarkerKey];
  }
  if (keyOrDerivedId in BLOOD_DERIVED_TO_GLOSSARY) {
    return BLOOD_DERIVED_TO_GLOSSARY[keyOrDerivedId];
  }
  return null;
}

const FASTING_PHASE_TO_GLOSSARY: Record<FastingPhaseId, GlossaryTermId> = {
  digestion: "phase_digestion",
  glycemic_calm: "phase_glycemic_calm",
  metabolic_switch: "phase_metabolic_switch",
  lipolysis: "phase_lipolysis",
  ketosis_light: "phase_ketosis",
  autophagy_zone: "phase_autophagy",
};

export function resolveFastingPhaseGlossaryId(phaseId: FastingPhaseId): GlossaryTermId {
  return FASTING_PHASE_TO_GLOSSARY[phaseId] ?? "fasting_omad";
}

const FASTING_PROTOCOL_TO_GLOSSARY: Record<FastingProtocolId, GlossaryTermId> = {
  none: "fasting_16_8",
  "12_12": "fasting_12_12",
  "14_10": "fasting_14_10",
  "16_8": "fasting_16_8",
  "18_6": "fasting_18_6",
  "20_4": "fasting_20_4",
  omad_23_1: "fasting_omad",
  "5_2": "fasting_5_2",
  custom: "fasting_custom",
};

export function resolveFastingProtocolGlossaryId(
  protocolId?: FastingProtocolId | null
): GlossaryTermId {
  if (!protocolId) return "fasting_16_8";
  return FASTING_PROTOCOL_TO_GLOSSARY[protocolId] ?? "fasting_16_8";
}

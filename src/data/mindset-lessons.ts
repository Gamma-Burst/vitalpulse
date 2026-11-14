export interface MindsetLesson {
  id: string;
  titleFr: string;
  tagFr: string;
  durationLabel: string;
  insightFr: string;
  actionFr: string;
  scienceRef: string;
}

export const MINDSET_LESSONS: MindsetLesson[] = [
  {
    id: "mind-1",
    titleFr: "Le mythe de la journée « tout ou rien »",
    tagFr: "Psychologie",
    durationLabel: "30 s",
    insightFr:
      "Un repas plus riche ne ruine pas une semaine : c'est l'effet « au point où j'en suis » après coup qui crée le vrai surplus.",
    actionFr: "Considérez simplement le repas suivant comme un retour normal à votre rythme.",
    scienceRef: "Herman & Polivy (What-the-hell effect)",
  },
  {
    id: "mind-2",
    titleFr: "Faim vraie vs envie de pause",
    tagFr: "Satiété",
    durationLabel: "30 s",
    insightFr:
      "L'envie émotionnelle ou d'ennui monte en 3 minutes pour un aliment précis. La faim physique s'installe graduellement.",
    actionFr: "Buvez 250 mL d'eau et attendez 8 minutes avant de décider de manger.",
    scienceRef: "Noom Behavioral CBT Framework",
  },
  {
    id: "mind-3",
    titleFr: "Pourquoi la balance monte après du salé ou du sport",
    tagFr: "Balance",
    durationLabel: "40 s",
    insightFr:
      "1 g de glycogène retient ~3 g d'eau, et les micro-courbatures attirent de l'eau locale pour réparer le muscle.",
    actionFr: "Observez toujours la courbe lissée EMA sur 7 jours plutôt qu'une pesée isolée.",
    scienceRef: "Kreitzman et al. / Hall K. NIH",
  },
  {
    id: "mind-4",
    titleFr: "Le piège des aliments « invisibles »",
    tagFr: "Précision",
    durationLabel: "30 s",
    insightFr:
      "Deux cuillères à soupe d'huile d'olive ajoutées en cuisson pèsent ~240 kcal sans modifier le volume visible du plat.",
    actionFr: "Dosez les huiles et sauces à la cuillère : vous gagnez 200 kcal/j sans réduire votre assiette.",
    scienceRef: "ANSES Ciqual / Rolls Volumetrics",
  },
  {
    id: "mind-5",
    titleFr: "L'effet des protéines dès le premier repas",
    tagFr: "Horloge",
    durationLabel: "35 s",
    insightFr:
      "Démarrer sa fenêtre alimentaire par 25–35 g de protéines réduit les fringales de 17 h via le peptide PYY.",
    actionFr: "Œufs, skyr, fromage blanc ou poisson dès le premier repas.",
    scienceRef: "Leidy et al., AJCN",
  },
  {
    id: "mind-6",
    titleFr: "La règle des 2 minutes les jours de fatigue",
    tagFr: "Motivation",
    durationLabel: "25 s",
    insightFr:
      "L'objectif d'une journée difficile n'est pas le record : c'est de ne pas briser le fil.",
    actionFr: "Activez « Journée difficile » dans Bouger et faites seulement 2 minutes d'étirement.",
    scienceRef: "BJ Fogg Tiny Habits",
  },
  {
    id: "mind-7",
    titleFr: "Marche de 10 minutes après le repas",
    tagFr: "Glycémie",
    durationLabel: "30 s",
    insightFr:
      "Contracter les jambes juste après le repas fait entrer le glucose dans le muscle via GLUT4 sans pic d'insuline.",
    actionFr: "Marchez 10 minutes dans votre quartier ou chez vous après le repas le plus copieux.",
    scienceRef: "Buffey et al., Sports Medicine 2022",
  },
];

export function getTodayMindsetLesson(dateKey: string): MindsetLesson {
  const num = Number(dateKey.replace(/-/g, "")) || 0;
  return MINDSET_LESSONS[num % MINDSET_LESSONS.length];
}

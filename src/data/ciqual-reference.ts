import {
  MacroTotals,
  MealFoodItem,
  MealType,
  MicroTotals,
  OilLevel,
} from "@/types/vitalpulse";

export interface CiqualEntry {
  id: string;
  name: string;
  aliases: string[];
  per100g: {
    kcal: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    fiberG: number;
    sugarG: number;
    satFatG: number;
    sodiumMg: number;
    ironMg: number;
    magnesiumMg: number;
    calciumMg: number;
    potassiumMg: number;
    vitCMg: number;
    vitDUg: number;
  };
  defaultServingG: number;
  unitWeightG?: number; // poids moyen d'1 pièce/tranche/tasse/bol pour quantités en français
  gi: number; // Glycemic index 0..100
  novaGroup: 1 | 2 | 3 | 4;
}

/**
 * Référentiel nutritionnel embarqué ANSES Ciqual (France / Europe).
 * Permet un ancrage déterministe fiable même si Open Food Facts est indisponible (503).
 */
export const CIQUAL_REFERENCE: CiqualEntry[] = [
  {
    id: "ciq-saumon-cuit",
    name: "Saumon cuit au four ou vapeur",
    aliases: ["saumon", "salmon", "pavé de saumon", "saumon grillé"],
    per100g: {
      kcal: 206, proteinG: 22.1, carbsG: 0, fatG: 13.0, fiberG: 0, sugarG: 0, satFatG: 2.5, sodiumMg: 61,
      ironMg: 0.4, magnesiumMg: 29, calciumMg: 14, potassiumMg: 390, vitCMg: 0, vitDUg: 8.7,
    },
    defaultServingG: 140, gi: 0, novaGroup: 1,
  },
  {
    id: "ciq-poulet-filet",
    name: "Blanc de poulet cuit (filet)",
    aliases: ["poulet", "blanc de poulet", "filet de poulet", "chicken", "volaille"],
    per100g: {
      kcal: 158, proteinG: 30.2, carbsG: 0, fatG: 3.6, fiberG: 0, sugarG: 0, satFatG: 1.0, sodiumMg: 74,
      ironMg: 0.7, magnesiumMg: 28, calciumMg: 13, potassiumMg: 340, vitCMg: 0, vitDUg: 0.2,
    },
    defaultServingG: 140, gi: 0, novaGroup: 1,
  },
  {
    id: "ciq-dinde-escalope",
    name: "Escalope de dinde cuite",
    aliases: ["dinde", "escalope de dinde", "turkey"],
    per100g: {
      kcal: 135, proteinG: 29.0, carbsG: 0, fatG: 1.8, fiberG: 0, sugarG: 0, satFatG: 0.5, sodiumMg: 68,
      ironMg: 1.1, magnesiumMg: 29, calciumMg: 12, potassiumMg: 310, vitCMg: 0, vitDUg: 0.2,
    },
    defaultServingG: 135, gi: 0, novaGroup: 1,
  },
  {
    id: "ciq-boeuf-steak",
    name: "Steak de bœuf grillé (5% MG)",
    aliases: ["boeuf", "bœuf", "steak", "viande hachée", "beef", "bavette"],
    per100g: {
      kcal: 162, proteinG: 27.5, carbsG: 0, fatG: 5.4, fiberG: 0, sugarG: 0, satFatG: 2.3, sodiumMg: 65,
      ironMg: 2.9, magnesiumMg: 24, calciumMg: 9, potassiumMg: 360, vitCMg: 0, vitDUg: 0.3,
    },
    defaultServingG: 130, gi: 0, novaGroup: 1,
  },
  {
    id: "ciq-cabillaud",
    name: "Cabillaud / poisson blanc cuit vapeur",
    aliases: ["cabillaud", "colin", "merlu", "poisson blanc", "dorade", "bar"],
    per100g: {
      kcal: 92, proteinG: 20.5, carbsG: 0, fatG: 0.9, fiberG: 0, sugarG: 0, satFatG: 0.2, sodiumMg: 90,
      ironMg: 0.3, magnesiumMg: 26, calciumMg: 18, potassiumMg: 320, vitCMg: 0, vitDUg: 1.2,
    },
    defaultServingG: 150, gi: 0, novaGroup: 1,
  },
  {
    id: "ciq-thon-nature",
    name: "Thon au naturel (égoutté)",
    aliases: ["thon", "tuna"],
    per100g: {
      kcal: 116, proteinG: 26.0, carbsG: 0, fatG: 1.0, fiberG: 0, sugarG: 0, satFatG: 0.3, sodiumMg: 320,
      ironMg: 1.2, magnesiumMg: 31, calciumMg: 10, potassiumMg: 250, vitCMg: 0, vitDUg: 2.1,
    },
    defaultServingG: 110, gi: 0, novaGroup: 3,
  },
  {
    id: "ciq-crevettes",
    name: "Crevettes cuites décortiquées",
    aliases: ["crevette", "crevettes", "gambas"],
    per100g: {
      kcal: 99, proteinG: 21.0, carbsG: 0.5, fatG: 1.1, fiberG: 0, sugarG: 0, satFatG: 0.3, sodiumMg: 290,
      ironMg: 1.8, magnesiumMg: 34, calciumMg: 70, potassiumMg: 210, vitCMg: 0, vitDUg: 0.1,
    },
    defaultServingG: 120, gi: 0, novaGroup: 1,
  },
  {
    id: "ciq-oeuf",
    name: "Œuf entier cuit (dur / mollet / au plat / omelette)",
    aliases: [
      "oeufs durs",
      "oeuf dur",
      "oeufs mollets",
      "oeuf mollet",
      "oeufs au plat",
      "oeuf au plat",
      "oeufs brouilles",
      "oeuf brouille",
      "omelette",
      "oeufs",
      "oeuf",
      "eggs",
      "egg",
    ],
    per100g: {
      kcal: 145, proteinG: 12.6, carbsG: 0.7, fatG: 10.3, fiberG: 0, sugarG: 0.5, satFatG: 3.1, sodiumMg: 126,
      ironMg: 1.8, magnesiumMg: 12, calciumMg: 52, potassiumMg: 130, vitCMg: 0, vitDUg: 2.0,
    },
    defaultServingG: 110, unitWeightG: 55, gi: 0, novaGroup: 1,
  },
  {
    id: "ciq-tofu",
    name: "Tofu nature ferme",
    aliases: ["tofu"],
    per100g: {
      kcal: 128, proteinG: 13.5, carbsG: 1.9, fatG: 7.2, fiberG: 1.1, sugarG: 0.5, satFatG: 1.1, sodiumMg: 12,
      ironMg: 2.2, magnesiumMg: 48, calciumMg: 220, potassiumMg: 160, vitCMg: 0, vitDUg: 0,
    },
    defaultServingG: 140, gi: 15, novaGroup: 3,
  },
  {
    id: "ciq-lentilles",
    name: "Lentilles cuites à l'eau",
    aliases: ["lentille", "lentilles", "lentils"],
    per100g: {
      kcal: 115, proteinG: 9.0, carbsG: 16.5, fatG: 0.5, fiberG: 7.9, sugarG: 1.2, satFatG: 0.1, sodiumMg: 4,
      ironMg: 3.3, magnesiumMg: 36, calciumMg: 19, potassiumMg: 369, vitCMg: 1.5, vitDUg: 0,
    },
    defaultServingG: 180, gi: 29, novaGroup: 1,
  },
  {
    id: "ciq-pois-chiches",
    name: "Pois chiches cuits",
    aliases: ["pois chiche", "pois chiches", "houmous", "chickpeas"],
    per100g: {
      kcal: 148, proteinG: 8.4, carbsG: 20.5, fatG: 2.6, fiberG: 7.2, sugarG: 2.8, satFatG: 0.3, sodiumMg: 18,
      ironMg: 2.6, magnesiumMg: 42, calciumMg: 46, potassiumMg: 280, vitCMg: 1.3, vitDUg: 0,
    },
    defaultServingG: 150, gi: 28, novaGroup: 1,
  },
  {
    id: "ciq-haricots-rouges",
    name: "Haricots rouges cuits",
    aliases: ["haricot rouge", "haricots rouges"],
    per100g: {
      kcal: 118, proteinG: 8.5, carbsG: 17.5, fatG: 0.6, fiberG: 7.4, sugarG: 0.8, satFatG: 0.1, sodiumMg: 6,
      ironMg: 2.7, magnesiumMg: 45, calciumMg: 35, potassiumMg: 380, vitCMg: 1.2, vitDUg: 0,
    },
    defaultServingG: 150, gi: 24, novaGroup: 1,
  },
  {
    id: "ciq-quinoa",
    name: "Quinoa cuit",
    aliases: ["quinoa"],
    per100g: {
      kcal: 120, proteinG: 4.4, carbsG: 19.8, fatG: 1.9, fiberG: 2.8, sugarG: 0.9, satFatG: 0.2, sodiumMg: 7,
      ironMg: 1.5, magnesiumMg: 64, calciumMg: 17, potassiumMg: 172, vitCMg: 0, vitDUg: 0,
    },
    defaultServingG: 160, gi: 53, novaGroup: 1,
  },
  {
    id: "ciq-riz-basmati",
    name: "Riz basmati cuit",
    aliases: ["riz", "riz basmati", "riz blanc", "rice"],
    per100g: {
      kcal: 128, proteinG: 2.9, carbsG: 28.0, fatG: 0.3, fiberG: 0.6, sugarG: 0.1, satFatG: 0.1, sodiumMg: 2,
      ironMg: 0.3, magnesiumMg: 12, calciumMg: 8, potassiumMg: 38, vitCMg: 0, vitDUg: 0,
    },
    defaultServingG: 160, gi: 58, novaGroup: 1,
  },
  {
    id: "ciq-riz-complet",
    name: "Riz complet cuit",
    aliases: ["riz complet", "riz brun"],
    per100g: {
      kcal: 123, proteinG: 2.7, carbsG: 24.5, fatG: 1.0, fiberG: 1.8, sugarG: 0.4, satFatG: 0.2, sodiumMg: 4,
      ironMg: 0.5, magnesiumMg: 44, calciumMg: 10, potassiumMg: 86, vitCMg: 0, vitDUg: 0,
    },
    defaultServingG: 160, gi: 50, novaGroup: 1,
  },
  {
    id: "ciq-pates-cuites",
    name: "Pâtes blanches cuites al dente",
    aliases: ["pâte", "pâtes", "spaghetti", "penne", "tagliatelle", "pasta", "macaroni"],
    per100g: {
      kcal: 138, proteinG: 4.8, carbsG: 27.5, fatG: 0.7, fiberG: 1.4, sugarG: 0.8, satFatG: 0.1, sodiumMg: 5,
      ironMg: 0.6, magnesiumMg: 18, calciumMg: 8, potassiumMg: 44, vitCMg: 0, vitDUg: 0,
    },
    defaultServingG: 180, gi: 52, novaGroup: 1,
  },
  {
    id: "ciq-pates-completes",
    name: "Pâtes complètes cuites",
    aliases: ["pâtes complètes", "spaghetti complets"],
    per100g: {
      kcal: 129, proteinG: 5.2, carbsG: 24.0, fatG: 0.9, fiberG: 3.9, sugarG: 0.8, satFatG: 0.2, sodiumMg: 4,
      ironMg: 1.1, magnesiumMg: 36, calciumMg: 14, potassiumMg: 85, vitCMg: 0, vitDUg: 0,
    },
    defaultServingG: 180, gi: 42, novaGroup: 1,
  },
  {
    id: "ciq-pomme-terre",
    name: "Pomme de terre cuite vapeur ou four",
    aliases: ["pomme de terre", "pommes de terre", "patate", "purée"],
    per100g: {
      kcal: 82, proteinG: 2.0, carbsG: 17.5, fatG: 0.1, fiberG: 1.8, sugarG: 0.9, satFatG: 0, sodiumMg: 6,
      ironMg: 0.4, magnesiumMg: 21, calciumMg: 6, potassiumMg: 390, vitCMg: 12, vitDUg: 0,
    },
    defaultServingG: 180, gi: 68, novaGroup: 1,
  },
  {
    id: "ciq-frites",
    name: "Frites de pomme de terre",
    aliases: ["frite", "frites", "fries"],
    per100g: {
      kcal: 274, proteinG: 3.4, carbsG: 35.0, fatG: 13.0, fiberG: 3.2, sugarG: 0.5, satFatG: 2.5, sodiumMg: 210,
      ironMg: 0.8, magnesiumMg: 26, calciumMg: 12, potassiumMg: 480, vitCMg: 8, vitDUg: 0,
    },
    defaultServingG: 150, gi: 75, novaGroup: 3,
  },
  {
    id: "ciq-patate-douce",
    name: "Patate douce cuite au four",
    aliases: ["patate douce"],
    per100g: {
      kcal: 88, proteinG: 1.8, carbsG: 19.2, fatG: 0.2, fiberG: 3.0, sugarG: 5.5, satFatG: 0, sodiumMg: 28,
      ironMg: 0.6, magnesiumMg: 25, calciumMg: 32, potassiumMg: 340, vitCMg: 16, vitDUg: 0,
    },
    defaultServingG: 180, gi: 54, novaGroup: 1,
  },
  {
    id: "ciq-pain-complet",
    name: "Pain complet / aux céréales",
    aliases: ["pain complet", "pain aux cereales", "pain cereales"],
    per100g: {
      kcal: 247, proteinG: 9.2, carbsG: 43.0, fatG: 2.5, fiberG: 6.5, sugarG: 2.6, satFatG: 0.5, sodiumMg: 480,
      ironMg: 2.3, magnesiumMg: 62, calciumMg: 45, potassiumMg: 210, vitCMg: 0, vitDUg: 0,
    },
    defaultServingG: 60, gi: 50, novaGroup: 3,
  },
  {
    id: "ciq-pain-gris",
    name: "Pain demi-gris / Pain gris (tartine)",
    aliases: [
      "tartines de pain demi gris",
      "tartine de pain demi gris",
      "tartines demi gris",
      "tartine demi gris",
      "tartines de pain gris",
      "tartine de pain gris",
      "tartines pain gris",
      "tartine pain gris",
      "pain demi gris",
      "demi gris",
      "pain gris",
      "tartines de pain",
      "tartine de pain",
      "tartines",
      "tartine",
    ],
    per100g: {
      kcal: 248, proteinG: 8.8, carbsG: 46.5, fatG: 1.8, fiberG: 4.8, sugarG: 2.4, satFatG: 0.4, sodiumMg: 470,
      ironMg: 1.8, magnesiumMg: 45, calciumMg: 36, potassiumMg: 175, vitCMg: 0, vitDUg: 0,
    },
    defaultServingG: 70, unitWeightG: 35, gi: 62, novaGroup: 3,
  },
  {
    id: "ciq-baguette",
    name: "Pain baguette tradition",
    aliases: ["pain", "baguette", "crouton", "sandwich"],
    per100g: {
      kcal: 274, proteinG: 8.8, carbsG: 56.0, fatG: 1.2, fiberG: 3.1, sugarG: 2.1, satFatG: 0.3, sodiumMg: 540,
      ironMg: 1.2, magnesiumMg: 24, calciumMg: 25, potassiumMg: 115, vitCMg: 0, vitDUg: 0,
    },
    defaultServingG: 60, gi: 75, novaGroup: 3,
  },
  {
    id: "ciq-flocons-avoine",
    name: "Flocons d'avoine",
    aliases: ["avoine", "flocons d'avoine", "porridge", "muesli"],
    per100g: {
      kcal: 368, proteinG: 13.2, carbsG: 58.0, fatG: 6.8, fiberG: 10.1, sugarG: 1.2, satFatG: 1.2, sodiumMg: 5,
      ironMg: 4.3, magnesiumMg: 138, calciumMg: 52, potassiumMg: 360, vitCMg: 0, vitDUg: 0,
    },
    defaultServingG: 50, gi: 55, novaGroup: 1,
  },
  {
    id: "ciq-brocoli",
    name: "Brocoli cuit vapeur",
    aliases: ["brocoli", "brocolis", "broccoli"],
    per100g: {
      kcal: 31, proteinG: 2.8, carbsG: 2.8, fatG: 0.4, fiberG: 3.0, sugarG: 1.4, satFatG: 0.1, sodiumMg: 24,
      ironMg: 0.7, magnesiumMg: 21, calciumMg: 43, potassiumMg: 240, vitCMg: 58, vitDUg: 0,
    },
    defaultServingG: 150, gi: 15, novaGroup: 1,
  },
  {
    id: "ciq-haricots-verts",
    name: "Haricots verts cuits",
    aliases: ["haricots verts", "haricot vert"],
    per100g: {
      kcal: 31, proteinG: 1.9, carbsG: 4.2, fatG: 0.2, fiberG: 3.2, sugarG: 2.0, satFatG: 0, sodiumMg: 5,
      ironMg: 0.8, magnesiumMg: 19, calciumMg: 42, potassiumMg: 190, vitCMg: 10, vitDUg: 0,
    },
    defaultServingG: 150, gi: 15, novaGroup: 1,
  },
  {
    id: "ciq-courgette",
    name: "Courgette poêlée ou vapeur",
    aliases: ["courgette", "courgettes"],
    per100g: {
      kcal: 20, proteinG: 1.3, carbsG: 2.6, fatG: 0.2, fiberG: 1.2, sugarG: 1.8, satFatG: 0, sodiumMg: 4,
      ironMg: 0.4, magnesiumMg: 18, calciumMg: 18, potassiumMg: 240, vitCMg: 14, vitDUg: 0,
    },
    defaultServingG: 150, gi: 15, novaGroup: 1,
  },
  {
    id: "ciq-tomate",
    name: "Tomate fraîche / cerise",
    aliases: ["tomate", "tomates", "tomates cerises"],
    per100g: {
      kcal: 19, proteinG: 0.9, carbsG: 2.8, fatG: 0.2, fiberG: 1.2, sugarG: 2.5, satFatG: 0, sodiumMg: 5,
      ironMg: 0.3, magnesiumMg: 11, calciumMg: 10, potassiumMg: 237, vitCMg: 16, vitDUg: 0,
    },
    defaultServingG: 120, gi: 15, novaGroup: 1,
  },
  {
    id: "ciq-salade-verte",
    name: "Salade verte / roquette / épinards crus",
    aliases: ["salade", "laitue", "roquette", "épinards", "epinards", "mâche", "crudités"],
    per100g: {
      kcal: 17, proteinG: 1.6, carbsG: 1.4, fatG: 0.3, fiberG: 1.7, sugarG: 0.7, satFatG: 0, sodiumMg: 22,
      ironMg: 1.4, magnesiumMg: 34, calciumMg: 58, potassiumMg: 310, vitCMg: 18, vitDUg: 0,
    },
    defaultServingG: 80, gi: 15, novaGroup: 1,
  },
  {
    id: "ciq-champignon",
    name: "Champignons de Paris sautés",
    aliases: ["champignon", "champignons"],
    per100g: {
      kcal: 26, proteinG: 2.8, carbsG: 1.6, fatG: 0.4, fiberG: 1.7, sugarG: 0.9, satFatG: 0.1, sodiumMg: 8,
      ironMg: 0.6, magnesiumMg: 12, calciumMg: 5, potassiumMg: 350, vitCMg: 2, vitDUg: 0.2,
    },
    defaultServingG: 100, gi: 15, novaGroup: 1,
  },
  {
    id: "ciq-carotte",
    name: "Carottes crues ou cuites",
    aliases: ["carotte", "carottes"],
    per100g: {
      kcal: 36, proteinG: 0.8, carbsG: 6.8, fatG: 0.2, fiberG: 2.7, sugarG: 4.9, satFatG: 0, sodiumMg: 48,
      ironMg: 0.3, magnesiumMg: 12, calciumMg: 30, potassiumMg: 270, vitCMg: 6, vitDUg: 0,
    },
    defaultServingG: 100, gi: 35, novaGroup: 1,
  },
  {
    id: "ciq-poivron",
    name: "Poivron rouge / vert",
    aliases: ["poivron", "poivrons"],
    per100g: {
      kcal: 28, proteinG: 1.0, carbsG: 4.8, fatG: 0.3, fiberG: 2.0, sugarG: 4.2, satFatG: 0, sodiumMg: 3,
      ironMg: 0.4, magnesiumMg: 12, calciumMg: 8, potassiumMg: 210, vitCMg: 126, vitDUg: 0,
    },
    defaultServingG: 100, gi: 15, novaGroup: 1,
  },
  {
    id: "ciq-concombre",
    name: "Concombre frais",
    aliases: ["concombre"],
    per100g: {
      kcal: 14, proteinG: 0.7, carbsG: 2.0, fatG: 0.1, fiberG: 0.7, sugarG: 1.5, satFatG: 0, sodiumMg: 2,
      ironMg: 0.2, magnesiumMg: 12, calciumMg: 16, potassiumMg: 147, vitCMg: 3, vitDUg: 0,
    },
    defaultServingG: 100, gi: 15, novaGroup: 1,
  },
  {
    id: "ciq-oignon",
    name: "Oignon / ail / échalote",
    aliases: ["oignon", "oignons", "ail"],
    per100g: {
      kcal: 40, proteinG: 1.1, carbsG: 7.5, fatG: 0.2, fiberG: 1.7, sugarG: 4.5, satFatG: 0, sodiumMg: 4,
      ironMg: 0.2, magnesiumMg: 10, calciumMg: 23, potassiumMg: 146, vitCMg: 7, vitDUg: 0,
    },
    defaultServingG: 50, gi: 15, novaGroup: 1,
  },
  {
    id: "ciq-avocat",
    name: "Avocat frais",
    aliases: ["avocat", "guacamole"],
    per100g: {
      kcal: 165, proteinG: 1.9, carbsG: 2.0, fatG: 15.2, fiberG: 6.5, sugarG: 0.7, satFatG: 2.2, sodiumMg: 7,
      ironMg: 0.6, magnesiumMg: 29, calciumMg: 12, potassiumMg: 485, vitCMg: 10, vitDUg: 0,
    },
    defaultServingG: 80, gi: 10, novaGroup: 1,
  },
  {
    id: "ciq-huile-olive",
    name: "Huile d'olive vierge extra",
    aliases: ["huile d'olive", "huile olive", "huile"],
    per100g: {
      kcal: 884, proteinG: 0, carbsG: 0, fatG: 100, fiberG: 0, sugarG: 0, satFatG: 14.0, sodiumMg: 0,
      ironMg: 0, magnesiumMg: 0, calciumMg: 0, potassiumMg: 0, vitCMg: 0, vitDUg: 0,
    },
    defaultServingG: 10, gi: 0, novaGroup: 2,
  },
  {
    id: "ciq-beurre",
    name: "Beurre doux ou demi-sel",
    aliases: ["beurre"],
    per100g: {
      kcal: 745, proteinG: 0.7, carbsG: 0.6, fatG: 82.0, fiberG: 0, sugarG: 0.6, satFatG: 53.0, sodiumMg: 180,
      ironMg: 0, magnesiumMg: 2, calciumMg: 16, potassiumMg: 24, vitCMg: 0, vitDUg: 1.2,
    },
    defaultServingG: 10, gi: 0, novaGroup: 2,
  },
  {
    id: "ciq-lait-coco",
    name: "Lait de coco cuisine",
    aliases: ["lait de coco", "curry coco", "coco"],
    per100g: {
      kcal: 185, proteinG: 1.8, carbsG: 3.1, fatG: 18.5, fiberG: 0.5, sugarG: 2.1, satFatG: 16.0, sodiumMg: 15,
      ironMg: 1.2, magnesiumMg: 32, calciumMg: 14, potassiumMg: 210, vitCMg: 1, vitDUg: 0,
    },
    defaultServingG: 80, gi: 20, novaGroup: 2,
  },
  {
    id: "ciq-feta",
    name: "Fromage Feta / Chèvre",
    aliases: ["feta", "féta", "chèvre", "fromage de chèvre"],
    per100g: {
      kcal: 265, proteinG: 14.5, carbsG: 2.5, fatG: 21.5, fiberG: 0, sugarG: 2.5, satFatG: 14.5, sodiumMg: 920,
      ironMg: 0.6, magnesiumMg: 19, calciumMg: 460, potassiumMg: 62, vitCMg: 0, vitDUg: 0.4,
    },
    defaultServingG: 40, gi: 0, novaGroup: 3,
  },
  {
    id: "ciq-fromage-rape",
    name: "Fromage râpé / Emmental / Comté / Mozzarella",
    aliases: ["fromage", "emmental", "comté", "mozzarella", "parmesan", "gruyère"],
    per100g: {
      kcal: 350, proteinG: 25.0, carbsG: 1.2, fatG: 27.0, fiberG: 0, sugarG: 0.8, satFatG: 17.5, sodiumMg: 580,
      ironMg: 0.4, magnesiumMg: 35, calciumMg: 820, potassiumMg: 95, vitCMg: 0, vitDUg: 0.3,
    },
    defaultServingG: 35, gi: 0, novaGroup: 3,
  },
  {
    id: "ciq-yaourt-grec",
    name: "Skyr / Yaourt grec nature 0–2%",
    aliases: ["skyr", "yaourt grec", "yaourt", "fromage blanc"],
    per100g: {
      kcal: 64, proteinG: 9.8, carbsG: 3.8, fatG: 0.8, fiberG: 0, sugarG: 3.6, satFatG: 0.5, sodiumMg: 38,
      ironMg: 0.1, magnesiumMg: 11, calciumMg: 120, potassiumMg: 145, vitCMg: 0, vitDUg: 0.1,
    },
    defaultServingG: 150, gi: 30, novaGroup: 1,
  },
  {
    id: "ciq-pomme",
    name: "Pomme fraîche",
    aliases: ["pomme"],
    per100g: {
      kcal: 54, proteinG: 0.3, carbsG: 11.8, fatG: 0.2, fiberG: 2.3, sugarG: 10.4, satFatG: 0, sodiumMg: 1,
      ironMg: 0.1, magnesiumMg: 5, calciumMg: 6, potassiumMg: 110, vitCMg: 5, vitDUg: 0,
    },
    defaultServingG: 150, gi: 36, novaGroup: 1,
  },
  {
    id: "ciq-banane",
    name: "Banane",
    aliases: ["banane"],
    per100g: {
      kcal: 89, proteinG: 1.1, carbsG: 20.5, fatG: 0.3, fiberG: 2.6, sugarG: 15.0, satFatG: 0.1, sodiumMg: 1,
      ironMg: 0.3, magnesiumMg: 27, calciumMg: 5, potassiumMg: 358, vitCMg: 8.7, vitDUg: 0,
    },
    defaultServingG: 120, gi: 51, novaGroup: 1,
  },
  {
    id: "ciq-fruits-rouges",
    name: "Myrtilles / Framboises / Fraises",
    aliases: ["myrtille", "myrtilles", "fraise", "fraises", "framboise", "fruits rouges"],
    per100g: {
      kcal: 45, proteinG: 0.9, carbsG: 8.5, fatG: 0.3, fiberG: 3.5, sugarG: 6.2, satFatG: 0, sodiumMg: 2,
      ironMg: 0.4, magnesiumMg: 12, calciumMg: 18, potassiumMg: 150, vitCMg: 42, vitDUg: 0,
    },
    defaultServingG: 100, gi: 30, novaGroup: 1,
  },
  {
    id: "ciq-amandes",
    name: "Amandes / Noix / Noisettes",
    aliases: ["amande", "amandes", "noix", "noisette", "noix de cajou"],
    per100g: {
      kcal: 605, proteinG: 21.0, carbsG: 6.5, fatG: 52.0, fiberG: 10.5, sugarG: 4.1, satFatG: 4.2, sodiumMg: 3,
      ironMg: 3.6, magnesiumMg: 250, calciumMg: 240, potassiumMg: 710, vitCMg: 0, vitDUg: 0,
    },
    defaultServingG: 25, gi: 15, novaGroup: 1,
  },
  {
    id: "ciq-burger-maison",
    name: "Burger artisanal ou fast-food",
    aliases: ["burger", "hamburger", "cheeseburger"],
    per100g: {
      kcal: 254, proteinG: 13.5, carbsG: 22.0, fatG: 12.4, fiberG: 1.6, sugarG: 4.2, satFatG: 5.1, sodiumMg: 520,
      ironMg: 1.8, magnesiumMg: 21, calciumMg: 88, potassiumMg: 220, vitCMg: 1, vitDUg: 0.2,
    },
    defaultServingG: 240, gi: 66, novaGroup: 4,
  },
  {
    id: "ciq-pizza",
    name: "Pizza mozzarella / jambon / légumes",
    aliases: ["pizza", "margherita", "calzone"],
    per100g: {
      kcal: 248, proteinG: 10.8, carbsG: 29.0, fatG: 9.8, fiberG: 1.9, sugarG: 3.1, satFatG: 4.4, sodiumMg: 560,
      ironMg: 1.2, magnesiumMg: 22, calciumMg: 165, potassiumMg: 185, vitCMg: 3, vitDUg: 0.2,
    },
    defaultServingG: 300, gi: 65, novaGroup: 4,
  },
  {
    id: "ciq-sushi",
    name: "Sushi / Maki saumon & riz vinaigré",
    aliases: ["sushi", "sushis", "maki", "poke bowl", "pokebowl"],
    per100g: {
      kcal: 152, proteinG: 6.8, carbsG: 24.5, fatG: 2.9, fiberG: 0.8, sugarG: 2.8, satFatG: 0.6, sodiumMg: 390,
      ironMg: 0.6, magnesiumMg: 18, calciumMg: 14, potassiumMg: 145, vitCMg: 1, vitDUg: 2.0,
    },
    defaultServingG: 240, gi: 55, novaGroup: 3,
  },
  {
    id: "ciq-sauce-tomate",
    name: "Sauce tomate maison / bolognaise légère",
    aliases: ["sauce tomate", "bolognaise", "coulis"],
    per100g: {
      kcal: 62, proteinG: 2.1, carbsG: 7.4, fatG: 2.4, fiberG: 1.8, sugarG: 5.1, satFatG: 0.4, sodiumMg: 290,
      ironMg: 0.7, magnesiumMg: 16, calciumMg: 22, potassiumMg: 310, vitCMg: 11, vitDUg: 0,
    },
    defaultServingG: 100, gi: 35, novaGroup: 3,
  },
  {
    id: "ciq-chocolat-noir",
    name: "Chocolat noir 70–85%",
    aliases: ["chocolat", "chocolat noir"],
    per100g: {
      kcal: 568, proteinG: 8.5, carbsG: 32.0, fatG: 42.0, fiberG: 11.0, sugarG: 24.0, satFatG: 25.0, sodiumMg: 14,
      ironMg: 8.5, magnesiumMg: 185, calciumMg: 62, potassiumMg: 620, vitCMg: 0, vitDUg: 0,
    },
    defaultServingG: 20, gi: 23, novaGroup: 3,
  },
  {
    id: "ciq-bacon",
    name: "Bacon cuit / en morceaux (poitrine fumée grillée)",
    aliases: [
      "bacon en morceaux",
      "bacon en morceau",
      "morceaux de bacon",
      "morceau de bacon",
      "bacon grille",
      "bacon fume",
      "poitrine fumee",
      "bacons",
      "bacon",
    ],
    per100g: {
      kcal: 220, proteinG: 18.0, carbsG: 0.6, fatG: 16.0, fiberG: 0, sugarG: 0.4, satFatG: 5.5, sodiumMg: 780,
      ironMg: 0.8, magnesiumMg: 18, calciumMg: 10, potassiumMg: 310, vitCMg: 0, vitDUg: 0.4,
    },
    defaultServingG: 45, unitWeightG: 20, gi: 0, novaGroup: 3,
  },
  {
    id: "ciq-filet-bacon-maigre",
    name: "Filet de bacon fumé maigre",
    aliases: ["filet de bacon", "bacon maigre", "tranche de bacon maigre"],
    per100g: {
      kcal: 125, proteinG: 21.0, carbsG: 0.6, fatG: 3.5, fiberG: 0, sugarG: 0.4, satFatG: 1.2, sodiumMg: 820,
      ironMg: 0.9, magnesiumMg: 21, calciumMg: 8, potassiumMg: 340, vitCMg: 0, vitDUg: 0.2,
    },
    defaultServingG: 50, unitWeightG: 25, gi: 0, novaGroup: 3,
  },
  {
    id: "ciq-lardons",
    name: "Lardons ou allumettes fumés / nature",
    aliases: ["allumettes de bacon", "allumettes fumees", "lardons", "lardon"],
    per100g: {
      kcal: 269, proteinG: 16.6, carbsG: 0.8, fatG: 22.1, fiberG: 0, sugarG: 0.5, satFatG: 8.2, sodiumMg: 890,
      ironMg: 0.8, magnesiumMg: 16, calciumMg: 10, potassiumMg: 270, vitCMg: 0, vitDUg: 0.5,
    },
    defaultServingG: 60, gi: 0, novaGroup: 3,
  },
  {
    id: "ciq-jambon-blanc",
    name: "Jambon blanc cuit dégraissé",
    aliases: ["jambon blanc", "jambon cuit", "jambon de dinde", "jambon de poulet", "jambon"],
    per100g: {
      kcal: 115, proteinG: 20.5, carbsG: 0.9, fatG: 3.0, fiberG: 0, sugarG: 0.5, satFatG: 1.0, sodiumMg: 780,
      ironMg: 0.9, magnesiumMg: 20, calciumMg: 10, potassiumMg: 320, vitCMg: 0, vitDUg: 0.2,
    },
    defaultServingG: 80, unitWeightG: 40, gi: 0, novaGroup: 3,
  },
  {
    id: "ciq-salami-saucisson",
    name: "Salami / Salami à l'ail / Saucisson",
    aliases: [
      "salami a l ail",
      "saucisson a l ail",
      "saucisson sec",
      "salami danois",
      "salami",
      "saucisson",
      "cervelas",
      "chorizo",
      "mortadelle",
      "rosette",
    ],
    per100g: {
      kcal: 325, proteinG: 19.5, carbsG: 1.5, fatG: 27.0, fiberG: 0, sugarG: 1.0, satFatG: 10.0, sodiumMg: 1420,
      ironMg: 1.4, magnesiumMg: 18, calciumMg: 15, potassiumMg: 310, vitCMg: 0, vitDUg: 0.4,
    },
    defaultServingG: 50, unitWeightG: 15, gi: 0, novaGroup: 4,
  },
  {
    id: "ciq-pate-tartiner",
    name: "Pâte à tartiner / Speculoos",
    aliases: ["pate a tartiner", "pate de speculoos", "nutella", "speculoos"],
    per100g: {
      kcal: 539, proteinG: 6.0, carbsG: 57.5, fatG: 30.9, fiberG: 3.4, sugarG: 56.0, satFatG: 10.6, sodiumMg: 42,
      ironMg: 2.2, magnesiumMg: 60, calciumMg: 105, potassiumMg: 400, vitCMg: 0, vitDUg: 0,
    },
    defaultServingG: 20, unitWeightG: 15, gi: 55, novaGroup: 4,
  },
  {
    id: "ciq-boeuf-hache",
    name: "Steak haché / Viande hachée 5–15% MG",
    aliases: ["steak hache", "viande hachee", "boulettes de boeuf", "boulettes"],
    per100g: {
      kcal: 185, proteinG: 20.2, carbsG: 0, fatG: 11.4, fiberG: 0, sugarG: 0, satFatG: 4.8, sodiumMg: 75,
      ironMg: 2.5, magnesiumMg: 21, calciumMg: 12, potassiumMg: 325, vitCMg: 0, vitDUg: 0.2,
    },
    defaultServingG: 125, unitWeightG: 125, gi: 0, novaGroup: 1,
  },
  {
    id: "ciq-fromage-blanc",
    name: "Fromage blanc ou Skyr (0–3%)",
    aliases: ["fromage blanc", "skyr", "faisselle", "petit suisse"],
    per100g: {
      kcal: 62, proteinG: 8.5, carbsG: 3.8, fatG: 1.2, fiberG: 0, sugarG: 3.8, satFatG: 0.8, sodiumMg: 42,
      ironMg: 0.1, magnesiumMg: 11, calciumMg: 125, potassiumMg: 150, vitCMg: 0, vitDUg: 0.1,
    },
    defaultServingG: 150, unitWeightG: 150, gi: 25, novaGroup: 1,
  },
  {
    id: "ciq-mozzarella",
    name: "Mozzarella / Burrata",
    aliases: ["mozzarella", "mozza", "burrata"],
    per100g: {
      kcal: 254, proteinG: 18.0, carbsG: 2.2, fatG: 19.5, fiberG: 0, sugarG: 1.0, satFatG: 13.0, sodiumMg: 520,
      ironMg: 0.3, magnesiumMg: 20, calciumMg: 505, potassiumMg: 76, vitCMg: 0, vitDUg: 0.4,
    },
    defaultServingG: 100, unitWeightG: 125, gi: 0, novaGroup: 2,
  },
  {
    id: "ciq-comte-fromage",
    name: "Fromage à pâte dure (Comté / Emmental / Cheddar)",
    aliases: ["comte", "emmental", "gruyere", "cheddar", "parmesan", "fromage"],
    per100g: {
      kcal: 380, proteinG: 26.0, carbsG: 0.8, fatG: 30.0, fiberG: 0, sugarG: 0.4, satFatG: 19.0, sodiumMg: 680,
      ironMg: 0.3, magnesiumMg: 34, calciumMg: 850, potassiumMg: 110, vitCMg: 0, vitDUg: 0.5,
    },
    defaultServingG: 40, unitWeightG: 30, gi: 0, novaGroup: 2,
  },
  {
    id: "ciq-yaourt-nature",
    name: "Yaourt nature ou brassé",
    aliases: ["yaourt nature", "yogourt", "yaourt"],
    per100g: {
      kcal: 58, proteinG: 4.3, carbsG: 4.8, fatG: 2.2, fiberG: 0, sugarG: 4.8, satFatG: 1.4, sodiumMg: 52,
      ironMg: 0.1, magnesiumMg: 12, calciumMg: 140, potassiumMg: 170, vitCMg: 0, vitDUg: 0.1,
    },
    defaultServingG: 125, unitWeightG: 125, gi: 35, novaGroup: 1,
  },
  {
    id: "ciq-lait",
    name: "Lait demi-écrémé",
    aliases: ["lait demi ecreme", "lait entier", "lait ecreme", "verre de lait", "lait"],
    per100g: {
      kcal: 47, proteinG: 3.3, carbsG: 4.8, fatG: 1.6, fiberG: 0, sugarG: 4.8, satFatG: 1.0, sodiumMg: 44,
      ironMg: 0.1, magnesiumMg: 11, calciumMg: 118, potassiumMg: 155, vitCMg: 1, vitDUg: 0.1,
    },
    defaultServingG: 200, unitWeightG: 200, gi: 31, novaGroup: 1,
  },
  {
    id: "ciq-cafe-the",
    name: "Café noir / Thé / Tisane (sans sucre)",
    aliases: ["cafe noir", "expresso", "espresso", "cafe", "the vert", "the noir", "infusion", "tisane", "the"],
    per100g: {
      kcal: 2, proteinG: 0.2, carbsG: 0.2, fatG: 0, fiberG: 0, sugarG: 0, satFatG: 0, sodiumMg: 2,
      ironMg: 0.1, magnesiumMg: 5, calciumMg: 3, potassiumMg: 60, vitCMg: 0, vitDUg: 0,
    },
    defaultServingG: 150, unitWeightG: 150, gi: 0, novaGroup: 1,
  },
  {
    id: "ciq-cappuccino-latte",
    name: "Cappuccino / Café au lait / Latte",
    aliases: ["cappuccino", "cafe au lait", "cafe latte", "cafe creme", "latte"],
    per100g: {
      kcal: 42, proteinG: 2.4, carbsG: 3.8, fatG: 1.8, fiberG: 0, sugarG: 3.6, satFatG: 1.1, sodiumMg: 35,
      ironMg: 0.1, magnesiumMg: 10, calciumMg: 85, potassiumMg: 140, vitCMg: 0, vitDUg: 0.1,
    },
    defaultServingG: 200, unitWeightG: 200, gi: 25, novaGroup: 2,
  },
  {
    id: "ciq-croissant",
    name: "Croissant / Viennoiserie au beurre",
    aliases: ["pain au chocolat", "chocolatine", "croissant", "brioche"],
    per100g: {
      kcal: 406, proteinG: 8.2, carbsG: 45.0, fatG: 21.0, fiberG: 2.4, sugarG: 11.0, satFatG: 12.5, sodiumMg: 380,
      ironMg: 1.4, magnesiumMg: 22, calciumMg: 38, potassiumMg: 120, vitCMg: 0, vitDUg: 0.2,
    },
    defaultServingG: 55, unitWeightG: 55, gi: 67, novaGroup: 3,
  },
  {
    id: "ciq-pain-mie",
    name: "Pain de mie / Toast",
    aliases: ["pain de mie", "toasts", "toast", "biscotte", "biscottes"],
    per100g: {
      kcal: 265, proteinG: 8.5, carbsG: 49.0, fatG: 3.5, fiberG: 3.2, sugarG: 5.5, satFatG: 0.9, sodiumMg: 460,
      ironMg: 1.4, magnesiumMg: 28, calciumMg: 75, potassiumMg: 135, vitCMg: 0, vitDUg: 0,
    },
    defaultServingG: 70, unitWeightG: 35, gi: 68, novaGroup: 3,
  },
  {
    id: "ciq-creme-fraiche",
    name: "Crème fraîche / Crème cuisine",
    aliases: ["creme fraiche", "creme liquide", "creme legere", "creme"],
    per100g: {
      kcal: 240, proteinG: 2.5, carbsG: 3.2, fatG: 24.0, fiberG: 0, sugarG: 3.2, satFatG: 16.0, sodiumMg: 38,
      ironMg: 0.1, magnesiumMg: 8, calciumMg: 80, potassiumMg: 110, vitCMg: 0, vitDUg: 0.3,
    },
    defaultServingG: 30, unitWeightG: 15, gi: 0, novaGroup: 2,
  },
  {
    id: "ciq-miel-confiture",
    name: "Miel ou Confiture",
    aliases: ["confiture", "sirop d erable", "miel"],
    per100g: {
      kcal: 295, proteinG: 0.3, carbsG: 74.0, fatG: 0, fiberG: 0.4, sugarG: 72.0, satFatG: 0, sodiumMg: 8,
      ironMg: 0.4, magnesiumMg: 4, calciumMg: 12, potassiumMg: 55, vitCMg: 2, vitDUg: 0,
    },
    defaultServingG: 20, unitWeightG: 15, gi: 61, novaGroup: 2,
  },
  {
    id: "ciq-noix",
    name: "Noix, Noisettes ou Cacahuètes",
    aliases: ["beurre de cacahuete", "noix de cajou", "cacahuetes", "pistaches", "noisettes", "noix"],
    per100g: {
      kcal: 635, proteinG: 18.0, carbsG: 11.0, fatG: 56.0, fiberG: 7.5, sugarG: 4.0, satFatG: 7.0, sodiumMg: 12,
      ironMg: 3.2, magnesiumMg: 165, calciumMg: 85, potassiumMg: 560, vitCMg: 1, vitDUg: 0,
    },
    defaultServingG: 30, unitWeightG: 30, gi: 15, novaGroup: 1,
  },
  {
    id: "ciq-pates-carbo-bolognaise",
    name: "Sauce bolognaise / Carbonara / Pesto",
    aliases: ["bolognaise", "carbonara", "pesto"],
    per100g: {
      kcal: 165, proteinG: 7.5, carbsG: 8.5, fatG: 11.0, fiberG: 1.5, sugarG: 3.5, satFatG: 4.5, sodiumMg: 520,
      ironMg: 1.1, magnesiumMg: 18, calciumMg: 55, potassiumMg: 260, vitCMg: 8, vitDUg: 0.1,
    },
    defaultServingG: 120, unitWeightG: 100, gi: 30, novaGroup: 3,
  },
  {
    id: "ciq-soupe-legumes",
    name: "Soupe ou Velouté de légumes",
    aliases: ["veloute", "potage", "soupe"],
    per100g: {
      kcal: 45, proteinG: 1.6, carbsG: 5.8, fatG: 1.5, fiberG: 1.8, sugarG: 2.5, satFatG: 0.4, sodiumMg: 260,
      ironMg: 0.5, magnesiumMg: 14, calciumMg: 24, potassiumMg: 210, vitCMg: 7, vitDUg: 0,
    },
    defaultServingG: 300, unitWeightG: 300, gi: 40, novaGroup: 2,
  },
  {
    id: "ciq-orange-clementine",
    name: "Orange, Clémentine ou Mandarine",
    aliases: ["clementine", "mandarine", "pamplemousse", "orange"],
    per100g: {
      kcal: 47, proteinG: 0.9, carbsG: 9.8, fatG: 0.2, fiberG: 2.2, sugarG: 8.5, satFatG: 0, sodiumMg: 2,
      ironMg: 0.2, magnesiumMg: 11, calciumMg: 38, potassiumMg: 175, vitCMg: 53, vitDUg: 0,
    },
    defaultServingG: 150, unitWeightG: 130, gi: 35, novaGroup: 1,
  },
  {
    id: "ciq-mayonnaise-vinaigrette",
    name: "Mayonnaise ou Vinaigrette",
    aliases: ["mayonnaise", "vinaigrette", "mayo"],
    per100g: {
      kcal: 560, proteinG: 1.2, carbsG: 2.5, fatG: 60.0, fiberG: 0, sugarG: 1.5, satFatG: 8.5, sodiumMg: 620,
      ironMg: 0.3, magnesiumMg: 2, calciumMg: 12, potassiumMg: 35, vitCMg: 0, vitDUg: 0.3,
    },
    defaultServingG: 20, unitWeightG: 15, gi: 0, novaGroup: 3,
  },
  {
    id: "ciq-whey-shaker",
    name: "Shaker protéiné (Whey / Caséine)",
    aliases: ["proteine en poudre", "scoop whey", "shaker", "whey"],
    per100g: {
      kcal: 385, proteinG: 78.0, carbsG: 6.5, fatG: 4.5, fiberG: 1.0, sugarG: 3.5, satFatG: 2.5, sodiumMg: 220,
      ironMg: 1.0, magnesiumMg: 75, calciumMg: 480, potassiumMg: 520, vitCMg: 0, vitDUg: 0,
    },
    defaultServingG: 30, unitWeightG: 30, gi: 20, novaGroup: 3,
  },
  {
    id: "ciq-plat-prepare-generique",
    name: "Plat préparé équilibré (viande/poisson + féculent + légumes)",
    aliases: ["plat", "repas", "assiette", "bowl"],
    per100g: {
      kcal: 138, proteinG: 9.2, carbsG: 14.5, fatG: 4.5, fiberG: 2.2, sugarG: 1.8, satFatG: 1.3, sodiumMg: 240,
      ironMg: 1.1, magnesiumMg: 25, calciumMg: 32, potassiumMg: 250, vitCMg: 8, vitDUg: 0.8,
    },
    defaultServingG: 380, gi: 48, novaGroup: 3,
  },
];

function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’\-/]/g, " ")
    .replace(/\bc\s*\.\s*a\s*\.\s*s\.?\b/g, "cas")
    .replace(/\bc\s*\.\s*a\s*\.\s*c\.?\b/g, "cac")
    .replace(/\s+/g, " ")
    .trim();
}

const FRENCH_NUMBER_WORDS: Record<string, number> = {
  un: 1,
  une: 1,
  deux: 2,
  trois: 3,
  quatre: 4,
  cinq: 5,
  six: 6,
  sept: 7,
  huit: 8,
  neuf: 9,
  dix: 10,
  onze: 11,
  douze: 12,
  demi: 0.5,
  moitie: 0.5,
  quart: 0.25,
};

const DEFAULT_UNIT_WEIGHT_BY_ID: Record<string, number> = {
  "ciq-oeuf": 55,
  "ciq-pomme": 150,
  "ciq-banane": 120,
  "ciq-avocat": 150,
  "ciq-tomate": 120,
  "ciq-baguette": 120,
  "ciq-pain-complet": 40,
  "ciq-feta": 40,
  "ciq-amandes": 30,
  "ciq-chocolat-noir": 10,
  "ciq-huile-olive": 12,
  "ciq-beurre": 12,
  "ciq-burger-maison": 260,
};

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseFrenchCountToken(token: string): number | null {
  const clean = token.trim().replace(",", ".");
  if (clean in FRENCH_NUMBER_WORDS) {
    return FRENCH_NUMBER_WORDS[clean];
  }
  const num = Number(clean);
  if (Number.isFinite(num) && num > 0 && num <= 30) {
    return num;
  }
  return null;
}

export function matchCiqualFood(query: string): CiqualEntry | null {
  const norm = normalizeText(query);
  let best: { entry: CiqualEntry; score: number } | null = null;
  for (const entry of CIQUAL_REFERENCE) {
    for (const alias of [entry.name, ...entry.aliases]) {
      const aNorm = normalizeText(alias);
      if (norm.includes(aNorm) || aNorm.includes(norm)) {
        const score = aNorm.length;
        if (!best || score > best.score) {
          best = { entry, score };
        }
      }
    }
  }
  return best?.entry ?? null;
}

export function applyOilClarifierDelta(oilLevel: OilLevel): number {
  if (oilLevel === "none") return 0;
  if (oilLevel === "light_1tbsp") return 110; // ~1 c.a.s huile d'olive (12 g)
  return 230; // cuisson riche / restaurant / sauce crémeuse
}

export function analyzeMealDeterministically(params: {
  userNotes: string;
  mealType: MealType;
  plateDiameterCm: number;
  portionEatenPct: number;
  oilLevel?: OilLevel;
}) {
  const notesNorm = normalizeText(params.userNotes || "");
  const plateScale = Math.max(0.75, Math.min(1.25, params.plateDiameterCm / 26));
  const eatenScale = Math.max(0.25, Math.min(1.5, params.portionEatenPct / 100));

  const matchedMap = new Map<string, { entry: CiqualEntry; grams: number }>();
  const usedIds = new Set<string>();

  // Candidats triés par longueur d'alias décroissante pour éviter les doubles détections
  // ("pomme de terre" ne déclenche pas "pomme", "filet de bacon" ne déclenche pas "bacon")
  const sortedCandidates = CIQUAL_REFERENCE.filter(
    (entry) => entry.id !== "ciq-plat-prepare-generique"
  )
    .flatMap((entry) =>
      entry.aliases.map((alias) => ({
        entry,
        aliasNorm: normalizeText(alias),
      }))
    )
    .filter((item) => item.aliasNorm.length >= 2)
    .sort((a, b) => b.aliasNorm.length - a.aliasNorm.length);

  const clauses = notesNorm
    .split(/\s*(?:[,;\n+]|\b(?:et|avec|accompagne de|puis)\b)\s*/)
    .map((c) => c.trim())
    .filter(Boolean);

  const countTokenPattern = Object.keys(FRENCH_NUMBER_WORDS).join("|");
  const preCountRegex = new RegExp(
    `(?:^|\\s)(${countTokenPattern}|\\d+(?:[.,]\\d+)?)\\s*(?:grosses?|petites?|belles?|grandes?|moyennes?|tranches?\\s+d[e']?\\s*|tartines?\\s+d[e']?\\s*|rondelles?\\s+d[e']?\\s*|morceaux?\\s+d[e']?\\s*|cuilleres?\\s+a\\s+(?:soupe|cafe)\\s+d[e']?\\s*|cas\\s+d[e']?\\s*|cac\\s+d[e']?\\s*|verres?\\s+d[e']?\\s*|bols?\\s+d[e']?\\s*|tasses?\\s+d[e']?\\s*|poignees?\\s+d[e']?\\s*|d[e']?\\s*)?$`
  );

  for (const clause of clauses.length > 0 ? clauses : [notesNorm]) {
    let workingClause = clause;
    for (const candidate of sortedCandidates) {
      const aEscaped = escapeRegex(candidate.aliasNorm);
      const matchRe = new RegExp(
        `(?:^|[^a-z0-9])(${aEscaped}(?:s|x)?)(?=$|[^a-z0-9])`
      );
      const match = matchRe.exec(workingClause);
      if (!match || typeof match.index !== "number") continue;

      const matchedWord = match[1];
      const prefixOffset = match[0].length - matchedWord.length;
      const start = match.index + prefixOffset;
      const end = start + matchedWord.length;
      const before = workingClause.slice(Math.max(0, start - 38), start).trim();
      const after = workingClause.slice(end, Math.min(workingClause.length, end + 24)).trim();

      let grams: number | null = null;
      const gramPre = before.match(
        /(\d+(?:[.,]\d+)?)\s*(g|gr|grammes?|ml|cl)(?:\s+d[eu']?)?\s*$/
      );
      const gramPost = after.match(/^[:\s]*(\d+(?:[.,]\d+)?)\s*(g|gr|grammes?|ml|cl)\b/);
      if (gramPre || gramPost) {
        const gMatch = gramPre ?? gramPost!;
        const val = Number(gMatch[1].replace(",", "."));
        const unit = gMatch[2];
        if (Number.isFinite(val) && val > 0) {
          grams = unit === "cl" ? val * 10 : val;
        }
      }

      if (grams === null) {
        const spoonMatch = before.match(
          new RegExp(
            `(${countTokenPattern}|\\d+(?:[.,]\\d+)?)\\s*(?:cas|cuilleres?\\s+a\\s+soupe|cac|cuilleres?\\s+a\\s+cafe)(?:\\s+d[eu']?)?$`
          )
        );
        if (spoonMatch) {
          const count = parseFrenchCountToken(spoonMatch[1]) ?? 1;
          const isTeaspoon = /cac|cafe/.test(spoonMatch[0]);
          const spoonG = isTeaspoon ? 5 : candidate.entry.id === "ciq-miel-confiture" ? 15 : 12;
          grams = count * spoonG;
        }
      }

      if (grams === null) {
        const containerMatch = before.match(
          new RegExp(
            `(${countTokenPattern}|\\d+(?:[.,]\\d+)?)?\\s*(bol|verre|tasse|poignee|tranche|tranches|tartine|tartines|rondelle|rondelles)(?:\\s+d[eu']?)?$`
          )
        );
        if (containerMatch) {
          const count = containerMatch[1] ? (parseFrenchCountToken(containerMatch[1]) ?? 1) : 1;
          const unitKind = containerMatch[2];
          const unitBase =
            unitKind === "bol"
              ? Math.max(200, candidate.entry.defaultServingG)
              : unitKind === "verre"
                ? 200
                : unitKind === "tasse"
                  ? 150
                  : unitKind === "poignee"
                    ? 30
                    : unitKind === "tartine" || unitKind === "tartines"
                      ? 35
                      : candidate.entry.unitWeightG ??
                        DEFAULT_UNIT_WEIGHT_BY_ID[candidate.entry.id] ??
                        20;
          grams = count * unitBase;
        }
      }

      if (grams === null) {
        const countMatch = before.match(preCountRegex);
        const unitG =
          candidate.entry.unitWeightG ?? DEFAULT_UNIT_WEIGHT_BY_ID[candidate.entry.id];
        if (countMatch && unitG) {
          const count = parseFrenchCountToken(countMatch[1]);
          if (count !== null) {
            grams = count * unitG;
          }
        } else if (countMatch && !unitG) {
          const count = parseFrenchCountToken(countMatch[1]);
          if (count !== null && count >= 0.25 && count <= 5) {
            grams = count * candidate.entry.defaultServingG;
          }
        }
      }

      if (grams === null) {
        const smallMod = /\b(un peu|quelques|petite portion|mini)\b/.test(before + " " + after);
        const bigMod = /\b(grosse|grande portion|double|beaucoup)\b/.test(before + " " + after);
        const modScale = smallMod ? 0.65 : bigMod ? 1.45 : 1;
        grams = candidate.entry.defaultServingG * plateScale * modScale;
      }

      const clampedGrams = Math.max(5, Math.min(1200, Math.round(grams)));
      const existing = matchedMap.get(candidate.entry.id);
      if (existing) {
        existing.grams = Math.min(1500, existing.grams + clampedGrams);
      } else {
        matchedMap.set(candidate.entry.id, { entry: candidate.entry, grams: clampedGrams });
      }
      usedIds.add(candidate.entry.id);

      // Masquer la tranche consommée pour empêcher les faux matchs sur des sous-mots
      workingClause =
        workingClause.slice(0, start) +
        " ".repeat(matchedWord.length) +
        workingClause.slice(end);
    }
  }

  const matchedEntries = Array.from(matchedMap.values());

  if (matchedEntries.length === 0) {
    const fallback = CIQUAL_REFERENCE.find((e) => e.id === "ciq-plat-prepare-generique")!;
    matchedEntries.push({
      entry: fallback,
      grams: Math.round(fallback.defaultServingG * plateScale),
    });
  }

  const detectedOilLevel: OilLevel =
    params.oilLevel ??
    (/\b(huile|beurre|friture|sauce)\b/.test(notesNorm) ? "light_1tbsp" : "none");

  const oilExplicitlyMatched = usedIds.has("ciq-huile-olive") || usedIds.has("ciq-beurre");
  const oilDeltaKcal = oilExplicitlyMatched ? 0 : applyOilClarifierDelta(detectedOilLevel);

  const items: MealFoodItem[] = [];
  const macros: MacroTotals = {
    proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0, sugarG: 0, satFatG: 0, sodiumMg: 0,
  };
  const micros: MicroTotals = {
    ironMg: 0, magnesiumMg: 0, calciumMg: 0, potassiumMg: 0, vitCMg: 0, vitDUg: 0,
  };

  let rawCalories = 0;
  let maxNova: 1 | 2 | 3 | 4 = 1;
  let totalGl = 0;

  for (const { entry, grams } of matchedEntries) {
    const finalGrams = Math.round(grams * eatenScale);
    const factor = finalGrams / 100;
    const itemKcal = Math.round(entry.per100g.kcal * factor);
    const p = +(entry.per100g.proteinG * factor).toFixed(1);
    const c = +(entry.per100g.carbsG * factor).toFixed(1);
    const f = +(entry.per100g.fatG * factor).toFixed(1);
    const fib = +(entry.per100g.fiberG * factor).toFixed(1);
    const sod = Math.round(entry.per100g.sodiumMg * factor);

    items.push({
      name: entry.name,
      grams: finalGrams,
      kcal: itemKcal,
      proteinG: p,
      carbsG: c,
      fatG: f,
      fiberG: fib,
      sodiumMg: sod,
      ciqualMatch: entry.id,
    });

    rawCalories += itemKcal;
    macros.proteinG = +(macros.proteinG + p).toFixed(1);
    macros.carbsG = +(macros.carbsG + c).toFixed(1);
    macros.fatG = +(macros.fatG + f).toFixed(1);
    macros.fiberG = +(macros.fiberG + fib).toFixed(1);
    macros.sugarG = +(macros.sugarG + entry.per100g.sugarG * factor).toFixed(1);
    macros.satFatG = +(macros.satFatG + entry.per100g.satFatG * factor).toFixed(1);
    macros.sodiumMg += sod;

    micros.ironMg = +(micros.ironMg + entry.per100g.ironMg * factor).toFixed(1);
    micros.magnesiumMg = +(micros.magnesiumMg + entry.per100g.magnesiumMg * factor).toFixed(1);
    micros.calciumMg = +(micros.calciumMg + entry.per100g.calciumMg * factor).toFixed(1);
    micros.potassiumMg = +(micros.potassiumMg + entry.per100g.potassiumMg * factor).toFixed(1);
    micros.vitCMg = +(micros.vitCMg + entry.per100g.vitCMg * factor).toFixed(1);
    micros.vitDUg = +(micros.vitDUg + entry.per100g.vitDUg * factor).toFixed(1);

    if (entry.novaGroup > maxNova) maxNova = entry.novaGroup;
    const availableCarbs = Math.max(0, c - fib);
    totalGl += (entry.gi * availableCarbs) / 100;
  }

  const extraOilKcal = Math.round(oilDeltaKcal * eatenScale);
  if (extraOilKcal > 0) {
    const fatExtraG = +(extraOilKcal / 9).toFixed(1);
    macros.fatG = +(macros.fatG + fatExtraG).toFixed(1);
    macros.satFatG = +(macros.satFatG + fatExtraG * 0.14).toFixed(1);
  }

  const caloriesCentral = Math.max(40, Math.round(rawCalories + extraOilKcal));
  const uncertaintyMargin = Math.max(35, Math.round(caloriesCentral * 0.13));
  const satietyScore = Math.min(
    98,
    Math.max(
      25,
      Math.round(
        40 +
          macros.proteinG * 0.9 +
          macros.fiberG * 2.2 -
          (maxNova === 4 ? 18 : 0)
      )
    )
  );
  const healthScore = Math.min(
    98,
    Math.max(
      22,
      Math.round(
        72 +
          Math.min(18, macros.fiberG * 1.3) +
          Math.min(12, macros.proteinG * 0.25) -
          (maxNova - 1) * 11 -
          (macros.sodiumMg > 900 ? 10 : 0)
      )
    )
  );

  const dishTitle =
    items.length === 1
      ? items[0].name
      : items
          .slice(0, 3)
          .map((i) => i.name.split(" ")[0])
          .join(" · ");

  return {
    dishTitle,
    summaryFr: `Analyse nutritionnelle ancrée sur la table officielle ANSES Ciqual (${items.length} élément${items.length > 1 ? "s" : ""}, assiette ${params.plateDiameterCm} cm, ${params.portionEatenPct}% consommé).`,
    confidence: 0.78,
    analysisProvider: "ciqual-deterministic" as const,
    caloriesCentral,
    caloriesMin: Math.max(20, caloriesCentral - uncertaintyMargin),
    caloriesMax: caloriesCentral + uncertaintyMargin,
    macros,
    micronutrients: micros,
    novaGroup: maxNova,
    glycemicLoad: +totalGl.toFixed(1),
    satietyScore,
    healthScore,
    items,
    smartClarifier: {
      oilLevel: detectedOilLevel,
      appliedOilDeltaKcal: extraOilKcal,
      questionFr: "Matière grasse ou sauce invisible ajoutée à la cuisson ?",
    },
    clinicalSources: [
      "ANSES — Table de composition nutritionnelle Ciqual",
      "Inserm / Santé Publique France — Score NOVA 1–4",
      "Atkinson et al. — Charge glycémique internationale",
    ],
  };
}

import { NextRequest, NextResponse } from "next/server";
import { FridgeIngredient, StepByStepRecipe } from "@/types/vitalpulse";

export const runtime = "nodejs";

function isRasterImageDataUrl(val?: string): val is string {
  if (!val) return false;
  return /^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(val);
}

function buildFallbackFridgeResult(params: {
  userNotes: string;
  remainingKcal: number;
  remainingProteinG: number;
  maxMinutes: number;
  specialMode?: string;
  primaryGoal?: string;
}) {
  const txt = (params.userNotes || "").toLowerCase();
  const detectedIngredients: FridgeIngredient[] = [];
  const pushIf = (kw: string[], item: FridgeIngredient) => {
    if (kw.some((k) => txt.includes(k))) detectedIngredients.push(item);
  };

  pushIf(["oeuf", "œuf"], { name: "Œufs frais", quantityLabel: "4 à 6 unités", urgency: "use_soon", category: "Protéines" });
  pushIf(["poulet", "dinde"], { name: "Filets de volaille", quantityLabel: "250 g", urgency: "use_soon", category: "Protéines" });
  pushIf(["saumon", "thon", "poisson"], { name: "Poisson / Thon", quantityLabel: "200 g", urgency: "use_soon", category: "Protéines" });
  pushIf(["courgette", "tomate", "epinard", "épinard", "brocoli", "legume", "légume", "poivron"], {
    name: "Légumes frais du bac", quantityLabel: "350 g", urgency: "use_soon", category: "Légumes",
  });
  pushIf(["riz", "quinoa", "pate", "pâte", "pain", "avoine"], {
    name: "Féculents complets / Riz", quantityLabel: "150 g", urgency: "pantry", category: "Féculents",
  });
  pushIf(["yaourt", "skyr", "fromage", "feta"], {
    name: "Yaourt grec / Fromage", quantityLabel: "200 g", urgency: "fresh", category: "Laitages",
  });

  if (detectedIngredients.length === 0) {
    detectedIngredients.push(
      { name: "Œufs ou protéine maigre", quantityLabel: "2–3 unités / 150 g", urgency: "use_soon", category: "Protéines" },
      { name: "Légumes verts / tomates / courgettes", quantityLabel: "250 g", urgency: "use_soon", category: "Légumes" },
      { name: "Huile d'olive, ail & herbes", quantityLabel: "placard", urgency: "pantry", category: "Assaisonnement" },
      { name: "Skyr / fromage frais", quantityLabel: "150 g", urgency: "fresh", category: "Laitages" }
    );
  }

  const isSportGoal =
    params.specialMode === "high_protein_athlete" ||
    params.primaryGoal === "muscle_gain" ||
    params.primaryGoal === "athletic_performance";
  const targetKcal = Math.max(320, Math.min(isSportGoal ? 880 : 720, Math.round(params.remainingKcal || (isSportGoal ? 680 : 540))));
  const targetProt = Math.max(isSportGoal ? 32 : 25, Math.min(isSportGoal ? 60 : 52, Math.round(params.remainingProteinG || (isSportGoal ? 44 : 36))));

  const isKeto = params.specialMode === "ketogenic";

  const recipes: StepByStepRecipe[] = [
    {
      id: "rec-shakshuka-protein",
      title: isKeto
        ? "Poêlée cétogène œufs-avocat-courgettes façon Shakshuka (< 9 g glucides)"
        : isSportGoal
          ? "Poêlée anabolique 4 œufs, lentilles & légumes (+40 g protéines)"
          : "Poêlée express œufs-légumes façon Shakshuka légère",
      prepMinutes: 4,
      cookMinutes: Math.min(12, params.maxMinutes || 12),
      servings: 1,
      caloriesPerServing: Math.round(targetKcal * 0.85),
      macros: isKeto
        ? {
            proteinG: Math.round(targetProt * 0.85),
            carbsG: 9,
            fatG: 34,
            fiberG: 6.2,
            sugarG: 4.1,
            satFatG: 8.5,
            sodiumMg: 520,
          }
        : isSportGoal
          ? {
              proteinG: Math.max(38, Math.round(targetProt * 0.92)),
              carbsG: 48,
              fatG: 18,
              fiberG: 9.0,
              sugarG: 5.5,
              satFatG: 4.6,
              sodiumMg: 510,
            }
          : {
              proteinG: Math.round(targetProt * 0.85),
              carbsG: 24,
              fatG: 18,
              fiberG: 7.5,
              sugarG: 6.2,
              satFatG: 4.5,
              sodiumMg: 480,
            },
      novaGroup: 1,
      glycemicLoad: isKeto ? 3 : isSportGoal ? 14 : 9,
      whyItFitsToday: isKeto
        ? `Recette cétogène stricte (< 9 g de glucides) avec ~${Math.round(targetProt * 0.85)} g de protéines et bonnes graisses (huile d'olive / avocat).`
        : isSportGoal
          ? `Conçue pour la récupération musculaire : franchit le seuil de leucine (~${Math.max(38, Math.round(targetProt * 0.92))} g de protéines complètes) + glucides complexes pour recharger le glycogène.`
          : `Calibrée pour « fermer votre journée » : apporte ~${Math.round(targetProt * 0.85)} g de protéines rassasiantes et 7,5 g de fibres sans pic glycémique avant le coucher.`,
      ingredients: isKeto
        ? [
            "3 œufs entiers + 1/2 avocat ou 30 g de feta",
            "200 g de courgettes et épinards en dés",
            "1,5 c.à.s d'huile d'olive vierge extra, cumin, paprika, ail",
            "Herbes fraîches, poivre et sel modéré",
          ]
        : [
            "3 œufs entiers + 1 blanc d'œuf (ou 150 g de tofu/poulet)",
            "250 g de courgettes / tomates / poivrons coupés en dés",
            "1 c.à.c d'huile d'olive (5 g), cumin, paprika, ail",
            "1 tranche de pain complet ou 80 g de pois chiches",
          ],
      steps: [
        {
          stepNumber: 1,
          instruction: "Coupez rapidement les légumes en petits dés pour réduire le temps de cuisson de moitié.",
          tip: "Plus les morceaux sont petits, plus la cuisson reste douce et préserve la vitamine C.",
        },
        {
          stepNumber: 2,
          instruction: "Faites revenir les légumes à feu moyen avec de l'huile d'olive, ail, cumin et un fond d'eau.",
          timerSeconds: 300,
          tip: "Le filet d'eau évite de brûler les épices tout en gardant les légumes fondants.",
        },
        {
          stepNumber: 3,
          instruction: "Creusez 3 petits puits, cassez les œufs dedans, couvrez la poêle et laissez prendre le blanc.",
          timerSeconds: 210,
        },
        {
          stepNumber: 4,
          instruction: isKeto
            ? "Servez aussitôt avec les lamelles d'avocat / feta et les herbes fraîches (sans féculents)."
            : "Servez immédiatement avec du poivre, herbes fraîches et la tranche de pain complet.",
        },
      ],
      clinicalNote: isKeto
        ? "Score NOVA 1 · Cétogène (< 9 g glucides nets), très rassasiant."
        : "Score NOVA 1 · Riche en choline, lutéine et fibres solubles.",
    },
    {
      id: "rec-bowl-saumon-citron",
      title: "Bowl chaud express protéiné aux herbes & sauce yaourt-citron",
      prepMinutes: 5,
      cookMinutes: 10,
      servings: 1,
      caloriesPerServing: targetKcal,
      macros: {
        proteinG: targetProt,
        carbsG: 38,
        fatG: 16,
        fiberG: 8.2,
        sugarG: 4.1,
        satFatG: 3.1,
        sodiumMg: 420,
      },
      novaGroup: 1,
      glycemicLoad: 14,
      whyItFitsToday: `Complète exactement votre objectif restant (${targetKcal} kcal et ${targetProt} g de protéines) en utilisant en priorité les produits frais du frigo.`,
      ingredients: [
        "150 g de blanc de poulet, poisson ou thon au naturel",
        "130 g de riz basmati ou quinoa déjà cuit (ou express)",
        "200 g de légumes verts (brocolis, haricots verts ou salade)",
        "Sauce express : 80 g yaourt grec / skyr + jus de citron + moutarde",
      ],
      steps: [
        {
          stepNumber: 1,
          instruction: "Mélangez le yaourt grec, 1 c.à.c de moutarde, citron et ciboulette : votre sauce crémeuse à < 60 kcal est prête.",
        },
        {
          stepNumber: 2,
          instruction: "Saisissez la protéine émincée en lamelles dans une poêle chaude antiadhésive avec épices et 1 c.à.c d'huile.",
          timerSeconds: 360,
        },
        {
          stepNumber: 3,
          instruction: "Cuisez les légumes à la vapeur ou poêle couverte avec 2 c.à.s d'eau pour garder le croquant.",
          timerSeconds: 240,
        },
        {
          stepNumber: 4,
          instruction: "Dressez le féculent tiède au fond du bol, ajoutez légumes, protéine chaude et nappez de sauce yaourt.",
        },
      ],
      clinicalNote: "La sauce au skyr remplace la mayonnaise tout en ajoutant +8 g de protéines.",
    },
    {
      id: "rec-galette-express-5min",
      title: "Assiette SOS 7 min : Galette avoine-œuf garnie & salade croquante",
      prepMinutes: 3,
      cookMinutes: 4,
      servings: 1,
      caloriesPerServing: Math.max(290, Math.round(targetKcal * 0.72)),
      macros: {
        proteinG: Math.round(targetProt * 0.75),
        carbsG: 26,
        fatG: 13,
        fiberG: 6.4,
        sugarG: 2.8,
        satFatG: 3.6,
        sodiumMg: 390,
      },
      novaGroup: 1,
      glycemicLoad: 11,
      whyItFitsToday: "Idéale les soirs de fatigue (7 minutes chrono) pour éviter les plats ultra-transformés NOVA 4.",
      ingredients: [
        "2 œufs + 30 g de flocons d'avoine + 2 c.à.s d'eau ou lait",
        "30 g de feta ou fromage râpé léger + épinards / tomates",
        "1 grande poignée de salade verte + 1 c.à.c vinaigrette citronnée",
      ],
      steps: [
        {
          stepNumber: 1,
          instruction: "Battez les œufs avec les flocons d'avoine, sel modéré, poivre et herbes pendant 30 secondes.",
        },
        {
          stepNumber: 2,
          instruction: "Versez dans une poêle chaude légèrement huilée comme une crêpe épaisse et laissez cuire.",
          timerSeconds: 150,
        },
        {
          stepNumber: 3,
          instruction: "Ajoutez fromage et légumes sur une moitié, pliez en deux et laissez fondre 1 minute.",
          timerSeconds: 60,
        },
      ],
      clinicalNote: "Bêta-glucanes d'avoine + protéines d'œuf = satiété prolongée.",
    },
  ];

  return {
    detectedIngredients,
    recipes,
    provider: "ciqual-deterministic" as const,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const imageBase64 = typeof body.imageBase64 === "string" ? body.imageBase64 : undefined;
    const userNotes = typeof body.userNotes === "string" ? body.userNotes.trim() : "";
    const remainingKcal = Number(body.remainingKcal) || 550;
    const remainingProteinG = Number(body.remainingProteinG) || 38;
    const remainingFiberG = Number(body.remainingFiberG) || 10;
    const maxMinutes = Number(body.maxMinutes) || 20;
    const specialMode = String(body.specialMode || "standard");
    const primaryGoal = String(body.primaryGoal || "fat_loss");

    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_VISION_MODEL || "gpt-4o-mini";

    if (apiKey && (isRasterImageDataUrl(imageBase64) || userNotes.length >= 4)) {
      try {
        const prompt = [
          `Tu es chef cuisinier nutritionniste. Analyse le contenu du réfrigérateur/placard (image et/ou texte utilisateur).`,
          `Budget nutritionnel « Ferme ta journée » restant pour l'utilisateur : ~${remainingKcal} kcal, ~${remainingProteinG} g protéines, ~${remainingFiberG} g fibres.`,
          specialMode === "ketogenic"
            ? `Temps de préparation+cuisson maximum souhaité : ${maxMinutes} minutes. Mode clinique : ketogenic — IMPÉRATIF CÉTOGÈNE (Keto) : propose 3 recettes à < 10 g de glucides par portion (zéro pain, zéro riz, zéro pâtes, zéro sucre ; privilégie œufs, poissons/viandes, avocat, légumes verts, huile d'olive, fromage).`
            : specialMode === "high_protein_athlete" || primaryGoal === "muscle_gain" || primaryGoal === "athletic_performance"
              ? `Temps de préparation+cuisson maximum souhaité : ${maxMinutes} minutes. Objectif sportif / hypertrophie (${primaryGoal}, ${specialMode}) — Privilégie 35–48 g de protéines complètes par assiette (seuil leucine ISSN) + glucides digestes (riz basmati, patate douce, flocons d'avoine) pour la récupération musculaire et le glycogène.`
              : specialMode === "rebalancing"
                ? `Temps de préparation+cuisson maximum souhaité : ${maxMinutes} minutes. Mode clinique : rebalancing — Rééquilibrage alimentaire équilibré ANSES NOVA 1-2 (légumes + protéines + féculents complets sans frustration).`
                : `Temps de préparation+cuisson maximum souhaité : ${maxMinutes} minutes. Mode clinique : ${specialMode} (objectif : ${primaryGoal}).`,
          userNotes
            ? `PRÉCISIONS UTILISATEUR SUR CE QU'IL Y A DANS LE FRIGO / ENVIES : "${userNotes}"`
            : "",
          `Propose EXACTEMENT 3 recettes saines, réalistes, faciles à faire étape par étape (avec minuteurs en secondes pour les étapes de cuisson), classées pour atteindre l'objectif nutritionnel restant.`,
          `Réponds STRICTEMENT en JSON valide (français) :`,
          `{
            "detectedIngredients": [
              { "name": "string", "quantityLabel": "string", "urgency": "use_soon" | "fresh" | "pantry", "category": "string" }
            ],
            "recipes": [
              {
                "id": "string",
                "title": "string",
                "prepMinutes": number,
                "cookMinutes": number,
                "servings": 1,
                "caloriesPerServing": number,
                "macros": { "proteinG": number, "carbsG": number, "fatG": number, "fiberG": number, "sugarG": number, "satFatG": number, "sodiumMg": number },
                "novaGroup": 1 | 2 | 3,
                "glycemicLoad": number,
                "whyItFitsToday": "string",
                "ingredients": ["string"],
                "steps": [
                  { "stepNumber": number, "instruction": "string", "timerSeconds": number | null, "tip": "string | null" }
                ],
                "clinicalNote": "string"
              }
            ]
          }`,
        ]
          .filter(Boolean)
          .join("\n");

        const contentParts: Array<Record<string, unknown>> = [{ type: "text", text: prompt }];
        if (isRasterImageDataUrl(imageBase64)) {
          contentParts.push({
            type: "image_url",
            image_url: { url: imageBase64, detail: "high" },
          });
        }

        const oaRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            temperature: 0.35,
            response_format: { type: "json_object" },
            messages: [
              {
                role: "system",
                content:
                  "Tu es un chef diététicien anti-gaspi. Tes recettes utilisent d'abord les produits frais détectés, évitent les ingrédients ultra-transformés (NOVA 4) et incluent des minuteurs précis.",
              },
              { role: "user", content: contentParts },
            ],
          }),
          signal: AbortSignal.timeout(25000),
        });

        if (oaRes.ok) {
          const oaJson = await oaRes.json();
          const raw = oaJson?.choices?.[0]?.message?.content;
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed.recipes) && parsed.recipes.length >= 1) {
              return NextResponse.json({
                detectedIngredients: Array.isArray(parsed.detectedIngredients)
                  ? parsed.detectedIngredients
                  : [],
                recipes: parsed.recipes,
                provider: "openai-vision",
              });
            }
          }
        }
      } catch (err) {
        console.warn("analyze-fridge fallback:", err);
      }
    }

    return NextResponse.json(
      buildFallbackFridgeResult({
        userNotes,
        remainingKcal,
        remainingProteinG,
        maxMinutes,
        specialMode,
        primaryGoal,
      })
    );
  } catch (err) {
    console.error("analyze-fridge error:", err);
    return NextResponse.json({ error: "Erreur d'analyse frigo." }, { status: 400 });
  }
}

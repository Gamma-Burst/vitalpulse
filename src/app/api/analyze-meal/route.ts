import { NextRequest, NextResponse } from "next/server";
import {
  analyzeMealDeterministically,
  applyOilClarifierDelta,
  matchCiqualFood,
} from "@/data/ciqual-reference";
import {
  isTierEntitledToPaidQuota,
  verifyEntitlementToken,
} from "@/lib/billing-server";
import { MealType, OilLevel, PrimaryGoal, SpecialMode } from "@/types/vitalpulse";

export const runtime = "nodejs";

function isRasterImageDataUrl(val?: string): val is string {
  if (!val) return false;
  return /^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(val);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const imageBase64 = typeof body.imageBase64 === "string" ? body.imageBase64 : undefined;
    const userNotes = typeof body.userNotes === "string" ? body.userNotes.trim() : "";
    const mealType: MealType =
      ["breakfast", "lunch", "snack", "dinner"].includes(body.mealType)
        ? body.mealType
        : "lunch";
    const plateDiameterCm = Number(body.plateDiameterCm) || 26;
    const portionEatenPct = Math.max(25, Math.min(150, Number(body.portionEatenPct) || 100));
    const specialMode: SpecialMode = body.specialMode || "standard";
    const primaryGoal: PrimaryGoal = body.primaryGoal || "fat_loss";
    const requestedOilLevel: OilLevel | undefined =
      ["none", "light_1tbsp", "rich_restaurant"].includes(body.oilLevel)
        ? body.oilLevel
        : undefined;

    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_VISION_MODEL || "gpt-4o-mini";

    const rawLicenseToken =
      typeof body.licenseToken === "string" ? body.licenseToken.trim() : "";
    const verifiedToken = rawLicenseToken
      ? verifyEntitlementToken(rawLicenseToken)
      : { valid: false };
    const hasVerifiedPlusToken =
      verifiedToken.valid &&
      isTierEntitledToPaidQuota(verifiedToken.payload?.tier);
    const allowVisionByClient = body.allowVisionAi !== false;
    const allowCloudVision = allowVisionByClient || hasVerifiedPlusToken;

    if (
      apiKey &&
      allowCloudVision &&
      (isRasterImageDataUrl(imageBase64) || userNotes.length >= 4)
    ) {
      try {
        const userPrompt = [
          `Analyse ce repas pour un suivi médical et nutritionnel de précision (référentiel ANSES Ciqual & Inserm NOVA).`,
          `Type de repas : ${mealType}.`,
          `Diamètre de l'assiette déclaré : ${plateDiameterCm} cm (repère d'échelle).`,
          `Pourcentage effectivement consommé : ${portionEatenPct}% (applique ce ratio sur TOUS les résultats !).`,
          specialMode === "ketogenic"
            ? `Mode clinique utilisateur : ketogenic — Mode CÉTOGÈNE (Keto) : vérifie que les glucides nets restent très bas (< 12 g sur le repas), valorise les bonnes graisses et signale les sucres/féculents cachés.`
            : specialMode === "high_protein_athlete" || primaryGoal === "muscle_gain" || primaryGoal === "athletic_performance"
              ? `Mode sportif / hypertrophie (${primaryGoal}, ${specialMode}) : évalue la densité protéique (seuil leucine >= 30 g par repas, ISSN 2017) et la qualité des glucides péri-entraînement pour la synthèse musculaire et le glycogène.`
              : specialMode === "rebalancing"
                ? `Mode clinique utilisateur : rebalancing — Mode RÉÉQUILIBRAGE ALIMENTAIRE : assiette équilibrée ANSES NOVA 1-2 sans culpabilisation, légumes + protéines + féculents complets.`
                : `Mode clinique utilisateur : ${specialMode} (objectif : ${primaryGoal}).`,
          requestedOilLevel
            ? `Niveau d'huile/sauce choisi par l'utilisateur : ${requestedOilLevel}.`
            : "",
          userNotes
            ? `PRÉCISIONS PRIORITAIRES DE L'UTILISATEUR (priment sur l'image en cas d'ambiguïté) : "${userNotes}"`
            : "Aucune précision textuelle fournie.",
          `Réponds STRICTEMENT en JSON valide (en français) avec la structure exacte :`,
          `{
            "dishTitle": "string court",
            "summaryFr": "string pédagogique clair (max 2 phrases, adapté au mode clinique)",
            "confidence": number (0.4 à 0.98),
            "caloriesCentral": number,
            "caloriesMin": number,
            "caloriesMax": number,
            "macros": {
              "proteinG": number, "carbsG": number, "fatG": number,
              "fiberG": number, "sugarG": number, "satFatG": number, "sodiumMg": number
            },
            "micronutrients": {
              "ironMg": number, "magnesiumMg": number, "calciumMg": number,
              "potassiumMg": number, "vitCMg": number, "vitDUg": number
            },
            "novaGroup": 1 | 2 | 3 | 4,
            "glycemicLoad": number,
            "satietyScore": number (0-100),
            "healthScore": number (0-100),
            "items": [
              { "name": "string", "grams": number, "kcal": number, "proteinG": number, "carbsG": number, "fatG": number, "fiberG": number, "sodiumMg": number }
            ],
            "smartClarifier": {
              "oilLevel": "none" | "light_1tbsp" | "rich_restaurant",
              "appliedOilDeltaKcal": number,
              "questionFr": "string (1 seule question ciblée sur l'incertitude majeure : huile/sauce/portion)"
            },
            "clinicalSources": ["string"]
          }`,
        ]
          .filter(Boolean)
          .join("\n");

        const contentParts: Array<Record<string, unknown>> = [
          { type: "text", text: userPrompt },
        ];
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
            temperature: 0.2,
            response_format: { type: "json_object" },
            messages: [
              {
                role: "system",
                content:
                  "Tu es un assistant d'estimation nutritionnelle et diététique basé sur les tables publiques ANSES Ciqual, l'EFSA et la classification NOVA. Donne toujours une fourchette calorique réaliste (caloriesMin..caloriesMax) et respecte les précisions textuelles utilisateur en priorité absolue.",
              },
              { role: "user", content: contentParts },
            ],
          }),
          signal: AbortSignal.timeout(25000),
        });

        if (oaRes.ok) {
          const oaJson = await oaRes.json();
          const rawText = oaJson?.choices?.[0]?.message?.content;
          if (rawText) {
            const parsed = JSON.parse(rawText);
            const items = Array.isArray(parsed.items)
              ? parsed.items.map((it: Record<string, unknown>) => {
                  const matched = matchCiqualFood(String(it.name || ""));
                  return {
                    name: String(it.name || "Aliment"),
                    grams: Math.max(1, Math.round(Number(it.grams) || 100)),
                    kcal: Math.max(0, Math.round(Number(it.kcal) || 0)),
                    proteinG: +(Number(it.proteinG) || 0).toFixed(1),
                    carbsG: +(Number(it.carbsG) || 0).toFixed(1),
                    fatG: +(Number(it.fatG) || 0).toFixed(1),
                    fiberG: +(Number(it.fiberG) || 0).toFixed(1),
                    sodiumMg: Math.max(0, Math.round(Number(it.sodiumMg) || 0)),
                    ciqualMatch: matched?.id,
                  };
                })
              : [];

            const calCentral = Math.max(20, Math.round(Number(parsed.caloriesCentral) || 420));
            const calMin = Math.max(
              10,
              Math.min(calCentral - 20, Math.round(Number(parsed.caloriesMin) || calCentral * 0.87))
            );
            const calMax = Math.max(
              calCentral + 20,
              Math.round(Number(parsed.caloriesMax) || calCentral * 1.13)
            );
            const oilLevel: OilLevel =
              requestedOilLevel ??
              (["none", "light_1tbsp", "rich_restaurant"].includes(parsed?.smartClarifier?.oilLevel)
                ? parsed.smartClarifier.oilLevel
                : "light_1tbsp");

            const novaRaw = Number(parsed.novaGroup);
            const novaGroup: 1 | 2 | 3 | 4 =
              novaRaw === 1 || novaRaw === 2 || novaRaw === 3 || novaRaw === 4 ? novaRaw : 2;

            return NextResponse.json({
              dishTitle: String(parsed.dishTitle || "Plat analysé par Vision IA"),
              summaryFr: String(
                parsed.summaryFr ||
                  "Analyse multimodale croisant votre photo, vos précisions textuelles et la table ANSES Ciqual."
              ),
              confidence: Math.min(0.99, Math.max(0.4, Number(parsed.confidence) || 0.85)),
              analysisProvider: "openai-vision",
              caloriesCentral: calCentral,
              caloriesMin: calMin,
              caloriesMax: calMax,
              macros: {
                proteinG: +(Number(parsed?.macros?.proteinG) || 0).toFixed(1),
                carbsG: +(Number(parsed?.macros?.carbsG) || 0).toFixed(1),
                fatG: +(Number(parsed?.macros?.fatG) || 0).toFixed(1),
                fiberG: +(Number(parsed?.macros?.fiberG) || 0).toFixed(1),
                sugarG: +(Number(parsed?.macros?.sugarG) || 0).toFixed(1),
                satFatG: +(Number(parsed?.macros?.satFatG) || 0).toFixed(1),
                sodiumMg: Math.max(0, Math.round(Number(parsed?.macros?.sodiumMg) || 0)),
              },
              micronutrients: {
                ironMg: +(Number(parsed?.micronutrients?.ironMg) || 1.8).toFixed(1),
                magnesiumMg: +(Number(parsed?.micronutrients?.magnesiumMg) || 65).toFixed(1),
                calciumMg: +(Number(parsed?.micronutrients?.calciumMg) || 95).toFixed(1),
                potassiumMg: +(Number(parsed?.micronutrients?.potassiumMg) || 480).toFixed(1),
                vitCMg: +(Number(parsed?.micronutrients?.vitCMg) || 18).toFixed(1),
                vitDUg: +(Number(parsed?.micronutrients?.vitDUg) || 1.2).toFixed(1),
              },
              novaGroup,
              glycemicLoad: +(Number(parsed.glycemicLoad) || 16).toFixed(1),
              satietyScore: Math.min(100, Math.max(10, Math.round(Number(parsed.satietyScore) || 75))),
              healthScore: Math.min(100, Math.max(10, Math.round(Number(parsed.healthScore) || 78))),
              items,
              smartClarifier: {
                oilLevel,
                appliedOilDeltaKcal:
                  Number(parsed?.smartClarifier?.appliedOilDeltaKcal) ||
                  applyOilClarifierDelta(oilLevel),
                questionFr: String(
                  parsed?.smartClarifier?.questionFr ||
                    "Y avait-il de l'huile, du beurre ou une sauce cachée ?"
                ),
              },
              clinicalSources: Array.isArray(parsed.clinicalSources) && parsed.clinicalSources.length
                ? parsed.clinicalSources.map(String)
                : [
                    "OpenAI Vision + Consignes utilisateur prioritaires",
                    "ANSES — Table de composition Ciqual",
                    "Inserm — Classification NOVA 1–4",
                  ],
            });
          }
        }
      } catch (err) {
        console.warn("OpenAI Vision fallback triggered:", err);
      }
    }

    const fallback = analyzeMealDeterministically({
      userNotes: userNotes || "Plat équilibré standard",
      mealType,
      plateDiameterCm,
      portionEatenPct,
      oilLevel: requestedOilLevel,
    });

    return NextResponse.json(fallback);
  } catch (error) {
    console.error("analyze-meal error:", error);
    return NextResponse.json(
      { error: "Impossible d'analyser le repas pour le moment." },
      { status: 400 }
    );
  }
}

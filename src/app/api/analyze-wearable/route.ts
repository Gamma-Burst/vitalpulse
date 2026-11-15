import { NextRequest, NextResponse } from "next/server";
import { parseWearableExportText, type ParsedWearableSnapshot } from "@/lib/wearables-bridge";

export const runtime = "nodejs";
export const maxDuration = 30;

function clampInt(val: unknown, min: number, max: number): number | undefined {
  const n = typeof val === "number" ? val : typeof val === "string" ? Number(val.replace(",", ".")) : NaN;
  if (!Number.isFinite(n) || n < min || n > max) return undefined;
  return Math.round(n);
}

function clampFloat(val: unknown, min: number, max: number, decimals = 1): number | undefined {
  const n = typeof val === "number" ? val : typeof val === "string" ? Number(val.replace(",", ".")) : NaN;
  if (!Number.isFinite(n) || n < min || n > max) return undefined;
  return +n.toFixed(decimals);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      imageBase64?: string;
      ocrText?: string;
    };

    const imageBase64 = typeof body?.imageBase64 === "string" ? body.imageBase64.trim() : "";
    const ocrText = typeof body?.ocrText === "string" ? body.ocrText.trim() : "";

    if (!imageBase64 && !ocrText) {
      return NextResponse.json(
        { error: "Envoyez une capture d'écran Apple Forme / Apple Santé ou un texte lisible." },
        { status: 400 }
      );
    }

    if (imageBase64) {
      if (!imageBase64.startsWith("data:image/")) {
        return NextResponse.json(
          { error: "Format d'image invalide (PNG/JPEG/WebP attendu)." },
          { status: 400 }
        );
      }
      if (imageBase64.length > 16_000_000) {
        return NextResponse.json(
          { error: "Capture trop lourde (> 12 Mo). Rognez ou compressez légèrement l'image." },
          { status: 413 }
        );
      }
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      if (ocrText) {
        const parsed = parseWearableExportText("ocr.txt", ocrText);
        return NextResponse.json({
          snapshot: {
            ...parsed,
            sourceLabel: "Analyse texte montre (hors-ligne)",
          },
          provider: "deterministic-text-fallback",
          messageFr: "Texte analysé localement (clé Vision IA non configurée sur ce serveur).",
        });
      }

      const emptySnap: ParsedWearableSnapshot = {
        sourceLabel: "Capture montre (Vision IA indisponible)",
      };
      return NextResponse.json({
        snapshot: emptySnap,
        provider: "vision-unavailable",
        messageFr:
          "Clé Vision IA absente sur ce serveur : saisissez vos chiffres manuellement ou utilisez le Raccourci iOS / export ZIP.",
      });
    }

    const model = process.env.OPENAI_VISION_MODEL || "gpt-4o-mini";
    const systemPrompt = `Tu es un extracteur biométrique précis pour FolloWeight.
Tu lis des captures d'écran iPhone / Apple Watch (app Forme / Anneaux Activité, Apple Santé) ou Garmin/Samsung/Fitbit.
RÈGLE ABSOLUE : n'invente JAMAIS un chiffre absent ou illisible ; mets null si non visible clairement.
Vocabulaire fréquent en français/anglais :
- "Bouger" / "Move" / "Énergie active" -> activeKcal (kcal / CAL)
- "M'entraîner" / "Exercise" / "Min d'exercice" -> exerciseMinutes (MIN)
- "Me lever" / "Stand" -> standHours (H)
- "Pas" / "Steps" -> steps (nombre entier de pas)
- "Fréquence cardiaque" / "Heart Rate" / "FC repos" -> heartRateBpm (BPM / bpm)
- "Distance" -> distanceKm (km)
- "Poids" / "Weight" -> weightKg (kg)

Réponds STRICTEMENT en JSON valide sans texte autour :
{
  "deviceHint": "Apple Watch / Forme" | "Apple Santé" | "Samsung Health" | "Garmin" | "Fitbit" | "Autre",
  "steps": number | null,
  "activeKcal": number | null,
  "exerciseMinutes": number | null,
  "standHours": number | null,
  "heartRateBpm": number | null,
  "distanceKm": number | null,
  "weightKg": number | null,
  "confidenceNoteFr": string
}`;

    const openAiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        max_tokens: 400,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extrais uniquement les mesures visibles sur cette capture de montre / santé.",
              },
              {
                type: "image_url",
                image_url: {
                  url: imageBase64,
                  detail: "high",
                },
              },
            ],
          },
        ],
      }),
    });

    if (!openAiRes.ok) {
      if (ocrText) {
        const parsed = parseWearableExportText("ocr.txt", ocrText);
        return NextResponse.json({
          snapshot: parsed,
          provider: "deterministic-text-fallback",
          messageFr: "Service Vision momentanément saturé : texte analysé localement.",
        });
      }
      return NextResponse.json(
        { error: `Analyse Vision impossible (${openAiRes.status}). Réessayez ou utilisez le Raccourci iOS.` },
        { status: 502 }
      );
    }

    const payload = (await openAiRes.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload?.choices?.[0]?.message?.content?.trim() || "{}";

    let rawJson: Record<string, unknown> = {};
    try {
      rawJson = JSON.parse(content) as Record<string, unknown>;
    } catch {
      rawJson = {};
    }

    const steps = clampInt(rawJson.steps, 0, 120000);
    const activeKcal = clampInt(rawJson.activeKcal, 1, 6000);
    const exerciseMinutes = clampInt(rawJson.exerciseMinutes, 1, 600);
    const heartRateBpm = clampInt(rawJson.heartRateBpm, 30, 230);
    const weightKg = clampFloat(rawJson.weightKg, 30, 280, 1);
    const distanceKm = clampFloat(rawJson.distanceKm, 0.1, 250, 2);
    const deviceHint =
      typeof rawJson.deviceHint === "string" && rawJson.deviceHint.trim()
        ? rawJson.deviceHint.trim()
        : "Apple Watch / Santé";

    const snapshot: ParsedWearableSnapshot = {
      steps,
      activeKcal,
      exerciseMinutes,
      heartRateBpm,
      weightKg,
      sourceLabel: `${deviceHint} · Scan IA`,
    };

    const parsedCount = [steps, activeKcal, exerciseMinutes, heartRateBpm, weightKg].filter(
      (v) => v !== undefined
    ).length;

    return NextResponse.json({
      snapshot,
      distanceKm: distanceKm ?? null,
      standHours: clampInt(rawJson.standHours, 1, 24) ?? null,
      parsedCount,
      provider: "openai-vision",
      messageFr:
        parsedCount > 0
          ? typeof rawJson.confidenceNoteFr === "string" && rawJson.confidenceNoteFr.trim()
            ? rawJson.confidenceNoteFr.trim()
            : `${parsedCount} mesure(s) détectée(s) depuis la capture.`
          : "Aucune donnée chiffrée détectée sur cette capture — choisissez une capture de l'écran Forme / Apple Santé.",
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Erreur interne lors de l'analyse de la capture wearable.",
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import {
  BIOMARKER_CATALOG,
  evaluateBloodPanelDeterministically,
  parseFrenchBloodReportText,
} from "@/lib/blood-panel-engine";
import {
  BloodBiomarkerKey,
  BloodMarkerInput,
  BloodPanelContext,
  Sex,
} from "@/types/vitalpulse";

export const runtime = "nodejs";

function isRasterImageDataUrl(val?: string): val is string {
  if (!val) return false;
  return /^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(val);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const imageBase64 = typeof body.imageBase64 === "string" ? body.imageBase64 : undefined;
    const rawText = typeof body.rawText === "string" ? body.rawText.trim() : "";
    const manualMarkers: BloodMarkerInput[] = Array.isArray(body.markers)
      ? body.markers.filter(
          (m: Record<string, unknown>) =>
            m &&
            typeof m.key === "string" &&
            m.key in BIOMARKER_CATALOG &&
            Number.isFinite(Number(m.rawValue)) &&
            Number(m.rawValue) > 0
        ).map((m: Record<string, unknown>) => ({
          key: m.key as BloodBiomarkerKey,
          rawValue: Number(m.rawValue),
          unit:
            typeof m.unit === "string" && m.unit.trim()
              ? m.unit.trim()
              : BIOMARKER_CATALOG[m.key as BloodBiomarkerKey].canonicalUnit,
        }))
      : [];

    const context: BloodPanelContext = {
      fasting: body?.context?.fasting !== false,
      pregnant: Boolean(body?.context?.pregnant),
      labName: typeof body?.context?.labName === "string" ? body.context.labName : undefined,
      notes: typeof body?.context?.notes === "string" ? body.context.notes : undefined,
    };

    const age = Math.max(12, Math.min(110, Number(body?.profile?.age) || 38));
    const sex: Sex = body?.profile?.sex === "female" ? "female" : "male";

    let extractedMarkers: BloodMarkerInput[] = [];
    let provider: "openai-assisted" | "clinical-deterministic" = "clinical-deterministic";

    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_VISION_MODEL || "gpt-4o-mini";

    if (apiKey && (isRasterImageDataUrl(imageBase64) || rawText.length >= 12)) {
      try {
        const prompt = [
          `Tu extrais UNIQUEMENT les valeurs numériques présentes sur ce compte-rendu de biologie médicale (sans jamais inventer de donnée manquante).`,
          rawText ? `Texte fourni : """${rawText}"""` : "Lis attentivement l'image du bilan sanguin.",
          `Clés autorisées : ${Object.keys(BIOMARKER_CATALOG).join(", ")}.`,
          `Réponds STRICTEMENT en JSON valide : { "markers": [{ "key": "...", "rawValue": number, "unit": "g/L | mmol/L | % | mUI/L | mg/L | µmol/L | UI/L | G/L | ng/mL | pg/mL | g/dL" }] }`,
        ].join("\n");

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
            temperature: 0.1,
            response_format: { type: "json_object" },
            messages: [
              {
                role: "system",
                content:
                  "Tu es un assistant d'extraction stricte de résultats biologiques médicaux. N'invente jamais de valeur.",
              },
              { role: "user", content: contentParts },
            ],
          }),
          signal: AbortSignal.timeout(25000),
        });

        if (oaRes.ok) {
          const oaJson = await oaRes.json();
          const txt = oaJson?.choices?.[0]?.message?.content;
          if (txt) {
            const parsed = JSON.parse(txt);
            if (Array.isArray(parsed.markers)) {
              extractedMarkers = parsed.markers
                .filter(
                  (m: Record<string, unknown>) =>
                    m &&
                    typeof m.key === "string" &&
                    m.key in BIOMARKER_CATALOG &&
                    Number.isFinite(Number(m.rawValue)) &&
                    Number(m.rawValue) > 0
                )
                .map((m: Record<string, unknown>) => ({
                  key: m.key as BloodBiomarkerKey,
                  rawValue: Number(m.rawValue),
                  unit: String(
                    m.unit || BIOMARKER_CATALOG[m.key as BloodBiomarkerKey].canonicalUnit
                  ),
                }));
              if (extractedMarkers.length > 0) {
                provider = "openai-assisted";
              }
            }
          }
        }
      } catch (err) {
        console.warn("OpenAI blood extraction fallback:", err);
      }
    }

    // Si Vision indisponible / 429 ou absent, parser déterministe français du texte collé
    if (extractedMarkers.length === 0 && rawText.length >= 4) {
      extractedMarkers = parseFrenchBloodReportText(rawText);
    }

    // Fusionner extraction + saisie manuelle (la saisie manuelle prime en cas de doublon)
    const mergedMap = new Map<BloodBiomarkerKey, BloodMarkerInput>();
    for (const em of extractedMarkers) mergedMap.set(em.key, em);
    for (const mm of manualMarkers) mergedMap.set(mm.key, mm);

    const finalMarkers = Array.from(mergedMap.values());
    if (finalMarkers.length === 0) {
      return NextResponse.json(
        {
          error:
            "Aucun biomarqueur détecté. Renseignez au moins une valeur ou collez des lignes de type « Glycémie 0,94 g/L ».",
        },
        { status: 400 }
      );
    }

    const analysis = evaluateBloodPanelDeterministically({
      markers: finalMarkers,
      context,
      age,
      sex,
      provider,
    });

    return NextResponse.json({
      markers: finalMarkers,
      analysis,
    });
  } catch (error) {
    console.error("analyze-blood error:", error);
    return NextResponse.json(
      { error: "Impossible d'analyser le bilan sanguin pour le moment." },
      { status: 400 }
    );
  }
}

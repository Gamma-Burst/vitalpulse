import { NextRequest, NextResponse } from "next/server";
import {
  buildDeterministicFwAiReply,
  type FwAiContextPayload,
  type FwAiReplyResult,
} from "@/lib/fw-ai-engine";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const question = typeof body.question === "string" ? body.question.trim() : "";
    if (!question) {
      return NextResponse.json(
        { error: "Posez une question pour lancer FW AI." },
        { status: 400 }
      );
    }

    const context: FwAiContextPayload | undefined = body.context;
    const history: Array<{ role: "user" | "assistant"; content: string }> = Array.isArray(body.history)
      ? body.history
          .slice(-6)
          .filter(
            (m: { role?: unknown; content?: unknown }) =>
              (m?.role === "user" || m?.role === "assistant") && typeof m?.content === "string"
          )
      : [];

    // Garde-fou prioritaire en code AVANT tout appel externe
    const deterministic = buildDeterministicFwAiReply({ question, context });
    if (deterministic.safetyGuardTriggered) {
      return NextResponse.json(deterministic);
    }

    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_COACH_MODEL || process.env.OPENAI_VISION_MODEL || "gpt-4o-mini";

    if (apiKey) {
      try {
        const systemPrompt = [
          "IDENTITÉ : Tu es FW AI, le coach nutrition, jeûne et performance sportive de FolloWeight (followeight.com).",
          "Tu es une IA d'éducation et de bien-être : tu n'es ni médecin ni diététicien et tu ne poses jamais de diagnostic médical.",
          "RÈGLES STRICTES :",
          "- N'invente JAMAIS de chiffres : appuie-toi uniquement sur le JSON de contexte ci-dessous calculé par les moteurs FolloWeight.",
          "- Ton chaleureux, direct, zéro culpabilisation. N'emploie jamais « tricher », « craquer » ou « mauvais aliment ».",
          "- Donne 3 à 6 phrases maximum en français et termine toujours par UNE action concrète réalisable tout de suite.",
          "- GARDE-FOUS ABSOLUS : Aucune restriction < plancher clinique, aucun encouragement au jeûne/déficit chez un mineur (< 18 ans) ou une femme enceinte, aucune modification de traitement (GLP-1, insuline), urgence médicale -> 15/112.",
          "Réponds STRICTEMENT en JSON valide : { \"replyFr\": \"string\", \"quickActions\": [\"string\", \"string\"] }",
        ].join("\n");

        const compactCtx = context ? JSON.stringify(context) : "{}";

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
              { role: "system", content: systemPrompt },
              {
                role: "system",
                content: `DONNÉES TEMPS RÉEL UTILISATEUR (FolloWeight) : ${compactCtx}`,
              },
              ...history,
              { role: "user", content: question },
            ],
          }),
          signal: AbortSignal.timeout(20000),
        });

        if (oaRes.ok) {
          const oaJson = await oaRes.json();
          const raw = oaJson?.choices?.[0]?.message?.content;
          if (raw) {
            const parsed = JSON.parse(raw);
            if (typeof parsed.replyFr === "string" && parsed.replyFr.trim().length > 10) {
              return NextResponse.json({
                replyFr: parsed.replyFr.trim(),
                quickActions: Array.isArray(parsed.quickActions)
                  ? parsed.quickActions.slice(0, 3).map(String)
                  : deterministic.quickActions,
                provider: "openai-fw-ai",
                safetyGuardTriggered: false,
              } satisfies FwAiReplyResult);
            }
          }
        }
      } catch (err) {
        console.warn("FW AI OpenAI fallback triggered:", err);
      }
    }

    return NextResponse.json(deterministic);
  } catch (error) {
    console.error("fw-ai error:", error);
    return NextResponse.json(
      { error: "Impossible de joindre FW AI pour le moment." },
      { status: 400 }
    );
  }
}

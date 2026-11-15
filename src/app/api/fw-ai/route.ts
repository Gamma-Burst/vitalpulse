import { NextRequest, NextResponse } from "next/server";
import {
  buildDeterministicFwAiReply,
  cleanFwAiInlineCitations,
  extractOpenAiResponsesWebData,
  type FwAiContextPayload,
  type FwAiReplyResult,
} from "@/lib/fw-ai-engine";
import type { FwAiWebSource } from "@/types/vitalpulse";

export const runtime = "nodejs";
export const maxDuration = 30;

function parseAiReplyPayload(
  rawJsonText: string,
  deterministic: FwAiReplyResult,
  webSearchUsed: boolean,
  sources: FwAiWebSource[]
): FwAiReplyResult | null {
  if (!rawJsonText.trim()) return null;
  try {
    const parsed = JSON.parse(rawJsonText) as {
      replyFr?: unknown;
      quickActions?: unknown;
    };
    if (typeof parsed.replyFr !== "string") return null;
    const cleanedReply = cleanFwAiInlineCitations(parsed.replyFr);
    if (cleanedReply.length <= 10) return null;

    const parsedActions = Array.isArray(parsed.quickActions)
      ? parsed.quickActions
          .map((item) => String(item ?? "").trim())
          .filter((item) => item.length > 0)
          .slice(0, 3)
      : [];

    const quickActions =
      parsedActions.length >= 2 ? parsedActions : deterministic.quickActions;

    return {
      replyFr: cleanedReply,
      quickActions,
      provider: "openai-fw-ai",
      safetyGuardTriggered: false,
      webSearchUsed: webSearchUsed || sources.length > 0,
      sources,
    };
  } catch {
    return null;
  }
}

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
    const history: Array<{ role: "user" | "assistant"; content: string }> = Array.isArray(
      body.history
    )
      ? body.history
          .slice(-6)
          .filter(
            (m: { role?: unknown; content?: unknown }) =>
              (m?.role === "user" || m?.role === "assistant") &&
              typeof m?.content === "string"
          )
      : [];

    // Garde-fou prioritaire en code AVANT tout appel externe
    const deterministic = buildDeterministicFwAiReply({ question, context });
    if (deterministic.safetyGuardTriggered) {
      return NextResponse.json(deterministic);
    }

    const apiKey = process.env.OPENAI_API_KEY;
    const model =
      process.env.OPENAI_COACH_MODEL || process.env.OPENAI_VISION_MODEL || "gpt-4o-mini";

    if (apiKey) {
      const systemPrompt = [
        "IDENTITÉ : Tu es FW AI, le coach intelligent connecté de FolloWeight (followeight.com), propulsé par IA cloud avec recherche Web en temps réel ET branché en direct sur les métriques FolloWeight de l'utilisateur.",
        "Tu es une IA d'éducation et de bien-être : tu n'es ni médecin ni diététicien et tu ne poses jamais de diagnostic médical.",
        "RÈGLES STRICTES :",
        "- N'invente JAMAIS les données personnelles de l'utilisateur (utilise strictement DONNÉES TEMPS RÉEL UTILISATEUR ci-dessous).",
        "- Utilise librement la recherche Web temps réel dès qu'une question porte sur un aliment précis, une enseigne ou un restaurant, une étude scientifique (PubMed, ANSES, HAS, OMS), l'actualité nutrition/sport ou la connexion Internet.",
        "- Si l'utilisateur demande s'il parle à une vraie IA ou si tu es connecté à Internet, confirme clairement que oui : tu es une IA cloud connectée en temps réel au Web et synchronisée à ses vraies données FolloWeight.",
        "- Ton chaleureux, direct, zéro culpabilisation. N'emploie jamais « tricher », « craquer » ou « mauvais aliment ».",
        "- Donne 3 à 6 phrases claires en français et termine toujours par UNE action concrète réalisable tout de suite.",
        "- GARDE-FOUS ABSOLUS : Aucune restriction < plancher clinique, aucun encouragement au jeûne/déficit chez un mineur (< 18 ans) ou une femme enceinte, aucune modification de traitement (GLP-1, insuline), urgence médicale -> 15/112.",
        'Fournis toujours 2 ou 3 quickActions courtes et pertinentes en français au format JSON : { "replyFr": "string", "quickActions": ["string", "string"] }.',
      ].join("\n");

      const compactCtx = context ? JSON.stringify(context) : "{}";
      const inputMessages = [
        { role: "system" as const, content: systemPrompt },
        {
          role: "system" as const,
          content: `DONNÉES TEMPS RÉEL UTILISATEUR (FolloWeight) : ${compactCtx}`,
        },
        ...history,
        { role: "user" as const, content: question },
      ];

      // 1. Appel principal : OpenAI Responses API avec recherche Web temps réel
      try {
        const respRes = await fetch("https://api.openai.com/v1/responses", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            tools: [{ type: "web_search_preview", search_context_size: "low" }],
            text: {
              format: {
                type: "json_schema",
                name: "fw_ai_reply",
                strict: true,
                schema: {
                  type: "object",
                  additionalProperties: false,
                  required: ["replyFr", "quickActions"],
                  properties: {
                    replyFr: { type: "string" },
                    quickActions: {
                      type: "array",
                      items: { type: "string" },
                    },
                  },
                },
              },
            },
            input: inputMessages,
          }),
          signal: AbortSignal.timeout(22000),
        });

        if (respRes.ok) {
          const respJson = (await respRes.json()) as { output?: unknown };
          const { rawJsonText, webSearchUsed, sources } = extractOpenAiResponsesWebData(
            respJson.output
          );
          const built = parseAiReplyPayload(
            rawJsonText,
            deterministic,
            webSearchUsed,
            sources
          );
          if (built) {
            return NextResponse.json(built);
          }
        }
      } catch (err) {
        console.warn("FW AI Responses web_search fallback triggered:", err);
      }

      // 2. Repli secondaire : Chat Completions JSON
      try {
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
            messages: inputMessages,
          }),
          signal: AbortSignal.timeout(12000),
        });

        if (oaRes.ok) {
          const oaJson = await oaRes.json();
          const raw = String(oaJson?.choices?.[0]?.message?.content ?? "");
          const built = parseAiReplyPayload(raw, deterministic, false, []);
          if (built) {
            return NextResponse.json(built);
          }
        }
      } catch (err) {
        console.warn("FW AI Chat Completions fallback triggered:", err);
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

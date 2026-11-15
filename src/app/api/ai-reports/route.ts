import { NextRequest, NextResponse } from "next/server";
import { persistAiSafetyReport } from "@/lib/billing-server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      messageId?: unknown;
      excerpt?: unknown;
      reason?: unknown;
      provider?: unknown;
    };

    const messageId =
      typeof body?.messageId === "string" ? body.messageId.trim() : "";
    const excerpt =
      typeof body?.excerpt === "string" ? body.excerpt.trim() : "";
    const reason =
      typeof body?.reason === "string" && body.reason.trim()
        ? body.reason.trim()
        : "user_flag_in_chat";
    const provider =
      typeof body?.provider === "string" ? body.provider.trim() : undefined;

    if (!messageId || !excerpt) {
      return NextResponse.json(
        { ok: false, error: "Identifiant de message ou extrait manquant." },
        { status: 400 }
      );
    }

    const result = await persistAiSafetyReport({
      messageId,
      excerpt,
      reason,
      provider,
    });

    return NextResponse.json({
      ok: true,
      reportId: result.reportId,
    });
  } catch (err) {
    console.error("ai-reports error:", err);
    return NextResponse.json(
      { ok: false, error: "Impossible d'enregistrer le signalement." },
      { status: 500 }
    );
  }
}

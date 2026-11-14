import { NextResponse } from "next/server";
import { configureWebPush } from "@/lib/push-store";

export const runtime = "nodejs";

export async function GET() {
  const { configured, publicKey } = configureWebPush();
  return NextResponse.json({ configured, publicKey });
}

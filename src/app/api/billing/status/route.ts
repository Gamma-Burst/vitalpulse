import { NextResponse } from "next/server";
import { getServerBillingStatus } from "@/lib/billing-server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    ...getServerBillingStatus(),
  });
}

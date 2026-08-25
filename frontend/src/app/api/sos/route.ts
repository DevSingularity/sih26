import { NextRequest, NextResponse } from "next/server";
import { alerts } from "@/lib/backend-state";

export async function POST(request: NextRequest) {
  const body = await request.json();
  alerts.push({
    id: `alert-${Date.now()}`,
    severity: "critical",
    message: `SOS triggered from ${body.station}`,
    timestamp: new Date().toISOString(),
    sos: true,
  });
  return NextResponse.json({ ok: true });
}
